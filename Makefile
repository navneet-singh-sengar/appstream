# AppStream - Makefile
# Usage: make [target]
#
# Primary targets:
#   make start    - Install dependencies and start the server
#   make stop     - Stop the running server
#   make status   - Check server status
#   make dev      - Start in development mode (foreground)
#   make install  - Install all dependencies
#   make clean    - Remove build artifacts and caches

.PHONY: start stop status dev install install-backend install-frontend build-frontend clean help

# Configuration
SHELL := /bin/bash
ROOT_DIR := $(shell pwd)
BACKEND_DIR := $(ROOT_DIR)/backend
FRONTEND_DIR := $(ROOT_DIR)/frontend
VENV_DIR := $(BACKEND_DIR)/.venv
PID_FILE := $(BACKEND_DIR)/.pid
PYTHON := $(VENV_DIR)/bin/python3
PIP := $(VENV_DIR)/bin/pip
PORT := 5001

# Default target
.DEFAULT_GOAL := help

# Help
help:
	@echo "AppStream"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Primary targets:"
	@echo "  start            Install dependencies and start the server"
	@echo "  stop             Stop the running server"
	@echo "  status           Check server status"
	@echo "  dev              Start in development mode (foreground)"
	@echo "  install          Install all dependencies"
	@echo "  clean            Remove build artifacts and caches"
	@echo ""
	@echo "Individual targets:"
	@echo "  install-backend  Install Python dependencies"
	@echo "  install-frontend Install npm dependencies"
	@echo "  build-frontend   Build React app for production"
	@echo ""

# Check if server is running
status:
	@if [ -f $(PID_FILE) ] && kill -0 $$(cat $(PID_FILE)) 2>/dev/null; then \
		echo "✅ Server is running (PID: $$(cat $(PID_FILE)))"; \
		echo "   URL: http://localhost:$(PORT)"; \
	else \
		echo "⏹  Server is not running"; \
		rm -f $(PID_FILE) 2>/dev/null; \
	fi

# Stop the server
stop:
	@if [ -f $(PID_FILE) ]; then \
		PID=$$(cat $(PID_FILE)); \
		if kill -0 $$PID 2>/dev/null; then \
			echo "Stopping server (PID: $$PID)..."; \
			kill $$PID; \
			sleep 2; \
			if kill -0 $$PID 2>/dev/null; then \
				echo "Force killing..."; \
				kill -9 $$PID 2>/dev/null; \
			fi; \
			echo "✅ Server stopped"; \
		else \
			echo "Server not running (stale PID file)"; \
		fi; \
		rm -f $(PID_FILE); \
	else \
		echo "Server not running (no PID file)"; \
	fi
	@# Also kill any process on the port
	@lsof -ti:$(PORT) | xargs kill -9 2>/dev/null || true

# Start the server (background)
start: install build-frontend
	@# Stop any existing server first
	@$(MAKE) stop --no-print-directory 2>/dev/null || true
	@echo "Starting server..."
	@cd $(BACKEND_DIR) && \
		$(PYTHON) server.py > /dev/null 2>&1 & \
		echo $$! > $(PID_FILE)
	@sleep 2
	@if [ -f $(PID_FILE) ] && kill -0 $$(cat $(PID_FILE)) 2>/dev/null; then \
		echo ""; \
		echo "✅ Server started successfully!"; \
		echo ""; \
		echo "   URL: http://localhost:$(PORT)"; \
		echo "   PID: $$(cat $(PID_FILE))"; \
		echo ""; \
		echo "   To stop: make stop"; \
	else \
		echo "❌ Failed to start server"; \
		rm -f $(PID_FILE); \
		exit 1; \
	fi

# Development mode (foreground with debug)
dev: install build-frontend
	@$(MAKE) stop --no-print-directory 2>/dev/null || true
	@echo "Starting server in development mode..."
	@echo "Press Ctrl+C to stop"
	@echo ""
	@cd $(BACKEND_DIR) && FLASK_ENV=development $(PYTHON) server.py

# Install all dependencies
install: install-backend install-frontend

# Install backend dependencies
install-backend: $(VENV_DIR)/bin/activate

$(VENV_DIR)/bin/activate: $(BACKEND_DIR)/requirements.txt
	@echo "Setting up Python virtual environment..."
	@python3 -m venv $(VENV_DIR)
	@echo "Installing Python dependencies..."
	@$(PIP) install --upgrade pip -q
	@$(PIP) install -r $(BACKEND_DIR)/requirements.txt -q
	@touch $(VENV_DIR)/bin/activate
	@echo "✅ Backend dependencies installed"

# Install frontend dependencies
install-frontend: $(FRONTEND_DIR)/node_modules/.package-lock.json

$(FRONTEND_DIR)/node_modules/.package-lock.json: $(FRONTEND_DIR)/package.json
	@echo "Installing frontend dependencies..."
	@cd $(FRONTEND_DIR) && npm install --silent
	@echo "✅ Frontend dependencies installed"

# Build frontend for production (always rebuilds)
build-frontend: install-frontend
	@echo "Cleaning old frontend build..."
	@rm -rf $(FRONTEND_DIR)/dist
	@echo "Building frontend..."
	@cd $(FRONTEND_DIR) && npm run build
	@echo "✅ Frontend built"

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf $(VENV_DIR)
	@rm -rf $(FRONTEND_DIR)/node_modules
	@rm -rf $(FRONTEND_DIR)/dist
	@rm -rf $(BACKEND_DIR)/__pycache__
	@rm -rf $(BACKEND_DIR)/*/__pycache__
	@rm -rf $(BACKEND_DIR)/*/*/__pycache__
	@rm -f $(PID_FILE)
	@echo "✅ Clean complete"

