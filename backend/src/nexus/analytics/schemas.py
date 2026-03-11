"""Pydantic schemas for analytics responses."""

from __future__ import annotations

from pydantic import BaseModel


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


class TopChampion(BaseModel):
    champion_id: int
    champion_name: str
    games_played: int
    win_rate: float


class GoldDiffPoint(BaseModel):
    minute: int
    gold_diff: int


class GoldDiffResponse(BaseModel):
    match_id: str
    participants: list[ParticipantGoldDiff]


class ParticipantGoldDiff(BaseModel):
    puuid: str
    champion_name: str
    team_id: int
    timeline: list[GoldDiffPoint]
