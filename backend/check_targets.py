import asyncio
from database import get_db
from sqlalchemy import select, func
from campaigns.models import Campaign, CampaignTarget
from auth.models import User

async def check():
    async for db in get_db():
        # Latest Campaign
        camp_res = await db.execute(select(Campaign).order_by(Campaign.id.desc()).limit(1))
        latest_camp = camp_res.scalar_one_or_none()
        if not latest_camp:
            print("No campaigns found.")
            return
        
        print(f"\nLatest Campaign: {latest_camp.name} (ID {latest_camp.id})")

        # Targets for this campaign
        target_res = await db.execute(select(CampaignTarget).where(CampaignTarget.campaign_id == latest_camp.id))
        targets = target_res.scalars().all()
        print(f"Total Targets: {len(targets)}")
        
        for t in targets:
            u_res = await db.execute(select(User).where(User.id == t.user_id))
            u = u_res.scalar_one_or_none()
            email = u.email if u else t.email
            print(f" - Target: {email} (User ID {t.user_id}) | Clicked: {t.link_clicked} | Creds: {t.credential_attempt}")

        break

if __name__ == "__main__":
    asyncio.run(check())
