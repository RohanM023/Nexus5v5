"""Pydantic schemas for match ingestion and match history."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

# --- Ingestion ---


class IngestRequest(BaseModel):
    queue_ids: list[int] = Field(
        default=[420, 700],
        description="Queue IDs to ingest (420=Ranked Solo, 700=Clash)",
    )
    count: int = Field(default=20, ge=1, le=100)


class IngestResponse(BaseModel):
    puuid: str
    matches_fetched: int
    matches_inserted: int
    status: str


# --- Match History ---


class MatchParticipant(BaseModel):
    match_id: str
    platform_id: str
    queue_id: int
    game_version: str
    game_duration: int
    game_start: datetime
    puuid: str
    champion_id: int
    champion_name: str
    team_id: int
    role: str
    win: bool
    kills: int
    deaths: int
    assists: int
    cs: int
    gold_earned: int
    damage_dealt: int
    damage_taken: int
    vision_score: int


class MatchHistoryFilters(BaseModel):
    queue_id: int | None = None
    champion_id: int | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None


class MatchHistoryResponse(BaseModel):
    data: list[MatchParticipant]
    pagination: MatchPaginationMeta


class MatchPaginationMeta(BaseModel):
    cursor: str | None = None
    has_more: bool = False
    total: int | None = None
