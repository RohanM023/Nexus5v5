"""ClickHouse async client wrapper."""

from __future__ import annotations

import logging
from typing import Any

import clickhouse_connect
from clickhouse_connect.driver.client import Client

from nexus.config import get_settings

logger = logging.getLogger(__name__)

_client: Client | None = None


def get_clickhouse_client() -> Client:
    global _client
    if _client is None:
        settings = get_settings()
        _client = clickhouse_connect.get_client(
            host=settings.clickhouse_host,
            port=settings.clickhouse_port,
            username=settings.clickhouse_user,
            password=settings.clickhouse_password,
            database=settings.clickhouse_db,
            secure=settings.clickhouse_secure,
            verify=settings.clickhouse_verify_tls,
        )
    return _client


def query(sql: str, parameters: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    client = get_clickhouse_client()
    result = client.query(sql, parameters=parameters)
    columns = result.column_names
    return [dict(zip(columns, row, strict=True)) for row in result.result_rows]


def insert_rows(
    table: str,
    data: list[list[Any]],
    column_names: list[str],
) -> None:
    client = get_clickhouse_client()
    client.insert(table, data, column_names=column_names)
    logger.info("Inserted %d rows into %s", len(data), table)


def command(sql: str, parameters: dict[str, Any] | None = None) -> None:
    client = get_clickhouse_client()
    client.command(sql, parameters=parameters)


def ensure_tables() -> None:
    """Create required tables if they don't exist (auto-migration)."""
    try:
        client = get_clickhouse_client()

        # Migrate matches from MergeTree → ReplacingMergeTree if needed
        try:
            rows = client.query(
                "SELECT engine FROM system.tables "
                "WHERE database = currentDatabase() AND name = 'matches'"
            )
            if rows.result_rows:
                engine = str(rows.result_rows[0][0]).strip()
                logger.info("matches table engine: %s", engine)
                if engine != "ReplacingMergeTree":
                    logger.info("Dropping matches table (engine=%s) to recreate as ReplacingMergeTree", engine)
                    client.command("DROP TABLE IF EXISTS matches")
        except Exception:
            logger.debug("Could not check matches table engine, will create if needed")

        client.command("""
            CREATE TABLE IF NOT EXISTS matches (
                match_id       String,
                platform_id    LowCardinality(String),
                queue_id       UInt16,
                game_version   LowCardinality(String),
                game_duration  UInt32,
                game_start     DateTime64(3, 'UTC'),
                puuid          String,
                champion_id    UInt16,
                champion_name  LowCardinality(String),
                team_id        UInt8,
                role           LowCardinality(String),
                win            UInt8,
                kills          UInt16,
                deaths         UInt16,
                assists        UInt16,
                cs             UInt32,
                gold_earned    UInt32,
                damage_dealt   UInt32,
                damage_taken   UInt32,
                vision_score   UInt16,
                gold_diff_timeline String,
                ingested_at    DateTime64(3, 'UTC') DEFAULT now64(3)
            )
            ENGINE = ReplacingMergeTree(ingested_at)
            PARTITION BY toYYYYMM(game_start)
            ORDER BY (match_id, puuid)
            TTL toDateTime(game_start) + INTERVAL 2 YEAR
        """)

        client.command("""
            CREATE TABLE IF NOT EXISTS synergy_matrix (
                patch          LowCardinality(String),
                champion_a     UInt16,
                champion_b     UInt16,
                queue_id       UInt16,
                games_played   UInt32,
                wins           UInt32,
                avg_gold_diff  Float32,
                synergy_score  Float32,
                updated_at     DateTime64(3, 'UTC') DEFAULT now64(3)
            )
            ENGINE = ReplacingMergeTree(updated_at)
            ORDER BY (patch, champion_a, champion_b, queue_id)
        """)

        client.command("""
            CREATE TABLE IF NOT EXISTS counter_matrix (
                patch          LowCardinality(String),
                champion       UInt16,
                opponent       UInt16,
                role           LowCardinality(String),
                queue_id       UInt16,
                games_played   UInt32,
                wins           UInt32,
                avg_gold_diff  Float32,
                counter_score  Float32,
                updated_at     DateTime64(3, 'UTC') DEFAULT now64(3)
            )
            ENGINE = ReplacingMergeTree(updated_at)
            ORDER BY (patch, champion, opponent, role, queue_id)
        """)

        # Add items column to matches table (idempotent migration)
        try:
            client.command(
                "ALTER TABLE matches ADD COLUMN IF NOT EXISTS items String DEFAULT ''"
            )
        except Exception:
            logger.debug("Could not add items column (may already exist)")

        logger.info("ClickHouse tables verified/created successfully")
    except Exception:
        logger.exception("Failed to create ClickHouse tables")


def close_client() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None
