from datetime import datetime
from io import BytesIO
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import HTMLResponse, StreamingResponse
from jinja2 import Template
from xhtml2pdf import pisa
from pydantic import BaseModel
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession

from analytics.models import RiskScore, RiskLevel
from analytics.risk_engine import compute_and_save_risk, get_event_counts_for_user
from auth.models import User, UserRole
from auth.service import CurrentUser
from campaigns.models import CampaignTarget, Campaign, AttackType
from campaigns.models import ChannelType
from events.models import Event, EventType
from database import get_db
from utils.report_templates import REPORT_TEMPLATE

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
    correct_detection_count: int = 0
    incorrect_detection_count: int = 0
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


class LatestFeedbackResponse(BaseModel):
    campaign_name: str
    attack_type: AttackType
    link_clicked: bool
    credential_attempt: bool
    file_download: bool
    attack_indicators: list[str] = []


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
        correct_detection_count=rs.correct_detection_count,
        incorrect_detection_count=rs.incorrect_detection_count,
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


@router.get("/latest-feedback", response_model=LatestFeedbackResponse | None)
async def get_latest_feedback(
    current_user: Annotated[User, Depends(CurrentUser)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Fetch the most recent simulation interaction details for the logged-in employee."""
    from campaigns.models import CampaignTarget, Campaign
    
    stmt = (
        select(CampaignTarget, Campaign.name, Campaign.attack_indicators, Campaign.attack_type)
        .join(Campaign, CampaignTarget.campaign_id == Campaign.id)
        .where(CampaignTarget.user_id == current_user.id)
        .order_by(CampaignTarget.id.desc())
        .limit(1)
    )
    
    result = await db.execute(stmt)
    row = result.fetchone()
    
    if not row:
        return None
        
    target, camp_name, indicators, attack_type = row
    
    return LatestFeedbackResponse(
        campaign_name=camp_name,
        attack_type=attack_type,
        link_clicked=target.link_clicked,
        credential_attempt=target.credential_attempt,
        file_download=target.file_download,
        attack_indicators=indicators if indicators else []
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


# ── AI Security Insights ───────────────────────────────────────────────


class AiInsightsResponse(BaseModel):
    insights: list[str]


@router.get("/ai-insights", response_model=AiInsightsResponse)
async def ai_insights(db: Annotated[AsyncSession, Depends(get_db)]) -> AiInsightsResponse:
    """
    Generate simple, human-readable security insights from existing analytics data.
    This is lightweight and only uses aggregate queries on existing tables.
    """
    insights: list[str] = []

    # 1) Department with highest phishing click rate
    dept_rows = await db.execute(
        select(
            CampaignTarget.department,
            func.count().label("total"),
            func.sum(
                case(
                    (CampaignTarget.link_clicked == True, 1),
                    else_=0,
                )
            ).label("clicked"),
        )
        .where(CampaignTarget.department.isnot(None))
        .group_by(CampaignTarget.department)
    )
    top_dept = None
    top_rate = 0.0
    for row in dept_rows:
        total = row.total or 0
        clicked = row.clicked or 0
        if total == 0:
            continue
        rate = round(clicked / total * 100, 1)
        if rate > top_rate:
            top_rate = rate
            top_dept = row.department
    if top_dept and top_rate > 0:
        insights.append(
            f"{top_dept} department shows the highest phishing click rate at {top_rate}%."
        )

    # 2) Total credential submissions
    total_creds = (
        await db.execute(
            select(func.count())
            .select_from(Event)
            .where(Event.event_type == EventType.CREDENTIAL_ATTEMPT)
        )
    ).scalar_one() or 0
    if total_creds > 0:
        insights.append(
            f"{total_creds} credential submission attempts have been detected across all campaigns."
        )

    # 3) Most frequently targeted department (by number of campaign targets)
    most_targeted = await db.execute(
        select(
            CampaignTarget.department,
            func.count().label("cnt"),
        )
        .where(CampaignTarget.department.isnot(None))
        .group_by(CampaignTarget.department)
        .order_by(func.count().desc())
        .limit(1)
    )
    row = most_targeted.fetchone()
    if row and row.department:
        insights.append(
            f"{row.department} department is currently the most frequently targeted in simulations."
        )

    # 4) Malware download simulations
    malware_downloads = (
        await db.execute(
            select(func.count())
            .select_from(Event)
            .where(Event.event_type == EventType.FILE_DOWNLOAD)
        )
    ).scalar_one() or 0
    if malware_downloads > 0:
        insights.append(
            f"{malware_downloads} simulated malware download events have been triggered by employees."
        )

    # 5) Overall campaign click-through rate
    total_targets = (
        await db.execute(select(func.count()).select_from(CampaignTarget))
    ).scalar_one() or 0
    total_clicks = (
        await db.execute(
            select(func.count())
            .select_from(CampaignTarget)
            .where(CampaignTarget.link_clicked == True)
        )
    ).scalar_one() or 0
    if total_targets > 0:
        ctr = round(total_clicks / total_targets * 100, 1)
        insights.append(
            f"Overall campaign click-through rate is {ctr}% across all simulations."
        )

    if not insights:
        # Fallback to avoid empty list, frontend will still show a friendly message
        return AiInsightsResponse(insights=[])

    return AiInsightsResponse(insights=insights)


@router.get("/export-report")
async def export_security_report(db: AsyncSession = Depends(get_db)):
    # 1. Gather Global Metrics
    total_targets = (await db.execute(select(func.count()).select_from(CampaignTarget))).scalar_one() or 1
    
    def count_attr(attr):
        return select(func.count()).select_from(CampaignTarget).where(attr == True)

    clicks = (await db.execute(count_attr(CampaignTarget.link_clicked))).scalar_one() or 0
    creds = (await db.execute(count_attr(CampaignTarget.credential_attempt))).scalar_one() or 0
    downloads = (await db.execute(count_attr(CampaignTarget.file_download))).scalar_one() or 0
    reported = (await db.execute(count_attr(CampaignTarget.reported))).scalar_one() or 0

    click_rate = round(clicks / total_targets * 100, 1)
    cred_rate = round(creds / total_targets * 100, 1)
    down_rate = round(downloads / total_targets * 100, 1)
    rep_rate = round(reported / total_targets * 100, 1)

    # 2. Gather Departmental Data
    dept_rows = await db.execute(
        select(
            CampaignTarget.department,
            func.count().label("total"),
            func.sum(case((CampaignTarget.link_clicked == True, 1), else_=0)).label("clicked"),
            func.sum(case((CampaignTarget.credential_attempt == True, 1), else_=0)).label("creds"),
        )
        .where(CampaignTarget.department.isnot(None))
        .group_by(CampaignTarget.department)
    )

    departments = []
    for row in dept_rows:
        d_total = row.total or 1
        d_click = round((row.clicked or 0) / d_total * 100, 1)
        d_cred = round((row.creds or 0) / d_total * 100, 1)
        
        risk_l = "Low"
        if d_click > 50 or d_cred > 20: risk_l = "Critical"
        elif d_click > 30 or d_cred > 10: risk_l = "High"
        elif d_click > 15: risk_l = "Medium"
        
        departments.append({
            "name": row.department,
            "total": d_total,
            "click_rate": d_click,
            "credential_rate": d_cred,
            "risk_level": risk_l
        })

    # 3. Risk Distribution
    users_with_risk = await get_all_users_risk(db)
    distribution_list = []
    total_users = len(users_with_risk.users) or 1
    for level, count in users_with_risk.distribution.items():
        distribution_list.append({
            "level": level,
            "count": count,
            "percentage": round(count / total_users * 100, 1)
        })

    # 4. Top Vulnerable Users
    top_users_list = sorted(users_with_risk.users, key=lambda x: x.risk_score, reverse=True)[:10]

    # 5. Channel Performance
    channel_perf = await channel_performance(db)
    
    # Helper to get sent/clicked counts for specific channels since channel_performance doesn't return raw counts in the model
    # We'll just calculate rates from the response for now
    channels = [
        {"type": "Email", "sent": "N/A", "clicks": "N/A", "rate": channel_perf.email_click_rate},
        {"type": "SMS", "sent": "N/A", "clicks": "N/A", "rate": channel_perf.sms_click_rate},
        {"type": "WhatsApp", "sent": "N/A", "clicks": "N/A", "rate": channel_perf.whatsapp_click_rate},
    ]

    # 6. AI Insights
    insight_response = await ai_insights(db)
    insights = insight_response.insights

    # 7. Generate Remedies
    remedies = []
    if click_rate > 15:
        remedies.append({
            "title": "Quarterly Social Engineering Drills",
            "description": f"Organizational click rate ({click_rate}%) exceeds threshold. Implement mandatory quarterly simulations."
        })
    if cred_rate > 3:
        remedies.append({
            "title": "Phishing-Resistant MFA (MFA Hardening)",
            "description": f"High credential submission rate ({cred_rate}%). Prioritize transition to FIDO2/WebAuthn keys."
        })
    if rep_rate < 50:
        remedies.append({
            "title": "Positive Reinforcement Reporting Culture",
            "description": "Lower than ideal reporting rate. Reward employees who report simulations with public recognition."
        })
    
    if not remedies:
        remedies.append({
            "title": "Advanced Threat Intelligence Briefings",
            "description": "Current performance is excellent. We recommend advanced briefings for technical leadership."
        })

    # 8. Render Template
    template = Template(REPORT_TEMPLATE)
    html_content = template.render(
        date=datetime.now().strftime("%B %d, %Y"),
        click_rate=click_rate,
        credential_rate=cred_rate,
        download_rate=down_rate,
        report_rate=rep_rate,
        departments=departments,
        distribution=distribution_list,
        top_users=top_users_list,
        channels=channels,
        insights=insights,
        remedies=remedies
    )

    # 6. Convert HTML to PDF
    pdf_result = BytesIO()
    pisa.pisaDocument(BytesIO(html_content.encode("UTF-8")), pdf_result)
    pdf_result.seek(0)

    return StreamingResponse(
        pdf_result, 
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Security_Report_{datetime.now().strftime('%Y%m%d')}.pdf"}
    )
