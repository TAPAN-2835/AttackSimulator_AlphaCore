import asyncio
from sqlalchemy import select
from database import AsyncSessionLocal
from auth.models import User
from campaigns.models import CampaignTarget, SimulationToken
from utils.email_service import send_phishing_emails
import uuid
from datetime import datetime, timezone, timedelta

async def test_send():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).where(User.email == 'mrpatel2835@gmail.com'))
        user = res.scalar_one_or_none()
        if not user:
            print("User not found!")
            return

        target = CampaignTarget(
            campaign_id=999,
            user_id=user.id,
            email=user.email,
            name=user.name,
            department=user.department
        )
        token = SimulationToken(
            token=uuid.uuid4().hex,
            campaign_id=999,
            user_id=user.id,
            target_email=user.email,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=72)
        )
        body = (
            "Dear {employee_name},\n\nWe are pleased to inform you that based on your recent performance review, "
            "you have been approved for a salary increase effective this quarter.\n\nDetails of your updated "
            "compensation package are available in a confidential document. Please click below to securely view "
            "your offer letter.\n\n[View Details]\n\nHuman Resources Department"
        )
        
        try:
            print("Sending test email using custom_body...")
            send_phishing_emails(
                targets=[target],
                tokens=[token],
                campaign_id=999,
                template_name="salary_increase",
                custom_subject="Confidential: Your Salary Increase Notification",
                custom_body=body
            )
            print("Email function completed.")
        except Exception as e:
            print(f"Exception: {e}")

if __name__ == "__main__":
    asyncio.run(test_send())
