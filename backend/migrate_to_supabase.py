"""
Migration script to move data from local SQLite (breach.db) to Supabase (PostgreSQL).
Usage:
1. Set SUPABASE_DATABASE_URL in .env
2. Run: python migrate_to_supabase.py
"""
import asyncio
import os
from sqlalchemy import create_engine, select, text, MetaData
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import sessionmaker

# Import all models to ensure they are registered with Base.metadata
from database import Base
from config import get_settings
from auth.models import User
from campaigns.models import Campaign, CampaignTarget, SimulationToken, MessageTemplate, AIGeneratedCampaign
from analytics.models import RiskScore
from events.models import Event

settings = get_settings()
target_engine = create_async_engine(settings.DATABASE_URL)

# Source SQLite
SQLITE_URL = "sqlite:///./breach.db"
sqlite_engine = create_engine(SQLITE_URL)
SqliteSession = sessionmaker(bind=sqlite_engine)

async def migrate():
    print("🚀 Starting migration from SQLite to Supabase...")
    
    # 1. Create tables in Supabase if they don't exist
    async with target_engine.begin() as conn:
        print("Creating tables in Supabase (if missing)...")
        await conn.run_sync(Base.metadata.create_all)
    
    # 2. Migration logic for each table
    tables = [
        User,
        Campaign,
        CampaignTarget,
        SimulationToken,
        MessageTemplate,
        AIGeneratedCampaign,
        RiskScore,
        Event
    ]
    
    target_session_factory = async_sessionmaker(target_engine, expire_on_commit=False)
    
    async with target_session_factory() as dest_session:
        with SqliteSession() as src_session:
            for model in tables:
                table_name = model.__tablename__
                print(f"Migrating table: {table_name}...")
                
                # Fetch all from source
                items = src_session.query(model).all()
                if not items:
                    print(f"  - No data in {table_name}, skipping.")
                    continue
                
                # Merge into destination
                count = 0
                for item in items:
                    # Clear state to avoid conflict with existing session if any
                    src_session.expunge(item)
                    await dest_session.merge(item)
                    count += 1
                
                await dest_session.commit()
                print(f"  - Migrated {count} rows.")

    print("✅ Migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate())
