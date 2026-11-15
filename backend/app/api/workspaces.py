"""
Workspaces API router for ResponseOS.
Handles isolated demo workspace lifecycle, capability tokens, and unit status.
"""

from typing import Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import WorkspaceContext, get_workspace_context, require_operator
from app.core.database import get_db
from app.models.workspace import TrainingWorkspace
from app.services.workspace_service import create_workspace, get_workspace_by_id

router = APIRouter(prefix="/api/workspaces", tags=["workspaces"])


class WorkspaceCreateRequest(BaseModel):
    name: Optional[str] = None


class WorkspaceResponse(BaseModel):
    id: str
    name: str
    access_token: Optional[str] = None
    operator_token: Optional[str] = None
    expires_at: Optional[str] = None
    units_count: int = 6


@router.post("", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_new_workspace(
    req: WorkspaceCreateRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new isolated training workspace.
    Returns access_token (for caller) and operator_token (for command center).
    Tokens are only revealed upon initial creation.
    """
    res = await create_workspace(db, name=req.name)

    # Set caller cookie as default convenience
    response.set_cookie(
        key="workspace_token",
        value=res["access_token"],
        httponly=False,  # Accessible for client JS tab management
        samesite="lax",
        max_age=86400,
    )

    return res


@router.get("/current")
async def get_current_workspace(
    ctx: WorkspaceContext = Depends(get_workspace_context),
):
    """Get the active workspace context and caller role."""
    return {
        "id": str(ctx.workspace.id),
        "name": ctx.workspace.name,
        "role": ctx.role,
        "is_active": ctx.workspace.is_active,
        "expires_at": ctx.workspace.expires_at.isoformat() if ctx.workspace.expires_at else None,
        "daily_request_count": ctx.workspace.daily_request_count,
    }


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(
    workspace_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(require_operator),
    db: AsyncSession = Depends(get_db),
):
    """Delete a workspace (Operator only)."""
    if str(ctx.workspace.id) != str(workspace_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete another workspace",
        )

    await db.delete(ctx.workspace)
    await db.commit()
    return None
