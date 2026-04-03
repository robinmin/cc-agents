---
name: Re-align and re-design orchestration-v2 gate architecture
description: Re-align and re-design orchestration-v2 gate architecture
status: In Progress
created_at: 2026-04-02T19:18:12.822Z
updated_at: 2026-04-02T20:00:00.000Z
folder: docs/tasks2
type: task
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0318. Re-align and re-design orchestration-v2 gate architecture

### Background

The current orchestration-v2 gate model is inconsistent in practice: `command` is the deterministic gate we actually need, `human` is a real pause gate, and `auto` is still a placeholder that does not evaluate phase output or real evidence.

We need a clean gate architecture pass that clarifies semantics, YAML schema, evidence flow, runtime contracts, reporting, and failure modes before implementing a real non-deterministic gate.


### Requirements

- Define the gate model for orchestration-v2 with explicit semantics and ownership boundaries for `command`, `auto`, and `human`
- Decide what parts of gate behavior belong in pipeline YAML versus skill defaults versus verification-chain manifests
- Define how phase execution evidence is captured and exposed to gates, including stdout/stderr, structured output, changed files, task context, and referenced artifacts
- Define blocking versus advisory gate behavior and failure semantics for non-deterministic checks
- Define reporting and observability requirements for gate results, evidence, and reruns
- Update design documents and documentation references needed to make the new gate model unambiguous
- Produce an implementation-ready design that can drive follow-on work without changing 0316 scope


### Q&A

- **Why redesign before implementing real `auto`?** Because `auto` depends on unresolved decisions about evidence sources, YAML schema, skill defaults, reporting, and blocking semantics. Implementing first would hardcode assumptions into runtime behavior.
- **Should the redesign change `command`?** Only where needed to make the overall gate model coherent. 0318 should not reopen the deterministic behavior already delivered by 0316 unless a structural inconsistency is discovered.
- **Should `auto` and `human` share the same evidence model?** They should share the same gate-result/reporting surface, but not necessarily the same evaluation mechanism.
- **Where should verification criteria live?** 0318 must explicitly decide the precedence model across pipeline YAML, skill defaults, and generated verification manifests.
- **Is advisory gating allowed?** This task must decide whether non-deterministic gates can be advisory, blocking, or both, and how that policy is expressed.


### Design

#### Goal of the Task

0318 is a design-spec task. Its output is an implementation-ready gate architecture for orchestration-v2, not partial production code.

#### Current-State Findings to Design Against

- `command` is now the correct deterministic gate shape for CLI checks
- `human` is already a real pause gate
- `auto` is currently a placeholder that does not evaluate meaningful evidence
- phase execution produces useful runtime data (`stdout`, `stderr`, structured JSON, resource metrics), but orchestration-v2 does not yet expose a first-class evidence contract for downstream gate evaluation

#### Required Design Outputs

This task should produce a concrete design covering:

1. **Gate semantics matrix**
   - `command` = deterministic machine check
   - `auto` = non-deterministic or model-judged verification
   - `human` = explicit pause and decision point

2. **Gate configuration model**
   - final YAML schema for each gate type
   - which fields are shared versus gate-specific
   - how rework and escalation interact with each gate type

3. **Evidence contract**
   - what evidence a phase execution emits
   - what evidence is available to each gate type
   - how evidence is referenced, capped, persisted, and reported

4. **Source-of-truth precedence**
   - pipeline YAML
   - skill-level defaults
   - generated verification manifests
   - runtime overrides

5. **Policy model**
   - blocking vs advisory gates
   - strict vs best-effort evaluation
   - failure semantics and resumability

6. **Observability model**
   - gate result payload shape
   - state persistence expectations
   - inspect/report/status UX for gates

7. **Migration plan**
   - how example pipelines and docs move from placeholder `auto`
   - how to introduce the new model without breaking deterministic gate users

#### Design Constraints

- Reuse existing verification-chain primitives where possible
- Avoid introducing two overlapping non-deterministic gate systems
- Keep YAML authoring understandable; avoid pushing low-level chain manifests into every pipeline by default
- Keep production deterministic checks simple and cheap


### Solution

Produce a design package that can be implemented with minimal ambiguity.

Expected outputs:

1. a recommended gate architecture with rationale and rejected alternatives
2. a proposed YAML schema and examples for all gate types
3. a proposed runtime evidence model from phase execution to gate evaluation
4. a proposed state/reporting model for gate outcomes
5. a migration sequence that allows 0319 to implement real `auto` without redesign churn

The preferred baseline is likely:

- `command` for deterministic CLI checks
- `auto` implemented on top of verification-chain rather than bespoke logic
- `human` for pause-and-resume decisions

But 0318 must make that recommendation explicit and document the trade-offs.


### Plan

| Step | Scope | Output |
|------|-------|--------|
| 1 | Audit current gate paths | Document actual runtime behavior of `command`, `auto`, and `human` |
| 2 | Audit evidence flow | Identify what execution data exists today and what is missing for gate evaluation |
| 3 | Compare design options | Evaluate YAML-driven, skill-driven, and hybrid gate-definition models |
| 4 | Define target model | Write the proposed schema, evidence contract, and policy model |
| 5 | Define migration path | Sequence docs, examples, runtime changes, and compatibility expectations |
| 6 | Hand off to implementation | Leave 0319 with a concrete implementation contract and no open architectural ambiguity |


### Review

A good outcome for 0318 is not “more ideas.” It is a design that removes ambiguity.

Review criteria:

- no overlap in gate semantics
- clear ownership boundary between orchestration-v2 and verification-chain
- evidence model is concrete enough to test and persist
- YAML remains understandable for pipeline authors
- 0319 can be implemented without reopening core design questions


### Testing

This is primarily a design task, so testing here means design validation rather than runtime test execution.

Validation checklist:

- proposed YAML examples are internally consistent
- every gate type has explicit pass/fail/pause semantics
- evidence sources are enumerated and mapped to runtime producers
- failure/reporting semantics are defined for inspect/status/report commands
- migration impact on existing examples and docs is accounted for
- 0319 dependency boundaries are explicit


### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |
| Design | `plugins/rd3/skills/orchestration-v2/references/gate-architecture.md` | Lord Robb | 2026-04-02 |
| Docs | `plugins/rd3/skills/orchestration-v2/references/pipeline-yaml-guide.md` | Lord Robb | 2026-04-02 |
| Docs | `plugins/rd3/skills/orchestration-v2/SKILL.md` | Lord Robb | 2026-04-02 |

### References

- `plugins/rd3/skills/orchestration-v2/scripts/engine/runner.ts` — current gate evaluation flow
- `plugins/rd3/skills/orchestration-v2/scripts/executors/local.ts` — phase execution output currently available in memory
- `plugins/rd3/skills/orchestration-v2/scripts/model.ts` — gate and execution result types
- `plugins/rd3/skills/orchestration-v2/references/pipeline-yaml-guide.md` — current user-facing gate contract
- `plugins/rd3/skills/verification-chain/scripts/types.ts` — existing checker model and checklist types
- `plugins/rd3/skills/verification-chain/SKILL.md` — verification-chain capabilities and method contracts
- `docs/tasks2/0316_Add_command_gate_type_to_orchestration-v2_pipeline_engine.md` — deterministic gate delivery task
- `docs/tasks2/0319_Implement_real_auto_gate_using_verification-chain_LLM_checker.md` — follow-on implementation task

