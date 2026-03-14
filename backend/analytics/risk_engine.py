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

    # Get the user's current awareness score to factor into the formula
    existing = (await db.execute(select(RiskScore).where(RiskScore.user_id == user_id))).scalar_one_or_none()
    awareness_score = existing.awareness_score if existing else 0.0

    # Formula (v2 — tracking awareness):
    #     raw_score = (clicks * 20) + (cred * 40) + (downloads * 30) - (reported * 15) - (awareness_score * 0.5)
    raw_score = (clicks * 20) + (cred * 40) + (downloads * 30) - (reported * 15) - (awareness_score * 0.5)
    score = max(0.0, min(100.0, float(raw_score)))
    # Use ML Prediction
    # predict_risk returns 0.0 to 1.0 (probability of high risk)
    ml_prob = predict_risk(clicks, cred, downloads, reported, department)
    score = round(ml_prob * 100, 1)
    
    level = _score_to_level(score)

    if existing:
        existing.risk_score = score
        existing.risk_level = level
        db.add(existing)
        return existing

    new_rs = RiskScore(user_id=user_id, risk_score=score, risk_level=level, awareness_score=awareness_score)
    db.add(new_rs)
    await db.flush()
    return new_rs


# Phishing indicator awareness: score deltas when user reports phishing
AWARENESS_BONUS_MATCH = 10.0   # reason matched campaign attack_indicators
AWARENESS_BONUS_NO_MATCH = 2.0  # small bonus for reporting anyway
VULNERABILITY_PENALTY_MATCH = 5.0  # decrease when correct indicator selected
DETECTION_ACCURACY_BONUS_MATCH = 5.0  # correct indicator selection
MAX_SCORE = 100.0
MIN_SCORE = 0.0


async def get_or_create_risk_score(db: AsyncSession, user_id: int) -> RiskScore:
    """Get existing RiskScore for user or create one with defaults."""
    existing = (await db.execute(select(RiskScore).where(RiskScore.user_id == user_id))).scalar_one_or_none()
    if existing:
        return existing
    rs = RiskScore(
        user_id=user_id,
        risk_score=0.0,
        risk_level=RiskLevel.LOW,
        awareness_score=0.0,
        detection_accuracy=0.0,
        correct_detection_count=0,
        incorrect_detection_count=0,
        vulnerability_score=0.0,
    )
    db.add(rs)
    await db.flush()
    await db.refresh(rs)
    return rs


async def update_phishing_indicator_scores(
    db: AsyncSession,
    user_id: int,
    reason_matched: bool,
) -> RiskScore:
    """
    Update awareness_score, vulnerability_score, and correct/incorrect detection counts.
    """
    rs = await get_or_create_risk_score(db, user_id)
    rs.awareness_score = max(MIN_SCORE, min(MAX_SCORE, rs.awareness_score + (AWARENESS_BONUS_MATCH if reason_matched else AWARENESS_BONUS_NO_MATCH)))
    if reason_matched:
        rs.correct_detection_count += 1
        rs.vulnerability_score = max(MIN_SCORE, rs.vulnerability_score - VULNERABILITY_PENALTY_MATCH)
        rs.detection_accuracy = max(MIN_SCORE, min(MAX_SCORE, rs.detection_accuracy + DETECTION_ACCURACY_BONUS_MATCH))
    else:
        rs.incorrect_detection_count += 1
    db.add(rs)
    
    await db.flush()
    # Force risk engine to recompute the top-level score using the newly updated awareness points
    await compute_and_save_risk(db, user_id)
    await db.refresh(rs)
    return rs


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
