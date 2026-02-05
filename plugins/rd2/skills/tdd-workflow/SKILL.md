---
name: tdd-workflow
description: Use when writing features, fixing bugs, refactoring, or generating tests. Enforces strict TDD with red-green-refactor cycle, test generation strategies, and testing patterns.
---

# Test-Driven Development Workflow

## Overview

TDD is NOT optional—it is the foundation of reliable software development.

**Iron Law:** NO production code without a failing test first. Write code before the test? Delete it. Start over.

## Quick Start

Red-Green-Refactor cycle:
1. **RED** - Write minimal test → **Verify** it fails correctly
2. **GREEN** - Write simplest code → **Verify** all tests pass
3. **REFACTOR** - Clean up while tests stay green
4. **Repeat** for next feature

## Workflows

### Workflow 1: New Feature (Classic TDD)

**Goal:** Implement feature with tests driving design.

1. Write one test for desired behavior
2. Verify test fails (RED)
3. Write simplest code to pass (GREEN)
4. Verify all tests pass
5. Refactor: clean duplication, improve names
6. Repeat for next behavior

**When:** New features, components, endpoints

### Workflow 2: Bug Fix (Regression-First TDD)

**Goal:** Fix bug with test preventing regression.

1. Write test that reproduces bug
2. Verify test fails (bug exists)
3. Write minimal fix
4. Verify test passes + all others pass
5. Check for similar issues, add tests

**When:** Bug reports, issues

### Workflow 3: Legacy Code (Characterization Tests)

**Goal:** Document existing behavior before modifying.

1. Write tests capturing current behavior
2. Verify tests pass (characterize system)
3. Make changes
4. Verify behavior preserved (tests catch regressions)

**When:** Adding to/modifying untested legacy code

### Workflow 4: API Endpoint (Contract-Based)

**Goal:** Define API contract with test doubles.

1. Write test defining request/response
2. Mock external dependencies
3. Implement endpoint to satisfy contract
4. Verify integration with real services

**When:** REST/GraphQL APIs, service boundaries

## Test Generation Strategies

| Scenario | Strategy |
|----------|----------|
| New feature | Classic TDD (Red-Green-Refactor) |
| Legacy code | Characterization Tests (document behavior first) |
| Bug fix | Regression-First TDD (test reproduces bug) |
| API endpoints | Contract-Based Testing (mock responses) |
| UI components | Visual + Interaction Tests |
| Database | Integration + Transaction Rollback |
| External services | Mock at service boundary |

See `advanced-testing` skill for property-based, mutation, accessibility testing.

### Mock Guidelines

**Mock at boundaries only:**

| Mock | Don't Mock |
|------|------------|
| Database queries | Internal utilities |
| API calls | Business logic |
| File system | Fast functions |
| Time/date | Deterministic code |

See `references/mock-patterns.md` for comprehensive patterns.

## Testing Patterns

### AAA Pattern (Arrange-Act-Assert)

```typescript
// Arrange - Set up inputs
const input = { value: 42 }
const expected = 84

// Act - Execute code
const result = doubleValue(input.value)

// Assert - Verify result
expect(result).toBe(expected)
```

### Test Data Builders

```python
class UserBuilder:
    def __init__(self):
        self.data = {"name": "Test User", "email": "test@example.com"}
    def with_name(self, name):
        self.data["name"] = name
        return self
    def as_admin(self):
        self.data["role"] = "admin"
        return self
    def build(self):
        return User(**self.data)

# Usage
user = UserBuilder().with_name("Alice").as_admin().build()
```

## Anti-Patterns

**Use gate functions before taking action:**

| Anti-Pattern | Gate Function |
|-------------|---------------|
| **Testing mocks** | "Am I testing real behavior or mock existence?" |
| **Test-only methods** | "Is this only used by tests?" → Put in test utilities |
| **Mocking without understanding** | "What side effects exist? Does test depend on them?" |
| **Incomplete mocks** | "Does this match real API schema completely?" |
| **Overmocking** | "Is this external or internal code?" → Don't mock internal |
| **Testing details** | "Would a user care about this?" → Test behavior instead |

### Example: Testing Mocks

```typescript
// ❌ BAD: Tests mock existence
expect(screen.getByTestId('sidebar-mock')).toBeInTheDocument();

// ✅ GOOD: Tests real behavior
expect(screen.getByRole('navigation')).toBeInTheDocument();
```

### Example: Incomplete Mocks

```typescript
// ❌ BAD: Missing fields
const mock = { status: 'success', data: { userId: '123' } };

// ✅ GOOD: Mirrors real API
const mock = {
  status: 'success',
  data: { userId: '123' },
  metadata: { requestId: 'req-789', timestamp: 1234567890 }
};
```

See `references/testing-anti-patterns.md` for comprehensive guide with gate functions.

## Verification Checklist

Before marking work complete:
- [ ] Every function has a test
- [ ] Watched each test fail before implementing
- [ ] Test failed for expected reason (not typo)
- [ ] Wrote minimal code to pass
- [ ] All tests pass, output pristine
- [ ] Edge cases and errors covered
- [ ] Tests independent, fast (< 30s unit tests)
- [ ] E2E tests cover critical flows only

## Continuous Testing

```bash
# Watch mode
pytest --watch        # Python
vitest --watch        # JavaScript

# Pre-commit hook
npm test && npm run lint

# CI/CD
npm test -- --coverage
```

## Why TDD Matters

"Skip TDD just this once?" That's rationalization.

TDD is pragmatic:
- Finds bugs before commit (faster than debugging after)
- Prevents regressions (tests catch breaks immediately)
- Documents behavior (tests show how to use code)
- Enables refactoring (change freely, tests catch breaks)

"Pragmatic" shortcuts = debugging in production = slower.

## Related Skills

- `test-coverage` - Coverage requirements and measurement
- `advanced-testing` - Mutation, property-based, accessibility testing
- `references/mock-patterns.md` - Mock design patterns
- `references/testing-anti-patterns.md` - Comprehensive anti-patterns guide

---

**Iron Law:** NO production code without a failing test first. Write code before the test? Delete it. Start over.
