# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Public summoner lookup page at `/summoner/{region}/{gameName}/{tagLine}` — view any player's stats, champion pool, and match history without signing in
- Summoner search bar on landing page hero (accepts "GameName#TAG" format with region selector)
- Compact search bar in navbar for quick summoner lookups from any page
- API client methods for public summoner lookup: `lookupSummoner()`, `getSummonerChampionPool()`, `getSummonerPerformance()`, `getSummonerMatches()`
- `PublicSummonerProfile` TypeScript type for public summoner data

### Changed
- **UX overhaul**: App no longer requires sign-in to use core features (similar to u.gg/op.gg)
- Landing page CTA is now a summoner search instead of "Sign In / Register"
- Navbar always shows "Search" and "Draft" links for all users; "Dashboard" and "Profile" only for authenticated users
- Dashboard, Match History, Profile, and Draft pages no longer gate behind auth — show friendly prompts with search suggestions for unauthenticated users
- Draft assistant works without auth (sessions won't be saved and comfort scores won't be personalized)

## [0.2.0] - 2026-03-13

### Added

#### Match Ingestion Pipeline (Epic 3)
- Match ingestion pipeline with Riot API integration for fetching match history, transforming data, and batch inserting to ClickHouse (E3-T01, E3-T02, E3-T03)
- Ingestion trigger endpoint `POST /api/v1/match/ingest/{puuid}` with job queuing via arq (E3-T04)
- Background ingestion worker using arq with `run_ingest_matches` job function, retry logic, and dead-letter queue for failed jobs (E3-T05)
- Incremental ingestion with Redis watermark tracking to fetch only new matches (E3-T06)
- Match history endpoint `GET /api/v1/match/history/{puuid}` with cursor-based pagination, filters for queue type, champion, and date range (E3-T07)
- Champion static data seeding script at `scripts/seed_champions.py` integrating DDragon API with Redis caching (E3-T08)

#### Analytics & True Mastery (Epic 4)
- Analytics service with champion pool analysis, True Mastery scoring algorithm, Comfort scoring, and performance aggregation across linked accounts (E4-T01, E4-T02, E4-T03)
- Analytics endpoint `GET /api/v1/analytics/champion-pool/{user_id}` with sortable champion pool data and role filtering (E4-T04, E4-T05)
- Analytics endpoint `GET /api/v1/analytics/performance/{user_id}` for aggregated performance statistics (E4-T04)
- Analytics endpoint `GET /api/v1/analytics/gold-diff/{match_id}` for minute-by-minute gold differential timeline (E4-T06)
- Nightly batch analytics refresh cron job scheduled at 04:00 UTC via arq background worker (`analytics/tasks.py`) (E4-T10)

#### Observability & Monitoring (Epic 7)
- Prometheus metrics for ingestion pipeline:
  - `nexus_matches_fetched_total` - Total matches fetched from Riot API
  - `nexus_matches_inserted_total` - Total matches inserted to ClickHouse
  - `nexus_api_errors_total` - Riot API error counter by error type
  - `nexus_ingestion_duration_seconds` - Histogram of ingestion job duration
  - `nexus_riot_api_rate_limit_remaining` - Current Riot API rate limit headroom (E3-T09)
- Grafana dashboard for ingestion monitoring with 8 panels covering throughput, errors, latency, and rate limits at `infra/grafana/dashboards/ingestion-pipeline.json` (E3-T09)

#### Frontend (Match History & Analytics)
- Match history page at `/dashboard/matches` with infinite scroll using TanStack Query `useInfiniteQuery` (E3-T10)
- Champion search autocomplete with icon display (E3-T10)
- Date range picker for filtering match history (E3-T10)
- Queue type filter (Clash, Ranked Solo/Duo, Normal Draft, etc.) (E3-T10)
- Reusable `use-match-history.ts` hook for match data fetching (E3-T10)
- Champion pool grid component with mastery bars, comfort scores, and tier indicators (S/A/B/C) (E4-T07)
- Stats overview component with win rate, KDA, CS/min statistics (E4-T08)
- Performance trend line chart with recent form visualization (E4-T08)
- Gold differential timeline chart using Recharts with interactive hover tooltips (E4-T09)
- Role distribution pie chart for champion pool analysis (E4-T08)

### Fixed

#### Security
- **Critical**: SQL injection vulnerability in analytics service - all ClickHouse queries now use parameterized queries instead of string interpolation
- **Critical**: Event loop blocking in analytics service - migrated synchronous ClickHouse `ch.query()` calls to `asyncio.run_in_executor()` for non-blocking execution

#### Backend Bugs
- Division-by-zero crash in CS/min calculation for remakes (game_duration = 0) - added `greatest(game_duration, 1)` guard in SQL
- Auth hook API naming mismatch - login/register/navbar pages incorrectly used `login()`/`register()`/`logout()` but the hook exports `signIn()`/`signUp()`/`signOut()` - standardized to hook naming
- Auth store `initialize()` method returned unsubscribe function instead of `Promise<void>` - removed erroneous return statement
- Unused `tier` variable in `analytics/tasks.py` triggering Ruff F841 lint error
- Unused `Any` import in `dependencies.py` triggering Ruff F401 lint error

#### Frontend Bugs
- Recharts tooltip formatter type errors - removed explicit `number` parameter types, used `Number(value)` cast for type safety
- Missing fields in `MatchSummary` TypeScript type - added `platform_id`, `game_version`, `team_id`, `damage_taken`, `puuid` to match backend schema
- API client return type mismatch for match history endpoint - fixed to match backend pagination response structure

#### Infrastructure
- ClickHouse TTL expression error - `DateTime64` type not supported in TTL clause, changed to `toDateTime(game_start) + INTERVAL 2 YEAR`
- ClickHouse health check failing on macOS Docker - `localhost` resolves to IPv6 `::1` but ClickHouse binds to IPv4, changed to `127.0.0.1`
- Pydantic Settings v2 CORS parsing error - comma-separated `CORS_ORIGINS` env var fails JSON parse for `list[str]`, refactored to `cors_origins_str: str` with `@property` getter
- Settings `environment` field validation error - added `"development"` to allowed Literal values (`"local" | "development" | "staging" | "production"`)
- Docker build context bloat (160MB+) - added comprehensive `.dockerignore` files for frontend and backend to exclude `node_modules/`, `.next/`, `__pycache__/`, `.pytest_cache/`, etc.
- 5 Python files auto-formatted by Ruff for style compliance

### Changed
- Bumped project version from 0.1.0 to 0.2.0
- Analytics champion pool endpoint now supports `sort_by` parameter (games/wins/mastery/comfort) and `role` filter
- Analytics endpoints now use proper Pydantic response models for type safety and OpenAPI documentation

## [0.1.0] - 2026-03-07

### Added

#### Project Bootstrap & Infrastructure (Epic 1)
- Monorepo structure with `backend/`, `frontend/`, `infra/`, `scripts/`, `docs/` directories (E1-T01, E1-T02)
- FastAPI backend with app factory pattern in `src/nexus/main.py` and health check endpoint (E1-T01)
- Pydantic Settings-based configuration management in `config.py` with `.env.example` template (E1-T08)
- Next.js 15 frontend with App Router, React 19, Tailwind CSS 4, Zustand for state, Recharts for visualizations (E1-T02)
- Docker Compose development environment orchestrating FastAPI, Next.js, PostgreSQL 16, ClickHouse, Redis 7 (E1-T03)
- Alembic migration system with initial migration creating core schema (E1-T04)
- Structured JSON logging with `structlog` library and global exception handlers (E1-T11)
- Shared Riot API client with token bucket rate limiting, exponential backoff retries, and region routing (E1-T07)
- Database connection management with SQLAlchemy async engine and session factory (E1-T12)
- ClickHouse async client with connection pooling (E1-T12)
- Redis client wrapper with connection pooling (E1-T06)
- CI pipeline with GitHub Actions running Ruff, mypy, pytest, vitest, and Docker build checks (E1-T09)
- Makefile with common development commands: `make dev`, `make test`, `make lint`, `make migrate`, `make build` (E1-T10)
- Custom exception classes in `shared/exceptions.py` with FastAPI global exception handlers (E1-T11)

#### Database Schemas (Epic 1)
- PostgreSQL schema (E1-T04):
  - `users` - User accounts with bcrypt password hashing
  - `riot_accounts` - Linked Riot PUUIDs with verification status
  - `teams` - Clash team rosters
  - `team_members` - Team membership with role assignments
  - `identity_links` - Identity verification audit trail
  - `refresh_tokens` - JWT refresh token management
  - `draft_sessions` - Draft state tracking
  - `score_snapshots` - Historical draft scoring data
- ClickHouse schema (E1-T05):
  - `matches` - Denormalized match participant data with 2-year TTL, partitioned by month
  - `synergy_matrix` - Precomputed champion pair win rates
  - `counter_matrix` - Precomputed champion vs champion matchup data
- Redis key patterns for caching Riot API responses, scores, rate limits, sessions (documented in CLAUDE.md)

#### Identity & Authentication (Epic 2)
- User registration endpoint `POST /api/v1/auth/register` with email/password validation and bcrypt hashing (E2-T01)
- Login endpoint `POST /api/v1/auth/login` issuing RS256 JWT access tokens (15min) and refresh tokens (7 days) (E2-T02)
- Token refresh endpoint `POST /api/v1/auth/refresh` and logout endpoint `POST /api/v1/auth/logout` (E2-T03)
- JWT authentication middleware with Bearer token verification and user injection into request state (E2-T04)
- Riot account linking endpoint `POST /api/v1/identity/link` with Riot Account-v1 API integration (E2-T05)
- Icon-based account verification endpoint `POST /api/v1/identity/verify/{account_id}` using Summoner-v4 API (E2-T06)
- Master Profile endpoint `GET /api/v1/identity/me` aggregating data across all linked Riot accounts (E2-T07)
- Account unlinking endpoint `DELETE /api/v1/identity/link/{account_id}` with safeguards against removing the last verified account (E2-T08)
- SQLAlchemy models for `User`, `RiotAccount`, `RefreshToken` with proper relationships and constraints (E2-T09)

#### Frontend Pages & Components (Epic 2)
- Landing page with product overview and call-to-action (E2-T10)
- Registration page at `/register` with form validation and error handling (E2-T10)
- Login page at `/login` with JWT cookie storage via Next.js API route (E2-T10)
- Dashboard layout with responsive sidebar navigation and user navbar (E2-T10)
- Settings page with Riot account linking flow, verification instructions, and status display (E2-T11)
- Master Profile page at `/profile` showing all linked accounts, combined statistics, and champion pool grid (E2-T12)
- Draft launcher page at `/dashboard/draft` with game mode selection (Clash, Custom 5v5, Scrim)
- Zustand store for authentication state management
- Custom React hooks for auth (`use-auth.ts`)

#### Documentation
- Comprehensive master project document `CLAUDE.md` with architecture, data models, API surface, epics, conventions, security, scaling, and GTM strategy
- `.env.example` with all required environment variables documented

### Changed
- Project initialized at version 0.1.0

## [0.0.1] - 2026-03-06

### Added
- Initial commit with MIT LICENSE
- `.gitignore` configured for Python, Node.js, Docker, and IDE files

---

[Unreleased]: https://github.com/RohanM023/Nexus5v5/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/RohanM023/Nexus5v5/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/RohanM023/Nexus5v5/compare/v0.0.1...v0.1.0
[0.0.1]: https://github.com/RohanM023/Nexus5v5/releases/tag/v0.0.1
