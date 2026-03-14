"""
Risk score computation engine.

Formula (v1 — formula-based, ML team can override ml/risk_model.py later):
    score = (clicks * 20) + (credential_attempts * 40) + (downloads * 30) - (reported * 15)
    capped at 0..100

Levels:
     0 –  29 → LOW
    30 –  59 → MEDIUM
    60 –  79 → HIGH
    80 – 100 → CRITICAL
"""
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from analytics.models import RiskScore, RiskLevel
from auth.models import User
from events.models import Event, EventType


def _score_to_level(score: float) -> RiskLevel:
    if score >= 80:
        return RiskLevel.CRITICAL
    if score >= 60:
        return RiskLevel.HIGH
    if score >= 30:
        return RiskLevel.MEDIUM
    return RiskLevel.LOW


async def compute_and_save_risk(db: AsyncSession, user_id: int) -> RiskScore:
    """Recompute risk score for a user and upsert into risk_scores."""
    from analytics.predict import predict_risk
    from auth.models import User

    # Fetch user for department info
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    department = user.department if user else "Unknown"

    def count_q(event_type: EventType):
        return (
            select(func.count())
            .where(Event.user_id == user_id, Event.event_type == event_type)
        )

    clicks = (await db.execute(count_q(EventType.LINK_CLICK))).scalar_one()
    cred = (await db.execute(count_q(EventType.CREDENTIAL_ATTEMPT))).scalar_one()
    downloads = (await db.execute(count_q(EventType.FILE_DOWNLOAD))).scalar_one()
    reported = (await db.execute(count_q(EventType.EMAIL_REPORTED))).scalar_one()

    # Use ML Prediction
    # predict_risk returns 0.0 to 1.0 (probability of high risk)
    ml_prob = predict_risk(clicks, cred, downloads, reported, department)
    score = round(ml_prob * 100, 1)
    
    level = _score_to_level(score)

    existing = (await db.execute(select(RiskScore).where(RiskScore.user_id == user_id))).scalar_one_or_none()
    if existing:
        existing.risk_score = score
        existing.risk_level = level
        db.add(existing)
        return existing

    new_rs = RiskScore(user_id=user_id, risk_score=score, risk_level=level)
    db.add(new_rs)
    await db.flush()
    return new_rs


async def get_event_counts_for_user(db: AsyncSession, user_id: int) -> dict:
    async def cnt(et: EventType) -> int:
        return (await db.execute(
            select(func.count()).where(Event.user_id == user_id, Event.event_type == et)
        )).scalar_one()

    return {
        "clicks": await cnt(EventType.LINK_CLICK),
        "credential_attempts": await cnt(EventType.CREDENTIAL_ATTEMPT),
        "downloads": await cnt(EventType.FILE_DOWNLOAD),
        "reported": await cnt(EventType.EMAIL_REPORTED),
    }
