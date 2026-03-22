"""Integration tests for the daily synergy/counter matrix rebuild job (E5-T13)."""

from __future__ import annotations

from typing import Any
from unittest.mock import patch

import pytest


@pytest.mark.asyncio
async def test_matrix_rebuild_success() -> None:
    """Verify run_matrix_rebuild processes both queues and returns counts."""
    command_calls: list[str] = []

    def fake_command(sql: str, parameters: Any = None) -> None:
        command_calls.append(sql[:30])

    def fake_query(sql: str, parameters: Any = None) -> list[dict[str, Any]]:
        # _resolve_latest_patch
        if "GROUP BY patch" in sql:
            return [{"patch": "14.10"}]
        # count queries for synergy/counter
        if "count()" in sql:
            return [{"cnt": 42}]
        return []

    with (
        patch("nexus.draft.tasks.ch.command", side_effect=fake_command),
        patch("nexus.draft.tasks.ch.query", side_effect=fake_query),
    ):
        from nexus.draft.tasks import run_matrix_rebuild

        result = await run_matrix_rebuild({})

    assert result["patch"] == "14.10"
    assert len(result["queues_processed"]) == 2  # ranked_solo + clash
    assert result["errors"] == 0

    # Verify synergy and counter inserts for each queue (2 queues × 2 matrices = 4 INSERT calls)
    assert len(command_calls) == 4

    # Each queue result should have counts
    for qr in result["queues_processed"]:
        assert qr["synergy_pairs"] == 42
        assert qr["counter_matchups"] == 42


@pytest.mark.asyncio
async def test_matrix_rebuild_unknown_patch() -> None:
    """Verify graceful return when no recent data exists."""

    def fake_query(sql: str, parameters: Any = None) -> list[dict[str, Any]]:
        return []  # No rows → unknown patch

    with (
        patch("nexus.draft.tasks.ch.command"),
        patch("nexus.draft.tasks.ch.query", side_effect=fake_query),
    ):
        from nexus.draft.tasks import run_matrix_rebuild

        result = await run_matrix_rebuild({})

    assert result["patch"] == "unknown"
    assert len(result["queues_processed"]) == 0
    assert result["errors"] == 0


@pytest.mark.asyncio
async def test_matrix_rebuild_empty_match_data() -> None:
    """Verify no inserts when matches exist but produce no matrix rows."""

    def fake_query(sql: str, parameters: Any = None) -> list[dict[str, Any]]:
        if "GROUP BY patch" in sql:
            return [{"patch": "14.10"}]
        # Count query returns 0 rows for matrix
        if "count()" in sql:
            return [{"cnt": 0}]
        return []

    with (
        patch("nexus.draft.tasks.ch.command"),
        patch("nexus.draft.tasks.ch.query", side_effect=fake_query),
    ):
        from nexus.draft.tasks import run_matrix_rebuild

        result = await run_matrix_rebuild({})

    assert result["patch"] == "14.10"
    assert len(result["queues_processed"]) == 2
    for qr in result["queues_processed"]:
        assert qr["synergy_pairs"] == 0
        assert qr["counter_matchups"] == 0


@pytest.mark.asyncio
async def test_matrix_rebuild_queue_error_isolation() -> None:
    """Verify one queue failing doesn't stop the other."""
    call_count = 0

    def failing_command(sql: str, parameters: Any = None) -> None:
        nonlocal call_count
        call_count += 1
        # Fail on the first command (ranked_solo synergy)
        if call_count == 1:
            raise RuntimeError("Simulated CH error")

    def fake_query(sql: str, parameters: Any = None) -> list[dict[str, Any]]:
        if "GROUP BY patch" in sql:
            return [{"patch": "14.10"}]
        if "count()" in sql:
            return [{"cnt": 10}]
        return []

    with (
        patch("nexus.draft.tasks.ch.command", side_effect=failing_command),
        patch("nexus.draft.tasks.ch.query", side_effect=fake_query),
    ):
        from nexus.draft.tasks import run_matrix_rebuild

        result = await run_matrix_rebuild({})

    # First queue fails, second should succeed
    assert result["errors"] == 1
    assert len(result["queues_processed"]) == 1
