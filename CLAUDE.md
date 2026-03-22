# Nexus-5v5 — Project Reference

> **Owner**: RohanM023 | **License**: MIT
> AI-driven LoL Clash/5v5 analytics: Identity Aggregation + Draft Intelligence + Partner Widgets (Nexus-Core).

## Architecture

Modular monolith — single FastAPI app, modules under `src/nexus/`. Services: Identity, Draft Engine, Match Ingestion, Analytics, Admin, Widgets.

```
Clients (Next.js, Nexus-Core widgets, partner sites)
  → FastAPI Gateway (/api/v1/*)  [JWT RS256, rate limiting, CORS]
    → Identity | Draft | Match Ingestion | Analytics
      → PostgreSQL (users, auth, teams) | ClickHouse (matches, matrices) | Redis (cache, sessions, rate limits)
        → Riot Games API (Account-v1, Summoner-v4, Match-v5, Champion-Mastery-v4)
```

## Tech Stack

**Backend**: Python 3.12+, FastAPI 0.115+, httpx, Pydantic v2, arq (Redis-backed jobs), Polars, SQLAlchemy async, clickhouse-connect
**Frontend**: React 19, Next.js 15 (App Router), Tailwind CSS 4, Zustand, Recharts, TanStack Query
**Data**: PostgreSQL 16, ClickHouse, Redis 7
**Infra**: Docker Compose, GitHub Actions, Prometheus + Grafana, Caddy
**Tools**: uv (Python), npm (JS), Ruff (lint/fmt), mypy strict, Vitest + Playwright

## API Surface

### Auth & Identity
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/register` | No | Register (email/password) |
| POST | `/api/v1/auth/login` | No | Login → JWT + refresh |
| POST | `/api/v1/auth/refresh` | No | Refresh access token |
| POST | `/api/v1/auth/logout` | Yes | Invalidate refresh token |
| GET | `/api/v1/identity/me` | Yes | Master Profile |
| POST | `/api/v1/identity/link` | Yes | Link Riot account |
| DELETE | `/api/v1/identity/link/{id}` | Yes | Unlink account |
| POST | `/api/v1/identity/verify/{id}` | Yes | Verify via icon check |

### Match & Analytics
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/summoner/{region}/{name}/{tag}` | No | Public summoner lookup |
| POST | `/api/v1/match/ingest/{puuid}` | No | Trigger ingestion (returns job_id) |
| GET | `/api/v1/match/ingest/status/{job_id}` | No | Ingestion job status |
| GET | `/api/v1/match/history/{puuid}` | No | Paginated match history |
| GET | `/api/v1/analytics/performance-by-puuid/{puuid}` | No | Public performance stats |
| GET | `/api/v1/analytics/champion-pool-by-puuid/{puuid}` | No | Public champion pool |
| GET | `/api/v1/analytics/performance/{user_id}` | Yes | Auth'd performance stats |
| GET | `/api/v1/analytics/champion-pool/{user_id}` | Yes | Auth'd champion pool |
| GET | `/api/v1/analytics/gold-diff/{match_id}` | Yes | Gold diff timeline |

### Draft Intelligence
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/draft/analyze` | No | Stateless draft analysis (synergy/counter/comfort) |
| POST | `/api/v1/draft/session` | Yes | Create draft session |
| PUT | `/api/v1/draft/session/{id}/pick` | Yes | Register pick |
| PUT | `/api/v1/draft/session/{id}/ban` | Yes | Register ban |
| GET | `/api/v1/draft/session/{id}/scores` | Yes | Current scores |
| GET | `/api/v1/draft/suggestions/{id}` | Yes | Ranked champion suggestions |
| WS | `/api/v1/draft/live/{session_id}` | Yes | Real-time draft updates |

### Admin
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/admin/health` | Health check |
| GET | `/api/v1/admin/metrics` | Prometheus metrics |
| GET | `/api/v1/admin/riot-quota` | Riot API quota usage |
| POST | `/api/v1/admin/synergy/rebuild` | Rebuild synergy matrix |

## Scoring Formulas

### True Mastery (per champion, per user) → 0-100
```
TrueMastery = 0.25*norm(games) + 0.25*win_rate + 0.15*norm(kda)
            + 0.10*norm(cs/min) + 0.10*norm(vision) + 0.15*recency_decay
recency_decay = exp(-0.02 * days_since_last_played)
```

### Comfort → 0-100
```
Comfort = 0.7 * TrueMastery + 0.3 * RecentForm
RecentForm = wr_last_20 * (1 + norm(kda_trend))
```

### Synergy (champion pair) → 0-100
```
Synergy(A,B) = (pair_wr - (wr_A+wr_B)/2) * min(1, games_together/100)
```

### Counter (matchup) → -100 to +100
```
Counter(A vs B, role) = (matchup_wr - 0.5) * min(1, games/50) * 100
```

### Draft Composite (suggestion ranking) → 0-100
```
Composite = 0.35*Synergy + 0.35*Counter + 0.30*Comfort
```

## Conventions

### Python
- Ruff fmt + check, line length 99, mypy strict
- snake_case functions, PascalCase classes, UPPER_SNAKE constants
- All I/O async. Absolute imports from `nexus.*`
- Typed exceptions from `shared/exceptions.py`, Pydantic response models
- Cursor pagination (ClickHouse), offset pagination (PostgreSQL)

### Frontend
- Prettier + ESLint, `kebab-case.tsx` files, functional components
- Props: `interface` not `type`. Zustand (global), React Query (server)
- Tailwind utilities, `cn()` helper, no CSS modules

### Git
- Branches: `feat/E{epic}-{desc}`, `fix/E{epic}-{desc}`
- Commits: conventional — `feat(identity): add account linking`

### API
- `/api/v1/` prefix, ISO 8601 UTC timestamps, UUIDs for public IDs
- Errors: `{"error": {"code": "...", "message": "...", "details": [...]}}`
- Pagination: `{"data": [...], "pagination": {"cursor": "...", "has_more": true}}`

## Security

- Riot TOS: no de-anonymization, no harassment tools, opponents abstracted to composition-level
- Auth: JWT RS256, 15-min access / 7-day refresh, bcrypt passwords (work factor 12)
- AES-256-GCM for identity link metadata, secrets via env vars
- HTTPS (Caddy), HSTS, CSP, parameterized queries, Pydantic input validation
- Rate limiting on auth endpoints (10 req/min/IP)

## Deployment

- **Frontend**: Vercel (Next.js). Rewrites `/api/:path*` → `${BACKEND_URL}/api/v1/:path*`
- **Backend**: FastAPI (Docker). Worker: arq for background jobs
- **Databases**: PostgreSQL + ClickHouse + Redis (Docker dev, managed cloud prod)
- **Tokens**: `localStorage` keys `nexus_access_token` / `nexus_refresh_token`
- **Vercel env**: `NEXT_PUBLIC_API_URL`, `INTERNAL_API_URL`, `RIOT_API_KEY`
- **ClickHouse Cloud**: `CLICKHOUSE_SECURE=true`, port 8443, HTTPS with TLS

## Key Directories

```
backend/src/nexus/     — FastAPI modules (identity/, draft/, match/, analytics/, admin/, shared/)
backend/tests/         — unit/, integration/, load/
frontend/src/app/      — Next.js App Router pages
frontend/src/components/ — ui/, draft/, profile/, charts/, dashboard/, match/
frontend/src/lib/      — api.ts, hooks/, stores/
nexus-core/            — Partner widget library (DraftAssistant, MasterProfile, SynergyChart)
infra/                 — Docker, Grafana, Prometheus, Caddy configs
scripts/               — seed_champions.py, backfill_matches.py, generate_synergy_matrix.py
```
