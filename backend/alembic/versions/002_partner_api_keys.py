"""Add partner_api_keys table for Nexus-Core widget authentication.

Revision ID: 002
Revises: 001
Create Date: 2026-03-18
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "partner_api_keys",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("partner_name", sa.Text, nullable=False),
        sa.Column("api_key_hash", sa.Text, unique=True, nullable=False),
        sa.Column("rate_limit_per_minute", sa.Integer, default=60, nullable=False),
        sa.Column("allowed_origins", JSONB, default=[], nullable=False),
        sa.Column("is_active", sa.Boolean, default=True, nullable=False),
        sa.Column("usage_count", sa.BigInteger, default=0, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    op.create_index(
        "idx_partner_api_key_hash",
        "partner_api_keys",
        ["api_key_hash"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("idx_partner_api_key_hash", table_name="partner_api_keys")
    op.drop_table("partner_api_keys")
