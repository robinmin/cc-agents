# Makefile for cc-agents project
# Tools: uv (package manager), ruff (linter/formatter), mypy (type checker), pytest (testing)

.PHONY: help install test lint format autofix clean notify-start notify-end discover-skills

# Default target
.DEFAULT_GOAL := help

# Project configuration
PYTHON_VERSION ?= 3.11
VENV_DIR := .venv

# Array of skill directories to test (each should have scripts/ and tests/ subdirectories)
SKILL_DIRS := plugins/rd2/skills/cc-skills2
# Add more skill directories here as needed:
# SKILL_DIRS += plugins/rd2/skills/another-skill
# SKILL_DIRS += plugins/rd2/skills/yet-another-skill

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

## discover-skills: Auto-discover all skills with scripts/ directories
discover-skills:
	@echo "🔍 Discovering skills..."
	@find plugins -type d -name scripts | while read dir; do \
		skill_dir=$$(dirname $$dir); \
		echo "  - $$skill_dir"; \
	done

## test: Run all tests with coverage for all skills
test: notify-start
	@echo "🧪 Running all tests..."
	@source $(VENV_DIR)/bin/activate && for skill_dir in $(SKILL_DIRS); do \
		if [ -d "$$skill_dir/tests" ] && [ -d "$$skill_dir/scripts" ]; then \
			echo ""; \
			echo "📦 Testing $$skill_dir..."; \
			pytest $$skill_dir/tests -v --cov=$$skill_dir/scripts --cov-report=term-missing --cov-report=html:$$skill_dir/htmlcov || exit 1; \
		else \
			echo "⚠️  Skipping $$skill_dir (missing tests/ or scripts/)"; \
		fi; \
	done
	@$(MAKE) notify-end

## lint: Run linting checks for all skills
lint:
	@echo "🔍 Running linting checks..."
	@source $(VENV_DIR)/bin/activate && for skill_dir in $(SKILL_DIRS); do \
		if [ -d "$$skill_dir/scripts" ]; then \
			echo ""; \
			echo "🔍 Linting $$skill_dir..."; \
			ruff check $$skill_dir/scripts $$skill_dir/tests || exit 1; \
			(cd $$skill_dir && mypy scripts) || exit 1; \
		fi; \
	done
	@echo "✅ Linting complete"

## format: Format code for all skills
format:
	@echo "🎨 Formatting code..."
	@source $(VENV_DIR)/bin/activate && for skill_dir in $(SKILL_DIRS); do \
		if [ -d "$$skill_dir/scripts" ]; then \
			echo ""; \
			echo "🎨 Formatting $$skill_dir..."; \
			ruff format $$skill_dir/scripts $$skill_dir/tests || exit 1; \
		fi; \
	done
	@echo "✅ Formatting complete"

## autofix: Auto-fix linting issues for all skills
autofix:
	@echo "🔧 Auto-fixing linting issues..."
	@source $(VENV_DIR)/bin/activate && for skill_dir in $(SKILL_DIRS); do \
		if [ -d "$$skill_dir/scripts" ]; then \
			echo ""; \
			echo "🔧 Auto-fixing $$skill_dir..."; \
			ruff check --fix $$skill_dir/scripts $$skill_dir/tests || exit 1; \
		fi; \
	done
	@echo "✅ Auto-fix complete"

## test-skill: Run tests for a specific skill (usage: make test-skill SKILL=plugins/rd2/skills/cc-skills2)
test-skill:
	@if [ -z "$(SKILL)" ]; then \
		echo "❌ Error: SKILL parameter required. Usage: make test-skill SKILL=plugins/rd2/skills/cc-skills2"; \
		exit 1; \
	fi
	@echo "🧪 Testing $(SKILL)..."
	@source $(VENV_DIR)/bin/activate && if [ -d "$(SKILL)/tests" ] && [ -d "$(SKILL)/scripts" ]; then \
		pytest $(SKILL)/tests -v --cov=$(SKILL)/scripts --cov-report=term-missing --cov-report=html:$(SKILL)/htmlcov; \
	else \
		echo "❌ Error: $(SKILL) missing tests/ or scripts/ directory"; \
		exit 1; \
	fi

## lint-skill: Lint a specific skill (usage: make lint-skill SKILL=plugins/rd2/skills/cc-skills2)
lint-skill:
	@if [ -z "$(SKILL)" ]; then \
		echo "❌ Error: SKILL parameter required. Usage: make lint-skill SKILL=plugins/rd2/skills/cc-skills2"; \
		exit 1; \
	fi
	@echo "🔍 Linting $(SKILL)..."
	@source $(VENV_DIR)/bin/activate && ruff check $(SKILL)/scripts $(SKILL)/tests
	@source $(VENV_DIR)/bin/activate && (cd $(SKILL) && mypy scripts)

## format-skill: Format a specific skill (usage: make format-skill SKILL=plugins/rd2/skills/cc-skills2)
format-skill:
	@if [ -z "$(SKILL)" ]; then \
		echo "❌ Error: SKILL parameter required. Usage: make format-skill SKILL=plugins/rd2/skills/cc-skills2"; \
		exit 1; \
	fi
	@echo "🎨 Formatting $(SKILL)..."
	@ruff format $(SKILL)/scripts $(SKILL)/tests

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

## ci: Run CI pipeline (lint + test) for all skills
ci: lint test
	@echo "✅ CI pipeline complete"
