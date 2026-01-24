# Mutation Testing Guide

**Load this reference when:** You need to validate test quality beyond coverage metrics, or when high coverage doesn't catch bugs.

## Overview

Mutation testing introduces artificial defects (mutations) into your code and checks if your tests catch them. If tests still pass after mutation, the test suite may not be adequately verifying behavior.

**Core principle:** Tests should fail when code changes. If tests don't catch mutations, they're not asserting real behavior.

## Why Mutation Testing?

### Problem with Traditional Coverage

```bash
# 90% coverage but tests miss bugs:
def calculate_discount(price, customer_type):
    if customer_type == "premium":
        return price * 0.9  # Bug: should be 0.8
    return price

# Test passes (covered), but mutation testing reveals:
# Changed `0.9` to `1.0` → Tests still pass! (No assertion on actual value)
```

### Mutation Testing Benefit

> "Mutation testing is a powerful way to improve test quality by validating that tests actually verify behavior, not just execute code."

Sources:
- [PIT Mutation Testing - Gold Standard for Java](https://pitest.org/)
- [Stryker Mutator - JavaScript/TypeScript](https://stryker-mutator.io/)
- [Awesome Mutation Testing - Tool Directory](https://github.com/theofidry/awesome-mutation-testing)
- [Enhancing Test Effectiveness with Mutation Testing](https://medium.com/@joaovitorcoelho10/enhancing-test-effectiveness-with-mutation-testing-6a714c1dfd01)

## How Mutation Testing Works

### 1. Original Code
```python
def add(a, b):
    return a + b
```

### 2. Create Mutants
```python
# Mutant 1: Changed + to -
def add(a, b):
    return a - b

# Mutant 2: Changed to *
def add(a, b):
    return a * b

# Mutant 3: Changed to a
def add(a, b):
    return a
```

### 3. Run Tests
```python
def test_add():
    assert add(2, 3) == 5
```

### 4. Score Results
- **Killed Mutant**: Test fails (good!)
- **Survived Mutant**: Test passes (bad - test inadequate)
- **Mutation Score**: (Killed / Total) × 100%

## Mutation Testing Tools by Language

### Java
**PIT (PITest)** - Gold standard for Java/JVM

```bash
# Maven integration
mvn org.pitest:pitest-maven:mutationCoverage

# Gradle integration
./gradlew pitest
```

**Features:**
- Fast and scalable
- Integration with modern build tools
- HTML reports showing survived mutants
- Line-by-line mutation analysis

### JavaScript/TypeScript
**Stryker Mutator** - Multi-language support

```bash
# Install
npm install --save-dev @stryker-mutator/core

# Run
npx stryker run
```

**Supported Languages:**
- JavaScript/TypeScript
- C#
- Scala
- PHP
- More...

**Features:**
- 30+ mutation operators
- Parallel test execution
- Test runner agnostic
- CI/CD integration

### Python
**Mutmut** - Simple Python mutation testing

```bash
# Install
pip install mutmut

# Run
mutmut run

# Show results
mutmut results
```

**Alternative Tools:**
- **cosmic-ray** - More extensive mutation operators
- **pymut** - Lightweight alternative

### Other Languages
- **Go**: go-mutesting
- **Ruby**: mutant
- **C++**: Mull
- **.NET**: Stryker.NET

## Mutation Operators

### Common Mutations

| Operator | Original | Mutated | Example |
|----------|----------|---------|---------|
| **Arithmetic** | `+` | `-` | `a + b` → `a - b` |
| **Arithmetic** | `*` | `/` | `a * b` → `a / b` |
| **Logical** | `&&` | `\|\|` | `a && b` → `a \|\| b` |
| **Relational** | `<` | `<=` | `a < b` → `a <= b` |
| **Conditional** | `if (condition)` | `if (true)` | Entire condition removed |
| **Return** | `return value` | `return` | Return value removed |
| **Inline** | `x = 5` | `(x = 5)` | Statement removed |

### Java-Specific (PIT)
- Conditionals boundary mutations
- Mathematical operator mutations
- Return value mutations
- Method call removal

### JavaScript-Specific (Stryker)
- Block statement removal
- Conditional expression removal
- Equality operator mutations
- Array/Boolean literal mutations

## Interpreting Results

### Mutation Score

```
Mutation Score = (Killed Mutants / Total Mutants) × 100%
```

**Scoring Guidelines:**
- **80%+**: Excellent test suite
- **60-80%**: Good, some improvements needed
- **40-60%**: Moderate - many gaps
- **<40%**: Poor - tests not verifying behavior

### Types of Results

| Status | Meaning | Action |
|--------|---------|--------|
| **Killed** | Test caught mutation | ✓ Good test |
| **Survived** | Test didn't catch mutation | ✗ Add/improve assertion |
| **Timed Out** | Test hung (infinite loop) | ✗ Mutation created bug - mark as equivalent |
| **Error** | Test crashed | ⚠️ Test may be fragile |
| **No Coverage** | Code not executed | ✗ Add test for this path |

### Equivalent Mutants

Some mutations don't change behavior (false positives):

```python
# Original
if x > 5:
    return True

# Mutant (changed > to >=)
if x >= 5:
    return True

# If x is always an integer and tests never use x=5,
# this mutant is "equivalent" (not a real bug)
```

**Action:** Mark equivalent mutants to exclude from scoring.

## Best Practices

### 1. Start with Coverage, Then Mutate

```bash
# Step 1: Ensure good coverage
pytest --cov=app --cov-report=term-missing

# Step 2: Run mutation testing
mutmut run
```

### 2. Focus on High-Value Code

Prioritize mutation testing for:
- Business logic (calculations, validations)
- Security-critical code (auth, payments)
- Complex algorithms
- Public API methods

**Skip for:**
- Simple getters/setters
- Configuration code
- External library wrappers
- Auto-generated code

### 3. Use Selective Mutation

```bash
# Only mutate specific files
mutmut run --paths-to-mutate app/services/

# Only use certain mutation operators
stryker run --mutators=["arithmetic","logical"]
```

### 4. Integrate with CI/CD

```yaml
# GitHub Actions example
- name: Run mutation tests
  run: npx stryker run

- name: Check mutation score
  run: |
    SCORE=$(jq '.mutationScore' stryker-report.json)
    if (( $(echo "$SCORE < 60" | bc -l) )); then
      echo "Mutation score $SCORE below threshold 60"
      exit 1
    fi
```

### 5. Review Survived Mutants

For each survived mutant:
1. **Why did it survive?** No assertion checking that behavior
2. **Is it a real bug?** Would the change break production?
3. **Add specific assertion** to kill the mutant

```python
# Before: Survived mutant
def test_calculate_total():
    result = calculate_total(items)
    # No assertion checking actual value!

# After: Mutant killed
def test_calculate_total():
    result = calculate_total(items)
    assert result == expected_total  # Specific value check
```

## Common Pitfalls

### 1. Chasing 100% Score

Not all survived mutants are real issues:
- Equivalent mutants (behavior unchanged)
- Defensive code (unlikely scenarios)
- Type system enforced (compiler catches)

### 2. Ignoring Timeouts

Timeouts often indicate real bugs (infinite loops), not test issues:
- Mark as equivalent only after verification
- May need to refactor code to avoid timeouts

### 3. Running on Every Build

Mutation testing is slow:
- Run on nightly builds or PRs only
- Use incremental mutation testing (only changed code)
- Parallelize aggressively

### 4. Not Updating Tests

After seeing survived mutants:
- Don't just mark as equivalent
- Add assertions to kill them
- This is the whole point!

## Quick Reference

| Tool | Language | Command | CI/CD |
|------|----------|---------|-------|
| **PIT** | Java | `mvn pitest:mutationCoverage` | Maven plugin |
| **Stryker** | JS/TS | `npx stryker run` | GitHub Action |
| **Mutmut** | Python | `mutmut run` | `mutmut results` |
| **Cosmic Ray** | Python | `cosmic-ray run` | Custom |

## Key Takeaways

1. **Mutation testing validates test quality** - Coverage only validates execution
2. **Killed mutants = good tests** - Tests actually verify behavior
3. **Survived mutants = test gaps** - Add assertions to kill them
4. **80%+ mutation score** - Excellent test suite target
5. **Use selectively** - Focus on business logic and security code
6. **Integrate gradually** - Start with critical paths, expand

---

For TDD fundamentals, see: `SKILL.md`
For testing anti-patterns, see: `references/testing-anti-patterns.md`
