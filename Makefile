# ═══════════════════════════════════════════════════════════
# Makefile - Delirium Infinite
# ═══════════════════════════════════════════════════════════

.PHONY: help install dev build up down logs test smoke backup deploy clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Run the installer
	@bash install.sh

dev: ## Start development mode (backend + frontend)
	@echo "🚀 Starting Delirium Infinite in dev mode..."
	@make dev-backend &
	@make dev-frontend

dev-backend: ## Start backend dev server
	cd backend && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

dev-frontend: ## Start frontend dev server
	cd frontend && npm run dev

build: ## Build for production
	cd frontend && npm run build
	cd backend && echo "Backend is ready (no build step needed)"

up: ## Start all services with Docker Compose
	docker compose up -d
	@echo "✅ Delirium Infinite is running at http://localhost:8080"

down: ## Stop all services
	docker compose down

logs: ## View logs (all services)
	docker compose logs -f

logs-backend: ## View backend logs only
	docker compose logs -f backend

logs-frontend: ## View frontend logs only
	docker compose logs -f frontend

test: ## Run all tests
	cd backend && python -m pytest tests/ -v
	cd frontend && npm run lint

smoke: ## Run local smoke suite for APIs, tools, and hands
	python3 scripts/smoke_local.py

backup: ## Backup data and config
	@bash scripts/backup.sh

deploy: ## Deploy to Oracle Cloud
	@bash scripts/deploy-oracle.sh

clean: ## Remove all containers, volumes, and build artifacts
	docker compose down -v --rmi all
	rm -rf frontend/.next frontend/node_modules
	rm -rf backend/__pycache__ backend/.pytest_cache
	@echo "🧹 Cleaned up everything"
