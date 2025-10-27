# Makefile for Rust projects using modern tooling
# Tools: cargo (standard tooling), clippy (linting), rustfmt (formatting)

.PHONY: help install test test-unit test-integration test-e2e lint format build clean notify-start notify-end

# Default target
.DEFAULT_GOAL := help

# Project configuration
CARGO_TARGET_DIR ?= target

## help: Display this help message
help:
	@echo "Available targets:"
	@grep -E '^##' $(MAKEFILE_LIST) | sed 's/^## /  /' | column -t -s ':'

## install: Install dependencies and tools
install:
	@echo "📦 Installing dependencies..."
	cargo fetch
	@if ! command -v cargo-clippy &> /dev/null; then \
		echo "Installing clippy..."; \
		rustup component add clippy; \
	fi
	@if ! command -v cargo-fmt &> /dev/null; then \
		echo "Installing rustfmt..."; \
		rustup component add rustfmt; \
	fi
	@echo "✅ Installation complete"

## test: Run all tests with coverage
test: notify-start
	@echo "🧪 Running all tests..."
	cargo test --verbose
	@$(MAKE) notify-end

## test-unit: Run unit tests only
test-unit:
	@echo "🧪 Running unit tests..."
	cargo test --lib --verbose

## test-integration: Run integration tests only
test-integration:
	@echo "🧪 Running integration tests..."
	cargo test --test '*' --verbose

## test-e2e: Run end-to-end tests (doc tests)
test-e2e:
	@echo "🧪 Running e2e tests..."
	cargo test --doc --verbose

## test-file: Run tests for a specific module (usage: make test-file MODULE=module_name)
test-file:
	@echo "🧪 Running tests in module $(MODULE)..."
	cargo test $(MODULE) --verbose

## test-function: Run a specific test function (usage: make test-function FUNC=test_name)
test-function:
	@echo "🧪 Running test function $(FUNC)..."
	cargo test $(FUNC) --verbose -- --exact

## lint: Run linting checks
lint:
	@echo "🔍 Running linting checks..."
	cargo clippy -- -D warnings
	@echo "✅ Linting complete"

## format: Format code
format:
	@echo "🎨 Formatting code..."
	cargo fmt
	@echo "✅ Formatting complete"

## format-check: Check code formatting without modifying
format-check:
	@echo "🔍 Checking code formatting..."
	cargo fmt -- --check

## build: Build project
build: clean
	@echo "🏗️  Building project..."
	cargo build --release
	@echo "✅ Build complete"

## build-dev: Build project in development mode
build-dev:
	@echo "🏗️  Building project (dev)..."
	cargo build
	@echo "✅ Build complete"

## clean: Remove build artifacts and cache files
clean:
	@echo "🧹 Cleaning build artifacts..."
	cargo clean
	@echo "✅ Clean complete"

## check: Quick compilation check
check:
	@echo "🔍 Running cargo check..."
	cargo check

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
	@echo "Creating test in src/$(MODULE).rs"

## stage-3: Initial syntax check
stage-3:
	@echo "🔍 Stage 3: Initial Syntax Check"
	cargo check

## stage-4: Run smoke test (expect failure)
stage-4:
	@echo "🧪 Stage 4: Run Smoke Test (expect failure)"
	-cargo test test_$(FUNC)_smoke --verbose

## stage-5: Implementation complete
stage-5:
	@echo "✅ Stage 5: Implementation Complete"
	@echo "Function $(FUNC) implemented"

## stage-6: Expand test suite
stage-6:
	@echo "🧪 Stage 6: Expand Test Suite"
	@echo "Adding comprehensive tests..."

## stage-7: Final syntax check
stage-7:
	@echo "🔍 Stage 7: Final Syntax Check"
	cargo check
	cargo clippy -- -D warnings

## stage-8: Verify all tests pass
stage-8:
	@echo "🧪 Stage 8: Verify All Tests Pass"
	cargo test --verbose

## stage-9: Report completion
stage-9:
	@$(MAKE) notify-end TASK_NAME="$(FUNC)" STAGE=9
