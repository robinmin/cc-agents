# Test Coverage Guide

Complete guide to measuring, analyzing, and optimizing test coverage.

## Table of Contents

1. [Coverage Types](#coverage-types)
2. [Coverage Tools](#coverage-tools)
3. [Coverage Analysis](#coverage-analysis)
4. [Coverage Optimization](#coverage-optimization)
5. [Continuous Coverage](#continuous-coverage)

## Coverage Types

### Line Coverage

Percentage of executable lines that were executed.

**Pros:** Simple to understand
**Cons:** Misses branches and logic paths

### Branch Coverage

Percentage of code branches (if/else, switch/case) that were executed.

**Pros:** Catches more gaps than line coverage
**Cons:** More complex to measure

### Statement Coverage

Similar to line coverage but counts statements rather than lines.

**Pros:** Language-agnostic
**Cons:** Less granular than line coverage

### Function Coverage

Percentage of functions/methods that were called.

**Pros:** High-level view
**Cons:** Doesn't measure function internals

### Condition Coverage

Each boolean sub-expression evaluated to both true and false.

**Pros:** Most thorough for boolean logic
**Cons:** Complex to achieve

## Coverage Tools

### Python (pytest-cov)

```bash
# Install
pip install pytest-cov

# Run with coverage
pytest --cov=app --cov-report=html --cov-report=term-missing

# View HTML report
open htmlcov/index.html
```

**Configuration (.coveragerc):**
```ini
[run]
source = app
omit =
    */tests/*
    */__pycache__/*
    */venv/*

[report]
exclude_lines =
    pragma: no cover
    def __repr__
    raise AssertionError
    raise NotImplementedError
    if __name__ == .__main__.:
```

### JavaScript/TypeScript (Vitest)

```bash
# Run with coverage
vitest --coverage

# View coverage report
open coverage/index.html
```

**Configuration (vitest.config.ts):**
```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['**/node_modules/**', '**/tests/**']
    }
  }
})
```

### Go (built-in)

```bash
# Run with coverage
go test -coverprofile=coverage.out ./...

# View in browser
go tool cover -html=coverage.out

# Show percentage
go tool cover -func=coverage.out
```

### Java (JaCoCo)

```bash
# Run with Maven
mvn test jacoco:report

# View report
open target/site/jacoco/index.html
```

## Coverage Analysis

### Identifying Gaps

**1. Missing Branches:**
```python
# Uncovered
def process(value):
    if value > 0:  # Only tested with positive values
        return True
    else:          # This branch never executed
        return False
```

**2. Uncaught Exceptions:**
```python
# Uncovered
def divide(a, b):
    return a / b  # ZeroDivisionError never tested
```

**3. Edge Cases:**
```python
# Uncovered
def first(items):
    return items[0]  # Empty list never tested
```

### Coverage Reports

**Terminal output:**
```
Name                      Stmts   Miss  Cover   Missing
-------------------------------------------------------
myapp/__init__               2      0   100%
myapp/models                45      5    89%   23-27
myapp/views                 88     12    86%   45-50, 78-82
-------------------------------------------------------
TOTAL                      135     17    87%
```

**HTML report:**
- Green: Covered code
- Red: Uncovered code
- Yellow: Partially covered

## Coverage Optimization

### Prioritization Matrix

| Impact | High Effort | Low Effort |
|--------|-------------|------------|
| **High Impact** | Priority 1 | Priority 2 |
| **Low Impact** | Priority 4 | Priority 3 |

**Priority 1:** High impact, low effort → Do first
**Priority 2:** High impact, high effort → Schedule
**Priority 3:** Low impact, low effort → Fill gaps
**Priority 4:** Low impact, high effort → Consider skipping

### Meaningful Coverage

**Good (tests behavior):**
```python
def test_user_authentication():
    user = authenticate("alice", "password")
    assert user.is_authenticated
    assert user.token is not None
```

**Bad (just hits code):**
```python
def test_user_auth():
    authenticate("alice", "password")  # No assertions
```

### Coverage Anti-Patterns

1. **Coverage padding:** Tests that only touch code without assertions
2. **Happy path only:** Only testing success cases
3. **Implementation details:** Testing internal state instead of behavior
4. **Mock-heavy:** Over-mocking leads to false coverage

## Continuous Coverage

### Pre-Commit Hooks

```bash
#!/bin/bash
# .git/hooks/pre-commit

npm test -- --coverage --coverageReporters=text

COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')

if [ $COVERAGE -lt 70 ]; then
  echo "Coverage ($COVERAGE%) below threshold (70%)"
  exit 1
fi
```

### CI/CD Integration

```yaml
# GitHub Actions
- name: Run coverage
  run: npm test -- --coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

### Coverage Badges

```markdown
![Coverage](https://img.shields.io/badge/coverage-87%25-brightgreen)
```

## Coverage Targets by Project Type

| Project Type | Target Coverage |
|--------------|-----------------|
| Critical infrastructure | 90%+ |
| Production applications | 70-80% |
| Internal tools | 60-70% |
| Prototypes/MVPs | 50-60% |
