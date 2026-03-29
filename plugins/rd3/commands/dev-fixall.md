---
allowed-tools: ["Bash", "Read", "Grep", "Glob", "Edit"]
description: Fix all lint, type, and test errors systematically
argument-hint: "[<validation-command>] [--max-retry=5]"
model: inherit
---

# Dev Fixall

Systematically resolve all validation errors (lint, typecheck, tests) using a deterministic workflow with root cause analysis.

**Core Principle:** NO FIXES WITHOUT ROOT CAUSE FIRST.

**Pipeline Integration:** This is a **standalone utility**, not a pipeline phase shortcut. It does not delegate to `rd3:orchestration-dev`. Use it independently to fix validation errors, or after any pipeline phase that fails checks.

## Quick Start

```bash
# Auto-detect validation command from project config
/rd3:dev-fixall

# Explicit validation command
/rd3:dev-fixall "bun run check"

# Custom retry limit
/rd3:dev-fixall "bun run check" --max-retry=10
```

## Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `validation-command` | No | auto | Command to validate (e.g., `bun run check`) |
| `--max-retry` | No | 5 | Maximum fix iterations |

## MANDATORY Exit Condition

**The ONLY way to complete successfully:**

1. Run validation command: `eval "$VALIDATION_CMD"`
2. Capture exit code: `EXIT_CODE=$?`
3. Output: `echo "EXIT_CODE=$EXIT_CODE"`
4. **EXIT_CODE must equal 0**

If EXIT_CODE != 0: NOT completed. MUST continue fixing.

**Hallucination Red Flags — STOP if you think:**

- "The errors look fixed" — check exit code, not appearance
- "Most tests pass" — partial success = FAILURE
- "Good enough for now" — 0 is the ONLY acceptable exit code

## Auto-Detection

| Config File | Detection | Validation Command |
|-------------|-----------|-------------------|
| `biome.json` | `"biome"` in filename | `bun run check` |
| `tsconfig.json` | `"tsconfig"` in filename | `bun run typecheck` |
| `package.json` + `bun.lockb` | Bun project | `bun run check` |

For this project, default is `bun run check` (runs lint + typecheck + test).

## 7-Phase Workflow

```
┌─────────────────────────────────────────────────┐
│ RETRY LOOP (max --max-retry iterations)         │
│                                                 │
│  → Phase 1: Detect validation command           │
│  → Phase 2: Capture validation output           │
│  → Phase 3: Auto-fix (biome check --write)      │
│  → Phase 4: Parse and categorize errors         │
│  → Phase 5: Root cause diagnosis                │
│  → Phase 6: Fix by error type group             │
│  → Phase 7: Validate (check EXIT_CODE)          │
│                                                 │
│  If EXIT_CODE = 0: SUCCESS, exit loop           │
│  If EXIT_CODE != 0: continue                    │
│                                                 │
│  If counter >= MAX_RETRY:                       │
│    Ask user: [Continue / Stop]                  │
└─────────────────────────────────────────────────┘
```

### Fix Priority

| Priority | Type | Rationale |
|----------|------|-----------|
| 1 | Build/compile | Blocks everything downstream |
| 2 | Import/module | May cause cascading type failures |
| 3 | Type errors | Often reveals logic bugs |
| 4 | Test failures | Confirms behavior correctness |
| 5 | Lint warnings | Code quality (lowest priority) |

**Critical Rule**: If THREE fixes fail consecutively, STOP. This signals architectural problems.

## Error Patterns

### TypeScript

| Issue | Root Cause Approach |
|-------|---------------------|
| `any` type | Trace where untyped data enters; add types at source |
| Unused variable | Check if removal breaks anything |
| Missing return type | Read function to understand actual return |
| Type mismatch | Compare expected vs. actual; find divergence |

### Bun/V8 Quirk

Bun uses V8's function coverage which does NOT count implicit class constructors. Fix:

```typescript
// biome-ignore lint/complexity/noUselessConstructor: V8 function coverage requires explicit constructor
constructor() {}
```

## Examples

```bash
# Auto-detect and fix
/rd3:dev-fixall

# Explicit command
/rd3:dev-fixall "bun run check"

# TypeScript project
/rd3:dev-fixall "biome check --write . && tsc --noEmit && bun run test"
```

## See Also

- **rd3:sys-debugging**: Four-phase debugging framework
- **rd3:orchestration-dev**: Full 9-phase pipeline orchestrator
- **/rd3:dev-run**: End-to-end execution (phases 1-9)
