import asyncio
from database import AsyncSessionLocal
from events.routes import report_phishing, ReportPhishingRequest
import traceback
import sys

async def test():
    async with AsyncSessionLocal() as db:
        req = ReportPhishingRequest(user_id=2, campaign_id=1, reason_selected='urgent_language')
        try:
            await report_phishing(req, db)
            print("SUCCESS")
        except Exception as e:
            with open("err_debug.txt", "w") as f:
                f.write(traceback.format_exc())
            print("ERROR SAVED")

if __name__ == "__main__":
    asyncio.run(test())
