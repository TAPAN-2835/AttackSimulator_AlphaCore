import asyncio
from sqlalchemy import select
from database import AsyncSessionLocal
from campaigns.models import SimulationToken

async def debug_token(token_str: str):
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(SimulationToken).where(SimulationToken.token == token_str)
        )
        token = result.scalar_one_or_none()
        if token:
            print(f"Token found: {token.token}")
            print(f"Campaign ID: {token.campaign_id}")
            print(f"Target Email: {token.target_email}")
            print(f"Expires At: {token.expires_at}")
            from datetime import datetime, timezone
            if token.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
                print("Status: EXPIRED")
            else:
                print("Status: ACTIVE")
        else:
            print(f"Token NOT found: {token_str}")

if __name__ == "__main__":
    import sys
    token_to_check = sys.argv[1] if len(sys.argv) > 1 else "4d568e719d2c4928ad448251f812c68a"
    asyncio.run(debug_token(token_to_check))
