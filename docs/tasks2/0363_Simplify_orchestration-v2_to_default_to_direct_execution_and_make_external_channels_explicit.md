---
name: Simplify_orchestration-v2_to_default_to_direct_execution_and_make_external_channels_explicit
description: Simplify_orchestration-v2_to_default_to_direct_execution_and_make_external_channels_explicit
status: Completed
created_at: 2026-04-09T01:11:37.727Z
updated_at: 2026-04-09T03:15:00.000Z
folder: docs/tasks2
type: task
preset: "standard"
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0363. Simplify_orchestration-v2_to_default_to_direct_execution_and_make_external_channels_explicit

### Background

`plugins/rd3/skills/orchestration-v2` currently behaves more like an ACP-first execution framework than a transport-agnostic orchestrator. The present implementation still routes ordinary phase work through ACP/acpx by default, even when users specify `--channel auto` or expect a local/direct execution path.

This creates several operational problems:

- the orchestrator core is still biased toward ACP semantics rather than owning only workflow semantics
- `auto`/`local` behavior is misleading because it does not truly execute locally
- routing policy currently expands ACP assumptions across all configured channels
- ACP/acpx failures become orchestration failures even for workflows that should not require ACP at all
- the workflow is harder to understand, debug, and stabilize because default behavior is implicit and transport-specific

The target direction is to simplify `orchestration-v2` so it works as an orchestrator first:

- direct/local child-process execution must be the default execution mode
- external coding agents must be optional, explicitly registered execution channels
- only phases with explicit executor/channel configuration in `docs/.workflows/pipeline.yaml` should route to an external agent backend
- process-origin detection may be used as a weak hint if ever needed, but must not be the primary routing mechanism because it is brittle and not semantically reliable

This task captures the new requirements, implementation constraints, and migration plan needed to simplify the orchestrator before making code changes.


### Requirements

#### Core Behavior

1. `orchestration-v2` must default to **direct/local execution** for ordinary phase work
2. The default direct path must use `Bun.spawn`/`Bun.spawnSync` style local child-process execution rather than ACP/acpx
3. External coding-agent execution must be treated as an **optional integration**, not the default orchestration path

#### Execution Channel Model

4. The orchestrator must define a clean interface for registering external execution channels without coupling core workflow logic to ACP
5. Only phases with **explicit executor/channel configuration** in `docs/.workflows/pipeline.yaml` may route to external backends such as ACP
6. If a phase does not declare an explicit external executor, it must use the direct/local executor
7. `auto` should mean “use the orchestrator default executor”, and that default must be direct/local unless explicitly overridden by config
8. Workflow routing must have a single source of truth: pipeline configuration, not implicit CLI transport flags

#### CLI Simplification

9. Remove `--channel` from `orchestrator run`
10. Remove `--session` from `orchestrator run`
11. Remove `--ttl` from `orchestrator run`
12. Keep transport-facing flags only on `orchestrator exec`, where direct external invocation is the explicit concern
13. `orchestrator run` should keep only workflow-shaping options such as preset, phase selection, dry-run, and similar orchestration controls

#### Configuration and Contracts

14. Add or refine a phase-level executor configuration contract in the pipeline schema so a phase can explicitly declare which adapter/channel to use
15. The configuration contract must be simple enough that future non-ACP backends can be registered without redesigning orchestration core
16. External channel registration should live in configuration, not in hardcoded ACP-specific assumptions spread across runner/pool/policy layers

#### Simplification Constraints

17. Do not use parent-process-name detection as the primary routing mechanism
18. If process-context detection is kept at all, it must be advisory only and lower priority than explicit config or executor selection rules
19. Remove or isolate misleading “local”/“auto” code paths that still delegate through ACP
20. Preserve existing orchestrator responsibilities: DAG scheduling, gates, state persistence, evidence, subtasks, rollback, and observability

#### Migration and Compatibility

21. Existing ACP support may remain as an optional adapter, but it must only activate when explicitly configured
22. The new design must provide a compatibility path for currently supported external channels so existing ACP-backed phases can still be declared explicitly
23. Full verification must include CLI parser/help updates, routing, runner, and end-to-end workflow tests plus `bun run check`

24. Not only the relevant scripts, but also need to enhance the relevant agent skills and slash commands accordinately.

### Q&A

| # | Question | Answer |
|---|----------|--------|
| Q1 | What is the new default execution model? | Direct/local child-process execution using Bun spawn APIs. |
| Q2 | When should ACP or any other external agent backend be used? | Only when a phase explicitly opts into an external executor in `pipeline.yaml` or a later explicit override. |
| Q3 | Should process-parent detection decide routing? | No. It is too brittle to be the design center and should not override explicit configuration. |
| Q4 | What does `auto` mean after the simplification? | It means “use the orchestrator default executor”, which should be direct/local by default. |
| Q5 | What is the role of external channels after this change? | They are registered integrations that the orchestrator can call when a phase explicitly requests them. |
| Q6 | What is the architectural goal? | Make `orchestration-v2` a stable, understandable orchestrator with transport integrations hanging off a narrow adapter boundary. |
| Q7 | Should `orchestrator run` still accept `--channel`, `--session`, or `--ttl`? | No. Those are transport concerns and should be removed from `run`. |
| Q8 | Where should transport-facing flags remain? | On `orchestrator exec`, because that command is the explicit external invocation surface. |


### Design

#### Current Issues

| Area | Current State | Problem |
|------|---------------|---------|
| Default execution path | `auto`/default routing still lands on ACP stateless adapters | misleading behavior; local/direct is not truly local |
| Local executor naming | `local.ts` is effectively an ACP wrapper | architecture and operator expectations diverge |
| Routing policy | channel materialization expands ACP assumptions broadly | every configured channel becomes part of default routing whether needed or not |
| CLI surface | `orchestrator run` still accepts transport flags | workflow and transport concerns are mixed at the command boundary |
| Orchestrator core | still carries transport-oriented assumptions in execution flow | reduces stability and makes debugging harder |
| External agent integration | ACP is treated as the design center | prevents clean future support for non-ACP external channels |

#### Recommended Architecture

##### 1. True Direct Executor as the Default

Introduce a real direct/local executor adapter for `orchestration-v2` that:

- runs local child processes with Bun spawn APIs
- executes the phase request through a configured direct command contract
- returns the same normalized `ExecutionResult` shape as any external adapter
- has no ACP/acpx dependency

This adapter becomes the default orchestration executor.

##### 2. Narrow External Adapter Boundary

Keep the adapter abstraction, but reduce assumptions:

```ts
interface PhaseExecutorAdapter {
  readonly id: string;
  execute(req: ExecutionRequest): Promise<ExecutionResult>;
  healthCheck(): Promise<ExecutorHealth>;
  dispose(): Promise<void>;
}
```

The orchestrator core should only know:

- which adapter ID was selected
- the normalized request/result contract
- whether execution succeeded or failed

The core must not assume ACP sessions, ACP channel naming, or ACP routing defaults.

##### 3. Explicit Phase-Level Executor Configuration

Extend `PhaseDefinition` with an explicit executor block similar to:

```ts
interface PhaseExecutorConfig {
  readonly adapter?: string;
  readonly channel?: string;
  readonly mode?: "direct" | "stateless" | "sessioned";
}
```

or a simpler equivalent if the parser stays lean.

Behavioral rule:

- no executor block => use default direct/local adapter
- executor block present => resolve the declared external adapter/channel

##### 4. Single Source of Truth for Routing

Routing decisions for `orchestrator run` should come from workflow configuration, not transport overrides on the run command.

Behavioral rule:

- `orchestrator run` is workflow-facing and should not accept `--channel`, `--session`, or `--ttl`
- `orchestrator exec` is transport-facing and may continue to accept those flags
- `auto` resolves to the orchestrator default adapter, not to ACP

##### 5. External Channel Registry

Move external-agent registration into config so `orchestration-v2` can treat channels as named integrations, for example:

```yaml
executor_channels:
  - codex
  - pi

external_executors:
  codex:
    adapter: acp-stateless:codex
  pi:
    adapter: acp-stateless:pi
```

The exact schema may vary, but the key rule is:

- registration is declarative
- core routing is not ACP-specific
- unregistered channels are not silently assumed

##### 6. Command Boundary Split

The system should have a clear boundary:

- `run` owns orchestration semantics
- `exec` owns transport/external invocation semantics

This reduces ambiguity, avoids conflicting sources of truth, and keeps the orchestrator easier to reason about.

#### Smooth-Implementation Notes

- Reuse the proven direct/local execution ideas from `orchestration-v1/scripts/executors.ts` rather than inventing a new execution model from scratch
- Rename or replace the current `local.ts` because its current behavior is ACP-backed and misleading
- Keep ACP adapters isolated behind integration modules so they can survive as optional backends
- Avoid a partial migration where policy defaults are changed but the executor pool still auto-expands ACP channel overrides
- Update CLI help and parser behavior early so transport flags stop leaking into `run` semantics during the refactor
- Keep parser and runtime changes small and explicit so existing workflows fail clearly instead of silently changing transport


### Solution

#### Implementation Strategy

1. **Add explicit executor metadata to phase definitions**
   - Extend the model and parser so a phase can declare its execution adapter/channel explicitly
   - Keep the schema minimal: absence means default direct execution

2. **Implement a real direct/local executor adapter**
   - Port the essential local-child execution behavior from orchestration-v1
   - Use Bun spawn APIs and normalize outputs into `ExecutionResult`
   - Ensure it can serve as the default adapter without ACP installed

3. **Change default routing to direct**
   - Make the executor pool and routing policy default to the direct adapter
   - Remove current implicit ACP expansion for ordinary phases

4. **Simplify the CLI boundary**
   - Remove `--channel`, `--session`, and `--ttl` from `orchestrator run`
   - Keep transport-facing flags on `orchestrator exec` only
   - Update help text, argument parsing, and `RunOptions` so workflow runs no longer carry transport state implicitly

5. **Keep ACP as an explicit optional integration**
   - Preserve ACP stateless/sessioned adapters, but do not auto-route to them
   - Only use them when a phase or explicit config names them

6. **Tighten verification**
   - Add regression tests proving that a phase without explicit executor config does not hit ACP
   - Add tests showing that explicit ACP phase config still works
   - Add CLI tests proving `run` no longer accepts transport flags while `exec` still does

#### Expected Outcome

After implementation, `orchestration-v2` will behave like a stable workflow orchestrator:

- default runs stay local/direct
- external agent backends are explicit and isolated
- `orchestrator run` no longer exposes transport flags that compete with workflow config
- ACP-related failures no longer dominate ordinary workflow execution
- future external backends can be added through adapter registration rather than core redesign


### Plan

| # | Step | Deliverable | Notes |
|---|------|-------------|-------|
| 1 | Extend pipeline schema/model with explicit phase executor config | model + parser updates | Keep config surface minimal |
| 2 | Implement true direct/local executor adapter | new/updated executor module | Must not depend on ACP |
| 3 | Replace misleading ACP-backed local default | pool + routing updates | Default becomes direct |
| 4 | Simplify `run` CLI surface | command parser + help + options updates | Remove transport flags from `run` only |
| 5 | Restrict ACP routing to explicit configuration | policy + executor registration updates | No silent ACP materialization for ordinary phases |
| 6 | Update default workflow examples | `docs/.workflows/pipeline.yaml` and/or examples | External routing only where intentionally declared |
| 7 | Add regression tests for parser, routing, pool, runner, and CLI | targeted unit/integration coverage | Prove non-explicit phases stay direct and `run` stays workflow-only |
| 8 | Run full verification | `bun run check` | Required completion gate |


### Review

#### Key Risks

- A partial refactor could leave the default adapter set to direct while some hidden ACP assumptions still remain in the pool or runner
- Existing tests may overfit current ACP-oriented behavior and need deliberate rewrites rather than small expectation tweaks
- Removing transport flags from `run` is the right boundary change, but it may break callers that currently rely on those flags and will require a clear migration note
- If the direct executor contract is underspecified, the system may become simpler in naming but still ambiguous in operation

#### Non-Goals

- Do not redesign gate semantics, DAG scheduling, task decomposition flow, or rollback behavior in this task
- Do not add more ACP features while simplifying the execution model
- Do not rely on parent-process-name heuristics as a required part of execution routing
- Do not preserve `run`-level transport overrides just for backward compatibility if they conflict with the new single-source-of-truth design

#### Reviewer Focus

- verify that default orchestration runs no longer touch ACP unless explicitly configured
- verify that external adapters remain optional and isolated
- verify that `run` no longer accepts transport flags
- verify that `exec` still exposes the transport-facing controls it needs
- verify that `auto` semantics are clear and deterministic


### Testing

#### Verification Strategy

##### Parser / Schema

1. Pipeline parsing accepts the new phase-level executor configuration
2. Omitted executor config resolves to default direct execution
3. Invalid executor declarations fail validation clearly

##### Routing / Pool

1. Default routing policy resolves to the direct adapter
2. `auto` does not route to ACP by default
3. ACP adapters are only selected when the phase explicitly declares them
4. Unregistered external channels fail with clear errors rather than silent fallback

##### Runner Behavior

1. A phase without explicit executor config executes through the direct adapter
2. A phase with explicit ACP config executes through the ACP adapter
3. Subtask-aware implement flow still works under the direct default
4. Gates, evidence, and state persistence remain unchanged by the transport simplification

##### CLI Regression

1. `orchestrator run` rejects `--channel`
2. `orchestrator run` rejects `--session`
3. `orchestrator run` rejects `--ttl`
4. `orchestrator exec` still accepts transport-facing flags
5. Help text and usage output reflect the new command boundary clearly

##### Workflow Regression

1. Existing non-external workflows run successfully with direct execution
2. Explicit external-channel workflows still run when properly configured
3. Logging and diagnostics clearly identify which adapter executed each phase

##### Completion Gate

- targeted unit and integration tests added/updated
- `bun run check` passes cleanly

#### Acceptance Criteria

- direct/local child execution is the default orchestrator path
- external channels are explicit registered integrations only
- `auto` no longer implies ACP-backed execution
- `orchestrator run` no longer accepts transport flags
- `orchestrator exec` remains the transport-facing command
- ACP remains optional and isolated behind adapters
- orchestration core becomes simpler and more stable to operate


### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References

- `plugins/rd3/skills/orchestration-v2/scripts/cli/commands.ts`
- `plugins/rd3/skills/orchestration-v2/scripts/run.ts`
- `plugins/rd3/skills/orchestration-v2/scripts/engine/runner.ts`
- `plugins/rd3/skills/orchestration-v2/scripts/model.ts`
- `plugins/rd3/skills/orchestration-v2/scripts/config/parser.ts`
- `plugins/rd3/skills/orchestration-v2/scripts/executors/pool.ts`
- `plugins/rd3/skills/orchestration-v2/scripts/executors/local.ts`
- `plugins/rd3/skills/orchestration-v2/scripts/routing/policy.ts`
- `plugins/rd3/skills/orchestration-v2/tests/cli-commands.test.ts`
- `plugins/rd3/skills/orchestration-v2/tests/commands.test.ts`
- `plugins/rd3/skills/orchestration-v2/tests/run-cli-integration.test.ts`
- `plugins/rd3/skills/orchestration-v1/scripts/executors.ts`
- `docs/.workflows/pipeline.yaml`
- Discussion summary: default direct execution, explicit external-channel registration, `run` as workflow-only, `exec` as transport-facing
