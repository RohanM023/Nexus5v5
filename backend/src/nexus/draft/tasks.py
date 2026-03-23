"""arq job function for daily synergy/counter matrix rebuild (E5-T13).

Recomputes the synergy_matrix and counter_matrix tables in ClickHouse
from recent match data. Runs as a nightly cron job after analytics refresh.
"""

from __future__ import annotations

import time
from typing import Any

import structlog
from prometheus_client import Counter, Histogram

from nexus.config import get_settings
from nexus.shared import clickhouse as ch

logger = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Prometheus metrics
# ---------------------------------------------------------------------------
MATRIX_SYNERGY_PAIRS = Counter(
    "nexus_matrix_synergy_pairs_total",
    "Total synergy pairs written during matrix rebuild",
)
MATRIX_COUNTER_MATCHUPS = Counter(
    "nexus_matrix_counter_matchups_total",
    "Total counter matchups written during matrix rebuild",
)
MATRIX_REBUILD_ERRORS = Counter(
    "nexus_matrix_rebuild_errors_total",
    "Total errors during matrix rebuild",
)
MATRIX_REBUILD_DURATION = Histogram(
    "nexus_matrix_rebuild_duration_seconds",
    "Duration of the full matrix rebuild run",
    buckets=[10, 30, 60, 120, 300, 600, 1200, 1800],
)


def _resolve_latest_patch() -> str:
    """Return the most common game_version prefix in recent data."""
    rows = ch.query(
        """
        SELECT
            substring(game_version, 1,
                position(game_version, '.', position(game_version, '.') + 1) - 1
            ) AS patch,
            count() AS cnt
        FROM matches FINAL
        WHERE game_start > now() - INTERVAL 30 DAY
        GROUP BY patch
        ORDER BY cnt DESC
        LIMIT 1
        """
    )
    if rows:
        return str(rows[0]["patch"])
    return "unknown"


def _rebuild_synergy(patch: str, queue_id: int, min_games: int) -> int:
    """Compute and insert synergy matrix rows for a given patch/queue."""
    sql = """
    INSERT INTO synergy_matrix
    SELECT
        %(patch)s                                   AS patch,
        m1.champion_id                              AS champion_a,
        m2.champion_id                              AS champion_b,
        %(queue_id)s                                AS queue_id,
        count()                                     AS games_played,
        countIf(m1.win = 1)                         AS wins,
        avg(toInt32(m1.gold_earned) - toInt32(m2.gold_earned)) AS avg_gold_diff,
        50.0 + (
            (countIf(m1.win = 1) / count()) -
            (
                (SELECT countIf(win = 1) / count()
                 FROM matches FINAL
                 WHERE champion_id = m1.champion_id
                   AND game_version LIKE concat(%(patch)s, '%')
                   AND queue_id = %(queue_id)s)
                +
                (SELECT countIf(win = 1) / count()
                 FROM matches FINAL
                 WHERE champion_id = m2.champion_id
                   AND game_version LIKE concat(%(patch)s, '%')
                   AND queue_id = %(queue_id)s)
            ) / 2
        ) * least(1.0, count() / 100.0) * 100.0    AS synergy_score,
        now64(3)                                     AS updated_at
    FROM matches FINAL AS m1
    INNER JOIN matches FINAL AS m2
        ON  m1.match_id = m2.match_id
        AND m1.team_id  = m2.team_id
        AND m1.champion_id < m2.champion_id
    WHERE m1.game_version LIKE concat(%(patch)s, '%')
      AND m1.queue_id = %(queue_id)s
      AND m2.game_version LIKE concat(%(patch)s, '%')
      AND m2.queue_id = %(queue_id)s
    GROUP BY m1.champion_id, m2.champion_id
    HAVING count() >= %(min_games)s
    """
    ch.command(sql, parameters={"patch": patch, "queue_id": queue_id, "min_games": min_games})

    count_rows = ch.query(
        "SELECT count() AS cnt FROM synergy_matrix WHERE patch = %(patch)s AND queue_id = %(queue_id)s",
        parameters={"patch": patch, "queue_id": queue_id},
    )
    return int(count_rows[0]["cnt"]) if count_rows else 0


def _rebuild_counter(patch: str, queue_id: int, min_games: int) -> int:
    """Compute and insert counter matrix rows for a given patch/queue."""
    sql = """
    INSERT INTO counter_matrix
    SELECT
        %(patch)s                                          AS patch,
        m1.champion_id                                     AS champion,
        m2.champion_id                                     AS opponent,
        m1.role                                            AS role,
        %(queue_id)s                                       AS queue_id,
        count()                                            AS games_played,
        countIf(m1.win = 1)                                AS wins,
        avg(toInt32(m1.gold_earned) - toInt32(m2.gold_earned)) AS avg_gold_diff,
        (countIf(m1.win = 1) / count() - 0.5)
            * least(1.0, count() / 50.0) * 100.0          AS counter_score,
        now64(3)                                           AS updated_at
    FROM matches FINAL AS m1
    INNER JOIN matches FINAL AS m2
        ON  m1.match_id = m2.match_id
        AND m1.team_id != m2.team_id
        AND m1.role = m2.role
        AND m1.role != ''
    WHERE m1.game_version LIKE concat(%(patch)s, '%')
      AND m1.queue_id = %(queue_id)s
      AND m2.game_version LIKE concat(%(patch)s, '%')
      AND m2.queue_id = %(queue_id)s
    GROUP BY m1.champion_id, m2.champion_id, m1.role
    HAVING count() >= %(min_games)s
    """
    ch.command(sql, parameters={"patch": patch, "queue_id": queue_id, "min_games": min_games})

    count_rows = ch.query(
        "SELECT count() AS cnt FROM counter_matrix WHERE patch = %(patch)s AND queue_id = %(queue_id)s",
        parameters={"patch": patch, "queue_id": queue_id},
    )
    return int(count_rows[0]["cnt"]) if count_rows else 0


# ---------------------------------------------------------------------------
# arq entry-point
# ---------------------------------------------------------------------------
async def run_matrix_rebuild(ctx: dict[str, Any]) -> dict[str, Any]:
    """arq cron job: rebuild synergy and counter matrices from match data.

    Scheduled nightly at 05:00 UTC (after analytics refresh at 04:00).
    Processes both Ranked Solo (420) and Clash (700) queues.
    """
    log = logger.bind(job="matrix_rebuild")
    log.info("matrix_rebuild.started")
    start = time.monotonic()

    results: dict[str, Any] = {
        "patch": "unknown",
        "queues_processed": [],
        "errors": 0,
    }

    try:
        patch = _resolve_latest_patch()
        results["patch"] = patch
        log.info("matrix_rebuild.patch_resolved", patch=patch)

        if patch == "unknown":
            log.warning("matrix_rebuild.no_recent_data")
            return results

        for queue_id, queue_name in [(420, "ranked_solo"), (700, "clash")]:
            try:
                log.info("matrix_rebuild.queue_start", queue=queue_name, queue_id=queue_id)

                settings = get_settings()
                synergy_count = _rebuild_synergy(patch, queue_id, min_games=settings.matrix_min_games)
                counter_count = _rebuild_counter(patch, queue_id, min_games=settings.matrix_min_games)

                MATRIX_SYNERGY_PAIRS.inc(synergy_count)
                MATRIX_COUNTER_MATCHUPS.inc(counter_count)

                queue_result = {
                    "queue": queue_name,
                    "queue_id": queue_id,
                    "synergy_pairs": synergy_count,
                    "counter_matchups": counter_count,
                }
                results["queues_processed"].append(queue_result)

                log.info(
                    "matrix_rebuild.queue_done",
                    queue=queue_name,
                    synergy_pairs=synergy_count,
                    counter_matchups=counter_count,
                )
            except Exception:
                results["errors"] += 1
                MATRIX_REBUILD_ERRORS.inc()
                log.exception("matrix_rebuild.queue_error", queue=queue_name)

    except Exception:
        results["errors"] += 1
        MATRIX_REBUILD_ERRORS.inc()
        log.exception("matrix_rebuild.fatal_error")
        raise

    elapsed = time.monotonic() - start
    MATRIX_REBUILD_DURATION.observe(elapsed)
    results["duration_seconds"] = round(elapsed, 2)

    log.info("matrix_rebuild.completed", **results)
    return results
