---
name: unit-tests-generation
description: This skill should be used when the user asks to "generate unit tests", "add unit tests", "achieve test coverage", "reach coverage target", "get 85% coverage", "run test generation", or mentions "AI-generated tests", "pytest coverage", or "test coverage ratio". Implements iterative 8-phase workflow for AI-assisted test generation with coverage validation. Supports Python, TypeScript, Go, and Rust with research-based best practices (70-95% coverage range, 85% default).
---

# Unit Tests Generation

## Overview

Generate comprehensive unit tests to achieve target coverage ratio using AI-assisted test generation. This skill implements an iterative 8-phase workflow that analyzes code, creates tests, and validates against coverage thresholds.

**Research-Based Best Practices (2025):**

- **AI tools achieve 80-90% coverage quickly** - With specialized agents, high coverage is achievable
- **Coverage alone is misleading** - Traditional metrics don't guarantee quality with AI-generated tests
- **Mutation testing is superior** - More effective than code coverage for test quality
- **Recommended target: 70-85%** - IBM guidelines suggest 70-80%, with 85% as a reasonable upper target

## Quick Start

**Parameters:**
1. **verification-command** (mandatory) - Coverage command (e.g., `pytest --cov=src`)
2. **testee** (optional) - Target: file path, directory, or NLP description
3. **threshold** (optional) - Coverage percentage (70-95 recommended, default 85)

```bash
# Whole project, 85% coverage
pytest --cov=src

# Directory, 90% coverage
pytest tests/

# Specific file
pytest --cov=src/auth.py
```

## Workflows

### Phase 1: Analyze Testee

Determine the scope of code to test:

```bash
# Single file
TESTEE="src/auth.py"
# → Single file target

# Directory
TESTEE="src/"
# → Multiple files target

# NLP description
TESTEE="authentication module including login"
# → Search codebase for matches
```

### Phase 2: Detect Language & Framework

Auto-detect from project structure and verification command:

| Detection Pattern | Test Framework | Coverage Tool |
|-------------------|----------------|---------------|
| `pytest` in cmd   | pytest         | pytest-cov     |
| `package.json`   | jest/vitest    | istanbul       |
| `Cargo.toml`     | cargo test     | tarpaulin      |
| `go.mod`         | go test        | builtin        |

### Phase 3: Initial Test Generation

**Test File Structure:**

```python
tests/
├── conftest.py          # Shared fixtures, module registration
├── test_auth.py          # Module-specific tests
└── test_user.py
```

**Module Registration (Python):**

For dashed filenames (e.g., `context-validator.py` → `context_validator`), use dynamic module registration in `conftest.py`. See `references/python-module-registration.md` for complete pattern.

**Coverage Strategy (highest ROI):**

1. **Happy path** - Basic functionality
2. **Edge cases** - Boundaries, null/empty inputs
3. **Error handling** - Exceptions, error messages
4. **Parameterized tests** - Multiple inputs efficiently
5. **Mock external dependencies** - Isolate unit under test

### Phase 4: Run Verification

Execute verification command and parse coverage:

```bash
pytest --cov=src
# Parse: Python "Coverage: 86%", JS "Statements" from istanbul
```

### Phase 5: Gap Analysis

**IF coverage >= threshold:** SUCCESS - Show report, exit

**IF coverage < threshold:** Identify uncovered lines, proceed to Phase 6

### Phase 6: Targeted Test Generation

**Priority Order:**
1. **Low hanging fruit** - Quick coverage gains
2. **Complex functions** - Multi-branch logic
3. **Error paths** - Exception handling
4. **Edge cases** - Boundaries, empty/null
5. **Integration points** - Module boundaries

### Phase 7: Re-Verify

```bash
MAX_ITERATIONS=3
while [ $ITERATION -le $MAX_ITERATIONS ]; do
    pytest --cov=src
    # IF >= threshold: SUCCESS
    # IF < threshold: → Phase 6
    # IF 3 iterations no progress: ESCALATE
done
```

### Phase 8: Completion or Escalation

**If threshold met:** Show coverage report, confirm `Coverage: XX%` where XX >= threshold

**If 3 iterations without meeting threshold:**
1. Check feasibility: Is threshold realistic?
2. Suggest alternatives: Lower threshold (70-85% realistic)
3. Document rationale: Explain untestable code

## Coverage Threshold Guidelines

| Range     | Quality Level | Use Case                              |
|-----------|---------------|----------------------------------------|
| **70-75%** | Good          | Standard production code              |
| **80-85%** | High          | Critical infrastructure, security code |
| **90-95%** | Very High     | Library code, public APIs             |
| **95%+**   | Diminishing   | Usually not worth marginal effort      |

**Industry Research:** 85% balances coverage and effort (2025 research).

## Mandatory Completion Criteria

**Completion requires:**
1. Generate tests for specified testee
2. Run verification command
3. Confirm coverage meets threshold
4. Show literal output: `Coverage: XX%` where XX >= threshold

**If coverage < threshold:** NOT completed - MUST continue adding tests, do NOT write summary

## Examples

### Python Directory Target

```bash
pytest --cov=src  # Target: src/, 85%
# Output: Coverage: 72% → 84% → 87% (TARGET MET)
```

### NLP Code Discovery

```bash
pytest  # Target: "authentication code", 80%
# Output: Found 8 files, Language: python
```

### TypeScript Project

```bash
npm test -- --coverage  # Target: src/auth/, 85%
# Output: Coverage: 88% (TARGET MET)
```

## Escalation Guidelines

If **3 iterations** without meeting threshold:

1. **Check feasibility:** Is threshold realistic for code complexity? External dependencies?
2. **Suggest alternatives:** Lower threshold (70-85% realistic), document untestable code
3. **Offer escalation:** Delegate to specialist, ask user for threshold adjustment

## Related Skills

- `rd2:tdd-workflow` - Test-driven development methodology
- `rd2:test-coverage` - Coverage requirements and measurement
- `rd2:advanced-testing` - Mutation testing, property-based testing
- `rd2:code-patterns` - API design, testing, and best practices
- `rd2:anti-hallucination` - Verification before generation

## References

- **`references/best-practices.md`** - Research-based testing practices
- **`references/coverage-analysis.md`** - Coverage measurement and interpretation
- **`references/test-generation-patterns.md`** - AI-assisted test generation strategies
- **`references/python-module-registration.md`** - Python dashed filename import pattern
- **`examples/pytest-example.md`** - Complete pytest setup example
- **`examples/jest-example.md`** - Complete jest setup example

## Sources

- [Qt.io: AI-Generated Unit Tests Guide](https://www.qt.io/quality-assurance/blog/a-practical-guide-to-generating-unit-tests-with-ai-code-assistants)
- [OutSight AI: Coverage vs Mutations](https://medium.com/@outsightai/the-truth-about-ai-generated-unit-tests-why-coverage-lies-and-mutations-dont-fcd5b5f6a267)
- [Nimble Approach: Mutation Testing](https://nimbleapproach.com/blog/why-mutation-testing-is-essential-for-trustworthy-aI/)
- [Mammoth AI: High Coverage Best Practices](https://mammoth-ai.com/best-practices-for-achieving-high-test_coverage-with-ai-assisted-testing/)
