---
name: sys-testing
description: "Test execution, coverage measurement, gap analysis, and iterative test extension workflows for running existing tests, measuring what paths are untested, identifying coverage gaps, and pragmatically extending test suites with targeted tests. Trigger when: running tests, measuring coverage, finding untested code paths, or knowing what to test but not how to structure tests for coverage."
license: Apache-2.0
version: 1.1.0
created_at: 2026-03-23
updated_at: 2026-03-23
tags: [testing, coverage, test-execution, gap-analysis, engineering-core]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: engineering-core
  interactions:
    - knowledge-only
  openclaw:
    emoji: "🛠️"
see_also:
  - rd3:sys-testing/coverage-analysis
  - rd3:sys-testing/test-generation-patterns
---

# rd3:sys-testing — Test Operations

Test execution, coverage measurement, gap analysis, and pragmatic test extension. Focuses on **running tests**, **measuring what is not tested**, and **iteratively filling gaps** — not on writing tests first (that is `rd3:tdd-workflow`) or debugging failures (that is `rd3:sys-debugging`).

## Overview

**What it does:** Runs existing tests, measures coverage, identifies gaps, and iteratively fills them with targeted tests.

**Not for:** writing tests before code (use `rd3:tdd-workflow`) or debugging failing tests (use `rd3:sys-debugging`).

## When to Use

Use this skill when:

- Running existing test suites and interpreting results
- Measuring code coverage to identify untested paths
- Knowing what code exists but not what tests cover it
- Extending test suites with targeted tests for specific gaps
- Setting or evaluating coverage thresholds for a project

**Not for:** writing tests before code (use `rd3:tdd-workflow`) or debugging failing tests (use `rd3:sys-debugging`).

## Quick Start

1. **Run tests** → `bun test`, `npx vitest run --coverage`, `npx jest --coverage`, or `pytest --cov=src --cov-report=term-missing`
2. **Read coverage** → Identify lines 23-27, 78-82 as uncovered gaps
3. **Categorize gaps** → Error paths, edge cases, complex logic, external deps
4. **Generate targeted tests** → Fill highest-priority gaps first
5. **Iterate** → Maximum 3 attempts before escalating

## Core Distinction

| Skill | Focus |
|-------|-------|
| **`rd3:tdd-workflow`** | Write tests FIRST, then implement to pass |
| **`rd3:sys-debugging`** | Investigate WHY a test fails or bug occurs |
| **`rd3:sys-testing`** | Run tests, measure coverage, fill gaps |

**Key principle:** `sys-testing` assumes tests already exist. It is about verification and extension, not creation.

## Workflows

### Workflow 1: Test Execution and Verification

Run tests and interpret results across languages.

**Phase 0: Detect Test Command**

Auto-detect the test command from project structure when no explicit command is provided:

| Detection Pattern | Test Framework | Coverage Command |
|-----------------|----------------|-----------------|
| Explicit user command provided | User-specified runner | Use the exact command first |
| `bun.lock` or `bun.lockb` present | bun test | `bun test --coverage` |
| `package.json` + `vitest` | vitest | `npx vitest run --coverage` |
| `package.json` + `jest` | jest | `npx jest --coverage` |
| `pytest` in command or `pyproject.toml` | pytest | `pytest --cov=src --cov-report=term-missing` |
| `go.mod` present | go test | `go test -coverprofile=coverage.out ./...` |
| `Cargo.toml` present | cargo test | `cargo tarpaulin --out Stdout` |
| `pyproject.toml` without pytest | pytest | `pytest --cov=src --cov-report=term-missing` |
| `package.json` without jest/vitest | npm test | `npm test -- --coverage` |

**Phase 1: Execute Tests**

```bash
# Python
pytest -v --tb=short

# TypeScript/JavaScript
npx vitest run --coverage

# Jest
npx jest --coverage

# Go
go test -v ./...

# Bun
bun test
```

**Phase 2: Interpret Results**

| Result | Action |
|--------|--------|
| All pass | Coverage measurement phase |
| Failures | Debug first → `rd3:sys-debugging` |
| Timeout/hang | Investigate async ordering → `rd3:sys-debugging` |
| Flaky | Identify race conditions → `rd3:sys-debugging` |

**Phase 3: Measure Coverage**

```bash
# Python
pytest --cov=src --cov-report=term-missing

# TypeScript
npx vitest --coverage

# Jest
npx jest --coverage

# Go
go test -coverprofile=coverage.out ./... && go tool cover -func=coverage.out

# Bun
bun test --coverage
```

**Phase 4: Gap Analysis**

Review coverage report for:
- Lines 23-27: Uncovered error handling
- Lines 78-82: Uncovered edge cases
- Branch coverage gaps in conditional logic

### Workflow 2: Coverage-Driven Gap Filling

Iteratively improve coverage by targeting untested paths.

**Phase 1: Identify Gaps**

Parse coverage output to find:
- Missing branches (if/else paths not taken)
- Uncaught exceptions (error paths not executed)
- Edge cases (boundary conditions untested)

**Phase 2: Categorize**

| Gap Type | Example | Strategy |
|----------|---------|----------|
| Error paths | `except` blocks | Add error condition tests |
| Edge cases | boundary conditions | Add boundary value tests |
| Complex logic | nested conditionals | Add parameterized tests |
| External deps | API calls, files | Add mock-based tests |

**Phase 3: Generate Targeted Tests**

Focus on high-priority gaps first:
1. Error paths and exception handlers
2. Complex conditional branches
3. Edge cases and boundary conditions

**Phase 4: Verify and Iterate**

1. Run tests with coverage
2. Compare before/after coverage
3. If gap remains after 3 iterations → escalate

**Maximum iterations: 3.** If coverage plateaus after 3 attempts, escalate rather than loop indefinitely.

**Escalation Protocol**

When 3 gap-filling iterations are exhausted without meeting the coverage target:

1. **Document the untestable code** — Some gaps are unreachable by design (impossible states, hardware-specific paths)
2. **Adjust the target downward** — A realistic target for the given code is better than an unattainable one
3. **Report the status** — Note which gaps remain, which are documented-skipped, and the final coverage achieved

**Escalation Report Format:**

```markdown
## Coverage Escalation: {Target}

**Goal:** {threshold}% coverage on {testee}
**Achieved:** {actual}% after 3 iterations
**Remaining gaps:** {count}

**Gap summary:**
- {file}:{lines} — {reason: dead code / external dep / refactoring needed}

**Recommendation:**
- Adjust threshold to {realistic}%
- OR defer gap to manual testing
- OR refactor for testability (architectural change)
```

### Workflow 3: Pragmatic Test Extension

Extend existing test suites without over-engineering.

**Guiding principle:** Coverage is a baseline metric, not a quality guarantee. High coverage with weak assertions is worthless.

**Coverage targets by project type:**

| Project Type | Target | Rationale |
|-------------|--------|-----------|
| Standard production | 70-75% | Balance effort and reliability |
| Critical infrastructure | 80-85% | Higher stakes justify more testing |
| Security-sensitive | 85-90% | Security bugs are expensive |
| Library / public API | 85-90% | Public contract requires rigor |
| Regulated systems | 90-95% | Compliance requirements |
| UI components | 70-80% | Visual testing also matters |
| Scripts / utilities | 60-70% | Lower risk, one-off usage |

**Coverage targets by module type:**

| Module | Target | Rationale |
|--------|--------|-----------|
| Domain logic | 90-100% | Core business rules |
| Services / Use cases | 85-95% | Application behavior |
| Controllers / API | 70-80% | Framework handles some paths |
| Utilities | 70-80% | Simple functions |
| Configuration | 50-70% | Hard to test, low risk |
| DTOs / Models | 50-70% | Data transfer, minimal logic |

**CI/CD integration:**

```yaml
# GitHub Actions — coverage gate
- name: Run tests with coverage
  run: npx vitest run --coverage

- name: Check coverage threshold
  run: |
    COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
    if (( $(echo "$COVERAGE < 75" | bc -l) )); then
      echo "Coverage ($COVERAGE%) below threshold (75%)"
      exit 1
    fi
```

**When to accept lower coverage:**

- Generated code (protobuf, OpenAPI clients) — tested elsewhere
- Simple wrappers delegating to tested code — no new logic
- Impossible states with documented rationale
- External constraints (hardware-specific, third-party limitations)

**Coverage anti-patterns to avoid:**

1. **Coverage padding** — tests that only touch code without assertions
2. **Happy path only** — only testing success cases
3. **Implementation details** — testing internal state instead of behavior
4. **Over-mocking** — mocks hide real behavior gaps

## Blocker Detection

### Blocker Types

| Blocker | Indicators | Resolution |
|---------|-----------|------------|
| **Missing dependencies** | `ModuleNotFoundError`, import failures | Install dependencies, configure path |
| **Wrong working directory** | Test files not found | `cd` to project root before running |
| **No test framework** | Command not found | Install test framework or configure PATH |
| **Coverage misconfigured** | Source path not found | Verify `--cov` or `--coverage` source path matches project layout |
| **External dependency down** | Network errors in tests | Mock the external call or skip those tests |
| **Fixture pollution** | Cross-test contamination | Clean fixtures between tests |

### Blocker Documentation

When a blocker prevents test execution:

```markdown
## Test Blocker: {description}

**Type:** {blocker type from table above}
**Impact:** Cannot measure coverage / Cannot run tests

**Resolution:**
1. {specific action}
2. {specific action}

**Confidence:** HIGH (blocker is deterministic)
```

Before running tests:

- [ ] Environment set up correctly (dependencies installed, database running)
- [ ] Test configuration matches target environment
- [ ] Fixtures and mocks are clean (no cross-test contamination)
- [ ] Coverage measurement configured for correct source paths

## Post-Execution Checklist

After running tests:

- [ ] All failures are new or expected (not pre-existing)
- [ ] Coverage report shows meaningful gaps (not just untested trivial code)
- [ ] Flaky tests identified and tracked separately
- [ ] Iteration count tracked (max 3 before escalation)

## Integration with Other Skills

| Scenario | Use |
|----------|-----|
| Test fails unexpectedly | `rd3:sys-debugging` first |
| Need to write tests for new code | `rd3:tdd-workflow` first |
| Coverage gaps from untested logic | `rd3:sys-testing` gap filling |
| Flaky async tests | `rd3:sys-debugging` async patterns |

## Reference Files

- `references/coverage-analysis.md` — Interpreting coverage reports, gap categorization, coverage vs. quality tradeoffs
- `references/test-generation-patterns.md` — Language-specific test patterns for extending test suites

## Additional Resources

- **[MDN: JavaScript Testing](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Test_environment)** — Test environment setup
- **[Pytest Docs: Coverage](https://docs.pytest.org/en/6.2.x/pytest-cov/)** — pytest-cov configuration
- **[Vitest: Coverage](https://vitest.dev/guide/coverage.html)** — Vitest coverage options
- **[Go: Test Coverage](https://go.dev/blog/cover)** — Go coverage tooling

**Remember:** Coverage measures execution, not correctness. A 100% covered test with no assertions is worthless. Verify that tests actually assert behavior.

## Sources

- [Qt.io: Practical Guide to AI-Generated Unit Tests](https://www.qt.io/quality-assurance/blog/a-practical-guide-to-generating-unit-tests-with-ai-code-assistants) — AI-assisted test generation workflow
- [OutSight AI: Why Coverage Lies](https://medium.com/@outsightai/the-truth-about-ai-generated-unit-tests-why-coverage-lies-and-mutations-dont-fcd5b5f6a267) — Coverage vs. mutation testing
- [Nimble Approach: Mutation Testing Essential](https://nimbleapproach.com/blog/why-mutation-testing-is-essential-for-trustworthy-aI/) — Test quality measurement
- [Mammoth AI: High Coverage Best Practices](https://mammoth-ai.com/best-practices-for-achieving-high-test_coverage-with-ai-assisted-testing/) — Coverage targets and effort tradeoffs
