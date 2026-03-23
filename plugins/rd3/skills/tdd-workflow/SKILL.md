---
name: tdd-workflow
description: "Test-driven development with strict red-green-refactor cycle. For writing features, fixing bugs, and refactoring with tests first. Enforces: no production code without a failing test first."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-23
updated_at: 2026-03-23
platform: rd3
tags: [tdd, testing, red-green-refactor, engineering-core]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: engineering-core
  interactions:
    - knowledge-only
  openclaw:
    emoji: "🛠️"
see_also:
  - rd3:sys-debugging
  - rd3:sys-testing
  - rd3:advanced-testing
---

# rd3:tdd-workflow — Test-Driven Development

Structured TDD methodology with red-green-refactor cycle, behavior-first test design, and anti-pattern guidance.

**Key distinction:**
- **`tdd-workflow`** = development discipline (how to write code test-first)
- **`sys-debugging`** = investigation methodology (how to trace root causes)
- **`sys-testing`** = test operations (execution, coverage, gap-filling)

## When to Use

**Trigger phrases:** "write a feature", "implement", "add a new", "fix a bug", "refactor", "test-first", "TDD", "write tests first", "red-green", "characterization test", "contract test"

Load this skill when:
- Writing new features, components, or endpoints
- Fixing bugs and want regression tests
- Refactoring existing code
- Designing tests as part of implementation work
- Working with legacy code that needs characterization tests
- Building API contracts with external dependencies

Do not use this skill for routine test execution, coverage measurement, or post-hoc gap filling. Those belong to `rd3:sys-testing`.

## Overview

TDD is NOT optional — it is the foundation of reliable software development.

**Iron Law:** NO production code without a failing test first. Write code before the test? Delete it. Start over.

## Quick Start

Red-Green-Refactor cycle:

1. **RED** — Write minimal test → **Verify** it fails correctly
2. **GREEN** — Write simplest code → **Verify** all tests pass
3. **REFACTOR** — Clean up while tests stay green
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

See `rd3:sys-debugging` for root-cause investigation before writing any fix.

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

## Test Design Strategies

| Scenario | Strategy |
|----------|----------|
| New feature | Classic TDD (Red-Green-Refactor) |
| Legacy code | Characterization Tests (document behavior first) |
| Bug fix | Regression-First TDD (test reproduces bug) |
| API endpoints | Contract-Based Testing (mock responses) |
| UI components | Visual + Interaction Tests |
| Database | Integration + Transaction Rollback |
| External services | Mock at service boundary |

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
const input = { value: 42 };
const expected = 84;

// Act - Execute code
const result = doubleValue(input.value);

// Assert - Verify result
expect(result).toBe(expected);
```

### Test Data Builders

```python
# Python-specific pattern: fluent builder for test data
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
// BAD: Tests mock existence
expect(screen.getByTestId('sidebar-mock')).toBeInTheDocument();

// GOOD: Tests real behavior
expect(screen.getByRole('navigation')).toBeInTheDocument();
```

### Example: Incomplete Mocks

```typescript
// BAD: Missing fields
const mock = { status: 'success', data: { userId: '123' } };

// GOOD: Mirrors real API
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

"Skip TDD just this once?" That is rationalization.

TDD is pragmatic:
- Finds bugs before commit (faster than debugging after)
- Prevents regressions (tests catch breaks immediately)
- Documents behavior (tests show how to use code)
- Enables refactoring (change freely, tests catch breaks)

"Pragmatic" shortcuts = debugging in production = slower.

## Additional Resources

- `references/mock-patterns.md` — Mock design patterns and decision guide
- `references/testing-anti-patterns.md` — Comprehensive anti-patterns with gate functions

## Platform Notes

### Cross-Platform Usage

This skill is knowledge-only. The shell commands shown here are illustrative examples for common test runners and should be adapted to the actual runtime and tooling in the current repository.

### Permissions and Environment

The example commands assume standard local developer access to source files, test runners, and `git`. They should not require elevated permissions, but some commands may be unavailable unless the relevant language toolchain is installed locally.

---

**Iron Law:** NO production code without a failing test first. Write code before the test? Delete it. Start over.
