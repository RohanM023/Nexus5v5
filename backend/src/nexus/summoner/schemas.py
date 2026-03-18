"""Pydantic schemas for public summoner lookup."""

from __future__ import annotations

from pydantic import BaseModel, Field


class PublicSummonerProfile(BaseModel):
    puuid: str
    game_name: str
    tag_line: str
    region: str = Field(description="Platform routing value (e.g., na1, euw1).")
    summoner_level: int
    profile_icon_id: int

