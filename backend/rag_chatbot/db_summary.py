"""
DB-backed answers for the chatbot: query campaigns, events, and reports
to summarize and answer questions like "last campaign report", "recent reports", etc.
"""
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from campaigns.models import Campaign, CampaignTarget, CampaignStatus
from events.models import Event, EventType
from analytics.models import RiskScore, RiskLevel


def _wants_campaign_report(q: str) -> bool:
    q = q.lower().strip()
    if "campaign" in q and ("report" in q or "last" in q or "recent" in q):
        return True
    if "last report" in q or "recent report" in q or "campaign report" in q:
        return True
    if "what was" in q and ("campaign" in q or "report" in q):
        return True
    return False


def _wants_campaigns_list(q: str) -> bool:
    q = q.lower().strip()
    return "campaign" in q and ("list" in q or "all" in q or "what campaign" in q or "which campaign" in q)


def _wants_reports_only(q: str) -> bool:
    q = q.lower().strip()
    return ("report" in q or "reported" in q) and "campaign" not in q and ("last" in q or "recent" in q or "how many" in q)


def _wants_analytics(q: str) -> bool:
    q = q.lower().strip()
    return any(x in q for x in ("risk", "analytics", "dashboard", "stat", "click rate", "report rate", "how many"))


async def answer_from_db(db: AsyncSession, query: str) -> str | None:
    """
    If the query is about campaign/report/analytics data, query the DB and return
    a short summary. Otherwise return None so the caller can use a generic response.
    """
    q = (query or "").strip().lower()
    if not q:
        return None

    # —— Last / recent campaign report (campaigns + report activity)
    if _wants_campaign_report(q) or "last campaign" in q:
        campaigns_result = await db.execute(
            select(Campaign)
            .order_by(desc(Campaign.created_at))
            .limit(5)
        )
        campaigns = list(campaigns_result.scalars().all())
        if not campaigns:
            return "There are no campaigns yet. Create a campaign from the Campaigns section to run phishing simulations."

        # Recent EMAIL_REPORTED events
        reported_result = await db.execute(
            select(Event, Campaign.name)
            .join(Campaign, Event.campaign_id == Campaign.id)
            .where(Event.event_type == EventType.EMAIL_REPORTED)
            .order_by(desc(Event.timestamp))
            .limit(10)
        )
        reported_rows = list(reported_result.all())

        # Targets marked as reported per campaign
        report_counts = {}
        for c in campaigns:
            cnt = await db.execute(
                select(func.count()).select_from(CampaignTarget).where(
                    CampaignTarget.campaign_id == c.id,
                    CampaignTarget.reported == True,
                )
            )
            report_counts[c.id] = cnt.scalar_one() or 0

        lines = ["Recent campaigns and reporting:"]
        for c in campaigns[:5]:
            status = c.status.value if hasattr(c.status, "value") else str(c.status)
            rc = report_counts.get(c.id, 0)
            lines.append(f"  • {c.name} (id {c.id}): status {status}, {rc} report(s) from targets.")
        if reported_rows:
            lines.append("\nLatest report events:")
            for row in reported_rows[:5]:
                ev, cname = row[0], row[1]
                ts = ev.timestamp.strftime("%Y-%m-%d %H:%M") if ev.timestamp else "—"
                lines.append(f"  • Campaign \"{cname}\" at {ts} (user_id: {ev.user_id}).")
        return "\n".join(lines)

    # —— List / what campaigns
    if _wants_campaigns_list(q):
        result = await db.execute(
            select(Campaign).order_by(desc(Campaign.created_at)).limit(15)
        )
        campaigns = list(result.scalars().all())
        if not campaigns:
            return "There are no campaigns in the system yet."
        lines = [f"Campaigns (up to {len(campaigns)}):"]
        for c in campaigns:
            status = c.status.value if hasattr(c.status, "value") else str(c.status)
            lines.append(f"  • {c.name} (id {c.id}) — {status}")
        return "\n".join(lines)

    # —— Recent reports only (no campaign in query)
    if _wants_reports_only(q):
        result = await db.execute(
            select(Event, Campaign.name)
            .join(Campaign, Event.campaign_id == Campaign.id)
            .where(Event.event_type == EventType.EMAIL_REPORTED)
            .order_by(desc(Event.timestamp))
            .limit(15)
        )
        rows = list(result.all())
        if not rows:
            return "No phishing report events have been recorded yet."
        lines = ["Recent phishing reports:"]
        for row in rows[:10]:
            ev, cname = row[0], row[1]
            ts = ev.timestamp.strftime("%Y-%m-%d %H:%M") if ev.timestamp else "—"
            lines.append(f"  • \"{cname}\" at {ts} (user_id: {ev.user_id})")
        return "\n".join(lines)

    # —— Analytics / risk / stats
    if _wants_analytics(q):
        total_c = (await db.execute(select(func.count()).select_from(Campaign))).scalar_one() or 0
        running = (await db.execute(
            select(func.count()).select_from(Campaign).where(Campaign.status == CampaignStatus.running)
        )).scalar_one() or 0
        total_targets = (await db.execute(select(func.count()).select_from(CampaignTarget))).scalar_one() or 0
        reported = (await db.execute(
            select(func.count()).select_from(CampaignTarget).where(CampaignTarget.reported == True)
        )).scalar_one() or 0
        report_rate = (reported / total_targets * 100) if total_targets else 0
        high_risk = (await db.execute(
            select(func.count()).select_from(RiskScore).where(
                RiskScore.risk_level.in_([RiskLevel.HIGH, RiskLevel.CRITICAL])
            )
        )).scalar_one() or 0
        avg_risk = (await db.execute(select(func.avg(RiskScore.risk_score)))).scalar_one() or 0
        return (
            f"Summary: {total_c} total campaigns, {running} running. "
            f"{total_targets} targets; {reported} reported phishing ({report_rate:.1f}% report rate). "
            f"High/critical risk users: {high_risk}. Average risk score: {float(avg_risk):.1f}."
        )

    return None
