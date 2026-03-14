from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from analytics.models import RiskScore, RiskLevel
from analytics.risk_engine import compute_and_save_risk, get_event_counts_for_user
from auth.models import User, UserRole
from campaigns.models import CampaignTarget, Campaign
from campaigns.models import ChannelType
from events.models import Event, EventType
from database import get_db

router = APIRouter()


# ── Schemas ─────────────────────────────────────────────────────────────

class DeptRiskRate(BaseModel):
    department: str
    click_rate: float
    credential_rate: float
    download_rate: float
    report_rate: float


class DeptScore(BaseModel):
    name: str
    score: float


class OverviewResponse(BaseModel):
    click_rate: float
    credential_rate: float
    download_rate: float
    report_rate: float
    high_risk_departments: list[DeptScore]


class UserRiskResponse(BaseModel):
    user_id: int
    email: str
    risk_score: float
    risk_level: RiskLevel
    events: dict


class TrendPoint(BaseModel):
    campaign: str
    total_events: int
    clicks: int
    credentials: int
    downloads: int


class EmployeeScoreResponse(BaseModel):
    score: float
    risk_level: RiskLevel
    clicks: int
    credentials: int
    downloads: int

class UserRiskListEntry(BaseModel):
    name: str
    email: str
    department: str
    risk_level: RiskLevel
    risk_score: float
    clicks: int
    credentials: int
    downloads: int
    reported: int
    training_progress: float

class UserRiskListResponse(BaseModel):
    users: list[UserRiskListEntry]
    distribution: dict[str, int]


# ── Routes ─────────────────────────────────────────────────────────────


@router.get("/dashboard", response_model=OverviewResponse)
async def analytics_dashboard(db: Annotated[AsyncSession, Depends(get_db)]):

    total_targets = (
        await db.execute(select(func.count()).select_from(CampaignTarget))
    ).scalar_one() or 1

    clicks = (
        await db.execute(
            select(func.count())
            .select_from(CampaignTarget)
            .where(CampaignTarget.link_clicked == True)
        )
    ).scalar_one()

    creds = (
        await db.execute(
            select(func.count())
            .select_from(CampaignTarget)
            .where(CampaignTarget.credential_attempt == True)
        )
    ).scalar_one()

    downloads = (
        await db.execute(
            select(func.count())
            .select_from(CampaignTarget)
            .where(CampaignTarget.file_download == True)
        )
    ).scalar_one()

    reported = (
        await db.execute(
            select(func.count())
            .select_from(CampaignTarget)
            .where(CampaignTarget.reported == True)
        )
    ).scalar_one()

    dept_rows = await db.execute(
        select(User.department, func.avg(RiskScore.risk_score).label("avg_score"))
        .join(RiskScore, User.id == RiskScore.user_id)
        .where(User.department.isnot(None))
        .group_by(User.department)
        .order_by(func.avg(RiskScore.risk_score).desc())
        .limit(5)
    )

    high_risk_depts = [
        DeptScore(name=row.department, score=round(row.avg_score, 1))
        for row in dept_rows
    ]

    return OverviewResponse(
        click_rate=round(clicks / total_targets * 100, 1),
        credential_rate=round(creds / total_targets * 100, 1),
        download_rate=round(downloads / total_targets * 100, 1),
        report_rate=round(reported / total_targets * 100, 1),
        high_risk_departments=high_risk_depts,
    )


@router.get("/user-risk/{user_id}", response_model=UserRiskResponse)
async def user_risk(user_id: int, db: Annotated[AsyncSession, Depends(get_db)]):

    user = (
        await db.execute(select(User).where(User.id == user_id))
    ).scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    rs = await compute_and_save_risk(db, user_id)
    counts = await get_event_counts_for_user(db, user_id)

    return UserRiskResponse(
        user_id=user_id,
        email=user.email,
        risk_score=rs.risk_score,
        risk_level=rs.risk_level,
        events=counts,
    )


@router.get("/department-risk", response_model=list[DeptRiskRate])
async def department_risk(db: Annotated[AsyncSession, Depends(get_db)]):

    from sqlalchemy import case

    rows = await db.execute(
        select(
            CampaignTarget.department,
            func.count().label("total"),
            func.sum(case((CampaignTarget.link_clicked == True, 1), else_=0)).label("clicked"),
            func.sum(case((CampaignTarget.credential_attempt == True, 1), else_=0)).label("creds"),
            func.sum(case((CampaignTarget.file_download == True, 1), else_=0)).label("downloads"),
            func.sum(case((CampaignTarget.reported == True, 1), else_=0)).label("reported"),
        )
        .where(CampaignTarget.department.isnot(None))
        .group_by(CampaignTarget.department)
    )

    result = []

    for row in rows:
        total = row.total or 1

        result.append(
            DeptRiskRate(
                department=row.department,
                click_rate=round((row.clicked or 0) / total * 100, 1),
                credential_rate=round((row.creds or 0) / total * 100, 1),
                download_rate=round((row.downloads or 0) / total * 100, 1),
                report_rate=round((row.reported or 0) / total * 100, 1),
            )
        )

    return sorted(result, key=lambda x: x.click_rate, reverse=True)


@router.get("/campaign-trend", response_model=list[TrendPoint])
async def campaign_trend(db: Annotated[AsyncSession, Depends(get_db)]):

    campaigns = (
        await db.execute(select(Campaign).order_by(Campaign.created_at))
    ).scalars().all()

    result = []

    for c in campaigns:

        totals = (
            await db.execute(
                select(func.count()).where(Event.campaign_id == c.id)
            )
        ).scalar_one()

        clicks = (
            await db.execute(
                select(func.count()).where(
                    Event.campaign_id == c.id,
                    Event.event_type == EventType.LINK_CLICK,
                )
            )
        ).scalar_one()

        creds = (
            await db.execute(
                select(func.count()).where(
                    Event.campaign_id == c.id,
                    Event.event_type == EventType.CREDENTIAL_ATTEMPT,
                )
            )
        ).scalar_one()

        downloads = (
            await db.execute(
                select(func.count()).where(
                    Event.campaign_id == c.id,
                    Event.event_type == EventType.FILE_DOWNLOAD,
                )
            )
        ).scalar_one()

        result.append(
            TrendPoint(
                campaign=c.name,
                total_events=totals,
                clicks=clicks,
                credentials=creds,
                downloads=downloads,
            )
        )

    return result


@router.post("/run-assessment")
async def run_bulk_assessment(db: Annotated[AsyncSession, Depends(get_db)]):

    users = (
        await db.execute(
            select(User).where(User.role == UserRole.employee)
        )
    ).scalars().all()

    for u in users:
        await compute_and_save_risk(db, u.id)

    await db.commit()

    return {"message": f"Risk assessment completed for {len(users)} employees"}


# ── Chrome Extension Endpoint ───────────────────────────────────────────

@router.get("/employee-score", response_model=EmployeeScoreResponse)
async def get_employee_score(
    email: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):

    user = (
        await db.execute(select(User).where(User.email == email))
    ).scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    rs = await compute_and_save_risk(db, user.id)

    events = await get_event_counts_for_user(db, user.id)

    return EmployeeScoreResponse(
        score=rs.risk_score,
        risk_level=rs.risk_level,
        clicks=events.get("link_click", 0),
        credentials=events.get("credential_attempt", 0),
        downloads=events.get("file_download", 0),
    )


@router.get("/users", response_model=UserRiskListResponse)
async def get_all_users_risk(db: Annotated[AsyncSession, Depends(get_db)]):
    """
    Returns a comprehensive list of all employees and their risk metrics.
    Useful for feeding the 'Risk Scoring' admin tab.
    """
    dist = {"Low": 0, "Medium": 0, "High": 0, "Critical": 0}

    users = (
        await db.execute(
            select(User).where(User.role == UserRole.employee)
        )
    ).scalars().all()

    entries: list[UserRiskListEntry] = []

    for u in users:
        rs = await compute_and_save_risk(db, u.id)
        counts = await get_event_counts_for_user(db, u.id)

        report_rate = (counts.get("reported", 0) / (counts.get("clicks", 0) + 1)) * 100
        sim_training = min(100.0, 40.0 + report_rate)

        entry = UserRiskListEntry(
            name=u.name if u.name else u.email.split("@")[0],
            email=u.email,
            department=u.department or "Unknown",
            risk_level=rs.risk_level,
            risk_score=rs.risk_score,
            clicks=counts.get("clicks", 0),
            credentials=counts.get("credential_attempts", 0),
            downloads=counts.get("downloads", 0),
            reported=counts.get("reported", 0),
            training_progress=round(sim_training, 1),
        )
        entries.append(entry)

        level_str = rs.risk_level.value.capitalize()
        if level_str in dist:
            dist[level_str] += 1
        else:
            dist["High"] += 1

    return UserRiskListResponse(users=entries, distribution=dist)


# ── Channel Performance ────────────────────────────────────────────────


class ChannelPerformanceResponse(BaseModel):
    email_click_rate: float
    sms_click_rate: float
    whatsapp_click_rate: float
    email_campaigns: int = 0
    sms_campaigns: int = 0
    whatsapp_campaigns: int = 0


@router.get("/channel-performance", response_model=ChannelPerformanceResponse)
async def channel_performance(db: Annotated[AsyncSession, Depends(get_db)]):
    """Click rate and campaign counts by channel (EMAIL, SMS, WHATSAPP)."""
    camp_counts = await db.execute(
        select(Campaign.channel_type, func.count().label("cnt")).group_by(
            Campaign.channel_type
        )
    )
    by_channel = {row.channel_type: row.cnt for row in camp_counts}
    email_campaigns = by_channel.get(ChannelType.EMAIL, 0)
    sms_campaigns = by_channel.get(ChannelType.SMS, 0)
    whatsapp_campaigns = by_channel.get(ChannelType.WHATSAPP, 0)

    sent_by_channel: dict[str, int] = {"EMAIL": 0, "SMS": 0, "WHATSAPP": 0}
    clicks_by_channel: dict[str, int] = {"EMAIL": 0, "SMS": 0, "WHATSAPP": 0}

    for ch_enum, key in [
        (ChannelType.EMAIL, "EMAIL"),
        (ChannelType.SMS, "SMS"),
        (ChannelType.WHATSAPP, "WHATSAPP"),
    ]:
        sent_type = {
            "EMAIL": EventType.EMAIL_SENT,
            "SMS": EventType.SMS_SENT,
            "WHATSAPP": EventType.WHATSAPP_SENT,
        }[key]
        sent_q = await db.execute(
            select(func.count())
            .select_from(Event)
            .join(Campaign, Event.campaign_id == Campaign.id)
            .where(Campaign.channel_type == ch_enum, Event.event_type == sent_type)
        )
        sent_by_channel[key] = sent_q.scalar_one() or 0

        click_q = await db.execute(
            select(func.count())
            .select_from(Event)
            .join(Campaign, Event.campaign_id == Campaign.id)
            .where(
                Campaign.channel_type == ch_enum,
                Event.event_type == EventType.LINK_CLICK,
            )
        )
        clicks_by_channel[key] = click_q.scalar_one() or 0

    def rate(sent: int, clicks: int) -> float:
        return round(clicks / sent * 100, 1) if sent else 0.0

    return ChannelPerformanceResponse(
        email_click_rate=rate(
            sent_by_channel["EMAIL"], clicks_by_channel["EMAIL"]
        ),
        sms_click_rate=rate(sent_by_channel["SMS"], clicks_by_channel["SMS"]),
        whatsapp_click_rate=rate(
            sent_by_channel["WHATSAPP"], clicks_by_channel["WHATSAPP"]
        ),
        email_campaigns=email_campaigns,
        sms_campaigns=sms_campaigns,
        whatsapp_campaigns=whatsapp_campaigns,
    )
