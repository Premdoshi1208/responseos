import enum
import uuid
from typing import TYPE_CHECKING, Any, Dict, List, Optional

from sqlalchemy import Boolean, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.extracted_field import ExtractedField
    from app.models.operator import OperatorNote, OperatorReview
    from app.models.transcript import TranscriptMessage
    from app.models.unit import UnitAssignment
    from app.models.workspace import TrainingWorkspace


class IncidentStatus(str, enum.Enum):
    NEW = "NEW"
    INFORMATION_COLLECTION = "INFORMATION_COLLECTION"
    AWAITING_OPERATOR_REVIEW = "AWAITING_OPERATOR_REVIEW"
    REVIEWED = "REVIEWED"
    TRAINING_UNIT_ASSIGNED = "TRAINING_UNIT_ASSIGNED"
    CLOSED = "CLOSED"


class Incident(TimestampMixin, Base):
    __tablename__ = "incidents"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("training_workspaces.id"), nullable=False
    )
    call_session_id: Mapped[Optional[uuid.UUID]] = mapped_column(nullable=True)
    status: Mapped[IncidentStatus] = mapped_column(
        Enum(IncidentStatus, name="incident_status", native_enum=False),
        default=IncidentStatus.NEW,
        nullable=False,
    )
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    reported_location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    location_confirmed: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reported_hazards: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reported_injuries: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    people_affected: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    missing_information: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON, nullable=True
    )
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    operator_review_status: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )

    workspace: Mapped["TrainingWorkspace"] = relationship(
        "TrainingWorkspace", back_populates="incidents"
    )
    transcript_messages: Mapped[List["TranscriptMessage"]] = relationship(
        "TranscriptMessage", back_populates="incident", lazy="selectin"
    )
    extracted_fields: Mapped[List["ExtractedField"]] = relationship(
        "ExtractedField", back_populates="incident", lazy="selectin"
    )
    operator_notes: Mapped[List["OperatorNote"]] = relationship(
        "OperatorNote", back_populates="incident", lazy="selectin"
    )
    operator_reviews: Mapped[List["OperatorReview"]] = relationship(
        "OperatorReview", back_populates="incident", lazy="selectin"
    )
    unit_assignments: Mapped[List["UnitAssignment"]] = relationship(
        "UnitAssignment", back_populates="incident", lazy="selectin"
    )
