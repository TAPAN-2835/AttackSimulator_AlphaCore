from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from auth.service import CurrentUser, require_admin, require_analyst
from campaigns.models import Campaign, CampaignStatus, MessageTemplate, ChannelType
from schemas.request_models import CampaignCreate, CampaignOut, CampaignDetail
from pydantic import BaseModel
from campaigns.service import (
    create_campaign,
    upload_targets_from_csv,
    start_campaign,
    complete_campaign,
    generate_whatsapp_link,
    generate_telegram_link,
    generate_instagram_link,
    generate_linkedin_link,
)
from database import get_db

router = APIRouter()


@router.post("/create", response_model=CampaignOut, status_code=status.HTTP_201_CREATED)
async def create(
    body: CampaignCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    user_id = 1  # Force admin to id 1 for hackathon deploy bypass
    try:
        campaign = await create_campaign(db, body, user_id)
        # If no schedule date, start it immediately so emails are sent NOW
        if not body.schedule_date:
            await start_campaign(db, campaign)
            await db.commit() # Commit fully so targets/tokens are saved
        return campaign
    except Exception as e:
        print("Campaign create error:", str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=list[CampaignOut])
async def list_campaigns(db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(Campaign).order_by(Campaign.created_at.desc()))
    return result.scalars().all()


@router.get("/{campaign_id}", response_model=CampaignDetail)
async def get_campaign(campaign_id: int, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(
        select(Campaign)
        .where(Campaign.id == campaign_id)
        .options(selectinload(Campaign.targets))
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@router.post("/{campaign_id}/start", response_model=CampaignOut)
async def launch_campaign(campaign_id: int, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.status == CampaignStatus.running:
        raise HTTPException(status_code=400, detail="Campaign is already running")
    try:
        campaign = await start_campaign(db, campaign)
        return campaign
    except Exception as e:
        print("Campaign launch error:", str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{campaign_id}/complete", response_model=CampaignOut)
async def finish_campaign(campaign_id: int, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return await complete_campaign(db, campaign)


@router.post("/upload-users")
async def upload_users(
    campaign_id: int,
    file: Annotated[UploadFile, File(...)],
    background_tasks: BackgroundTasks,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Upload a CSV of target users (email, name, department)."""
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")
    content = await file.read()
    targets = await upload_targets_from_csv(
        db, campaign_id, content.decode("utf-8"), background_tasks
    )
    return {"message": f"{len(targets)} targets uploaded", "campaign_id": campaign_id}


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign(campaign_id: int, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    await db.delete(campaign)
@router.delete("/delete/all", status_code=status.HTTP_204_NO_CONTENT)
async def clear_all_campaigns(db: Annotated[AsyncSession, Depends(get_db)]):
    from sqlalchemy import delete
    await db.execute(delete(Campaign))
    await db.commit()
    return None


# ── Message templates (SMS / WhatsApp) ───────────────────────────────────────

class MessageTemplateOut(BaseModel):
    id: int
    channel_type: ChannelType
    template_name: str
    message_body: str
    model_config = {"from_attributes": True}


class MessageTemplateCreate(BaseModel):
    channel_type: ChannelType
    template_name: str
    message_body: str


@router.get("/templates/list", response_model=list[MessageTemplateOut])
async def list_templates(db: Annotated[AsyncSession, Depends(get_db)]):
    """List all message templates (SMS and WhatsApp)."""
    r = await db.execute(select(MessageTemplate).order_by(MessageTemplate.channel_type, MessageTemplate.template_name))
    return r.scalars().all()


@router.post("/templates", response_model=MessageTemplateOut, status_code=status.HTTP_201_CREATED)
async def create_template(
    body: MessageTemplateCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Create a new message template for SMS or WhatsApp. Use {{link}} in message_body for the phishing link."""
    t = MessageTemplate(
        channel_type=body.channel_type,
        template_name=body.template_name,
        message_body=body.message_body,
    )
    db.add(t)
    await db.flush()
    await db.refresh(t)
    return t


@router.get("/{campaign_id}/whatsapp-link")
async def get_whatsapp_link(
    campaign_id: int,
    target_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Generate a WhatsApp click-to-chat link for a specific campaign target."""
    link = await generate_whatsapp_link(db, campaign_id, target_id)
    await db.commit()
    return {"whatsapp_link": link}


@router.get("/{campaign_id}/telegram-link")
async def get_telegram_link(
    campaign_id: int,
    target_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Generate a Telegram link for a specific campaign target."""
    link = await generate_telegram_link(db, campaign_id, target_id)
    await db.commit()
    return {"telegram_link": link}


@router.get("/{campaign_id}/instagram-link")
async def get_instagram_link(
    campaign_id: int,
    target_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Generate an Instagram link for a specific campaign target."""
    link = await generate_instagram_link(db, campaign_id, target_id)
    await db.commit()
    return {"instagram_link": link}


@router.get("/{campaign_id}/linkedin-link")
async def get_linkedin_link(
    campaign_id: int,
    target_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Generate a LinkedIn link for a specific campaign target."""
    link = await generate_linkedin_link(db, campaign_id, target_id)
    await db.commit()
    return {"linkedin_link": link}
