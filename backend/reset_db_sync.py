import asyncio
from sqlalchemy import text
from database import AsyncSessionLocal, engine, Base
from init_db import initialize_database

async def reset_db():
    print("Deleting old users and re-initializing...")
    async with AsyncSessionLocal() as session:
        # Delete only users to preserve campaigns if needed, 
        # but usually better to clear all for a clean sync
        await session.execute(text("DELETE FROM users"))
        await session.commit()
    
    # Re-run initialization
    async with AsyncSessionLocal() as session:
        await initialize_database(session)
    print("Database reset complete.")

if __name__ == "__main__":
    asyncio.run(reset_db())
