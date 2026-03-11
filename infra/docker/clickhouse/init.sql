-- Nexus-5v5 ClickHouse schema initialization
-- Executed on first container startup

CREATE DATABASE IF NOT EXISTS nexus;

-- Match facts (denormalized for fast aggregation)
-- One row per participant per match
CREATE TABLE IF NOT EXISTS nexus.matches (
    match_id       String,
    platform_id    LowCardinality(String),
    queue_id       UInt16,
    game_version   LowCardinality(String),
    game_duration  UInt32,
    game_start     DateTime64(3, 'UTC'),

    -- Participant data
    puuid          String,
    champion_id    UInt16,
    champion_name  LowCardinality(String),
    team_id        UInt8,
    role           LowCardinality(String),
    win            UInt8,

    -- Performance metrics
    kills          UInt16,
    deaths         UInt16,
    assists        UInt16,
    cs             UInt32,
    gold_earned    UInt32,
    damage_dealt   UInt32,
    damage_taken   UInt32,
    vision_score   UInt16,

    -- Gold diff time series (JSON array, every 60s)
    gold_diff_timeline String,

    -- Ingestion metadata
    ingested_at    DateTime64(3, 'UTC') DEFAULT now64(3)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(game_start)
ORDER BY (puuid, game_start, match_id)
TTL game_start + INTERVAL 2 YEAR;

-- Precomputed Synergy Matrix (champion pair win rates)
CREATE TABLE IF NOT EXISTS nexus.synergy_matrix (
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
ORDER BY (patch, champion_a, champion_b, queue_id);

-- Precomputed Counter Matrix (champion vs champion matchup rates)
CREATE TABLE IF NOT EXISTS nexus.counter_matrix (
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
ORDER BY (patch, champion, opponent, role, queue_id);
