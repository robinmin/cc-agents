# Makefile for cc-agents project
# Tools: uv (package manager), ruff (linter/formatter), mypy (type checker), pytest (testing)
# TypeScript tools: bun (runtime, test runner)

.PHONY: help install test lint lint-one lint-one2 format autofix clean notify-start notify-end discover-scripts list-scripts
.PHONY: test-one test-one2 lint-one lint-one2 format-one ci-one

# Default target
.DEFAULT_GOAL := help

# Project configuration
PYTHON_VERSION ?= 3.11
VENV_DIR := .venv

# Auto-discover all directories with BOTH scripts/ and tests/ subdirectories
SCRIPT_DIRS = $(foreach dir,$(shell find plugins -type d -name scripts | sed 's|/scripts||' | sort -u),$(if $(wildcard $(dir)/tests),$(dir),))

# Blacklist: Skills still using Python (will migrate to TypeScript/bunjs gradually)
# These will be linted using lint-one (Python), others use lint-one2 (TypeScript/bun)
# Note: Only skills in SCRIPT_DIRS (have tests/) will be linted in Phase 1 & 2
# Additional Python folders without tests can be added to COMMON_FOLDERS or linted separately
PYTHON_SKILLS = \
	plugins/rd2 \
	plugins/rd2/skills/anti-hallucination \
	plugins/rd2/skills/cc-agents \
	plugins/rd2/skills/cc-commands \
	plugins/rd2/skills/cc-skills \
	plugins/rd2/skills/cc-hooks \
	plugins/rd2/skills/code-review-auggie \
	plugins/rd2/skills/code-review-claude \
	plugins/rd2/skills/code-review-common \
	plugins/rd2/skills/code-review-gemini \
	plugins/rd2/skills/code-review-opencode \
	plugins/rd2/skills/coder-agy \
	plugins/rd2/skills/coder-auggie \
	plugins/rd2/skills/coder-claude \
	plugins/rd2/skills/coder-gemini \
	plugins/rd2/skills/coder-opencode \
	plugins/rd2/skills/tasks \
	plugins/wt/skills/image-generate \
	plugins/wt/skills/technical-content-creation

# Common script folders (Python only)
COMMON_FOLDERS = plugins/rd2/scripts plugins/wt/scripts

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

## setup-cc: Setup Claude Code's plugins
setup-cc:
	@echo "🔧 Setting up Claude Code's plugins..."
	@./scripts/setup-all.sh
	@echo ""
	@echo "✅ Setup complete"
	@echo "⚠️  Please restart Claude Code to clear internal cache"

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
	@echo ""
	@echo "=== Phase 1: Python skills (pytest) ==="
	@for script_dir in $(SCRIPT_DIRS); do \
		case "$(PYTHON_SKILLS)" in \
			*$$script_dir*) \
				if ls $$script_dir/tests/*.py 1>/dev/null 2>&1; then \
					make test-one DIR=$$script_dir || exit 1; \
				else \
					echo "⏭️  Skipping $$script_dir (no Python tests)"; \
				fi \
				;; \
			*) \
				;; \
		esac \
	done
	@echo ""
	@echo "=== Phase 2: TypeScript skills (bun test) ==="
	@for script_dir in $(SCRIPT_DIRS); do \
		case "$(PYTHON_SKILLS)" in \
			*$$script_dir*) \
				;; \
			*) \
				if ls $$script_dir/tests/*.ts 1>/dev/null 2>&1; then \
					make test-one2 DIR=$$script_dir || exit 1; \
				else \
					echo "⏭️  Skipping $$script_dir (no TypeScript tests)"; \
				fi \
				;; \
		esac \
	done
	@$(MAKE) notify-end

## test-one: Run tests for one script directory (usage: make test-one DIR=plugins/rd2/skills/cc-skills)
test-one:
	@if [ -z "$(DIR)" ]; then \
		echo "❌ Error: DIR parameter required. Usage: make test-one DIR=plugins/rd2/skills/cc-skills"; \
		echo "   Run 'make list-scripts' to see available directories"; \
		exit 1; \
	fi
	@if [ -d "$(DIR)/tests" ] && [ -d "$(DIR)/scripts" ]; then \
		echo "🎨 Formatting $(DIR) with ruff..."; \
		source $(VENV_DIR)/bin/activate && ruff format $(DIR)/scripts $(DIR)/tests; \
		echo "🧪 Testing $(DIR)..."; \
		source $(VENV_DIR)/bin/activate && pytest $(DIR)/tests -v --cov=$(DIR)/scripts --cov-report=term-missing --cov-report=html:$(DIR)/htmlcov; \
	else \
		echo "❌ Error: $(DIR) missing tests/ or scripts/ directory"; \
		exit 1; \
	fi

## test-one2: Run TypeScript tests for one skill directory via bun (usage: make test-one2 DIR=plugins/wt/skills/publish-to-xhs)
test-one2:
	@if [ -z "$(DIR)" ]; then \
		echo "❌ Error: DIR parameter required. Usage: make test-one2 DIR=plugins/wt/skills/publish-to-xhs"; \
		echo "   Available TypeScript skills: publish-to-xhs, publish-to-medium, etc."; \
		exit 1; \
	fi
	@if [ -d "$(DIR)/tests" ] && [ -d "$(DIR)/scripts" ]; then \
		has_test=$$(find $(DIR)/tests -maxdepth 1 \( -name "*.test.ts" -o -name "*.test.js" -o -name "*.spec.ts" -o -name "*.spec.js" \) 2>/dev/null | head -1); \
		if [ -n "$$has_test" ]; then \
			echo "🎨 Formatting $(DIR) with biome..." && \
			cd $(DIR) && biome format --write && echo "🧪 Testing $(DIR) with bun..." && { \
				bun test --coverage; \
			}; \
		else \
			echo "⏭️  Skipping $(DIR) (no TypeScript test files)"; \
		fi \
	else \
		echo "❌ Error: $(DIR) missing tests/ or scripts/ directory"; \
		exit 1; \
	fi

## lint: Run linting checks for all script directories
lint:
	@echo "🔍 Running linting checks..."
	@echo ""
	@echo "=== Phase 1: Python skills (ruff + mypy) ==="
	@for script_dir in $(SCRIPT_DIRS); do \
		case "$(PYTHON_SKILLS)" in \
			*$$script_dir*) \
				make lint-one DIR=$$script_dir || exit 1; \
				;; \
		esac \
	done
	@echo ""
	@echo "=== Phase 2: TypeScript/bun skills (biome) ==="
	@for script_dir in $(SCRIPT_DIRS); do \
		case "$(PYTHON_SKILLS)" in \
			*$$script_dir*) \
				;; \
			*) \
				if [ -d "$$script_dir/scripts" ]; then \
					make lint-one2 DIR=$$script_dir || exit 1; \
				fi \
				;; \
		esac \
	done
	@echo ""
	@echo "=== Phase 3: Common folders (Python) ==="
	@for folder in $(COMMON_FOLDERS); do \
		if [ -d "$$folder" ] && ls $$folder/*.py 1>/dev/null 2>&1; then \
			echo "🔍 Linting $$folder..."; \
			source $(VENV_DIR)/bin/activate && ruff check $$folder && mypy $$folder --config-file $(PWD)/pyproject.toml || exit 1; \
		else \
			echo "⏭️  Skipping $$folder (not found or no Python files)"; \
		fi \
	done
	@echo ""
	@echo "✅ Linting complete"

## lint-one: Lint one script directory (usage: make lint-one DIR=plugins/rd2/skills/cc-skills)
lint-one:
	@if [ -z "$(DIR)" ]; then \
		echo "❌ Error: DIR parameter required. Usage: make lint-one DIR=plugins/rd2/skills/cc-skills"; \
		echo "   Run 'make list-scripts' to see available directories"; \
		exit 1; \
	fi
	@echo "🔍 Formatting $(DIR)..."
	@source $(VENV_DIR)/bin/activate && ruff format $(DIR)/scripts $(DIR)/tests
	@echo "🔍 Linting $(DIR)..."
	@source $(VENV_DIR)/bin/activate && ruff check $(DIR)/scripts $(DIR)/tests
	@source $(VENV_DIR)/bin/activate && (cd $(DIR) && mypy scripts --config-file $(PWD)/pyproject.toml)

## lint-one2: Run TypeScript/JS linting for one skill directory via bun (usage: make lint-one2 DIR=plugins/wt/skills/publish-to-xhs)
lint-one2:
	@if [ -z "$(DIR)" ]; then \
		echo "❌ Error: DIR parameter required. Usage: make lint-one2 DIR=plugins/wt/skills/publish-to-xhs"; \
		echo "   Available TypeScript skills: publish-to-xhs, publish-to-medium, etc."; \
		exit 1; \
	fi
	@if [ -d "$(DIR)/scripts" ]; then \
		has_ts=$$(find $(DIR)/scripts -maxdepth 1 -name "*.ts" -o -name "*.js" 2>/dev/null | head -1); \
		if [ -n "$$has_ts" ]; then \
			echo "🎨 Formatting $(DIR) with biome..."; \
			cd $(DIR) && biome format --write && echo "🔍 Linting $(DIR) with bun..." && { \
				(bun run lint 2>&1 || true) | grep -v 'error: Script not found' | tee /tmp/lint-output.txt; \
				if grep -qE "^Found [0-9]+ error" /tmp/lint-output.txt; then \
					echo "❌ npm lint found errors"; \
					exit 1; \
				fi; \
				(biome check . 2>&1 || true) | tee /tmp/biome-output.txt; \
				if grep -qE "^Found [0-9]+ error" /tmp/biome-output.txt; then \
					echo "❌ Biome found errors"; \
					exit 1; \
				fi; \
			}; \
		else \
			echo "⏭️  Skipping $(DIR) (no TypeScript/JS files to lint)"; \
		fi \
	else \
		echo "❌ Error: $(DIR) missing scripts/ directory"; \
		exit 1; \
	fi

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
