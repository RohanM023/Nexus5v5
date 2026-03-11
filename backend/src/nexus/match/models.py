"""Helper dataclasses for match ingestion (match data lives in ClickHouse)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass
class MatchRow:
    """Represents a single participant row for ClickHouse insertion."""

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
    win: int
    kills: int
    deaths: int
    assists: int
    cs: int
    gold_earned: int
    damage_dealt: int
    damage_taken: int
    vision_score: int
    gold_diff_timeline: str = ""

    def to_row(self) -> list:
        """Return values in ClickHouse column order."""
        return [
            self.match_id,
            self.platform_id,
            self.queue_id,
            self.game_version,
            self.game_duration,
            self.game_start,
            self.puuid,
            self.champion_id,
            self.champion_name,
            self.team_id,
            self.role,
            self.win,
            self.kills,
            self.deaths,
            self.assists,
            self.cs,
            self.gold_earned,
            self.damage_dealt,
            self.damage_taken,
            self.vision_score,
            self.gold_diff_timeline,
        ]


CLICKHOUSE_COLUMNS: list[str] = [
    "match_id",
    "platform_id",
    "queue_id",
    "game_version",
    "game_duration",
    "game_start",
    "puuid",
    "champion_id",
    "champion_name",
    "team_id",
    "role",
    "win",
    "kills",
    "deaths",
    "assists",
    "cs",
    "gold_earned",
    "damage_dealt",
    "damage_taken",
    "vision_score",
    "gold_diff_timeline",
]
