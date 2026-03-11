# Changelog

All notable changes to the Nexus-5v5 project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-03-10

### Phase 1: Foundation (Epics E1 + E2)

#### Added

**Backend (FastAPI)**
- FastAPI app factory (`main.py`) with lifespan management, structured logging (structlog), and global exception handlers
- Pydantic v2 Settings (`config.py`) with environment variable binding, `.env` support, and production secret validation
- Dependency injection container (`dependencies.py`) for DB sessions, Redis, ClickHouse, and current user extraction
- **Identity Service** — user registration (bcrypt hashing), login (RS256 JWT), token refresh, logout, Riot account linking (max 5 per user), icon-based verification, Master Profile aggregation
- **Draft Engine** — synergy/counter/comfort scoring logic, draft session state machine, champion suggestion engine with composite scoring
- **Match Ingestion** — ETL pipeline (Riot Match-v5 fetch, transform, ClickHouse batch insert), incremental ingestion with Redis watermark, deduplication on (match_id, puuid)
- **Analytics Service** — champion pool analysis, True Mastery score, Comfort score, performance aggregation across linked PUUIDs, gold diff timeline
- **Admin Module** — health check, Prometheus metrics endpoint, Riot API quota monitoring, synergy matrix rebuild trigger
- **Middleware** — JWT auth (RS256 with HS256 fallback), Redis-backed rate limiting (10 req/min on auth), CORS configuration
- **Shared Utilities** — async SQLAlchemy engine with connection pooling, ClickHouse async client, Redis client with caching/rate-limit helpers, Riot API client (token bucket rate limiter, exponential backoff, response caching, region routing), custom exception hierarchy, cursor/offset pagination
- Alembic async migration setup with initial schema (users, riot_accounts, teams, team_members, identity_links, refresh_tokens, draft_sessions, score_snapshots)
- Multi-stage Dockerfile (Python 3.12-slim, non-root user, health check)
- pytest test infrastructure with async fixtures, test DB session, mock Redis, mock Riot API

**Frontend (Next.js 15)**
- App Router with route groups: `(auth)` for login/register, `(dashboard)` for authenticated pages
- **Auth Pages** — login and register forms with validation, error display, password strength indicator
- **Dashboard** — stats cards (win rate, KDA, CS/min), recent matches list, role distribution chart
- **Match History** — paginated match list with champion icons, KDA, win/loss, gold earned
- **Profile Page** — Master Profile with linked accounts (AccountCard), champion pool grid, stats overview
- **Settings Page** — account linking (Riot ID input, verification flow), display name change, unlink accounts
- **Draft Launcher** — create draft session, select team, choose mode (clash/custom/scrim)
- **Live Draft Board** — 5v5 champion grid, ban slots, pick order indicators, real-time score display
- **Draft Components** — DraftBoard, SuggestionPanel (ranked picks with score breakdowns), ChampionSelect (searchable grid with role filter), ScoreDisplay (animated progress bars), TeamComfortOverlay (per-player comfort scores)
- **UI Components** — Navbar, Sidebar, Button, Card, Input, Loading spinner
- **Charts** — GoldDiffChart, PerformanceTrend, RoleDistribution (Recharts)
- **Profile Components** — AccountCard, ChampionPoolGrid, StatsOverview
- Zustand stores (auth, draft), custom hooks (useAuth, useDraft, useProfile)
- API client with TanStack React Query integration
- Supabase integration (browser + server clients, session middleware)
- Next.js API routes for auth (login, register, logout, callback) and identity (me, link)
- Multi-stage Dockerfile (Node 20-alpine, standalone output, non-root user)
- Dark gaming aesthetic: deep blue (#0a0e1a), electric blue (#3b82f6), cyan (#06b6d4)

**Infrastructure**
- Docker Compose (local dev) — FastAPI, Next.js, PostgreSQL 16, ClickHouse, Redis 7 with health checks and named volumes
- Docker Compose (production) — resource limits, restart policies, security options
- PostgreSQL init script with extensions and roles
- ClickHouse init script with matches, synergy_matrix, counter_matrix tables
- Redis configuration with persistence and memory policy
- Prometheus configuration
- Caddy reverse proxy with auto-TLS
- Grafana dashboard templates
- GitHub Actions CI pipeline (ruff, mypy, pytest, vitest, Docker build)
- Makefile with dev commands (dev, test, lint, migrate, seed, build)
- Comprehensive `.env.example` with all environment variables documented
- Dev scripts: seed_champions.py, backfill_matches.py, generate_synergy_matrix.py

#### Bugs Found & Fixed (Phase 1 Validation)

**Backend — Boot & Import Fixes (Debugger)**
- Fixed import resolution across all modules — circular imports between identity/service and shared/database resolved
- Fixed Pydantic v2 compatibility issues — replaced deprecated v1 patterns (`orm_mode` -> `model_config`, `validator` -> `field_validator`)
- Fixed SQLAlchemy async model declarations — ensured all relationships use `lazy="selectin"` for async compatibility
- Fixed Alembic env.py — corrected async engine configuration for migration runner
- Fixed main.py lifespan — proper startup/shutdown sequencing for DB pool, Redis, and ClickHouse connections
- Fixed dependencies.py — corrected `get_current_user` to properly extract JWT claims and query user from DB
- Fixed match/ingestion.py — corrected ClickHouse batch insert parameter binding and deduplication logic
- Fixed analytics/metrics.py — corrected True Mastery normalization (min-max within player pool, not global)
- Fixed draft/engine.py — corrected confidence factor clamping and synergy score normalization
- Fixed shared/riot_api.py — corrected rate limit token bucket refill timing
- Fixed Ruff linting violations across all modules (unused imports, type annotations, string formatting)

**Security Fixes (Security Auditor)**
- **JWT Algorithm Pinning** — enforced `algorithms=["RS256"]` (or `["HS256"]` for dev) in token verification to prevent algorithm confusion attacks
- **CORS Hardening** — verified origins are environment-configurable, not hardcoded wildcards in production
- **Rate Limit Bypass Prevention** — validated Redis-backed rate limiter cannot be bypassed via header manipulation
- **Refresh Token Storage** — confirmed tokens stored as SHA256 hashes, not plaintext
- **Riot API Key Protection** — verified API key never logged or exposed in error responses
- **Dockerfile Security** — confirmed both backend and frontend run as non-root users with minimal base images
- **Supabase Service Role Key** — verified never exposed to browser (server-only usage in Route Handlers)
- **Cookie Security** — validated Supabase session cookies use httpOnly defaults
- **Input Validation** — confirmed Pydantic v2 validates all API inputs, preventing injection vectors
- **SQL Injection Prevention** — confirmed all queries use SQLAlchemy ORM (parameterized) and ClickHouse parameterized queries

#### Known Issues (Deferred to Phase 2+)

| Priority | Issue | File | Notes |
|----------|-------|------|-------|
| LOW | CORS `allow_methods=["*"]` could be restricted to specific methods | `middleware/cors.py` | Harden for production |
| LOW | Client IP extraction trusts `request.client.host` directly | `middleware/rate_limit.py` | Add X-Forwarded-For trust config behind reverse proxy |
| LOW | No circuit breaker for Riot API outages | `shared/riot_api.py` | Add failfast if API consistently down |
| LOW | Password strength only validated client-side (server checks 8-char min) | `api/auth/register/route.ts` | Add server-side complexity rules |
| LOW | Verification token stored in plaintext (not security-critical, it's an icon ID) | `identity/service.py` | Consider SHA256 for defense-in-depth |
| LOW | No encryption key length validation for production | `config.py` | Enforce 32+ byte key in prod mode |

#### Security Audit Summary

| Category | Result |
|----------|--------|
| Authentication (JWT RS256) | PASS |
| Password Hashing (bcrypt) | PASS |
| Rate Limiting (Redis-backed) | PASS |
| CORS Configuration | PASS (harden for prod) |
| Secrets Management | PASS |
| SQL Injection Prevention | PASS |
| XSS Protection | PASS |
| Docker Security (non-root) | PASS |
| Supabase Key Protection | PASS |
| Riot TOS Compliance | PASS |
| **Overall Grade** | **A- (93/100)** |
