.PHONY: dev down test test-backend test-frontend lint lint-fix migrate migrate-create seed build logs shell-api shell-db worker

# ── Development ──────────────────────────────────────────────

dev: ## Start all services for local development
	docker compose up --build

down: ## Stop all services
	docker compose down

build: ## Build all Docker images
	docker compose build

worker: ## Start the arq background worker
	docker compose up worker

logs: ## Follow logs from all services
	docker compose logs -f

# ── Testing ──────────────────────────────────────────────────

test: test-backend test-frontend ## Run all tests

test-backend: ## Run backend tests
	docker compose exec api uv run pytest tests/ -v --tb=short

test-frontend: ## Run frontend tests
	docker compose exec web npm test -- --run

# ── Linting ──────────────────────────────────────────────────

lint: ## Run all linters
	docker compose exec api uv run ruff check src/ tests/
	docker compose exec api uv run ruff format --check src/ tests/
	docker compose exec web npm run lint

lint-fix: ## Auto-fix lint issues
	docker compose exec api uv run ruff check --fix src/ tests/
	docker compose exec api uv run ruff format src/ tests/

# ── Database ─────────────────────────────────────────────────

migrate: ## Run database migrations
	docker compose exec api uv run alembic upgrade head

migrate-create: ## Create a new migration (usage: make migrate-create MSG="description")
	docker compose exec api uv run alembic revision --autogenerate -m "$(MSG)"

# ── Seeding ──────────────────────────────────────────────────

seed: ## Run all seed scripts
	docker compose exec api uv run python scripts/seed_champions.py

# ── Shell Access ─────────────────────────────────────────────

shell-api: ## Open a shell in the API container
	docker compose exec api bash

shell-db: ## Open a psql shell in the PostgreSQL container
	docker compose exec postgres psql -U nexus -d nexus

# ── Help ─────────────────────────────────────────────────────

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
