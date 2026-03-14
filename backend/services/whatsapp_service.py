"""
WhatsApp phishing simulation service. Uses Twilio WhatsApp sandbox/API when configured.
When SIMULATION_MODE=true, messages are logged only.
"""
import logging
from config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


def send_whatsapp(phone_number: str, message: str) -> bool:
    """
    Send a WhatsApp message to the given phone number.
    Phone should be in E.164 format; for Twilio sandbox use 'whatsapp:+1...'.
    In SIMULATION_MODE or when Twilio is not configured, logs the message and returns True.
    """
    to_addr = phone_number if phone_number.startswith("whatsapp:") else f"whatsapp:{phone_number}"

    if settings.SIMULATION_MODE:
        logger.info("[SIMULATION_MODE] WhatsApp (mock) to %s: %s", to_addr, message[:80] + "..." if len(message) > 80 else message)
        return True

    sid = getattr(settings, "TWILIO_ACCOUNT_SID", "")
    token = getattr(settings, "TWILIO_AUTH_TOKEN", "")
    from_addr = getattr(settings, "TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")

    if not sid or not token:
        logger.info("[WhatsApp MOCK] Twilio not configured. Would send to %s: %s", to_addr, message[:80])
        return True

    try:
        from twilio.rest import Client
        client = Client(sid, token)
        client.messages.create(body=message, from_=from_addr, to=to_addr)
        logger.info("[WhatsApp] Sent to %s", to_addr)
        return True
    except Exception as e:
        logger.error("[WhatsApp] Failed to send to %s: %s", to_addr, e)
        return False
