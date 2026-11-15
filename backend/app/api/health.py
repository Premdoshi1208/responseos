"""
Health and Readiness check API router for ResponseOS.
"""

import time
from fastapi import APIRouter
from app.core.config import get_settings
from app.core.database import check_db_health

router = APIRouter(tags=["health"])
settings = get_settings()
START_TIME = time.time()


@router.get("/api/health")
@router.get("/health")
async def health_check():
    """Application health endpoint with database and configuration verification."""
    db_ok = await check_db_health()
    groq_configured = bool(settings.GROQ_API_KEY)

    status_str = "healthy" if db_ok else "degraded"

    return {
        "status": status_str,
        "product": "ResponseOS",
        "tagline": "Every second matters.",
        "uptime_seconds": int(time.time() - START_TIME),
        "database_connected": db_ok,
        "groq_configured": groq_configured,
        "models": {
            "stt": "whisper-large-v3-turbo",
            "reasoning": "openai/gpt-oss-20b",
            "tts": "canopylabs/orpheus-v1-english (fallback: browser-speech-synthesis)",
        },
        "simulation_mode": True,
    }


@router.get("/api/readiness")
async def readiness_check():
    """Cloud readiness probe."""
    db_ok = await check_db_health()
    return {"ready": db_ok}
