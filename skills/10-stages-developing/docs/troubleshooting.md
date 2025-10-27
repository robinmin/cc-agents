# Troubleshooting Guide

Common issues and solutions for the 10-stage development workflow.

## Stage-Specific Issues

### Stage 1: Specification Issues

#### Problem: Vague or Incomplete Specification
**Symptoms**:
- Unclear what function should do
- Missing parameter types
- No edge cases identified

**Solution**:
```
Ask these questions:
1. What exactly should this function do?
2. What are ALL the input parameters and their types?
3. What should it return and in what format?
4. What edge cases exist?
5. What should happen on errors?
```

#### Problem: Unrealistic Test Data
**Symptoms**:
- Test data doesn't reflect real usage
- Edge cases not represented

**Solution**:
- Use actual data examples from your application
- Include boundary values (empty, max, min)
- Add realistic error cases

---

### Stage 2: Smoke Test Issues

#### Problem: Test Doesn't Fail
**Symptoms**:
- Smoke test passes even though function isn't implemented

**Causes & Solutions**:
1. **Function already exists**
   - Check if function was implemented earlier
   - Rename function if starting fresh

2. **Import path is wrong**
   - Test isn't actually importing the function
   - Fix import statement

3. **Assertion is too weak**
   ```python
   # Too weak - always passes
   assert True

   # Better - actually tests something
   assert result is not None
   assert result == expected_value
   ```

#### Problem: Import Error
**Symptoms**:
- `ModuleNotFoundError`, `Cannot find module`, etc.

**Solutions**:
```bash
# Python: Check PYTHONPATH
export PYTHONPATH="${PYTHONPATH}:${PWD}/src"
python -m pytest tests/

# JavaScript: Check package.json paths
# Java: Check classpath
# Go: Check module path (go.mod)
# Rust: Check Cargo.toml
```

---

### Stage 3 & 7: Syntax Check Issues

#### Problem: Syntax Errors Found
**Common Errors by Language**:

**Python**:
```python
# Missing colon
def my_function(x)  # ❌
def my_function(x):  # ✅

# Wrong indentation
def my_function(x):
return x  # ❌ Not indented
    return x  # ✅ Properly indented

# Unclosed brackets
result = func(x, y  # ❌
result = func(x, y)  # ✅
```

**JavaScript**:
```javascript
// Missing semicolon or bracket
function myFunc(x) {
    return x  // ⚠️ Missing semicolon (depends on style)
}  // ❌ Missing closing bracket

function myFunc(x) {
    return x;
}  // ✅ Correct

// Const without initialization
const x;  // ❌
const x = 10;  // ✅
```

**Java**:
```java
// Missing semicolon
public int calculate() { return 5 }  // ❌
public int calculate() { return 5; }  // ✅

// Wrong method signature
public void myMethod  // ❌
public void myMethod()  // ✅
```

**Solutions**:
1. Use a linter (pylint, eslint, etc.)
2. Enable IDE syntax checking
3. Read error messages carefully - they usually point to the line
4. Check the line BEFORE the error (often the real issue)

---

### Stage 4: Smoke Test Execution Issues

#### Problem: Test Crashes Before Assertions
**Symptoms**:
- Runtime error, not test failure
- Exception thrown during test

**Causes & Solutions**:

1. **Test data is malformed**
   ```python
   # Problem: Wrong data type
   test_data = "not a list"
   result = process_list(test_data)  # Crashes

   # Solution: Use correct type
   test_data = ["item1", "item2"]
   result = process_list(test_data)
   ```

2. **Dependencies not available**
   ```bash
   # Install missing test dependencies
   pip install pytest pytest-cov  # Python
   npm install --save-dev jest  # JavaScript
   ```

3. **Environment issues**
   - Check working directory
   - Check environment variables
   - Check file permissions

#### Problem: Test Passes When It Should Fail
**Solution**: Add more specific assertions
```python
# Too general
assert result  # Could pass with any truthy value

# More specific
assert result is not None
assert isinstance(result, dict)
assert 'key' in result
```

---

### Stage 5: Implementation Issues

#### Problem: Don't Know Where to Start
**Solution**: Follow this order:
```
1. Write function signature (name, parameters, return type)
2. Add docstring/documentation
3. Add input validation (check for None/null/empty)
4. Handle simplest case first
5. Add edge case handling
6. Add error handling
7. Implement full logic
```

#### Problem: Implementation Too Complex
**Symptoms**:
- Function is > 50 lines
- Multiple responsibilities
- Hard to test

**Solution**:
- Break into smaller helper functions
- Extract complex logic
- Use descriptive variable names
- Add comments for complex sections

#### Problem: Type Errors
**Solutions by Language**:

**Python**:
```python
# Use type hints
def process(data: List[Dict[str, Any]]) -> Dict[str, int]:
    pass

# Use mypy for type checking
# pip install mypy
# mypy src/
```

**TypeScript**:
```typescript
// Define interfaces
interface User {
    id: number;
    name: string;
}

function processUser(user: User): string {
    return user.name;
}
```

**Java**:
```java
// Use generics properly
List<String> names = new ArrayList<>();  // ✅
List names = new ArrayList();  // ⚠️ Raw type
```

---

### Stage 6: Test Suite Issues

#### Problem: Don't Know What to Test
**Use this checklist**:

**Normal Cases**:
- [ ] Typical valid input
- [ ] Multiple valid inputs
- [ ] Common use patterns

**Edge Cases**:
- [ ] Empty input ([], "", null, 0)
- [ ] Single item input
- [ ] Large input (1000+ items)
- [ ] Boundary values (min, max)
- [ ] Special characters
- [ ] Unicode/international characters

**Error Cases**:
- [ ] Wrong type
- [ ] Null/None/undefined
- [ ] Out of range values
- [ ] Invalid format
- [ ] Missing required data

#### Problem: Tests Are Flaky
**Symptoms**:
- Tests pass sometimes, fail other times

**Common Causes**:
1. **Time-dependent tests**
   ```python
   # Problem
   assert datetime.now().hour == 10  # Only passes at 10am

   # Solution: Mock time
   from unittest.mock import patch
   with patch('module.datetime') as mock_date:
       mock_date.now.return_value = datetime(2024, 1, 1, 10, 0)
       # Now test
   ```

2. **Order-dependent tests**
   - Tests should be independent
   - Don't rely on test execution order
   - Clean up state after each test

3. **External dependencies**
   - Mock external API calls
   - Use test databases
   - Don't rely on network

#### Problem: Tests Take Too Long
**Solutions**:
- Mock slow operations (network, disk, database)
- Use smaller test datasets
- Run tests in parallel if possible
- Use test categorization (unit vs integration)

---

### Stage 8: Test Failures

#### Problem: Tests Fail After Implementation
**Diagnostic Steps**:

1. **Read the error message**
   ```
   AssertionError: Expected 5, got 4
   ```
   - What was expected?
   - What was received?
   - Why the difference?

2. **Check test vs implementation**
   - Is the test correct?
   - Is the implementation correct?
   - Does implementation match spec?

3. **Add debug output**
   ```python
   print(f"Input: {input_data}")
   print(f"Result: {result}")
   print(f"Expected: {expected}")
   ```

4. **Isolate the problem**
   - Run just the failing test
   - Simplify test data
   - Test function directly (not through framework)

#### Problem: Assertion Error Without Clear Message
**Solution**: Add descriptive messages
```python
# Poor
assert result == expected

# Better
assert result == expected, f"Expected {expected} but got {result}"

# Even better - use pytest with detailed assertions
assert result == expected  # pytest shows diff automatically
```

#### Problem: Wrong Test Logic
**Example**:
```python
# Test says "should return list of valid items"
# But test checks for: result == []

# Problem: Test expects wrong thing
assert len(result) > 0  # ❌ Empty list is valid sometimes

# Solution: Check what the test SHOULD verify
if input_has_valid_items:
    assert len(result) > 0
else:
    assert len(result) == 0
```

---

## General Troubleshooting

### Debug Strategy

1. **Reproduce**
   - Run failing test in isolation
   - Verify it fails consistently

2. **Simplify**
   - Reduce test data to minimum
   - Comment out code until it works
   - Add back piece by piece

3. **Inspect**
   - Print/log intermediate values
   - Use debugger (pdb, node inspect, etc.)
   - Check variable types

4. **Fix**
   - Change implementation or test
   - Verify fix works
   - Run ALL tests

5. **Prevent**
   - Add test for this scenario
   - Document the issue
   - Refactor if needed

### Common Mistakes

#### Mistake: Skipping Stages
**Problem**: Jump from Stage 2 to Stage 5
**Impact**: No failing test to guide implementation
**Solution**: Always follow stages in order

#### Mistake: Not Running Tests
**Problem**: Assume code works without testing
**Impact**: Bugs in production
**Solution**: Always run Stage 4 and Stage 8

#### Mistake: Weak Assertions
**Problem**: Tests that can't fail
```python
assert result  # Too weak
```
**Solution**: Be specific
```python
assert result == expected_value
assert len(result) == 5
assert result['key'] == 'value'
```

#### Mistake: Testing Implementation Details
**Problem**: Test how function works, not what it does
**Solution**: Test behavior, not implementation
```python
# Bad - tests implementation
assert function_called_internal_helper()

# Good - tests behavior
assert function(input) == expected_output
```

---

## Getting Help

### Information to Provide

When asking for help, include:

1. **Stage number** where you're stuck
2. **Language** and version
3. **Error message** (full text)
4. **What you expected**
5. **What actually happened**
6. **Code snippet** (minimal example)

### Example Help Request

```
Stage: 8 (Verify Tests Pass)
Language: Python 3.11
Framework: pytest 7.4

Error:
  AssertionError: assert False
  test_validators.py:45: test_email_validation

Expected: Email "user@example.com" to be valid
Actual: Function returns (False, "Missing @ symbol")

Code:
  def validate_email(email):
      if "@" not in email:  # This line
          return False, "Missing @ symbol"
      # ...

Question: Why does it think @ is missing when it's clearly there?
```

---

## Prevention Tips

### Before Starting (Stage 0-1)
- [ ] Read specification template carefully
- [ ] Clarify vague requirements
- [ ] Check for similar existing code
- [ ] Verify you have necessary tools installed

### During Development (Stage 2-6)
- [ ] Run syntax checks frequently
- [ ] Test often (not just at Stage 8)
- [ ] Keep functions small and focused
- [ ] Write clear variable names
- [ ] Add comments for complex logic

### Before Completion (Stage 7-9)
- [ ] Run ALL tests, not just new ones
- [ ] Check test coverage
- [ ] Review code for clarity
- [ ] Update documentation
- [ ] Verify edge cases handled

---

## Quick Reference: Error Messages

### Python
- `ModuleNotFoundError` → Check imports and PYTHONPATH
- `IndentationError` → Fix spaces/tabs (use 4 spaces)
- `SyntaxError: invalid syntax` → Missing colon, bracket, or quote
- `TypeError: unsupported operand type` → Wrong type used
- `AssertionError` → Test failed, check expected vs actual

### JavaScript
- `Cannot find module` → Check import path and package.json
- `SyntaxError: Unexpected token` → Missing bracket, comma, or semicolon
- `TypeError: Cannot read property 'x' of undefined` → Object is undefined
- `ReferenceError: x is not defined` → Variable not declared
- `Test suite failed to run` → Configuration or setup issue

### Java
- `ClassNotFoundException` → Check classpath
- `error: ';' expected` → Missing semicolon
- `error: cannot find symbol` → Import missing or typo
- `AssertionFailedError` → Test assertion failed
- `NullPointerException` → Null check needed

### Go
- `undefined: function` → Check import or function name
- `syntax error: unexpected newline` → Missing brackets
- `cannot use X (type Y) as type Z` → Type mismatch
- `panic: runtime error` → Runtime panic, add error checking

### Rust
- `cannot find function` → Check use statement or module path
- `expected `;`, found keyword` → Missing semicolon
- `mismatched types` → Return type doesn't match signature
- `thread 'test' panicked` → Test panic, check assertions
- `error: could not compile` → Syntax error, check cargo output
