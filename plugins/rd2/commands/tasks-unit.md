---
description: This command should be used when the user asks to "generate unit tests", "add unit tests", "achieve test coverage", "reach coverage target", "get 85% coverage", "run test generation", or mentions "coverage ratio", "AI-generated tests", "pytest coverage", or "test coverage threshold". Thin wrapper delegating to rd2:unit-tests-generation skill for comprehensive test generation.
skills:
  - rd2:unit-tests-generation
  - rd2:tdd-workflow
  - rd2:code-patterns
  - rd2:sys-debugging
  - rd2:anti-hallucination
argument-hint: "<verification-command> [<testee>] [threshold=85]"
model: sonnet
allowed-tools: Skill, Read, Write, Edit, Grep, Glob, Bash, AskUserQuestion
---

# Tasks Unit

Generate comprehensive unit tests to achieve target coverage ratio using AI-assisted test generation. This command is a thin wrapper that delegates to the `rd2:unit-tests-generation` skill.

## Quick Start

```bash
# Generate tests for whole project with 85% coverage
/rd2:tasks-unit "pytest --cov=src"

# Generate tests for specific directory with 90% coverage
/rd2:tasks-unit "pytest tests/" tests/ 90

# Generate tests for specific file
/rd2:tasks-unit "pytest" src/auth.py 85

# Generate tests with NLP description
/rd2:tasks-unit "pytest" "authentication module including login and token validation" 85
```

## Arguments

| Argument             | Required | Default | Description                                                                 |
| -------------------- | -------- | ------- | ------------------------------------------------------------------------- |
| `verification-command` | Yes      | -       | Command to measure coverage (e.g., `pytest --cov=src`, `npm test -- --coverage`) |
| `testee`              | No       | `.`     | Target to test: file path, directory, or NLP description (defaults to project root) |
| `threshold`           | No       | `85`    | Target coverage percentage (70-95 recommended, default 85)              |

**Testee Formats:**
- File path: `src/auth.py` or `./src/auth.py`
- Directory: `src/` or `tests/`
- NLP description: `"authentication module including login"`

## When to Use

**Activate this command when:**

- Implementing new code that needs test coverage
- Task requires test coverage as completion criteria
- Refactoring without breaking existing test coverage
- TDD workflow where tests guide implementation

**Do NOT use for:**

- Running existing tests (use test command directly)
- Integration/end-to-end tests (different scope)
- Performance testing (use tools like locust instead)

## Input Validation

Before delegating to the skill, validate inputs:

1. **verification-command**: Must be non-empty string
   - Error if: Empty or missing
   - Example valid: `pytest --cov=src`, `npm test -- --coverage`

2. **threshold**: Must be numeric between 70-95
   - Error if: < 70, > 95, or non-numeric
   - Warning if: > 90 (diminishing returns)

3. **testee**: Optional, but validate format if provided
   - Accepts: File path, directory, or quoted NLP description

## Error Handling

**If verification command fails:**
- Check if test framework is installed
- Verify command syntax
- Suggest installing dependencies

**If coverage cannot be achieved:**
- After 3 iterations, show current coverage
- Suggest manual review or reducing threshold
- Document unreachable code blocks

**If testee not found:**
- Verify file/directory exists
- Check path is relative to project root
- Suggest using absolute path if needed

## Coverage Threshold Guidelines

Based on 2025 research recommendations:

| Range       | Quality Level | Use Case                                   |
| ------------ | ------------- | ------------------------------------------ |
| **70-75%**   | Good          | Standard production code                 |
| **80-85%**   | High          | Critical infrastructure, security code      |
| **90-95%**   | Very High     | Library code, public APIs, regulated systems |
| **95%+**     | Diminishing    | Usually not worth the marginal effort        |

## Workflow

This command delegates to the `rd2:unit-tests-generation` skill, which implements an 8-phase test generation workflow:

1. **Analyze Testee** - Identify files to test
2. **Detect Language & Framework** - Auto-detect pytest, jest, go test, cargo
3. **Initial Test Generation** - Generate test file skeleton and basic tests
4. **Run Verification** - Execute verification command and parse coverage
5. **Gap Analysis** - Compare coverage vs threshold, identify gaps
6. **Targeted Test Generation** - Add tests for uncovered code
7. **Re-Verify** - Iterate until threshold met (max 3 iterations)
8. **Completion or Escalation** - Show coverage report or suggest alternatives

See `rd2:unit-tests-generation` skill for comprehensive documentation including:
- Research-based best practices from 2025
- Language-specific patterns (Python, TypeScript, Go, Rust)
- Test generation strategies
- Coverage analysis and interpretation
- Complete examples for pytest and jest

## Examples

### Python Project with Directory Target

```bash
/rd2:tasks-unit "pytest --cov=src" src/ 85

# Expected output:
# Target: Directory with 12 files
# Language: python
# Coverage tool: pytest-cov
# Running: pytest --cov=src
# Coverage: 72%
# TARGET NOT MET - Coverage 72% < 85%
# Adding targeted tests...
# Coverage: 87%
# TARGET MET - Coverage 87% >= 85%
```

### TypeScript Project

```bash
/rd2:tasks-unit "npm test -- --coverage" src/auth/ 85

# Expected output:
# Target: Directory with 3 files
# Language: javascript
# Coverage tool: istanbul
# Running: npm test -- --coverage
# Coverage: 88%
# TARGET MET - Coverage 88% >= 85%
```

### Specific File with Higher Threshold

```bash
/rd2:tasks-unit "pytest --cov=src/user.py" src/user.py 90

# Expected output:
# Target: Single file src/user.py
# Coverage: 92%
# TARGET MET - Coverage 92% >= 90%
```

## Completion Criteria

**The ONLY way to complete successfully is:**

1. Generate tests for the specified testee
2. Run verification command to measure coverage
3. Confirm coverage meets threshold
4. Show literal output: `Coverage: XX%` where XX >= threshold

**If coverage < threshold:**
- NOT completed
- MUST continue adding tests
- Do NOT write summary report
- Do NOT claim "good enough"

## See Also

- `rd2:unit-tests-generation` - Core skill with comprehensive test generation workflow
- `rd2:tdd-workflow` - Test-driven development methodology
- `rd2:test-coverage` - Coverage requirements and measurement
- `rd2:advanced-testing` - Mutation testing, property-based testing
