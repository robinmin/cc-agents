# Usage Examples

## Basic Code Generation

### Simple Function

```bash
python3 coder-opencode.py generate "Create a function to validate email addresses"
```

### With Specific Model

```bash
python3 coder-opencode.py generate "Create a User class with validation" \
  --model gpt-4o \
  --output user-class
```

### Complex Implementation

```bash
python3 coder-opencode.py generate "Create a REST API endpoint for user registration" \
  --model gpt-4-turbo \
  --focus "correctness,security" \
  --output user-registration-api
```

## TDD Mode Examples

### Test-First Development

```bash
python3 coder-opencode.py generate "Implement a shopping cart with add, remove, and total methods" \
  --tdd \
  --output shopping-cart
```

### With Specific Model and TDD

```bash
python3 coder-opencode.py generate "Implement a rate limiter with sliding window algorithm" \
  --tdd \
  --model gpt-4-turbo \
  --focus "correctness,performance" \
  --output rate-limiter
```

## Model Selection Examples

### Fast Generation (GPT-4o)

```bash
python3 coder-opencode.py generate "Create a simple CLI calculator" \
  --model gpt-4o
```

### Deep Analysis (Claude)

```bash
python3 coder-opencode.py generate "Design a microservices event bus with retry logic" \
  --model claude-3-opus \
  --focus "correctness,maintainability"
```

### Privacy-Sensitive (Local Model)

```bash
python3 coder-opencode.py generate "Create an encryption utility" \
  --model local/codellama \
  --focus "security"
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
python3 coder-opencode.py generate "Add a password reset feature" \
  --context /tmp/context.md \
  --output password-reset
```

## Workflow Examples

### Full Feature Development

```bash
# 1. Check availability
python3 coder-opencode.py check

# 2. Generate implementation
python3 coder-opencode.py generate "Implement order processing service" \
  --tdd \
  --model gpt-4-turbo \
  --focus "correctness,testability" \
  --output order-service

# 3. Review output
cat .claude/plans/order-service.md
```

### Multi-Model Comparison

```bash
# Generate with different models to compare approaches
python3 coder-opencode.py generate "Implement caching layer" \
  --model gpt-4o \
  --output cache-gpt4o

python3 coder-opencode.py generate "Implement caching layer" \
  --model claude-3-sonnet \
  --output cache-claude

# Compare the outputs
diff .claude/plans/cache-gpt4o.md .claude/plans/cache-claude.md
```
