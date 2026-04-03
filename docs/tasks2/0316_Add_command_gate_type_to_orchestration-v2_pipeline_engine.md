---
name: Add command gate type to orchestration-v2 pipeline engine
description: "Add a new `command` gate type to the orchestration-v2 that runs a single shell command as a deterministic gate check. Simplify the gate model to three clear types: command (deterministic CLI), auto (LLM-based verification), human (pause for approval). Update model, schema, parser, runner, examples, docs, and tests."
status: In Progress
created_at: 2026-04-02T07:25:09.600Z
updated_at: 2026-04-02T10:30:00.000Z
folder: docs/tasks2
type: task
profile: standard
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0316. Add command gate type to orchestration-v2 pipeline engine

### Background

The orchestration-v2 pipeline engine currently supports two legacy gate types: `auto` and `human`. The existing `auto` path is a placeholder that runs a trivial CoV manifest with `echo "auto-gate-check: ${phaseName} passed"`, so it does not perform meaningful verification in production.

The immediate delivery need is still real: the most common gate pattern in practice is deterministic CLI verification such as `bun test`, `bun run check`, `bun run typecheck`, and `biome lint`. That capability belongs in orchestration-v2 now, independent of the broader redesign required for non-deterministic verification.

This task is intentionally scoped to the deterministic side of the problem. The broader gate-model redesign and the real `auto` reimplementation are split into follow-on tasks so 0316 can deliver a solid `command` gate without mixing in unresolved architecture decisions.


### Requirements

1. Add a new gate type `command` that executes a single shell command as a deterministic gate check
2. Support template variables in the command string for dynamic substitution: `{{task_ref}}`, `{{phase}}`, `{{run_id}}`
3. Keep `human` gate type unchanged (pause for approval)
4. Clarify `auto` gate semantics as a placeholder for future non-deterministic verification, without expanding its scope in this task
5. Update pipeline YAML examples to use `command` gates where deterministic CLI checks are the real mechanism
6. Update documentation for the current three-type gate model, including `pipeline-yaml-guide.md`, `SKILL.md`, and `error-codes.md`
7. Ensure command-gate failures produce usable evidence for debugging, including executed command, exit code, and capped stdout/stderr where available
8. Ensure all existing tests continue to pass and add focused tests for command-gate behavior, validation, and template substitution


### Q&A

- **Why keep this task separate from gate redesign?** Because deterministic `command` gating is already well-understood, low-risk, and immediately useful. Tying it to unresolved `auto` architecture would slow delivery and blur acceptance criteria.
- **Why only one command per gate?** Simplicity and composability. If callers need multiple deterministic checks, they can compose them with shell operators such as `&&`.
- **Why not implement richer evidence capture here?** 0316 should capture enough command evidence to debug failures. The broader evidence contract across all gate types belongs to 0318.
- **What is explicitly out of scope for 0316?** YAML-defined `auto` checklists, skill-defined gate defaults, LLM evidence routing, and advisory-vs-blocking policy for non-deterministic gates.


### Design

#### Scope Boundary

This task defines the deterministic `command` gate only. The final shape of `auto` is not designed or implemented here beyond clear placeholder semantics in docs and examples.

#### Runtime Behavior

For a phase with `gate.type: command`:

1. Execute the phase skill normally through the executor pool
2. If the phase execution fails, fail before gate evaluation
3. If the phase execution succeeds, run the configured gate command with template substitution
4. Treat exit code `0` as pass and any non-zero exit code as fail
5. Feed gate failure through existing rework/escalation behavior

#### Template Variables

Available in `command` gate strings:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{task_ref}}` | Task reference from run options | `0316` |
| `{{phase}}` | Current phase name | `test` |
| `{{run_id}}` | Pipeline run id | `run_m3x8k_ab12cd` |

#### Evidence Contract for 0316

Command-gate results should capture enough information to diagnose deterministic failures:

- final substituted command string
- exit code
- stdout (capped)
- stderr (capped)
- duration

#### Documentation Expectations

Docs after 0316 must be internally consistent:

- `command` is documented as deterministic CLI verification
- `human` is documented as pause/approval
- `auto` is documented as placeholder/future non-deterministic verification
- no user-facing doc should still describe the old two-gate model or use `manual` terminology


### Solution

Implement the deterministic gate path completely and tighten all surrounding surfaces so the feature is usable, documented, and test-backed.

Work includes:

1. model and schema support for `command`
2. runner support for template substitution and `sh -c` execution
3. gate evidence capture for command pass/fail cases
4. example pipelines updated to use real command gates where appropriate
5. doc updates to remove stale two-gate descriptions
6. targeted tests for validation, runtime pass/fail, template substitution, and rework interaction

Completion of 0316 should leave the repo in a state where `command` can be used in production pipelines even if `auto` remains a placeholder.


### Plan

| Step | Scope | Notes |
|------|-------|-------|
| 1 | Model + schema | Extend `GateConfig`, validation rules, and JSON schema for `command` |
| 2 | Runner | Execute substituted command, capture evidence, preserve rework semantics |
| 3 | Examples | Replace fake auto gates with real command gates where checks are deterministic |
| 4 | Docs | Update YAML guide, skill overview, and error recovery docs to the three-type model |
| 5 | Tests | Add and run focused tests, then run full `bun run check` |
| 6 | Verification | Re-run review against 0316 scope only, not against unresolved `auto` redesign work |


### Review

- Gate type semantics are now clear and non-overlapping for the `command` path
- Template variables are minimal but extensible
- No breaking changes to existing `human` gate behavior
- `auto` remains a placeholder in the current implementation and is intentionally split into follow-on redesign and implementation tasks to avoid conflating deterministic `command` delivery with non-deterministic gate architecture work
- 0316 should focus on making `command` production-solid across schema, runner, docs, examples, observability, and failure reporting


### Testing

| Test Area | Expected Coverage |
|-----------|-------------------|
| Schema validation | `command` requires non-empty `command`; other gate types reject `command` field |
| Template substitution | `{{task_ref}}`, `{{phase}}`, `{{run_id}}` substitute correctly |
| Runtime success | exit `0` returns gate pass and pipeline completion |
| Runtime failure | non-zero exit returns gate fail and pipeline failure/rework path |
| Evidence | command, exit code, stdout/stderr, and timing are present where applicable |
| Docs/examples | example YAML remains valid under parser/validator |
| Regression | `bun run check` passes |


### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |
| Model | `plugins/rd3/skills/orchestration-v2/scripts/model.ts` | Lord Robb | 2026-04-02 |
| Schema | `plugins/rd3/skills/orchestration-v2/scripts/config/schema.ts` | Lord Robb | 2026-04-02 |
| Runner | `plugins/rd3/skills/orchestration-v2/scripts/engine/runner.ts` | Lord Robb | 2026-04-02 |

### References

- `plugins/rd3/skills/orchestration-v2/scripts/model.ts` — gate model
- `plugins/rd3/skills/orchestration-v2/scripts/config/schema.ts` — validation and JSON schema
- `plugins/rd3/skills/orchestration-v2/scripts/engine/runner.ts` — phase execution and gate evaluation
- `plugins/rd3/skills/orchestration-v2/references/pipeline-yaml-guide.md` — user-facing gate docs
- `plugins/rd3/skills/orchestration-v2/SKILL.md` — skill overview and quick-start examples
- `plugins/rd3/skills/orchestration-v2/references/error-codes.md` — gate failure reporting and recovery guidance
- `docs/tasks2/0318_Re-align_and_re-design_orchestration-v2_gate_architecture.md` — follow-on redesign task
- `docs/tasks2/0319_Implement_real_auto_gate_using_verification-chain_LLM_checker.md` — follow-on `auto` implementation task

