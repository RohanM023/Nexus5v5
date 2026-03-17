# Nexus-5v5 Deployment Guide

This document covers deploying Nexus-5v5 to production using **Vercel** (frontend) and **Supabase** (database + auth).

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Supabase Setup](#3-supabase-setup)
4. [Vercel Setup](#4-vercel-setup)
5. [Environment Variables](#5-environment-variables)
6. [CI/CD Pipeline](#6-cicd-pipeline)
7. [Local Development](#7-local-development)
8. [Monitoring & Observability](#8-monitoring--observability)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Architecture Overview

```
                    ┌──────────────┐
                    │   Vercel     │
                    │  (Next.js)   │
                    │  SSR + Edge  │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
     ┌────────────┐ ┌───────────┐ ┌──────────┐
     │  Supabase  │ │ Riot API  │ │  Redis   │
     │  Postgres  │ │ (Match,   │ │  (Cache) │
     │  + Auth    │ │  Account) │ │          │
     └────────────┘ └───────────┘ └──────────┘
```

| Component | Service | Purpose |
|-----------|---------|---------|
| Frontend + Server Logic | Vercel | Next.js SSR, API Routes, Edge Functions |
| Database | Supabase PostgreSQL | Users, teams, identity links, draft sessions |
| Auth | Supabase Auth | User registration, login, JWT tokens |
| External API | Riot Games API | Match data, account info, champion mastery |
| Cache | Redis (Upstash or self-hosted) | API response caching, rate limit counters |

---

## 2. Prerequisites

- **GitHub account** with repository access
- **Vercel account** (free tier sufficient for staging)
- **Supabase account** (free tier: 500MB database, 50K auth users)
- **Riot Games API key** (development or production tier)
- **Node.js 20+** and **npm/pnpm** for local builds

---

## 3. Supabase Setup

### 3.1 Create Project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Choose a region close to your users (e.g., `us-east-1` for NA players).
3. Set a strong database password — save it securely.

### 3.2 Database Schema

Run the following SQL in the Supabase SQL Editor (or apply via migrations):

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Apply the schema from CLAUDE.md section 5.1
-- Tables: users, riot_accounts, teams, team_members,
--         identity_links, refresh_tokens, draft_sessions, score_snapshots
```

Refer to [CLAUDE.md Section 5.1](../CLAUDE.md) for the complete schema.

### 3.3 Row Level Security (RLS)

Enable RLS on all tables so users can only access their own data:

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE riot_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can read their own linked accounts
CREATE POLICY "Users can read own accounts"
  ON riot_accounts FOR SELECT
  USING (user_id = auth.uid());

-- Users can read teams they belong to
CREATE POLICY "Members can read team"
  ON teams FOR SELECT
  USING (id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));
```

### 3.4 Collect Keys

From your Supabase project settings, collect:

| Key | Location | Usage |
|-----|----------|-------|
| **Project URL** | Settings > API | `NEXT_PUBLIC_SUPABASE_URL` |
| **Anon Key** | Settings > API | `NEXT_PUBLIC_SUPABASE_ANON_KEY` (safe for browser) |
| **Service Role Key** | Settings > API | `SUPABASE_SERVICE_ROLE_KEY` (server-only, bypasses RLS) |

---

## 4. Vercel Setup

### 4.1 Connect Repository

1. Go to [vercel.com](https://vercel.com) and import your GitHub repository.
2. Set the **Root Directory** to `frontend/`.
3. Vercel auto-detects Next.js — the build command is `next build`.

### 4.2 Configure Build

| Setting | Value |
|---------|-------|
| Framework | Next.js |
| Root Directory | `frontend/` |
| Build Command | `npm run build` |
| Output Directory | `.next` (auto-detected) |
| Node.js Version | 20.x |

### 4.3 Environments

Set up two environments in Vercel:

- **Preview** (staging): Deploys on PRs and non-main branches
- **Production**: Deploys on merge to `main`

Each environment gets its own set of environment variables (see Section 5).

---

## 5. Environment Variables

### 5.1 Required Variables

Set these in both Vercel project settings and your local `.env.local`:

| Variable | Scope | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Supabase service role key (bypasses RLS) |
| `RIOT_API_KEY` | Server only | Riot Games API key |

### 5.2 Environment-Specific Variables

**Staging** (Vercel Preview):
```
NEXT_PUBLIC_SUPABASE_URL=https://<staging-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...staging
SUPABASE_SERVICE_ROLE_KEY=eyJ...staging-service
RIOT_API_KEY=RGAPI-...
```

**Production** (Vercel Production):
```
NEXT_PUBLIC_SUPABASE_URL=https://<prod-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...prod
SUPABASE_SERVICE_ROLE_KEY=eyJ...prod-service
RIOT_API_KEY=RGAPI-...
```

### 5.3 Local Development

Create `frontend/.env.local` (git-ignored):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
RIOT_API_KEY=RGAPI-...
```

### 5.4 Security Rules

- `NEXT_PUBLIC_*` variables are exposed to the browser — only use for public keys.
- `SUPABASE_SERVICE_ROLE_KEY` and `RIOT_API_KEY` must **never** appear in client-side code.
- Use Next.js API Routes / Route Handlers for server-side operations that need these keys.

---

## 6. CI/CD Pipeline

### 6.1 CI (`.github/workflows/ci.yml`)

Runs on every pull request:

1. **Backend**: Ruff lint, mypy type check, pytest
2. **Frontend**: ESLint, Vitest unit tests
3. **Docker**: Smoke test build of both images

### 6.2 CD (`.github/workflows/deploy.yml`)

Triggered on push to `main`:

```
CI Gate (ci.yml must pass)
    → Build & Push Docker Images to GHCR
    → Deploy to Staging (Vercel preview)
    → Deploy to Production (Vercel prod, requires environment approval)
```

### 6.3 GitHub Secrets Required

Configure these in your GitHub repository settings (Settings > Secrets and variables > Actions):

| Secret | Description |
|--------|-------------|
| `VERCEL_TOKEN` | Vercel API token (from Vercel account settings) |
| `VERCEL_ORG_ID` | Vercel organization/team ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |
| `STAGING_SUPABASE_URL` | Staging Supabase project URL |
| `STAGING_SUPABASE_ANON_KEY` | Staging Supabase anon key |
| `PROD_SUPABASE_URL` | Production Supabase project URL |
| `PROD_SUPABASE_ANON_KEY` | Production Supabase anon key |

> `GITHUB_TOKEN` is automatically available and used for GHCR authentication.

### 6.4 Environment Protection

Configure GitHub Environments (Settings > Environments):

- **staging**: No required reviewers (auto-deploys)
- **production**: Require 1 reviewer approval before deploy

---

## 7. Local Development

### 7.1 Quick Start

```bash
# Clone the repository
git clone https://github.com/RohanM023/Nexus5v5.git
cd Nexus5v5

# Start all services with Docker Compose
docker-compose up -d

# Or run frontend only (connects to remote Supabase)
cd frontend
cp .env.example .env.local  # Edit with your Supabase keys
npm install
npm run dev
```

### 7.2 Docker Compose (Full Stack)

`docker-compose up` starts:
- **Next.js** frontend (port 3000)
- **FastAPI** backend (port 8000)
- **PostgreSQL** (port 5432)
- **ClickHouse** (ports 8123, 9000)
- **Redis** (port 6379)

### 7.3 Running Tests

```bash
# Backend
cd backend
uv run pytest                    # Unit + integration tests
uv run ruff check src/           # Lint
uv run mypy src/                 # Type check

# Frontend
cd frontend
npm test                         # Vitest unit tests
npm run test:run                 # Vitest single run (CI mode)
npm run test:e2e                 # Playwright E2E tests
npm run lint                     # ESLint
```

---

## 8. Monitoring & Observability

### 8.1 Vercel Analytics

Vercel provides built-in analytics:
- **Web Vitals**: LCP, FID, CLS
- **Function logs**: Serverless function invocations and errors
- **Deployment logs**: Build output and runtime errors

### 8.2 Supabase Dashboard

Monitor via the Supabase dashboard:
- **Database**: Query performance, connection count, storage usage
- **Auth**: Active users, sign-up rates, failed auth attempts
- **Logs**: Database and API request logs

### 8.3 Application Metrics

For the FastAPI backend (when running in Docker):
- **Prometheus** scrapes `/api/v1/admin/metrics`
- **Grafana** dashboards at `http://localhost:3001`

Key metrics:
- Request latency (p50, p95, p99)
- Riot API quota usage and rate limit hits
- Match ingestion throughput
- Cache hit ratio
- Active draft sessions

---

## 9. Troubleshooting

### Common Issues

**Build fails on Vercel**
- Check that `frontend/` is set as the root directory
- Verify all `NEXT_PUBLIC_*` env vars are set in Vercel project settings
- Check Node.js version matches (20.x)

**Supabase connection errors**
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct (includes `https://`)
- Check that RLS policies allow the operation you're attempting
- For server-side operations, ensure `SUPABASE_SERVICE_ROLE_KEY` is set

**Riot API 429 (Rate Limited)**
- The application uses token-bucket rate limiting with exponential backoff
- Development keys are limited to 20 requests/second
- Check `ratelimit:riot:*` keys in Redis for current counters

**Docker Compose services unhealthy**
- Run `docker-compose ps` to check service status
- Check logs: `docker-compose logs <service-name>`
- Ensure ports 3000, 8000, 5432, 8123, 6379 are not already in use

**Tests failing in CI**
- Backend: Ensure `uv.lock` is up to date (`uv lock`)
- Frontend: Ensure `package-lock.json` is committed
- E2E: Playwright needs chromium installed (`npx playwright install chromium`)
