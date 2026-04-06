---
name: fix orchestrator acpx fallback and unify LLM query handling
description: Consolidate LLM CLI handling and clean up LLM_CLI_COMMAND references across the codebase
status: Done
profile: standard
created_at: 2026-04-06T01:00:00.000Z
updated_at: 2026-04-06T02:15:00.000Z
folder: docs/tasks2
type: task
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0334. fix orchestrator acpx fallback and unify LLM query handling

### Background

**Problem**: When running `/rd3-dev-run 0332`, the orchestrator failed because `LLM_CLI_COMMAND` env var wasn't set. This caused acpx to fail silently, and the entire workflow stopped.

### Solution Overview

| Part | Approach | Status |
|------|----------|--------|
| **Part 1** | Quick Fix: Auto-detect `pi` path for `LLM_CLI_COMMAND` | ✅ Done |
| **Part 2** | Long Term: Unify LLM query handling + cleanup | ✅ Done |

---

## Part 1: Quick Fix (Completed ✅)

**Implementation**: Added auto-detection in `config/config.ts`:
- If `LLM_CLI_COMMAND` is not set, detect `pi`'s full path via `which pi`
- Set `process.env.LLM_CLI_COMMAND` automatically
- Respects user-set values (only auto-sets if not already set)

**Files Modified**:
- `plugins/rd3/skills/orchestration-v2/scripts/config/config.ts`

---

## Part 2: Long-Term Solution (Planning)

### Current State Analysis

| Module | File | LLM Logic | Issue |
|--------|------|-----------|-------|
| `orchestration-v1` | `scripts/executors.ts` | Uses `acpx-query.ts` | Works ✅ |
| `orchestration-v2` | `scripts/executors/acp.ts` | **Own implementation** | Duplicated |
| `verification-chain` | `scripts/methods/llm.ts` | **Own implementation + LLM_CLI_COMMAND** | Duplicated |
| `anti-hallucination` | `scripts/run_*.ts` | Own implementation | Duplicated |

### Root Cause

Multiple implementations of LLM query handling exist across modules:
1. **No shared abstraction** - each module invents its own approach
2. **Inconsistent initialization** - each handles `LLM_CLI_COMMAND` differently
3. **Hard to maintain** - changes must be replicated in multiple places

### Solution Strategy: Option B

**Enhance `acpx-query.ts` to be the unified LLM query library**, then:
1. `acp.ts` imports from enhanced `acpx-query.ts`
2. `verification-chain/llm.ts` imports from enhanced `acpx-query.ts`
3. All share same initialization logic

**Why Option B over Option A?**
| Aspect | Option A (adapts acp.ts) | Option B (enhances acpx-query.ts) ✅ |
|--------|--------------------------|--------------------------------------|
| Fit acp.ts needs | ❌ May not fit | ✅ Better fit |
| Complexity | acp.ts must change more | `acpx-query.ts` gains capabilities |
| Future maintenance | Two implementations | One unified implementation |

### Implementation Plan

#### Phase 1: Enhance `acpx-query.ts`

**Target file**: `plugins/rd3/scripts/libs/acpx-query.ts`

**Current capabilities**:
- Basic acpx command execution
- Prompt/file input
- Basic result parsing

**Missing capabilities** (from `acp.ts`):
- Structured output parsing (JSON extraction)
- Resource metrics extraction
- NDJSON event handling
- Timeout handling
- Error categorization

**Required changes**:
```typescript
// Add to acpx-query.ts:
export interface AcpxQueryOptions {
    agent?: string;
    acpxBin?: string;
    format?: 'text' | 'json' | 'quiet';
    timeout?: number;
    // New:
    parseStructuredOutput?: boolean;
    extractMetrics?: boolean;
}
```

#### Phase 2: Refactor `acp.ts`

**Target file**: `plugins/rd3/skills/orchestration-v2/scripts/executors/acp.ts`

**Changes**:
- Import core LLM execution from `acpx-query.ts`
- Keep acp-specific logic (skill execution, structured prompts)
- Remove duplicated LLM CLI spawning

#### Phase 3: Refactor `verification-chain/llm.ts`

**Target file**: `plugins/rd3/skills/verification-chain/scripts/methods/llm.ts`

**Changes**:
- Import from `acpx-query.ts`
- Remove raw `spawn` + `LLM_CLI_COMMAND` logic
- Remove temp file creation (acpx handles this)

#### Phase 4: Clean Up `LLM_CLI_COMMAND` References

**Scope of cleanup**:

| Category | Files | Action |
|----------|-------|--------|
| **Orchestration Config** | `config/config.ts` | Keep (quick fix), document |
| **Verification Chain** | `scripts/methods/llm.ts` | Remove (uses shared lib) |
| **Agent Skills** | Any SKILL.md referencing LLM_CLI_COMMAND | Update documentation |
| **Tests** | `verification-llm.test.ts` | Update to use shared lib |

**Cleanup checklist**:
- [x] Remove `LLM_CLI_COMMAND` check from `verification-chain/llm.ts` — replaced with `execLlmCli` from shared lib
- [x] Update any agent skill documentation mentioning `LLM_CLI_COMMAND` — docs already reflect auto-detection
- [x] Add documentation: `LLM_CLI_COMMAND` auto-set by orchestrator — documented in SKILL.md and config.ts
- [x] Update tests to use shared initialization — `acpx-query.test.ts` (747 lines) covers all new functions

### Files to Modify

| File | Change | Priority |
|------|---------|----------|
| `plugins/rd3/scripts/libs/acpx-query.ts` | Enhance with acp.ts capabilities | P0 |
| `plugins/rd3/skills/orchestration-v2/scripts/executors/acp.ts` | Use enhanced acpx-query | P1 |
| `plugins/rd3/skills/verification-chain/scripts/methods/llm.ts` | Use enhanced acpx-query | P1 |
| `plugins/rd3/skills/verification-chain/tests/verification-llm.test.ts` | Update tests | P2 |
| `plugins/rd3/skills/*/SKILL.md` | Update LLM_CLI_COMMAND docs | P3 |

### Design

**Architecture**: Single shared library (`acpx-query.ts`) providing all LLM query primitives across the codebase.

```
┌─────────────────────────────────────────────────────┐
│                  acpx-query.ts                       │
│              (Unified LLM Query Library)              │
├─────────────────────────────────────────────────────┤
│  execLlmCli()        - Legacy LLM CLI via stdin      │
│  execAcpxSync()      - Synchronous acpx execution     │
│  queryLlm()          - High-level prompt query        │
│  queryLlmFromFile()  - High-level file-based query   │
│  parseOutput()       - NDJSON + markdown JSON parse   │
│  getLegacyLlmCommand() - Auto-detect pi binary      │
│  initializeLlmEnv()  - Auto-set LLM_CLI_COMMAND      │
│  checkAcpxHealth()   - Health check                  │
├─────────────────────────────────────────────────────┤
│  Orchestrator Config    → uses getLegacyLlmCommand()  │
│  acp.ts Executor       → uses execAcpxSync + parse   │
│  verification-chain     → uses execLlmCli + getLlmCmd │
└─────────────────────────────────────────────────────┘
```

**Key design decisions**:
- `execLlmCli()` for legacy scripts that need `LLM_CLI_COMMAND` — pipes prompt via stdin to avoid shell expansion issues
- `execAcpxSync()` for acpx-based queries — synchronous via `spawnSync`, supports timeout
- `parseOutput()` handles both NDJSON events (`{type:"usage"}`, `{type:"structured"}`) and markdown ` ```json ` code blocks
- `getLegacyLlmCommand()` auto-detects `pi` binary via `which pi` as fallback
- `initializeLlmEnv()` sets `process.env.LLM_CLI_COMMAND` once per process

**Verification-chain/llm.ts refactor**: Replaced raw `spawn` + temp file creation with dependency-injected `execLlmCli()`. Removed explicit `LLM_CLI_COMMAND` check — `execLlmCli()` auto-detects via `getLegacyLlmCommand()`.

**Quick Fix (config.ts)**: Added `detectPiPath()` + `ensureLlmCliInitialized()` at top of `resolveConfig()`. Respects user-set `LLM_CLI_COMMAND` — only auto-sets if unset.

### Solution

**Part 1 — Quick Fix (config.ts)**:
- Added `detectPiPath()`: runs `which pi` via `spawnSync`, validates path exists
- Added `ensureLlmCliInitialized()`: called at start of `resolveConfig()`, sets `process.env.LLM_CLI_COMMAND` to detected `pi` path if not already set
- Flag `_llmCliInitialized` ensures initialization runs only once per process

**Part 2 — Unified acpx-query.ts**:
- Added `execLlmCli(command[], promptFile, timeoutMs)`: pipes prompt file to stdin via `spawnSync`, handles `.sh` scripts through `/bin/sh`
- Added `getLegacyLlmCommand()`: returns `LLM_CLI_COMMAND` env var, falls back to `which pi` detection
- Added `initializeLlmEnv()`: sets `LLM_CLI_COMMAND` if unset
- Added `parseOutput(output, extractStructured, extractMetrics)`: parses NDJSON events and markdown JSON blocks for structured data and resource metrics
- Added `ResourceMetrics` interface: captures model_id, tokens, wall_clock_ms, cache metrics, first_token_ms
- Added `extractFromJsonBlock(output)`: extracts balanced JSON from ` ```json ` fence blocks
- Added `extractFirstBalancedJsonObject(s)`: extracts first balanced `{}` or `[]` from raw string
- Added `checkAcpxHealth(acpxBin?)`: health check returning version or error
- Exported `resolveOptions()` and `buildAcpxArgs()` for testing
- `queryLlm()` and `queryLlmFromFile()` use built args + exec + parse pipeline

**Part 3 — Refactored acp.ts**:
- Removed local `execAcpxSync()`, `parseOutput()`, `ALLOWED_TOOLS` — now imports from `acpx-query.ts`
- Kept `AcpExecutor` class with its `buildArgs()` and `buildPrompt()` logic
- `execFn` injectable for test mocking

**Part 4 — Refactored verification-chain/llm.ts**:
- Removed raw `spawn` import and `LLM_CLI_COMMAND` check
- Imports `execLlmCli` and `getLegacyLlmCommand` from `acpx-query.ts`
- Dependency injection pattern preserved (`execLlmCliFn`, `getLlmCliCommand`) for testability
- Temp file creation retained (for the prompt file passed to `execLlmCli`)

**SKILL.md docs** (verification-chain): Already documented "Reads `LLM_CLI_COMMAND` env var — auto-detects `pi` binary path if not set." — no change needed.

### Plan

| Phase | Task | Status |
|-------|------|--------|
| 1 | Enhance `acpx-query.ts` | ✅ Done |
| 2 | Refactor `acp.ts` | ✅ Done |
| 3 | Refactor `verification-chain/llm.ts` | ✅ Done |
| 4 | Clean up `LLM_CLI_COMMAND` refs | ✅ Done |

### Review

**Code Review (Phase 7)**: ✅ PASSED
- `bun run check` → 3581 tests pass, 0 fail
- All lint, typecheck, and test gates green
- No blocking issues found

**Key quality indicators**:
- `acpx-query.ts`: +70 lines, clean separation of concerns, comprehensive types
- `acp.ts`: Reduced to ~100 lines, all LLM logic delegated to shared lib
- `verification-chain/llm.ts`: Removed raw `spawn`, uses injectable deps
- Test coverage: `acpx-query.test.ts` has 747 lines, 35+ test cases

**Architecture check**:
- ✅ Single source of truth for LLM CLI initialization
- ✅ No duplicate `spawn`/`LLM_CLI_COMMAND` handling
- ✅ Dependency injection preserved for testability
- ✅ SKILL.md docs already reflect auto-detection behavior

### Testing

**Test suite**: `bun test` → 3581 pass, 0 fail

**New tests added**:
- `plugins/rd3/scripts/libs/acpx-query.test.ts` (747 lines):
  - `getEnv` — env var retrieval
  - `getLegacyLlmCommand` — explicit var + auto-detection fallback
  - `initializeLlmEnv` — no-op when already set
  - `buildAcpxCommand` / `buildAcpxFileCommand` — command array construction
  - `parseOutput` — NDJSON metrics, NDJSON structured, markdown JSON, combined, empty, invalid JSON, precedence
  - `extractFromJsonBlock` — fence blocks, nested objects, arrays skipped, multiple blocks, incomplete fences
  - `extractFirstBalancedJsonObject` — basic, nested, strings-with-braces, escaped quotes, arrays, deep nesting
  - `ALLOWED_TOOLS` — constant validation
  - `resolveOptions` — defaults, env var fallback, overrides
  - `buildAcpxArgs` — timeout rounding, allowed-tools, format, custom agent
  - `execAcpxSync` / `execLlmCli` — integration with real binaries
  - `checkAcpxHealth` — healthy/unhealthy paths
  - `queryLlm` / `queryLlmFromFile` — end-to-end with mock acpx
  - Interface type checks for `AcpxQueryOptions`, `AcpxQueryResult`, `ResourceMetrics`, `AcpxHealth`

**Existing tests updated**:
- `orchestration-v1/tests/executors.test.ts` — +113 lines, adjusted for shared lib
- `orchestration-v2/scripts/executors/acp.test.ts` — refactored from 759 lines, uses injectable `execFn`
- `verification-chain/tests/methods.test.ts` — +77 lines for llm checker tests
- `verification-chain/tests/verification-llm.test.ts` — +13 lines
- Multiple other test files updated for compatibility

### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |
| Quick Fix | `plugins/rd3/skills/orchestration-v2/scripts/config/config.ts` | Lord Robb | 2026-04-06 |
| Shared Lib (enhanced) | `plugins/rd3/scripts/libs/acpx-query.ts` | Lord Robb | 2026-04-06 |
| acp.ts (refactored) | `plugins/rd3/skills/orchestration-v2/scripts/executors/acp.ts` | Lord Robb | 2026-04-06 |
| llm.ts (refactored) | `plugins/rd3/skills/verification-chain/scripts/methods/llm.ts` | Lord Robb | 2026-04-06 |
| New Tests | `plugins/rd3/scripts/libs/acpx-query.test.ts` | Lord Robb | 2026-04-06 |

### References

- `plugins/rd3/scripts/libs/acpx-query.ts` - Target shared library
- `plugins/rd3/skills/orchestration-v2/scripts/executors/acp.ts` - Source of capabilities to extract
- `plugins/rd3/skills/verification-chain/scripts/methods/llm.ts` - Another consumer to refactor
