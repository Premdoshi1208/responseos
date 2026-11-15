from dataclasses import dataclass
from typing import Any, Optional
import uuid

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import hash_token
from app.models.workspace import TrainingWorkspace


@dataclass
class WorkspaceContext:
    workspace_id: str
    role: str  # "caller" or "operator"
    workspace: TrainingWorkspace


def _extract_token(request: Request) -> tuple[Optional[str], str]:
    # Check X-Operator-Token header
    op_header = request.headers.get("X-Operator-Token")
    if op_header:
        return op_header, "operator"

    # Check X-Workspace-Token header
    ws_header = request.headers.get("X-Workspace-Token")
    if ws_header:
        return ws_header, "caller"

    # Check query params for SSE / browser links
    token_param = request.query_params.get("token")
    role_param = request.query_params.get("role", "caller")
    if token_param:
        return token_param, role_param

    # Check cookies
    operator_token = request.cookies.get("operator_token")
    if operator_token:
        return operator_token, "operator"

    workspace_token = request.cookies.get("workspace_token")
    if workspace_token:
        return workspace_token, "caller"

    # Check Authorization header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
        return token, "caller"  # Will check both caller and operator hashes

    return None, ""


async def get_workspace_context(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> WorkspaceContext:
    token, role = _extract_token(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required: provide token via header, cookie, or query param",
        )

    hashed = hash_token(token)

    # First check operator hash
    op_res = await db.execute(
        select(TrainingWorkspace).where(TrainingWorkspace.operator_token_hash == hashed)
    )
    workspace = op_res.scalar_one_or_none()
    if workspace:
        return WorkspaceContext(
            workspace_id=str(workspace.id),
            role="operator",
            workspace=workspace,
        )

    # Then check access / caller hash
    caller_res = await db.execute(
        select(TrainingWorkspace).where(TrainingWorkspace.access_token_hash == hashed)
    )
    workspace = caller_res.scalar_one_or_none()
    if workspace:
        return WorkspaceContext(
            workspace_id=str(workspace.id),
            role="caller",
            workspace=workspace,
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
    )


async def require_caller(
    ctx: WorkspaceContext = Depends(get_workspace_context),
) -> WorkspaceContext:
    if ctx.role not in ("caller", "operator"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Caller or operator access required",
        )
    return ctx


async def require_operator(
    ctx: WorkspaceContext = Depends(get_workspace_context),
) -> WorkspaceContext:
    if ctx.role != "operator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operator access required. Caller token cannot perform operator actions.",
        )
    return ctx
