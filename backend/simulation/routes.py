from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status, Query
from fastapi.responses import HTMLResponse, Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from campaigns.models import SimulationToken, CampaignTarget, Campaign
from config import get_settings
from database import get_db
from events.logger import log_event
from events.models import EventType
from simulation.credential_pages import (
    microsoft_login_page,
    corporate_login_page,
    awareness_page,
)
from simulation.malware_simulation import generate_dummy_file

settings = get_settings()
router = APIRouter()


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _get_valid_token(token: str, db: AsyncSession) -> SimulationToken:
    result = await db.execute(
        select(SimulationToken).where(SimulationToken.token == token)
    )
    sim_token = result.scalar_one_or_none()
    if not sim_token:
        raise HTTPException(status_code=404, detail="Invalid simulation token")
    if sim_token.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Simulation token has expired")
    return sim_token


async def _mark_target_flag(db: AsyncSession, campaign_id: int, email: str, field: str):
    result = await db.execute(
        select(CampaignTarget).where(
            CampaignTarget.campaign_id == campaign_id,
            CampaignTarget.email == email,
        )
    )
    target = result.scalar_one_or_none()
    if target:
        setattr(target, field, True)
        db.add(target)


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("/track", response_class=HTMLResponse)
async def track_link_click(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    user_id: int | None = Query(None),
    campaign_id: int | None = Query(None),
    target_id: int | None = Query(None),
):
    """
    Logs LINK_CLICK (if not already from /sim/{token}), then serves fake login page.
    Use either user_id+campaign_id or target_id+campaign_id.
    """
    if campaign_id is None:
        raise HTTPException(status_code=400, detail="campaign_id required")

    target = None
    if target_id is not None:
        t_res = await db.execute(
            select(CampaignTarget).where(
                CampaignTarget.id == target_id,
                CampaignTarget.campaign_id == campaign_id,
            )
        )
        target = t_res.scalar_one_or_none()
    elif user_id is not None:
        u_res = await db.execute(
            select(CampaignTarget).where(
                CampaignTarget.user_id == user_id,
                CampaignTarget.campaign_id == campaign_id,
            )
        )
        target = u_res.scalar_one_or_none()

    if not target:
        raise HTTPException(status_code=404, detail="Target not found")

    c_result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = c_result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    user_id_resolved = target.user_id

    if campaign.attack_type.value == "malware_download":
        from fastapi.responses import RedirectResponse
        return RedirectResponse(
            url=f"{settings.SIM_BASE_URL}/sim/download?target_id={target.id}&campaign_id={campaign_id}"
        )

    action_url = f"{settings.SIM_BASE_URL}/sim/credential"
    uid = user_id_resolved if user_id_resolved is not None else target.id
    if uid % 2 == 0:
        html = microsoft_login_page(uid, campaign_id, action_url, target_id=target.id)
    else:
        html = corporate_login_page(uid, campaign_id, action_url, target_id=target.id)

    return HTMLResponse(content=html)


class CredentialSubmit(BaseModel):
    user_id: int
    campaign_id: int
    username: str
    password: str  # NEVER stored — only existence of attempt is logged

@router.post("/credential")
async def credential_submit(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    form = await request.form()
    campaign_id = int(form.get("campaign_id"))
    username = form.get("username", "")
    target_id_raw = form.get("target_id")
    user_id_raw = form.get("user_id")
    if target_id_raw:
        target_id = int(target_id_raw)
        t_res = await db.execute(select(CampaignTarget).where(
            CampaignTarget.id == target_id,
            CampaignTarget.campaign_id == campaign_id,
        ))
        target = t_res.scalar_one_or_none()
    else:
        user_id = int(user_id_raw)
        u_res = await db.execute(select(CampaignTarget).where(
            CampaignTarget.user_id == user_id,
            CampaignTarget.campaign_id == campaign_id,
        ))
        target = u_res.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    user_id = target.user_id

    await log_event(
        db=db,
        event_type=EventType.CREDENTIAL_ATTEMPT,
        request=request,
        user_id=user_id,
        campaign_id=campaign_id,
        metadata={"username_provided": username, "password_stored": False},
    )
    target.credential_attempt = True
    db.add(target)

    from analytics.risk_engine import compute_and_save_risk
    if user_id is not None:
        await compute_and_save_risk(db, user_id)
    await db.commit()
    c_res = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = c_res.scalar_one_or_none()
    campaign_name = campaign.name if campaign else "Simulation"
    from fastapi.responses import RedirectResponse
    frontend_url = "http://localhost:5173"
    return RedirectResponse(
        url=f"{frontend_url}/training?campaign={campaign_name}&user_id={user_id or ''}&campaign_id={campaign_id}",
        status_code=303
    )


@router.get("/download")
async def malware_download(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    user_id: int | None = Query(None),
    campaign_id: int | None = Query(None),
    target_id: int | None = Query(None),
):
    """
    Simulates a malware download. Returns a harmless ZIP with a drill notice.
    Use either user_id+campaign_id or target_id+campaign_id.
    """
    if not campaign_id:
        raise HTTPException(status_code=400, detail="campaign_id required")
    if target_id is not None:
        t_res = await db.execute(select(CampaignTarget).where(
            CampaignTarget.id == target_id,
            CampaignTarget.campaign_id == campaign_id,
        ))
        target = t_res.scalar_one_or_none()
    else:
        if user_id is None:
            raise HTTPException(status_code=400, detail="user_id or target_id required")
        u_res = await db.execute(select(CampaignTarget).where(
            CampaignTarget.user_id == user_id,
            CampaignTarget.campaign_id == campaign_id,
        ))
        target = u_res.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")

    await log_event(
        db=db,
        event_type=EventType.FILE_DOWNLOAD,
        request=request,
        user_id=target.user_id,
        campaign_id=campaign_id,
        metadata={"source": "simulated_malware_file"}
    )
    target.file_download = True
    db.add(target)

    from analytics.risk_engine import compute_and_save_risk
    if target.user_id is not None:
        await compute_and_save_risk(db, target.user_id)
    await db.commit()

    file_bytes, filename = generate_dummy_file()

    # MIME types handling
    media_type = "application/octet-stream"
    if filename.endswith(".zip"):
        media_type = "application/zip"

    return Response(
        content=file_bytes,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )





@router.get("/report")
async def report_phish(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    user_id: int = Query(...),
    campaign_id: int = Query(...),
):
    """
    Endpoint for users to report the phishing email.
    Logs an EMAIL_REPORTED event and updates the target status.
    """
    await log_event(
        db=db,
        event_type=EventType.EMAIL_REPORTED,
        request=request,
        user_id=user_id,
        campaign_id=campaign_id,
        metadata={"source": "user_report_button"},
    )

    u_res = await db.execute(
        select(CampaignTarget).where(
            CampaignTarget.user_id == user_id,
            CampaignTarget.campaign_id == campaign_id,
        )
    )
    target = u_res.scalar_one_or_none()
    if target:
        target.reported = True
        db.add(target)

    from analytics.risk_engine import compute_and_save_risk
    await compute_and_save_risk(db, user_id)
    await db.commit()

    return HTMLResponse(content="""
        <html>
            <head>
                <style>
                    body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f0fdf4; color: #166534; text-align: center; }
                    .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 1px solid #bbf7d0; }
                    h1 { margin-top: 0; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>✅ Successfully Reported</h1>
                    <p>Thank you for helping keep our organization secure.</p>
                    <p>Our security team has been notified of this suspicious email.</p>
                </div>
            </body>
        </html>
    """)


# ── Tracking Pixel — Email Open ───────────────────────────────────────────────

# 1×1 transparent GIF (43 bytes — the smallest valid GIF)
_TRANSPARENT_GIF = bytes([
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00,
    0x01, 0x00, 0x80, 0x00, 0x00, 0xFF, 0xFF, 0xFF,
    0x00, 0x00, 0x00, 0x21, 0xF9, 0x04, 0x01, 0x00,
    0x00, 0x00, 0x00, 0x2C, 0x00, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
    0x01, 0x00, 0x3B,
])


@router.get("/open")
async def track_email_open(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    user_id: int = Query(...),
    campaign_id: int = Query(...),
):
    """
    Email open tracking pixel endpoint.
    Embedded as a 1x1 invisible image in phishing emails.
    When the email is opened and images are loaded, this endpoint fires and
    logs an EMAIL_OPEN event.
    """
    # Log the open event
    await log_event(
        db=db,
        event_type=EventType.EMAIL_OPEN,
        request=request,
        user_id=user_id,
        campaign_id=campaign_id,
        metadata={"source": "tracking_pixel"},
    )

    # Mark the target as having opened the email
    u_res = await db.execute(
        select(CampaignTarget).where(
            CampaignTarget.user_id == user_id,
            CampaignTarget.campaign_id == campaign_id,
        )
    )
    target = u_res.scalar_one_or_none()
    if target:
        target.email_opened = True
        db.add(target)

    await db.commit()

    # Return 1×1 transparent GIF
    return Response(
        content=_TRANSPARENT_GIF,
        media_type="image/gif",
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache",
        },
    )


@router.get("/{token}", response_class=HTMLResponse)
async def sim_token_redirect(
    request: Request,
    token: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Unique tracking link: /sim/{token}. Validates token, logs LINK_CLICK, redirects to phishing page.
    """
    sim_token = await _get_valid_token(token, db)
    target_result = await db.execute(
        select(CampaignTarget).where(
            CampaignTarget.campaign_id == sim_token.campaign_id,
            CampaignTarget.email == sim_token.target_email,
        )
    )
    target = target_result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")

    await log_event(
        db=db,
        event_type=EventType.LINK_CLICK,
        request=request,
        user_id=sim_token.user_id,
        campaign_id=sim_token.campaign_id,
        metadata={"email": sim_token.target_email},
    )
    target.link_clicked = True
    db.add(target)
    await db.commit()

    from fastapi.responses import RedirectResponse
    redirect_url = f"{settings.SIM_BASE_URL}/sim/track?target_id={target.id}&campaign_id={sim_token.campaign_id}"
    return RedirectResponse(url=redirect_url, status_code=302)
