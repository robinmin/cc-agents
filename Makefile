# Makefile for cc-agents project
# Tools: uv (package manager), ruff (linter/formatter), mypy (type checker), pytest (testing)

.PHONY: help install test lint format autofix clean notify-start notify-end discover-scripts list-scripts
.PHONY: test-one lint-one format-one ci-one

# Default target
.DEFAULT_GOAL := help

# Project configuration
PYTHON_VERSION ?= 3.11
VENV_DIR := .venv

# Auto-discover all directories with BOTH scripts/ and tests/ subdirectories
SCRIPT_DIRS = $(foreach dir,$(shell find plugins -type d -name scripts | sed 's|/scripts||' | sort -u),$(if $(wildcard $(dir)/tests),$(dir),))

## help: Display this help message
help:
	@echo "Available targets:"
	@grep -E '^##' $(MAKEFILE_LIST) | sed 's/^## /  /' | column -t -s ':'

## install: Install dependencies and setup environment
install:
	@echo "📦 Installing dependencies..."
	test -d $(VENV_DIR) || uv venv --python $(PYTHON_VERSION)
	uv pip install pytest pytest-cov ruff mypy
	@echo "✅ Installation complete"

## list-scripts: List all auto-discovered script directories
list-scripts:
	@echo "📋 Auto-discovered script directories (with tests/ and scripts/):"
	@for dir in $(SCRIPT_DIRS); do \
		echo "  - $$dir"; \
	done

## discover-scripts: Alias for list-scripts (discover all scripts)
discover-scripts: list-scripts

## test: Run all tests with coverage for all script directories
test: notify-start
	@echo "🧪 Running all tests..."
	@source $(VENV_DIR)/bin/activate && for script_dir in $(SCRIPT_DIRS); do \
		echo ""; \
		echo "📦 Testing $$script_dir..."; \
		pytest $$script_dir/tests -v --cov=$$script_dir/scripts --cov-report=term-missing --cov-report=html:$$script_dir/htmlcov || exit 1; \
	done
	@$(MAKE) notify-end

## test-one: Run tests for one script directory (usage: make test-one DIR=plugins/rd2/skills/cc-skills)
test-one:
	@if [ -z "$(DIR)" ]; then \
		echo "❌ Error: DIR parameter required. Usage: make test-one DIR=plugins/rd2/skills/cc-skills"; \
		echo "   Run 'make list-scripts' to see available directories"; \
		exit 1; \
	fi
	@echo "🧪 Testing $(DIR)..."
	@source $(VENV_DIR)/bin/activate && if [ -d "$(DIR)/tests" ] && [ -d "$(DIR)/scripts" ]; then \
		pytest $(DIR)/tests -v --cov=$(DIR)/scripts --cov-report=term-missing --cov-report=html:$(DIR)/htmlcov; \
	else \
		echo "❌ Error: $(DIR) missing tests/ or scripts/ directory"; \
		exit 1; \
	fi

## lint: Run linting checks for all script directories
lint:
	@echo "🔍 Running linting checks..."
	@source $(VENV_DIR)/bin/activate && for script_dir in $(SCRIPT_DIRS); do \
		echo ""; \
		echo "🔍 Linting $$script_dir..."; \
		ruff check $$script_dir/scripts $$script_dir/tests || exit 1; \
		(cd $$script_dir && mypy scripts --config-file $(PWD)/pyproject.toml) || exit 1; \
	done
	@echo "✅ Linting complete"

## lint-one: Lint one script directory (usage: make lint-one DIR=plugins/rd2/skills/cc-skills)
lint-one:
	@if [ -z "$(DIR)" ]; then \
		echo "❌ Error: DIR parameter required. Usage: make lint-one DIR=plugins/rd2/skills/cc-skills"; \
		echo "   Run 'make list-scripts' to see available directories"; \
		exit 1; \
	fi
	@echo "🔍 Linting $(DIR)..."
	@source $(VENV_DIR)/bin/activate && ruff check $(DIR)/scripts $(DIR)/tests
	@source $(VENV_DIR)/bin/activate && (cd $(DIR) && mypy scripts --config-file $(PWD)/pyproject.toml)

## format: Format code for all script directories
format:
	@echo "🎨 Formatting code..."
	@source $(VENV_DIR)/bin/activate && for script_dir in $(SCRIPT_DIRS); do \
		echo ""; \
		echo "🎨 Formatting $$script_dir..."; \
		ruff format $$script_dir/scripts $$script_dir/tests || exit 1; \
	done
	@echo "✅ Formatting complete"

## format-one: Format one script directory (usage: make format-one DIR=plugins/rd2/skills/cc-skills)
format-one:
	@if [ -z "$(DIR)" ]; then \
		echo "❌ Error: DIR parameter required. Usage: make format-one DIR=plugins/rd2/skills/cc-skills"; \
		echo "   Run 'make list-scripts' to see available directories"; \
		exit 1; \
	fi
	@echo "🎨 Formatting $(DIR)..."
	@ruff format $(DIR)/scripts $(DIR)/tests

## autofix: Auto-fix linting issues for all script directories
autofix:
	@echo "🔧 Auto-fixing linting issues..."
	@source $(VENV_DIR)/bin/activate && for script_dir in $(SCRIPT_DIRS); do \
		echo ""; \
		echo "🔧 Auto-fixing $$script_dir..."; \
		ruff check --fix $$script_dir/scripts $$script_dir/tests || exit 1; \
	done
	@echo "✅ Auto-fix complete"

## autofix-one: Auto-fix one script directory (usage: make autofix-one DIR=plugins/rd2/skills/cc-skills)
autofix-one:
	@if [ -z "$(DIR)" ]; then \
		echo "❌ Error: DIR parameter required. Usage: make autofix-one DIR=plugins/rd2/skills/cc-skills"; \
		echo "   Run 'make list-scripts' to see available directories"; \
		exit 1; \
	fi
	@echo "🔧 Auto-fixing $(DIR)..."
	@ruff check --fix $(DIR)/scripts $(DIR)/tests

## clean: Remove build artifacts and cache files
clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf build/ dist/ *.egg-info
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "htmlcov" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name ".coverage" -delete
	@echo "✅ Clean complete"

## notify-start: Notify workflow start
notify-start:
	@echo "🎼 WORKFLOW: cc-agents Testing - START"
	@date "+Started at: %Y-%m-%d %H:%M:%S"

## notify-end: Notify workflow completion
notify-end:
	@echo "🎼 WORKFLOW: cc-agents Testing - COMPLETE"
	@date "+Completed at: %Y-%m-%d %H:%M:%S"

## ci: Run CI pipeline (lint + test) for all script directories
ci: lint test
	@echo "✅ CI pipeline complete"

## ci-one: Run CI pipeline for one script directory (usage: make ci-one DIR=plugins/rd2/skills/cc-skills)
ci-one: lint-one test-one
	@echo "✅ CI pipeline complete for $(DIR)"
