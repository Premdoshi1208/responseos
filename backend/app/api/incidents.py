"""
Incidents API router for ResponseOS.
Provides incident queries, operator review controls, note taking, status updates,
and exportable markdown/JSON reports.
"""

from datetime import datetime, timezone
from typing import Any, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import WorkspaceContext, require_caller, require_operator
from app.core.database import get_db
from app.models.extracted_field import ExtractedField
from app.models.incident import Incident, IncidentStatus
from app.models.operator import OperatorNote, OperatorReview
from app.models.transcript import TranscriptMessage
from app.models.unit import TrainingUnit, UnitAssignment
from app.tools.executor import ToolExecutor

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


class IncidentUpdateRequest(BaseModel):
    category: Optional[str] = None
    reported_location: Optional[str] = None
    location_confirmed: Optional[bool] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: Optional[str] = None
    reported_hazards: Optional[str] = None
    reported_injuries: Optional[str] = None
    people_affected: Optional[int] = None
    summary: Optional[str] = None


class OperatorReviewRequest(BaseModel):
    field_name: str
    review_type: str  # CONFIRMED, CORRECTED, FLAGGED
    corrected_value: Optional[str] = None


class OperatorNoteRequest(BaseModel):
    content: str


class IncidentStatusRequest(BaseModel):
    status: str


@router.get("")
async def list_incidents(
    status_filter: Optional[str] = Query(None, alias="status"),
    ctx: WorkspaceContext = Depends(require_caller),
    db: AsyncSession = Depends(get_db),
):
    """List all incidents for the active training workspace."""
    query = select(Incident).where(Incident.workspace_id == uuid.UUID(ctx.workspace_id))
    if status_filter:
        try:
            status_enum = IncidentStatus(status_filter)
            query = query.where(Incident.status == status_enum)
        except ValueError:
            pass

    query = query.order_by(desc(Incident.created_at))
    res = await db.execute(query)
    incidents = res.scalars().all()

    return [
        {
            "id": str(inc.id),
            "status": inc.status.value,
            "category": inc.category,
            "reported_location": inc.reported_location,
            "location_confirmed": inc.location_confirmed,
            "latitude": inc.latitude,
            "longitude": inc.longitude,
            "description": inc.description,
            "reported_hazards": inc.reported_hazards,
            "reported_injuries": inc.reported_injuries,
            "people_affected": inc.people_affected,
            "summary": inc.summary,
            "created_at": inc.created_at.isoformat() if inc.created_at else None,
            "updated_at": inc.updated_at.isoformat() if inc.updated_at else None,
        }
        for inc in incidents
    ]


@router.get("/{incident_id}")
async def get_incident_detail(
    incident_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(require_caller),
    db: AsyncSession = Depends(get_db),
):
    """Get full details of a specific training incident."""
    res = await db.execute(
        select(Incident).where(
            Incident.id == incident_id,
            Incident.workspace_id == uuid.UUID(ctx.workspace_id),
        )
    )
    inc = res.scalar_one_or_none()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    # Fetch extracted fields
    ef_res = await db.execute(
        select(ExtractedField).where(ExtractedField.incident_id == incident_id)
    )
    extracted_fields = ef_res.scalars().all()

    # Fetch operator notes
    notes_res = await db.execute(
        select(OperatorNote)
        .where(OperatorNote.incident_id == incident_id)
        .order_by(OperatorNote.created_at)
    )
    notes = notes_res.scalars().all()

    # Fetch operator reviews
    rev_res = await db.execute(
        select(OperatorReview)
        .where(OperatorReview.incident_id == incident_id)
        .order_by(OperatorReview.created_at)
    )
    reviews = rev_res.scalars().all()

    # Fetch unit assignments
    assign_res = await db.execute(
        select(UnitAssignment, TrainingUnit)
        .join(TrainingUnit, UnitAssignment.unit_id == TrainingUnit.id)
        .where(UnitAssignment.incident_id == incident_id)
    )
    assignments = [
        {
            "assignment_id": str(a.id),
            "unit_id": str(u.id),
            "unit_name": u.unit_name,
            "unit_type": u.unit_type.value,
            "assigned_at": a.assigned_at.isoformat() if a.assigned_at else None,
            "released_at": a.released_at.isoformat() if a.released_at else None,
            "is_active": a.released_at is None,
        }
        for a, u in assign_res.all()
    ]

    return {
        "id": str(inc.id),
        "status": inc.status.value,
        "category": inc.category,
        "reported_location": inc.reported_location,
        "location_confirmed": inc.location_confirmed,
        "latitude": inc.latitude,
        "longitude": inc.longitude,
        "description": inc.description,
        "reported_hazards": inc.reported_hazards,
        "reported_injuries": inc.reported_injuries,
        "people_affected": inc.people_affected,
        "missing_information": inc.missing_information or [],
        "summary": inc.summary,
        "operator_review_status": inc.operator_review_status,
        "created_at": inc.created_at.isoformat() if inc.created_at else None,
        "updated_at": inc.updated_at.isoformat() if inc.updated_at else None,
        "extracted_fields": [
            {
                "id": str(f.id),
                "name": f.field_name,
                "value": f.field_value,
                "confidence": f.confidence,
                "source_message_id": str(f.source_message_id) if f.source_message_id else None,
                "previous_value": f.previous_value,
            }
            for f in extracted_fields
        ],
        "notes": [
            {
                "id": str(n.id),
                "content": n.content,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in notes
        ],
        "reviews": [
            {
                "id": str(r.id),
                "field_name": r.field_name,
                "review_type": r.review_type,
                "original_value": r.original_value,
                "corrected_value": r.corrected_value,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in reviews
        ],
        "assignments": assignments,
    }


@router.get("/{incident_id}/transcript")
async def get_incident_transcript(
    incident_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(require_caller),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve full transcript messages for an incident."""
    res = await db.execute(
        select(TranscriptMessage)
        .where(
            TranscriptMessage.incident_id == incident_id,
            TranscriptMessage.workspace_id == uuid.UUID(ctx.workspace_id),
        )
        .order_by(TranscriptMessage.created_at)
    )
    messages = res.scalars().all()
    return [
        {
            "id": str(m.id),
            "role": m.role.value,
            "content": m.content,
            "audio_duration_ms": m.audio_duration_ms,
            "transcription_latency_ms": m.transcription_latency_ms,
            "inference_latency_ms": m.inference_latency_ms,
            "tts_provider": m.tts_provider,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in messages
    ]


@router.patch("/{incident_id}")
async def update_incident_endpoint(
    incident_id: uuid.UUID,
    req: IncidentUpdateRequest,
    ctx: WorkspaceContext = Depends(require_operator),
    db: AsyncSession = Depends(get_db),
):
    """Operator overrides or updates incident details."""
    executor = ToolExecutor(db, uuid.UUID(ctx.workspace_id), caller_role="operator")
    res = await executor.execute_tool(
        "correct_incident_details",
        req.model_dump(exclude_unset=True),
        incident_id=incident_id,
    )
    await db.commit()
    return res


@router.post("/{incident_id}/review")
async def review_incident_endpoint(
    incident_id: uuid.UUID,
    req: OperatorReviewRequest,
    ctx: WorkspaceContext = Depends(require_operator),
    db: AsyncSession = Depends(get_db),
):
    """Operator confirms, corrects, or flags an extracted field."""
    executor = ToolExecutor(db, uuid.UUID(ctx.workspace_id), caller_role="operator")
    res = await executor.execute_tool(
        "review_incident",
        req.model_dump(),
        incident_id=incident_id,
    )
    await db.commit()
    return res


@router.post("/{incident_id}/notes")
async def add_operator_note_endpoint(
    incident_id: uuid.UUID,
    req: OperatorNoteRequest,
    ctx: WorkspaceContext = Depends(require_operator),
    db: AsyncSession = Depends(get_db),
):
    """Operator adds an operational note to the incident."""
    executor = ToolExecutor(db, uuid.UUID(ctx.workspace_id), caller_role="operator")
    res = await executor.execute_tool(
        "add_operator_note",
        req.model_dump(),
        incident_id=incident_id,
    )
    await db.commit()
    return res


@router.post("/{incident_id}/status")
async def update_incident_status_endpoint(
    incident_id: uuid.UUID,
    req: IncidentStatusRequest,
    ctx: WorkspaceContext = Depends(require_operator),
    db: AsyncSession = Depends(get_db),
):
    """Operator advances incident state machine."""
    executor = ToolExecutor(db, uuid.UUID(ctx.workspace_id), caller_role="operator")
    res = await executor.execute_tool(
        "update_incident_status",
        req.model_dump(),
        incident_id=incident_id,
    )
    await db.commit()
    return res


@router.post("/{incident_id}/close")
async def close_incident_endpoint(
    incident_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(require_operator),
    db: AsyncSession = Depends(get_db),
):
    """Operator completes simulation, closes incident, and releases all training units."""
    executor = ToolExecutor(db, uuid.UUID(ctx.workspace_id), caller_role="operator")
    res = await executor.execute_tool(
        "close_incident",
        {},
        incident_id=incident_id,
    )
    await db.commit()
    return res


@router.get("/{incident_id}/report")
async def get_incident_report(
    incident_id: uuid.UUID,
    format: str = Query("markdown", pattern="^(markdown|json)$"),
    ctx: WorkspaceContext = Depends(require_caller),
    db: AsyncSession = Depends(get_db),
):
    """Generate exportable incident report in Markdown or JSON format."""
    # Fetch incident and relations
    res = await db.execute(
        select(Incident).where(
            Incident.id == incident_id,
            Incident.workspace_id == uuid.UUID(ctx.workspace_id),
        )
    )
    inc = res.scalar_one_or_none()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    # Transcript
    t_res = await db.execute(
        select(TranscriptMessage)
        .where(TranscriptMessage.incident_id == incident_id)
        .order_by(TranscriptMessage.created_at)
    )
    transcript = t_res.scalars().all()

    # Notes
    n_res = await db.execute(
        select(OperatorNote)
        .where(OperatorNote.incident_id == incident_id)
        .order_by(OperatorNote.created_at)
    )
    notes = n_res.scalars().all()

    # Assignments
    a_res = await db.execute(
        select(UnitAssignment, TrainingUnit)
        .join(TrainingUnit, UnitAssignment.unit_id == TrainingUnit.id)
        .where(UnitAssignment.incident_id == incident_id)
    )
    assignments = a_res.all()

    if format == "json":
        return {
            "incident_id": str(inc.id),
            "workspace_id": str(inc.workspace_id),
            "status": inc.status.value,
            "category": inc.category,
            "reported_location": inc.reported_location,
            "coordinates": {"lat": inc.latitude, "lng": inc.longitude},
            "description": inc.description,
            "reported_hazards": inc.reported_hazards,
            "reported_injuries": inc.reported_injuries,
            "people_affected": inc.people_affected,
            "summary": inc.summary,
            "created_at": inc.created_at.isoformat() if inc.created_at else None,
            "transcript": [
                {
                    "role": m.role.value,
                    "content": m.content,
                    "timestamp": m.created_at.isoformat() if m.created_at else None,
                }
                for m in transcript
            ],
            "operator_notes": [n.content for n in notes],
            "simulated_units_assigned": [
                {"name": u.unit_name, "type": u.unit_type.value}
                for a, u in assignments
            ],
        }

    # Markdown format
    md_lines = [
        f"# RESPONSEOS — INCIDENT SIMULATION REPORT",
        f"**Incident ID:** `{inc.id}`",
        f"**Date:** {inc.created_at.strftime('%Y-%m-%d %H:%M:%S UTC') if inc.created_at else 'N/A'}",
        f"**Status:** `{inc.status.value}`",
        f"**Category:** {inc.category or 'Unclassified'}",
        f"",
        f"> **NOTICE:** Controlled Training Simulation Only. Not an actual emergency record.",
        f"",
        f"## 1. Executive Summary",
        inc.summary or "No executive summary prepared.",
        f"",
        f"## 2. Location & Geographic Position",
        f"- **Reported Location:** {inc.reported_location or 'Unknown'}",
        f"- **Latitude / Longitude:** `{inc.latitude or 'N/A'}, {inc.longitude or 'N/A'}`",
        f"- **Location Confirmed by Operator:** {'Yes' if inc.location_confirmed else 'No'}",
        f"",
        f"## 3. Circumstances & Hazards",
        f"- **Reported Circumstances:** {inc.description or 'None reported'}",
        f"- **Reported Hazards:** {inc.reported_hazards or 'None'}",
        f"- **Reported Injuries:** {inc.reported_injuries or 'None'}",
        f"- **Individuals Affected:** {inc.people_affected if inc.people_affected is not None else 'Unknown'}",
        f"",
        f"## 4. Simulated Training Unit Assignments",
    ]

    if assignments:
        for a, u in assignments:
            status_tag = "ACTIVE" if a.released_at is None else "RELEASED"
            md_lines.append(f"- **{u.unit_name}** ({u.unit_type.value}) — [{status_tag}] (Assigned: {a.assigned_at.strftime('%H:%M:%S') if a.assigned_at else 'N/A'})")
    else:
        md_lines.append("- *No training units assigned.*")

    md_lines.extend([
        f"",
        f"## 5. Human Operator Notes",
    ])

    if notes:
        for n in notes:
            ts = n.created_at.strftime('%H:%M:%S') if n.created_at else ''
            md_lines.append(f"- [{ts}] {n.content}")
    else:
        md_lines.append("- *No notes entered.*")

    md_lines.extend([
        f"",
        f"## 6. Complete Conversation Transcript",
    ])

    for m in transcript:
        speaker = "CALLER" if m.role.value == "CALLER" else "AI DISPATCHER"
        ts = m.created_at.strftime('%H:%M:%S') if m.created_at else ''
        md_lines.append(f"**[{ts}] {speaker}:** {m.content}\n")

    md_content = "\n".join(md_lines)
    return Response(content=md_content, media_type="text/markdown")
