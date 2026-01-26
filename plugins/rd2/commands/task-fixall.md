---
description: Fix all lint, type, and test errors using deterministic single-pass workflow with sys-debugging methodology
skills:
  - rd2:sys-debugging
argument-hint: "[<validation-command>]"
---

# Task Fixall

Systematically resolve all validation errors (lint, typecheck, tests) using a deterministic workflow that maximizes auto-fix and applies sys-debugging methodology for root cause analysis.

**Core Principle:** Apply `sys-debugging` methodology — NO FIXES WITHOUT ROOT CAUSE FIRST.

## Quick Start

```bash
# With explicit validation command
/rd2:task-fixall "biome check --write . && tsc --noEmit && vitest run"

# Auto-detect from config files
/rd2:task-fixall
```

## When to Use

**Activate this command when:**

- After implementation fails validation (`--verify` flag in tasks-plan)
- Test suite has multiple failures (10+ errors)
- Type errors are blocking compilation
- Lint errors need systematic resolution
- Need root cause analysis (not just symptom fixing)

**Do NOT use for:**

- Single obvious error (fix directly)
- Test failures requiring logic changes (use sys-debugging directly)
- New feature implementation (use code-generate instead)
- Runtime errors without test failures (use sys-debugging)

## Arguments

| Argument              | Required | Description                                                    |
| --------------------- | -------- | -------------------------------------------------------------- |
| `validation-command`  | No       | Command to validate (e.g., `npm test`, `cargo test`, `make check`) |

**Validation Behavior:**
- If command provided but fails to run → Error with command output
- If auto-detect finds nothing → Ask user for validation command
- If no config files detected → Suggest common patterns (npm test, cargo test, pytest)

If no command provided, auto-detect from project config files.

## Workflow

This command implements a self-contained 6-phase workflow:

1. **Detect** validation command (from args or auto-detect from config files)
2. **Capture** output to temp file using `tee`
3. **Parse** errors using grep/awk for categorization
4. **Auto-fix** using language-specific tools (biome/eslint/ruff/cargo)
5. **Diagnose** root causes using `rd2:sys-debugging` skill
6. **Fix** systematically by error type group
7. **Validate** until all tests pass or user intervenes

**No agent delegation** — All logic implemented directly in this command following rd2 "self-contained" pattern.

## Auto-Detection

| Config File       | Detection Pattern           | Auto-Fix Command                            |
| ----------------- | --------------------------- | ------------------------------------------- |
| `biome.json`      | `"biome"` in filename       | `biome check --write .`                     |
| `.eslintrc.*`     | `"eslint"` in filename      | `eslint . --fix`                            |
| `tsconfig.json`   | `"tsconfig"` in filename    | `tsc --noEmit`                               |
| `pyproject.toml`  | `"pyproject"` in filename   | `ruff check --fix . && mypy .`              |
| `Cargo.toml`      | `"Cargo.toml"` in filename  | `cargo fmt && cargo clippy && cargo test`    |
| `go.mod`          | `"go.mod"` in filename      | `gofmt -w . && go vet ./... && go test ./...` |

## 6-Phase Workflow

### Phase 1: Capture Validation Output

Create temp file and capture all output:

```bash
# Create temp file for this session
FIXALL_LOG=$(mktemp /tmp/fixall-XXXXXX.log)

# Run validation, capture all output
eval "$VALIDATION_CMD" 2>&1 | tee "$FIXALL_LOG"

# Get exit code
EXIT_CODE=${PIPESTATUS[0]}

echo "Validation output saved to: $FIXALL_LOG"
echo "Exit code: $EXIT_CODE"
```

### Phase 2: Parse and Categorize Errors

Count issues by type using grep:

```bash
# TypeScript errors
grep -c "error TS[0-9]*:" "$FIXALL_LOG" || echo "0 TS errors"

# ESLint/Biome errors
grep -c "error\|✖" "$FIXALL_LOG" || echo "0 lint errors"

# Test failures
grep -c "FAIL\|✗\|FAILED" "$FIXALL_LOG" || echo "0 test failures"

# Python (mypy)
grep -c "error:" "$FIXALL_LOG" || echo "0 Python errors"

# Rust (cargo)
grep -c "^error\[E[0-9]*\]:" "$FIXALL_LOG" || echo "0 Rust errors"
```

### Phase 3: Auto-Fix First

**Critical**: Run ALL auto-fix tools BEFORE manual investigation.

| Language | Auto-Fix Command |
|----------|------------------|
| JS/TS    | `biome check --write .` or `eslint . --fix` |
| Python   | `ruff check --fix . && ruff format .` |
| Rust     | `cargo fmt` |
| Go       | `gofmt -w . && goimports -w .` |

```bash
# Detect language and run auto-fix
if [ -f "biome.json" ]; then
  biome check --write .
elif [ -f ".eslintrc.js" ] || [ -f ".eslintrc.json" ]; then
  eslint . --fix
elif [ -f "pyproject.toml" ]; then
  ruff check --fix . && ruff format .
elif [ -f "Cargo.toml" ]; then
  cargo fmt
elif [ -f "go.mod" ]; then
  gofmt -w .
fi

# Re-run validation and capture
eval "$VALIDATION_CMD" 2>&1 | tee "$FIXALL_LOG"
```

### Phase 4: Root Cause Diagnosis (sys-debugging)

**STOP. Before touching code, apply sys-debugging four-phase framework.**

Use the captured log to investigate:

```bash
# Get full context around an error (5 lines before/after)
grep -B5 -A5 "error TS2345" "$FIXALL_LOG"

# Find all files with specific error type
grep "error TS2345" "$FIXALL_LOG" | awk -F: '{print $1}' | sort -u

# Get line numbers for targeted reading
grep "error TS2345" "$FIXALL_LOG" | awk -F: '{print $1 ":" $2}'
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

### Phase 5: Systematic Fix Implementation

**Fix by error type group** — fix all instances of same error together:

1. **List all occurrences** from log file
2. **Identify common pattern**
3. **Fix at source** if shared root cause
4. **Apply consistent fix** across all occurrences
5. **Validate after each group**

```bash
# After fixing one error type group, re-validate
eval "$VALIDATION_CMD" 2>&1 | tee "$FIXALL_LOG"

# Check remaining count
grep -c "error TS2345" "$FIXALL_LOG" || echo "0 remaining"
```

**Fix Priority (architectural order):**

| Priority | Type              | Rationale                          |
| -------- | ----------------- | ---------------------------------- |
| 1        | Build/compile     | Blocks everything downstream       |
| 2        | Import/module     | May cause cascading type failures  |
| 3        | Type errors       | Often reveals logic bugs           |
| 4        | Test failures     | Confirms behavior correctness      |
| 5        | Lint warnings     | Code quality (lowest priority)     |

**Critical Rule**: If THREE fixes fail consecutively, STOP. This signals architectural problems.

### Phase 6: Final Validation

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
```

### Error Handling

If validation still fails after fixall:
- Report remaining error count
- Show first 10 errors for review
- Ask user: "Continue fixing? [Yes/No/Manual]"
- If Yes: Repeat Phase 4-5
- If No: Exit with manual fix instructions

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

## Examples

### TypeScript Project

```bash
/rd2:task-fixall "biome check --write . && tsc --noEmit && vitest run"

# Output:
# → Creating temp log: /tmp/fixall-abc123.log
# → Running validation...
# → Found 23 errors
# → Phase 2: Parse and categorize...
#   - Type errors: 15
#   - Test failures: 5
#   - Lint errors: 3
# → Phase 3: Auto-fix...
# → Running: biome check --write .
# → Re-validating... 15 errors remaining
# → Phase 4: Root cause analysis...
# → Analyzing error TS2345 (12 occurrences)
# → Root cause: API response type changed in v2.0
# → Phase 5: Fix by error type group...
# → Fixing TS2345: Updated types/api.d.ts
# → Re-validating... 3 errors remaining
# → Phase 6: Final validation...
# ✅ All validations pass
```

### Python Project

```bash
/rd2:task-fixall "ruff check . --fix && mypy . && pytest"
```

### Rust Project

```bash
/rd2:task-fixall "cargo fmt && cargo clippy && cargo test"
```

### Auto-Detect

```bash
/rd2:task-fixall

# Output:
# → Detecting project configuration...
# → Found: biome.json, tsconfig.json
# → Auto-detected command: biome check --write . && tsc --noEmit
# → Proceeding with workflow...
```

## Design Philosophy

**Self-Contained Workflow** — This command implements the complete 6-phase fixing workflow directly:
- Uses bash tools (grep, awk, sed) for parsing
- Applies sys-debugging methodology via `rd2:sys-debugging` skill
- No separate agent needed — all logic in this command

**Root Cause First** — Never fix where errors appear—trace to original trigger:
- Read FULL error message—every word matters
- Identify symptom location vs. origin location
- Trace data flow backward to find where bad value originates
- Form hypothesis before fixing

## Error Patterns by Language

### TypeScript/JavaScript

| Issue | Root Cause Approach |
|-------|---------------------|
| `any` type | Trace where untyped data enters; add types at source |
| Unused variable | Check if removal breaks anything; understand why |
| Missing return type | Read function to understand actual return; don't guess |
| Unsafe access | Trace where null originates; add validation at source |
| Type mismatch | Compare expected vs. actual; find where divergence starts |

### Python

| Issue | Root Cause Approach |
|-------|---------------------|
| Type error (mypy) | Trace value through call chain; add hints at origin |
| AttributeError | Find where None/wrong type is introduced |
| Import error | Check circular dependencies, missing `__init__.py` |

### Go

| Issue | Root Cause Approach |
|-------|---------------------|
| Nil pointer | Trace where pointer becomes nil; add early validation |
| Interface mismatch | Compare method signatures; find missing/wrong methods |
| Race condition | Use `go test -race`; identify shared mutable state |

### Rust

| Issue | Root Cause Approach |
|-------|---------------------|
| Borrow checker | Map ownership flow; restructure if needed |
| Type mismatch | Trace through generics/traits to find constraint |
| Dead code | Verify truly unused before removing |

## Completion Criteria

Done when:
- ✅ All validation commands pass (zero errors)
- ✅ Each fix has documented root cause
- ✅ No regressions (tests pass)
- ✅ No "quick fix" rationalization used

## See Also

- `rd2:sys-debugging` - Four-phase debugging framework for root cause analysis
- `rd2:tdd-workflow` - Test-driven development workflow
- `/rd2:tasks-plan --verify <cmd>` - Auto-run validation after implementation
