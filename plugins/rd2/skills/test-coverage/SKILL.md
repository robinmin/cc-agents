---
name: test-coverage
description: Use when measuring test coverage, setting coverage targets, or optimizing coverage strategy. Covers industry standards, coverage analysis, and module-specific targets.
triggers:
  - test coverage
  - coverage report
  - coverage target
  - measure coverage
  - optimize coverage
  - coverage gap
  - code coverage percentage
---

# Test Coverage Strategy

## Overview

Test coverage measures code executed by tests. Use it to identify testing gaps and guide test development, not as a primary goal.

## Quick Start

1. Run coverage report for your language
2. Identify gaps in covered code
3. Add tests for uncovered critical paths
4. Re-run report to verify improvement

## Workflows

### Workflow 1: Initial Coverage Setup

**Goal:** Establish baseline coverage for new or existing projects.

1. Install coverage tool for your language (see [Tools](#coverage-tools-by-language))
2. Run initial coverage report
3. Record baseline percentage
4. Set target: 70-80% overall, higher for critical paths
5. Configure CI/CD integration (see [Continuous Monitoring](#continuous-coverage-monitoring))

### Workflow 2: Coverage Gap Analysis

**Goal:** Systematically identify and prioritize uncovered code.

1. Generate HTML coverage report
2. Review uncovered lines by module type
3. Categorize gaps by priority:
   - **High:** Domain logic, security, payments → 90-100% target
   - **Medium:** Services, utilities → 70-80% target
   - **Low:** Configuration, DTOs → 50-70% target
4. Identify dead code for removal
5. Create test plan for high-priority gaps

### Workflow 3: Coverage Improvement Cycle

**Goal:** Incrementally improve coverage while maintaining test quality.

For each uncovered critical path:
1. Determine why uncovered: dead code, hard-to-reach, or oversight?
2. If dead code → delete it
3. If hard-to-reach → refactor for testability
4. Write test that verifies behavior, not just coverage
5. Re-run coverage report
6. Repeat until target reached

**Anti-pattern check:** Ensure each test has meaningful assertions about behavior, not just touching code.

## Coverage Standards

### Targets by Use Case

| Coverage | Use Case |
|----------|----------|
| **70-80%** | Industry standard for production apps |
| **90%+** | Natural outcome of proper TDD |
| **100%** | NOT recommended (false security) |

### Targets by Module Type

| Module | Target | Rationale |
|--------|--------|-----------|
| Domain logic | 90-100% | Core business rules |
| Services/Use cases | 85-95% | Application behavior |
| Controllers/API | 70-80% | Framework handles some paths |
| Utilities | 70-80% | Simple functions |
| Configuration | 50-70% | Hard to test, low risk |
| DTOs/Models | 50-70% | Data transfer, minimal logic |

## Coverage Analysis

### Generate Report

```bash
# Python
pytest --cov=app --cov-report=html

# JavaScript/TypeScript
vitest --coverage

# Go
go test -coverprofile=coverage.out && go tool cover -html=coverage.out

# Java
mvn test jacoco:report

# Ruby
COVERAGE=true rspec
```

### Gap Patterns

| Pattern | Example |
|---------|---------|
| Missing branches | Uncovered if/else, switch cases |
| Uncaught exceptions | Error handlers not exercised |
| Edge cases | Empty/null inputs, boundaries |
| Dead code | Commented/unreachable code |

## Coverage Optimization

### Priority Framework

| Priority | Coverage | Examples |
|----------|----------|----------|
| High | 90-100% | Domain logic, payments, auth, validation |
| Medium | 70-80% | API endpoints, services, utilities |
| Low | 50-70% | Configuration, DTOs, getters/setters |

### Gap Resolution

For each uncovered line:
- Dead code? → Delete
- Defensive code? → Test error case
- Branch? → Add path test
- Hard to reach? → Refactor for testability

## Anti-Patterns

### Coverage Without Assertions

```python
# ❌ BAD: Touches code, tests nothing
def test_getter():
    obj = MyClass()
    obj.get_value()

# ✅ GOOD: Verifies behavior
def test_getter_returns_value():
    assert MyClass(value=42).get_value() == 42
```

### Happy Path Only

```python
# ❌ BAD: Missing edge cases
def test_divide():
    assert divide(10, 2) == 5

# ✅ GOOD: Includes boundary cases
def test_divide():
    assert divide(10, 2) == 5
    assert divide(-10, 2) == -5
    with pytest.raises(ZeroDivisionError):
        divide(10, 0)
```

### Testing Implementation Details

```python
# ❌ BAD: Tests private state
def test_internal():
    obj.process()
    assert obj._counter == 5

# ✅ GOOD: Tests observable behavior
def test_result():
    assert obj.process().status == "completed"
```

## Continuous Monitoring

### Pre-Commit Hook

```bash
#!/bin/bash
npm test -- --coverage --coverageReporters=text
COVERAGE=$(npm run --silent get-coverage-percentage)
if [ $COVERAGE -lt 70 ]; then
  echo "Coverage ($COVERAGE%) below 70% threshold"
  exit 1
fi
```

### CI/CD Gate

```yaml
- name: Coverage check
  run: |
    npm test -- --coverage
    COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
    if (( $(echo "$COVERAGE < 70" | bc -l) )); then exit 1; fi
```

## Tools by Language

| Language | Tool | Command |
|----------|------|---------|
| Python | pytest-cov | `pytest --cov=app` |
| JavaScript/TypeScript | Vitest | `vitest --coverage` |
| Go | built-in | `go test -cover` |
| Java | JaCoCo | `mvn test jacoco:report` |
| Ruby | SimpleCov | `COVERAGE=true rspec` |

See `references/coverage-guide.md` for detailed configuration.

## When to Target High Coverage

**90%+ for:** Critical infrastructure, regulated industries, core libraries
**70-80% for:** Production applications, APIs, services
**50-70% for:** Prototypes, internal tools, configuration code

## Success Metrics

- [ ] Coverage report runs successfully
- [ ] Meets target (70-80% overall, 90%+ for critical paths)
- [ ] Tests verify behavior, not just touch code
- [ ] Coverage trend stable or increasing
- [ ] Dead code removed

## Related Skills

- `rd2:tdd-workflow` - Core TDD methodology
- `advanced-testing` - Mutation testing, property-based testing
- `references/coverage-guide.md` - Detailed analysis techniques

---

**Remember:** Coverage is a tool for finding gaps, not a goal itself. Focus on meaningful tests that verify behavior.
