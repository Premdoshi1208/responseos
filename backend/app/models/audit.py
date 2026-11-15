import uuid
from datetime import date, datetime
from typing import Any, Dict, Optional

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("training_workspaces.id"), nullable=False
    )
    incident_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("incidents.id"), nullable=True
    )
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    event_data: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class ToolInvocation(Base):
    __tablename__ = "tool_invocations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("training_workspaces.id"), nullable=False
    )
    incident_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("incidents.id"), nullable=True
    )
    tool_name: Mapped[str] = mapped_column(String(100), nullable=False)
    input_data: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    output_data: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    execution_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class UsageLimit(Base):
    __tablename__ = "usage_limits"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("training_workspaces.id"), unique=True, nullable=False
    )
    daily_transcription_seconds: Mapped[float] = mapped_column(
        Float, default=0, nullable=False
    )
    daily_inference_calls: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )
    daily_tts_calls: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reset_date: Mapped[date] = mapped_column(Date, nullable=False)
