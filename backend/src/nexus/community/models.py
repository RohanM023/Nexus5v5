"""SQLAlchemy models for community features: FindListing, ScrimListing."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from nexus.shared.database import Base


class FindListing(Base):
    __tablename__ = "find_listings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    riot_id: Mapped[str] = mapped_column(Text, nullable=False)
    roles: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    rank: Mapped[str | None] = mapped_column(Text, nullable=True)
    champions: Mapped[str | None] = mapped_column(Text, nullable=True)
    discord: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class ScrimListing(Base):
    __tablename__ = "scrim_listings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    team_name: Mapped[str] = mapped_column(Text, nullable=False)
    contact_riot_id: Mapped[str] = mapped_column(Text, nullable=False)
    discord: Mapped[str | None] = mapped_column(Text, nullable=True)
    rank_range: Mapped[str | None] = mapped_column(Text, nullable=True)
    formats: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    availability: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
