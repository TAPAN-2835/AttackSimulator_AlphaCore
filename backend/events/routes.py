"""
Events API: user interaction endpoints (e.g. report phishing).
Campaign read-only lookups are used here; campaign write logic stays in campaigns module.
Scoring updates are delegated to analytics module.
Optional VirusTotal URL check when reported_url is provided.
"""
import asyncio
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from campaigns.models import Campaign, CampaignTarget
from config import get_settings
from database import get_db
from events.logger import log_event
from events.models import EventType
from analytics.risk_engine import update_phishing_indicator_scores
from utils.virustotal import check_url_sync, check_file_from_url_sync

router = APIRouter()


class ReportPhishingRequest(BaseModel):
    user_id: int
    campaign_id: int
    reason_selected: str
    reported_url: str | None = None  # optional; when set, checked via VirusTotal API


class VirusTotalResult(BaseModel):
    malicious: int
    suspicious: int
    harmless: int
    undetected: int
    permalink: str | None
    error: str | None
    status: str | None = None


class ReportPhishingResponse(BaseModel):
    success: bool
    reason_matched: bool
    awareness_score: float
    vulnerability_score: float
    detection_accuracy: float
    correct_detection_count: int
    incorrect_detection_count: int
    vt_checked: bool = False
    vt_result: VirusTotalResult | None = None


class CheckUrlRequest(BaseModel):
    url: str


class CheckUrlResponse(BaseModel):
    checked: bool
    result: VirusTotalResult | None = None
    error: str | None = None

class CheckFileUrlResponse(BaseModel):
    checked: bool
    result: VirusTotalResult | None = None
    error: str | None = None


@router.post("/report-phishing", response_model=ReportPhishingResponse)
async def report_phishing(
    body: ReportPhishingRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ReportPhishingResponse:
    """
    User reports an email as phishing. Compares reason_selected with the
    campaign's attack_indicators and updates awareness/vulnerability/detection scores.
    If reported_url is provided and VIRUSTOTAL_API_KEY is set, the URL is checked via VirusTotal API.
    """
    result = await db.execute(
        select(Campaign).where(Campaign.id == body.campaign_id)
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    indicators: list = campaign.attack_indicators or []
    reason_matched = body.reason_selected.strip() in indicators

    rs = await update_phishing_indicator_scores(
        db, body.user_id, reason_matched=reason_matched
    )

    # Optional VirusTotal check (run in thread to avoid blocking)
    vt_result = None
    metadata = {"reason_selected": body.reason_selected, "reason_matched": reason_matched}
    if body.reported_url and get_settings().VIRUSTOTAL_API_KEY:
        try:
            vt_raw = await asyncio.to_thread(
                check_url_sync,
                body.reported_url,
                get_settings().VIRUSTOTAL_API_KEY,
            )
            if vt_raw is not None:
                vt_result = VirusTotalResult(**vt_raw)
                metadata["virustotal"] = vt_raw
        except Exception:
            pass

    await log_event(
        db=db,
        event_type=EventType.EMAIL_REPORTED,
        user_id=body.user_id,
        campaign_id=body.campaign_id,
        metadata=metadata,
    )

    # Mark target as reported if this user is a target for this campaign
    target_result = await db.execute(
        select(CampaignTarget).where(
            CampaignTarget.campaign_id == body.campaign_id,
            CampaignTarget.user_id == body.user_id,
        )
    )
    target = target_result.scalar_one_or_none()
    if target:
        target.reported = True
        db.add(target)

    return ReportPhishingResponse(
        success=True,
        reason_matched=reason_matched,
        awareness_score=rs.awareness_score,
        vulnerability_score=rs.vulnerability_score,
        detection_accuracy=rs.detection_accuracy,
        correct_detection_count=rs.correct_detection_count,
        incorrect_detection_count=rs.incorrect_detection_count,
        vt_checked=vt_result is not None,
        vt_result=vt_result,
    )


@router.post("/check-url", response_model=CheckUrlResponse)
async def check_url(body: CheckUrlRequest) -> CheckUrlResponse:
    """
    Check a URL with VirusTotal API. Requires VIRUSTOTAL_API_KEY to be set.
    Useful for user-side "Check this link" before or when reporting phishing.
    """
    api_key = get_settings().VIRUSTOTAL_API_KEY
    if not api_key:
        return CheckUrlResponse(checked=False, error="VirusTotal API key not configured")
    url = (body.url or "").strip()
    if not url:
        return CheckUrlResponse(checked=False, error="URL is required")
    try:
        vt_raw = await asyncio.to_thread(check_url_sync, url, api_key)
        if vt_raw is None:
            return CheckUrlResponse(checked=False, error="VirusTotal check failed")
        return CheckUrlResponse(checked=True, result=VirusTotalResult(**vt_raw))
    except Exception as e:
        return CheckUrlResponse(checked=False, error=str(e))

@router.post("/check-file-url", response_model=CheckFileUrlResponse)
async def check_file_url(body: CheckUrlRequest) -> CheckFileUrlResponse:
    """
    Download a file from an endpoint and scan it with VirusTotal API.
    """
    api_key = get_settings().VIRUSTOTAL_API_KEY
    if not api_key:
        return CheckFileUrlResponse(checked=False, error="VirusTotal API key not configured")
    url = (body.url or "").strip()
    if not url:
        return CheckFileUrlResponse(checked=False, error="File URL is required")

    try:
        vt_raw = await asyncio.to_thread(check_file_from_url_sync, url, api_key)
        if vt_raw is None:
            return CheckFileUrlResponse(checked=False, error="VirusTotal check failed")
        if "error" in vt_raw and vt_raw["error"]:
             return CheckFileUrlResponse(checked=False, error=vt_raw["error"])
             
        return CheckFileUrlResponse(checked=True, result=VirusTotalResult(**vt_raw))
    except Exception as e:
        return CheckFileUrlResponse(checked=False, error=str(e))
