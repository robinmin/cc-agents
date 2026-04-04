---
name: migrate from rd3:orchestration-dev to rd3:orchestration-v2
description: migrate from rd3:orchestration-dev to rd3:orchestration-v2
status: Completed
created_at: 2026-04-04T23:25:17.800Z
updated_at: 2026-04-04T23:25:17.800Z
folder: docs/tasks2
type: task
### Implementation Summary

| Phase | Status | Files Changed |
|-------|--------|---------------|
| Phase A | ✅ Done | 5 files in orchestration-v2 |
| Phase B | ✅ Done | default.yaml already aligned |
| Phase C | ✅ Done | 5 agent skills |
| Phase D | ✅ Done | 4 subagents |
| Phase E | ✅ Done | 11+ commands |
| Phase F | ✅ Done | orchestration-dev → orchestration-v1 |
| Phase G | ✅ Done | All tests pass |

### Files Changed

- **orchestration-v2/SKILL.md**: Removed v1 reference
- **orchestration-v2/scripts/run.ts**: Updated migration path
- **orchestration-v2/scripts/state/migrate-v1.ts**: Updated comments
- **orchestration-v2/references/cli-reference.md**: Updated migration path
- **orchestration-v2/references/examples/default.yaml**: Updated comments
- **orchestration-v1/**: Renamed from orchestration-dev (deprecated)
- **All agent skills**: 5 files updated
- **All subagents**: 4 files updated
- **All commands**: 11 files updated
- **tests/phase-worker-docs.test.ts**: Updated imports and assertions

impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0328. migrate from rd3:orchestration-dev to rd3:orchestration-v2

### Background

As we already almost get rd3:orchestration-v2 in `plugins/rd3/skills/orchestration-v2` ready, we need to have a final round customize and fine tune to migrte our develop workflow from rd3:orchestration-dev based workflow to rd3:orchestration-v2 based workflow.

For a smooth transition, we need to the following things to down based on a comprehensive code review on plugins/rd3/skills/orchestration-v2:
- Customize the default workflow in `plugins/rd3/skills/orchestration-v2/references/examples/default.yaml` to aligin with the 9-phases workfolow which defined in `plugins/rd3/skills/orchestration-dev`

Meanwhile, we also need to enhance the relevant agen skills, subagents, slash commands to adaot with this change. Here comes the list I extracted with command `rg "orchestration-dev" plugins/rd3`:
 
```text
## agent skills
- plugins/rd3/skills/run-acp/SKILL.md
- plugins/rd3/skills/functional-review/SKILL.md
- plugins/rd3/skills/bdd-workflow/SKILL.md
- plugins/rd3/skills/code-docs/SKILL.md

## subagents
- plugins/rd3/agents/jon-snow.md
- plugins/rd3/agents/super-coder.md
- plugins/rd3/agents/super-reviewer.md
- plugins/rd3/agents/super-tester.md

## commands
- plugins/rd3/commands/dev-plan.md
- plugins/rd3/commands/dev-review.md
- plugins/rd3/commands/dev-fixall.md
- plugins/rd3/commands/dev-gitmsg.md
- plugins/rd3/commands/dev-docs.md
- plugins/rd3/commands/dev-refine.md
- plugins/rd3/commands/dev-run.md
- plugins/rd3/commands/dev-unit.md
- plugins/rd3/commands/dev-verify.md
- plugins/rd3/commands/dev-init.md
- plugins/rd3/commands/dev-changelog.md
```
But before that, we need to have a cleanup on `plugins/rd3/skills/orchestration-v2` to get rid of the dependencies on `plugins/rd3/skills/orchestration-dev`, here also comes fro the same command as above:

```text
plugins/rd3/skills/orchestration-v2/SKILL.md
plugins/rd3/skills/orchestration-v2/scripts/run.ts
plugins/rd3/skills/orchestration-v2/scripts/state/migrate-v1.ts
plugins/rd3/skills/orchestration-v2/references/cli-reference.md
plugins/rd3/skills/orchestration-v2/references/examples/default.yaml
```
By the end of the day, we will remove or disable `plugins/rd3/skills/orchestration-dev`, so we can not build anything rely on it.


### Requirements

### Phase A: Remove orchestration-v2 → orchestration-dev Dependencies

1. **SKILL.md**: Remove `rd3:orchestration-dev` from `see_also` section
2. **scripts/run.ts**: Update migration path from `docs/.workflow-runs/rd3-orchestration-dev` to `docs/.workflow-runs/rd3-orchestration-v1`
3. **scripts/state/migrate-v1.ts**: Rename migration constants/variables to `v1` terminology; update default path to `docs/.workflow-runs/rd3-orchestration-v1`
4. **references/cli-reference.md**: Update `--from-v1` default path in migrate command docs
5. **references/examples/default.yaml**: Remove comments referencing `v1 orchestration-dev`; update internal comments to v2 terminology

### Phase B: Update Default Pipeline YAML

1. Verify `references/examples/default.yaml` faithfully maps the 9-phase workflow:
   - Phase 1: `intake` → `rd3:request-intake`
   - Phase 2: `arch` → `rd3:backend-architect` / `rd3:frontend-architect`
   - Phase 3: `design` → `rd3:backend-design` / `rd3:frontend-design` / `rd3:ui-ux-design`
   - Phase 4: `decompose` → `rd3:task-decomposition`
   - Phase 5: `implement` → `rd3:code-implement-common`
   - Phase 6: `test` → `rd3:sys-testing`
   - Phase 7: `review` → `rd3:code-review-common`
   - Phase 8a: `verify-bdd` → `rd3:bdd-workflow`
   - Phase 8b: `verify-func` → `rd3:functional-review`
   - Phase 9: `docs` → `rd3:code-docs`
2. Align preset profiles with v1 phase-matrix:
   - `simple`: [implement, test] ✓
   - `standard`: [intake, decompose, implement, test, review, verify-bdd, docs] ✓
   - `complex`: all 10 phases ✓
   - `research`: all 10 phases, lower coverage ✓
3. Add phase profiles: `refine`, `plan`, `unit`, `review-only`, `docs-only`

### Phase C: Update Agent Skills

Replace all `rd3:orchestration-dev` references with `rd3:orchestration-v2`:

| File | Change |
|------|--------|
| `skills/run-acp/SKILL.md` | see_also: `rd3:orchestration-dev` → `rd3:orchestration-v2` |
| `skills/functional-review/SKILL.md` | see_also: `rd3:orchestration-dev` → `rd3:orchestration-v2` |
| `skills/bdd-workflow/SKILL.md` | see_also: `rd3:orchestration-dev` → `rd3:orchestration-v2` |
| `skills/code-docs/SKILL.md` | see_also: `rd3:orchestration-dev` → `rd3:orchestration-v2` |

### Phase D: Update Subagents

Replace all `rd3:orchestration-dev` references with `rd3:orchestration-v2`:

| File | Change |
|------|--------|
| `agents/jon-snow.md` | skills: `rd3:orchestration-dev` → `rd3:orchestration-v2`; all doc refs |
| `agents/super-coder.md` | any `rd3:orchestration-dev` refs |
| `agents/super-reviewer.md` | any `rd3:orchestration-dev` refs |
| `agents/super-tester.md` | any `rd3:orchestration-dev` refs |

### Phase E: Update Slash Commands

Replace all `rd3:orchestration-dev` references with `rd3:orchestration-v2`:

| File | Change |
|------|--------|
| `commands/dev-plan.md` | Skill invocation: `rd3:orchestration-dev` → `rd3:orchestration-v2` |
| `commands/dev-review.md` | Skill invocation: `rd3:orchestration-dev` → `rd3:orchestration-v2` |
| `commands/dev-fixall.md` | Skill invocation: `rd3:orchestration-dev` → `rd3:orchestration-v2` |
| `commands/dev-gitmsg.md` | Skill invocation: `rd3:orchestration-dev` → `rd3:orchestration-v2` |
| `commands/dev-docs.md` | Skill invocation: `rd3:orchestration-dev` → `rd3:orchestration-v2` |
| `commands/dev-refine.md` | Skill invocation: `rd3:orchestration-dev` → `rd3:orchestration-v2` |
| `commands/dev-run.md` | Skill invocation: `rd3:orchestration-dev` → `rd3:orchestration-v2` |
| `commands/dev-unit.md` | Skill invocation: `rd3:orchestration-dev` → `rd3:orchestration-v2` |
| `commands/dev-verify.md` | Skill invocation: `rd3:orchestration-dev` → `rd3:orchestration-v2` |
| `commands/dev-init.md` | Skill invocation: `rd3:orchestration-dev` → `rd3:orchestration-v2` |
| `commands/dev-changelog.md` | Skill invocation: `rd3:orchestration-dev` → `rd3:orchestration-v2` |

### Phase F: Disable or Remove orchestration-dev

- Option 1: Rename `plugins/rd3/skills/orchestration-dev/` → `plugins/rd3/skills/orchestration-dev.deprecated/`
- Option 2: Add `_DEPRECATED.md` suffix to SKILL.md
- Option 3: Remove entirely (requires confirming no other references)

**Verification:** Run `rg "rd3:orchestration-dev" plugins/rd3` — should return zero matches after migration.

### Phase G: Validation

1. Run `orchestrator validate` — should pass
2. Run `orchestrator list` — should show `default`, `simple`, `standard`, `complex`, `research`
3. Verify all 9 phase skills are callable
4. Test dry-run: `orchestrator run 0266 --dry-run` (replace 0266 with valid task)


### Q&A

**Q: Should we keep the migration utility for v1 state?**
A: Yes — preserve `migrate-v1.ts` but rename internal references from `rd3-orchestration-dev` to `rd3-orchestration-v1` to avoid confusion.

**Q: What about the `see_also` section in v1 SKILL.md?**
A: The v1 skill will become deprecated. Update its `see_also` to point to v2 as "replacement".

**Q: How do we handle the 9-phase DAG structure?**
A: The default.yaml already has the correct DAG. Verify alignment with `plugins/rd3/skills/orchestration-dev/references/phase-matrix.md`.

**Q: What about state file migration?**
A: After migration, v1 state files at `docs/.workflow-runs/rd3-orchestration-dev/` should be migrated using `orchestrator migrate --from-v1`, then the directory can be archived.

**Q: Do we need to update any tests?**
A: Yes — any tests referencing `rd3:orchestration-dev` path/imports should be updated to `rd3:orchestration-v2`.

### Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|--------------|
| 1 | All `see_also` refs to `rd3:orchestration-dev` replaced | `rg "rd3:orchestration-dev" plugins/rd3 --type md` returns 0 matches |
| 2 | All skill invocations updated | `rg "rd3:orchestration-dev" plugins/rd3` returns 0 matches |
| 3 | All CLI docs updated | `rg "rd3-orchestration-dev" plugins/rd3` returns 0 matches |
| 4 | Default pipeline DAG matches 9-phase workflow | Review `references/examples/default.yaml` phases 1-9 mapped |
| 5 | Preset profiles aligned with v1 | `simple`, `standard`, `complex`, `research` present with correct phases |
| 6 | Phase profiles present | `refine`, `plan`, `unit`, `review-only`, `docs-only` defined |
| 7 | Migration path renamed to `rd3-orchestration-v1` | `rg "rd3-orchestration-dev" plugins/rd3/skills/orchestration-v2` returns 0 matches |
| 8 | `orchestrator validate` passes | Exit code 0 |
| 9 | `orchestrator list` shows all presets | Output includes default, simple, standard, complex, research |
| 10 | v1 state directory can be migrated | `orchestrator migrate --from-v1` runs (may find 0 files if not yet migrated) |

### Design



### Solution



### Plan



### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


