# 10-Stage Development Workflow - Quick Reference

## One-Page Cheat Sheet

### The 10 Stages

| Stage | Name | Purpose | Expected Result |
|-------|------|---------|-----------------|
| 0 | Announce Start | Begin workflow | Task identified |
| 1 | Define Spec | Plan function | Complete specification |
| 2 | Smoke Test | Write failing test | Test created (fails) |
| 3 | Syntax Check | Validate test | No syntax errors |
| 4 | Run Smoke | Execute test | Test fails (expected) |
| 5 | Implement | Write function | Implementation complete |
| 6 | Expand Tests | Add full suite | Comprehensive tests |
| 7 | Final Check | Validate all code | No syntax errors |
| 8 | Verify Pass | Run all tests | All tests pass ✅ |
| 9 | Report Done | Summarize | Workflow complete |

### Quick Commands by Language

#### Python
```bash
# Stage 3 & 7: Syntax Check
python -m py_compile file.py
pylint file.py --disable=all --enable=E,F

# Stage 4 & 8: Run Tests
pytest test_file.py -v
pytest test_file.py --cov=module
```

#### JavaScript/TypeScript
```bash
# Stage 3 & 7: Syntax Check
npx eslint file.js
npx tsc --noEmit  # TypeScript

# Stage 4 & 8: Run Tests
npm test -- file.test.js
jest file.test.js --coverage
```

#### Java
```bash
# Stage 3 & 7: Syntax Check
javac -Xlint File.java

# Stage 4 & 8: Run Tests
mvn test -Dtest=TestClass
gradle test --tests TestClass
```

#### Go
```bash
# Stage 3 & 7: Syntax Check
go vet file.go
golint file.go

# Stage 4 & 8: Run Tests
go test -v -run TestName
go test -cover
```

#### Rust
```bash
# Stage 3 & 7: Syntax Check
cargo check
cargo clippy

# Stage 4 & 8: Run Tests
cargo test test_name
cargo test --verbose
```

### Stage 1: Specification Template

```
Function: [name]
Language: [language]
Context: [class/module]

Inputs:
  - [param]: [type] - [description]

Outputs:
  - [return]: [type] - [description]

Purpose: [what it does]

Edge Cases:
  - [case 1]
  - [case 2]

Test File: [path]
Source File: [path]

Test Data:
  Valid: [examples]
  Invalid: [examples]
```

### Stage 2: Smoke Test Pattern

**Keep it minimal**:
- Import function
- Set up simple test data
- Call function
- Assert result is not null/undefined

### Stage 5: Implementation Checklist

- [ ] Function signature matches spec
- [ ] Type hints/annotations added
- [ ] Input validation included
- [ ] Documentation complete
- [ ] Edge cases handled
- [ ] Error messages clear

### Stage 6: Test Categories

1. **Normal Cases**: Typical valid inputs
2. **Edge Cases**: Empty, boundaries, extremes
3. **Error Cases**: Invalid inputs, exceptions

### Test Quality Checklist

- [ ] Descriptive test names
- [ ] Clear documentation
- [ ] One test = one thing
- [ ] Meaningful assertions
- [ ] Realistic test data
- [ ] Organized by category

### Common Test Patterns

#### Python (pytest)
```python
def test_function_normal():
    """Test with valid input."""
    result = my_function(valid_input)
    assert result == expected

def test_function_empty():
    """Test with empty input."""
    result = my_function([])
    assert result == default_value

def test_function_invalid():
    """Test error handling."""
    with pytest.raises(ValueError):
        my_function(invalid_input)
```

#### JavaScript (Jest)
```javascript
test('function with valid input', () => {
    const result = myFunction(validInput);
    expect(result).toBe(expected);
});

test('function with empty input', () => {
    const result = myFunction([]);
    expect(result).toBe(defaultValue);
});

test('function with invalid input', () => {
    expect(() => myFunction(invalidInput))
        .toThrow(Error);
});
```

#### Java (JUnit)
```java
@Test
public void testFunctionNormal() {
    Result result = myFunction(validInput);
    assertEquals(expected, result);
}

@Test
public void testFunctionEmpty() {
    Result result = myFunction(Collections.emptyList());
    assertEquals(defaultValue, result);
}

@Test(expected = IllegalArgumentException.class)
public void testFunctionInvalid() {
    myFunction(invalidInput);
}
```

### Troubleshooting Quick Guide

| Issue | Check | Solution |
|-------|-------|----------|
| Stage 2 test doesn't fail | Import path, assertions | Verify function doesn't exist yet |
| Stage 3/7 syntax errors | Indentation, brackets, colons | Use linter |
| Stage 4 test crashes | Test data, imports | Check test setup |
| Stage 8 tests fail | Implementation vs spec | Debug, fix, retest |

### Success Criteria by Stage

- **0**: Clear start message displayed
- **1**: Complete, unambiguous specification
- **2**: Test file created, test fails
- **3**: Test file has no syntax errors
- **4**: Test runs and fails (expected)
- **5**: Function implemented, matches spec
- **6**: Comprehensive test suite created
- **7**: No syntax errors in any file
- **8**: All tests pass, good coverage
- **9**: Summary report generated

### Documentation Standards

Every function must have:
- **Purpose**: What it does
- **Parameters**: Name, type, description
- **Returns**: Type, description
- **Raises/Throws**: Exception types and conditions
- **Examples**: For complex functions

### Key Principles

✅ **Test First**: Write tests before implementation
✅ **Validate Often**: Check syntax at stages 3 & 7
✅ **Be Specific**: Clear types and documentation
✅ **Cover Cases**: Normal, edge, and error
✅ **One Thing**: Each test checks one behavior
✅ **Fail Fast**: Validate inputs, raise errors explicitly

### Time Estimates

| Stage | Typical Time |
|-------|-------------|
| 0 | < 1 min |
| 1 | 5-10 min |
| 2 | 3-5 min |
| 3 | < 1 min |
| 4 | < 1 min |
| 5 | 10-30 min |
| 6 | 10-20 min |
| 7 | < 1 min |
| 8 | 2-5 min |
| 9 | < 1 min |

**Total**: 30-75 minutes (depending on complexity)

### Helper Scripts

```bash
# Validate syntax (all languages)
./scripts/validate-syntax.sh [file]

# Run tests (auto-detect language)
./scripts/run-tests.sh [test-file]

# Check stage progress
./scripts/check-progress.sh
```

### When to Use This Workflow

✅ Adding new functions
✅ Teaching TDD
✅ Quality-critical code
✅ Team standardization
✅ Complex implementations

❌ Quick prototypes
❌ Spike solutions
❌ Emergency fixes (use carefully)
❌ Simple variable changes

---

**Remember**: This is a systematic workflow. Follow all stages in order for best results!
