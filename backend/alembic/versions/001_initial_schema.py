"""Initial schema: users, riot_accounts, identity_links, refresh_tokens,
teams, team_members, draft_sessions, score_snapshots.

Revision ID: 001
Revises: None
Create Date: 2026-03-08
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Extensions
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')

    # -- users --
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.Text, unique=True, nullable=True),
        sa.Column("password_hash", sa.Text, nullable=True),
        sa.Column("display_name", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # -- riot_accounts --
    op.create_table(
        "riot_accounts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("puuid", sa.Text, unique=True, nullable=False),
        sa.Column("game_name", sa.Text, nullable=False),
        sa.Column("tag_line", sa.Text, nullable=False),
        sa.Column("region", sa.Text, nullable=False),
        sa.Column("is_primary", sa.Boolean, default=False, nullable=False),
        sa.Column("verified", sa.Boolean, default=False, nullable=False),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("linked_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_index(
        "idx_one_primary_per_user",
        "riot_accounts",
        ["user_id"],
        unique=True,
        postgresql_where=sa.text("is_primary = true"),
    )

    # -- identity_links --
    op.create_table(
        "identity_links",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("account_id", UUID(as_uuid=True), sa.ForeignKey("riot_accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("verification_status", sa.String(20), default="pending", nullable=False),
        sa.Column("verification_method", sa.String(10), default="icon", nullable=False),
        sa.Column("verification_token", sa.Text, nullable=True),
        sa.Column("encrypted_link_data", sa.Text, nullable=True),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "verification_status IN ('pending', 'verified', 'failed', 'expired')",
            name="valid_verification_status",
        ),
        sa.CheckConstraint(
            "verification_method IN ('icon', 'bio', 'rso')",
            name="valid_verification_method",
        ),
    )

    # -- refresh_tokens --
    op.create_table(
        "refresh_tokens",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.Text, unique=True, nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # -- teams --
    op.create_table(
        "teams",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("owner_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # -- team_members --
    op.create_table(
        "team_members",
        sa.Column("team_id", UUID(as_uuid=True), sa.ForeignKey("teams.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("role", sa.Text, nullable=False),
        sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "role IN ('top', 'jungle', 'mid', 'bot', 'support')",
            name="valid_team_member_role",
        ),
    )

    # -- draft_sessions --
    op.create_table(
        "draft_sessions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("team_id", UUID(as_uuid=True), sa.ForeignKey("teams.id"), nullable=True),
        sa.Column("mode", sa.String(20), default="clash", nullable=False),
        sa.Column("draft_state", JSONB, default={}, nullable=False),
        sa.Column("status", sa.String(20), default="in_progress", nullable=False),
        sa.Column("match_id", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "mode IN ('clash', 'custom', 'scrim')",
            name="valid_draft_mode",
        ),
        sa.CheckConstraint(
            "status IN ('in_progress', 'completed', 'abandoned')",
            name="valid_draft_status",
        ),
    )

    # -- score_snapshots --
    op.create_table(
        "score_snapshots",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("draft_session_id", UUID(as_uuid=True), sa.ForeignKey("draft_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("pick_number", sa.SmallInteger, nullable=False),
        sa.Column("total_score", sa.Float, nullable=False),
        sa.Column("synergy_score", sa.Float, nullable=False),
        sa.Column("counter_score", sa.Float, nullable=False),
        sa.Column("comfort_score", sa.Float, nullable=False),
        sa.Column("recommended_picks", JSONB, nullable=True),
        sa.Column("recommended_bans", JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("score_snapshots")
    op.drop_table("draft_sessions")
    op.drop_table("team_members")
    op.drop_table("teams")
    op.drop_table("refresh_tokens")
    op.drop_table("identity_links")
    op.drop_index("idx_one_primary_per_user", table_name="riot_accounts")
    op.drop_table("riot_accounts")
    op.drop_table("users")
