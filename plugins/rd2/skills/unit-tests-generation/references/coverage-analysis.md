# Coverage Analysis and Interpretation

## Overview

Coverage measurement is a baseline metric, not a quality guarantee. This document explains how to properly interpret coverage reports and use them effectively in AI-assisted test generation.

## Coverage Metrics Explained

### Line Coverage

**Definition:** Percentage of executable lines executed by tests

**Interpretation:**
- 70-75%: Acceptable baseline
- 80-85%: Good coverage
- 90%+: High coverage

**Limitations:**
- Doesn't measure if assertions exist
- Doesn't verify correct behavior
- May miss logical branches

### Branch Coverage

**Definition:** Percentage of conditional branches taken

**Interpretation:**
- More meaningful than line coverage
- Measures if/else paths
- Catches missing condition tests

**Limitations:**
- Still doesn't verify assertions
- May not catch all edge cases

### Statement Coverage

**Definition:** Percentage of statements executed

**Interpretation:**
- Similar to line coverage
- Used in JavaScript tools (istanbul)

**Limitations:**
- Coarser than line coverage
- Doesn't measure branch complexity

## Coverage Output Parsing

### Python (pytest-cov)

```bash
pytest --cov=src --cov-report=term-missing
```

**Output Format:**
```
Name                      Stmts   Miss  Cover   Missing
-------------------------------------------------------
src/auth.py                 89      5    94%   23-27
src/user.py                156     12    92%   45-48, 78-82
-------------------------------------------------------
TOTAL                      245     17    93%
```

**Parsing Strategy:**
```bash
# Extract overall coverage
grep -oP 'Coverage: \K[0-9]+' coverage.log

# Extract missing lines
grep -P "^\s+\S+:\s+[0-9]+\s+miss\s*$" coverage.log
```

### TypeScript/JavaScript (istanbul)

```bash
npm test -- --coverage
```

**Output Format:**
```
File              | % Stmts | % Branch | % Funcs | % Lines |
------------------|---------|----------|---------|---------|
auth.ts           |   92.31 |    87.5  |     80  |   92.31 |
user.ts           |   88.89 |    83.33 |     75  |   88.89 |
------------------|---------|----------|---------|---------|
All files         |   90.48 |    85.42 |     77  |   90.48 |
```

**Parsing Strategy:**
```bash
# Extract statements coverage
grep -oP 'Statements.*\K[0-9.]+' coverage.log | head -1
```

### Go (builtin)

```bash
go test -cover ./...
```

**Output Format:**
```
ok  	github.com/user/project/auth	0.543s	coverage: 87.5% of statements
ok  	github.com/user/project/user	0.234s	coverage: 92.3% of statements
```

**Parsing Strategy:**
```bash
# Extract coverage percentage
grep -oP '[0-9.]+%' coverage.log | head -1 | tr -d '%'
```

### Rust (tarpaulin)

```bash
cargo tarpaulin --out Stdout
```

**Output Format:**
```
|| Tested/Total Lines:
|| src/auth.rs: 85.71%
|| src/user.rs: 92.31%
||
|| 86.67% coverage, 78.57% documentation coverage
```

**Parsing Strategy:**
```bash
# Extract overall coverage
grep -oP '[0-9.]+%' coverage.log | head -1 | tr -d '%'
```

## Coverage Threshold Selection

### Recommended Thresholds by Code Type

| Code Type                   | Recommended Range | Rationale                                   |
|----------------------------|-------------------|---------------------------------------------|
| Standard production code    | 70-75%           | Balance between effort and reliability      |
| Critical infrastructure     | 80-85%           | Higher stakes justify more testing           |
| Security-sensitive code     | 85-90%           | Security bugs are expensive                  |
| Library code               | 85-90%           | Public API requires comprehensive tests     |
| Regulated systems           | 90-95%           | Compliance requirements                     |
| UI/Components               | 70-80%           | Visual testing also important                |
| Scripts/Utilities           | 60-70%           | Lower risk, often one-off usage              |

### Diminishing Returns Analysis

**Research Finding:** Above 95% coverage, effort increases exponentially while value decreases.

**Why:**
- Trivial getters/setters don't need tests
- Error handling for impossible states
- Configuration file parsing

**Recommendation:** Stop at 85-90% unless specific requirements exist

## Gap Analysis Strategies

### Identifying Uncovered Code

**Phase 1: List Missing Lines**

```bash
# Python
pytest --cov=src --cov-report=term-missing | grep "Missing"

# Output: 23-27, 45-48, 78-82
```

**Phase 2: Categorize by Type**

| Category          | Example Lines          | Strategy                          |
|-------------------|------------------------|-----------------------------------|
| Error paths       | exception handlers     | Add error condition tests          |
| Edge cases        | boundary conditions    | Add boundary value tests           |
| Unreachable       | defensive checks       | Document rationale, skip           |
| Complex logic     | nested conditionals    | Add parameterized tests            |
| External deps     | API calls, files       | Add mock-based tests               |

**Phase 3: Prioritize**

1. **High Priority** - Error paths, complex logic
2. **Medium Priority** - Edge cases, boundary conditions
3. **Low Priority** - Defensive checks, unreachable code
4. **Skip** - Impossible states with documented rationale

### Common Coverage Gaps

#### 1. Error Handling

**Pattern:**
```python
def process(data):
    if not data:
        raise ValueError("Empty data")  # Often uncovered
    return transform(data)
```

**Test Strategy:**
```python
def test_process_empty_data():
    with pytest.raises(ValueError):
        process(None)
```

#### 2. Edge Cases

**Pattern:**
```python
def paginate(items, page=1):
    if page < 1:
        raise ValueError("Invalid page")  # Often uncovered
    start = (page - 1) * 10
    return items[start:start+10]
```

**Test Strategy:**
```python
@pytest.mark.parametrize("page", [0, -1, 1])
def test_paginate_boundaries(page):
    if page < 1:
        with pytest.raises(ValueError):
            paginate([], page)
    else:
        paginate([], page)
```

#### 3. Branch Coverage

**Pattern:**
```python
def calculate_discount(user, amount):
    if user.is_vip():           # Branch 1
        if amount > 100:        # Branch 2
            return amount * 0.8
        return amount * 0.9
    return amount               # Branch 3
```

**Test Strategy:**
```python
def test_vip_large_order():
    result = calculate_discount(vip_user, 150)
    assert result == 120  # Branch 1 + 2

def test_vip_small_order():
    result = calculate_discount(vip_user, 50)
    assert result == 45  # Branch 1 only

def test_regular_user():
    result = calculate_discount(regular_user, 100)
    assert result == 100  # Branch 3
```

## When to Accept Lower Coverage

### Valid Reasons

1. **Generated Code** - Protobuf, OpenAPI clients
2. **Simple Wrappers** - Delegation only, no logic
3. **Impossible States** - Defensive programming
4. **External Constraints** - Hardware-specific, third-party limitations

### Documentation Requirement

When accepting lower coverage, document rationale:

```python
# NOTE: Coverage excluded for hardware-specific error path
# This state is impossible in production environment
# See: https://internal-docs.com/hardware-limits
def handle_hardware_error():
    if hardware_state == IMPOSSIBLE_STATE:
        log_and_reboot()  # Not tested - unreachable in production
```

## Coverage vs Quality

### The Coverage Fallacy

**Misconception:** "95% coverage means 95% bug-free"

**Reality:** Coverage measures execution, not correctness

**Example:**
```python
def add(a, b):
    return a + b

# Test with 100% coverage but wrong assertion
def test_add():
    add(1, 2)  # Coverage achieved
    # Missing: assert add(1, 2) == 3
```

### Combining with Mutation Testing

**Approach:**
1. Generate tests for coverage baseline (80-85%)
2. Run mutation testing to measure quality
3. Add tests for surviving mutants
4. Iterate until mutation score acceptable

**Tools:**
- Python: `mutmut`, `pymut`
- JavaScript: `stryker`
- Go: `go-mutesting`

## Iteration Strategy

### Maximum Iterations: 3

**Rationale:** Prevent infinite loops on difficult-to-test code

**Escalation Criteria:**
- Coverage plateaus for 3 iterations
- Uncovered code requires significant refactoring
- External dependencies block testing

**Escalation Actions:**
1. Adjust threshold downward
2. Document untestable code
3. Suggest architectural changes
4. Defer to manual testing

## Sources

- [Istambul.js Coverage Documentation](https://istanbul.js.org/)
- [Pytest-Cov Documentation](https://pytest-cov.readthedocs.io/)
- [Go Test Coverage](https://go.dev/doc/additional_coverage)
- [Cargo Tarpaulin](https://github.com/xd009642/tarpaulin)
