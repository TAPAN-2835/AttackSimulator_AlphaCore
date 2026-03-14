from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    APP_NAME: str = "Breach"
    BASE_URL: str = "http://localhost:8000"  # Deployed backend URL
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Database — SQLite for local dev, PostgreSQL for production
    DATABASE_URL: str = "sqlite+aiosqlite:///./breach.db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Simulation
    SIM_BASE_URL: str = "http://localhost:8000"
    @property
    def phishing_base_url(self) -> str:
        return self.BASE_URL.rstrip("/")
    TOKEN_EXPIRY_HOURS: int = 72
    SIMULATION_MODE: bool = True  # When True: log messages only, no real SMS/WhatsApp sent

    # Twilio (optional — for real SMS/WhatsApp when SIMULATION_MODE=False)
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""
    TWILIO_WHATSAPP_FROM: str = "whatsapp:+14155238886"  # Sandbox

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://localhost:8080"

    # SMTP Settings (for Real MVP emails)
    SMTP_SERVER: str = ""
    SMTP_PORT: str = "587"
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "simulator@alphacore.io"

    # RAG Chatbot (Groq)
    # AI Providers
    GROQ_API_KEY: str | None = None
    OPENAI_API_KEY: str | None = None
    ANTHROPIC_API_KEY: str | None = None
    GEMINI_API_KEY: str | None = None

    # VirusTotal (optional — for URL check when reporting phishing)
    VIRUSTOTAL_API_KEY: str = ""

    @property
    def origins_list(self) -> list[str]:
        base = [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]
        # Also include trailing slash versions
        with_slash = [f"{o}/" for o in base if not o.endswith("/")]
        return list(set(base + with_slash))


@lru_cache
def get_settings() -> Settings:
    return Settings()
