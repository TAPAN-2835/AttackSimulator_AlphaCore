import csv
import io
import logging
import uuid
import urllib.parse
from datetime import datetime, timedelta, timezone

from fastapi import BackgroundTasks
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from campaigns.models import (
    Campaign,
    CampaignTarget,
    CampaignStatus,
    SimulationToken,
    AttackType,
    AIGeneratedCampaign,
    ChannelType,
    MessageTemplate,
)
from schemas.request_models import CampaignCreate
from auth.models import User, UserRole
from config import get_settings
from utils.email_service import send_phishing_emails
from events.logger import log_event
from events.models import EventType

settings = get_settings()
logger = logging.getLogger(__name__)


# Valid attack types per channel to prevent impossible combinations.
VALID_ATTACKS_BY_CHANNEL: dict[ChannelType, set[AttackType]] = {
    ChannelType.EMAIL: {
        AttackType.phishing,
        AttackType.qr_phishing,
        AttackType.credential_harvest,
        AttackType.malware_download,
        AttackType.business_email_compromise,
        AttackType.spear_phishing,
        AttackType.incident_drill,
        AttackType.whaling,
    },
    ChannelType.SMS: {
        AttackType.phishing_link_message,
        AttackType.otp_scam,
        AttackType.delivery_scam,
        AttackType.bank_alert_scam,
    },
    ChannelType.WHATSAPP: {
        AttackType.phishing_link_message,
        AttackType.fake_support_message,
        AttackType.vishing_voice_file,
        AttackType.payment_request_scam,
    },
    ChannelType.TELEGRAM: {
        AttackType.phishing_link_message,
        AttackType.fake_support_message,
    },
    ChannelType.INSTAGRAM: {
        AttackType.phishing_link_message,
        AttackType.fake_support_message,
    },
    ChannelType.LINKEDIN: {
        AttackType.phishing_link_message,
        AttackType.fake_support_message,
    },
}


async def create_campaign(
    db: AsyncSession,
    data: CampaignCreate,
    created_by: int,
) -> Campaign:
    try:
        from fastapi import HTTPException

        channel_type: ChannelType = getattr(data, "channel_type", ChannelType.EMAIL)
        template_name = getattr(data, "template_name", None) or "password_reset"
        template_id = getattr(data, "template_id", None)

        # Channel / attack_type compatibility validation
        attack_type: AttackType = data.attack_type
        allowed = VALID_ATTACKS_BY_CHANNEL.get(channel_type)
        if allowed is not None and attack_type not in allowed:
            raise HTTPException(
                status_code=400,
                detail=f"Attack type '{attack_type.value}' is not valid for channel '{channel_type.value}'.",
            )

        if channel_type == ChannelType.EMAIL and not template_name:
            raise HTTPException(
                status_code=400,
                detail="Email template is required for email campaigns",
            )
        if channel_type != ChannelType.EMAIL and not template_id:
            # SMS/WhatsApp can use template_id or a default; allow creating without and use default body at send time
            pass

        if template_name.endswith(".html"):
            template_name = template_name[:-5]

        if attack_type == AttackType.malware_download and template_name == "password_reset":
            template_name = "malware_update"

        campaign = Campaign(
            name=data.campaign_name,
            description=data.description,
            channel_type=channel_type,
            attack_type=data.attack_type,
            target_group=data.target_group,
            template_name=template_name,
            email_subject=getattr(data, "subject", None) or ("Action Required: Mandatory Security Patch" if template_name == "malware_update" else None),
            email_body=getattr(data, "body", None),
            template_id=template_id,
            scheduled_time=data.schedule_date,
            created_by=created_by,
            status=CampaignStatus.scheduled if data.schedule_date else CampaignStatus.draft,
            attack_indicators=data.attack_indicators or [],
            landing_page_url=getattr(data, "landing_page_url", None),
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

        # Handle Direct Attack (single target provided in creation request)
        direct_target_email = getattr(data, "direct_target_email", None)
        direct_target_phone = getattr(data, "direct_target_phone", None)
        
        if direct_target_email or direct_target_phone:
            email = (direct_target_email or f"phish_{uuid.uuid4().hex[:8]}@simulation.local").strip()
            phone = direct_target_phone
            
            # Lookup existing user if email is provided
            user = None
            if direct_target_email:
                user_res = await db.execute(select(User).where(User.email == email))
                user = user_res.scalar_one_or_none()
            
            target = CampaignTarget(
                campaign_id=campaign.id,
                user_id=user.id if user else None,
                email=email,
                phone_number=phone or (user.phone_number if user else None),
                name=getattr(data, "direct_target_name", None) or (user.name if user else email.split("@")[0].capitalize()),
                department=data.target_group or (user.department if user else "General"),
            )
            db.add(target)

            token = SimulationToken(
                token=uuid.uuid4().hex,
                campaign_id=campaign.id,
                user_id=user.id if user else None,
                target_email=email,
                expires_at=datetime.now(timezone.utc) + timedelta(hours=settings.TOKEN_EXPIRY_HOURS),
            )
            db.add(token)
            await db.flush()
            
            if not campaign.scheduled_time:
                campaign.status = CampaignStatus.running
                await db.flush()
            
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
            phone_number=row.get("phone_number", "").strip() or row.get("phone", "").strip() or None,
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

    await db.flush()
    # Email dispatch should happen on 'start_campaign', not on upload.
    return targets


async def start_campaign(db: AsyncSession, campaign: Campaign) -> Campaign:
    # 1. Update status
    campaign.status = CampaignStatus.running
    db.add(campaign)
    await db.flush()
    
    # 2. Fetch all targets + associated tokens (Deterministic ordering by email)
    result = await db.execute(
        select(CampaignTarget)
        .where(CampaignTarget.campaign_id == campaign.id)
        .order_by(CampaignTarget.email)
    )
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
                phone_number=getattr(emp, "phone_number", None),
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
        t_result = await db.execute(
            select(SimulationToken)
            .where(SimulationToken.campaign_id == campaign.id)
            .order_by(SimulationToken.target_email)
        )
        tokens = t_result.scalars().all()

    tokens_list = list(tokens)
    channel_type = getattr(campaign, "channel_type", ChannelType.EMAIL)
    template_name = getattr(campaign, "template_name", None) or "password_reset"
    template_id = getattr(campaign, "template_id", None)

    if channel_type == ChannelType.EMAIL:
        try:
            send_phishing_emails(
                targets=list(targets),
                tokens=tokens_list,
                campaign_id=campaign.id,
                template_name=template_name,
                custom_subject=getattr(campaign, "email_subject", None),
                custom_body=getattr(campaign, "email_body", None),
            )
            for t in targets:
                t.email_sent = True
                db.add(t)
            await db.flush()
            for t in targets:
                await log_event(db, EventType.EMAIL_SENT, campaign_id=campaign.id, metadata={"email": t.email})
        except Exception as e:
            logger.error(f"Failed to dispatch emails: {str(e)}")

    elif channel_type == ChannelType.SMS:
        try:
            from services.sms_service import send_sms
            body = await _get_message_body(db, campaign, template_id, channel_type,
                default="Urgent: Your company account requires verification. Click here: {{link}}")
            for target, token in zip(targets, tokens_list):
                phone = getattr(target, "phone_number", None)
                if not phone and target.user_id:
                    u = await db.get(User, target.user_id)
                    phone = u.phone_number if u else None
                if not phone:
                    logger.warning(f"Skipping SMS for target {target.email}: no phone_number")
                    continue
                sim_link = f"{settings.SIM_BASE_URL}/phish/{token.token}"
                msg = body.replace("{{link}}", sim_link)
                if send_sms(phone, msg):
                    target.sms_sent = True
                    db.add(target)
                    await log_event(db, EventType.SMS_SENT, campaign_id=campaign.id, metadata={"phone": phone, "email": target.email})
            await db.flush()
        except Exception as e:
            logger.error(f"Failed to dispatch SMS: {str(e)}")

    elif channel_type == ChannelType.WHATSAPP:
        try:
            from services.whatsapp_service import send_whatsapp
            body = await _get_message_body(db, campaign, template_id, channel_type,
                default="Security Alert ⚠️\nYour company login attempt requires verification.\n\nVerify now:\n{{link}}")
            for target, token in zip(targets, tokens_list):
                phone = getattr(target, "phone_number", None)
                if not phone and target.user_id:
                    u = await db.get(User, target.user_id)
                    phone = u.phone_number if u else None
                if not phone:
                    logger.warning(f"Skipping WhatsApp for target {target.email}: no phone_number")
                    continue
                sim_link = f"{settings.SIM_BASE_URL}/phish/{token.token}"
                msg = body.replace("{{link}}", sim_link)
                if send_whatsapp(phone, msg):
                    target.whatsapp_sent = True
                    db.add(target)
                    await log_event(db, EventType.WHATSAPP_SENT, campaign_id=campaign.id, metadata={"phone": phone, "email": target.email})
            await db.flush()
        except Exception as e:
            logger.error(f"Failed to dispatch WhatsApp: {str(e)}")

    return campaign


async def complete_campaign(db: AsyncSession, campaign: Campaign) -> Campaign:
    campaign.status = CampaignStatus.completed
    db.add(campaign)
    await db.flush()
    return campaign


async def _get_message_body(
    db: AsyncSession,
    campaign: Campaign,
    template_id: int | None,
    channel_type: ChannelType,
    default: str,
) -> str:
    """Resolve message body from message_templates or return default."""
    if not template_id:
        return default
    result = await db.execute(select(MessageTemplate).where(
        MessageTemplate.id == template_id,
        MessageTemplate.channel_type == channel_type,
    ))
    template = result.scalar_one_or_none()
    if template:
        return template.message_body
    return default


async def generate_telegram_link(db: AsyncSession, campaign_id: int, target_id: int) -> str:
    campaign, target, phone, email, user_id, token_str = await _prepare_link_data(db, campaign_id, target_id)
    sim_link = f"{settings.SIM_BASE_URL}/phish/{token_str}"
    body = await _get_message_body(db, campaign, campaign.template_id, ChannelType.TELEGRAM,
        default="Security Alert: Your account requires verification. Verify here: {{link}}")
    message = body.replace("{{link}}", sim_link)
    
    clean_phone = "".join(filter(str.isdigit, phone)) if phone else ""
    encoded_message = urllib.parse.quote(message)
    # Telegram link can be t.me/phone if phone exists, or just a share link
    if clean_phone:
        url = f"https://t.me/+{clean_phone}?text={encoded_message}"
    else:
        url = f"https://t.me/share/url?url={urllib.parse.quote(sim_link)}&text={encoded_message}"
    
    await log_event(db, EventType.TELEGRAM_LINK_GENERATED, campaign_id=campaign_id, user_id=user_id,
                    metadata={"phone": phone, "email": email, "target_id": target_id})
    return url

async def generate_instagram_link(db: AsyncSession, campaign_id: int, target_id: int) -> str:
    campaign, target, phone, email, user_id, token_str = await _prepare_link_data(db, campaign_id, target_id)
    sim_link = f"{settings.SIM_BASE_URL}/phish/{token_str}"
    body = await _get_message_body(db, campaign, campaign.template_id, ChannelType.INSTAGRAM,
        default="Security Alert: Your account requires verification. Verify here: {{link}}")
    message = body.replace("{{link}}", sim_link)
    # Instagram doesn't have a direct "send message" URL with text as easily as WA/TG, 
    # but we can provide a link to the profile or a general share link.
    # For simulation purposes, we'll return a direct message intent if possible or just the sim link.
    url = f"https://www.instagram.com/direct/inbox/" # Best we can do is inbox
    await log_event(db, EventType.INSTAGRAM_LINK_GENERATED, campaign_id=campaign_id, user_id=user_id,
                    metadata={"phone": phone, "email": email, "target_id": target_id})
    return url

async def generate_linkedin_link(db: AsyncSession, campaign_id: int, target_id: int) -> str:
    campaign, target, phone, email, user_id, token_str = await _prepare_link_data(db, campaign_id, target_id)
    sim_link = f"{settings.SIM_BASE_URL}/phish/{token_str}"
    body = await _get_message_body(db, campaign, campaign.template_id, ChannelType.LINKEDIN,
        default="Security Alert: Your account requires verification. Verify here: {{link}}")
    message = body.replace("{{link}}", sim_link)
    
    encoded_message = urllib.parse.quote(message)
    # LinkedIn message sharing
    url = f"https://www.linkedin.com/sharing/share-offsite/?url={urllib.parse.quote(sim_link)}"
    
    await log_event(db, EventType.LINKEDIN_LINK_GENERATED, campaign_id=campaign_id, user_id=user_id,
                    metadata={"phone": phone, "email": email, "target_id": target_id})
    return url

async def _prepare_link_data(db: AsyncSession, campaign_id: int, target_id: int):
    from fastapi import HTTPException
    campaign = await db.get(Campaign, campaign_id)
    if not campaign: raise HTTPException(status_code=404, detail="Campaign not found")
    target = await db.get(CampaignTarget, target_id)
    if not target or target.campaign_id != campaign_id: raise HTTPException(status_code=404, detail="Target not found")
    
    phone = target.phone_number
    email = target.email
    user_id = target.user_id
    if not phone and user_id:
        user = await db.get(User, user_id)
        if user:
            phone = user.phone_number
            if not email: email = user.email

    token_result = await db.execute(select(SimulationToken).where(
        SimulationToken.campaign_id == campaign_id, SimulationToken.target_email == email))
    token = token_result.scalar_one_or_none()
    if not token:
        token = SimulationToken(token=uuid.uuid4().hex, campaign_id=campaign_id, user_id=user_id,
            target_email=email, expires_at=datetime.now(timezone.utc) + timedelta(hours=settings.TOKEN_EXPIRY_HOURS))
        db.add(token)
        await db.flush()
    return campaign, target, phone, email, user_id, token.token

async def generate_whatsapp_link(
    db: AsyncSession,
    campaign_id: int,
    target_id: int,
) -> str:
    campaign, target, phone, email, user_id, token_str = await _prepare_link_data(db, campaign_id, target_id)
    if not phone:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Target has no phone number associated")

    sim_link = f"{settings.SIM_BASE_URL}/phish/{token_str}"

    # 3. Construct Message
    body = await _get_message_body(db, campaign, campaign.template_id, ChannelType.WHATSAPP,
        default="Security Alert ⚠️\nYour account requires verification.\n\nVerify here:\n{{link}}")
    
    message = body.replace("{{link}}", sim_link)
    
    # 4. Generate WhatsApp URL
    clean_phone = "".join(filter(str.isdigit, phone))
    encoded_message = urllib.parse.quote(message)
    whatsapp_url = f"https://wa.me/{clean_phone}?text={encoded_message}"
    
    # 5. Log Event
    await log_event(
        db, 
        EventType.WHATSAPP_LINK_GENERATED, 
        campaign_id=campaign_id, 
        user_id=user_id,
        metadata={"phone": phone, "email": email, "target_id": target_id}
    )
    
    return whatsapp_url


def generate_phishing_link(user_id: int | None, campaign_id: int, token: str) -> str:
    """uid=<user_id>&cid=<campaign_id>&token=<token>"""
    base = settings.phishing_base_url
    uid = user_id if user_id else "0"
    return f"{base}/phish/login?uid={uid}&cid={campaign_id}&token={token}"


def generate_tracking_pixel(user_id: int | None, campaign_id: int) -> str:
    """<img src='BASE_URL/email/open?uid=<user_id>&cid=<campaign_id>' ...>"""
    base = settings.phishing_base_url
    uid = user_id if user_id else "0"
    return f"{base}/email/open?uid={uid}&cid={campaign_id}"
