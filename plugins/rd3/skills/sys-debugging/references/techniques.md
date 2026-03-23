---
name: sys-debugging-techniques
description: "Systematic debugging techniques: tracing, profiling, logging strategies, hypothesis testing, and verification methods."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-23
updated_at: 2026-03-23
tags: [debugging, techniques, tracing, profiling, logging]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: engineering-core
  interactions:
    - knowledge-only
see_also:
  - rd3:sys-debugging
  - rd3:sys-debugging/references/examples
  - rd3:sys-debugging/references/common-patterns
---

# Debugging Techniques

Systematic techniques for root cause investigation.

## Root Cause Tracing

### Call Chain Tracing

```
1. Identify where the error manifests (symptom location)
2. Find the immediate cause (what directly produces the error)
3. Ask "What called this?" — move up the call stack
4. Continue tracing until you find where bad data originated
5. That is your root cause — fix there, not at symptom
```

### Data Flow Analysis

Track how data transforms through the system:

```
Input -> Processing -> Transformation -> Output
   ^          ^              ^            ^
   |          |              |            |
 Origin   Intermediate   Validation    Final state
   |          |              |            |
   └──────────┴──────────────┴────────────┘
              Find where data goes wrong
```

### State Inspection

Dump and analyze program state at key points:

```python
# Python: Inspect state with pdb
import pdb; pdb.set_trace()

# Or use logging
logger.debug(f"State at line {lineno}: {vars(local_vars)}")
```

```typescript
// TypeScript: Structured state logging
console.debug("Order state:", {
  orderId: order.id,
  status: order.status,
  items: order.items.length,
  total: order.total,
});
```

## Profiling Techniques

### CPU Profiling

```bash
# Python: cProfile for CPU bottlenecks
python -m cProfile -s cumtime script.py

# Node: Built-in profiler
node --prof script.js
node --prof-process isolate-*.log > profile.txt

# Go: CPU profiling with pprof
go tool pprof http://localhost:6060/debug/pprof/profile
```

### Memory Profiling

```bash
# Python: memory_profiler
pip install memory_profiler
python -m memory_profiler script.py

# Node: Heap snapshots
node --inspect script.js
# Then use Chrome DevTools to capture heap snapshot

# Go: Memory profiling
go tool pprof http://localhost:6060/debug/pprof/heap
```

### Timing Analysis

```bash
# Python: trace execution time
python -X importtime script.py

# TypeScript: Performance marks
console.time("operation");
await doSomething();
console.timeEnd("operation");

# Go: Benchmark timing
go test -bench=. -benchmem ./pkg/
```

## Logging Strategies

### Log Level Usage

| Level | Use When | Example |
|-------|----------|---------|
| DEBUG | Diagnostic details | Variable values, path taken |
| INFO | Normal operations | Request received, operation completed |
| WARN | Unexpected but handled | Retry attempt, fallback used |
| ERROR | Operation failed | Exception thrown, request failed |

### Structured Logging

```python
# Python: Structured logging
import structlog
log = structlog.get_logger()

log.info("request_processed",
    request_id=request.id,
    user_id=user.id,
    duration_ms=elapsed,
    status_code=200,
)
```

```typescript
// TypeScript: Structured logging
logger.info("request_processed", {
  requestId: request.id,
  userId: user.id,
  durationMs: elapsed,
  statusCode: 200,
});
```

### Log Correlation

Trace requests across service boundaries:

```
# Add correlation ID to all logs
correlation_id: "abc-123-def"

# Every log line for this request includes the ID
[2024-01-15 10:23:45] INFO  [abc-123-def] Request received
[2024-01-15 10:23:46] DEBUG [abc-123-def] Database query executed
[2024-01-15 10:23:47] INFO  [abc-123-def] Response sent
```

## Hypothesis Testing

### Scientific Method Application

```
1. OBSERVE: What specifically happens?
2. HYPOTHESIZE: Why does it happen? (one specific cause)
3. PREDICT: If hypothesis is correct, what else should be true?
4. TEST: Design minimal experiment to test prediction
5. ANALYZE: Did results match prediction?
6. REPEAT or IMPLEMENT: Refine hypothesis or implement fix
```

### Minimal Reproduction

Create the smallest possible test case:

```python
# Instead of debugging entire system:
# Isolate the specific behavior

def test_specific_bug():
    # Minimal input that triggers bug
    input = {"key": "value"}
    result = process(input)
    assert result.expected == "actual"  # This fails
```

### Binary Search Debugging

When finding which change caused a problem:

```bash
# Git bisect for finding breaking commit
git bisect start
git bisect bad HEAD
git bisect good v1.0.0

# Git will checkout middle commit
# Test, then mark:
git bisect good  # or git bisect bad
# Repeat until first bad commit found
```

### Differential Analysis

Compare working vs broken:

| Aspect | Working | Broken | Difference |
|--------|---------|--------|------------|
| Code version | v1.2.0 | v1.3.0 | Updated dependencies |
| Environment | prod | staging | Different config |
| Data | Real | Test | Missing records |

## Verification Methods

### Deterministic Testing

Tests that always produce the same result:

```python
# Bad: Flaky test
def test_sometimes_passes():
    time.sleep(0.1)  # Race condition
    assert result == expected

# Good: Deterministic
def test_consistently_passes():
    # Wait for actual completion, not arbitrary time
    await wait_for_result(predicate=lambda: result is not None)
    assert result == expected
```

### Mutation Testing

Verify tests catch bugs by introducing bugs:

```bash
# Python: mutmut
pip install mutmut
mutmut run

# JavaScript: stryker
npx stryker run
```

### Regression Testing

Ensure fixes don't break other things:

```bash
# Run specific test that failed
pytest tests/test_specific.py -v

# Run full suite (after local fix passes)
pytest tests/ -v --tb=short

# Run affected area tests
pytest tests/unit/ tests/integration/ -v
```

## Debugging Commands Quick Reference

### Python

```bash
# Interactive debugger
python -m pdb script.py

# Post-mortem (debug after crash)
python -m pdb -c continue script.py

# Detailed traceback
python script.py 2>&1 | cat

# Profile CPU
python -m cProfile -s cumtime script.py
```

### TypeScript/Node

```bash
# Debug with Chrome DevTools
node --inspect-brk script.ts

# Detect open handles (hanging processes)
npm test -- --detectOpenHandles

# Debug specific test
npm test -- --testNamePattern="test name" --runInBand
```

### Go

```bash
# Debug with Delve
dlv debug ./cmd/app

# Race condition detection
go test -race ./...

# Verbose test output
go test -v -count=1 ./...
```

### Browser DevTools

```
1. Sources panel: Set breakpoints, step through code
2. Console: Execute arbitrary JS, inspect variables
3. Network: Inspect HTTP requests/responses
4. Application: Inspect cookies, localStorage, state
5. Performance: Profile rendering, find jank
```
