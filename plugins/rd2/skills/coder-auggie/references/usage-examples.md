# Usage Examples

## Basic Code Generation (Codebase-Aware)

### Simple Function Matching Project Patterns

```bash
python3 coder-auggie.py generate "Create a function to validate email addresses"
```

Auggie will analyze existing validation functions in your codebase and match their patterns.

### Class Implementation Following Conventions

```bash
python3 coder-auggie.py generate "Create a User class with name, email, and password fields"
```

Auggie will examine existing model classes and generate code that follows your project's conventions.

### API Endpoint Matching Existing Routes

```bash
python3 coder-auggie.py generate "Create a REST API endpoint for user registration" \
  --focus "correctness,security" \
  --output user-registration-api
```

Auggie will analyze existing API endpoints and generate consistent patterns.

## TDD Mode with Project Test Patterns

```bash
python3 coder-auggie.py generate "Implement a shopping cart with add, remove, and total methods" \
  --tdd \
  --output shopping-cart
```

Tests will follow your project's existing test patterns (file locations, naming, fixtures).

## Using Codebase Context

### Understanding Current Patterns First

```bash
# Ask about existing patterns
python3 coder-auggie.py run "What authentication pattern is used in this codebase?"

# Generate matching code
python3 coder-auggie.py generate "Add password reset functionality" \
  --output password-reset
```

### Integrating with Existing Services

```bash
python3 coder-auggie.py generate "Create an order notification service that integrates with the existing email and SMS services" \
  --focus "correctness,maintainability" \
  --output order-notifications
```

## Index Management

### Refresh After Major Changes

```bash
# Refresh the codebase index
python3 coder-auggie.py refresh-index

# Then generate with updated context
python3 coder-auggie.py generate "Add new feature based on recent changes"
```

## Workflow Examples

### Full Feature Development

```bash
# 1. Check availability
python3 coder-auggie.py check

# 2. Understand existing patterns
python3 coder-auggie.py run "How are services structured in this codebase?"

# 3. Generate implementation
python3 coder-auggie.py generate "Implement order processing service" \
  --tdd \
  --focus "correctness,testability" \
  --output order-service

# 4. Review output
cat docs/plans/order-service.md
```
