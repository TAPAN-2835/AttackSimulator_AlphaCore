import asyncio
from services.sms_service import send_sms
from config import get_settings

s = get_settings()
print(f"SIMULATION_MODE={s.SIMULATION_MODE}")
print(f"SID={s.TWILIO_ACCOUNT_SID}")

res = send_sms("+1234567890", "test script")
print(f"Result: {res}")
