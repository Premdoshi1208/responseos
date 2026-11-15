"""
Units API router for ResponseOS.
Manages simulated training responder units (ambulances, fire, general).
"""

from typing import Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import WorkspaceContext, require_caller, require_operator
from app.core.database import get_db
from app.models.unit import TrainingUnit, UnitAssignment
from app.tools.executor import ToolExecutor

router = APIRouter(prefix="/api/units", tags=["units"])


class UnitAssignRequest(BaseModel):
    incident_id: str


class UnitReleaseRequest(BaseModel):
    incident_id: str


@router.get("")
async def list_training_units(
    ctx: WorkspaceContext = Depends(require_caller),
    db: AsyncSession = Depends(get_db),
):
    """List all simulated training units for the workspace."""
    res = await db.execute(
        select(TrainingUnit)
        .where(TrainingUnit.workspace_id == uuid.UUID(ctx.workspace_id))
        .order_by(TrainingUnit.unit_name)
    )
    units = res.scalars().all()

    # Get active assignments
    assign_res = await db.execute(
        select(UnitAssignment).where(
            UnitAssignment.workspace_id == uuid.UUID(ctx.workspace_id),
            UnitAssignment.released_at.is_(None),
        )
    )
    active_assignments = {str(a.unit_id): str(a.incident_id) for a in assign_res.scalars().all()}

    return [
        {
            "id": str(u.id),
            "unit_name": u.unit_name,
            "unit_type": u.unit_type.value,
            "is_available": u.is_available,
            "latitude": u.latitude,
            "longitude": u.longitude,
            "active_incident_id": active_assignments.get(str(u.id)),
        }
        for u in units
    ]


@router.post("/{unit_id}/assign")
async def assign_unit_endpoint(
    unit_id: uuid.UUID,
    req: UnitAssignRequest,
    ctx: WorkspaceContext = Depends(require_operator),
    db: AsyncSession = Depends(get_db),
):
    """
    Operator assigns a simulated training unit to an incident.
    Validates unit availability, ensures transactional consistency,
    and broadcasts the update.
    """
    executor = ToolExecutor(db, uuid.UUID(ctx.workspace_id), caller_role="operator")
    res = await executor.execute_tool(
        "assign_training_unit",
        {"unit_id": str(unit_id)},
        incident_id=uuid.UUID(req.incident_id),
    )
    if "error" in res:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=res["error"])

    await db.commit()
    return res


@router.post("/{unit_id}/release")
async def release_unit_endpoint(
    unit_id: uuid.UUID,
    req: UnitReleaseRequest,
    ctx: WorkspaceContext = Depends(require_operator),
    db: AsyncSession = Depends(get_db),
):
    """Operator releases an assigned simulated unit back to the available pool."""
    executor = ToolExecutor(db, uuid.UUID(ctx.workspace_id), caller_role="operator")
    res = await executor.execute_tool(
        "release_training_unit",
        {"unit_id": str(unit_id)},
        incident_id=uuid.UUID(req.incident_id),
    )
    if "error" in res:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=res["error"])

    await db.commit()
    return res
