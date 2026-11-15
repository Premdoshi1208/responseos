import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.incident import Incident
    from app.models.workspace import TrainingWorkspace


class UnitType(str, enum.Enum):
    AMBULANCE = "AMBULANCE"
    FIRE = "FIRE"
    GENERAL = "GENERAL"


class TrainingUnit(Base):
    __tablename__ = "training_units"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("training_workspaces.id"), nullable=False
    )
    unit_type: Mapped[UnitType] = mapped_column(
        Enum(UnitType, name="unit_type", native_enum=False), nullable=False
    )
    unit_name: Mapped[str] = mapped_column(String(50), nullable=False)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    workspace: Mapped["TrainingWorkspace"] = relationship(
        "TrainingWorkspace", back_populates="units"
    )
    assignments: Mapped[list["UnitAssignment"]] = relationship(
        "UnitAssignment", back_populates="unit", lazy="selectin"
    )


class UnitAssignment(Base):
    __tablename__ = "unit_assignments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    incident_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("incidents.id"), nullable=False
    )
    unit_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("training_units.id"), nullable=False
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("training_workspaces.id"), nullable=False
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    released_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    incident: Mapped["Incident"] = relationship(
        "Incident", back_populates="unit_assignments"
    )
    unit: Mapped["TrainingUnit"] = relationship(
        "TrainingUnit", back_populates="assignments"
    )
