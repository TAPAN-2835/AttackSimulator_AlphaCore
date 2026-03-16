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
    return any(x in q for x in ("risk", "analytics", "dashboard", "stat", "click rate", "report rate", "how many", "summary", "summarize", "posture"))


def _wants_users(q: str) -> bool:
    q = q.lower().strip()
    return any(x in q for x in ("user", "employee", "admin", "groups", "department", "who", "people"))


def _wants_templates(q: str) -> bool:
    q = q.lower().strip()
    return any(x in q for x in ("template", "email body", "sms body", "message", "scenario"))


def _wants_events(q: str) -> bool:
    q = q.lower().strip()
    return any(x in q for x in ("event", "activity", "happening", "log", "recent action", "history"))


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
            return "No campaigns found. You can create one in the **Campaigns** section."

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

        lines = ["### 📊 Recent Campaigns & Reporting"]
        for c in campaigns[:5]:
            status = c.status.value if hasattr(c.status, "value") else str(c.status)
            rc = report_counts.get(c.id, 0)
            status_color = "🟢" if status == "running" else "⚪"
            lines.append(f"{status_color} **{c.name}** (ID: `{c.id}`)\n   - **Status:** `{status}`\n   - **Reports:** `{rc}` reported by targets")
        
        # Recent EMAIL_REPORTED events
        reported_result = await db.execute(
            select(Event, Campaign.name)
            .join(Campaign, Event.campaign_id == Campaign.id)
            .where(Event.event_type == EventType.EMAIL_REPORTED)
            .order_by(desc(Event.timestamp))
            .limit(5)
        )
        reported_rows = list(reported_result.all())
        
        if reported_rows:
            lines.append("\n#### 🚨 Latest Report Events")
            for row in reported_rows:
                ev, cname = row[0], row[1]
                ts = ev.timestamp.strftime("%b %d, %H:%M") if ev.timestamp else "—"
                lines.append(f"  • **{cname}**: Report received at `{ts}` (User ID: `{ev.user_id}`)")
        
        return "\n".join(lines)

    # —— List / what campaigns
    if _wants_campaigns_list(q):
        result = await db.execute(
            select(Campaign).order_by(desc(Campaign.created_at)).limit(15)
        )
        campaigns = list(result.scalars().all())
        if not campaigns:
            return "No campaigns found in the system."
        
        lines = ["### 📋 Campaign Overview"]
        for c in campaigns:
            status = c.status.value if hasattr(c.status, "value") else str(c.status)
            icon = "🚀" if status == "running" else "✅" if status == "completed" else "📝"
            lines.append(f"{icon} **{c.name}** (ID: `{c.id}`) — Status: `{status}`")
        return "\n".join(lines)

    # —— Recent reports only (no campaign in query)
    if _wants_reports_only(q):
        result = await db.execute(
            select(Event, Campaign.name)
            .join(Campaign, Event.campaign_id == Campaign.id)
            .where(Event.event_type == EventType.EMAIL_REPORTED)
            .order_by(desc(Event.timestamp))
            .limit(10)
        )
        rows = list(result.all())
        if not rows:
            return "No phishing report events have been recorded yet."
        
        lines = ["### 🚨 Recent Phishing Reports"]
        for row in rows:
            ev, cname = row[0], row[1]
            ts = ev.timestamp.strftime("%b %d, %H:%M") if ev.timestamp else "—"
            lines.append(f"• **{cname}** — `{ts}` (User ID: `{ev.user_id}`)")
        return "\n".join(lines)

    # —— Users / Employees
    if _wants_users(q):
        from auth.models import User, UserRole
        total_u = (await db.execute(select(func.count()).select_from(User))).scalar_one() or 0
        by_role = {}
        for role in UserRole:
            cnt = (await db.execute(select(func.count()).select_from(User).where(User.role == role))).scalar_one() or 0
            by_role[role.value] = cnt
        
        lines = [
            "### 👥 User & Organization Overview",
            f"- **Total Users:** `{total_u}`",
            f"- **Admins:** `{by_role.get('admin', 0)}`",
            f"- **Employees:** `{by_role.get('employee', 0)}`",
            f"- **Analysts:** `{by_role.get('analyst', 0)}`"
        ]
        
        # Departments
        depts_res = await db.execute(select(User.department, func.count()).group_by(User.department))
        depts = depts_res.all()
        if depts:
            lines.append("\n**Departments:**")
            for dept, count in depts:
                name = dept if dept else "Unassigned"
                lines.append(f"  • {name}: `{count}` users")
        return "\n".join(lines)

    # —— Templates
    if _wants_templates(q):
        from campaigns.models import MessageTemplate, ChannelType
        total_t = (await db.execute(select(func.count()).select_from(MessageTemplate))).scalar_one() or 0
        lines = ["### 📝 Message Templates", f"Total templates in library: `{total_t}`"]
        
        for ct in ChannelType:
            cnt = (await db.execute(select(func.count()).select_from(MessageTemplate).where(MessageTemplate.channel_type == ct))).scalar_one() or 0
            lines.append(f"- **{ct.value}:** `{cnt}` templates")
        return "\n".join(lines)

    # —— Events / Activity
    if _wants_events(q):
        from events.models import Event, EventType
        result = await db.execute(select(Event).order_by(desc(Event.timestamp)).limit(10))
        events = result.scalars().all()
        if not events:
            return "No system activity has been recorded yet."
        
        lines = ["### 🕒 Recent System Activity"]
        for ev in events:
            ts = ev.timestamp.strftime("%b %d, %H:%M:%S")
            etype = ev.event_type.value.replace("_", " ").title()
            lines.append(f"- `{ts}`: **{etype}** (User: `{ev.user_id or 'System'}`)")
        return "\n".join(lines)

    # —— Department Analytics (Specific request: highest click rate, etc.)
    if "department" in q and ("rate" in q or "highest" in q or "lowest" in q or "click" in q or "report" in q):
        # Calculate stats group by department
        from sqlalchemy import literal_column
        stats_query = (
            select(
                CampaignTarget.department,
                func.count(CampaignTarget.id).label("total"),
                func.sum(func.cast(CampaignTarget.link_clicked, Integer)).label("clicks"),
                func.sum(func.cast(CampaignTarget.reported, Integer)).label("reports")
            )
            .group_by(CampaignTarget.department)
        )
        stats_rows = (await db.execute(stats_query)).all()
        
        if not stats_rows:
            return "No department-level simulation data is available yet."
            
        lines = ["### 🏢 Department-Level Analytics"]
        dept_data = []
        for row in stats_rows:
            dept = row.department if row.department else "Unassigned"
            total = row.total or 0
            clicks = row.clicks or 0
            reports = row.reports or 0
            click_rate = (clicks / total * 100) if total > 0 else 0
            report_rate = (reports / total * 100) if total > 0 else 0
            dept_data.append({
                "name": dept,
                "total": total,
                "clicks": clicks,
                "reports": reports,
                "click_rate": click_rate,
                "report_rate": report_rate
            })

        # Sort for easy answering (descending click rate)
        dept_data.sort(key=lambda x: x["click_rate"], reverse=True)
        
        for d in dept_data:
            lines.append(
                f"- **{d['name']}**: Click Rate: `{d['click_rate']:.1f}%` ({d['clicks']}/{d['total']}), "
                f"Report Rate: `{d['report_rate']:.1f}%`"
            )
        
        highest_click = dept_data[0]
        if highest_click['click_rate'] > 0:
            lines.append(f"\n⚠️ **Insight**: The **{highest_click['name']}** department shows the highest click rate at `{highest_click['click_rate']:.1f}%`.")
        
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
        
        risk_result = await db.execute(
            select(func.count()).select_from(RiskScore).where(
                RiskScore.risk_level.in_([RiskLevel.HIGH, RiskLevel.CRITICAL])
            )
        )
        high_risk = risk_result.scalar_one() or 0
        
        avg_risk_res = await db.execute(select(func.avg(RiskScore.risk_score)))
        avg_risk = avg_risk_res.scalar_one() or 0
        
        return (
            "### 📈 Security Analytics Summary\n\n"
            f"| Metric | Value |\n"
            f"| :--- | :--- |\n"
            f"| **Total Campaigns** | {total_c} ({running} active) |\n"
            f"| **Total Targets** | {total_targets} |\n"
            f"| **Reported Phish** | {reported} (**{report_rate:.1f}%** rate) |\n"
            f"| **High Risk Users** | {high_risk} |\n"
            f"| **Avg. Risk Score** | **{float(avg_risk):.1f}** |"
        )

    return None
