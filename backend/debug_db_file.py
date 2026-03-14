import asyncio
from sqlalchemy import select
from database import AsyncSessionLocal
from auth.models import User
from campaigns.models import Campaign, CampaignTarget

async def check():
    async with AsyncSessionLocal() as session:
        users = (await session.execute(select(User))).scalars().all()
        campaigns = (await session.execute(select(Campaign))).scalars().all()
        targets = (await session.execute(select(CampaignTarget))).scalars().all()
        
        with open("db_dump.txt", "w", encoding="utf-8") as f:
            f.write(f"--- USERS ({len(users)}) ---\n")
            for u in users:
                f.write(f"ID={u.id}, Name={u.name}, Email={u.email}, Dept={u.department}\n")
                
            f.write(f"\n--- CAMPAIGNS ({len(campaigns)}) ---\n")
            for c in campaigns:
                f.write(f"ID={c.id}, Name={c.name}, Status={c.status}, TargetGroup={c.target_group}\n")
                
            f.write(f"\n--- TARGETS ({len(targets)}) ---\n")
            for t in targets:
                f.write(f"ID={t.id}, CampID={t.campaign_id}, UserID={t.user_id}, Email={t.email}\n")

if __name__ == "__main__":
    asyncio.run(check())
