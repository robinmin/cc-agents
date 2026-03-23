---
name: coverage-analysis
description: "Interpreting coverage reports, categorizing gaps, threshold selection, and coverage vs. quality tradeoffs."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-23
updated_at: 2026-03-23
tags: [testing, coverage, gap-analysis, engineering-core]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: engineering-core
  interactions:
    - knowledge-only
see_also:
  - rd3:sys-testing
  - rd3:sys-testing/test-generation-patterns
---

# Coverage Analysis and Gap Interpretation

Coverage measurement is a baseline metric, not a quality guarantee.

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

### Statement Coverage

**Definition:** Percentage of statements executed (used in JavaScript/istanbul)

## Coverage Output Parsing

### Python (pytest-cov)

```bash
pytest --cov=src --cov-report=term-missing
```

**Output:**
```
Name                      Stmts   Miss  Cover   Missing
-------------------------------------------------------
src/auth.py                 89      5    94%   23-27
-------------------------------------------------------
TOTAL                      245     17    93%
```

**Parsing:**
```bash
# Extract overall coverage
awk '/^TOTAL/ { gsub("%", "", $4); print $4 }' coverage.log

# Extract uncovered line ranges from --cov-report=term-missing output
awk '$NF ~ /^[0-9,-]+$/ { print $1 ": " $NF }' coverage.log
```

### TypeScript/JavaScript (Vitest)

```bash
npx vitest --coverage
```

**Output:**
```
File              | % Stmts | % Branch | % Funcs | % Lines |
------------------|---------|----------|---------|---------|
auth.ts           |   92.31 |    87.5  |     80  |   92.31 |
------------------|---------|----------|---------|---------|
All files         |   90.48 |    85.42 |     77  |   90.48 |
```

### Go (builtin)

```bash
go test -coverprofile=coverage.out ./... && go tool cover -func=coverage.out
```

## Gap Analysis Strategies

### Phase 1: List Missing Lines

```bash
pytest --cov=src --cov-report=term-missing | awk '$NF ~ /^[0-9,-]+$/ { print $1 ": " $NF }'
```

### Phase 2: Categorize by Type

| Category | Example | Strategy |
|---------|---------|----------|
| Error paths | exception handlers | Add error condition tests |
| Edge cases | boundary conditions | Add boundary value tests |
| Unreachable | defensive checks | Document rationale, skip |
| Complex logic | nested conditionals | Add parameterized tests |
| External deps | API calls, files | Add mock-based tests |

### Phase 3: Prioritize

1. **High Priority** — Error paths, complex logic
2. **Medium Priority** — Edge cases, boundary conditions
3. **Low Priority** — Defensive checks, unreachable code
4. **Skip** — Impossible states with documented rationale

## Common Coverage Gaps

### Error Handling

```python
def process(data):
    if not data:
        raise ValueError("Empty data")  # Often uncovered
    return transform(data)
```

**Test:**
```python
def test_process_empty_data():
    with pytest.raises(ValueError):
        process(None)
```

### Edge Cases

```python
def paginate(items, page=1):
    if page < 1:
        raise ValueError("Invalid page")  # Often uncovered
    start = (page - 1) * 10
    return items[start:start+10]
```

**Test:**
```python
@pytest.mark.parametrize("page", [0, -1, 1])
def test_paginate_boundaries(page):
    if page < 1:
        with pytest.raises(ValueError):
            paginate([], page)
    else:
        paginate([], page)
```

### Branch Coverage

```python
def calculate_discount(user, amount):
    if user.is_vip():
        if amount > 100:
            return amount * 0.8
        return amount * 0.9
    return amount
```

**Tests needed:**
```python
def test_vip_large_order():
    result = calculate_discount(vip_user, 150)
    assert result == 120

def test_vip_small_order():
    result = calculate_discount(vip_user, 50)
    assert result == 45

def test_regular_user():
    result = calculate_discount(regular_user, 100)
    assert result == 100
```

## Coverage vs Quality

### The Coverage Fallacy

**Misconception:** "95% coverage means 95% bug-free"

**Reality:** Coverage measures execution, not correctness

```python
def add(a, b):
    return a + b

# 100% coverage but wrong
def test_add():
    add(1, 2)  # No assertion!
```

### The Fix

Always verify assertions exist:

```python
def test_add():
    assert add(1, 2) == 3
```

## When to Accept Lower Coverage

### Valid Reasons

1. **Generated Code** — Protobuf, OpenAPI clients (tested elsewhere)
2. **Simple Wrappers** — Delegation only, no logic
3. **Impossible States** — Defensive programming
4. **External Constraints** — Hardware-specific, third-party limitations

### Documentation Requirement

When accepting lower coverage, document rationale:

```python
# NOTE: Coverage excluded for hardware-specific error path
# This state is impossible in production environment
def handle_hardware_error():
    if hardware_state == IMPOSSIBLE_STATE:
        log_and_reboot()  # Not tested - unreachable in production
```

## Iteration Strategy

**Maximum iterations: 3.**

**Escalation criteria:**
- Coverage plateaus for 3 iterations
- Uncovered code requires significant refactoring
- External dependencies block testing

**Escalation actions:**
1. Adjust threshold downward
2. Document untestable code
3. Suggest architectural changes
4. Defer to manual testing
