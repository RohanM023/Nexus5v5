# Nexus-5v5 Deployment Guide

This document covers deploying Nexus-5v5 to production using **Vercel** (frontend) and **FastAPI** (backend) with managed database services.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Backend Setup](#3-backend-setup)
4. [Vercel Setup](#4-vercel-setup)
5. [Environment Variables](#5-environment-variables)
6. [CI/CD Pipeline](#6-cicd-pipeline)
7. [Local Development](#7-local-development)
8. [ClickHouse Cloud](#8-clickhouse-cloud)
9. [Monitoring & Observability](#9-monitoring--observability)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Architecture Overview

```
                    ┌──────────────┐
                    │   Vercel     │
                    │  (Next.js)   │
                    │  SSR + Edge  │
                    └──────┬───────┘
                           │  /api/* rewrites
                           ▼
                    ┌──────────────┐
                    │   FastAPI    │
                    │  (Backend)   │
                    │  Auth + API  │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
     ┌────────────┐ ┌───────────┐ ┌──────────┐
     │ PostgreSQL │ │ClickHouse │ │  Redis   │
     │  Users,    │ │  Matches, │ │  Cache,  │
     │  Identity  │ │  Matrices │ │  Sessions│
     └────────────┘ └───────────┘ └──────────┘
```

| Component | Service | Purpose |
|-----------|---------|---------|
| Frontend | Vercel (Next.js) | SSR, static pages, API proxy via rewrites |
| Backend | FastAPI (Docker/cloud host) | Auth (JWT RS256), identity, draft, analytics, match ingestion |
| Database | PostgreSQL | Users, teams, identity links, draft sessions |
| Analytics DB | ClickHouse (Cloud or Docker) | Match data, synergy/counter matrices |
| Cache | Redis | API caching, rate limit counters, session store |
| External API | Riot Games API | Match data, account info, champion mastery |

---

## 2. Prerequisites

- **GitHub account** with repository access
- **Vercel account** (free tier sufficient for staging)
- **Riot Games API key** (development or production tier)
- **Node.js 20+** and **npm/pnpm** for local builds
- **Python 3.12+** and **uv** for backend development

---

## 3. Backend Setup

### 3.1 Docker Deployment

The FastAPI backend runs as a Docker container:

```bash
cd backend
docker build -t nexus-api .
docker run -p 8000:8000 --env-file .env nexus-api
```

### 3.2 Database Migrations

```bash
cd backend
uv run alembic upgrade head
```

### 3.3 Auth Architecture

- **JWT RS256**: Access tokens (15-min expiry) + refresh tokens (7-day expiry)
- **Endpoints**: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`
- **Frontend storage**: Tokens stored in `localStorage` (`nexus_access_token`, `nexus_refresh_token`)
- **API client**: Automatically adds `Authorization: Bearer <token>` header, with automatic token refresh on 401

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

### 4.3 API Proxy

The Next.js `next.config.ts` rewrites all `/api/*` requests to the FastAPI backend:

```ts
async rewrites() {
  const apiUrl = process.env.INTERNAL_API_URL
    || process.env.NEXT_PUBLIC_API_URL
    || "http://localhost:8000";
  return [{ source: "/api/:path*", destination: `${apiUrl}/api/v1/:path*` }];
}
```

Set `NEXT_PUBLIC_API_URL` in Vercel to point to your production FastAPI instance.

### 4.4 Environments

Set up two environments in Vercel:

- **Preview** (staging): Deploys on PRs and non-main branches
- **Production**: Deploys on merge to `main`

---

## 5. Environment Variables

### 5.1 Required Variables

**Vercel (frontend)**:

| Variable | Scope | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_API_URL` | Client + Server | Public URL of the FastAPI backend |
| `INTERNAL_API_URL` | Server only | Internal backend URL (for Docker networking) |

**Backend (FastAPI)**:

| Variable | Description |
|----------|-------------|
| `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | PostgreSQL connection |
| `CLICKHOUSE_HOST`, `CLICKHOUSE_PORT`, `CLICKHOUSE_USER`, `CLICKHOUSE_PASSWORD`, `CLICKHOUSE_DB` | ClickHouse connection |
| `CLICKHOUSE_SECURE` | Set `true` for ClickHouse Cloud (HTTPS) |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` | Redis connection |
| `JWT_SECRET_KEY` | JWT signing key (must change from default in production) |
| `RIOT_API_KEY` | Riot Games API key |
| `CORS_ORIGINS` | Comma-separated allowed origins |

### 5.2 Security Rules

- `NEXT_PUBLIC_*` variables are exposed to the browser — only use for public values.
- `JWT_SECRET_KEY`, `RIOT_API_KEY`, database passwords must **never** appear in client-side code.
- All sensitive API calls go through the FastAPI backend.

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

| Secret | Description |
|--------|-------------|
| `VERCEL_TOKEN` | Vercel API token |
| `VERCEL_ORG_ID` | Vercel organization/team ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |
| `STAGING_API_URL` | Staging FastAPI backend URL |
| `PROD_API_URL` | Production FastAPI backend URL |

---

## 7. Local Development

### 7.1 Quick Start

```bash
# Clone the repository
git clone https://github.com/RohanM023/Nexus5v5.git
cd Nexus5v5

# Start all services with Docker Compose
docker-compose up -d

# Or run frontend only (connects to local backend)
cd frontend
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

## 8. ClickHouse Cloud

For production, use ClickHouse Cloud instead of self-hosted Docker:

1. Create a ClickHouse Cloud service at [clickhouse.cloud](https://clickhouse.cloud)
2. Set environment variables:
   ```
   CLICKHOUSE_HOST=your-instance.clickhouse.cloud
   CLICKHOUSE_PORT=8443
   CLICKHOUSE_SECURE=true
   CLICKHOUSE_USER=default
   CLICKHOUSE_PASSWORD=your-password
   CLICKHOUSE_DB=nexus
   ```
3. The `clickhouse_connect` client will automatically use HTTPS with TLS verification.

---

## 9. Monitoring & Observability

### 9.1 Vercel Analytics

Vercel provides built-in analytics:
- **Web Vitals**: LCP, FID, CLS
- **Function logs**: Serverless function invocations and errors
- **Deployment logs**: Build output and runtime errors

### 9.2 Application Metrics

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

## 10. Troubleshooting

### Common Issues

**Build fails on Vercel**
- Check that `frontend/` is set as the root directory
- Verify `NEXT_PUBLIC_API_URL` env var is set in Vercel project settings
- Check Node.js version matches (20.x)

**API proxy not working**
- Verify `NEXT_PUBLIC_API_URL` or `INTERNAL_API_URL` is set correctly
- Check that the FastAPI backend is reachable from Vercel
- Test directly: `curl https://your-backend/api/v1/admin/health`

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
