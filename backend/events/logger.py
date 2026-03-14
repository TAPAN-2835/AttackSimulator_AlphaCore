import logging
from typing import Any

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from events.models import Event, EventType

logger = logging.getLogger(__name__)


async def log_event(
    db: AsyncSession,
    event_type: EventType,
    request: Request | None = None,
    user_id: int | None = None,
    campaign_id: int | None = None,
    metadata: dict[str, Any] | None = None,
) -> Event:
    """
    Central event logger. Called from simulation, admin, and analytics modules.
    Never stores passwords — callers must strip sensitive data from metadata.
    """
    ip = None
    if request:
        forwarded = request.headers.get("X-Forwarded-For")
        ip = forwarded.split(",")[0].strip() if forwarded else request.client.host if request.client else None

    event = Event(
        user_id=user_id,
        campaign_id=campaign_id,
        event_type=event_type,
        metadata_=metadata,
        ip_address=ip,
    )
    db.add(event)
    await db.flush()
    logger.info("[EVENT] %s | user=%s | campaign=%s | ip=%s", event_type, user_id, campaign_id, ip)

    try:
        from events.ws_manager import get_broadcaster
        broadcaster = get_broadcaster()
        if broadcaster.has_connections():
            from campaigns.models import Campaign
            from auth.models import User
            campaign = await db.get(Campaign, campaign_id) if campaign_id else None
            user = await db.get(User, user_id) if user_id else None
            payload = {
                "user": user.email if user else None,
                "channel": campaign.channel_type.value if campaign and hasattr(campaign, "channel_type") else "EMAIL",
                "event": event_type.value,
                "campaign": campaign.name if campaign else None,
            }
            await broadcaster.broadcast(payload)
    except Exception as e:
        logger.debug("WebSocket broadcast skip: %s", e)

    return event
