import asyncio
from database import get_db
from sqlalchemy import select, func
from events.models import Event, EventType
from auth.models import User
from campaigns.models import Campaign, CampaignTarget

async def check():
    async for db in get_db():
        # Check users
        user_res = await db.execute(select(User))
        users = user_res.scalars().all()
        print("\n--- Users ---")
        for u in users:
            print(f"ID {u.id}: {u.email} ({u.name}) - {u.role}")

        # Check Campaigns
        camp_res = await db.execute(select(Campaign).order_by(Campaign.id.desc()).limit(5))
        campaigns = camp_res.scalars().all()
        print("\n--- Latest 5 Campaigns ---")
        for c in campaigns:
            print(f"ID {c.id}: {c.name}")

        # Latest Events
        event_res = await db.execute(select(Event).order_by(Event.timestamp.desc()).limit(20))
        events = event_res.scalars().all()
        print("\n--- Latest 20 Events ---")
        for e in events:
            print(f"[{e.timestamp}] {e.event_type.value} | User: {e.user_id} | Campaign: {e.campaign_id}")

        # Target Stats for specific user IDs if they exist
        target_res = await db.execute(select(CampaignTarget).where(CampaignTarget.link_clicked == True))
        clicked_targets = target_res.scalars().all()
        print("\n--- Clicked Targets (Flag in CampaignTarget table) ---")
        for t in clicked_targets:
             print(f"User {t.user_id} in Campaign {t.campaign_id} clicked link.")

        break

if __name__ == "__main__":
    asyncio.run(check())
