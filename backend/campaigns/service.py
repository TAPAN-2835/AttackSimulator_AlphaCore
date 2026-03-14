import csv
import io
import logging
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import BackgroundTasks
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from campaigns.models import Campaign, CampaignTarget, CampaignStatus, SimulationToken, AttackType, AIGeneratedCampaign
from schemas.request_models import CampaignCreate
from auth.models import User, UserRole
from config import get_settings
from utils.email_service import send_phishing_emails

settings = get_settings()
logger = logging.getLogger(__name__)


async def create_campaign(
    db: AsyncSession,
    data: CampaignCreate,
    created_by: int,
) -> Campaign:
    try:
        # Validate template_name
        template_name = getattr(data, "template_name", None)
        if template_name is None:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=400,
                detail="Email template is required to launch campaign"
            )
        
        # Clean extension if provided
        if template_name.endswith(".html"):
            template_name = template_name[:-5]

        campaign = Campaign(
            name=data.campaign_name,
            description=data.description,
            attack_type=data.attack_type,
            target_group=data.target_group,
            template_name=template_name,
            email_subject=getattr(data, "subject", None),
            email_body=getattr(data, "body", None),
            scheduled_time=data.schedule_date,
            created_by=created_by,
            status=CampaignStatus.scheduled if data.schedule_date else CampaignStatus.draft,
        )
        db.add(campaign)
        await db.flush()  # Gets the campaign.id
        
        # Log AI generation metadata if provided
        if getattr(data, "ai_model", None):
            ai_campaign = AIGeneratedCampaign(
                campaign_id=campaign.id,
                model_used=data.ai_model,
                attack_type=data.attack_type,
                theme=getattr(data, "ai_theme", "Custom AI Prompt") or "Custom AI Prompt",
                difficulty=getattr(data, "ai_difficulty", "medium") or "medium",
                department=getattr(data, "target_group", "finance") or "any",
            )
            db.add(ai_campaign)
            await db.flush()
            
        await db.refresh(campaign)
        return campaign
    except Exception as e:
        logger.error(f"Campaign creation error: {str(e)}")
        from fastapi import HTTPException
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


async def upload_targets_from_csv(
    db: AsyncSession,
    campaign_id: int,
    csv_content: str,
    background_tasks: BackgroundTasks,
) -> list[CampaignTarget]:
    reader = csv.DictReader(io.StringIO(csv_content))
    targets: list[CampaignTarget] = []
    tokens: list[SimulationToken] = []
    expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.TOKEN_EXPIRY_HOURS)

    for row in reader:
        email = row.get("email", "").strip()
        if not email:
            continue
        target = CampaignTarget(
            campaign_id=campaign_id,
            email=email,
            name=row.get("name", "").strip() or None,
            department=row.get("department", "").strip() or None,
        )
        db.add(target)
        targets.append(target)

        token = SimulationToken(
            token=uuid.uuid4().hex,
            campaign_id=campaign_id,
            target_email=email,
            expires_at=expires_at,
        )
        db.add(token)
        tokens.append(token)

        # Log that the email is scheduled/sent
        from events.logger import log_event
        from events.models import EventType
        await log_event(
            db=db,
            event_type=EventType.EMAIL_SENT,
            campaign_id=campaign_id,
            metadata={"email": email},
        )

    await db.flush()
    # Email dispatch should happen on 'start_campaign', not on upload.
    return targets


async def start_campaign(db: AsyncSession, campaign: Campaign) -> Campaign:
    # 1. Update status
    campaign.status = CampaignStatus.running
    db.add(campaign)
    await db.flush()
    
    # 2. Fetch all targets + associated tokens
    result = await db.execute(select(CampaignTarget).where(CampaignTarget.campaign_id == campaign.id))
    targets = result.scalars().all()
    
    # NEW: If no targets uploaded, pull all employees from database
    if not targets:
        from auth.models import User, UserRole
        import uuid
        from datetime import datetime, timezone, timedelta
        
        if campaign.target_group:
            # Filter by department/group (case-insensitive)
            emp_result = await db.execute(
                select(User).where(
                    User.role == UserRole.employee,
                    func.lower(User.department) == campaign.target_group.lower()
                )
            )
        else:
            emp_result = await db.execute(select(User).where(User.role == UserRole.employee))
        
        employees = emp_result.scalars().all()
        
        if not employees:
            group_info = f" in group '{campaign.target_group}'" if campaign.target_group else ""
            raise Exception(f"Cannot start campaign: No targets found{group_info} in database.")
            
        expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.TOKEN_EXPIRY_HOURS)
        new_targets = []
        new_tokens = []
        
        for emp in employees:
            target = CampaignTarget(
                campaign_id=campaign.id,
                user_id=emp.id,
                email=emp.email,
                name=emp.name,
                department=emp.department
            )
            db.add(target)
            new_targets.append(target)
            
            token = SimulationToken(
                token=uuid.uuid4().hex,
                campaign_id=campaign.id,
                user_id=emp.id,
                target_email=emp.email,
                expires_at=expires_at
            )
            db.add(token)
            new_tokens.append(token)
            
        await db.flush()
        targets = new_targets
        tokens = new_tokens
    else:
        t_result = await db.execute(select(SimulationToken).where(SimulationToken.campaign_id == campaign.id))
        tokens = t_result.scalars().all()

    # 3. Synchronously trigger dispatch via SMTP
    try:
        # Safe template access
        template_name = getattr(campaign, "template_name", None)
        template_id = getattr(campaign, "template_id", None) # Future proofing

        if not template_name:
             logger.warning(f"Campaign {campaign.id} has no template_name defined!")
             template_name = "password_reset" # default fallback
        
        send_phishing_emails(
            targets=list(targets),
            tokens=list(tokens),
            campaign_id=campaign.id,
            template_name=template_name,
            custom_subject=getattr(campaign, "email_subject", None),
            custom_body=getattr(campaign, "email_body", None),
        )
    except Exception as e:
        logger.error(f"Failed to dispatch emails: {str(e)}")
        # Do not throw! Let the campaign be marked as started even if SMTP fails the delivery entirely

    return campaign


async def complete_campaign(db: AsyncSession, campaign: Campaign) -> Campaign:
    campaign.status = CampaignStatus.completed
    db.add(campaign)
    await db.flush()
    return campaign


# ── Private helpers ───────────────────────────────────────────────────────────

from utils.email_service import send_phishing_emails
