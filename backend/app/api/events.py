"""
Events API router for ResponseOS.
Server-Sent Events (SSE) streaming endpoint for live two-tab synchronization.
Uses native FastAPI StreamingResponse for zero-dependency high reliability.
"""

import asyncio
import json
from typing import Optional

from fastapi import APIRouter, Depends, Header, Query, Request
from fastapi.responses import StreamingResponse

from app.core.auth import WorkspaceContext, get_workspace_context
from app.core.events import event_manager

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("/stream")
async def event_stream_endpoint(
    request: Request,
    last_event_id: Optional[int] = Query(None, alias="last_event_id"),
    header_last_id: Optional[str] = Header(None, alias="Last-Event-ID"),
    ctx: WorkspaceContext = Depends(get_workspace_context),
):
    """
    Server-Sent Events stream for real-time synchronization between caller and operator tabs.
    Supports reconnection and replay of missed events using Last-Event-ID.
    """
    workspace_id = ctx.workspace_id
    effective_last_id = last_event_id
    if effective_last_id is None and header_last_id:
        try:
            effective_last_id = int(header_last_id)
        except ValueError:
            pass

    queue = event_manager.subscribe(workspace_id)

    async def event_generator():
        try:
            # 1. Replay missed events if client reconnected
            if effective_last_id is not None:
                missed = event_manager.get_missed_events(workspace_id, effective_last_id)
                for ev in missed:
                    yield f"id: {ev.id}\nevent: {ev.event_type}\ndata: {json.dumps(ev.data)}\n\n"

            # 2. Stream new live events
            while True:
                if await request.is_disconnected():
                    break

                try:
                    event = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"id: {event.id}\nevent: {event.event_type}\ndata: {json.dumps(event.data)}\n\n"
                except asyncio.TimeoutError:
                    # Send keepalive ping to maintain connection
                    yield ": ping\n\n"

        finally:
            event_manager.unsubscribe(workspace_id, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
