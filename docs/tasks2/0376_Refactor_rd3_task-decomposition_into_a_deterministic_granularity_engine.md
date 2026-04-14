---
name: Refactor rd3task-decomposition into a deterministic granularity engine
description: Refactor rd3task-decomposition into a deterministic granularity engine
status: Done
created_at: 2026-04-13T22:20:20.749Z
updated_at: 2026-04-14T06:32:00.000Z
folder: docs/tasks2
type: task
impl_progress:
  planning: done
  design: done
  implementation: done
  review: done
  testing: done
---

## 0376. Refactor rd3task-decomposition into a deterministic granularity engine

### Background

rd3:task-decomposition currently behaves too heuristically. In practice it sometimes over-decomposes work into implementation-step fragments and sometimes skips decomposition when the task is clearly too large. The new direction is to make decomposition decisions auditable and more deterministic so the skill consistently decides keep-as-one-task vs should-decompose vs must-decompose based on work characteristics rather than vague intuition.


### Requirements

Replace the current loose guidance with a concrete decision rubric centered on estimated effort, number of deliverables, cross-layer scope, coordination/review boundaries, and risk class. Estimated lines may be retained only as a weak tie-breaker, not as the primary signal. Eliminate contradictions around investigation/design/implement/test subtasks, define explicit skip/should/must decomposition bands, require justification when decomposition is skipped, and add a representative golden corpus of real task examples with expected outcomes so the behavior can be regression-tested.

#### Review-Backed Findings

- The skill currently contains contradictory guidance for bug-fix decomposition. It recommends `Single task with investigation subtasks` in the decision framework while also forbidding decomposition into investigation/design/implementation/testing subtasks. This contradiction must be removed and replaced with one coherent policy.
- The minimum subtask floor is inconsistent across the skill package. The main skill says never create tasks smaller than 1 hour, while the extracted decision rules say never create a subtask smaller than 2 hours. The refactor must define one canonical floor and remove the conflicting duplicate rule.
- The current rules are still too narrative and do not force a deterministic outcome. The refactor must introduce an explicit decision model that yields one of three outcomes: keep as one task, should decompose, or must decompose.
- The anti-over-decomposition rules are conceptually good but need stronger operationalization. The refactor must make it easy for an agent to distinguish deliverables from implementation-plan steps and route implementation steps into the parent task's `Plan` section instead of creating child tasks.
- The refactor must not use estimated line count as the primary trigger. If retained, it should only be a weak secondary signal behind effort, deliverables, layers, and risk.


### Q&A



### Design



### Solution

This task should turn `rd3:task-decomposition` into a deterministic planning skill rather than a mostly narrative guideline set.

#### Decomposition Assessment

| Signal | Value | Score |
| ------ | ----- | ----- |
| Effort (E) | 12h | 2 |
| Deliverables (D) | 3 | 2 |
| Layers (L) | 1 | 0 |
| Coordination (C) | moderate | 1 |
| Risk (R) | medium | 1 |
| **Total** | | **6** |

**Decision:** `must decompose`
**Override:** `none`
**Auditable rationale:** This work produces three independently reviewable deliverables: the deterministic rubric model, the executable golden corpus, and the rewritten skill/reference package. The regression contract needs to exist before the large doc rewrite is considered complete, so the task requires deliverable-based decomposition rather than a single monolithic implementation note.

#### Subtasks

- [x] [0380 - Create rubric model and executable golden corpus](0380_0376_create_rubric_model_and_executable_golden_corpus.md)
- [x] [0381 - Rewrite SKILL.md and align reference docs](0381_0376_rewrite_SKILL_md_and_align_reference_docs.md)

**Dependency order:** 0380 → 0381
**Estimated total effort:** 10-12 hours

#### Solution Outline

1. 0380 establishes the executable contract
   Define the rubric model, the golden regression corpus, and the executable docs test so decomposition decisions are auditable and regression-testable, including the review-critical score and override boundaries.

2. 0381 rewrites the skill package against that contract
   Remove contradictory rules from `SKILL.md` and the supporting references so the package expresses one coherent decomposition policy. The main skill and extracted reference docs must agree on anti-patterns, minimum subtask size, override precedence, and status/skip behavior.

3. Clarify the output contract
   When decomposition is skipped, require a short written justification in the parent task's `Solution` section. When decomposition happens, require richer subtasks with clear deliverables, dependency order, and objective success criteria. Explicitly forbid implementation-step child tasks and route those details into the parent task's `Plan`.

#### Expected Outcome

After this task, an agent using `rd3:task-decomposition` should make materially more consistent sizing decisions, produce fewer artificial subtasks, and leave an auditable explanation for why decomposition was or was not performed.


### Plan



### Review

- Canonical task record aligned to the deterministic rubric by adding an auditable decomposition assessment and deliverable-based child tasks (`0380`, `0381`) with explicit dependency order.
- The executable docs contract now covers the missing boundary branches identified in review: raw `score = 5`, `force-must-effort`, and localized `force-skip`.

### Testing

- `bun test plugins/rd3/tests/task-decomposition-docs.test.ts`
- `bun run check`
- Result: all passing

### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References

- `plugins/rd3/skills/task-decomposition/SKILL.md:189-197` — decision framework, including the current bug-fix guidance that conflicts with later anti-phase rules.
- `plugins/rd3/skills/task-decomposition/SKILL.md:223-225` — prohibition against investigation/design/implementation/testing subtasks.
- `plugins/rd3/skills/task-decomposition/SKILL.md:228-231` — current size-floor rules in the main skill.
- `plugins/rd3/skills/task-decomposition/references/decomposition-decision-rules.md:67-90` — current decomposition triggers and the 2-hour absolute subtask floor.
- `plugins/rd3/skills/task-decomposition/references/decomposition-decision-rules.md:106-177` — anti-pattern guidance for phase-based decomposition and the recommendation to route implementation steps into the parent plan.
