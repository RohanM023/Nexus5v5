"""Add find_listings and scrim_listings tables for community features.

Revision ID: 003
Revises: 002
Create Date: 2026-04-05
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import ARRAY, UUID

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "find_listings",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("riot_id", sa.Text, nullable=False),
        sa.Column("roles", ARRAY(sa.Text), nullable=False, server_default="{}"),
        sa.Column("rank", sa.Text, nullable=True),
        sa.Column("champions", sa.Text, nullable=True),
        sa.Column("discord", sa.Text, nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_find_listings_updated_at", "find_listings", ["updated_at"])

    op.create_table(
        "scrim_listings",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("team_name", sa.Text, nullable=False),
        sa.Column("contact_riot_id", sa.Text, nullable=False),
        sa.Column("discord", sa.Text, nullable=True),
        sa.Column("rank_range", sa.Text, nullable=True),
        sa.Column("formats", ARRAY(sa.Text), nullable=False, server_default="{}"),
        sa.Column("availability", ARRAY(sa.Text), nullable=False, server_default="{}"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_scrim_listings_updated_at", "scrim_listings", ["updated_at"])


def downgrade() -> None:
    op.drop_index("idx_scrim_listings_updated_at", table_name="scrim_listings")
    op.drop_table("scrim_listings")
    op.drop_index("idx_find_listings_updated_at", table_name="find_listings")
    op.drop_table("find_listings")
