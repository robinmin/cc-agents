# Makefile for Python projects using modern tooling
# Tools: uv (package manager), ruff (linter/formatter), mypy (type checker), pytest (testing)

.PHONY: help install test test-unit test-integration test-e2e lint format build clean notify-start notify-end

# Default target
.DEFAULT_GOAL := help

# Project configuration
PYTHON_VERSION ?= 3.11
SRC_DIR := src
TEST_DIR := tests
VENV_DIR := .venv

## help: Display this help message
help:
	@echo "Available targets:"
	@grep -E '^##' $(MAKEFILE_LIST) | sed 's/^## /  /' | column -t -s ':'

## install: Install dependencies and setup environment
install:
	@echo "📦 Installing dependencies..."
	uv venv --python $(PYTHON_VERSION)
	uv pip install -e ".[dev]"
	@echo "✅ Installation complete"

## test: Run all tests with coverage
test: notify-start
	@echo "🧪 Running all tests..."
	pytest $(TEST_DIR) -v --cov=$(SRC_DIR) --cov-report=term-missing --cov-report=html
	@$(MAKE) notify-end

## test-unit: Run unit tests only
test-unit:
	@echo "🧪 Running unit tests..."
	pytest $(TEST_DIR)/unit -v --cov=$(SRC_DIR) --cov-report=term-missing

## test-integration: Run integration tests only
test-integration:
	@echo "🧪 Running integration tests..."
	pytest $(TEST_DIR)/integration -v --cov=$(SRC_DIR) --cov-report=term-missing

## test-e2e: Run end-to-end tests
test-e2e:
	@echo "🧪 Running e2e tests..."
	pytest $(TEST_DIR)/e2e -v

## test-file: Run tests for a specific file (usage: make test-file FILE=path/to/test_file.py)
test-file:
	@echo "🧪 Running tests in $(FILE)..."
	pytest $(FILE) -v --cov=$(SRC_DIR)

## test-function: Run a specific test function (usage: make test-function FILE=path/to/test.py FUNC=test_name)
test-function:
	@echo "🧪 Running test function $(FUNC) in $(FILE)..."
	pytest $(FILE)::$(FUNC) -v

## lint: Run linting checks
lint:
	@echo "🔍 Running linting checks..."
	ruff check $(SRC_DIR) $(TEST_DIR)
	mypy $(SRC_DIR)
	@echo "✅ Linting complete"

## format: Format code
format:
	@echo "🎨 Formatting code..."
	ruff format $(SRC_DIR) $(TEST_DIR)
	ruff check --fix $(SRC_DIR) $(TEST_DIR)
	@echo "✅ Formatting complete"

## build: Build distribution packages
build: clean
	@echo "🏗️  Building distribution..."
	python -m build
	@echo "✅ Build complete"

## clean: Remove build artifacts and cache files
clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf build/ dist/ *.egg-info
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".ruff_cache" -exec rm -rf {} +
	rm -rf htmlcov/ .coverage
	@echo "✅ Clean complete"

## notify-start: Notify workflow start (customizable for automation)
notify-start:
	@echo "🎼 WORKFLOW: 10-Stage Development - START"
	@echo "Task: $(TASK_NAME)"
	@echo "Stage: $(STAGE)"
	@date "+Started at: %Y-%m-%d %H:%M:%S"

## notify-end: Notify workflow completion (customizable for automation)
notify-end:
	@echo "🎼 WORKFLOW: 10-Stage Development - COMPLETE"
	@echo "Task: $(TASK_NAME)"
	@date "+Completed at: %Y-%m-%d %H:%M:%S"

# Stage-specific targets for 10-stage workflow
## stage-0: Announce workflow start
stage-0:
	@$(MAKE) notify-start TASK_NAME="$(FUNC)" STAGE=0

## stage-1: Create function specification
stage-1:
	@echo "📋 Stage 1: Define Specification"
	@echo "Function: $(FUNC)"

## stage-2: Create smoke test
stage-2:
	@echo "🧪 Stage 2: Create Smoke Test"
	@echo "Creating test file: $(TEST_DIR)/test_$(FUNC).py"

## stage-3: Initial syntax check
stage-3:
	@echo "🔍 Stage 3: Initial Syntax Check"
	python -m py_compile $(TEST_DIR)/test_$(FUNC).py
	ruff check $(TEST_DIR)/test_$(FUNC).py

## stage-4: Run smoke test (expect failure)
stage-4:
	@echo "🧪 Stage 4: Run Smoke Test (expect failure)"
	-pytest $(TEST_DIR)/test_$(FUNC).py::test_$(FUNC)_smoke -v

## stage-5: Implementation complete
stage-5:
	@echo "✅ Stage 5: Implementation Complete"
	@echo "Function $(FUNC) implemented in $(SRC_DIR)"

## stage-6: Expand test suite
stage-6:
	@echo "🧪 Stage 6: Expand Test Suite"
	@echo "Adding comprehensive tests..."

## stage-7: Final syntax check
stage-7:
	@echo "🔍 Stage 7: Final Syntax Check"
	python -m py_compile $(SRC_DIR)/$(FUNC).py
	python -m py_compile $(TEST_DIR)/test_$(FUNC).py
	ruff check $(SRC_DIR)/$(FUNC).py $(TEST_DIR)/test_$(FUNC).py

## stage-8: Verify all tests pass
stage-8:
	@echo "🧪 Stage 8: Verify All Tests Pass"
	pytest $(TEST_DIR)/test_$(FUNC).py -v --cov=$(SRC_DIR)

## stage-9: Report completion
stage-9:
	@$(MAKE) notify-end TASK_NAME="$(FUNC)" STAGE=9
