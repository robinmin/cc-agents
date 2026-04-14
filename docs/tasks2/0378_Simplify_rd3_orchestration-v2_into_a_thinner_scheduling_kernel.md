---
name: Simplify rd3orchestration-v2 into a thinner scheduling kernel
description: Simplify rd3orchestration-v2 into a thinner scheduling kernel
status: Done
created_at: 2026-04-13T22:20:41.037Z
updated_at: 2026-04-14T12:00:00.000Z
folder: docs/tasks2
type: task
preset: complex
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0378. Simplify rd3orchestration-v2 into a thinner scheduling kernel

### Background

rd3:orchestration-v2 has accumulated too many responsibilities. It currently mixes FSM lifecycle management, DAG scheduling, executor routing, verification semantics, gate behavior, and channel concerns in one engine. That makes the workflow harder to reason about and easier to break. The target direction is a simpler orchestration core that coordinates work, persists run state, and delegates verification to verification-chain instead of owning detailed gate logic itself.


### Requirements

Refactor orchestration-v2 so its primary responsibilities are run lifecycle, DAG scheduling, state persistence, and dispatch to executors or external channels. Remove duplicated verification behavior from the orchestrator and replace it with a clean integration boundary to verification-chain. Reduce channel-centric design pressure so execution channel is a routing detail rather than the organizing principle of the engine. Preserve the capacity to add future strategies such as parallel execution sets, one-of or all-of execution, and result aggregators, but do not implement those advanced strategies in this task. The outcome should be a simpler, more reliable core with clearer subsystem boundaries and better testability.

#### Review-Backed Findings

- The current engine still owns too many responsibilities at once: FSM lifecycle, DAG scheduling, executor routing, gate semantics, human-gate behavior, auto-gate behavior, and state/event persistence. The refactor must reduce this ownership surface.
- The current CoV integration is not clean. orchestration-v2 both calls a verification driver and locally implements command, human, and auto-gate semantics. That duplication must be removed so verification semantics live in one place.
- The current resume path for CoV is architecturally broken because it assumes a CLI interface that verification-chain does not actually provide. The refactor must replace that with a real integration contract.
- The current type layer is too loose around verification methods. Using broad strings for chain check methods makes cross-skill drift easy, as shown by naming divergence like `content_match` versus `content-match`.
- The current public model and documentation still give execution channel too much conceptual weight. The refactor should move channel to the routing layer and keep the core engine focused on scheduling and state.
- Future orchestration strategies such as parallel sets, one-of/all-of, and aggregators are valid extension targets, but this task should focus on simplifying the kernel so those future additions can be made cleanly later.


### Q&A



### Design



### Solution

This task should simplify `rd3:orchestration-v2` by shrinking its ownership boundary rather than rewriting the entire engine.

#### Solution Outline

1. Re-center the engine boundary
   The orchestrator should primarily own:
   - run lifecycle
   - DAG scheduling
   - persistent run/phase/event state
   - executor dispatch and routing

   It should stop owning detailed verification semantics.

2. Delegate verification properly
   Replace local gate logic duplication with a cleaner adapter to `rd3:verification-chain`. The orchestrator should request verification, consume normalized results, and react to pass/fail/pause outcomes, but it should not reimplement checker behavior itself.

3. Reduce channel-centric design pressure
   Make execution channel a routing concern handled by the executor policy and adapter layer. Avoid letting channel shape the CLI, runner logic, or overall mental model more than necessary.

4. Tighten the type contracts
   Align orchestration-v2 verification-related model types with the canonical verification-chain contract so method names, status semantics, and evidence shapes cannot drift silently.

5. Simplify public behavior and tests
   Review the CLI, runner paths, and tests so they reflect the thinner-kernel model. Remove or rewrite tests that currently normalize incorrect integration assumptions.

6. Preserve extension points without expanding scope
   Keep the design open for later support of:
   - richer parallel execution strategies
   - one-of or all-of execution groups
   - execution aggregators

   But do not implement those features in this task. The goal here is to make the core simpler and more evolvable first.

#### Expected Outcome

After this task, orchestration-v2 should be easier to reason about, less fragile, and better positioned to support future orchestration strategies because its core responsibilities will be narrower and cleaner.


### Plan



### Review

Post-implementation review identified and fixed the following issues:

**HIGH**
- H1: SKILL.md still described the engine as a "micro-kernel with six pluggable subsystems" and gave execution channels prominent conceptual weight. Updated overview, architecture, and channel sections to reflect the thinner-kernel model with GateEvaluator delegation and channel as a routing detail.
- H2: `ChainCheck.method` was typed as `CheckMethod | string`, undermining the type-tightening goal. Removed `| string` escape hatch, expanded `CheckMethod` to include all verification-chain methods (`file-exists`, `compound`), removed legacy `content_match` switch cases from CoV driver.

**MEDIUM**
- M1/M3: Unused `GateEvaluatorDeps` interface in model.ts (duplicate of `GateEvaluatorDependencies` in gate-evaluator.ts). Removed dead code from model.ts.
- M2: Channel documentation weight in SKILL.md addressed as part of H1 fix.

**LOW**
- L1: `resumeChain` contract uses `stateDir` parameter (accepted as-is; the new DefaultCoVDriver properly delegates via CLI list+resume, which is the real integration fix).
- L2: Task frontmatter status updated to reflect completion.
- L3: Review section populated.

All 864 tests pass. Typecheck clean. Lint clean.

### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References

- `plugins/rd3/skills/orchestration-v2/scripts/verification/cov-driver.ts:13-27` — current CoV driver reimplements check sequencing locally.
- `plugins/rd3/skills/orchestration-v2/scripts/verification/cov-driver.ts:29-94` — current resume behavior shells into verification-chain as if it exposed a CLI.
- `plugins/rd3/skills/orchestration-v2/scripts/engine/runner.ts:1100-1170` — runner-owned auto-gate behavior built on top of the verification driver.
- `plugins/rd3/skills/orchestration-v2/scripts/engine/runner.ts:1182-1260` — runner-owned human-gate semantics.
- `plugins/rd3/skills/orchestration-v2/scripts/engine/runner.ts:1262-1343` — runner-owned command-gate execution.
- `plugins/rd3/skills/orchestration-v2/scripts/model.ts:455-475` — overly loose verification model types and the current `resumeChain(stateDir, action)` contract.
- `plugins/rd3/skills/orchestration-v2/tests/cov-driver.test.ts:100-160` — tests that currently normalize `content_match` naming and the weak resume behavior.
- `plugins/rd3/skills/orchestration-v2/SKILL.md:88-89` — public framing of the engine as a six-subsystem micro-kernel.
- `plugins/rd3/skills/orchestration-v2/SKILL.md:169-171` — execution channels presented as a core concept rather than a routing concern.

