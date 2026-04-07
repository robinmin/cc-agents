---
name: Fix orchestrator workflow issues from dogfood 0335
description: Fix orchestrator workflow issues from dogfood 0335
status: Done
created_at: 2026-04-06T17:43:21.205Z
updated_at: 2026-04-06T17:54:33.515Z
folder: docs/tasks2
type: task
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0342. Fix orchestrator workflow issues from dogfood 0335

### Background

### Background

During task 0335 (add events CLI command), three workflow issues were discovered and confirmed as dogfood bugs:

**Issue 1 — Over-Decomposition:** Task 0335 was decomposed into 6 subtasks (0336-0341). Task 0341 literally says "Run bun run check and smoke test" — not a deliverable, just what you do at the end of every task. The task-decomposition skill's Decomposition Decision Rules have been updated with the "Decompose Only When Necessary" principle. Fix: rules updated, no code change needed.

**Issue 2 — Subtasks Left as Backlog:** After `decompose` created subtasks 0336-0341, the orchestrator ran `implement` on the parent task 0335 directly. The agent implemented everything in one shot. All 6 subtasks were left in Backlog, never executed. The root cause: the orchestrator has no parent-child task awareness — it runs implement once per phase, not per subtask.

**Issue 3 — Direct Commit to Main:** Code committed directly to `main` with no PR, no merge step. The `code-implement-common` skill describes worktree-based git workflow in prose documentation, but the orchestrator enforces nothing. The `--auto` flag auto-approves all human gates, including the review gate — making review meaningless.

**Dogfood evidence:**
```bash
# Subtasks left as Backlog:
tasks list  # → 0336-0341 all in Backlog

# Direct commit to main:
git log --oneline  # → 12d77604 fix(orchestrator): normalize task_ref — committed to main

# Over-decomposition example:
# Task 0341: "Run bun run check and smoke test" (NOT a deliverable)
```

This task implements fixes for Issues 2 and 3. Issue 1 is already addressed via rule updates.


### Requirements

- Issue 2 (subtasks left as Backlog): Make orchestrator implement phase detect subtasks and execute them sequentially, updating status as each completes
- Issue 3 (direct commit to main): Add pr phase to pipeline, enforce feature branch creation in code-implement-common
- All changes must not break existing orchestrator behavior
- bun run check must pass after changes


### Q&A



### Design

#### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ PipelineRunner                                                    │
│  └── executePhaseWithRework()                                     │
│       ├── getSubtasks(taskRef)  ──► [subtask files]             │
│       ├── For each subtask:                                       │
│       │    └── pool.execute(skill=implement, taskRef=subtask)   │
│       │    └── tasks update <wbs> done                           │
│       └── If no subtasks: current behavior (execute parent)       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ GateConfig                                                        │
│  └── blocking: boolean  (default: true for human gates)          │
│                                                                   │
│ checkHumanGate():                                                 │
│  └── if (auto && !blocking) → return pass (advisory)             │
│  └── if (auto && blocking) → return pending (blocking)           │
└─────────────────────────────────────────────────────────────────┘
```

#### Key Design Decisions

| Decision | Rationale |
|----------|----------|
| File-system-based subtask detection | No DB schema change; orchestrator scans for `{wbs}_*_*.md` files |
| WBS-prefix sorting | Deterministic order for subtask iteration |
| Human gates are blocking by default | Safer defaults; explicit `blocking: false` for advisory |
| pr phase after docs | Ensures all code changes are documented before PR |
| --auto does not bypass blocking gates | PR review MUST be manual regardless of automation |

#### File Changes Summary

| File | Change |
|------|--------|
| `scripts/utils/subtasks.ts` | New: getSubtasks() helper |
| `scripts/engine/runner.ts` | Modify: subtask iteration in implement phase |
| `scripts/model.ts` | Add: blocking property to GateConfig |
| `pipeline.yaml` | Add: pr phase with blocking human gate |
| `code-implement-common/SKILL.md` | Add: feature branch precondition |


### Solution

#### Subtasks

- [ ] [0343 - Add getSubtasks() helper utility](0343_0342_add_getsubtasks_helper.md)
- [ ] [0344 - Modify executePhaseWithRework() for subtask iteration](0344_0342_modify_execute_phase_for_subtasks.md)
- [ ] [0345 - Add pr phase to pipeline.yaml with human gate](0345_0342_add_pr_phase_to_pipeline_yaml.md)
- [ ] [0346 - Update code-implement-common to require feature branch](0346_0342_update_code_implement_common_feature_branch.md)
- [ ] [0347 - Fix gate bypass - distinguish blocking vs advisory gates](0347_0342_fix_gate_bypass_blocking_vs_advisory.md)
- [ ] [0348 - Integration test for subtask-aware implement](0348_0342_integration_test_subtask_aware_implement.md)
- [ ] [0349 - Integration test for PR pipeline gate](0349_0342_integration_test_pr_pipeline_gate.md)

**Dependency order:** (0343 → 0344) || (0345 || 0346) → 0347 → (0348 || 0349)
**Estimated total effort:** 8-13 hours

---

#### Original Solution (Design Notes)

Two interconnected fixes:

#### Fix 1: Subtask-Aware Orchestrator Implement Phase

**Problem:** The orchestrator runs `implement` on the parent task. Subtasks in the parent's Solution section are ignored. All subtasks end up orphaned in Backlog.

**Fix:** After `decompose` creates subtask files, the `implement` phase should:
1. Detect if the parent task has subtask files (via WBS prefix matching)
2. Iterate over subtasks in WBS order
3. Run implement on each subtask file individually
4. Update subtask status: WIP → Done as each completes
5. Only advance to `test` phase when all subtasks are done

**Key insight:** The orchestrator doesn't need to know about parent-child relationships in the DB. It just needs to detect subtask files and iterate over them. This is a file-system-based approach, not a DB schema change.

**Implementation approach:**
- In `executePhaseWithRework()` or a new `executeSubtasks()`, scan for subtask files
- Use `glob('docs/tasks2/{parent_wbs}_*_*.md')` to find subtask files
- For each subtask: run implement, then `tasks update <subtask_wbs> done`
- If no subtask files found, fall back to current behavior (implement parent)

#### Fix 2: Feature Branch + PR Pipeline

**Problem:** The pipeline commits directly to `main` with no PR step. `--auto` bypasses the review human gate entirely.

**Fix:** Add a `pr` phase that:
1. Runs AFTER `docs` phase completes
2. Creates a feature branch from `main` (branch name: `feat-{wbs}-{slug}`)
3. Commits all changes to the feature branch
4. Opens a PR (via `gh` CLI or equivalent)
5. The pipeline pauses at `pr` phase for human review/merge

**Pipeline change (pipeline.yaml):**
```yaml
pr:
  skill: rd3:git-workflow
  gate: { type: human }   # Human must approve PR before merge
  after: [docs]
```

**Human gate on `pr` phase:** This ensures the PR must be reviewed and merged manually, regardless of `--auto` flag. The `--auto` flag should only affect advisory gates, not blocking PR review gates.

**code-implement-common change:**
- Add precondition check: fail if not on a feature branch (or if `main` is detected)
- Require feature branch creation before any implementation

### Files to Modify

| File | Change |
|------|--------|
| `plugins/rd3/skills/orchestration-v2/scripts/engine/runner.ts` | Add subtask detection and sequential execution in implement phase |
| `plugins/rd3/skills/orchestration-v2/scripts/executors/acp.ts` | Pass subtask info in ExecutionRequest |
| `plugins/rd3/skills/orchestration-v2/scripts/model.ts` | Add `subtasks?: string[]` to ExecutionRequest |
| `docs/.workflows/pipeline.yaml` | Add `pr` phase with human gate |
| `plugins/rd3/skills/code-implement-common/SKILL.md` | Add feature branch precondition |

### Implementation Strategy

**Phase 1 (Fix 1 — Subtask-Aware Implement):**
1. Add helper to detect subtask files: `getSubtasks(parentWbs: string): string[]`
2. Modify `executePhaseWithRework()` to detect subtasks
3. Iterate: for each subtask → run skill → update status → advance
4. Test: run orchestrator on a parent task with subtasks

**Phase 2 (Fix 2 — PR Pipeline):**
1. Add `pr` phase to pipeline.yaml
2. Create `rd3:git-workflow` skill (or adapt existing worktree references)
3. Make `--auto` NOT bypass human gates on `pr` phase
4. Add feature branch precondition to code-implement-common

**Alternative for Fix 2 (simpler):** Instead of adding a `pr` phase, make the `review` phase human gate a hard blocker for commit. If human gate is not approved, do not commit. This is a smaller change but semantically wrong (review ≠ merge approval).


### Plan

### Plan

#### Phase 1: Subtask-Aware Implement (Fix 2 from dogfood)

1. [ ] Add `getSubtasks(parentWbs: string)` helper in `orchestration-v2/scripts/utils/`
2. [ ] Modify `executePhaseWithRework()` to detect subtasks
3. [ ] Add subtask iteration: for each → run implement → update status
4. [ ] Add fallback: if no subtasks, implement parent task (current behavior)
5. [ ] Test: run `orchestrator run <parent-task>` with subtasks, verify subtasks are executed sequentially
6. [ ] Verify existing tests still pass: `bun test`

#### Phase 2: PR Pipeline (Fix 3 from dogfood)

1. [ ] Add `pr` phase to `docs/.workflows/pipeline.yaml` with human gate
2. [ ] Create `pr` skill that creates feature branch, commits, opens PR
3. [ ] Make `--auto` NOT bypass human gates on `pr` phase (distinguish advisory vs blocking gates)
4. [ ] Add feature branch precondition to `code-implement-common` SKILL.md
5. [ ] Update `code-implement-common/references/git-worktree-workflow.md` to mandate feature branch
6. [ ] Test: run pipeline, verify it pauses at `pr` phase

#### Non-Functional
- [ ] `bun run check` passes after each phase
- [ ] No console.* calls in new code
- [ ] Exit codes: 0 success, 12 task not found, 13 state error

### Verification

```bash
# Phase 1 test
orchestrator run docs/tasks2/0342_...md --preset standard --auto
# Expected: subtasks 0336-0341 (or existing ones) executed sequentially

# Phase 2 test  
orchestrator run <task> --auto
# Expected: pauses at pr phase for human PR review

# Full gate
bun run check
```


### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References

### References

- Task 0335 dogfood analysis: parent task `docs/tasks2/0335_Add_events_subcommand_to_orchestrator_CLI.md`
- Over-decomposition evidence: subtasks `docs/tasks2/0336-0341_*.md` (all Backlog)
- Updated decomposition rules: `plugins/rd3/skills/task-decomposition/references/decomposition-decision-rules.md`
- Runner: `plugins/rd3/skills/orchestration-v2/scripts/engine/runner.ts` — `executePhaseWithRework()`
- Pipeline YAML: `docs/.workflows/pipeline.yaml`
- Code-implement-common git workflow: `plugins/rd3/skills/code-implement-common/references/git-worktree-workflow.md`
- ACP executor: `plugins/rd3/skills/orchestration-v2/scripts/executors/acp.ts`
- Model: `plugins/rd3/skills/orchestration-v2/scripts/model.ts` — `ExecutionRequest`

