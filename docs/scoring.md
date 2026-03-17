# Nexus-5v5 Scoring Formulas

This document details every scoring formula used in the Nexus-5v5 Draft Intelligence Engine and Analytics modules. All scores are deterministic given the same inputs and are designed to be **explainable** — every composite score returns a breakdown so users understand recommendations.

---

## Table of Contents

1. [True Mastery Score](#1-true-mastery-score)
2. [Comfort Score](#2-comfort-score)
3. [Synergy Score](#3-synergy-score)
4. [Counter Score](#4-counter-score)
5. [Draft Composite Score](#5-draft-composite-score)
6. [Model Governance](#6-model-governance)
7. [Data Sources & Caching](#7-data-sources--caching)

---

## 1. True Mastery Score

**Purpose**: Measure a player's real proficiency on a champion, going beyond Riot's built-in mastery points by incorporating performance metrics and recency.

**Scope**: Per champion, per user (aggregated across all linked PUUIDs).

### Formula

```
TrueMastery = w1 * norm(games_played)
            + w2 * win_rate
            + w3 * norm(avg_kda)
            + w4 * norm(avg_cs_per_min)
            + w5 * norm(avg_vision_score)
            + w6 * recency_decay(last_played)
```

### Weights

| Weight | Component | Default | Description |
|--------|-----------|---------|-------------|
| w1 | Games Played | 0.25 | Volume of experience |
| w2 | Win Rate | 0.25 | Outcome effectiveness |
| w3 | Average KDA | 0.15 | Kill participation and survival |
| w4 | Average CS/min | 0.10 | Farming efficiency |
| w5 | Average Vision Score | 0.10 | Map awareness contribution |
| w6 | Recency Decay | 0.15 | How recently the champion was played |

### Normalization

All raw metrics are **min-max normalized within the player's own champion pool**:

```
norm(x) = (x - min_pool) / (max_pool - min_pool)
```

- If `max_pool == min_pool`, the normalized value is `0.5` (avoid division by zero).
- This means scores are *relative to the player's own performance*, not a global benchmark.

### Recency Decay

```
recency_decay(last_played) = exp(-lambda * days_since_last_played)

lambda = 0.02 (default)
```

| Days Since Last Played | Decay Factor |
|------------------------|-------------|
| 0 (today) | 1.000 |
| 7 | 0.869 |
| 14 | 0.756 |
| 30 | 0.549 |
| 60 | 0.301 |
| 90 | 0.165 |

### Output

- **Range**: 0 to 100
- **Interpretation**: Higher = stronger proficiency on that champion relative to the player's pool.

### Data Source

Queried from ClickHouse `matches` table, filtered by user's linked PUUIDs. Optionally filtered by patch and queue type.

---

## 2. Comfort Score

**Purpose**: Combine long-term mastery with recent form to determine how "comfortable" a player is on a champion *right now*.

**Scope**: Per player, per champion.

### Formula

```
Comfort = 0.7 * TrueMastery + 0.3 * RecentForm
```

### Recent Form

```
RecentForm = win_rate_last_20_games * (1 + norm(kda_trend))
```

- `win_rate_last_20_games`: Win rate from the player's last 20 games on that champion.
- `kda_trend`: Direction of KDA over recent games (positive = improving). Normalized to [0, 1].
- If fewer than 20 games exist, all available games are used.

### Output

- **Range**: 0 to 100
- **Interpretation**: High Comfort = the player is both historically strong and currently in form on this champion.

### Caching

Comfort scores are cached in Redis with a 1-hour TTL:
```
score:comfort:{puuid}:{champion_id} → Float  TTL 1h
```

Recomputed nightly by the analytics refresh batch job (04:00 UTC).

---

## 3. Synergy Score

**Purpose**: Quantify how well two champions perform together on the same team, beyond what their individual win rates would predict.

**Scope**: Per champion pair, parameterized by patch and queue.

### Formula

```
Synergy(A, B) = (pair_win_rate - expected_win_rate) * confidence_factor

expected_win_rate = (wr_A + wr_B) / 2
confidence_factor = min(1.0, games_together / 100)
```

### Components

| Component | Description |
|-----------|-------------|
| `pair_win_rate` | Observed win rate when champions A and B are on the same team |
| `expected_win_rate` | Baseline: average of each champion's independent win rate |
| `confidence_factor` | Scales the score down when sample size is small (< 100 games) |

### Output

- **Range**: Normalized to 0-100 after computation
- **Interpretation**: Higher = the pair performs better together than expected. A score near 50 means they perform as expected; above 50 means positive synergy.

### Team Synergy (Aggregate)

For a team of N champions, the aggregate synergy is:

```
TeamSynergy = average of all pairwise Synergy(A, B) for unique pairs
```

For a 5-champion team, there are C(5,2) = 10 unique pairs.

### Data Source

Precomputed from ClickHouse `matches` table and stored in the `synergy_matrix` table. Rebuilt nightly at 05:00 UTC.

### Caching

```
score:synergy:{patch}:{champA}:{champB} → Float  TTL 6h
```

---

## 4. Counter Score

**Purpose**: Quantify how well a champion performs against a specific opponent in the same role.

**Scope**: Per champion matchup, role-aware, parameterized by patch and queue.

### Formula

```
Counter(A vs B, role) = (matchup_win_rate - 0.5) * confidence_factor * 100

confidence_factor = min(1.0, games_in_matchup / 50)
```

### Components

| Component | Description |
|-----------|-------------|
| `matchup_win_rate` | Win rate of champion A when facing champion B in the same role |
| `0.5` | Neutral baseline (50% win rate = no advantage) |
| `confidence_factor` | Scales score down when fewer than 50 games in the matchup |

### Output

- **Range**: -100 to +100
- **Interpretation**:
  - Positive = champion A counters champion B
  - Negative = champion A is countered by champion B
  - Near 0 = neutral matchup

### Counter Advantage (Aggregate)

For team A vs team B:

```
CounterAdvantage = average of Counter(A_i vs B_i, role_i) for each role
```

Role matching: TOP vs TOP, JUNGLE vs JUNGLE, MID vs MID, BOT vs BOT, SUPPORT vs SUPPORT.

### Data Source

Precomputed from ClickHouse `matches` table and stored in the `counter_matrix` table. Rebuilt nightly at 05:00 UTC.

### Caching

```
score:counter:{patch}:{champ}:{opponent} → Float  TTL 6h
```

---

## 5. Draft Composite Score

**Purpose**: Rank all available champions for a player during champion select, combining team synergy, counter advantage, and personal comfort.

**Scope**: Per available champion, given the current draft state and player.

### Formula

```
CompositeScore(champion, draft_state, player) =
    alpha * TeamSynergy(champion, allies)
  + beta  * CounterAdvantage(champion, opponents)
  + gamma * Comfort(player, champion)
```

### Weights

| Weight | Component | Default | Description |
|--------|-----------|---------|-------------|
| alpha | Team Synergy | 0.35 | How well the pick synergizes with allied picks |
| beta | Counter Advantage | 0.35 | How well the pick counters enemy picks |
| gamma | Comfort | 0.30 | How comfortable the player is on the champion |

### Calculation Details

1. **TeamSynergy(champion, allies)**: Average pairwise synergy between the candidate champion and all already-picked allied champions.
2. **CounterAdvantage(champion, opponents)**: Counter score of the candidate against the opposing champion in the same role (if known), or average across all revealed opponents.
3. **Comfort(player, champion)**: The player's Comfort score for the candidate champion.

### Output

- **Range**: 0 to 100
- **Used by**: `GET /api/v1/draft/suggestions/{id}` — returns top 10 champions ranked by CompositeScore with full breakdown.

### Score Snapshots

Every time a pick or ban is registered, a `score_snapshot` is saved to PostgreSQL with:
- `total_score`, `synergy_score`, `counter_score`, `comfort_score`
- `recommended_picks` (top N suggestions with breakdowns)
- `recommended_bans` (top N ban suggestions)
- The scoring configuration version used

---

## 6. Model Governance

### Versioning

Each scoring configuration (alpha, beta, gamma, component weights w1-w6) is assigned a **version ID**. This version is stored in every `score_snapshot` record, enabling:

- Historical analysis of how scoring changes affect recommendations
- Rollback to previous configurations
- A/B testing of scoring variants

### Configurability

All weights are configurable via:
- Environment variables (for deployment-level overrides)
- Admin API endpoint (for runtime tuning)
- Default values hardcoded as fallback

### Explainability

Every score returned by the API includes a **breakdown**:

```json
{
  "champion_id": 266,
  "champion_name": "Aatrox",
  "composite_score": 78.5,
  "breakdown": {
    "synergy": {
      "score": 72.0,
      "weight": 0.35,
      "contribution": 25.2
    },
    "counter": {
      "score": 85.0,
      "weight": 0.35,
      "contribution": 29.75
    },
    "comfort": {
      "score": 78.5,
      "weight": 0.30,
      "contribution": 23.55
    }
  }
}
```

### Future: A/B Testing

The design supports assigning users to scoring variant groups. Each group uses different weight configurations, and outcomes (draft win rates) are tracked to evaluate which configuration performs best.

---

## 7. Data Sources & Caching

### Data Flow

```
Riot Match-v5 API
    → Match Ingestion Worker (ETL)
    → ClickHouse matches table
    → Nightly batch jobs (04:00-05:00 UTC)
        → True Mastery / Comfort scores → Redis cache
        → Synergy Matrix → ClickHouse synergy_matrix → Redis cache
        → Counter Matrix → ClickHouse counter_matrix → Redis cache
    → Draft Engine reads from Redis (hot path)
    → Falls back to ClickHouse on cache miss
```

### Cache TTLs

| Key Pattern | TTL | Rationale |
|-------------|-----|-----------|
| `score:comfort:{puuid}:{champion_id}` | 1 hour | Personal stats change with each game |
| `score:synergy:{patch}:{champA}:{champB}` | 6 hours | Matrix rebuilt nightly; 6h keeps data fresh within a day |
| `score:counter:{patch}:{champ}:{opponent}` | 6 hours | Same as synergy |

### Batch Job Schedule

| Job | Time (UTC) | Description |
|-----|-----------|-------------|
| Analytics Refresh | 04:00 | Recompute True Mastery and Comfort for all active users |
| Matrix Rebuild | 05:00 | Rebuild synergy and counter matrices from latest match data |

### Confidence Thresholds

When data is sparse (e.g., new patch, niche champion pair):

- **Synergy**: Falls back to previous patch data if current patch has < 1000 games for the pair
- **Counter**: Falls back to broader queue data (all ranked) if Clash-specific data is thin
- **Comfort**: Uses all available games if fewer than 20 exist for recent form
