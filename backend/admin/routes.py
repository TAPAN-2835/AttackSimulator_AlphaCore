from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from analytics.models import RiskScore, RiskLevel
from auth.models import User, UserRole
from auth.service import require_admin, CurrentUser, require_analyst
from campaigns.models import Campaign, CampaignTarget, CampaignStatus, ChannelType
from database import get_db
from events.models import Event
from schemas.request_models import EventOut

router = APIRouter()


class DashboardOverview(BaseModel):
    total_campaigns: int
    active_campaigns: int
    employees_tested: int
    avg_risk_score: float
    high_risk_users: int
    email_campaigns: int = 0
    sms_campaigns: int = 0
    whatsapp_campaigns: int = 0
    email_click_rate: float = 0.0
    sms_click_rate: float = 0.0
    whatsapp_click_rate: float = 0.0


@router.get("/dashboard", response_model=DashboardOverview)
async def dashboard(db: Annotated[AsyncSession, Depends(get_db)]):
    total_campaigns = (await db.execute(select(func.count()).select_from(Campaign))).scalar_one()
    active_campaigns = (await db.execute(
        select(func.count()).select_from(Campaign)
        .where(Campaign.status == CampaignStatus.running)
    )).scalar_one()
    employees_tested = (await db.execute(
        select(func.count(func.distinct(CampaignTarget.email))).select_from(CampaignTarget)
    )).scalar_one()

    avg_score_row = (await db.execute(select(func.avg(RiskScore.risk_score)))).scalar_one()
    avg_risk_score = round(float(avg_score_row or 0), 1)

    high_risk_users = (await db.execute(
        select(func.count()).select_from(RiskScore)
        .where(RiskScore.risk_level.in_([RiskLevel.HIGH, RiskLevel.CRITICAL]))
    )).scalar_one()

    # Campaign counts by channel
    camp_by_ch = await db.execute(
        select(Campaign.channel_type, func.count().label("cnt")).group_by(Campaign.channel_type)
    )
    ch_counts = {row.channel_type: row.cnt for row in camp_by_ch}
    email_campaigns = ch_counts.get(ChannelType.EMAIL, 0)
    sms_campaigns = ch_counts.get(ChannelType.SMS, 0)
    whatsapp_campaigns = ch_counts.get(ChannelType.WHATSAPP, 0)

    # Click rates by channel (from events)
    from events.models import EventType
    email_click_rate = sms_click_rate = whatsapp_click_rate = 0.0
    for ch_enum, sent_type, key in [
        (ChannelType.EMAIL, EventType.EMAIL_SENT, "email"),
        (ChannelType.SMS, EventType.SMS_SENT, "sms"),
        (ChannelType.WHATSAPP, EventType.WHATSAPP_SENT, "whatsapp"),
    ]:
        sent_q = await db.execute(
            select(func.count()).select_from(Event).join(Campaign, Event.campaign_id == Campaign.id).where(
                Campaign.channel_type == ch_enum, Event.event_type == sent_type
            )
        )
        sent = sent_q.scalar_one() or 0
        click_q = await db.execute(
            select(func.count()).select_from(Event).join(Campaign, Event.campaign_id == Campaign.id).where(
                Campaign.channel_type == ch_enum, Event.event_type == EventType.LINK_CLICK
            )
        )
        clicks = click_q.scalar_one() or 0
        rate = round(clicks / sent * 100, 1) if sent else 0.0
        if key == "email":
            email_click_rate = rate
        elif key == "sms":
            sms_click_rate = rate
        else:
            whatsapp_click_rate = rate

    return DashboardOverview(
        total_campaigns=total_campaigns,
        active_campaigns=active_campaigns,
        employees_tested=employees_tested,
        avg_risk_score=avg_risk_score,
        high_risk_users=high_risk_users,
        email_campaigns=email_campaigns,
        sms_campaigns=sms_campaigns,
        whatsapp_campaigns=whatsapp_campaigns,
        email_click_rate=email_click_rate,
        sms_click_rate=sms_click_rate,
        whatsapp_click_rate=whatsapp_click_rate,
    )


class UserWithRisk(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    department: str | None
    risk_score: float | None = None
    risk_level: RiskLevel | None = None

    model_config = {"from_attributes": True}


@router.get("/users", response_model=list[UserWithRisk])
async def list_users(db: Annotated[AsyncSession, Depends(get_db)]):
    users = (await db.execute(select(User).order_by(User.created_at.desc()))).scalars().all()
    user_ids = [u.id for u in users]

    risk_rows = {}
    if user_ids:
        rs_q = await db.execute(select(RiskScore).where(RiskScore.user_id.in_(user_ids)))
        risk_rows = {rs.user_id: rs for rs in rs_q.scalars()}

    result = []
    for u in users:
        rs = risk_rows.get(u.id)
        result.append(UserWithRisk(
            id=u.id, name=u.name, email=u.email,
            role=u.role, department=u.department,
            risk_score=rs.risk_score if rs else None,
            risk_level=rs.risk_level if rs else None,
        ))
    return result


class RoleUpdate(BaseModel):
    role: UserRole


@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: int,
    body: RoleUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = body.role
    db.add(user)
    return {"message": f"Role updated to {body.role.value}", "user_id": user_id}


@router.get("/recent-events", response_model=list[EventOut])
async def recent_events(
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(default=50, le=200),
):
    """Return the N most recent events, enriched with user email and campaign name."""
    result = await db.execute(
        select(Event).order_by(desc(Event.timestamp)).limit(limit)
    )
    events = result.scalars().all()

    user_ids = {e.user_id for e in events if e.user_id}
    campaign_ids = {e.campaign_id for e in events if e.campaign_id}

    users: dict[int, str] = {}
    if user_ids:
        u_res = await db.execute(select(User.id, User.email).where(User.id.in_(user_ids)))
        users = {row.id: row.email for row in u_res}

    campaigns: dict[int, tuple[str, str]] = {}  # id -> (name, channel_type)
    if campaign_ids:
        c_res = await db.execute(
            select(Campaign.id, Campaign.name, Campaign.channel_type).where(Campaign.id.in_(campaign_ids))
        )
        campaigns = {row.id: (row.name, row.channel_type.value if row.channel_type else "EMAIL") for row in c_res}

    out = []
    for e in events:
        o = EventOut.model_validate(e)
        o.user_email = users.get(e.user_id) if e.user_id else None
        if e.campaign_id and e.campaign_id in campaigns:
            o.campaign_name, o.channel = campaigns[e.campaign_id]
        out.append(o)
    return out


@router.get("/departments", response_model=list[str])
async def list_departments(db: Annotated[AsyncSession, Depends(get_db)]):
    """Return a sorted list of distinct departments that have at least one employee."""
    result = await db.execute(
        select(func.distinct(User.department)).where(
            User.department != None,
            User.role == UserRole.employee,
        )
    )
    departments = sorted(row[0] for row in result.all() if row[0])
    return departments

