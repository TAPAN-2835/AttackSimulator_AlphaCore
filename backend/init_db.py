import asyncio
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth.models import User, UserRole
from utils.security import hash_password

logger = logging.getLogger(__name__)

async def initialize_database(db: AsyncSession):
    """
    Auto-creates default users if they do not exist.
    """
    default_users_data = [
        {
            "email": "anishpatel4y@gmail.com",
            "name": "Anish Patel",
            "password": "anish123",
            "role": UserRole.admin,
            "department": "security"
        },
        {
            "email": "mrpatel2835@gmail.com",
            "name": "Tapan Patel",
            "password": "tapu123",
            "role": UserRole.employee,
            "department": "finance"
        },
        {
            "email": "tejsus13@gmail.com",
            "name": "Tejas",
            "password": "tejas123",
            "role": UserRole.employee,
            "department": "engineering"
        },
        {
            "email": "preritashukla@gmail.com",
            "name": "Prerita",
            "password": "prerita123",
            "role": UserRole.employee,
            "department": "hr"
        },
        {
            "email": "anishpatel7y@gmail.com",
            "name": "anis",
            "password": "password123",
            "role": UserRole.employee,
            "department": "marketing"
        },
    ]

    for data in default_users_data:
        result = await db.execute(select(User).where(User.email == data["email"]))
        existing = result.scalar_one_or_none()
        
        if not existing:
            user = User(
                email=data["email"],
                name=data["name"],
                password_hash=hash_password(data["password"]),
                role=data["role"],
                department=data["department"]
            )
            db.add(user)
            logger.info(f"Added new user: {data['email']}")
        else:
            logger.info(f"User {data['email']} already exists.")

    await db.commit()
    logger.info("Database initialization check complete.")
