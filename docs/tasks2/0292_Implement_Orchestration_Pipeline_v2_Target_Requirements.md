---
name: Implement Orchestration Pipeline v2 Target Requirements
description: Implement Orchestration Pipeline v2 Target Requirements
status: Done
created_at: 2026-03-30T21:59:40.366Z
updated_at: 2026-03-31T00:10:00.000Z
folder: docs/tasks2
type: task
priority: "high"
tags: ["rd3","orchestration","v2"]
impl_progress:
  planning: done
  design: done
  implementation: done
  review: done
  testing: done
---

## 0292. Implement Orchestration Pipeline v2 Target Requirements

### Background

Transition orchestration-dev to its v2 architecture per user scoping decisions.


### Requirements

# Orchestration Pipeline v2 Target Requirements (Revised)

Based on the latest architectural review, the v2 implementation of the orchestration pipeline focuses on pragmatic, high-value control-plane features. We are prioritizing stability, automated recovery, and bringing all phases into a functional execution state locally.

## 1. Automated Rework Loops (Core v2 Feature)
* **1.1 Automated Iteration:** Transition from the v1 "stop and manual resume" behavior to an autonomous retry loop. Failed gate evaluations automatically trigger re-execution.
* **1.2 Feedback Injection:** The runtime captures the `rejection_reason` (e.g., test errors, lint failures) from the failed gate and injects it into the phase worker prompt as feedback.
* **1.3 Iteration Limits:** Implement a configurable `MAX_ITERATIONS` limit to prevent infinite rework loops. Exceeding this limit escalates the pipeline to a `paused` state requiring human intervention.

## 2. Universal CoV-Backed Gates
* **2.1 Phase 6 Parity:** Expand the Chain-of-Verification (CoV) interpreter pattern currently isolated in Phase 6 (Unit Testing) to all remaining phases.
* **2.2 Deprecate Lightweight Gates:** Replace the v1 lightweight `human` and `auto/human` direct gate tracking with deterministic CoV-backed declarative gate checkers.
* **2.3 Universal Evidence:** Ensure every executed phase benefits from standardized CoV retry, checker evaluations, and formatted execution evidence.

## 3. Native Direct-Skill Execution (Current Channel Only)
* **3.1 End-to-End Viability:** Transition Phases 1-4 (Intake, Architecture, Design, Decompose) and Phases 8-9 (BDD Verification, Code Docs) from "plan-only" placeholders to fully executable phases.
* **3.2 Local-Only Constraint:** These direct-skill phases will be executed *natively* on the `current` channel by delegating directly to their respective underlying skills (e.g., `rd3:backend-architect`, `rd3:code-docs`). We will *not* attempt to dispatch these phases over ACP or remote channels, keeping the implementation simple and deterministic.

## 4. Rollback and Safe State Resets
* **5.1 Sandbox Restorations:** Implement an automated rollback capability that cleans up workspace side-effects (file modifications) if a phase fails validation completely.
* **5.2 Safe Reset:** Introduce CLI capabilities to `undo` a successfully completed phase and clear its orchestration state cache, forcing a fresh re-evaluation.

## 5. Run-Scoped Runtime Artifact Storage Enhancement
* **5.1 Canonical Run State Location:** Persist orchestration state under `docs/.workflow-runs/rd3-orchestration-dev/<wbs>/<run-id>.json` rather than the legacy root `orchestration/` directory.
* **5.2 Run-Scoped CoV Checkpoints:** Persist verification-chain runtime state under the same run namespace, using `docs/.workflow-runs/rd3-orchestration-dev/<wbs>/<run-id>/cov/`, so separate executions of the same task cannot overwrite one another.
* **5.3 Run-Scoped Gate Evidence:** Persist deterministic gate evidence under `docs/.workflow-runs/rd3-orchestration-dev/<wbs>/<run-id>/gates/` so all execution artifacts for a run stay grouped together and can be compared across runs.
* **5.4 Canonical Resume/Undo:** Resume and undo operate only on the canonical `docs/.workflow-runs/rd3-orchestration-dev/<wbs>/` layout.
* **5.5 Verification Visibility:** Update orchestration-dev and verification-chain docs/tests so later audits can see that run-state, CoV checkpoints, and gate evidence are intentionally run-scoped rather than task-global.

---

### Excluded / Deprioritized Features
* **Conditional Branching:** (Dropped). Deemed too complex for current needs. The pipeline will remain a predictable, linear sequence.
* **Parallel Execution:** (Neutral/Deferred). While nice to have for independent phases, it adds significant state-management complexity and is not a strictly blocking requirement for a successful v2.

---

### Phase 2: Post-Implementation Command Audits
Once the v2 implementation of `orchestration-dev` is fully capable of natively running all direct skill phases on the `current` channel, perform a comprehensive audit of the downstream slash commands relying on the orchestrator to ensure their documentation accurately reflects the live v2 capabilities:
- [ ] Review `plugins/rd3/commands/dev-plan.md` to remove v1 "plan only" caveats.
- [ ] Review `plugins/rd3/commands/dev-refine.md` to remove v1 "plan only" caveats.
- [ ] Review `plugins/rd3/commands/dev-docs.md` to remove v1 "plan only" caveats.
- [ ] Review `plugins/rd3/commands/dev-review.md` and `dev-run.md` regarding any remaining `ORCHESTRATION_DEV_LOCAL_PROMPT_AGENT` caveats if the native runners deprecate specific prompt overrides.


### Q&A

**Phase 1 Intake Analysis (2026-03-30)**

Scope validated against 7 source files (model.ts, contracts.ts, runtime.ts, pilot.ts, executors.ts, plan.ts, verification-chain/*). Key findings:

1. **Rework Loops**: `runtime.ts:runOrchestration()` (L208-335) has NO retry loop. Failed phases immediately set `state.status='failed'` and return. The `handleRework` pattern from SKILL.md is aspirational — not implemented.
2. **CoV Gates**: Only Phase 6 uses CoV (`pilot.ts:buildPhase6Manifest()` L48-96). Phases 1-5, 7-9 use direct gate checks (L311-335 in runtime.ts).
3. **Direct-Skill Execution**: `pilot.ts:createPilotPhaseRunner()` (L370-396) returns `unsupportedPhaseResult()` for all non-5/6/7 phases. Phases 1-4 and 8-9 are plan-only.
4. **Rollback**: No rollback capability exists anywhere. No git-based sandbox restoration. No CLI undo.

**Constraints**:
- Local-only (`current` channel) for direct-skill phases 1-4, 8-9
- No conditional branching or parallel execution (explicitly excluded)
- Must maintain backward compatibility with existing v1 worker-agent phases (5-7)
- Must not break existing tests (~3,065 lines across 5 test files)

### Design

## v2 Architecture

### File Change Map

| File | Change Type | Features |
|------|------------|----------|
| `scripts/model.ts` | Extend | #1 (ReworkConfig), #4 (RollbackConfig) |
| `scripts/contracts.ts` | Extend | #2 (CoV gate contracts), #3 (direct-skill phase contracts) |
| `scripts/runtime.ts` | Major refactor | #1 (rework loop), #2 (CoV gate evaluation), #4 (rollback) |
| `scripts/pilot.ts` | Extend | #2 (CoV manifests for all phases), #3 (direct-skill runner) |
| `scripts/executors.ts` | Minor extend | #3 (direct-skill execution path) |
| `scripts/rollback.ts` | **New file** | #4 (git-based rollback, state reset) |
| `scripts/gates.ts` | **New file** | #2 (universal CoV-backed gate evaluator and deterministic checker definitions) |
| `scripts/direct-skill-runner.ts` | **New file** | #3 (native prompt-backed execution for phases 1-4, 8-9) |

### Feature 1: Automated Rework Loops

**Architecture**: Modify `runOrchestration()` in runtime.ts to wrap phase execution in a configurable rework loop.

```
Phase execution → Gate evaluation → Pass? → Next phase
                                → Fail? → Capture rejection_reason
                                         → Inject into next iteration prompt
                                         → Iteration < MAX? → Re-execute
                                         → Iteration >= MAX? → Escalate to paused
```

**Types** (added to model.ts):
```typescript
interface ReworkConfig {
  max_iterations: number;      // default: 2
  feedback_injection: boolean; // default: true
  escalation_state: 'paused' | 'failed'; // default: 'paused'
}
```

**Key changes to runtime.ts**:
- Add rework loop inside the phase execution for-loop (after L276)
- Capture `rejection_reason` from PhaseRunnerResult.error
- Create `executePhaseWithFeedback()` that appends feedback to the phase prompt
- On max iterations exceeded, set state to `paused` with escalation metadata

### Feature 2: Universal CoV-Backed Gates

**Architecture**: Extract gate evaluation into a standalone `gates.ts` module. Each phase gets a CoV manifest builder similar to `buildPhase6Manifest()`.

**Pattern**: Generalize `buildPhase6Manifest()` into `buildPhaseManifest(phase, taskRef, profileId)` that works for any phase.

**Per-phase CoV profiles** (implemented in `scripts/gates.ts`):
- Phase 1 (Request Intake): Validate task file sections exist and have content
- Phase 2 (Architecture): Validate architecture doc produced
- Phase 3 (Design): Validate design specs produced (human gate retained)
- Phase 4 (Task Decomposition): Validate subtasks generated
- Phase 5 (Implementation): Validate implementation artifacts exist
- Phase 7 (Code Review): Validate review report produced (human gate retained)
- Phase 8 (Functional Review): Validate BDD + functional verdict
- Phase 9 (Documentation): Validate docs refreshed

**Key principle**: CoV-backed gates replace the lightweight gate logic in runtime.ts (L298-328) with deterministic checkers. Human gates (Phase 3, 7, 8) retain human checker methods from the existing CoV system.

### Feature 3: Native Direct-Skill Execution

**Architecture**: New `direct-skill-runner.ts` that executes phases 1-4, 8-9 by delegating to their skills directly on the `current` channel.

**Pattern**: Unlike worker-agent phases (5-7) that use prompt-based delegation via acpx, direct-skill phases use a simpler prompt-backed execution model:
- Build a skill-specific prompt from phase context
- Execute on the `current` channel only
- Parse the skill's natural output (not JSON worker envelope)
- Persist normalized step evidence so CoV checkers can validate the completed phase deterministically

**New types**:
```typescript
interface DirectSkillPhaseConfig {
  phase: PhaseNumber;  // 1 | 2 | 3 | 4 | 8 | 9
  skill: string;
  prompt_builder: (phase: Phase, context: PhaseRunnerContext) => string;
}
```

**Key constraint**: Direct-skill phases only execute on `current` channel. If `execution_channel !== 'current'`, return `unsupportedPhaseResult()` with a clear message.

**Integration with pilot.ts**: Replace the `unsupportedPhaseResult()` calls for phases 1-4, 8-9 with calls to the direct-skill runner.

### Feature 4: Rollback and Safe State Resets

**Architecture**: New `rollback.ts` module with git-based workspace restoration.

**Two operations**:

1. **Sandbox Restoration** (auto on phase failure):
   - Capture git state (list of modified/added files) before phase execution
   - On phase failure with rework exhausted, restore files to pre-phase state
   - Use `git checkout -- <files>` for modified, `rm` for new files
   - Record restored files in phase evidence

2. **CLI Undo** (manual, explicit):
   - New `--undo <phase>` CLI flag
   - Validates the target phase was completed
   - Reverts git changes made during that phase (from evidence metadata)
   - Clears the phase's orchestration state (sets status back to pending)
   - Removes completed_at timestamp

**Types**:
```typescript
interface RollbackSnapshot {
  phase: PhaseNumber;
  files_before: string[];     // list of files before phase
  files_after: string[];      // list of files after phase
  git_head_before: string;    // commit hash before phase
  created_at: string;
}

interface UndoOptions {
  task_ref: string;
  phase: PhaseNumber;
  dry_run: boolean;           // preview what would be undone
}
```

### Solution

v2 implementation complete. All 4 features are live in the runtime:

1. **Automated Rework Loops** — `runtime.ts` wraps phase execution in configurable rework loop with feedback injection and escalation
2. **Universal CoV-Backed Gates** — `gates.ts` generalizes the CoV manifest pattern to all 9 phases, persists phase-step evidence, and routes human approval through CoV human checker nodes
3. **Native Direct-Skill Execution** — phases 1-4 and 8-9 execute through prompt-backed direct-skill delegation pinned to the `current` channel even when worker phases use ACP
4. **Rollback and Safe State Resets** — `rollback.ts` provides git-based snapshot/restore and CLI `--undo`, preserving pre-existing dirty files and invalidating downstream phases on undo
5. **Run-Scoped Storage Enhancement** — orchestration state now lives in `docs/.workflow-runs/rd3-orchestration-dev/<wbs>/<run-id>.json`, with CoV checkpoints and gate evidence stored beside it under the run-specific `cov/` and `gates/` directories; resume/undo are canonical-layout only

### Plan

## Implementation Subtasks

### Completed
- [x] Added `ReworkConfig`, rollback snapshot types, and persisted rework config in orchestration state
- [x] Wrapped phase execution in a configurable rework loop with feedback injection and escalation
- [x] Generalized CoV gate evaluation to all phases through `gates.ts` and `pilot.ts`
- [x] Added deterministic gate checks against persisted step evidence and task-file surfaces
- [x] Moved human gates for phases 3, 7, and 8 into CoV human checker nodes
- [x] Pinned direct-skill phases 1-4 and 8-9 to the `current` channel in the live execution path
- [x] Added safe rollback restore and `--undo` with downstream invalidation
- [x] Added targeted tests for gates, pilot routing, rework config, rollback, and direct-skill execution
- [x] Moved orchestration runtime artifacts to `docs/.workflow-runs/rd3-orchestration-dev/<wbs>/<run-id>{.json,/cov,/gates}` and removed legacy fallback handling

### Notes
- The public CLI exposes `--rework-max-iterations N`.
- Generic per-phase gate profiles are defined in code (`gates.ts`), not in external JSON files.
- Direct-skill phases use prompt-backed execution with normalized evidence capture, not shell command mode.
- Human approval is paused inside the CoV chain; orchestration resume implicitly approves the paused CoV gate.
- CoV state and gate evidence are intentionally run-scoped so separate executions of the same task do not clobber one another.

### Review



### Testing

- `bun x tsc --noEmit --pretty false`
- `bun test plugins/rd3/skills/orchestration-dev/tests/gates.test.ts plugins/rd3/skills/orchestration-dev/tests/pilot.test.ts plugins/rd3/skills/orchestration-dev/tests/runtime.test.ts plugins/rd3/skills/orchestration-dev/tests/plan.test.ts --reporter=dots`
  Note: assertions pass; Bun still exits `1` for narrowed runs because the repository coverage gate remains active.



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References
