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
from employees.models import Employee, Group, EmployeeStatus
from schemas.request_models import (
    EventOut,
    GroupOut,
    GroupCreateRequest,
    EmployeeOut,
    EmployeeUpdateRequest,
)
from fastapi import UploadFile, File, BackgroundTasks
import csv
import io

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
    phone_number: str | None = None
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
            phone_number=u.phone_number,
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


# ── Employee & Group Management ────────────────────────────────────────────────


@router.get("/groups", response_model=list[GroupOut])
async def list_groups(db: Annotated[AsyncSession, Depends(get_db)]):
    """Return all groups with member counts and last activity timestamp."""
    groups = (await db.execute(select(Group))).scalars().all()

    # Preload employee counts per group
    counts = await db.execute(
        select(Employee.department_id, func.count().label("cnt"))
        .where(Employee.status == EmployeeStatus.active)
        .group_by(Employee.department_id)
    )
    count_map = {row.department_id: row.cnt for row in counts}

    # Last activity per group (based on events joined via user email -> employee email)
    # This is a best-effort, not an exact analytic.
    last_activity_map: dict[int, datetime | None] = {}
    if groups:
        # Map emails → department_id
        emp_rows = await db.execute(
            select(Employee.email, Employee.department_id).where(
                Employee.status == EmployeeStatus.active
            )
        )
        email_to_group: dict[str, int] = {}
        for email, dept_id in emp_rows:
            if dept_id is not None:
                email_to_group[email] = dept_id

        if email_to_group:
            # Load recent events with user emails
            ev_rows = await db.execute(
                select(Event, User.email)
                .join(User, User.id == Event.user_id)
                .order_by(desc(Event.timestamp))
                .limit(500)
            )
            for event, email in ev_rows:
                dept_id = email_to_group.get(email)
                if dept_id is None:
                    continue
                current = last_activity_map.get(dept_id)
                if current is None or event.timestamp > current:
                    last_activity_map[dept_id] = event.timestamp

    out: list[GroupOut] = []
    for g in groups:
        out.append(
            GroupOut(
                group_id=g.group_id,
                group_name=g.group_name,
                description=g.description,
                members=count_map.get(g.group_id, 0),
                last_activity=last_activity_map.get(g.group_id),
            )
        )
    return out


@router.post("/groups/create", response_model=GroupOut)
async def create_group(
    body: GroupCreateRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    existing = (
        await db.execute(
            select(Group).where(func.lower(Group.group_name) == body.group_name.lower())
        )
    ).scalar_one_or_none()
    if existing:
        group = existing
        group.description = body.description or group.description
    else:
        group = Group(group_name=body.group_name, description=body.description)
        db.add(group)
        await db.flush()

    # Optionally attach members by email
    member_emails = body.member_emails or []
    for email in member_emails:
        email_clean = email.strip().lower()
        if not email_clean:
            continue
        emp = (
            await db.execute(
                select(Employee).where(Employee.email == email_clean)
            )
        ).scalar_one_or_none()
        if not emp:
            # create a minimal employee record; name will be the email local-part
            emp = Employee(
                name=email_clean.split("@")[0],
                email=email_clean,
                department_id=group.group_id,
                status=EmployeeStatus.active,
            )
            db.add(emp)
        else:
            emp.department_id = group.group_id
            db.add(emp)
    await db.commit()

    return GroupOut(
        group_id=group.group_id,
        group_name=group.group_name,
        description=group.description,
        members=len(member_emails or []),
        last_activity=None,
    )


@router.get("/groups/{group_id}/members", response_model=list[EmployeeOut])
async def group_members(
    group_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    emps = (
        await db.execute(
            select(Employee)
            .where(
                Employee.department_id == group_id,
                Employee.status == EmployeeStatus.active,
            )
            .order_by(Employee.created_at.desc())
        )
    ).scalars().all()
    return [
        EmployeeOut(
            employee_id=e.employee_id,
            name=e.name,
            email=e.email,
            department=str(group_id),
            phone=e.phone,
            status=e.status,
        )
        for e in emps
    ]


@router.post("/users/upload-csv")
async def upload_users_csv(
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(...),
):
    """Upload employees from CSV and sync with users/groups."""
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")

    content = (await file.read()).decode("utf-8")
    reader = csv.DictReader(io.StringIO(content))

    imported = 0
    skipped = 0
    new_groups_created: set[str] = set()

    # Cache existing groups by lowercase name
    # Using a simple dict of name -> id mappings for speed
    existing_groups_raw = (
        await db.execute(select(Group.group_name, Group.group_id))
    ).all()
    groups_by_name: dict[str, int] = {
        name.strip().lower(): gid for name, gid in existing_groups_raw
    }

    # Existing employee/user emails
    existing_emp_emails = {
        e.strip().lower() for (e,) in (await db.execute(select(Employee.email))).all()
    }

    from utils.security import hash_password

    for row in reader:
        name = (row.get("name") or "").strip()
        email = (row.get("email") or "").strip().lower()
        dept = (row.get("department") or row.get("dept") or "").strip()
        phone = (row.get("phone") or row.get("mobile") or "").strip()

        if not email or not dept:
            skipped += 1
            continue

        if email in existing_emp_emails:
            # Optionally update info, but for now skip duplicates to avoid complexity
            skipped += 1
            continue

        # Ensure group exists (case-insensitive check)
        key = dept.lower()
        group_id = groups_by_name.get(key)
        
        if group_id is None:
            # Double check with DB to be extra safe against race conditions
            existing_q = await db.execute(select(Group).where(func.lower(Group.group_name) == key))
            existing_g = existing_q.scalar_one_or_none()
            
            if existing_g:
                group_id = existing_g.group_id
                groups_by_name[key] = group_id
            else:
                new_group = Group(group_name=dept, description=f"{dept} department")
                db.add(new_group)
                await db.flush() # Get the ID
                group_id = new_group.group_id
                groups_by_name[key] = group_id
                new_groups_created.add(dept)

        emp = Employee(
            name=name or email.split("@")[0],
            email=email,
            department_id=group_id,
            phone=phone or None,
            status=EmployeeStatus.active,
        )
        db.add(emp)

        # Sync into main users table for campaign targeting
        user = (
            await db.execute(select(User).where(User.email == email))
        ).scalar_one_or_none()
        if user:
            user.name = name or user.name
            user.phone_number = phone or user.phone_number
            user.department = dept
            db.add(user)
        else:
            # Create a non-loginable user with a random password
            user = User(
                name=name or email.split("@")[0],
                email=email,
                phone_number=phone or None,
                password_hash=hash_password("TempPass123!"),
                role=UserRole.employee,
                department=dept,
            )
            db.add(user)

        imported += 1
        existing_emp_emails.add(email)

    await db.commit()

    return {
        "imported": imported,
        "skipped": skipped,
        "new_groups_created": len(new_groups_created),
    }


@router.put("/users/update", response_model=EmployeeOut)
async def update_employee(
    body: EmployeeUpdateRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Edit employee details and keep users table in sync."""
    if not body.employee_id and not body.email:
        raise HTTPException(
            status_code=400, detail="employee_id or email is required to update"
        )

    query = select(Employee)
    if body.employee_id:
        query = query.where(Employee.employee_id == body.employee_id)
    elif body.email:
        query = query.where(Employee.email == body.email)

    emp = (await db.execute(query)).scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    if body.name is not None:
        emp.name = body.name
    if body.phone is not None:
        emp.phone = body.phone
    if body.status is not None:
        emp.status = body.status

    dept_name: str | None = None
    if body.department is not None:
        dept_name = body.department.strip() or None
        if dept_name:
            key = dept_name.lower()
            group = (
                await db.execute(
                    select(Group).where(func.lower(Group.group_name) == key)
                )
            ).scalar_one_or_none()
            if not group:
                group = Group(group_name=dept_name, description=f"{dept_name} department")
                db.add(group)
                await db.flush()
            emp.department_id = group.group_id
        else:
            emp.department_id = None

    # Sync User record
    user = (
        await db.execute(select(User).where(User.email == emp.email))
    ).scalar_one_or_none()
    if user:
        if body.name is not None:
            user.name = body.name
        if body.phone is not None:
            user.phone_number = body.phone
        if dept_name is not None:
            user.department = dept_name
        db.add(user)

    db.add(emp)
    await db.commit()
    await db.refresh(emp)

    return EmployeeOut(
        employee_id=emp.employee_id,
        name=emp.name,
        email=emp.email,
        department=dept_name,
        phone=emp.phone,
        status=emp.status,
    )


@router.post("/users/{employee_id}/remove")
async def remove_employee(
    employee_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Soft-remove an employee (status=removed) while keeping analytics intact."""
    emp = (
        await db.execute(
            select(Employee).where(Employee.employee_id == employee_id)
        )
    ).scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    emp.status = EmployeeStatus.removed
    db.add(emp)

    # Also clear department from User to exclude from future targeting
    user = (
        await db.execute(select(User).where(User.email == emp.email))
    ).scalar_one_or_none()
    if user:
        user.department = None
        db.add(user)

    await db.commit()
    return {"message": "Employee removed", "employee_id": employee_id}


@router.post("/test/email")
async def test_email(
    target_email: str,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Test SMTP settings by sending a test email."""
    from utils.email_service import send_phishing_emails
    from campaigns.models import CampaignTarget, SimulationToken
    import uuid
    from datetime import datetime, timedelta, timezone

    # Create dummy target and token
    target = CampaignTarget(
        campaign_id=0,
        email=target_email,
        name="Test User"
    )
    token = SimulationToken(
        token=uuid.uuid4().hex,
        campaign_id=0,
        target_email=target_email,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1)
    )

    try:
        send_phishing_emails(
            targets=[target],
            tokens=[token],
            campaign_id=0,
            custom_subject="Test Email from Breach Platform",
            custom_body="This is a test email to verify your SMTP settings. If you receive this, your configuration is working correctly!"
        )
        return {"message": "Test email sent successfully! Check your inbox (including spam)."}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"SMTP Test Failed: {str(e)}"
        )
