"""Pydantic schemas for analytics responses."""

from __future__ import annotations

from pydantic import BaseModel, Field


class ChampionPoolEntry(BaseModel):
    champion_id: int
    champion_name: str
    games_played: int
    wins: int
    losses: int
    win_rate: float
    avg_kills: float
    avg_deaths: float
    avg_assists: float
    avg_kda: float
    avg_cs_per_min: float
    avg_vision_score: float
    true_mastery: float
    comfort_score: float
    tier: str


class ChampionPoolResponse(BaseModel):
    user_id: str
    champions: list[ChampionPoolEntry]
    total_champions: int


class RoleDistribution(BaseModel):
    role: str
    games: int
    percentage: float


class TopChampion(BaseModel):
    champion_id: int
    champion_name: str
    games_played: int
    win_rate: float


class PerformanceStats(BaseModel):
    user_id: str
    total_games: int
    total_wins: int
    total_losses: int
    overall_win_rate: float
    avg_kills: float
    avg_deaths: float
    avg_assists: float
    avg_kda: float
    avg_cs_per_min: float
    avg_vision_score: float
    role_distribution: list[RoleDistribution]
    top_champions: list[TopChampion]


class GoldDiffPoint(BaseModel):
    minute: int
    gold_diff: int


class ParticipantGoldDiff(BaseModel):
    puuid: str
    champion_name: str
    team_id: int
    timeline: list[GoldDiffPoint]


class GoldDiffResponse(BaseModel):
    match_id: str
    participants: list[ParticipantGoldDiff]


class ChampionPoolQueryParams(BaseModel):
    """Query parameters for champion pool endpoint."""

    patch: str | None = None
    queue_id: int | None = None
    role: str | None = None
    sort_by: str = Field(
        default="games_played",
        pattern=r"^(games_played|win_rate|true_mastery|comfort_score)$",
    )
    sort_order: str = Field(default="desc", pattern=r"^(asc|desc)$")


# --- Duo Overlap ---


class SharedChampion(BaseModel):
    champion_id: int
    champion_name: str
    player1_mastery: float
    player2_mastery: float
    avg_mastery: float
    player1_comfort: float
    player2_comfort: float
    player1_tier: str
    player2_tier: str


class DuoOverlapResponse(BaseModel):
    player1_puuid: str
    player2_puuid: str
    player1_total: int
    player2_total: int
    shared_count: int
    player1_exclusive_count: int
    player2_exclusive_count: int
    shared_champions: list[SharedChampion]
    player1_exclusive: list[ChampionPoolEntry]
    player2_exclusive: list[ChampionPoolEntry]
    overlap_percentage: float
