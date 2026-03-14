import asyncio
from sqlalchemy import select
from database import AsyncSessionLocal
from events.models import Event

async def check_events():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Event).where(Event.campaign_id == 61).order_by(Event.timestamp.desc()).limit(10))
        events = res.scalars().all()
        if not events:
            print("No events found for campaign 61.")
            return
        for e in events:
            print(f"{e.timestamp} - {e.event_type} - {e.metadata_}")

if __name__ == "__main__":
    asyncio.run(check_events())
