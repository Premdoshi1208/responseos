"""
Workspace Management Service for ResponseOS.
Handles isolated demo workspaces, token generation, training unit initialization,
and lifecycle cleanup.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, TypedDict
import uuid

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import generate_token, hash_token
from app.models.incident import Incident
from app.models.unit import TrainingUnit, UnitType
from app.models.workspace import TrainingWorkspace

settings = get_settings()


class WorkspaceCreated(TypedDict):
    id: str
    name: str
    access_token: str  # Given ONLY ONCE on creation to caller
    operator_token: str  # Given ONLY ONCE on creation to operator
    expires_at: str
    units_count: int


# Default simulated training units in San Francisco
DEFAULT_TRAINING_UNITS = [
    {
        "unit_name": "Medic-1",
        "unit_type": UnitType.AMBULANCE,
        "latitude": 37.7550,
        "longitude": -122.4050,  # SF General Hospital vicinity
    },
    {
        "unit_name": "Medic-2",
        "unit_type": UnitType.AMBULANCE,
        "latitude": 37.7850,
        "longitude": -122.4200,  # Civic Center / Western Addition
    },
    {
        "unit_name": "Engine-1",
        "unit_type": UnitType.FIRE,
        "latitude": 37.7750,
        "longitude": -122.4350,  # Fire Station 36 area
    },
    {
        "unit_name": "Engine-2",
        "unit_type": UnitType.FIRE,
        "latitude": 37.7950,
        "longitude": -122.4100,  # North Beach / Financial District
    },
    {
        "unit_name": "Unit-1",
        "unit_type": UnitType.GENERAL,
        "latitude": 37.7650,
        "longitude": -122.4200,  # Mission District
    },
    {
        "unit_name": "Unit-2",
        "unit_type": UnitType.GENERAL,
        "latitude": 37.8000,
        "longitude": -122.4150,  # Fisherman's Wharf / Waterfront
    },
]


async def create_workspace(db: AsyncSession, name: Optional[str] = None) -> WorkspaceCreated:
    """
    Create a new isolated training workspace.
    Generates unguessable caller and operator capability tokens.
    Initializes standard simulated training units.
    """
    workspace_id = uuid.uuid4()
    access_token = generate_token()
    operator_token = generate_token()

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=settings.WORKSPACE_EXPIRY_HOURS)

    workspace_name = name or f"Training Sandbox {str(workspace_id)[:8]}"

    workspace = TrainingWorkspace(
        id=workspace_id,
        name=workspace_name,
        access_token_hash=hash_token(access_token),
        operator_token_hash=hash_token(operator_token),
        is_active=True,
        daily_request_count=0,
        daily_request_reset=now,
        expires_at=expires_at,
    )
    db.add(workspace)
    await db.flush()

    # Initialize simulated training units
    for unit_cfg in DEFAULT_TRAINING_UNITS:
        unit = TrainingUnit(
            id=uuid.uuid4(),
            workspace_id=workspace_id,
            unit_name=unit_cfg["unit_name"],
            unit_type=unit_cfg["unit_type"],
            is_available=True,
            latitude=unit_cfg["latitude"],
            longitude=unit_cfg["longitude"],
        )
        db.add(unit)

    await db.commit()
    await db.refresh(workspace)

    return {
        "id": str(workspace_id),
        "name": workspace_name,
        "access_token": access_token,
        "operator_token": operator_token,
        "expires_at": expires_at.isoformat(),
        "units_count": len(DEFAULT_TRAINING_UNITS),
    }


async def get_workspace_by_id(db: AsyncSession, workspace_id: uuid.UUID) -> Optional[TrainingWorkspace]:
    """Retrieve an active workspace by ID."""
    result = await db.execute(
        select(TrainingWorkspace).where(
            TrainingWorkspace.id == workspace_id,
            TrainingWorkspace.is_active == True,
        )
    )
    return result.scalar_one_or_none()


async def cleanup_expired_workspaces(db: AsyncSession) -> int:
    """Purge workspaces that have expired past their retention window."""
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(TrainingWorkspace.id).where(
            TrainingWorkspace.expires_at < now
        )
    )
    expired_ids = result.scalars().all()
    if not expired_ids:
        return 0

    await db.execute(
        delete(TrainingWorkspace).where(TrainingWorkspace.id.in_(expired_ids))
    )
    await db.commit()
    return len(expired_ids)
