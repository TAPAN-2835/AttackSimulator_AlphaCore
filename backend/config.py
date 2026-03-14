from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # App
    APP_NAME: str = "Breach"
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Database — SQLite for local dev, PostgreSQL for production
    DATABASE_URL: str = "sqlite+aiosqlite:///./breach.db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Simulation
    SIM_BASE_URL: str = "http://localhost:8000"
    TOKEN_EXPIRY_HOURS: int = 72

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://localhost:8080"

    # SMTP Settings (for Real MVP emails)
    SMTP_SERVER: str = ""
    SMTP_PORT: str = "587"
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "simulator@alphacore.io"

    # RAG Chatbot (Groq)
    GROQ_API_KEY: str = ""

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]


@lru_cache
def get_settings() -> Settings:
    return Settings()
