---
name: Orchestrator Executor Fallback Fix
description: Fix orchestrator executor fallback mechanism to gracefully handle skills without local/subprocess entry points by falling back to SKILL.md via ACP
status: Canceled
created_at: 2026-04-15T01:30:00.000Z
updated_at: 2026-04-26T04:23:44.602Z
folder: docs/tasks
type: task
preset: "standard"
profile: "backend-architect"
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0382. Orchestrator Executor Fallback Fix

### Background

#### Problem Statement

When running `orchestrator run <task>` without explicit `--channel` flag, the orchestrator uses the **Inline Executor** by default. The Inline Executor requires skills to have a `scripts/local.ts` entry point file. If no such file exists, the executor fails immediately with an opaque error:

```
Skill rd3:request-intake does not expose a local in-process entrypoint.
Use executor.mode: subprocess or an explicit external channel/adapter for this phase.
```

This creates two problems:

1. **User Experience**: Users must explicitly specify `--channel pi` every time, even though `DEFAULT_CHANNEL` is already set to `'pi'`
2. **Skill Portability**: All rd3 skills (e.g., `rd3:request-intake`, `rd3:code-implement-common`) only have `SKILL.md` files — no TypeScript entry points — making them incompatible with inline/subprocess execution

#### Historical Context

The orchestrator was designed with multiple executor types:

| Executor | Mechanism | Entry Point | Designed For |
|----------|-----------|-------------|--------------|
| **Inline** | Dynamic import `local.ts` | `scripts/local.ts` | Skills with direct TypeScript handlers |
| **Subprocess** | `bun run scripts/run.ts` | `scripts/run.ts` | Skills with CLI interfaces |
| **ACP (pi)** | Slash commands via `acpx` | `SKILL.md` | Prompt-based skills |

The design intent was for skills to optionally expose executor-specific entry points. However:

- Most rd3 skills only have `SKILL.md` (ACP-based)
- No rd3 skill has `scripts/local.ts` or `scripts/run.ts`
- The Inline Executor fails instead of falling back to ACP

#### Evidence from Production

During Task 0004 execution:

```bash
$ orchestrator run 0004 --auto
[inline] Skill rd3:request-intake does not expose a local in-process entrypoint.
```

The first attempt failed. Subsequent runs with `--channel pi` succeeded because ACP executor works with any skill that has `SKILL.md`.

---

### Current Situation

#### Code Flow Analysis

```
orchestrator run <task> --auto
        ↓
PipelineRunner.run() [runner.ts]
        ↓
resolveExecutionTarget() [line 834]
        ↓
pool.execute(req, executorId) [line 864]
        ↓
executeWithPolicy() [pool.ts]
        ↓
routePhase(policy, req.phase, req.channel) [adapter.ts]
        ↓
Returns: { adapterId: 'local' }  ← BUILT_IN_POLICIES.safe.defaultAdapterId
        ↓
InlineExecutor.execute()
        ↓
resolveLocalEntrypoint() → looks for scripts/local.ts
        ↓
❌ FAIL: "does not expose a local in-process entrypoint"
```

#### Key Files Involved

| File | Role |
|------|------|
| `scripts/executors/inline.ts` | Inline executor — requires `local.ts` |
| `scripts/executors/subprocess.ts` | Subprocess executor — requires `run.ts` |
| `scripts/executors/acp-oneshot.ts` | ACP executor — uses SKILL.md |
| `scripts/executors/pool.ts` | Executor registry and routing |
| `scripts/executors/adapter.ts` | `routePhase()` function |
| `scripts/routing/policy.ts` | `BUILT_IN_POLICIES` definition |
| `scripts/config/consts.ts` | `DEFAULT_CHANNEL = 'pi'` |

#### Design Inconsistency

```typescript
// consts.ts
export const DEFAULT_CHANNEL = 'pi';  // ← ACP is the default!

// policy.ts
export const BUILT_IN_POLICIES = {
  safe: {
    defaultAdapterId: 'local',  // ← But inline is the default executor!
    ...
  }
};
```

#### Current Entry Point Resolution (After Fix)

**InlineExecutor** (`inline.ts`):
```typescript
readonly resolveLocalEntrypoint = (skillRef: string): string | null => {
  const candidates = [
    resolve(this.skillBaseDir, skillName, 'scripts', 'run.ts'),    // Universal entry point
  ];
  // Falls back to SKILL.md via executeViaACP() if no script found
};
```

**SubprocessExecutor** (`subprocess.ts`):
```typescript
resolveSkillScript(skillRef: string): { type: 'script'; path: string } | { type: 'skill-only' } | null {
  // Check scripts/run.ts → { type: 'script', path }
  // Check SKILL.md → { type: 'skill-only' } (ACP fallback)
  // Nothing → null
}
```

**ACP Oneshot/Session** (`acp-*.ts`):
```typescript
// Check scripts/run.ts → spawn via bun
// Otherwise → ACP transport (SKILL.md is prompt content)
```

---

### Proposed Solution

#### Design Decision: Solution 2 (Single Entry Point)

| Executor | Entry Point | Fallback |
|----------|-------------|----------|
| Inline | `scripts/run.ts` → in-process import | → SKILL.md via `executeStateless()` |
| Subprocess | `scripts/run.ts` → bun spawn | → SKILL.md via `executeAcpTransport()` |
| ACP Oneshot | `scripts/run.ts` → bun spawn | → SKILL.md via stateless ACP |
| ACP Session | `scripts/run.ts` → bun spawn | → SKILL.md via sessioned ACP (or stateless if no session) |

**Execution Resolution Order:**

- **Inline**: `scripts/run.ts` (import+call) → SKILL.md (`executeStateless`)
- **Subprocess**: `scripts/run.ts` (spawn) → SKILL.md (`executeAcpTransport`)
- **ACP Oneshot**: `scripts/run.ts` (spawn) → SKILL.md (ACP transport, always stateless)
- **ACP Session**: `scripts/run.ts` (spawn if exists) → SKILL.md (sessioned ACP if session provided, else stateless)

**Rationale:**
1. **Separation of concerns**: Orchestrator decides "how", skill decides "what"
2. **Lower barrier to entry**: Skill developers just implement one function
3. **DRY principle**: Single entry point instead of executor-specific files
4. **Consistent behavior**: All executors fall back to SKILL.md uniformly

#### Interface for `scripts/run.ts`

```typescript
/**
 * Universal entry point for orchestrator skill execution.
 *
 * This file is optional. If it exists, it takes precedence.
 * If it doesn't exist, executors fall back to SKILL.md via ACP.
 */

export interface RunOptions {
  taskRef: string;
  phase: string;
  payload: Record<string, unknown>;
  feedback?: string;         // For rework iterations
  reworkIteration?: number;
  dryRun?: boolean;
  // ... other fields from ExecutionRequest
}

export interface ExecutionResult {
  success: boolean;
  exitCode: number;
  stdout?: string;
  stderr?: string;
  structured?: Record<string, unknown>;
  durationMs?: number;
  timedOut?: boolean;
}

/**
 * Execute the skill phase.
 *
 * @param options - Execution options from orchestrator
 * @returns Execution result
 */
export async function runLocal(options: RunOptions): Promise<ExecutionResult> {
  // Implementation specific to this skill
}

// OR use default export:
// export default async function(options: RunOptions): Promise<ExecutionResult> { ... }
```

#### Execution Flow (After Fix)

```
Inline Executor:
  1. Check scripts/run.ts → exists? Import and call runLocal()
  2. Check SKILL.md → exists? Fall back to ACP
  3. Neither → error

Subprocess Executor:
  1. Check scripts/run.ts → exists? Spawn `bun run scripts/run.ts`
  2. Check SKILL.md → exists? Fall back to ACP
  3. Neither → error

ACP Executor:
  1. Always uses SKILL.md
```

---

### Implementation Details

#### Step 1: Update InlineExecutor

**File:** `scripts/executors/inline.ts`

**Changes:**
1. Rename `resolveLocalEntrypoint()` candidates to include `scripts/run.ts`
2. Add fallback method to check for `SKILL.md`
3. If SKILL.md exists but no `scripts/run.ts`, return a special marker to trigger ACP fallback
4. Or: Implement fallback logic directly in `execute()`

```typescript
// New candidates order (after fix)
const candidates = [
  resolve(this.skillBaseDir, skillName, 'scripts', 'run.ts'),    // NEW: Universal entry
  resolve(this.skillBaseDir, skillName, 'scripts', 'local.ts'),   // Legacy support
  resolve(this.skillBaseDir, skillName, 'local.ts'),
  resolve(this.skillBaseDir, skillName, 'index.ts'),
];

// New: Check if skill has SKILL.md (for fallback)
const skillDir = resolve(this.skillBaseDir, skillName);
const hasSkillMd = existsSync(resolve(skillDir, 'SKILL.md'));

// If no run.ts/local.ts but has SKILL.md, return null to trigger fallback
// (InlineExecutor should delegate to ACP)
```

#### Step 2: Update SubprocessExecutor

**File:** `scripts/executors/subprocess.ts`

**Changes:**
1. Update `resolveSkillScript()` to check `scripts/run.ts`
2. Add fallback to SKILL.md
3. If SKILL.md exists but no script, spawn ACP execution instead

```typescript
// New logic (after fix)
private resolveSkillScript(skillRef: string): { path: string; type: 'script' | 'acp' } | null {
  const [plugin, skillName] = skillRef.split(':');
  const skillBaseDir = resolve(process.cwd(), 'plugins', plugin, 'skills');

  // Check for scripts/run.ts
  const runScriptPath = resolve(skillBaseDir, skillName, 'scripts', 'run.ts');
  if (existsSync(runScriptPath)) {
    return { path: runScriptPath, type: 'script' };
  }

  // Check for legacy scripts/run.ts (without scripts/ prefix)
  const legacyRunPath = resolve(skillBaseDir, skillName, 'run.ts');
  if (existsSync(legacyRunPath)) {
    return { path: legacyRunPath, type: 'script' };
  }

  // Fallback: Check for SKILL.md
  const skillMdPath = resolve(skillBaseDir, skillName, 'SKILL.md');
  if (existsSync(skillMdPath)) {
    return { path: skillMdPath, type: 'acp' };  // Signal fallback to ACP
  }

  return null;  // No entry point found
}
```

#### Step 3: Update ExecutorPool (Optional Enhancement)

**File:** `scripts/executors/pool.ts`

**Changes:**
Consider adding a helper method to execute via ACP as fallback:

```typescript
async executeViaACP(req: ExecutionRequest): Promise<ExecutionResult> {
  const acpExecutor = this.get('acp-oneshot:pi');
  if (acpExecutor) {
    return acpExecutor.execute(req);
  }
  throw new Error('ACP executor not available for fallback');
}
```

#### Step 4: Update SubprocessExecutor Fallback Logic

**File:** `scripts/executors/subprocess.ts`

**Changes:**
Handle `type: 'acp'` from `resolveSkillScript()`:

```typescript
async execute(req: ExecutionRequest): Promise<ExecutionResult> {
  const resolved = this.resolveSkillScript(req.skill);

  if (!resolved) {
    return {
      success: false,
      exitCode: 1,
      stderr: `Skill ${req.skill} has no entry point. No scripts/run.ts or SKILL.md found.`,
      ...
    };
  }

  if (resolved.type === 'acp') {
    // Fall back to ACP execution
    return this.executeViaACP(req);
  }

  // Execute script as before
  return this.spawnSkill(resolved.path, args, timeoutMs, req.phase);
}
```

#### Step 5: Update InlineExecutor Fallback Logic

**File:** `scripts/executors/inline.ts`

**Changes:**
If SKILL.md exists but no script entry point, delegate to ACP:

```typescript
async execute(req: ExecutionRequest): Promise<ExecutionResult> {
  const entryPath = this.resolveLocalEntrypoint(req.skill);
  const canFallbackToACP = this.canFallbackToACP(req.skill);

  if (!entryPath) {
    if (canFallbackToACP) {
      // Delegate to ACP executor
      return this.pool.executeViaACP(req);
    }
    return {
      success: false,
      exitCode: 1,
      stderr: `Skill ${req.skill} does not expose a local entrypoint and SKILL.md not found.`,
      ...
    };
  }

  // Execute inline as before
  ...
}
```

**Note:** InlineExecutor needs access to the ExecutorPool. Consider:
1. Passing pool reference to InlineExecutor constructor
2. Creating a shared ACP executor instance
3. Using a static/factory method for fallback

#### Step 6: Test the Fix

Create test cases in `scripts/executors/inline.test.ts` and `scripts/executors/subprocess.test.ts`:

```typescript
describe('Fallback to ACP', () => {
  it('should fallback to ACP when scripts/run.ts exists but no SKILL.md', async () => {
    // Skill has run.ts, should execute inline
  });

  it('should fallback to ACP when no scripts/run.ts but SKILL.md exists', async () => {
    // Skill has SKILL.md, should execute via ACP
  });

  it('should fail when neither scripts/run.ts nor SKILL.md exists', async () => {
    // Should return error result
  });
});
```

---

### Implementation Status

| Step | Description | Status | Notes |
|------|-------------|--------|-------|
| Step 1 | Update InlineExecutor: Add `scripts/run.ts` to candidates, add `hasSkillMd()`, implement ACP fallback | ✅ DONE | |
| Step 2 | Update SubprocessExecutor: Add `scripts/run.ts` support | ✅ ALREADY DONE | SubprocessExecutor already had this (line 193) |
| Step 3 | Update ExecutorPool: Add `executeViaACP()` helper | ⏭️ SKIPPED | Optional; InlineExecutor calls transport directly |
| Step 4 | Update SubprocessExecutor: Handle `type: 'acp'` fallback | ✅ ALREADY DONE | Uses `type: 'skill-only'` equivalent |
| Step 5 | Update InlineExecutor: Implement `executeViaACP()` fallback | ✅ DONE | Inlined in InlineExecutor, no pool dependency |
| Step 6 | Add tests | ✅ DONE | 5 new tests in inline.test.ts; subprocess tests already existed |

### Files Modified

| File | Change |
|------|--------|
| `scripts/executors/inline.ts` | Added `scripts/run.ts` to candidates, added `hasSkillMd()`, added `executeViaACP()`, modified `execute()` for fallback |
| `scripts/executors/inline.test.ts` | Added `createSkillMd()` helper, `hasSkillMd()` tests, `scripts/run.ts` priority test, ACP fallback test |

---

### Out of Scope

- Modifying SKILL.md format or structure
- Changing the ACP executor behavior
- Adding new executor types
- Modifying the routing policy (beyond documenting the fallback behavior)
- Changes to rd3 skills themselves (they don't need modification)

---

### Acceptance Criteria

| ID | Criterion | Status | Evidence |
|----|-----------|--------|----------|
| AC-1 | `orchestrator run <task>` (without `--channel`) MUST succeed if task's skill has `SKILL.md` | ✅ | InlineExecutor now falls back to ACP when SKILL.md exists but no script entry point |
| AC-2 | Skills with `scripts/run.ts` MUST still execute inline (no regression) | ✅ | Test: "prefers scripts/run.ts over scripts/local.ts" + fixture tests pass |
| AC-3 | Skills without `scripts/run.ts` but with `SKILL.md` MUST fall back to ACP | ✅ | Test: "falls back to ACP when no script but SKILL.md exists" |
| AC-4 | Skills without either file MUST fail with clear error message | ✅ | Existing test "returns failure when no local entrypoint exists" |
| AC-5 | All existing tests MUST pass | ✅ | 4574 tests pass |
| AC-6 | New fallback tests MUST be added and pass | ✅ | 5 new tests added, 33 total inline tests pass |

**Coverage:** `inline.ts` 100% line, 100% function coverage

---

### Q&A

**Q: Why not change the default from `local` to `pi`?**
A: That would be a separate change. The fallback mechanism is more important because:
1. It fixes the immediate problem for users who forget `--channel`
2. It's backward compatible (skills with `local.ts` still work inline)
3. It future-proofs the system for skills that may add `run.ts` later

**Q: What about skills that have `local.ts` but also want ACP fallback?**
A: This is an edge case. The design decision is: if a skill has any script entry point, use it. If not, fall back to ACP. Skills can always add `scripts/run.ts` to opt into inline execution.

**Q: Does this affect the `--channel` flag?**
A: No. Explicit `--channel` flags still take precedence. This change only affects the default behavior when no channel is specified.

**Q: How do we handle the InlineExecutor needing ACP fallback?**
A: Two options:
1. Inject the ExecutorPool into InlineExecutor (preferred for testability)
2. Create a standalone ACP fallback function that doesn't need the pool

---

### References

- [Orchestration-v2 SKILL.md](plugins/rd3/skills/orchestration-v2/SKILL.md)
- [Executor Adapter Interface](scripts/executors/adapter.ts)
- [Inline Executor](scripts/executors/inline.ts)
- [Subprocess Executor](scripts/executors/subprocess.ts)
- [Executor Pool](scripts/executors/pool.ts)
- [Routing Policy](scripts/routing/policy.ts)
- [ACP Transport](scripts/integrations/acp/transport.ts)

---

### Verification Results

#### Issue #1: VALID - InlineExecutor has no SKILL.md fallback
**File:** `plugins/rd3/skills/orchestration-v2/scripts/executors/inline.ts`
**Lines:** 111-134 (`resolveLocalEntrypoint`), 54-65 (`execute`)

```typescript
// inline.ts:111-134
readonly resolveLocalEntrypoint = (skillRef: string): string | null => {
    const candidates = [
        resolve(this.skillBaseDir, skillName, 'scripts', 'local.ts'),
        resolve(this.skillBaseDir, skillName, 'local.ts'),
        resolve(this.skillBaseDir, skillName, 'index.ts'),
    ];
    // NO SKILL.md check!
    for (const candidate of candidates) {
        if (existsSync(candidate)) return candidate;
    }
    return null;  // Returns null → error at line 54-65
};
```

**Confirmed:** When no entry point found, returns opaque error: "Skill does not expose a local in-process entrypoint."

#### Issue #2: NOT A BUG - SubprocessExecutor already has SKILL.md fallback
**File:** `plugins/rd3/skills/orchestration-v2/scripts/executors/subprocess.ts`
**Lines:** 184-214 (`resolveSkillScript`), 222-252 (`executeSkillOnly`)

```typescript
// subprocess.ts:204-209 - Already handles SKILL.md fallback!
const skillPath = resolve(this.skillBaseDir, skillName, 'SKILL.md');
if (existsSync(skillPath)) {
    return { type: 'skill-only' };  // Triggers ACP fallback
}

// subprocess.ts:222-252 - executeSkillOnly() calls executeAcpTransport()
```

**Confirmed:** SubprocessExecutor correctly falls back to ACP transport when only SKILL.md exists.

#### Issue #3: VALID - Design inconsistency between DEFAULT_CHANNEL and defaultAdapterId
**Files:**
- `plugins/rd3/skills/orchestration-v2/scripts/config/consts.ts:39`
  ```typescript
  export const DEFAULT_CHANNEL = 'pi';  // ACP-based!
  ```
- `plugins/rd3/skills/orchestration-v2/scripts/routing/policy.ts:271`
  ```typescript
  BUILT_IN_POLICIES.safe.defaultAdapterId = 'local';  // InlineExecutor!
  ```

**Confirmed:** `DEFAULT_CHANNEL = 'pi'` but policy routes to `'local'` (InlineExecutor) when no explicit channel.

#### Additional Finding: wt plugin skills have mixed entry point types
**Observation:** wt skills have two patterns:
1. Skills with SKILL.md + TypeScript scripts (publish-to-x, publish-to-juejin, etc.)
2. Skills with only SKILL.md (lead-research-assistant, markitdown-browser, image-illustrator, image-cover)

**No issues found** - wt skills use a different execution model (direct script invocation via Skill tool), not the orchestrator executor pool.

---

### Solution Evaluation

#### Proposed Solution Assessment

The task proposes:
1. Add `scripts/run.ts` as universal entry point candidate
2. Add ACP fallback when no script but SKILL.md exists

**Verdict: CORRECT AND RECOMMENDED**

**Rationale for preferring this over the "simpler alternative":**
1. **Preserves InlineExecutor as the fast interactive default** for skills with TypeScript entry points
2. **Graceful fallback to ACP** for SKILL-only packages — no behavior change for skills with `scripts/local.ts`
3. **Adds `scripts/run.ts` as the universal entry point** — future-proofs the architecture
4. **Single execution path** — both InlineExecutor and SubprocessExecutor route to ACP for SKILL-only packages

#### Alternative Fix (Quick but Less Ideal)

Change the default policy from `'inline'` to `'subprocess'` in `BUILT_IN_POLICIES.safe`:

```typescript
// policy.ts:270-275
safe: {
    defaultAdapterId: 'subprocess',  // SubprocessExecutor already has SKILL fallback
    ...
}
```

**Trade-off:** Works, but subprocess has more overhead than true in-process inline execution. The proposed solution above is architecturally cleaner.

#### Implementation Approach

**Option B (inline ACP fallback):** InlineExecutor calls `executeAcpTransport()` directly when SKILL.md exists but no script entry point found. This mirrors how SubprocessExecutor handles SKILL-only packages.

```typescript
// In inline.ts execute(), after resolveLocalEntrypoint returns null:
const hasSkillMd = existsSync(resolve(this.skillBaseDir, skillName, 'SKILL.md'));
if (hasSkillMd) {
    const { executeStateless } = await import('../integrations/acp/transport');
    const { buildPromptFromRequest } = await import('../integrations/acp/prompts');
    const prompt = buildPromptFromRequest(req);
    const result = executeStateless(prompt, req.timeoutMs ?? 30 * 60 * 1000);
    return { ...result, durationMs: Date.now() - startTime };
}
```

#### Files That Need Modification

| Priority | File | Change |
|----------|------|--------|
| **HIGH** | `scripts/executors/inline.ts` | Add `scripts/run.ts` candidate + ACP fallback via `executeAcpTransport()` |
| LOW | `scripts/executors/inline.test.ts` | Add fallback test cases |

---

### Related Issues

- Task 0004: Astro WebApp Integration (original trigger for this bug)
- (Add related task references as discovered)
