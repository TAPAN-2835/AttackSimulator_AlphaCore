import asyncio
from sqlalchemy import select
from database import AsyncSessionLocal
from auth.models import User

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User.email, User.department))
        users = res.all()
        for u in users:
            print(f"Email: {u.email}, Department: {u.department}")

if __name__ == "__main__":
    asyncio.run(main())
