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
    count: int = Field(default=10, ge=1, le=100)
    region: str = Field(
        default="na1",
        description="Riot platform region (e.g., na1, euw1)",
    )


class IngestResponse(BaseModel):
    puuid: str
    job_id: str | None = None
    matches_fetched: int
    matches_inserted: int
    status: str


class IngestStatusResponse(BaseModel):
    job_id: str
    status: str
    matches_fetched: int | None = None
    matches_inserted: int | None = None


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


class MatchPaginationMeta(BaseModel):
    cursor: str | None = None
    has_more: bool = False


class MatchHistoryResponse(BaseModel):
    data: list[MatchParticipant]
    pagination: MatchPaginationMeta


# --- Match Detail ---


class ParticipantDetail(BaseModel):
    champion_id: int
    champion_name: str
    role: str
    summoner_name: str
    kills: int
    deaths: int
    assists: int
    cs_per_min: float
    gold_earned: int
    total_damage_dealt: int
    vision_score: int
    win: bool


class TeamDetail(BaseModel):
    team_id: int
    win: bool
    participants: list[ParticipantDetail]


class MatchDetailResponse(BaseModel):
    match_id: str
    game_duration: int
    game_start: datetime
    queue_id: int
    blue_team: TeamDetail
    red_team: TeamDetail
