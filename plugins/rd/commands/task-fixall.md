---
description: Fix all lint, type, and test errors in a project using deterministic single-pass workflow
argument-hint: [validation-command] (e.g., "npm run check", "make lint test")
---

# Fix All Issues

Systematically resolve all validation errors (lint, typecheck, tests) using a deterministic workflow that maximizes auto-fix and minimizes cascading failures.

**Core Principle:** Apply `sys-debugging` methodology — NO FIXES WITHOUT ROOT CAUSE FIRST.

## Quick Start

```bash
/rd:task-fixall "biome check --write . && tsc --noEmit && vitest run"
```

If no command provided, auto-detect from config files and confirm with user.

## Auto-Detection

| Config File | Commands |
|-------------|----------|
| `biome.json` | `biome check --write .` |
| `.eslintrc.*` | `eslint . --fix` |
| `tsconfig.json` | `tsc --noEmit` |
| `pyproject.toml` | `ruff check . --fix && mypy .` |
| `Cargo.toml` | `cargo fmt && cargo clippy && cargo test` |
| `go.mod` | `gofmt -w . && go vet ./... && go test ./...` |

## Workflow

```
Phase 1: Capture → Phase 2: Parse → Phase 3: Auto-Fix → Phase 4: Diagnose → Phase 5: Fix → Phase 6: Validate
```

### Phase 1: Capture Validation Output

Run validation command and capture stdout/stderr to temp file for structured analysis:

```bash
# Create temp file for this session
FIXALL_LOG=$(mktemp /tmp/fixall-XXXXXX.log)

# Run validation, capture all output
eval "$VALIDATION_CMD" 2>&1 | tee "$FIXALL_LOG"

# Report file location
echo "Validation output saved to: $FIXALL_LOG"
```

**Why capture to file:**
- Enables multiple parsing passes without re-running validation
- Preserves full context for root cause analysis
- Allows use of powerful text tools (grep, awk, sed, ast-grep)
- Prevents task missing in complex fixing process

### Phase 2: Parse and Categorize Errors

Use local tools to extract structured issue list from captured output.

#### 2.1 Count Issues by Type

```bash
# TypeScript errors
grep -c "error TS[0-9]*:" "$FIXALL_LOG" || echo "0"

# ESLint/Biome errors
grep -c "error\|✖" "$FIXALL_LOG" || echo "0"

# Test failures
grep -c "FAIL\|✗\|FAILED" "$FIXALL_LOG" || echo "0"

# Python (mypy)
grep -c "error:" "$FIXALL_LOG" || echo "0"

# Rust (cargo)
grep -c "^error\[E[0-9]*\]:" "$FIXALL_LOG" || echo "0"
```

#### 2.2 Extract Structured Issue List

**TypeScript (`tsc`):**
```bash
# Extract: file:line:col - error TSxxxx: message
grep -E "^[^:]+:[0-9]+:[0-9]+ - error TS[0-9]+:" "$FIXALL_LOG" | \
  awk -F': ' '{print $1 "|" $2 "|" $3}' | \
  sort -t'|' -k2 > /tmp/ts-errors.txt

# Group by error code
awk -F'|' '{print $2}' /tmp/ts-errors.txt | sort | uniq -c | sort -rn
```

**ESLint/Biome:**
```bash
# Extract: file:line:col rule-id message
grep -E "^\s+[0-9]+:[0-9]+\s+(error|warning)" "$FIXALL_LOG" | \
  sed 's/^\s*//' > /tmp/lint-errors.txt

# Group by rule
awk '{print $3}' /tmp/lint-errors.txt | sort | uniq -c | sort -rn
```

**Python (mypy/ruff):**
```bash
# Extract: file:line: error: message [code]
grep -E "^[^:]+:[0-9]+: error:" "$FIXALL_LOG" | \
  awk -F': ' '{print $1 "|" $3}' > /tmp/py-errors.txt

# Group by error type
grep -oE '\[[a-z-]+\]' /tmp/py-errors.txt | sort | uniq -c | sort -rn
```

**Go:**
```bash
# Extract: file:line:col: message
grep -E "^[^:]+\.go:[0-9]+:" "$FIXALL_LOG" > /tmp/go-errors.txt
```

**Rust (cargo):**
```bash
# Extract error codes
grep -oE "error\[E[0-9]+\]" "$FIXALL_LOG" | sort | uniq -c | sort -rn
```

**Test failures (Jest/Vitest/pytest):**
```bash
# Extract failed test names
grep -E "✕|FAIL|FAILED" "$FIXALL_LOG" | head -20
```

#### 2.3 Generate Priority Report

```bash
echo "=== Issue Summary ==="
echo "Build errors:  $(grep -c 'error TS1[0-9]*:' "$FIXALL_LOG" 2>/dev/null || echo 0)"
echo "Type errors:   $(grep -c 'error TS2[0-9]*:' "$FIXALL_LOG" 2>/dev/null || echo 0)"
echo "Lint errors:   $(grep -c 'error.*@' "$FIXALL_LOG" 2>/dev/null || echo 0)"
echo "Test failures: $(grep -c 'FAIL\|✕' "$FIXALL_LOG" 2>/dev/null || echo 0)"
echo ""
echo "=== Top Error Types ==="
grep -oE 'error TS[0-9]+|error\[E[0-9]+\]|\[[a-z-]+\]' "$FIXALL_LOG" | \
  sort | uniq -c | sort -rn | head -10
```

#### 2.4 Create Todo List from Parsed Errors

Use `TodoWrite` to create actionable items grouped by error type:

```markdown
## Fixing Plan

### Priority 1: Build Errors (blocks all)
- [ ] Fix TS1005: Missing semicolon (3 files)

### Priority 2: Type Errors (by frequency)
- [ ] Fix TS2345: Argument type mismatch (12 occurrences)
- [ ] Fix TS2322: Type assignment error (8 occurrences)
- [ ] Fix TS2339: Property does not exist (5 occurrences)

### Priority 3: Test Failures
- [ ] Fix: auth.test.ts - login flow
- [ ] Fix: api.test.ts - timeout handling

### Priority 4: Lint Warnings
- [ ] Fix: @typescript-eslint/no-explicit-any (15 occurrences)
```

### Phase 3: Auto-Fix First

**Critical**: Run ALL auto-fix tools BEFORE manual investigation to establish clean baseline.

| Language | Auto-Fix Command |
|----------|------------------|
| JS/TS | `biome check --write .` or `eslint --fix && prettier --write` |
| Python | `ruff check --fix . && ruff format .` |
| Rust | `cargo fmt` |
| Go | `gofmt -w . && goimports -w .` |

Re-run validation, capture to same log file, update todo list with remaining issues.

```bash
# Re-capture after auto-fix
eval "$VALIDATION_CMD" 2>&1 | tee "$FIXALL_LOG"

# Re-parse to get remaining issues
echo "=== Remaining after auto-fix ==="
grep -c "error" "$FIXALL_LOG" || echo "0 errors remaining"
```

### Phase 4: Root Cause Diagnosis (sys-debugging Integration)

**STOP. Before touching code, apply the sys-debugging four-phase framework.**

For each remaining error, use the captured log to investigate:

#### 4.1 Extract Context for Specific Error

```bash
# Get full context around an error (5 lines before/after)
grep -B5 -A5 "error TS2345" "$FIXALL_LOG"

# Find all files with specific error type
grep "error TS2345" "$FIXALL_LOG" | awk -F: '{print $1}' | sort -u

# Get line numbers for targeted reading
grep "error TS2345" "$FIXALL_LOG" | awk -F: '{print $1 ":" $2}'
```

#### 4.2 Root Cause Investigation

```
1. Read the FULL error message - every word matters
2. Identify symptom location vs. origin location
3. Trace data flow backward to find where bad value originates
4. Ask: "What assumption was violated?"
```

**Root Cause Tracing:**
```
Symptom: TypeError at line 45
    ↓ What called this?
Immediate cause: `user` is None
    ↓ Where does `user` come from?
Origin: `get_user()` returns None for expired tokens
    ↓ Why wasn't this caught?
Root cause: Silent failure in JWT validation (no exception raised)
```

**Key principle:** Never fix where errors appear—trace to original trigger.

#### 4.3 Pattern Analysis

1. Find similar working code in codebase
2. Compare implementations completely
3. Identify what's different between working and broken
4. Understand the dependency chain

#### 4.4 Hypothesis Formation

Before ANY fix attempt:

```markdown
**Error:** [exact error message]
**Hypothesis:** "This fails because [X]"
**Predicted fix:** [specific change]
**Verification:** [how to confirm fix works]
```

### Phase 5: Systematic Fix Implementation (Grouped by Error Type)

**Fix by error type group** - This approach fixes all instances of the same error together, which:
- Reveals patterns and common root causes
- Enables batch fixes for similar issues
- Prevents redundant investigation

#### 5.1 Group Errors from Log

```bash
# List all unique error types with counts
grep -oE 'error TS[0-9]+|error\[E[0-9]+\]|error:.*\[' "$FIXALL_LOG" | \
  sort | uniq -c | sort -rn

# Get all files for a specific error type
grep "error TS2345" "$FIXALL_LOG" | awk -F: '{print $1}' | sort -u
```

#### 5.2 Fix One Error Type at a Time

For each error type group:

1. **List all occurrences** from log file
2. **Identify common pattern** - Why does this error appear in multiple places?
3. **Fix at source** if there's a shared root cause
4. **Apply consistent fix** across all occurrences
5. **Validate after each group** - Re-run validation

```bash
# After fixing one error type group, re-validate and update log
eval "$VALIDATION_CMD" 2>&1 | tee "$FIXALL_LOG"

# Check remaining count for that error type
grep -c "error TS2345" "$FIXALL_LOG" || echo "0 remaining"
```

#### 5.3 Per-Issue Fix Process

For each diagnosed issue:

1. **Read file thoroughly** - understand full context before editing
2. **Apply minimal fix** - address root cause, not symptoms
3. **Validate immediately** - catch regressions early
4. **Update todo** - mark complete or document blockers

**Fix Priority (architectural order):**

| Priority | Type | Rationale |
|----------|------|-----------|
| 1 | Build/compile errors | Blocks everything downstream |
| 2 | Import/module errors | May cause cascading type failures |
| 3 | Type errors | Often reveals logic bugs |
| 4 | Test failures | Confirms behavior correctness |
| 5 | Lint warnings | Code quality (lowest priority) |

**Critical Rule:** If THREE fixes fail consecutively, STOP. This signals architectural problems requiring analysis, not more patches.

### Phase 6: Final Validation

1. Run full validation suite and capture final state
2. Verify zero errors
3. Run tests to confirm no regressions
4. Document any suppressions with reasoning
5. Clean up temp files
6. Report summary

```bash
# Final validation
eval "$VALIDATION_CMD" 2>&1 | tee "$FIXALL_LOG"

# Verify zero errors
ERROR_COUNT=$(grep -c "error" "$FIXALL_LOG" 2>/dev/null || echo "0")
if [ "$ERROR_COUNT" -eq 0 ]; then
  echo "✅ All validations pass"
else
  echo "❌ $ERROR_COUNT errors remaining"
  grep "error" "$FIXALL_LOG" | head -10
fi

# Cleanup (optional - keep for debugging)
# rm -f "$FIXALL_LOG"
```

## Red Flags - Process Violations

**STOP immediately if you catch yourself thinking:**

- ❌ "Quick fix for now, investigate later"
- ❌ "One more fix attempt" (after multiple failures)
- ❌ "This should work" (without understanding why)
- ❌ "Let me just try..." (without hypothesis)

**Instead:**
- ✅ "What is the root cause?"
- ✅ "Where does this value originate?"
- ✅ "What assumption changed?"

## Language Patterns

### TypeScript/JavaScript

| Issue | Root Cause Approach |
|-------|---------------------|
| `any` type | Trace where untyped data enters; add types at source |
| Unused variable | Check if removal breaks anything; understand why it exists |
| Missing return type | Read function to understand actual return; don't guess |
| Unsafe access | Trace where null originates; add validation at source |
| Type mismatch | Compare expected vs actual; find where divergence starts |

### Python

| Issue | Root Cause Approach |
|-------|---------------------|
| Type error (mypy) | Trace value through call chain; add hints at origin |
| AttributeError | Find where None/wrong type is introduced |
| Import error | Check circular dependencies, missing `__init__.py` |

### Go

| Issue | Root Cause Approach |
|-------|---------------------|
| nil pointer | Trace where pointer becomes nil; add early validation |
| Interface mismatch | Compare method signatures; find missing/wrong methods |
| Race condition | Use `go test -race`; identify shared mutable state |

### Rust

| Issue | Root Cause Approach |
|-------|---------------------|
| Borrow checker | Map ownership flow; restructure if needed |
| Type mismatch | Trace through generics/traits to find constraint |
| Dead code | Verify truly unused before removing |

## Suppress vs Fix Decision Matrix

| Suppress When | Fix When |
|---------------|----------|
| Confirmed false positive | Genuine issue |
| Intentional pattern (documented) | Unintentional oversight |
| Third-party code limitation | Your code's responsibility |
| Legacy with migration plan | New/actively modified code |

**Always document suppressions:**
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// Reason: External API returns untyped; tracked in TECH-123
const response: any = await externalApi.fetch();
```

## Anti-Patterns

| Avoid | Why | Instead |
|-------|-----|---------|
| Manual formatting | Wastes time, causes conflicts | Let auto-formatter handle |
| Batch edits without validation | Cascading failures hide root cause | Fix and validate incrementally |
| Guessing at types | Creates new bugs | Read code, trace actual type |
| Suppressing without comment | Future confusion | Always document reasoning |
| Fixing at symptom location | Masks real problem | Trace to root cause first |
| Multiple fix attempts | Signals wrong hypothesis | Stop, re-analyze, new hypothesis |

## Debugging Tools Reference

| Language | Verbose Diagnostics |
|----------|---------------------|
| TypeScript | `tsc --noEmit --extendedDiagnostics` |
| Python | `pytest -v --tb=long -x` |
| Go | `go test -race -v ./...` |
| Rust | `cargo clippy -- -W clippy::pedantic` |

**Git bisect for regressions:**
```bash
git bisect start && git bisect bad HEAD && git bisect good <last-known-good>
```

## Completion Criteria

Done when:
- ✅ All validation commands pass (zero errors)
- ✅ Todo list complete or blockers documented
- ✅ No regressions (tests pass)
- ✅ Each fix has documented root cause
- ✅ No "quick fix" rationalization used

## Output Format

```markdown
## Fix Summary

**Validation Command:** `npm run check`
**Log File:** `/tmp/fixall-abc123.log`

### Issue Breakdown (from parsed log)

| Error Type | Count | Priority | Status |
|------------|-------|----------|--------|
| TS2345 (arg mismatch) | 12 | High | ✅ Fixed |
| TS2322 (type assign) | 8 | High | ✅ Fixed |
| TS2339 (prop missing) | 5 | Medium | ✅ Fixed |
| Test failures | 2 | High | ✅ Fixed |
| Lint warnings | 15 | Low | ✅ Auto-fixed |

### Root Causes Identified
1. **Type errors (25):** API response type changed in v2.0, callers not updated
2. **Test failures (2):** Missing mock for new auth endpoint

### Fixes Applied
| Error Type | Root Cause | Fix Location | Files |
|------------|------------|--------------|-------|
| TS2345 | API v2 response shape | `types/api.d.ts` | 12 |
| TS2322 | Nullable field | `models/user.ts` | 8 |
| Test timeout | Missing mock | `__mocks__/auth.ts` | 2 |

**Auto-Fixed (15):** Import ordering (10), formatting (5)
**Manually Fixed (25):** Type errors (23), test failures (2)
**Suppressed (0):** none
**Remaining (0):** none

✅ All validations pass
```

## Integration with Skills

- **sys-debugging**: Core methodology for root cause analysis (automatically applied)
- **testing-patterns**: Create regression tests for fixed bugs
- **code-review**: Review fixes for unintended side effects

## See Also

- `/rd:task-run` - For planning implementation before fixing
- `sys-debugging` skill - Detailed debugging methodology and examples
