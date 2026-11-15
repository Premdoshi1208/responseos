"""
ResponseOS — Main FastAPI Application
Tagline: 'Every second matters.'
Voice-first AI incident intake and dispatcher training copilot.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
import os
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.events import router as events_router
from app.api.health import router as health_router
from app.api.incidents import router as incidents_router
from app.api.units import router as units_router
from app.api.voice import router as voice_router
from app.api.workspaces import router as workspaces_router
from app.core.config import get_settings
from app.core.database import engine
from app.models.base import Base

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables if they do not exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown
    await engine.dispose()


app = FastAPI(
    title="ResponseOS API",
    description="Voice-first AI incident intake and dispatcher training simulation platform.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(health_router)
app.include_router(workspaces_router)
app.include_router(voice_router)
app.include_router(incidents_router)
app.include_router(units_router)
app.include_router(events_router)

# Static file serving for built React SPA frontend
# Checks both backend/static and frontend/dist
current_dir = Path(__file__).resolve().parent
candidates = [
    current_dir.parent / "static",
    current_dir.parent.parent / "frontend" / "dist",
]
static_dir: Path | None = None
for c in candidates:
    if c.exists() and (c / "index.html").exists():
        static_dir = c
        break

if static_dir:
    # Mount assets folder
    assets_dir = static_dir / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    # Serve SPA index for client routes
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Don't intercept API routes
        if full_path.startswith("api/"):
            return JSONResponse({"detail": "Not found"}, status_code=404)
        file_path = static_dir / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(static_dir / "index.html")
