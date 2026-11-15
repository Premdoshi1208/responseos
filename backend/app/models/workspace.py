import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.incident import Incident
    from app.models.unit import TrainingUnit


class TrainingWorkspace(TimestampMixin, Base):
    __tablename__ = "training_workspaces"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    access_token_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    operator_token_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    daily_request_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    daily_request_reset: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    incidents: Mapped[List["Incident"]] = relationship(
        "Incident", back_populates="workspace", lazy="selectin"
    )
    units: Mapped[List["TrainingUnit"]] = relationship(
        "TrainingUnit", back_populates="workspace", lazy="selectin"
    )
