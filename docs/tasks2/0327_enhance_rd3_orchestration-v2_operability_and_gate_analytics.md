---
name: Enhance rd3 orchestration-v2 operability and gate analytics
description: Strengthen orchestration-v2 with cleaner gate history richer inspection/reporting stronger skill metadata contracts and improved analytics
status: Done
created_at: 2026-04-04T00:00:00.000Z
updated_at: 2026-04-06T00:21:38.241Z
folder: docs/tasks2
type: task
impl_progress:
  planning: done
  design: done
  implementation: done
  review: done
  testing: done
---

## 0327. Enhance rd3:orchestration-v2 operability and gate analytics

### Background

The recent gate-model fixes made `rd3:orchestration-v2` substantially more correct:

- `auto` gates now use the real verification-chain LLM checker
- advisory gate results and phase evidence are persisted
- human-gate prompt evidence is visible in inspect/report flows
- repeated gate attempts are preserved instead of overwritten

That closes the immediate correctness gaps from `0316`, `0318`, and `0319`, but the current implementation still has several structural and operability limitations:

- gate history retention uses step-name suffixes instead of an explicit attempt model
- CLI surfaces for gate/evidence analysis remain fairly raw
- persisted change evidence is useful but still shallow
- skill-level gate defaults are consumed without a fully formal contract
- gate-level analytics are missing from reports and trends
- path resolution logic for plugin/skill references is still easy to duplicate incorrectly in future changes

This task captures the next layer of productization work so those improvements can be implemented later in a coherent batch rather than ad hoc.


### Requirements

- Introduce a first-class gate attempt model so repeated gate runs are represented structurally rather than by synthetic step-name suffixes
- Add explicit gate-focused CLI/reporting surfaces for inspection and debugging, including latest result, prior attempts, advisory vs blocking status, and checklist summaries
- Persist richer structured change evidence per phase, including added/modified/deleted/renamed file categories and compact diff statistics
- Define and validate a formal schema/contract for skill-provided auto-gate defaults in `SKILL.md` metadata
- Add gate-level trend and analytics reporting, such as:
  - most failure-prone phases
  - advisory failure frequency
  - average rework count before pass
  - most frequently failed checklist items
- Evaluate and, if appropriate, implement policy controls for advisory failures beyond simple non-blocking behavior
- Extract shared plugin/skill path resolution into a reusable utility so parser, runner, and CLI code do not re-implement divergent path logic
- Keep orchestration-v2 aligned with event-sourced design principles; if gate/evidence replay remains partial, document or improve the target architecture
- Preserve backward compatibility for existing persisted runs where practical, or provide a clear migration path if schema changes are required
- Add tests and docs for every new operator-facing capability


### Q&A

- **Why create a follow-up task instead of folding this into 0319?** Because 0319 was primarily about making `auto` real and fixing gate correctness. These items are product hardening, analytics, and architecture cleanup.
- **Is gate attempt history already solved?** Partially. It is preserved today, but the storage model uses suffixed names like `auto-gate#2` instead of an explicit attempt dimension.
- **Why prioritize CLI/reporting work?** Because a pipeline system becomes expensive to operate when operators cannot quickly understand why a gate failed, retried, or produced advisory warnings.
- **Why formalize skill metadata now?** Because orchestration-v2 is already loading auto-gate defaults from skill frontmatter. Without a strict contract, silent drift and invalid metadata will accumulate.
- **Should all enhancements be implemented in one PR?** No. This task is a backlog umbrella and should likely be decomposed into smaller implementation tasks before execution.


### Design

#### Enhancement Themes

1. **Data model cleanup**
   - Replace string-based gate attempt encoding with explicit gate attempt/version fields
   - Revisit whether gate/evidence state should remain partly table-based or become fully replayable from events plus materialized views

2. **Operator observability**
   - Improve `inspect`, `report`, and possibly `history` so gate troubleshooting is fast and low-friction
   - Surface checklist failures, advisory warnings, attempt counts, and phase evidence summaries without forcing operators to inspect raw JSON

3. **Evidence quality**
   - Expand phase evidence from simple changed-file lists into a compact but more informative diff summary
   - Keep evidence size bounded and suitable for both persistence and LLM-based auto-gate prompts

4. **Configuration contracts**
   - Define a canonical metadata contract for `metadata.gate_defaults.auto.*`
   - Validate that contract consistently during skill discovery / pipeline validation

5. **Analytics**
   - Extend state queries and reporting to answer operational questions about gate behavior over time

#### Suggested Decomposition

This umbrella should likely be split into follow-up implementation tasks such as:

- gate attempt schema + migration
- gate inspect/report UX
- structured diff evidence persistence
- skill metadata schema enforcement
- gate analytics and trends
- shared path-resolution utility
- advisory policy extensions


### Solution

Treat this task as the enhancement backlog for the next maturity step of `rd3:orchestration-v2`.

The expected implementation direction is:

1. normalize gate persistence and replay semantics
2. improve operator-facing observability and CLI UX
3. harden configuration contracts and shared resolution utilities
4. add analytics and optional policy controls once the storage/reporting model is stable

The result should be an orchestration engine that is not just correct in the happy path, but also easier to operate, analyze, and extend safely.


### Plan

| Step | Scope | Notes | Rough Estimate |
|------|-------|-------|----------------|
| 1 | Gate result versioning | Add explicit `attempt` model and migration instead of step-name suffixing | 0.5-1 day |
| 2 | Gate/evidence CLI views | Add focused `inspect/report` surfaces for gate analysis | 1-1.5 days |
| 3 | Structured diff evidence | Persist richer file-change categories and compact diff stats | 1-2 days |
| 4 | Skill metadata contract | Formalize and validate `metadata.gate_defaults.auto.*` | 0.5-1 day |
| 5 | Gate analytics | Add trend/report queries for failure-prone phases and checklist items | 1.5-2.5 days |
| 6 | Advisory policy controls | Optional threshold/escalation policy model for advisory failures | 1-2 days |
| 7 | Shared path resolution | Centralize plugin/skill path lookup to avoid drift | 0.5 day |
| 8 | Event-sourced gate replay | Revisit full replay architecture for gate/evidence state | 2-4 days |

#### Recommended Priority

- **Do first:** Steps 1, 2, 4, 7
- **Do next:** Steps 3, 5
- **Do only if product scope justifies it:** Steps 6, 8


### Review

Review criteria for this backlog and its future sub-tasks:

- gate attempt history is explicit, queryable, and no longer encoded in strings
- operators can inspect gate failures and advisories without digging through raw state blobs
- phase evidence is richer but still bounded and usable by auto-gate prompts
- skill metadata defaults are validated and fail clearly when malformed
- trend reporting meaningfully helps tune pipeline quality over time
- shared path-resolution logic is not duplicated across parser/runner/CLI paths
- schema changes include migration and compatibility handling


### Testing

| Test Area | Expected Coverage |
|-----------|-------------------|
| Migration | existing gate results migrate safely to the new attempt model |
| CLI inspect/report | gate summaries and evidence views render correctly in text and JSON modes |
| Evidence persistence | file-change categories and diff summaries are stored and loaded correctly |
| Metadata validation | malformed skill gate defaults fail clearly and valid metadata passes |
| Analytics | trend queries aggregate advisory/blocking failures and checklist failures correctly |
| Path resolution | plugin/skill resolution works from monorepo root and plugin-package contexts |
| Compatibility | existing runs and reports remain readable after enhancement rollout |
| Regression | full `bun test plugins/rd3/skills/orchestration-v2` suite still passes |


### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |
| Fix | `plugins/rd3/skills/orchestration-v2/scripts/utils/skill-resolver.ts` | Lord Robb | 2026-04-07 |
| Fix | `plugins/rd3/skills/orchestration-v2/scripts/config/parser.ts` | Lord Robb | 2026-04-07 |
| Fix | `plugins/rd3/skills/orchestration-v2/scripts/state/queries.ts` | Lord Robb | 2026-04-07 |
| Fix | `plugins/rd3/skills/orchestration-v2/scripts/config/schema.ts` | Lord Robb | 2026-04-07 |
| Test | `plugins/rd3/skills/orchestration-v2/scripts/utils/skill-resolver.test.ts` | Lord Robb | 2026-04-07 |
| Test | `plugins/rd3/skills/orchestration-v2/tests/gate-analytics.test.ts` | Lord Robb | 2026-04-07 |
| Test | `plugins/rd3/skills/orchestration-v2/tests/config-parser.test.ts` | Lord Robb | 2026-04-07 |


### References

- `plugins/rd3/skills/orchestration-v2/scripts/engine/runner.ts` — current gate execution and evidence flow
- `plugins/rd3/skills/orchestration-v2/scripts/state/manager.ts` — gate result and phase evidence persistence
- `plugins/rd3/skills/orchestration-v2/scripts/state/migrations.ts` — current schema version and migration model
- `plugins/rd3/skills/orchestration-v2/scripts/state/queries.ts` — reporting/trend query layer
- `plugins/rd3/skills/orchestration-v2/scripts/run.ts` — CLI inspect/status/report surfaces
- `plugins/rd3/skills/orchestration-v2/scripts/config/parser.ts` — skill/path validation and plugin resolution
- `plugins/rd3/skills/orchestration-v2/scripts/config/schema.ts` — pipeline gate schema validation
- `plugins/rd3/skills/orchestration-v2/references/gate-architecture.md` — gate evidence and policy design baseline
- `plugins/rd3/skills/orchestration-v2/references/pipeline-yaml-guide.md` — user-facing YAML semantics
- `docs/tasks2/0316_Add_command_gate_type_to_orchestration-v2_pipeline_engine.md` — earlier gate schema work
- `docs/tasks2/0318_Re-align_and_re-design_orchestration-v2_gate_architecture.md` — gate redesign contract
- `docs/tasks2/0319_Implement_real_auto_gate_using_verification-chain_LLM_checker.md` — real auto-gate implementation
