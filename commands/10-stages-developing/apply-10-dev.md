---
description: Apply the 10-stage TDD workflow to implement a function systematically with test-first principles.
---

# apply-10-dev

Execute the complete 10-stage test-driven development workflow for a function.

## Purpose

Guides you through systematic function implementation:
- **Stage 0-1**: Announce start, define specification
- **Stage 2-4**: Create smoke test, validate syntax, verify failure
- **Stage 5**: Implement function
- **Stage 6**: Expand test suite (unit + integration)
- **Stage 7-8**: Final validation, verify all tests pass
- **Stage 9**: Report completion

## Usage

```bash
# Basic usage
/rd:apply-10-dev <function-name>

# With context
/rd:apply-10-dev <function-name> --context "Brief description"

# Specify language explicitly
/rd:apply-10-dev <function-name> --language python

# Include integration tests
/rd:apply-10-dev <function-name> --with-integration

# Resume from specific stage
/rd:apply-10-dev <function-name> --resume-from 5

# Refactor existing function
/rd:apply-10-dev <function-name> --mode refactor
```

## Parameters

- `<function-name>`: Name of function to implement (required)
- `--context`: Brief description of function purpose
- `--language`: Specify language (python|javascript|typescript|java|go|rust)
- `--with-integration`: Auto-create integration tests for related functions
- `--resume-from <stage>`: Resume from specific stage (0-9)
- `--mode refactor`: Add tests to existing function instead of creating new

## What Happens

### Pre-Flight
- Runs `/rd:check-10-dev` automatically
- Detects project language and build tool
- Verifies test framework availability

### Execution Flow
1. **Specification (Stage 1)**: Ask clarifying questions, generate complete spec, wait for approval
2. **Smoke Test (Stage 2-4)**: Create minimal test, validate syntax, verify expected failure
3. **Implementation (Stage 5)**: Write function with documentation, types, validation, error handling
4. **Comprehensive Tests (Stage 6)**: Add normal/edge/error cases, integration tests if applicable
5. **Verification (Stage 7-8)**: Final syntax check, verify all tests pass
6. **Report (Stage 9)**: Summary with metrics, next steps

### Build Tool Integration

Commands executed (language-specific):

```bash
# Python (Makefile)
make test-function FILE=tests/test_module.py FUNC=test_name
make test-unit
make test-integration
make lint
make test

# JavaScript/TypeScript (npm/pnpm)
npm run test:function test_name
npm run test:unit
npm run test:integration
npm run lint
npm test

# Go (Makefile)
make test-function PKG=./pkg/module FUNC=TestName
make test
make lint

# Java (Maven)
mvn test -Dtest=TestClass#testMethod
mvn verify -Pintegration
mvn test

# Rust (Makefile/cargo)
make test-function FUNC=test_name
cargo test
cargo clippy
```

## Examples

### Example 1: Python Email Validator
```bash
/rd:apply-10-dev validate_email --context "Validate email format with clear error messages"
```

**Creates**:
- `src/validators.py` with `validate_email()` function
- `tests/unit/test_validators.py` with comprehensive tests
- Runs all 10 stages
- Reports completion with coverage metrics

### Example 2: JavaScript with Integration
```bash
/rd:apply-10-dev calculateTotal --with-integration
```

**Creates**:
- `src/calculator.js` with `calculateTotal()` function
- `tests/unit/calculator.test.js` (unit tests)
- `tests/integration/calculator.test.js` (integration tests)
- Verifies integration with related functions

### Example 3: Go Function
```bash
/rd:apply-10-dev ProcessBatch --language go
```

**Creates**:
- `pkg/processor/batch.go` with Go conventions
- `pkg/processor/batch_test.go` with table-driven tests
- Uses Go idioms and best practices

### Example 4: Resume After Interruption
```bash
/rd:apply-10-dev validate_email --resume-from 5
```

**Behavior**:
- Loads previous context (spec, tests)
- Skips to Stage 5 (implementation)
- Continues from there

## Output

Completion report example:

```
🎼 WORKFLOW COMPLETE: 10-Stage Development

Function: validate_email
Language: Python
Files Created:
  - src/validators.py
  - tests/unit/test_validators.py

Stage Results:
  ✅ All 10 stages completed successfully
  ✅ Tests: 12 passed, 0 failed
  ✅ Coverage: 95%

Next Steps:
  - Commit: git add . && git commit -m "feat: add validate_email"
  - Consider integration tests for related validators
  - Ready for code review
```

## When Integration Tests Are Suggested

If related functions exist (e.g., `get_user_info` + `set_user_info`):

```
🔗 Related functions detected:
  - get_user_info (existing)
  - set_user_info (just implemented)

Recommend: /rd:integrate-10-dev get_user_info set_user_info

Continue without integration tests? [Y/n]
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Preconditions not met" | Run `/rd:check-10-dev`, then `/rd:init-10-dev` |
| "Test fails at Stage 8" | Claude auto-fixes; review error messages |
| "Build tool not found" | Install tool or verify PATH |
| "Cannot detect language" | Use `--language <lang>` flag |

## See Also

- **Setup**: `/rd:check-10-dev` (verify preconditions), `/rd:init-10-dev` (initialize build config)
- **Integration**: `/rd:integrate-10-dev` (create integration tests)
- **Documentation**: `skills/10-stages-developing/SKILL.md` (complete workflow details)
- **Examples**: `skills/10-stages-developing/docs/examples.md` (multi-language examples)
- **Troubleshooting**: `skills/10-stages-developing/docs/troubleshooting.md` (stage-specific issues)
- **Templates**: `skills/10-stages-developing/templates/` (language-specific templates)
