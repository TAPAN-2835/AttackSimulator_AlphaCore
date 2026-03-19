from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status, Query
from fastapi.responses import HTMLResponse, Response, RedirectResponse
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
router = APIRouter()  # This will be the sim_router
phish_router = APIRouter()


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
    target = result.scalars().first()
    if target:
        setattr(target, field, True)
        db.add(target)


async def log_phish_event(
    db: AsyncSession,
    token_obj: SimulationToken,
    event_type: EventType,
    request: Request,
    metadata: dict | None = None
):
    """
    Centralized event logging for phishing events.
    """
    if metadata is None:
        metadata = {}
    
    metadata.update({
        "token": token_obj.token,
        "target_email": token_obj.target_email
    })

    await log_event(
        db=db,
        event_type=event_type,
        request=request,
        user_id=token_obj.user_id,
        campaign_id=token_obj.campaign_id,
        metadata=metadata,
    )

    result = await db.execute(
        select(CampaignTarget).where(
            CampaignTarget.campaign_id == token_obj.campaign_id,
            CampaignTarget.email == token_obj.target_email,
        )
    )
    target = result.scalars().first()
    if target:
        if event_type == EventType.EMAIL_OPEN:
            target.email_opened = True
        elif event_type == EventType.LINK_CLICK:
            target.link_clicked = True
        elif event_type == EventType.CREDENTIAL_ATTEMPT:
            target.credential_attempt = True
        elif event_type == EventType.FILE_DOWNLOAD:
            target.file_download = True
        db.add(target)

    if token_obj.user_id:
        from analytics.risk_engine import compute_and_save_risk
        try:
            await compute_and_save_risk(db, token_obj.user_id)
        except Exception as e:
            # Prevent 500 errors if risk scoring database is out of sync or fails
            import logging
            logging.getLogger(__name__).error(f"Risk computation failed for user {token_obj.user_id}: {e}")
    
    await db.commit()


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
        target = t_res.scalars().first()
    elif user_id is not None:
        u_res = await db.execute(
            select(CampaignTarget).where(
                CampaignTarget.user_id == user_id,
                CampaignTarget.campaign_id == campaign_id,
            )
        )
        target = u_res.scalars().first()

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
            url=f"/sim/download?target_id={target.id}&campaign_id={campaign_id}"
        )

    action_url = "/sim/credential"
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
    
    target = None
    if target_id_raw and target_id_raw != "None":
        target_id = int(target_id_raw)
        t_res = await db.execute(select(CampaignTarget).where(
            CampaignTarget.id == target_id,
            CampaignTarget.campaign_id == campaign_id,
        ))
        target = t_res.scalar_one_or_none()
    elif user_id_raw and user_id_raw != "None":
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
    from fastapi.responses import RedirectResponse
    # Redirect into backend-hosted awareness page after credential submission
    return RedirectResponse(url="/sim/awareness", status_code=303)


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
        target = t_res.scalars().first()
    else:
        if user_id is None:
            raise HTTPException(status_code=400, detail="user_id or target_id required")
        u_res = await db.execute(select(CampaignTarget).where(
            CampaignTarget.user_id == user_id,
            CampaignTarget.campaign_id == campaign_id,
        ))
        target = u_res.scalars().first()
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
    target = u_res.scalars().first()
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
    target = u_res.scalars().first()
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


@phish_router.get("/phish/{token}", response_class=HTMLResponse)
async def central_phish_handler(
    token: str,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Central phishing handler: /phish/{token}. Validates token, identifies attack_type, and routes correctly.
    """
    sim_token = await _get_valid_token(token, db)
    
    # Identify attack_type from campaign
    from campaigns.models import Campaign, AttackType
    campaign = await db.get(Campaign, sim_token.campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Log internal event
    await log_phish_event(db, sim_token, EventType.LINK_CLICK, request)

    # 1. Credential Phishing
    if campaign.attack_type == AttackType.credential_harvest:
        action_url = "/phish/submit"
        uid = sim_token.user_id if sim_token.user_id is not None else 0
        if uid % 2 == 0:
            html = microsoft_login_page(sim_token.user_id, campaign.id, action_url, token=token)
        else:
            html = corporate_login_page(sim_token.user_id, campaign.id, action_url, token=token)
        return HTMLResponse(content=html)

    # 2. Link Phishing (Awareness)
    elif campaign.attack_type in [AttackType.phishing, AttackType.spear_phishing, AttackType.phishing_link_message]:
        if campaign.landing_page_url:
            return RedirectResponse(
                url=campaign.landing_page_url,
                status_code=303
            )
        return RedirectResponse(
            url=f"/sim/awareness?token={token}",
            status_code=303
        )

    # 3. Attachment/Malware Phishing
    elif campaign.attack_type == AttackType.malware_download:
        # Note: In real malware sims we might log "FILE_DOWNLOAD" here if the click implies opening
        # But per requirements Task 2: log "attachment_opened"
        await log_phish_event(db, sim_token, EventType.FILE_DOWNLOAD, request)
        return RedirectResponse(
            url=f"/sim/awareness?token={token}",
            status_code=303
        )

    # Default fallback
    return RedirectResponse(url=f"/sim/awareness?token={token}", status_code=303)


@phish_router.post("/phish/submit")
async def central_credential_submission(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Centralized credential submission handler.
    1. receive token
    2. validate token
    3. log event "credentials_submitted"
    4. redirect to awareness page
    """
    form = await request.form()
    token = form.get("token") or form.get("token_raw")
    
    if not token:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Credential submission received without token. Form keys: {list(form.keys())}. Falling back to old handler.")
        # Fallback to old behavior if token missing (for transition)
        return await credential_submit(request, db)

    sim_token = await _get_valid_token(token, db)
    
    await log_phish_event(
        db,
        sim_token,
        EventType.CREDENTIAL_ATTEMPT,
        request,
        metadata={"username_provided": form.get("username", ""), "password_stored": False}
    )

    return RedirectResponse(
        url=f"/sim/awareness?token={token}",
        status_code=303
    )


@router.get("/awareness", response_class=HTMLResponse)
async def sim_awareness_page(
    db: Annotated[AsyncSession, Depends(get_db)],
    token: str | None = Query(None)
) -> HTMLResponse:
    """
    Universal security awareness landing page shown after simulations.
    Validates token if provided.
    """
    campaign_name = None
    if token:
        sim_token = await _get_valid_token(token, db)
        campaign = await db.get(Campaign, sim_token.campaign_id)
        if campaign:
            campaign_name = campaign.name

    return HTMLResponse(content=awareness_page(campaign_name=campaign_name))
