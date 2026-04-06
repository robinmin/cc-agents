---
name: fix orchestrator acpx fallback and unify LLM query handling
description: Consolidate LLM CLI handling and clean up LLM_CLI_COMMAND references across the codebase
status: In Progress
profile: standard
created_at: 2026-04-06T01:00:00.000Z
folder: docs/tasks2
type: task
impl_progress:
  planning: completed
  design: completed
  implementation: in_progress
  review: pending
  testing: pending
---

## 0334. fix orchestrator acpx fallback and unify LLM query handling

### Background

**Problem**: When running `/rd3-dev-run 0332`, the orchestrator failed because `LLM_CLI_COMMAND` env var wasn't set. This caused acpx to fail silently, and the entire workflow stopped.

### Solution Overview

| Part | Approach | Status |
|------|----------|--------|
| **Part 1** | Quick Fix: Auto-detect `pi` path for `LLM_CLI_COMMAND` | ✅ Done |
| **Part 2** | Long Term: Unify LLM query handling + cleanup | 📋 Planning |

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
- [ ] Remove `LLM_CLI_COMMAND` check from `verification-chain/llm.ts`
- [ ] Update any agent skill documentation mentioning `LLM_CLI_COMMAND`
- [ ] Add documentation: `LLM_CLI_COMMAND` auto-set by orchestrator
- [ ] Update tests to use shared initialization

### Files to Modify

| File | Change | Priority |
|------|---------|----------|
| `plugins/rd3/scripts/libs/acpx-query.ts` | Enhance with acp.ts capabilities | P0 |
| `plugins/rd3/skills/orchestration-v2/scripts/executors/acp.ts` | Use enhanced acpx-query | P1 |
| `plugins/rd3/skills/verification-chain/scripts/methods/llm.ts` | Use enhanced acpx-query | P1 |
| `plugins/rd3/skills/verification-chain/tests/verification-llm.test.ts` | Update tests | P2 |
| `plugins/rd3/skills/*/SKILL.md` | Update LLM_CLI_COMMAND docs | P3 |

### Design

TBD (to be completed during implementation)

### Solution

TBD

### Plan

| Phase | Task | Status |
|-------|------|--------|
| 1 | Enhance `acpx-query.ts` | Pending |
| 2 | Refactor `acp.ts` | Pending |
| 3 | Refactor `verification-chain/llm.ts` | Pending |
| 4 | Clean up `LLM_CLI_COMMAND` refs | Pending |

### Review

TBD

### Testing

TBD

### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |
| Quick Fix | `plugins/rd3/skills/orchestration-v2/scripts/config/config.ts` | Lord Robb | 2026-04-06 |
| Shared Lib (existing) | `plugins/rd3/scripts/libs/acpx-query.ts` | - | - |
| acp.ts (to refactor) | `plugins/rd3/skills/orchestration-v2/scripts/executors/acp.ts` | - | - |
| llm.ts (to refactor) | `plugins/rd3/skills/verification-chain/scripts/methods/llm.ts` | - | - |

### References

- `plugins/rd3/scripts/libs/acpx-query.ts` - Target shared library
- `plugins/rd3/skills/orchestration-v2/scripts/executors/acp.ts` - Source of capabilities to extract
- `plugins/rd3/skills/verification-chain/scripts/methods/llm.ts` - Another consumer to refactor
