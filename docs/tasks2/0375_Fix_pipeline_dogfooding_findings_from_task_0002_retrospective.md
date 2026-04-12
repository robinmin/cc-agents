---
name: Fix pipeline dogfooding findings from task 0002 retrospective
description: Fix pipeline dogfooding findings from task 0002 retrospective
status: Done
created_at: 2026-04-12T01:10:46.389Z
updated_at: 2026-04-12T01:10:46.389Z
folder: docs/tasks
type: task
priority: "high"
preset: "standard"
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0375. Fix pipeline dogfooding findings from task 0002 retrospective

### Background

Task 0002 (In another project -- Harden starter architecture and contracts) was executed through the rd3 standard pipeline (9-phase: intake → decompose → implement → test → review → verify-bdd → verify-func → docs). The implementation delivered correct results — 85 tests pass, coverage gate green, all workstreams implemented. However, the pipeline itself was used as ad-hoc reference rather than enforced workflow.

This task captures every issue found during a systematic retrospective of that execution, treating the pipeline run as a dogfooding test of the workflow tooling, codebase consistency, and documentation integrity.

Findings are severity-ranked so they can be tackled in priority order.

### Requirements

1. Fix the FSM enforcement gap (F1) so the pipeline is executable tooling, not just documentation.
2. Resolve the coverage_threshold config gap (F2) — either wire it to the gate or remove it.
3. For each phase config flag (F3-F6), either enforce it or document it as advisory.
4. Auto-update `impl_progress` on phase transitions (F7).
5. `bun run check` must pass after every fix batch.

### Q&A

#### Why a separate task instead of fixing inline?
The findings were identified during a task 0002 retrospective in another project. Target-project issues (docs, code fixes) are tracked there. This task covers only orchestration-v2 / pipeline.yaml gaps in cc-agents.

#### What about the pipeline FSM enforcement gap?
That's the root cause (F1). M1-M4 and L3 are all symptoms — the skill defines spec but doesn't enforce it. Fixing F1 cascades to the rest.

### Key Decisions

#### Decision 1: Triage scope
Original retrospective had 18 findings. After triage, 11 were identified as target-project issues (H1-H5, M5, M6, L1, L2, L4) and excluded. 7 findings remain — all are orchestration-v2 skill or pipeline.yaml gaps.

#### Decision 2: Severity taxonomy
- **CRITICAL**: Blocks pipeline reliability or trust.
- **HIGH**: Config that doesn't do what it says.
- **MEDIUM**: Phase flags declared but not enforced.
- **LOW**: Auto-tracking gaps (subsumes under CRITICAL fix).

### Design

## Findings (cc-agents scope only)

Triaged from the full retrospective. Findings H1-H5, M5, M6, L1, L2, L4 were identified as target-project issues (docs, code, config in the other project) and removed. The 7 findings below are all orchestration-v2 skill or pipeline.yaml gaps in this project.

**Root cause pattern**: M1-M4 and L3 are all symptoms of C1. The orchestration-v2 skill has a well-defined spec (pipeline.yaml, FSM, state DB) but no enforcement layer that forces the agent to actually use it. Fixing C1 properly cascades fixes to M1-M4 and L3.

---

### F1. Pipeline FSM state DB never written to [CRITICAL]

**What happened**: The orchestration-v2 DAG/FSM was loaded as reference but all state DB tables (`runs`, `phases`, `events`, `gate_results`, `phase_evidence`, `rollback_snapshots`, `resource_usage`) are empty (0 rows). The agent executed phases inline without recording state, triggering gates, or producing phase artifacts.

**Impact**:
- No resume capability — a crashed session loses all progress.
- No audit trail — no record of which phases passed/failed.
- No gate enforcement — human gate on review was skipped, TDD flag ignored, git-worktree sandbox ignored.
- No artifact tracking.

**Root cause**: The skill defines the specification but lacks enforcement. The agent treated it as reference documentation rather than an executable workflow.

**Fix approach**: Design and implement a lightweight enforcement mechanism — either:
1. A pre-tool hook that checks FSM state before allowing phase actions, or
2. A CLI wrapper (`pipeline run`, `pipeline next`) that the agent must call to advance phases, or
3. A structured task template that requires explicit state transition calls at phase boundaries.

**Files**: `docs/.workflows/pipeline.yaml`, orchestration-v2 skill scripts

---

### F2. coverage_threshold declared but never passed to target gate [HIGH]

**What happened**: `pipeline.yaml` declares `coverage_threshold: 80` for the standard preset, but provides no mechanism to pass this value to whatever coverage gate the target project uses. The config field is inert.

**Impact**: The pipeline config is misleading. Changing the YAML threshold has no effect on actual gate behavior.

**Fix approach**: Either:
1. Make the orchestration-v2 runner export the threshold as an env var or CLI arg when invoking the test phase, or
2. Remove `coverage_threshold` from pipeline.yaml and document that coverage gates are project-specific, or
3. Add a gate hook in the skill that reads and enforces the threshold directly.

**Files**: `docs/.workflows/pipeline.yaml`, orchestration-v2 skill (runner/hooks)

---

### F3. BDD/functional verification phases not enforced [MEDIUM]

**What happened**: The pipeline declares `rd3:bdd-workflow` and `rd3:functional-review` phases. In practice, verification was ad-hoc smoke tests. No Gherkin scenarios, no structured traceability matrix.

**Fix approach**: Either:
1. Enforce structured output from verify-bdd/verify-func phases (require artifacts), or
2. Document a lightweight verification protocol for simple tasks, or
3. Make the BDD phase optional per preset with explicit skip rationale.

**Files**: orchestration-v2 skill, `docs/.workflows/pipeline.yaml`

---

### F4. Review phase doesn't enforce skill invocation or artifact production [MEDIUM]

**What happened**: The pipeline declares a `review` phase with `depth: thorough` and a human gate. The actual review was inline self-assessment. No structured review artifact was produced, `rd3:code-review-common` was never invoked.

**Fix approach**: Either:
1. Enforce that the review phase invokes the declared skill and produces an artifact, or
2. Downgrade the human gate to auto for small tasks with documented criteria, or
3. Add artifact validation in the gate check.

**Files**: orchestration-v2 skill (hooks/gates), `docs/.workflows/pipeline.yaml`

---

### F5. `tdd: true` flag is ignored [MEDIUM]

**What happened**: The `implement` phase declares `tdd: true`, but implementation was written before tests. The flag has no enforcement.

**Fix approach**: Either:
1. Enforce TDD by splitting `implement` into `implement-red` and `implement-green` sub-phases, or
2. Remove `tdd: true` from the standard preset if it's aspirational, or
3. Document it as advisory and rename to `tdd_recommended: true`.

**Files**: `docs/.workflows/pipeline.yaml`, orchestration-v2 skill

---

### F6. `sandbox: git-worktree` declared but not enforced [MEDIUM]

**What happened**: The `implement` phase declares `sandbox: git-worktree`. All work happened on the current branch directly.

**Fix approach**: Either:
1. Implement worktree isolation in the runner, or
2. Remove the `sandbox` declaration if it's not enforced, or
3. Make sandbox opt-in with a CLI flag rather than a default declaration.

**Files**: `docs/.workflows/pipeline.yaml`, orchestration-v2 skill

---

### F7. `impl_progress` not auto-updated in task files [LOW]

**What happened**: Task files have a structured `impl_progress` section for tracking phase completion. It was never touched during execution.

**Fix approach**: Subsumes under F1 — when the FSM enforcement is implemented, phase transitions should auto-update `impl_progress` in the task file.

**Files**: orchestration-v2 skill (state manager)

---

### Solution

## Execution Plan

### Batch 1: Pipeline enforcement design (F1) [CRITICAL]
Design the FSM enforcement mechanism. This is the root cause for F3-F7.

### Batch 2: Config gap (F2) [HIGH]
Decide how coverage_threshold flows from pipeline.yaml to the actual gate.

### Batch 3: Phase enforcement (F3, F4, F5, F6, F7) [MEDIUM/LOW]
Implement or document enforcement for BDD, review, TDD, sandbox, and impl_progress — largely follows from F1's design.

### Plan

## Proposed Execution Order

1. **Batch 1** — F1: FSM enforcement (root cause, largest scope, unblocks everything)
2. **Batch 2** — F2: coverage_threshold config gap (isolated, quick decision)
3. **Batch 3** — F3-F7: phase enforcement and auto-tracking (cascades from F1 design)

Each batch should result in a passing `bun run check` before proceeding.

## Definition of Done

- F1 (CRITICAL): enforcement mechanism designed and implemented — next pipeline run produces state DB entries.
- F2 (HIGH): coverage_threshold either flows to gate or is removed with documented rationale.
- F3-F6 (MEDIUM): each phase config flag is either enforced or documented as advisory.
- F7 (LOW): impl_progress auto-updates on phase transitions.
- `bun run check` passes.

### Review

## Source Audit

Triaged from a systematic retrospective of task 0002 pipeline execution in another project. Original findings compared: pipeline YAML config vs actual behavior, state DB contents vs expected FSM transitions, and coverage gate config vs pipeline threshold declarations. Target-project-specific findings (H1-H5, M5, M6, L1, L2, L4) were excluded — they will be fixed in that project separately.

### Testing

## Verification Plan

- After Batch 1: next pipeline run produces non-empty state DB tables (`runs`, `phases`, `events`).
- After Batch 2: `coverage_threshold` is either wired to gate or removed from pipeline.yaml.
- After Batch 3: pipeline.yaml flags (`tdd`, `sandbox`, review gate) are either enforced or marked advisory.
