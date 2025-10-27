# Makefile for Go projects using modern tooling
# Tools: go (standard tooling), golangci-lint (linting), go test (testing)

.PHONY: help install test test-unit test-integration test-e2e lint format build clean notify-start notify-end

# Default target
.DEFAULT_GOAL := help

# Project configuration
GO_MODULE := $(shell go list -m)
BIN_DIR := bin
CMD_DIR := cmd
PKG_DIRS := $(shell go list ./... | grep -v /vendor/)

## help: Display this help message
help:
	@echo "Available targets:"
	@grep -E '^##' $(MAKEFILE_LIST) | sed 's/^## /  /' | column -t -s ':'

## install: Install dependencies and tools
install:
	@echo "📦 Installing dependencies..."
	go mod download
	go mod verify
	@if ! command -v golangci-lint &> /dev/null; then \
		echo "Installing golangci-lint..."; \
		go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest; \
	fi
	@echo "✅ Installation complete"

## test: Run all tests with coverage
test: notify-start
	@echo "🧪 Running all tests..."
	go test -v -race -coverprofile=coverage.out -covermode=atomic ./...
	go tool cover -html=coverage.out -o coverage.html
	@$(MAKE) notify-end

## test-unit: Run unit tests only
test-unit:
	@echo "🧪 Running unit tests..."
	go test -v -race -short ./...

## test-integration: Run integration tests only
test-integration:
	@echo "🧪 Running integration tests..."
	go test -v -race -run Integration ./...

## test-e2e: Run end-to-end tests
test-e2e:
	@echo "🧪 Running e2e tests..."
	go test -v -race -run E2E ./...

## test-file: Run tests for a specific package (usage: make test-file PKG=./path/to/package)
test-file:
	@echo "🧪 Running tests in $(PKG)..."
	go test -v -race -coverprofile=coverage.out $(PKG)

## test-function: Run a specific test function (usage: make test-function PKG=./pkg FUNC=TestName)
test-function:
	@echo "🧪 Running test function $(FUNC) in $(PKG)..."
	go test -v -race -run ^$(FUNC)$$ $(PKG)

## lint: Run linting checks
lint:
	@echo "🔍 Running linting checks..."
	go vet ./...
	golangci-lint run ./...
	@echo "✅ Linting complete"

## format: Format code
format:
	@echo "🎨 Formatting code..."
	gofmt -s -w .
	go mod tidy
	@echo "✅ Formatting complete"

## build: Build binary
build: clean
	@echo "🏗️  Building binary..."
	@mkdir -p $(BIN_DIR)
	go build -o $(BIN_DIR)/ ./$(CMD_DIR)/...
	@echo "✅ Build complete"

## clean: Remove build artifacts and cache files
clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf $(BIN_DIR)
	go clean -cache -testcache -modcache
	rm -f coverage.out coverage.html
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
	@echo "Creating test file: $(PKG)/$(FUNC)_test.go"

## stage-3: Initial syntax check
stage-3:
	@echo "🔍 Stage 3: Initial Syntax Check"
	go vet $(PKG)/$(FUNC)_test.go
	gofmt -l $(PKG)/$(FUNC)_test.go

## stage-4: Run smoke test (expect failure)
stage-4:
	@echo "🧪 Stage 4: Run Smoke Test (expect failure)"
	-go test -v -run ^Test$(FUNC)Smoke$$ $(PKG)

## stage-5: Implementation complete
stage-5:
	@echo "✅ Stage 5: Implementation Complete"
	@echo "Function $(FUNC) implemented in $(PKG)"

## stage-6: Expand test suite
stage-6:
	@echo "🧪 Stage 6: Expand Test Suite"
	@echo "Adding comprehensive tests..."

## stage-7: Final syntax check
stage-7:
	@echo "🔍 Stage 7: Final Syntax Check"
	go vet $(PKG)/$(FUNC).go $(PKG)/$(FUNC)_test.go
	gofmt -l $(PKG)/$(FUNC).go $(PKG)/$(FUNC)_test.go

## stage-8: Verify all tests pass
stage-8:
	@echo "🧪 Stage 8: Verify All Tests Pass"
	go test -v -race -coverprofile=coverage.out $(PKG)

## stage-9: Report completion
stage-9:
	@$(MAKE) notify-end TASK_NAME="$(FUNC)" STAGE=9
