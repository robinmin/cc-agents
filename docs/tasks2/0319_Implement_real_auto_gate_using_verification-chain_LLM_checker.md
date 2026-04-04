---
name: Implement real auto gate using verification-chain LLM checker
description: Implement real auto gate using verification-chain LLM checker
status: Done
created_at: 2026-04-02T19:18:12.835Z
updated_at: 2026-04-02T19:18:12.835Z
folder: docs/tasks2
type: task
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0319. Implement real auto gate using verification-chain LLM checker

### Background

After the gate architecture is re-aligned, `auto` should stop being a hardcoded echo-based placeholder and instead use the existing verification-chain `llm` checker with an explicit checklist, prompt contract, and evidence set.

This work should reuse existing verification-chain primitives rather than introducing a separate bespoke auto-gate subsystem.


### Requirements

- Replace the current placeholder `auto` gate logic in orchestration-v2 with a real integration to verification-chain using the existing `llm` checker
- Support checklist-driven evaluation for `auto` gates, with checklist sources defined by YAML, skill defaults, or a merged model decided by the redesign task
- Pass meaningful evidence into the `auto` gate evaluation, based on the redesigned gate evidence contract
- Preserve strict pass/fail semantics: any failed checklist item causes gate failure unless explicitly configured otherwise
- Ensure the implementation uses existing verification-chain abstractions instead of duplicating LLM checking logic in orchestration-v2
- Add tests for pass/fail behavior, missing evidence/config, and reporting of failed checklist items
- Update orchestration-v2 docs and examples to reflect the real `auto` behavior after implementation


### Q&A

- **Why build `auto` on verification-chain instead of directly in orchestration-v2?** Because verification-chain already provides a checklist-based `llm` checker with strict PASS/FAIL parsing, and duplicating that logic in orchestration-v2 would create two overlapping systems.
- **Can 0319 start before 0318 is complete?** Only for exploratory spikes. The production implementation should follow the redesigned evidence and schema contract from 0318.
- **Should `auto` evaluate raw text only?** No. It should consume the evidence contract defined by 0318, which may include structured output, file references, task metadata, and capped logs.
- **Should failed `auto` checks always block?** That depends on the policy model defined in 0318. 0319 should implement the decided behavior, not invent a new one.
- **What must not happen in 0319?** No bespoke LLM checker logic inside orchestration-v2, no hardcoded checklist semantics that bypass the redesign, and no hidden dependency on a single prompt path without configuration.


### Design

#### Dependency on 0318

0319 is an implementation task that depends on the gate-model decisions from 0318. It should not finalize schema or evidence semantics on its own.

#### Current Reusable Primitive

The existing verification-chain `llm` checker already supports:

- a checklist of criteria
- an optional prompt template
- strict parsing of `[PASS]` / `[FAIL]` results
- overall pass only when all checklist items pass
- failure evidence listing the failed checklist items

That makes it the correct foundation for `auto`.

#### Implementation Shape

The likely implementation path is:

1. orchestration-v2 executes the phase skill as usual
2. orchestration-v2 builds a verification-chain manifest for the `auto` gate
3. the manifest uses the `llm` checker, not a custom auto-gate judge
4. the gate feeds the evidence bundle defined by 0318 into the verification step
5. gate results are normalized back into orchestration-v2 gate/state/reporting structures

#### Required Implementation Concerns

- checklist source resolution
- prompt-template resolution
- evidence packaging and size limits
- error handling when `LLM_CLI_COMMAND` is missing or invalid
- deterministic reporting of failed checklist items
- rework and escalation compatibility
- docs and example updates after behavior becomes real rather than placeholder


### Solution

Replace the placeholder `auto` path with a real integration layer to verification-chain.

Implementation should:

1. construct a proper verification-chain request for `auto`
2. map orchestration-v2 gate config into verification-chain `llm` checker config
3. supply the evidence bundle produced by phase execution and gate context
4. normalize verification-chain output into orchestration-v2 gate results and failure handling
5. add tests that prove the integration behaves correctly for pass, fail, and misconfiguration cases

The target outcome is that `auto` becomes a legitimate non-deterministic verification gate while orchestration-v2 remains an orchestrator, not a second verification engine.


### Plan

| Step | Scope | Notes |
|------|-------|-------|
| 1 | Confirm 0318 contract | Read the approved schema, evidence model, and policy decisions |
| 2 | Adapt runtime config | Add any gate config fields needed for checklist/prompt/evidence wiring |
| 3 | Build manifest bridge | Translate `auto` gate config into verification-chain `llm` checker input |
| 4 | Wire evidence flow | Pass phase outputs and referenced artifacts into the verification request |
| 5 | Normalize results | Convert checklist pass/fail output into orchestration-v2 gate result/state semantics |
| 6 | Test + docs | Add coverage for pass/fail/misconfig paths and update examples/docs |


### Review

Review criteria for 0319:

- `auto` no longer uses a hardcoded echo-based placeholder
- verification-chain is reused rather than duplicated
- failed checklist items are visible in gate evidence and debugging output
- misconfiguration surfaces clearly, especially missing `LLM_CLI_COMMAND` or missing checklist/evidence
- implementation follows the 0318 contract instead of redefining it locally


### Testing

| Test Area | Expected Coverage |
|-----------|-------------------|
| Happy path | all checklist items pass and gate returns pass |
| Failure path | one or more checklist items fail and gate returns fail |
| Parse robustness | malformed LLM output fails closed |
| Environment errors | missing `LLM_CLI_COMMAND` fails clearly |
| Evidence wiring | expected evidence is included or referenced in the verification request |
| Config errors | missing checklist or invalid auto config fails clearly |
| Rework integration | failed `auto` gates interact correctly with rework/escalation rules |
| Regression | full orchestration-v2 and verification-chain test suites still pass |


### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References

- `plugins/rd3/skills/orchestration-v2/scripts/engine/runner.ts` — current placeholder `auto` implementation
- `plugins/rd3/skills/orchestration-v2/scripts/model.ts` — gate result and execution result types
- `plugins/rd3/skills/orchestration-v2/scripts/executors/local.ts` — available execution outputs to feed into evidence
- `plugins/rd3/skills/verification-chain/scripts/methods/llm.ts` — checklist-based LLM checker implementation
- `plugins/rd3/skills/verification-chain/scripts/types.ts` — `LlmCheckerConfig` and checker contracts
- `plugins/rd3/skills/verification-chain/scripts/interpreter.ts` — checker dispatch and chain execution model
- `docs/tasks2/0318_Re-align_and_re-design_orchestration-v2_gate_architecture.md` — required design dependency
- `plugins/rd3/skills/orchestration-v2/references/pipeline-yaml-guide.md` — docs that must be updated after implementation

