import uuid
from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.incident import Incident
    from app.models.transcript import TranscriptMessage


class ExtractedField(TimestampMixin, Base):
    __tablename__ = "extracted_fields"

    incident_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("incidents.id"), nullable=False
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("training_workspaces.id"), nullable=False
    )
    field_name: Mapped[str] = mapped_column(String(100), nullable=False)
    field_value: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[str] = mapped_column(String(20), nullable=False)
    source_message_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("transcript_messages.id"), nullable=True
    )
    previous_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    incident: Mapped["Incident"] = relationship(
        "Incident", back_populates="extracted_fields"
    )
    source_message: Mapped[Optional["TranscriptMessage"]] = relationship(
        "TranscriptMessage", lazy="selectin"
    )
