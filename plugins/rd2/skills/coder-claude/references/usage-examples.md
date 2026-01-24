# Usage Examples

## Basic Code Generation

### Simple Function

```bash
python3 coder-claude.py generate "Create a function to validate email addresses"
```

### Class Implementation

```bash
python3 coder-claude.py generate "Create a User class with name, email, and password fields, including validation"
```

### REST API Endpoint

```bash
python3 coder-claude.py generate "Create a REST API endpoint for user registration with input validation" \
  --focus "correctness,security" \
  --output user-registration-api
```

## TDD Mode Examples

### Test-First Development

```bash
python3 coder-claude.py generate "Implement a shopping cart with add, remove, and total methods" \
  --tdd \
  --output shopping-cart
```

### Complex Feature with TDD

```bash
python3 coder-claude.py generate "Implement a rate limiter with sliding window algorithm" \
  --tdd \
  --focus "correctness,performance" \
  --output rate-limiter
```

## Focus Area Examples

### Security-Focused Generation

```bash
python3 coder-claude.py generate "Create an authentication service with JWT tokens" \
  --focus "correctness,security"
```

### Performance-Focused Generation

```bash
python3 coder-claude.py generate "Implement a cache manager with LRU eviction" \
  --focus "performance,simplicity"
```

## Context-Aware Generation

### With Existing Code Context

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
python3 coder-claude.py generate "Add a password reset feature" \
  --context /tmp/context.md \
  --output password-reset
```

## Workflow Examples

### Full Feature Development

```bash
# 1. Check availability
python3 coder-claude.py check

# 2. Generate implementation
python3 coder-claude.py generate "Implement order processing service" \
  --tdd \
  --focus "correctness,testability" \
  --output order-service

# 3. Review output
cat .claude/plans/order-service.md
```
