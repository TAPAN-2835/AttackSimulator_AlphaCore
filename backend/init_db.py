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
    Auto-creates the default admin and 4 departmental employees if they do not exist.
    """
    
    # Check if admin already exists
    result = await db.execute(select(User).where(User.email == "anishpatel4y@gmail.com"))
    admin = result.scalar_one_or_none()
    
    if admin:
        logger.info("Database already initialized. Found admin user.")
        await seed_message_templates(db)
        await db.commit()
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
            phone_number="9662458326",
            password_hash=hash_password("tapu123"),
            role=UserRole.employee,
            department="finance"
        ),
        User(
            email="tejsus13@gmail.com",
            name="Tejas",
            phone_number="9726396980",
            password_hash=hash_password("tejas123"),
            role=UserRole.employee,
            department="engineering"
        ),
        User(
            email="preritashukla@gmail.com",
            name="Prerita",
            phone_number="9825990612",
            password_hash=hash_password("prerita123"),
            role=UserRole.employee,
            department="hr"
        ),
        User(
            email="employee4@gmail.com",
            name="Employee Four",
            phone_number="9726396980",
            password_hash=hash_password("password123"),
            role=UserRole.employee,
            department="marketing"
        ),
    ]

    db.add_all(default_users)
    await db.flush()
    await seed_message_templates(db)
    await db.commit()
    logger.info("Successfully inserted 5 default users.")
