# Usage Examples

## Basic Code Generation

### Simple Function

```bash
python3 coder-gemini.py generate "Create a function to validate email addresses"
```

### Class Implementation

```bash
python3 coder-gemini.py generate "Create a User class with name, email, and password fields, including validation"
```

### REST API Endpoint

```bash
python3 coder-gemini.py generate "Create a REST API endpoint for user registration with input validation" \
  --model gemini-2.5-pro \
  --focus "correctness,security" \
  --output user-registration-api
```

## TDD Mode Examples

### Test-First Development

```bash
python3 coder-gemini.py generate "Implement a shopping cart with add, remove, and total methods" \
  --tdd \
  --output shopping-cart
```

This generates:
1. Test suite first (failing tests)
2. Implementation to make tests pass
3. Refactoring suggestions

### Complex Feature with TDD

```bash
python3 coder-gemini.py generate "Implement a rate limiter with sliding window algorithm" \
  --tdd \
  --model gemini-2.5-pro \
  --focus "correctness,performance" \
  --output rate-limiter
```

## Focus Area Examples

### Security-Focused Generation

```bash
python3 coder-gemini.py generate "Create an authentication service with JWT tokens" \
  --focus "correctness,security" \
  --model gemini-2.5-pro
```

### Performance-Focused Generation

```bash
python3 coder-gemini.py generate "Implement a cache manager with LRU eviction" \
  --focus "performance,simplicity"
```

### Maintainability-Focused Generation

```bash
python3 coder-gemini.py generate "Create a plugin system with dependency injection" \
  --focus "maintainability,testability"
```

## Context-Aware Generation

### With Existing Code Context

```bash
# First, create a context file with relevant existing code
cat > /tmp/context.md << 'EOF'
## Existing Code Structure

The project uses:
- FastAPI for REST APIs
- SQLAlchemy for database
- Pydantic for validation

## Existing Models

```python
class User(Base):
    id: int
    email: str
    password_hash: str
```
EOF

# Generate with context
python3 coder-gemini.py generate "Add a password reset feature" \
  --context /tmp/context.md \
  --output password-reset
```

### With Architecture Constraints

```bash
cat > /tmp/constraints.md << 'EOF'
## Architecture Constraints

- Must be stateless (no session storage)
- Use repository pattern for data access
- All public methods must have type hints
- Maximum 50 lines per function
EOF

python3 coder-gemini.py generate "Create a user profile service" \
  --context /tmp/constraints.md \
  --focus "maintainability"
```

## Model Selection Examples

### Quick Prototype

```bash
python3 coder-gemini.py generate "Create a simple CLI calculator" \
  --model gemini-2.5-flash
```

### Complex Architecture

```bash
python3 coder-gemini.py generate "Design a microservices event bus with retry logic" \
  --model gemini-2.5-pro \
  --focus "correctness,maintainability"
```

## Workflow Examples

### Full Feature Development

```bash
# 1. Check availability
python3 coder-gemini.py check

# 2. Generate implementation
python3 coder-gemini.py generate "Implement order processing service" \
  --tdd \
  --focus "correctness,testability" \
  --output order-service

# 3. Review output
cat .claude/plans/order-service.md

# 4. Iterate if needed
python3 coder-gemini.py generate "Add cancellation support to order service" \
  --context .claude/plans/order-service.md \
  --output order-service-v2
```

### Incremental Enhancement

```bash
# Generate base implementation
python3 coder-gemini.py generate "Create basic file upload handler" \
  --output file-upload-v1

# Add validation
python3 coder-gemini.py generate "Add file type and size validation to file upload" \
  --context .claude/plans/file-upload-v1.md \
  --output file-upload-v2

# Add async processing
python3 coder-gemini.py generate "Convert file upload to async with progress tracking" \
  --context .claude/plans/file-upload-v2.md \
  --output file-upload-v3
```

## Integration with Super-Coder Workflow

### Standard Workflow

1. **Clarify**: Understand requirements
2. **Generate**: Create initial implementation
3. **Validate**: Run generated tests
4. **Refactor**: Improve based on feedback
5. **Report**: Document the result

```bash
# Step 2: Generate
python3 coder-gemini.py generate "Requirements from step 1" \
  --tdd \
  --output feature-name

# Step 3: Validate (run generated tests)
# Commands are in the output file

# Step 4: Refactor (if needed)
python3 coder-gemini.py generate "Refactor to improve X" \
  --context .claude/plans/feature-name.md \
  --focus "simplicity,maintainability"
```
