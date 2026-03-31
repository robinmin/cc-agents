---
name: Orchestration Pipeline v2 Dogfood Findings - Documentation and Integration Fixes
description: Fix stale v1 documentation and integration gaps discovered by dogfooding the 9-phase pipeline on task 0292
status: Backlog
created_at: 2026-03-31T02:46:33.751Z
updated_at: 2026-03-31T02:46:33.751Z
folder: docs/tasks2
type: task
priority: "medium"
tags: ["rd3","orchestration","dogfood","v2"]
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0293. Orchestration Pipeline v2 Dogfood Findings - Documentation and Integration Fixes

### Background

Task 0292 ran through the 9-phase orchestration pipeline as a dogfood test. The implementation succeeded (all 4 v2 features delivered, 218 tests passing), but the process revealed gaps between documentation and runtime behavior, dead code, incomplete integrations, and process improvements that would make future pipeline runs more reliable.

Every finding below was verified against the current codebase with specific file:line references.

### Requirements

## P0: Fix Now (within this task)

### F1: SKILL.md still describes v1 pilot capabilities

The SKILL.md has 6+ places referencing "v1 pilot" or claiming phases 1-4/8-9 are unsupported. These contradict the v2 implementation.

**Specific locations:**
- `SKILL.md:40` — "The current v1 pilot concretely executes phases 5, 6, and 7 only... Direct-skill phases 1-4 and 8-9 remain plan-level definitions"
  - **Reality**: All 9 phases execute. Phases 1-4/8-9 run via `direct-skill-runner.ts`, phases 5-7 via worker agents, phase 6 via CoV.
- `SKILL.md:79` — Dry-run example says "Preview unsupported direct-skill phases"
  - **Reality**: Direct-skill phases are supported.
- `SKILL.md:241` — "currently fails direct-skill phases 1-4 and 8-9 regardless of channel"
  - **Reality**: `pilot.ts:378` delegates to `directSkillRunner` for these phases, which returns `{ status: 'completed' }` on `current` channel.
- `SKILL.md:242-268` — "Not implemented in v1. The rework loop below describes the target behavior for v2"
  - **Reality**: Rework IS implemented in `runtime.ts:366-487` with configurable max_iterations, feedback injection, and escalation states.
- `SKILL.md:278` — "In the current v1 pilot, only phases 5, 6, and 7 are executable"
  - **Reality**: All phases executable.
- `SKILL.md:377-394` — "v1 Limitations" section lists items resolved by v2, plus duplicate line at 379-380
  - Lines 379-380: both say "Sequential only: No parallel phase execution" (duplicate)
  - Lines 383-387: "v2 enhancements available" correctly lists rework/CoV/direct-skill/rollback
  - Lines 389-394: "v2 enhancements planned" lists items already implemented (direct-skill pilot, rollback) alongside genuinely planned items (parallel, branching)

**Fix**: Rewrite SKILL.md to remove all v1/v2 split language. Describe current capabilities directly.

### F2: Fix rollback test TS2554 error

`tests/rollback.test.ts` has a test that passes 2 arguments to `rollbackMain()` which only accepts 1. The test passes at runtime because `stubExit()` causes a throw before the second arg is reached, but TypeScript correctly flags this as a TS2554 error.

**Fix**: Use `process.chdir(dir)` before calling `rollbackMain()` instead of passing a second argument.

---

## P1: Backlog (requires architectural decisions)

### F3: `--undo` parsed but never routed

`parseOrchestrationArgs()` in `model.ts:167-174` parses `--undo <phase>` and `--undo-dry-run` flags, storing them in `ParsedOrchestrationArgs.undo` and `ParsedOrchestrationArgs.undoDryRun`. However, `runtime.ts`' `main()` function (lines 554-621) never checks these fields. The parsed values exist but are dead code in the runtime path.

The `--undo` functionality works only through `rollback.ts`' standalone `main()` function.

**Decision needed**: Should `runtime.ts` main() handle `--undo` by calling `executeUndo()` from rollback.ts? Or should the unused parsed fields be removed from `ParsedOrchestrationArgs` since rollback.ts is the canonical entry point for undo?

**Options**:
1. Wire `--undo` into `runtime.ts` main() → dispatches to `executeUndo()` before any phase execution
2. Remove `--undo`/`--undo-dry-run` from `parseOrchestrationArgs()` and `ParsedOrchestrationArgs` → rollback.ts remains sole entry point

### F4: `gates.ts` `evaluateCoVGate()` is dead code

`evaluateCoVGate()` (gates.ts:229-259) was implemented as the universal CoV gate evaluator for v2 feature 2. However, it is never called by `runtime.ts` or `pilot.ts`. The actual gate evaluation:
- Phase 6: `pilot.ts:391-396` calls `buildPhase6Manifest()` + `runChain()` directly
- Phases 1-4, 8-9: `directSkillRunner` returns synthesized completion (no gate evaluation)
- Phases 5, 7: worker-agent runner (no CoV gate)

`buildPhaseManifest()` IS used (by tests), but `evaluateCoVGate()` and `buildPhaseEvidence()` only execute in tests.

**Decision needed**: Should `evaluateCoVGate()` be wired into the pilot phase runner to replace the lightweight gate logic? Or should it be removed until a future iteration?

### F5: Direct-skill runner returns synthesized results

`direct-skill-runner.ts:164-175` always returns `{ status: 'completed' }` with a generated prompt. The actual skills (e.g., `rd3:request-intake`, `rd3:code-docs`) are never invoked. The prompt is produced but not executed. This means phases 1-4 and 8-9 appear to complete but produce no real artifacts.

This is **by design** for the current scope — the runner confirms the phase is valid for direct execution and generates a prompt for the orchestration layer. However, SKILL.md should document this clearly so users understand what "completed" means for these phases.

**Action**: Document this in SKILL.md as a known limitation.

---

## P2: Backlog (infrastructure / process)

### ~~F6: Bun test runner hangs with 66+ concurrent test files~~ RESOLVED

Running `bun test plugins/rd3/skills/` hangs indefinitely. Root cause: Bun's test runner spawns too many concurrent processes. Tests pass when split into batches of 6-8 files. This affects all rd3 skills, not just orchestration-dev.

**Resolution (2026-03-31)**: No longer reproducible with Bun 1.3.11. Full suite of 71 test files (2053 tests) completes in 7.25s with 0 failures. Likely fixed by Bun upgrade or `root = "plugins/rd3"` in bunfig.toml.

### ~~F7: Phase 3 (Design) adds marginal value for implementation-heavy tasks~~ RESOLVED

During task 0292, phase 3 was skipped entirely. The architecture phase (2) already contained enough detail. For implementation tasks (vs greenfield architecture), the design phase has diminishing returns.

**Resolution (2026-03-31)**: Already addressed via `PHASE_MATRIX` in `contracts.ts:92-102`. Phase 3 is skipped for `simple` and `standard` profiles, included only for `complex` and `research`. Phase-only profiles (`unit`, `review`, `docs`, `refine`) also exclude Phase 3.

### F8: No context budget awareness in pipeline

The 0292 implementation consumed the entire context window. Phases 7-9 were never reached. The pipeline has no mechanism to estimate remaining context or warn if phases won't complete.

**Action**: Investigate feasibility of token estimation after each phase.

### Q&A

**Verification methodology (2026-03-31):**
- All findings verified by reading source files directly (SKILL.md, runtime.ts, pilot.ts, model.ts, gates.ts, direct-skill-runner.ts, rollback.ts)
- Coverage data confirmed via `bun test --coverage` for gates.ts (100%), model.ts (100%), rollback.ts (93%)
- Test suite hang confirmed across multiple run attempts with different batch sizes
- `--undo` integration gap confirmed by grepping for `.undo` across all scripts (only found in model.ts parsing)

### Design

## Implementation Approach

### F1: SKILL.md Rewrite Strategy

Remove the v1/v2 split entirely. Describe capabilities as they exist today:
1. Line 40: Replace v1 pilot description with current capabilities (all 9 phases executable)
2. Lines 79: Remove "unsupported" qualifier from dry-run example
3. Lines 235-241: Update channel resolution — direct-skill phases execute on `current`, fail on remote
4. Lines 242-268: Remove "Not implemented in v1" rework section — describe actual rework behavior
5. Line 278: Remove "only phases 5,6,7" limitation
6. Lines 377-394: Replace "v1 Limitations" with accurate current limitations

### F2: Test Fix Strategy

Single-line change in rollback.test.ts — replace `rollbackMain(['--undo', '0292', '5'], dir)` with:
```
process.chdir(dir);
rollbackMain(['--undo', '0292', '5']);
```

### Plan

- [x] F1: Update SKILL.md (6 locations)
- [x] F2: Fix rollback test TS2554
- [x] F3: Decide on `--undo` routing (architecture decision needed)
- [x] F4: Decide on `evaluateCoVGate()` integration (architecture decision needed)
- [x] F5: Document direct-skill synthesized results in SKILL.md
- [x] ~~F6: Investigate Bun test concurrency fix~~ RESOLVED — Bun 1.3.11 no longer hangs, 71 files / 2053 tests pass in 7.25s
- [x] ~~F7: Evaluate Phase 3 skip for impl profiles~~ RESOLVED — PHASE_MATRIX in contracts.ts:92-102 already skips Phase 3 for simple/standard profiles
- [ ] F8: Investigate context budget estimation

### Testing

- [ ] All existing orchestration-dev tests still pass after SKILL.md updates
- [ ] rollback.test.ts compiles without TS2554 after fix
- [ ] `bun test plugins/rd3/skills/orchestration-dev/tests/` passes cleanly

### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References

- Task 0292 (parent task — Orchestration Pipeline v2 implementation)
- `plugins/rd3/skills/orchestration-dev/SKILL.md` (primary documentation target)
- `plugins/rd3/skills/orchestration-dev/scripts/runtime.ts` (runtime with rework loop)
- `plugins/rd3/skills/orchestration-dev/scripts/pilot.ts` (phase runner dispatch)
- `plugins/rd3/skills/orchestration-dev/scripts/gates.ts` (dead code: evaluateCoVGate)
- `plugins/rd3/skills/orchestration-dev/scripts/direct-skill-runner.ts` (synthesized results)
- `plugins/rd3/skills/orchestration-dev/scripts/model.ts` (--undo parsing)
- `plugins/rd3/skills/orchestration-dev/scripts/rollback.ts` (standalone undo CLI)


