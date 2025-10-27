---
name: 10-stages-developing
description: Systematic 10-stage TDD workflow for developing high-quality functions in any language. Guides you from specification through implementation to verification with test-first principles, syntax validation, and comprehensive testing. Use when adding new functions, implementing features with strict quality requirements, or teaching development best practices.
---

# 10-Stage Function Development Workflow

A disciplined, test-driven workflow for building high-quality functions in any programming language.

## Overview

This skill guides you through 10 systematic stages (0-9) for developing functions with test-driven development principles. It's **tool-agnostic** and works with any language, testing framework, or development environment.

**Core Philosophy**: Write tests first, validate continuously, implement systematically.

## When to Use

- Adding new functions with quality requirements
- Teaching/learning TDD best practices
- Ensuring code consistency across teams
- Implementing features requiring comprehensive testing
- Setting up systematic development workflows

## Quick Stage Summary

```
Stage 0: Announce Start           → Declare workflow beginning
Stage 1: Define Specification      → Plan function signature & behavior
Stage 2: Create Smoke Test         → Write initial failing test
Stage 3: Initial Syntax Check      → Validate test code
Stage 4: Run Smoke Test            → Confirm test fails (expected)
Stage 5: Implement Function        → Write actual implementation
Stage 6: Expand Test Suite         → Add comprehensive tests
Stage 7: Final Syntax Check        → Validate all code
Stage 8: Verify Tests Pass         → Confirm all tests succeed
Stage 9: Report Completion         → Summarize results
```

---

## Stage 0: Announce Start

**Purpose**: Formally begin the workflow with clear task identification.

**Actions**:
- Display workflow header with function name
- Identify target language/framework
- Note class/module context if applicable

**Output Example**:
```
🎼 WORKFLOW START: 10-Stage Function Development
Function: validateEmail
Language: JavaScript
Context: utils/validators module
```

---

## Stage 1: Define Specification

**Purpose**: Create complete specification before writing any code.

**Define**:
- Function/method name and purpose
- Input parameters with types
- Output/return values with types
- Comprehensive documentation
- Test and source file locations
- Example test data (valid and invalid cases)

**Specification Template**:
```
Function: [name]
Language: [language]
Class/Module: [context]

Inputs:
  - [param1]: [type] - [description]
  - [param2]: [type] - [description]

Outputs:
  - [return]: [type] - [description]

Purpose:
  [What the function does and why]

Edge Cases:
  - [edge case 1]
  - [edge case 2]

Test File: [path]
Source File: [path]

Test Data Examples:
  Valid: [examples]
  Invalid: [examples]
```

**Success**: Complete, unambiguous specification ready for implementation.

---

## Stage 2: Create Smoke Test

**Purpose**: Write minimal test that will fail (function doesn't exist yet).

**Create**:
- Test file structure
- Single simple test function
- Basic test data setup
- One or two simple assertions

**Key Points**:
- Keep it minimal and focused
- Use realistic test data
- Test WILL and SHOULD fail at this stage
- Add clear test documentation

**Example Patterns**:

*Python/pytest*:
```python
def test_validate_email_smoke():
    """Smoke test for email validation."""
    from validators import validate_email
    result = validate_email("user@example.com")
    assert result is not None
```

*JavaScript/Jest*:
```javascript
test('validateEmail smoke test', () => {
    const { validateEmail } = require('./validators');
    const result = validateEmail('user@example.com');
    expect(result).toBeDefined();
});
```

**Success**: Test file created, test fails as expected.

---

## Stage 3: Initial Syntax Check

**Purpose**: Validate test code has no syntax errors.

**Tool-Agnostic Approach**:
Use your language's syntax checker. Examples:

```bash
# Python
python -m py_compile test_file.py

# JavaScript
npx eslint test_file.js --max-warnings 0

# Java
javac -Xlint TestFile.java

# Go
go vet test_file_test.go

# Rust
cargo check
```

**Success**: Test file has no syntax errors or warnings.

---

## Stage 4: Run Smoke Test

**Purpose**: Execute test and confirm it fails (implementation missing).

**Expected Result**: Test FAILS (this is correct!)

**Tool-Agnostic Approach**:
```bash
# Python
pytest test_file.py::test_name -v

# JavaScript
npm test -- test_file.test.js

# Java
mvn test -Dtest=TestClass#testMethod

# Go
go test -run TestName

# Rust
cargo test test_name
```

**Success Indicators**:
- Test runs without runtime errors
- Test fails because function doesn't exist or returns wrong value
- Error message is clear and helpful

---

## Stage 5: Implement Function

**Purpose**: Write the actual implementation matching specification.

**Implementation Checklist**:
- [ ] Function signature matches specification exactly
- [ ] Comprehensive documentation (docstring/comments)
- [ ] Type hints/annotations for all parameters
- [ ] Input validation and error handling
- [ ] Core logic implementation
- [ ] Edge case handling
- [ ] Clear error messages

**Quality Standards**:
- Readable, maintainable code
- Single responsibility principle
- Consistent naming conventions
- Proper error handling (don't silently fail)

**Language-Agnostic Pattern**:
```
1. Validate inputs → raise/throw errors for invalid data
2. Handle edge cases → empty inputs, boundaries, nulls
3. Implement core logic → main functionality
4. Return properly typed result → match specification
```

**Success**: Implementation complete, matches specification, handles edge cases.

---

## Stage 6: Expand Test Suite

**Purpose**: Add comprehensive tests covering all scenarios.

**Test Categories**:

**Normal Cases**:
- Typical valid inputs
- Common use patterns
- Expected happy path

**Edge Cases**:
- Empty/null inputs
- Boundary values (min/max)
- Single-item collections
- Large datasets

**Error Cases**:
- Invalid input types
- Out-of-range values
- Constraint violations
- Exceptional conditions

**Test Quality Checklist**:
- [ ] Each test has descriptive name
- [ ] Each test has clear documentation
- [ ] Each test checks ONE thing
- [ ] Use assertion messages for clarity
- [ ] Organize tests by category
- [ ] Realistic test data

**Success**: Comprehensive test suite covering normal, edge, and error cases.

---

## Stage 7: Final Syntax Check

**Purpose**: Validate both implementation and tests have no syntax errors.

**Check Both**:
- Source file syntax
- Test file syntax
- Import statements
- Type annotations/hints

**Tool-Agnostic Commands**:
Run your language's linter/compiler on BOTH files.

**Success**: No syntax errors in implementation or tests.

---

## Stage 8: Verify Tests Pass

**Purpose**: Run complete test suite and confirm all tests pass.

**What to Verify**:
- All tests execute successfully
- All assertions pass
- No failures or errors
- Good test coverage

**If Tests Fail**:
1. Read error message carefully
2. Determine: bug in implementation or test?
3. Fix the appropriate code
4. Re-run tests
5. Repeat until all pass

**Tool-Agnostic Test Execution**:
```bash
# Run all tests in test file
[your test runner] [test file]

# With coverage (if available)
[coverage tool] [test file]
```

**Success Criteria**:
- ✅ All tests pass
- ✅ No warnings or errors
- ✅ Coverage > 80% (if measured)
- ✅ Reasonable execution time

---

## Stage 9: Report Completion

**Purpose**: Summarize workflow completion and results.

**Report**:
- Confirmation of completion
- Stage-by-stage status summary
- Overall success/failure
- Any warnings or notes

**Output Example**:
```
🎼 WORKFLOW COMPLETE: 10-Stage Function Development

Stage Results:
  ✓ Stage 0: Workflow Start
  ✓ Stage 1: Specification Defined
  ✓ Stage 2: Smoke Test Created
  ✓ Stage 3: Initial Syntax Valid
  ✓ Stage 4: Smoke Test Failed (expected)
  ✓ Stage 5: Function Implemented
  ✓ Stage 6: Test Suite Expanded
  ✓ Stage 7: Final Syntax Valid
  ✓ Stage 8: All Tests Pass
  ✓ Stage 9: Completion Report

✅ SUCCESS: Function development complete!

Function: validateEmail
Tests: 8 passed, 0 failed
Coverage: 92%
```

---

## Best Practices

### Specification (Stage 1)
- Be specific about types and constraints
- Document all assumptions
- Create realistic test data examples
- Consider edge cases upfront

### Testing (Stages 2, 4, 6, 8)
- Write tests BEFORE implementation
- Test one thing per test function
- Use descriptive test names
- Cover normal, edge, and error cases
- Make assertions meaningful

### Implementation (Stage 5)
- Follow specification exactly
- Validate inputs explicitly
- Handle errors gracefully
- Write clear, maintainable code
- Document complex logic

### Validation (Stages 3, 7)
- Check syntax frequently
- Use linters and formatters
- Maintain code consistency
- Fix warnings promptly

## Common Patterns

See `docs/examples.md` for complete multi-language examples.

## Troubleshooting

See `docs/troubleshooting.md` for common issues and solutions.

## Language-Specific Guidance

See `templates/` directory for language-specific templates:
- `templates/python/` - Python examples
- `templates/javascript/` - JavaScript/TypeScript examples
- `templates/java/` - Java examples
- `templates/go/` - Go examples
- `templates/rust/` - Rust examples

## Helper Scripts

Use provided scripts for automation:
- `scripts/validate-syntax.sh` - Check syntax for multiple languages
- `scripts/run-tests.sh` - Execute tests with proper tooling
- `scripts/check-progress.sh` - Track stage completion

## Key Takeaways

✅ **Test-Driven**: Write tests before implementation
✅ **Systematic**: Follow all 10 stages in order
✅ **Validated**: Check syntax at multiple points
✅ **Comprehensive**: Test normal, edge, and error cases
✅ **Documented**: Every function has proper documentation
✅ **Verified**: All tests must pass before completion
✅ **Tool-Agnostic**: Works with any language and framework

---

## Additional Resources

- **Detailed Stage Guide**: See `docs/stages-detailed.md`
- **Multi-Language Examples**: See `docs/examples.md`
- **Quick Reference**: See `docs/quick-reference.md`
- **Templates**: See `templates/[language]/`
