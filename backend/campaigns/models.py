import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    String, Text, Enum as SAEnum, DateTime, ForeignKey,
    Boolean, func, Integer
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class AttackType(str, enum.Enum):
    phishing = "phishing"
    spear_phishing = "spear_phishing"
    credential_harvest = "credential_harvest"
    malware_download = "malware_download"
    incident_drill = "incident_drill"
    smishing = "smishing"
    vishing = "vishing"
    qr_phishing = "qr_phishing"
    business_email_compromise = "business_email_compromise"
    whaling = "whaling"


class CampaignStatus(str, enum.Enum):
    draft = "draft"
    scheduled = "scheduled"
    running = "running"
    completed = "completed"


class ChannelType(str, enum.Enum):
    EMAIL = "EMAIL"
    SMS = "SMS"
    WHATSAPP = "WHATSAPP"


class MessageTemplate(Base):
    __tablename__ = "message_templates"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    channel_type: Mapped[ChannelType] = mapped_column(SAEnum(ChannelType), nullable=False)
    template_name: Mapped[str] = mapped_column(String(100), nullable=False)
    message_body: Mapped[str] = mapped_column(Text, nullable=False)


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    channel_type: Mapped[ChannelType] = mapped_column(
        SAEnum(ChannelType), default=ChannelType.EMAIL, nullable=False
    )
    attack_type: Mapped[AttackType] = mapped_column(SAEnum(AttackType), nullable=False)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    target_group: Mapped[str | None] = mapped_column(String(120), nullable=True)
    template_name: Mapped[str] = mapped_column(String(50), nullable=False, default="password_reset")
    email_subject: Mapped[str | None] = mapped_column(Text, nullable=True)
    email_body: Mapped[str | None] = mapped_column(Text, nullable=True)
    template_id: Mapped[int | None] = mapped_column(ForeignKey("message_templates.id"), nullable=True)
    scheduled_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[CampaignStatus] = mapped_column(
        SAEnum(CampaignStatus), default=CampaignStatus.draft, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    targets: Mapped[list["CampaignTarget"]] = relationship(back_populates="campaign")
    tokens: Mapped[list["SimulationToken"]] = relationship(back_populates="campaign")


class CampaignTarget(Base):
    __tablename__ = "campaign_targets"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    campaign_id: Mapped[int] = mapped_column(ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    # For CSV-uploaded contacts who are not platform users yet
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    department: Mapped[str | None] = mapped_column(String(120), nullable=True)
    # Interaction flags
    email_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    sms_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    whatsapp_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    email_opened: Mapped[bool] = mapped_column(Boolean, default=False)
    link_clicked: Mapped[bool] = mapped_column(Boolean, default=False)
    credential_attempt: Mapped[bool] = mapped_column(Boolean, default=False)
    file_download: Mapped[bool] = mapped_column(Boolean, default=False)
    reported: Mapped[bool] = mapped_column(Boolean, default=False)

    campaign: Mapped["Campaign"] = relationship(back_populates="targets")


class SimulationToken(Base):
    __tablename__ = "simulation_tokens"

    token: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: uuid.uuid4().hex)
    campaign_id: Mapped[int] = mapped_column(ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    target_email: Mapped[str] = mapped_column(String(255), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    campaign: Mapped["Campaign"] = relationship(back_populates="tokens")


class AIGeneratedCampaign(Base):
    __tablename__ = "ai_generated_campaigns"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    campaign_id: Mapped[int | None] = mapped_column(ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=True)
    model_used: Mapped[str] = mapped_column(String(50), nullable=False)
    attack_type: Mapped[str] = mapped_column(String(50), nullable=False)
    theme: Mapped[str] = mapped_column(String(100), nullable=False)
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Optional relationship to Campaign if we want it bidirectional
    # campaign: Mapped["Campaign"] = relationship()
