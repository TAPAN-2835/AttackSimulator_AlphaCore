import asyncio
from sqlalchemy import select
from database import AsyncSessionLocal
from auth.models import User

PHONE_MAP = {
    "finance": "+919662458326",
    "hr": "+919825990612",
    "engineering": "+919726396980",
    "marketing": "+919726396980",
}

async def update_phones():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User))
        users = result.scalars().all()

        updates = 0
        for user in users:
            dept = (user.department or "").lower()
            new_phone = PHONE_MAP.get(dept)
            if new_phone and user.phone_number != new_phone:
                user.phone_number = new_phone
                updates += 1
                print(f"  Updated {user.name} ({dept}) -> {new_phone}")

        if updates > 0:
            await db.commit()
            print(f"\nSuccessfully updated {updates} users with E.164 phone numbers.")
        else:
            print("All users already have correct phone numbers.")

if __name__ == "__main__":
    asyncio.run(update_phones())
