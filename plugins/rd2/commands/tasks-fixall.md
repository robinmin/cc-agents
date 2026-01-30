---
description: Fix all lint, type, and test errors using deterministic single-pass workflow with sys-debugging methodology
skills:
  - rd2:sys-debugging
  - rd2:anti-hallucination
argument-hint: "[<validation-command>] [--max-retry=5]"
---

# Tasks Fixall

Systematically resolve all validation errors (lint, typecheck, tests) using a deterministic workflow that maximizes auto-fix and applies sys-debugging methodology for root cause analysis.

**Core Principle:** Apply `sys-debugging` methodology — NO FIXES WITHOUT ROOT CAUSE FIRST.

## Quick Start

```bash
# With explicit validation command
/rd2:tasks-fixall "biome check --write . && tsc --noEmit && vitest run"

# Auto-detect from config files
/rd2:tasks-fixall

# With custom retry limit
/rd2:tasks-fixall "pytest" --max-retry=10
```

## MANDATORY EXIT CONDITION (Non-Negotiable)

**The ONLY way to complete this command successfully is:**

1. Run the validation command: `eval "$VALIDATION_CMD"`
2. Capture the exit code: `EXIT_CODE=$?`
3. Output the exit code: `echo "EXIT_CODE=$EXIT_CODE"`
4. **EXIT_CODE must equal 0**

**If EXIT_CODE ≠ 0:**

- You have NOT completed the task
- You MUST continue fixing
- Do NOT write a summary report
- Do NOT claim success
- Do NOT say "most tests pass" or "looks good"

**Proof of Completion Required:**

Before claiming success, you MUST show terminal output containing the literal text:
```
EXIT_CODE=0
```

If you cannot show this exact output from the validation command, you have NOT succeeded. This is non-negotiable.

**Hallucination Red Flags — STOP if you think:**

- ❌ "The errors look fixed" → Check exit code, not appearance
- ❌ "Most tests pass" → Partial success = FAILURE
- ❌ "Good enough for now" → 0 is the ONLY acceptable exit code
- ❌ "I've done several iterations" → Iteration count is irrelevant; only EXIT_CODE=0 matters
- ❌ "The output looks cleaner" → Cleaner ≠ passing; check EXIT_CODE
- ❌ "Let me summarize what was fixed" → NO summaries until EXIT_CODE=0

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

| Argument              | Required | Default | Description                                                    |
| --------------------- | -------- | ------- | -------------------------------------------------------------- |
| `validation-command`  | No       | auto    | Command to validate (e.g., `npm test`, `cargo test`, `make check`) |
| `--max-retry`         | No       | 5       | Maximum fix iterations before asking user to continue/escalate/stop |

**Validation Behavior:**
- If command provided but fails to run → Error with command output
- If auto-detect finds nothing → Ask user for validation command
- If no config files detected → Suggest common patterns (npm test, cargo test, pytest)

If no command provided, auto-detect from project config files.

## Workflow

This command implements a self-contained 7-phase workflow with mandatory retry loop:

1. **Detect** validation command (from args or auto-detect from config files)
2. **Capture** initial output to temp file using `tee`
3. **Auto-fix** using language-specific tools (biome/eslint/ruff/cargo)
4. **Parse** errors using grep/awk for categorization
5. **Diagnose** root causes using `rd2:sys-debugging` skill
6. **Fix** systematically by error type group
7. **Validate & Loop** until EXIT_CODE=0 or max retries reached

```
┌─────────────────────────────────────────────────┐
│ RETRY LOOP (max --max-retry iterations)         │
│                                                 │
│  → Phase 5: Diagnose root cause                 │
│  → Phase 6: Fix by error type group             │
│  → Phase 7: Validate (check EXIT_CODE)          │
│                                                 │
│  If EXIT_CODE = 0: SUCCESS, exit loop           │
│  If EXIT_CODE ≠ 0: INCREMENT counter, continue  │
│                                                 │
│  If counter >= MAX_RETRY:                       │
│    Ask user: [Continue / Escalate / Stop]       │
│    - Continue: RESET counter, resume loop       │
│    - Escalate: Delegate to super-planner        │
│    - Stop: Show errors, exit                    │
└─────────────────────────────────────────────────┘
```

**No agent delegation** — All logic implemented directly in this command following rd2 "self-contained" pattern. Escalation to super-planner is optional user choice at retry limit.

## Auto-Detection

| Config File       | Detection Pattern           | Auto-Fix Command                            |
| ----------------- | --------------------------- | ------------------------------------------- |
| `biome.json`      | `"biome"` in filename       | `biome check --write .`                     |
| `.eslintrc.*`     | `"eslint"` in filename      | `eslint . --fix`                            |
| `tsconfig.json`   | `"tsconfig"` in filename    | `tsc --noEmit`                               |
| `pyproject.toml`  | `"pyproject"` in filename   | `ruff check --fix . && mypy .`              |
| `Cargo.toml`      | `"Cargo.toml"` in filename  | `cargo fmt && cargo clippy && cargo test`    |
| `go.mod`          | `"go.mod"` in filename      | `gofmt -w . && go vet ./... && go test ./...` |

## 7-Phase Workflow

### Phase 1: Detect Validation Command

Detect from arguments or auto-detect from config files (see Auto-Detection table above).

### Phase 2: Capture Validation Output

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

### Phase 4: Parse and Categorize Errors

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

### Phase 5: Root Cause Diagnosis (sys-debugging)

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

### Phase 6: Systematic Fix Implementation

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

### Phase 7: Validate & Loop Control

**CRITICAL: This phase determines task completion. Follow exactly.**

```bash
# Run validation and capture EXIT CODE (not grep!)
eval "$VALIDATION_CMD" 2>&1 | tee "$FIXALL_LOG"
EXIT_CODE=$?

# OUTPUT THE EXIT CODE - This is your proof of completion
echo "EXIT_CODE=$EXIT_CODE"

if [ "$EXIT_CODE" -eq 0 ]; then
  echo "✅ VALIDATION PASSED - EXIT_CODE=0"
  echo "Task completed successfully."
else
  echo "❌ VALIDATION FAILED - EXIT_CODE=$EXIT_CODE"
  echo "You MUST continue fixing. Do NOT claim success."

  # Show error summary for next iteration
  echo "--- Error Summary ---"
  grep -E "error|FAIL|Error" "$FIXALL_LOG" | head -10
fi
```

**Retry Loop Logic:**

```
RETRY_COUNT=0
MAX_RETRY=${max_retry:-5}

LOOP_START:
  if EXIT_CODE = 0:
    → SUCCESS - Task complete
    → You may now write summary
    → Exit

  RETRY_COUNT = RETRY_COUNT + 1

  if RETRY_COUNT > MAX_RETRY:
    → Ask user via AskUserQuestion:
      Option A: "Continue fixing"
        → Reset RETRY_COUNT to 0
        → Jump to Phase 5 (Diagnose)
      Option B: "Escalate to super-planner"
        → Report: "Escalation requested. Future enhancement."
        → Show remaining errors
        → Exit
      Option C: "Stop and show errors"
        → Show remaining errors from $FIXALL_LOG
        → Exit with failure status

  → Jump to Phase 5 (Diagnose)
```

### Exit Criteria Checklist

Before claiming completion, verify ALL of these:

- [ ] Ran `eval "$VALIDATION_CMD"`
- [ ] Captured exit code with `EXIT_CODE=$?`
- [ ] Printed `echo "EXIT_CODE=$EXIT_CODE"`
- [ ] Confirmed EXIT_CODE equals exactly 0
- [ ] Showed the literal output `EXIT_CODE=0` in terminal

**If ANY checkbox is unchecked, you have NOT completed the task.**

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
/rd2:tasks-fixall "biome check --write . && tsc --noEmit && vitest run"

# Output:
# → Creating temp log: /tmp/fixall-abc123.log
# → Running validation...
# → EXIT_CODE=1 (FAILED)
# → Found 23 errors
# → Phase 4: Parse and categorize...
#   - Type errors: 15
#   - Test failures: 5
#   - Lint errors: 3
# → Phase 3: Auto-fix...
# → Running: biome check --write .
# → Re-validating...
# → EXIT_CODE=1 (FAILED - 15 errors remaining)
#
# --- Iteration 1 of 5 ---
# → Phase 5: Root cause analysis...
# → Analyzing error TS2345 (12 occurrences)
# → Root cause: API response type changed in v2.0
# → Phase 6: Fix by error type group...
# → Fixing TS2345: Updated types/api.d.ts
# → Phase 7: Validate...
# → EXIT_CODE=1 (FAILED - 3 errors remaining)
#
# --- Iteration 2 of 5 ---
# → Phase 5: Root cause analysis...
# → Analyzing remaining 3 type errors
# → Phase 6: Fixing...
# → Phase 7: Validate...
# → EXIT_CODE=0
# ✅ VALIDATION PASSED - EXIT_CODE=0
# Task completed successfully.
```

### Python Project

```bash
/rd2:tasks-fixall "ruff check . --fix && mypy . && pytest"
```

### Rust Project

```bash
/rd2:tasks-fixall "cargo fmt && cargo clippy && cargo test"
```

### Auto-Detect

```bash
/rd2:tasks-fixall

# Output:
# → Detecting project configuration...
# → Found: biome.json, tsconfig.json
# → Auto-detected command: biome check --write . && tsc --noEmit
# → Proceeding with workflow...
```

## Design Philosophy

**Self-Contained Workflow** — This command implements the complete 7-phase fixing workflow directly:
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

**MANDATORY — All must be true:**

- ✅ Validation command exited with `EXIT_CODE=0` (not just "looks clean")
- ✅ You showed the literal terminal output `EXIT_CODE=0`
- ✅ Each fix has documented root cause
- ✅ No regressions introduced

**NOT acceptable as completion:**

- ❌ "Errors appear fixed" without EXIT_CODE=0
- ❌ "Most tests pass" (partial = failure)
- ❌ "Output looks cleaner" (cleaner ≠ passing)
- ❌ Any summary before EXIT_CODE=0 is confirmed

## See Also

- `rd2:sys-debugging` - Four-phase debugging framework for root cause analysis
- `rd2:tdd-workflow` - Test-driven development workflow
- `/rd2:tasks-plan --verify <cmd>` - Auto-run validation after implementation
