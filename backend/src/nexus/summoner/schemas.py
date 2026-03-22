"""Pydantic schemas for public summoner lookup."""

from __future__ import annotations

from pydantic import BaseModel, Field


class PublicSummonerProfile(BaseModel):
    puuid: str
    summoner_id: str = ""
    game_name: str
    tag_line: str
    region: str = Field(description="Platform routing value (e.g., na1, euw1).")
    summoner_level: int
    profile_icon_id: int


class RankedEntry(BaseModel):
    queue_type: str
    tier: str
    rank: str
    league_points: int
    wins: int
    losses: int
    hot_streak: bool = False
    veteran: bool = False
    fresh_blood: bool = False
    inactive: bool = False


class RankedDataResponse(BaseModel):
    puuid: str
    summoner_id: str
    entries: list[RankedEntry]

