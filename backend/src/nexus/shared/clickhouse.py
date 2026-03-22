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


def close_client() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None
