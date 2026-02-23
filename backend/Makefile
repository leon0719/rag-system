.PHONY: all format lint lint-fix type-check check test coverage clean unused help
.PHONY: install up down logs build rebuild
.PHONY: migrate makemigrations shell
.PHONY: docker-clean logs-api logs-db
.PHONY: prod-up prod-down prod-logs prod-build

# Docker compose files
COMPOSE_DEV = docker compose -f docker/docker-compose.dev.yml
COMPOSE_PROD = docker compose -f docker/docker-compose.prod.yml

# ===================
# Help
# ===================

help:
	@echo "========================================"
	@echo "  FastAPI RAG System Backend"
	@echo "========================================"
	@echo ""
	@echo "Development (Docker):"
	@echo "  make up                - Start dev containers"
	@echo "  make down              - Stop dev containers"
	@echo "  make build             - Build dev image only"
	@echo "  make rebuild           - Rebuild and start (after Dockerfile/pyproject.toml changes)"
	@echo "  make logs              - View all service logs"
	@echo "  make logs-api          - View API logs"
	@echo "  make logs-db           - View DB logs"
	@echo ""
	@echo "Production (Docker):"
	@echo "  make prod-build        - Build production image"
	@echo "  make prod-up           - Start production containers"
	@echo "  make prod-down         - Stop production containers"
	@echo "  make prod-logs         - View production logs"
	@echo ""
	@echo "Database (Alembic):"
	@echo "  make migrate           - Run alembic upgrade head"
	@echo "  make makemigrations    - Create new migration (MSG='description')"
	@echo "  make shell             - Open Python shell in container"
	@echo ""
	@echo "Code Quality:"
	@echo "  make all               - Run all checks (format + lint + type-check)"
	@echo "  make format            - Format code with ruff"
	@echo "  make lint              - Lint code with ruff"
	@echo "  make type-check        - Run mypy type checks"
	@echo "  make test              - Run tests (TEST='path' to specify)"
	@echo "  make coverage          - Run tests with coverage report"
	@echo "  make unused            - Check for unused functions"
	@echo ""
	@echo "Other:"
	@echo "  make install           - Install local dependencies (for IDE)"
	@echo "  make clean             - Clean cache files"
	@echo "  make docker-clean      - Clean Docker volumes"

# ===================
# Local Setup (for IDE)
# ===================

install:
	uv sync

# ===================
# Development (Docker)
# ===================

up:
	$(COMPOSE_DEV) up -d
	@echo ""
	@echo "Development environment started!"
	@echo "  API:      http://localhost:8002"
	@echo "  API Docs: http://localhost:8002/docs"
	@echo ""
	@echo "First time? Run:"
	@echo "  make migrate"

down:
	$(COMPOSE_DEV) down

build:
	$(COMPOSE_DEV) build

rebuild:
	$(COMPOSE_DEV) up -d --build

logs:
	$(COMPOSE_DEV) logs -f

logs-api:
	$(COMPOSE_DEV) logs -f api

logs-db:
	$(COMPOSE_DEV) logs -f db

docker-clean:
	$(COMPOSE_DEV) down -v
	@echo "Docker volumes cleaned"

# ===================
# Production (Docker)
# ===================

prod-build:
	$(COMPOSE_PROD) build

prod-up:
	$(COMPOSE_PROD) up -d
	@echo ""
	@echo "Production environment started!"
	@echo "  API: http://localhost:8002"

prod-down:
	$(COMPOSE_PROD) down

prod-logs:
	$(COMPOSE_PROD) logs -f

# ===================
# Database (Alembic)
# ===================

migrate:
	$(COMPOSE_DEV) exec api uv run alembic upgrade head

makemigrations:
	$(COMPOSE_DEV) exec api uv run alembic revision --autogenerate -m "$(MSG)"

shell:
	$(COMPOSE_DEV) exec api uv run python

# ===================
# Code Quality
# ===================

all:
	@echo "Running all code quality checks..."
	@echo ""
	@$(MAKE) format
	@echo ""
	@$(MAKE) lint
	@echo ""
	@$(MAKE) type-check
	@echo ""
	@$(MAKE) clean
	@echo "All checks completed!"

format:
	@echo "Formatting code with ruff..."
	@uv run ruff format .

lint:
	@echo "Linting code with ruff..."
	@uv run ruff check --fix .

type-check:
	@echo "Running type checks with mypy..."
	@uv run mypy .

test:
	@echo "Running tests..."
	@$(COMPOSE_DEV) exec api uv run pytest $(TEST)

coverage:
	@echo "Running tests with coverage..."
	@$(COMPOSE_DEV) exec api uv run pytest -n 0 --cov=app --cov-report=term-missing --cov-report=html $(TEST)
	@echo ""
	@echo "HTML report generated in htmlcov/"

unused:
	@echo "Checking for unused functions..."
	@uv run python scripts/check_unused_functions.py

# ===================
# Cleanup
# ===================

clean:
	@echo "Cleaning cache files..."
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@rm -rf htmlcov .coverage 2>/dev/null || true
	@echo "Cache cleaned!"
