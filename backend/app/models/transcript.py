import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.incident import Incident
    from app.models.workspace import TrainingWorkspace


class MessageRole(str, enum.Enum):
    CALLER = "CALLER"
    AI = "AI"
    SYSTEM = "SYSTEM"


class TranscriptMessage(Base):
    __tablename__ = "transcript_messages"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    incident_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("incidents.id"), nullable=False
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("training_workspaces.id"), nullable=False
    )
    role: Mapped[MessageRole] = mapped_column(
        Enum(MessageRole, name="message_role", native_enum=False), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    audio_duration_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    transcription_latency_ms: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )
    inference_latency_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    tts_provider: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    incident: Mapped["Incident"] = relationship(
        "Incident", back_populates="transcript_messages"
    )
