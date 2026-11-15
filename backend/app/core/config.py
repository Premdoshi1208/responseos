import os
from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


def _find_env_file() -> str:
    candidates = [
        Path.cwd() / ".env",
        Path(__file__).resolve().parent.parent.parent / ".env",
        Path("/Users/mac/.env"),
    ]
    for c in candidates:
        if c.is_file():
            return str(c)
    return ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_find_env_file(),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DATABASE_URL: str = "sqlite+aiosqlite:////tmp/responseos_local.db"
    GROQ_API_KEY: str = ""
    SESSION_SECRET: str = "responseos-secure-session-key-dev"
    ENVIRONMENT: str = "production"

    # Audio limits
    MAX_AUDIO_DURATION_SECONDS: int = 60
    MAX_AUDIO_SIZE_MB: int = 10

    # Rate limits
    MAX_DAILY_TRANSCRIPTIONS: int = 50
    MAX_DAILY_INFERENCE_CALLS: int = 200
    MAX_DAILY_TTS_CALLS: int = 100
    MAX_CONVERSATION_TURNS: int = 30
    RATE_LIMIT_PER_MINUTE: int = 30

    # Workspace limits
    WORKSPACE_EXPIRY_HOURS: int = 24
    MAX_CONCURRENT_WORKSPACES: int = 50


@lru_cache()
def get_settings() -> Settings:
    s = Settings()
    # Explicit env override fallback
    if not s.GROQ_API_KEY and os.getenv("GROQ_API_KEY"):
        s.GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    if os.getenv("DATABASE_URL"):
        s.DATABASE_URL = os.getenv("DATABASE_URL")
    return s
