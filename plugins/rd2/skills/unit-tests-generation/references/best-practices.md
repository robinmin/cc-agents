# Research-Based Testing Best Practices

## Overview

This document compiles research-based best practices for AI-assisted unit test generation, synthesized from industry sources and validated through cross-referencing.

## Key Findings from Industry Research (2025)

### 1. AI Tools Achieve High Coverage Quickly

**Source:** [Qt.io: Practical Guide to AI-Generated Unit Tests](https://www.qt.io/quality-assurance/blog/a-practical-guide-to-generating-unit-tests-with-ai-code-assistants)

**Key Insights:**
- Cursor, Copilot, and specialized AI agents achieve 80-90% coverage efficiently
- AI-generated tests reduce manual testing time by 60-80%
- Test quality improves when AI follows structured workflows

**Recommendation:**
- Use AI for initial test generation
- Focus manual effort on edge cases and business logic validation
- Iterate with coverage feedback

### 2. Coverage Alone is Misleading

**Source:** [OutSight AI: Why Coverage Lies](https://medium.com/@outsightai/the-truth-about-ai-generated-unit-tests-why-coverage-lies-and-mutations-dont-fcd5b5f6a267)

**Key Insights:**
- High coverage doesn't guarantee bug-free code
- AI may generate tests that pass but miss critical scenarios
- Traditional metrics don't measure test effectiveness

**Recommendation:**
- Use coverage as a baseline, not a quality metric
- Combine with mutation testing for quality assessment
- Review AI-generated tests for business logic correctness

### 3. Mutation Testing is Superior

**Source:** [Nimble Approach: Mutation Testing Essential](https://nimbleapproach.com/blog/why-mutation-testing-is-essential-for-trustworthy-aI/)

**Key Insights:**
- Mutation testing is more effective than code coverage for test quality
- Detects tests that don't actually verify behavior
- Catches redundant assertions and missing assertions

**Recommendation:**
- Implement mutation testing for critical code paths
- Use mutation score as primary quality metric
- Coverage as secondary metric

### 4. Recommended Coverage Targets

**Source:** [IBM Guidelines + Mammoth AI Best Practices](https://mammoth-ai.com/best-practices-for-achieving-high-test_coverage-with-ai-assisted-testing/)

**Recommended Targets:**
- **70-75%**: Good for standard production code
- **80-85%**: High quality for critical infrastructure
- **90-95%**: Very high for library code and public APIs
- **95%+**: Diminishing returns, usually not worth effort

**Rationale:**
- 85% balances coverage and maintenance effort
- Above 90% requires testing trivial code
- Below 70% risks undetected bugs

## AI-Assisted Test Generation Workflow

### Phase-Based Approach

1. **Analysis Phase**
   - Identify code structure and dependencies
   - Map functions/classes to test
   - Determine external dependencies requiring mocks

2. **Initial Generation Phase**
   - Generate happy path tests first
   - Add edge case tests
   - Mock external dependencies

3. **Verification Phase**
   - Run tests with coverage measurement
   - Identify uncovered code paths
   - Parse coverage output

4. **Gap Analysis Phase**
   - Analyze uncovered lines
   - Prioritize by risk and complexity
   - Generate targeted tests

5. **Iteration Phase**
   - Re-run coverage measurement
   - Continue until threshold met
   - Escalate if stuck after 3 iterations

## Test Generation Strategies by Language

### Python

```python
# pytest with pytest-cov
pytest --cov=src --cov-report=term-missing

# Coverage output parsing
grep -oP 'Coverage: \K[0-9]+' coverage.log
```

**Key Patterns:**
- Use `conftest.py` for shared fixtures
- Parameterized tests with `@pytest.mark.parametrize`
- Mock with `unittest.mock.patch`

### TypeScript/JavaScript

```bash
# jest with coverage
npm test -- --coverage

# istanbul output parsing
grep -oP 'Statements.*\K[0-9.]+' coverage.log
```

**Key Patterns:**
- Use `describe`/`test` blocks
- Mock with `jest.mock()` or `vi.mock()` (vitest)
- Test React components with `@testing-library`

### Go

```bash
go test -cover ./...
```

**Key Patterns:**
- Table-driven tests
- Use `t.Parallel()` for concurrent tests
- Mock interfaces, not concrete types

### Rust

```bash
cargo tarpaulin --out Stdout
```

**Key Patterns:**
- Unit tests in same module as code
- Integration tests in `tests/` directory
- Mock with `mockall` crate

## Common Pitfalls

### 1. Mocking Internal Code

**Problem:** Mocking internal utilities leads to testing mocks, not behavior

**Solution:**
- Mock only at boundaries (APIs, databases, file system)
- Test internal code directly

### 2. Fragile Tests

**Problem:** Tests break on implementation changes

**Solution:**
- Test behavior, not implementation
- Use black-box testing where possible
- Avoid testing private methods

### 3. Over-Mocking

**Problem:** Too many mocks make tests brittle

**Solution:**
- Use real implementations for fast dependencies
- Mock only slow or external dependencies
- Prefer test fakes over mocks when complex

### 4. Ignoring Error Paths

**Problem:** Only happy path tested

**Solution:**
- Always test error conditions
- Verify error messages
- Test edge cases (null, empty, boundary values)

## Coverage Measurement Tools

| Language | Tool        | Command                          |
|----------|-------------|----------------------------------|
| Python   | pytest-cov  | `pytest --cov=src`               |
| JS/TS    | istanbul    | `npm test -- --coverage`         |
| Go       | builtin     | `go test -cover ./...`           |
| Rust     | tarpaulin   | `cargo tarpaulin --out Stdout`   |

## Sources

- [Qt.io: Practical Guide to AI-Generated Unit Tests](https://www.qt.io/quality-assurance/blog/a-practical-guide-to-generating-unit-tests-with-ai-code-assistants)
- [OutSight AI: Why Coverage Lies](https://medium.com/@outsightai/the-truth-about-ai-generated-unit-tests-why-coverage-lies-and-mutations-dont-fcd5b5f6a267)
- [Nimble Approach: Mutation Testing](https://nimbleapproach.com/blog/why-mutation-testing-is-essential-for-trustworthy-aI/)
- [Mammoth AI: High Coverage Best Practices](https://mammoth-ai.com/best-practices-for-achieving-high-test_coverage-with-ai-assisted-testing/)
