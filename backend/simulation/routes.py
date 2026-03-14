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
    user_id: int = Query(...),
    campaign_id: int = Query(...),
):
    """
    Requested: http://localhost:8000/track?user_id=<id>&campaign_id=<id>
    Logs LINK_CLICK, then serves a fake login page.
    """
    # Verify campaign exists
    c_result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = c_result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Fetch user/target email
    u_res = await db.execute(select(CampaignTarget).where(
        CampaignTarget.user_id == user_id, 
        CampaignTarget.campaign_id == campaign_id
    ))
    target = u_res.scalar_one_or_none()
    target_email = target.email if target else "unknown"

    # Log the click
    await log_event(
        db=db,
        event_type=EventType.LINK_CLICK,
        request=request,
        user_id=user_id,
        campaign_id=campaign_id,
        metadata={"email": target_email},
    )
    if target:
        target.link_clicked = True
        db.add(target)
        await db.commit()

    if campaign.attack_type.value == "malware_download":
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url=f"{settings.SIM_BASE_URL}/sim/download?user_id={user_id}&campaign_id={campaign_id}")

    action_url = f"{settings.SIM_BASE_URL}/sim/credential"
    
    # Alternate template based on basic id heuristic
    if user_id % 2 == 0:
        html = microsoft_login_page(user_id, campaign_id, action_url)
    else:
        html = corporate_login_page(user_id, campaign_id, action_url)

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
    # Retrieve form data manually because it's a standard HTML form submission, not JSON
    form = await request.form()
    user_id = int(form.get("user_id"))
    campaign_id = int(form.get("campaign_id"))
    username = form.get("username", "")

    # Log — password is intentionally excluded
    await log_event(
        db=db,
        event_type=EventType.CREDENTIAL_ATTEMPT,
        request=request,
        user_id=user_id,
        campaign_id=campaign_id,
        metadata={"username_provided": username, "password_stored": False},
    )
    
    # Update target stats
    u_res = await db.execute(select(CampaignTarget).where(
        CampaignTarget.user_id == user_id, 
        CampaignTarget.campaign_id == campaign_id
    ))
    target = u_res.scalar_one_or_none()
    if target:
        target.credential_attempt = True
        db.add(target)

    # Trigger async risk score update
    from analytics.risk_engine import compute_and_save_risk
    await compute_and_save_risk(db, user_id)
    await db.commit()

    # Show premium awareness training page in frontend
    from fastapi.responses import RedirectResponse
    frontend_url = "http://localhost:5173" # Default Vite port
    return RedirectResponse(
        url=f"{frontend_url}/training?campaign={campaign.name}&user_id={user_id}&campaign_id={campaign_id}",
        status_code=303
    )


@router.get("/download")
async def malware_download(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    user_id: int = Query(...),
    campaign_id: int = Query(...),
):
    """
    Simulates a malware download. Returns a harmless ZIP with a drill notice.
    """
    await log_event(
        db=db,
        event_type=EventType.FILE_DOWNLOAD,
        request=request,
        user_id=user_id,
        campaign_id=campaign_id,
        metadata={"source": "simulated_malware_file"}
    )
    
    u_res = await db.execute(select(CampaignTarget).where(
        CampaignTarget.user_id == user_id, 
        CampaignTarget.campaign_id == campaign_id
    ))
    target = u_res.scalar_one_or_none()
    if target:
        target.file_download = True
        db.add(target)
        
    from analytics.risk_engine import compute_and_save_risk
    await compute_and_save_risk(db, user_id)
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
