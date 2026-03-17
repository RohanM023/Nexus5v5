"""Compute synergy and counter matrices from ClickHouse match data.

Reads match participant rows, computes pairwise champion win rates for
same-team pairs (synergy) and lane-opponent pairs (counter), then writes
the results back into the synergy_matrix and counter_matrix tables.

Usage:
    python scripts/generate_synergy_matrix.py
    python scripts/generate_synergy_matrix.py --patch 14.10 --queue 420
    python scripts/generate_synergy_matrix.py --patch 14.10 --queue 700 --min-games 20

Environment variables (or .env):
    CLICKHOUSE_HOST, CLICKHOUSE_PORT, CLICKHOUSE_USER, CLICKHOUSE_PASSWORD, CLICKHOUSE_DB
"""

from __future__ import annotations

import argparse
import sys
import time

import clickhouse_connect
import structlog

log = structlog.get_logger()

DEFAULT_HOST = "localhost"
DEFAULT_PORT = 8123
DEFAULT_DB = "nexus"
DEFAULT_MIN_GAMES = 10


def get_client(
    host: str = DEFAULT_HOST,
    port: int = DEFAULT_PORT,
    db: str = DEFAULT_DB,
) -> clickhouse_connect.driver.client.Client:
    import os

    return clickhouse_connect.get_client(
        host=os.getenv("CLICKHOUSE_HOST", host),
        port=int(os.getenv("CLICKHOUSE_PORT", str(port))),
        username=os.getenv("CLICKHOUSE_USER", "default"),
        password=os.getenv("CLICKHOUSE_PASSWORD", ""),
        database=os.getenv("CLICKHOUSE_DB", db),
    )


def resolve_latest_patch(client: clickhouse_connect.driver.client.Client) -> str:
    """Return the most common game_version prefix (e.g., '14.10') in recent data."""
    result = client.query(
        """
        SELECT
            substring(game_version, 1, position(game_version, '.', position(game_version, '.') + 1) - 1) AS patch,
            count() AS cnt
        FROM matches
        WHERE game_start > now() - INTERVAL 30 DAY
        GROUP BY patch
        ORDER BY cnt DESC
        LIMIT 1
        """
    )
    if result.result_rows:
        return str(result.result_rows[0][0])
    raise RuntimeError("No match data found in the last 30 days")


def compute_synergy(
    client: clickhouse_connect.driver.client.Client,
    patch: str,
    queue_id: int,
    min_games: int,
) -> int:
    """Compute synergy matrix: win rate of champion pairs on the same team.

    Formula per CLAUDE.md:
        Synergy(A, B) = (pair_win_rate - expected_win_rate) * confidence
        expected_win_rate = (wr_A + wr_B) / 2
        confidence = min(1.0, games_together / 100)
        Output: normalized to 0-100
    """
    log.info("Computing synergy matrix", patch=patch, queue_id=queue_id, min_games=min_games)

    # Build synergy pairs via self-join on same match + same team.
    # champion_a < champion_b to avoid duplicates.
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
        -- synergy_score: normalized (pair_wr - expected_wr) * confidence → 0-100
        50.0 + (
            (countIf(m1.win = 1) / count()) -
            (
                (SELECT countIf(win = 1) / count()
                 FROM matches
                 WHERE champion_id = m1.champion_id
                   AND game_version LIKE concat(%(patch)s, '%')
                   AND queue_id = %(queue_id)s)
                +
                (SELECT countIf(win = 1) / count()
                 FROM matches
                 WHERE champion_id = m2.champion_id
                   AND game_version LIKE concat(%(patch)s, '%')
                   AND queue_id = %(queue_id)s)
            ) / 2
        ) * least(1.0, count() / 100.0) * 100.0    AS synergy_score,
        now64(3)                                     AS updated_at
    FROM matches AS m1
    INNER JOIN matches AS m2
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

    client.command(sql, parameters={"patch": patch, "queue_id": queue_id, "min_games": min_games})

    count_result = client.query(
        "SELECT count() FROM synergy_matrix WHERE patch = %(patch)s AND queue_id = %(queue_id)s",
        parameters={"patch": patch, "queue_id": queue_id},
    )
    row_count = int(count_result.result_rows[0][0]) if count_result.result_rows else 0
    log.info("Synergy matrix computed", pairs=row_count, patch=patch)
    return row_count


def compute_counter(
    client: clickhouse_connect.driver.client.Client,
    patch: str,
    queue_id: int,
    min_games: int,
) -> int:
    """Compute counter matrix: win rate of champion vs opponent in same role.

    Formula per CLAUDE.md:
        Counter(A vs B, role) = (matchup_win_rate - 0.5) * confidence * 100
        confidence = min(1.0, games / 50)
        Output: -100 to +100
    """
    log.info("Computing counter matrix", patch=patch, queue_id=queue_id, min_games=min_games)

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
        -- counter_score: (wr - 0.5) * confidence * 100
        (countIf(m1.win = 1) / count() - 0.5)
            * least(1.0, count() / 50.0) * 100.0          AS counter_score,
        now64(3)                                           AS updated_at
    FROM matches AS m1
    INNER JOIN matches AS m2
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

    client.command(sql, parameters={"patch": patch, "queue_id": queue_id, "min_games": min_games})

    count_result = client.query(
        "SELECT count() FROM counter_matrix WHERE patch = %(patch)s AND queue_id = %(queue_id)s",
        parameters={"patch": patch, "queue_id": queue_id},
    )
    row_count = int(count_result.result_rows[0][0]) if count_result.result_rows else 0
    log.info("Counter matrix computed", matchups=row_count, patch=patch)
    return row_count


def main() -> None:
    structlog.configure(
        processors=[structlog.dev.ConsoleRenderer()],
        wrapper_class=structlog.make_filtering_bound_logger(0),
    )

    parser = argparse.ArgumentParser(description="Generate synergy and counter matrices from match data.")
    parser.add_argument("--patch", default=None, help="Game patch version (e.g., '14.10'). Auto-detects if omitted.")
    parser.add_argument("--queue", type=int, default=420, help="Queue ID (420=Ranked Solo, 700=Clash). Default: 420.")
    parser.add_argument("--min-games", type=int, default=DEFAULT_MIN_GAMES, help=f"Minimum games for pair inclusion. Default: {DEFAULT_MIN_GAMES}.")
    args = parser.parse_args()

    client = get_client()

    try:
        patch = args.patch or resolve_latest_patch(client)
        log.info("Starting matrix generation", patch=patch, queue=args.queue, min_games=args.min_games)

        t0 = time.monotonic()

        synergy_count = compute_synergy(client, patch, args.queue, args.min_games)
        counter_count = compute_counter(client, patch, args.queue, args.min_games)

        elapsed = time.monotonic() - t0
        log.info(
            "Matrix generation complete",
            synergy_pairs=synergy_count,
            counter_matchups=counter_count,
            elapsed_seconds=round(elapsed, 2),
        )
    except Exception:
        log.exception("Matrix generation failed")
        sys.exit(1)
    finally:
        client.close()


if __name__ == "__main__":
    main()
