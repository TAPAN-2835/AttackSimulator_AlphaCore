"""
SMS (Smishing) service. Uses Twilio when configured, otherwise mock (log only).
When SIMULATION_MODE=true, messages are logged only.
"""
import logging
from typing import Optional

from config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


def _short(msg: str, max_len: int = 120) -> str:
    return msg if len(msg) <= max_len else msg[: max_len - 3] + "..."


def send_sms(phone_number: str, message: str) -> bool:
    """
    Send an SMS to the given phone number.

    Behaviour:
    - When SIMULATION_MODE is True: log the SMS and return True (no external calls).
    - When Twilio credentials are missing: log a clear MOCK line and return True.
    - When Twilio is configured: attempt real send and log detailed status / errors.
    """
    safe_message = _short(message)

    if settings.SIMULATION_MODE:
        logger.info(
            "[SIMULATION_MODE] SMS (mock) to %s: %s",
            phone_number,
            safe_message,
        )
        return True

    sid: Optional[str] = getattr(settings, "TWILIO_ACCOUNT_SID", "") or ""
    token: Optional[str] = getattr(settings, "TWILIO_AUTH_TOKEN", "") or ""
    from_num: Optional[str] = getattr(settings, "TWILIO_PHONE_NUMBER", "") or ""

    if not sid or not token or not from_num:
        logger.warning(
            "[SMS MOCK] Twilio not fully configured (sid=%s, from=%s). Would send to %s: %s",
            "set" if sid else "missing",
            from_num or "missing",
            phone_number,
            safe_message,
        )
        return True

    try:
        from twilio.rest import Client  # type: ignore

        logger.info("[SMS] Sending via Twilio to %s from %s", phone_number, from_num)
        client = Client(sid, token)
        msg = client.messages.create(body=message, from_=from_num, to=phone_number)
        logger.info(
            "[SMS] Twilio message SID=%s status=%s to=%s",
            getattr(msg, "sid", None),
            getattr(msg, "status", None),
            phone_number,
        )
        return True
    except Exception as e:
        logger.error(
            "[SMS] Failed to send to %s via Twilio: %r",
            phone_number,
            e,
        )
        return False
