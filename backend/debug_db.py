import asyncio
from sqlalchemy import select
from database import AsyncSessionLocal
from auth.models import User
from campaigns.models import Campaign, CampaignTarget

async def check():
    async with AsyncSessionLocal() as session:
        users = (await session.execute(select(User))).scalars().all()
        print(f"--- USERS ({len(users)}) ---")
        for u in users:
            print(f"ID={u.id}, Name={u.name}, Email={u.email}, Dept={u.department}")
            
        campaigns = (await session.execute(select(Campaign))).scalars().all()
        print(f"\n--- CAMPAIGNS ({len(campaigns)}) ---")
        for c in campaigns:
            print(f"ID={c.id}, Name={c.name}, Status={c.status}, TargetGroup={c.target_group}")
            
        targets = (await session.execute(select(CampaignTarget))).scalars().all()
        print(f"\n--- TARGETS ({len(targets)}) ---")
        for t in targets:
            print(f"ID={t.id}, CampID={t.campaign_id}, UserID={t.user_id}, Email={t.email}")

if __name__ == "__main__":
    asyncio.run(check())
