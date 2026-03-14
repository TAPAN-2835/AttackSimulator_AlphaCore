import asyncio
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth.models import User, UserRole
from utils.security import hash_password

logger = logging.getLogger(__name__)

async def initialize_database(db: AsyncSession):
    """
    Auto-creates the default admin and 4 departmental employees if they do not exist.
    """
    
    # Check if admin already exists
    result = await db.execute(select(User).where(User.email == "anishpatel4y@gmail.com"))
    admin = result.scalar_one_or_none()
    
    if admin:
        logger.info("Database already initialized. Found admin user.")
        return

    logger.info("Initializing database with default users...")

    default_users = [
        User(
            email="anishpatel4y@gmail.com",
            name="Anish Patel",
            password_hash=hash_password("anish123"),
            role=UserRole.admin,
            department="security"
        ),
        User(
            email="mrpatel2835@gmail.com",
            name="Tapan Patel",
            password_hash=hash_password("tapu123"),
            role=UserRole.employee,
            department="finance"
        ),
        User(
            email="tejsus13@gmail.com",
            name="Tejas",
            password_hash=hash_password("tejas123"),
            role=UserRole.employee,
            department="engineering"
        ),
        User(
            email="preritashukla@gmail.com",
            name="Prerita",
            password_hash=hash_password("prerita123"),
            role=UserRole.employee,
            department="hr"
        ),
        User(
            email="employee4@gmail.com",
            name="Employee Four",
            password_hash=hash_password("password123"),
            role=UserRole.employee,
            department="marketing"
        ),
    ]

    db.add_all(default_users)
    await db.commit()
    logger.info("Successfully inserted 5 default users.")
