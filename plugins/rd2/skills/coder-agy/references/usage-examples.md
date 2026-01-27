# Usage Examples

## Table of Contents

- [Basic Code Generation](#basic-code-generation)
  - [Simple Function](#simple-function)
  - [With Specific Mode](#with-specific-mode)
  - [Complex Implementation](#complex-implementation)
- [TDD Mode Examples](#tdd-mode-examples)
  - [Test-First Development](#test-first-development)
  - [With Specific Mode and TDD](#with-specific-mode-and-tdd)
- [Mode Selection Examples](#mode-selection-examples)
  - [Quick Question (ask mode)](#quick-question-ask-mode)
  - [Code Editing (edit mode)](#code-editing-edit-mode)
  - [Complex Task (agent mode - default)](#complex-task-agent-mode---default)
- [File Context Examples](#file-context-examples)
  - [With File Context](#with-file-context)
  - [Multiple Files Context](#multiple-files-context)
- [Context-Aware Generation](#context-aware-generation)
  - [With Context File](#with-context-file)
- [Workflow Examples](#workflow-examples)
  - [Full Feature Development](#full-feature-development)
  - [Multi-File Context Workflow](#multi-file-context-workflow)
  - [Edit Mode for Refactoring](#edit-mode-for-refactoring)
- [Model Comparison](#model-comparison)
- [Interactive Development](#interactive-development)
  - [Iterative Development with File Context](#iterative-development-with-file-context)
  - [Code Review and Iteration](#code-review-and-iteration)
- [Troubleshooting Examples](#troubleshooting-examples)
  - [Check Installation](#check-installation)
  - [Test Basic Functionality](#test-basic-functionality)
  - [Generate with Verbose Output](#generate-with-verbose-output)

---

## Basic Code Generation

### Simple Function

```bash
python3 coder-agy.py generate "Create a function to validate email addresses"
```

### With Specific Mode

```bash
python3 coder-agy.py generate "Create a User class with validation" \
  --mode agent \
  --output user-class
```

### Complex Implementation

```bash
python3 coder-agy.py generate "Create a REST API endpoint for user registration" \
  --mode agent \
  --output user-registration-api
```

## TDD Mode Examples

### Test-First Development

```bash
python3 coder-agy.py generate "Implement a shopping cart with add, remove, and total methods" \
  --output shopping-cart
```

### With Specific Mode and TDD

```bash
python3 coder-agy.py generate "Implement a rate limiter with sliding window algorithm" \
  --mode agent \
  --output rate-limiter
```

## Mode Selection Examples

### Quick Question (ask mode)

```bash
python3 coder-agy.py run "What's the best way to handle async errors in Python?"
```

### Code Editing (edit mode)

```bash
python3 coder-agy.py run "Refactor this function to be more efficient" \
  --mode edit
```

### Complex Task (agent mode - default)

```bash
python3 coder-agy.py generate "Design a microservices event bus with retry logic" \
  --mode agent \
  --output event-bus
```

## File Context Examples

### With File Context

```bash
# Add specific files as context for generation
python3 coder-agy.py generate "Add error handling to the API layer" \
  --add-file src/api/user.py \
  --add-file src/api/auth.py \
  --output api-error-handling
```

### Multiple Files Context

```bash
python3 coder-agy.py generate "Optimize the database queries in this module" \
  --mode agent \
  --add-file src/db/queries.py \
  --add-file src/db/models.py \
  --add-file src/db/schema.sql \
  --output db-optimization
```

## Context-Aware Generation

### With Context File

```bash
# Create context file
cat > /tmp/context.md << 'EOF'
## Existing Code Structure

The project uses:
- FastAPI for REST APIs
- SQLAlchemy for database
- Pydantic for validation
EOF

# Generate with context
python3 coder-agy.py generate "Add a password reset feature" \
  --context /tmp/context.md \
  --output password-reset
```

## Workflow Examples

### Full Feature Development

```bash
# 1. Check availability
python3 coder-agy.py check

# 2. Generate implementation
python3 coder-agy.py generate "Implement order processing service" \
  --mode agent \
  --output order-service

# 3. Review output
cat docs/plans/order-service.md
```

### Multi-File Context Workflow

```bash
# 1. Generate with multiple files as context
python3 coder-agy.py generate "Refactor authentication to use JWT tokens" \
  --mode agent \
  --add-file src/auth/login.py \
  --add-file src/auth/middleware.py \
  --add-file src/models/user.py \
  --output jwt-auth

# 2. Review the generated plan
cat docs/plans/jwt-auth.md
```

### Edit Mode for Refactoring

```bash
# Use edit mode for code refactoring
python3 coder-agy.py run "Refactor the PaymentProcessor class to use strategy pattern" \
  --mode edit \
  --add-file src/payment/processor.py
```

## Model Comparison

Compare different approaches by using different modes:

```bash
# Quick answer (ask mode)
python3 coder-agy.py run "How should I implement caching?" \
  --mode ask

# Detailed implementation (agent mode)
python3 coder-agy.py generate "Implement a caching layer with Redis" \
  --mode agent \
  --output redis-cache
```

## Interactive Development

### Iterative Development with File Context

```bash
# Start with a base implementation
python3 coder-agy.py generate "Create a basic REST API for users" \
  --mode agent \
  --output users-api

# Add more features with existing files as context
python3 coder-agy.py generate "Add pagination and filtering to the users API" \
  --mode agent \
  --add-file docs/plans/users-api.md \
  --output users-api-enhanced
```

### Code Review and Iteration

```bash
# Generate initial implementation
python3 coder-agy.py generate "Implement a binary search tree" \
  --mode agent \
  --output bst

# Use ask mode to review and understand the code
python3 coder-agy.py run "Explain how the BST deletion algorithm works" \
  --mode ask
```

## Troubleshooting Examples

### Check Installation

```bash
# Verify Antigravity CLI is available
python3 coder-agy.py check -v
```

### Test Basic Functionality

```bash
# Test a simple prompt
python3 coder-agy.py run "Write a hello world function in Python"
```

### Generate with Verbose Output

```bash
# See detailed output including file paths
python3 coder-agy.py generate "Create a simple CLI tool" \
  --mode agent \
  --output cli-tool \
  --verbose
```
