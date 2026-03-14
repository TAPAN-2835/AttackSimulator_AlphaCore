import asyncio
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import select

from auth.models import User, UserRole
from campaigns.models import MessageTemplate, ChannelType
from utils.security import hash_password

logger = logging.getLogger(__name__)


async def seed_message_templates(db: AsyncSession) -> None:
    """Seed default SMS and WhatsApp message templates if none exist."""
    r = await db.execute(select(MessageTemplate).limit(1))
    if r.scalar_one_or_none() is not None:
        return
    defaults = [
        MessageTemplate(
            channel_type=ChannelType.SMS,
            template_name="Urgent verification",
            message_body="Urgent: Your company account requires verification. Click here: {{link}}",
        ),
        MessageTemplate(
            channel_type=ChannelType.WHATSAPP,
            template_name="Security alert",
            message_body="Security Alert ⚠️\nYour company login attempt requires verification.\n\nVerify now:\n{{link}}",
        ),
    ]
    db.add_all(defaults)
    logger.info("Seeded default message templates.")


async def initialize_database(db: AsyncSession):
    """
    Auto-creates or updates default users and message templates.
    """
    logger.info("Synchronizing database with default users...")

    # Data to sync
    default_users_data = [
        {
            "email": "anishpatel4y@gmail.com",
            "name": "Anish Patel",
            "password": "anish123",
            "role": UserRole.admin,
            "department": "security",
            "phone_number": None
        },
        {
            "email": "mrpatel2835@gmail.com",
            "name": "Tapan Patel",
            "phone_number": "+919106527737",
            "password": "tapu123",
            "role": UserRole.employee,
            "department": "finance"
        },
        {
            "email": "tejsus13@gmail.com",
            "name": "Tejas",
            "phone_number": "+919662458326",
            "password": "tejas123",
            "role": UserRole.employee,
            "department": "engineering"
        },
        {
            "email": "preritashukla@gmail.com",
            "name": "Prerita",
            "phone_number": "+919825990612",
            "password": "prerita123",
            "role": UserRole.employee,
            "department": "hr"
        },
        {
            "email": "anish.marketing@gmail.com",  # Fixed duplicate email
            "name": "Anish",
            "phone_number": "+919726396980",
            "password": "anish123",
            "role": UserRole.employee,
            "department": "marketing"
        },
        {
            "email": "grishmamakwana1@gmail.com",
            "name": "Grishma",
            "phone_number": "+919601163573",
            "password": "grish123",
            "role": UserRole.employee,
            "department": "marketing"
        },
    ]

    for user_data in default_users_data:
        result = await db.execute(select(User).where(User.email == user_data["email"]))
        user = result.scalar_one_or_none()
        
        if user:
            # Update existing user
            user.name = user_data["name"]
            user.phone_number = user_data["phone_number"]
            user.department = user_data["department"]
            user.role = user_data["role"]
            # We don't necessarily want to reset passwords every time, but for this sync we can
            user.password_hash = hash_password(user_data["password"])
            logger.info(f"Updated user: {user_data['email']}")
        else:
            # Create new user
            new_user = User(
                email=user_data["email"],
                name=user_data["name"],
                phone_number=user_data["phone_number"],
                password_hash=hash_password(user_data["password"]),
                role=user_data["role"],
                department=user_data["department"]
            )
            db.add(new_user)
            logger.info(f"Created user: {user_data['email']}")

    await db.flush()
    await seed_message_templates(db)
    await db.commit()
    logger.info("Database synchronization complete.")
