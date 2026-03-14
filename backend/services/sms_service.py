"""
SMS (Smishing) service. Uses Twilio when configured, otherwise mock (log only).
When SIMULATION_MODE=true, messages are logged only.
"""
import logging
from config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


def send_sms(phone_number: str, message: str) -> bool:
    """
    Send an SMS to the given phone number.
    In SIMULATION_MODE or when Twilio is not configured, logs the message and returns True.
    """
    if settings.SIMULATION_MODE:
        logger.info("[SIMULATION_MODE] SMS (mock) to %s: %s", phone_number, message[:80] + "..." if len(message) > 80 else message)
        return True

    sid = getattr(settings, "TWILIO_ACCOUNT_SID", "")
    token = getattr(settings, "TWILIO_AUTH_TOKEN", "")
    from_num = getattr(settings, "TWILIO_PHONE_NUMBER", "")

    if not sid or not token or not from_num:
        logger.info("[SMS MOCK] Twilio not configured. Would send to %s: %s", phone_number, message[:80])
        return True

    try:
        from twilio.rest import Client
        client = Client(sid, token)
        client.messages.create(body=message, from_=from_num, to=phone_number)
        logger.info("[SMS] Sent to %s", phone_number)
        return True
    except Exception as e:
        logger.error("[SMS] Failed to send to %s: %s", phone_number, e)
        return False
