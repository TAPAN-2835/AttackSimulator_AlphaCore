
import asyncio
import logging
import sys
import os

# Add the current directory to sys.path to allow imports from local modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import AsyncSessionLocal
from init_db import initialize_database

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def main():
    logger.info("Starting database synchronization...")
    async with AsyncSessionLocal() as db:
        try:
            await initialize_database(db)
            logger.info("Synchronization successful!")
        except Exception as e:
            logger.error(f"Synchronization failed: {e}")
            await db.rollback()
        finally:
            await db.close()

if __name__ == "__main__":
    asyncio.run(main())
