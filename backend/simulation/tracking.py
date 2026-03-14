from fastapi import APIRouter, Depends, Query, Request, Response
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated

from database import get_db
from config import get_settings
from events.logger import log_event
from events.models import EventType
from campaigns.models import CampaignTarget, Campaign
from simulation.credential_pages import microsoft_login_page, corporate_login_page, awareness_page

router = APIRouter()
settings = get_settings()

@router.get("/login", response_class=HTMLResponse)
async def phish_login(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    uid: int = Query(...),
    cid: int = Query(...),
    token: str | None = Query(None)
):
    """
    GET /phish/login?uid=<user_id>&cid=<campaign_id>
    Logs LINK_CLICK and serves fake login page.
    """
    # Log event
    await log_event(
        db=db,
        event_type=EventType.LINK_CLICK,
        request=request,
        user_id=uid if uid > 0 else None,
        campaign_id=cid,
        metadata={"source": "direct_phish_link", "token": token}
    )

    # Update target status if exists
    from sqlalchemy import or_
    target_res = await db.execute(
        select(CampaignTarget).where(
            CampaignTarget.campaign_id == cid,
            or_(CampaignTarget.user_id == uid, CampaignTarget.id == uid)
        )
    )
    target = target_res.scalar_one_or_none()
    if target:
        target.link_clicked = True
        db.add(target)
        await db.commit()

    # Serve login page
    action_url = f"{settings.phishing_base_url}/phish/submit"
    # alternate between login pages based on uid
    if uid % 2 == 0:
        html = microsoft_login_page(uid, cid, action_url, target_id=target.id if target else None)
    else:
        html = corporate_login_page(uid, cid, action_url, target_id=target.id if target else None)
    
    return HTMLResponse(content=html)

@router.post("/submit")
async def phish_submit(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    POST /phish/submit
    Logs CREDENTIAL_ATTEMPT and redirects to awareness page.
    """
    form = await request.form()
    uid = int(form.get("uid", form.get("user_id", 0)))
    cid = int(form.get("cid", form.get("campaign_id", 0)))
    username = form.get("username", "")

    # Log event
    await log_event(
        db=db,
        event_type=EventType.CREDENTIAL_ATTEMPT,
        request=request,
        user_id=uid if uid > 0 else None,
        campaign_id=cid,
        metadata={"username_provided": username, "password_stored": False}
    )

    # Update target status
    from sqlalchemy import or_
    target_res = await db.execute(
        select(CampaignTarget).where(
            CampaignTarget.campaign_id == cid,
            or_(CampaignTarget.user_id == uid, CampaignTarget.id == uid)
        )
    )
    target = target_res.scalar_one_or_none()
    if target:
        target.credential_attempt = True
        db.add(target)
        
        # Update risk score if user_id is valid
        if target.user_id:
            from analytics.risk_engine import compute_and_save_risk
            await compute_and_save_risk(db, target.user_id)
        
        await db.commit()

    # Redirect to awareness page
    return RedirectResponse(url=f"{settings.phishing_base_url}/phish/awareness", status_code=303)


@router.get("/awareness", response_class=HTMLResponse)
async def phish_awareness():
    """
    GET /phish/awareness
    Serves the phishing awareness page.
    """
    return HTMLResponse(content=awareness_page())

@router.get("/open")
async def email_open(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    uid: int = Query(...),
    cid: int = Query(...)
):
    """
    GET /email/open?uid=<user_id>&cid=<campaign_id>
    Logs EMAIL_OPEN and returns 1x1 pixel.
    """
    await log_event(
        db=db,
        event_type=EventType.EMAIL_OPEN,
        request=request,
        user_id=uid if uid > 0 else None,
        campaign_id=cid,
        metadata={"source": "tracking_pixel"}
    )

    # Update target
    from sqlalchemy import or_
    target_res = await db.execute(
        select(CampaignTarget).where(
            CampaignTarget.campaign_id == cid,
            or_(CampaignTarget.user_id == uid, CampaignTarget.id == uid)
        )
    )
    target = target_res.scalar_one_or_none()
    if target:
        target.email_opened = True
        db.add(target)
        await db.commit()

    # 1x1 transparent GIF
    _TRANSPARENT_GIF = bytes([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00,
        0x01, 0x00, 0x80, 0x00, 0x00, 0xFF, 0xFF, 0xFF,
        0x00, 0x00, 0x00, 0x21, 0xF9, 0x04, 0x01, 0x00,
        0x00, 0x00, 0x00, 0x2C, 0x00, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
        0x01, 0x00, 0x3B,
    ])

    return Response(
        content=_TRANSPARENT_GIF,
        media_type="image/gif",
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache",
        },
    )
