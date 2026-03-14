import asyncio
from database import get_db
from sqlalchemy import select, func
from events.models import Event, EventType
from auth.models import User
from campaigns.models import Campaign, CampaignTarget

async def check():
    async for db in get_db():
        # Users with Click Counts
        stmt = (
            select(User.id, User.email, User.name, func.count(Event.id).label("clicks"))
            .outerjoin(Event, (Event.user_id == User.id) & (Event.event_type == EventType.LINK_CLICK))
            .group_by(User.id, User.email, User.name)
            .order_by(User.id)
        )
        res = await db.execute(stmt)
        rows = res.all()
        print("\n--- User Activity (Clicks) ---")
        for r in rows:
            print(f"ID {r.id}: {r.email} | Clicks: {r.clicks} | Name: {r.name}")

        # Check for Events without User ID 
        orphans = await db.execute(select(func.count()).where(Event.user_id == None))
        print(f"\nOrphaned Events: {orphans.scalar_one()}")

        break

if __name__ == "__main__":
    asyncio.run(check())
