---
name: Decouple ACP transport from orchestration-v2 core
description: Decouple ACP transport from orchestration-v2 core
status: Backlog
created_at: 2026-04-08T07:17:55.189Z
updated_at: 2026-04-08T07:17:55.189Z
folder: docs/tasks2
type: task
preset: "standard"
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0362. Decouple ACP transport from orchestration-v2 core

### Background

orchestration-v2 currently mixes workflow semantics with ACP/acpx transport concerns, especially around sessioned delegation and stall handling. We need a design-first refactor plan that makes pipeline execution transport-agnostic before optimizing with ACP or other coding-agent backends.


### Requirements

- Define target architecture that separates orchestration core from ACP transport/session concerns
- Specify execution contracts, policy boundaries, migration steps, and verification approach
- Persist the concrete refactor plan in a new task file for later implementation


### Q&A

| # | Question | Answer |
|---|----------|--------|
| Q1 | Why not keep patching the current acpx path? | Because the current design treats transport details, session lifecycle, and workflow execution as one concern. That makes every stall, queue, or adapter quirk an orchestration problem. |
| Q2 | What is the primary architectural goal? | Make orchestration-v2 transport-agnostic so the pipeline engine owns workflow semantics only, while ACP/acpx becomes an optional adapter. |
| Q3 | What should be the default execution model after refactor? | Stateless bounded execution. Sessioned ACP should be opt-in and isolated behind a dedicated adapter/service. |
| Q4 | What optimization opportunities remain after decoupling? | Per-phase routing by quality, performance, cost, or capability. ACP, local execution, or future adapters can be selected without changing orchestration core behavior. |
| Q5 | What is the biggest migration risk? | Accidentally breaking current delegated phase execution while extracting the adapter boundary. Mitigation: ship in stages with a compatibility adapter and phase-level regression tests. |


### Design

#### Problem Statement

`orchestration-v2` currently couples three layers that should be separate:

1. **Workflow semantics**: DAG scheduling, FSM lifecycle, gate evaluation, retries, evidence, and run state.
2. **Execution transport**: local shell execution, ACP/acpx delegation, mock execution, future remote workers.
3. **Session policy**: whether execution is stateless (`exec`) or stateful (`prompt --session`), including queueing, TTL, cancellation, and stale-session recovery.

That coupling creates the acpx stall class of failures:

- the runner passes ACP session details through the same path used for ordinary phase execution
- the ACP executor chooses command mode and prompt shaping directly
- the acpx wrapper mixes generic command execution with session-aware operational policy
- orchestration therefore inherits queue blockage, stale session state, and ACP-specific lifecycle hazards

#### Current Architecture Issues

| Area | Current State | Risk |
|------|---------------|------|
| `runner.ts` | Builds `ExecutionRequest` with `session` and `sessionTtlSeconds` | workflow core knows too much about one transport |
| `AcpExecutor` | Builds acpx commands and prompt content directly | executor mixes transport, policy, and protocol shaping |
| `acpx-query.ts` | Generic wrapper also owns slash-command transforms and session mode execution | low-level utility has high-level behavior embedded |
| Session mode | Treated as a transparent optimization | non-deterministic queue/session behavior leaks into pipeline execution |
| Channel routing | Orchestrator effectively assumes ACP semantics for delegated channels | makes future adapters harder to add cleanly |

#### Target Architecture

##### 1. Orchestration Core

Own only:

- phase graph and dependency resolution
- run lifecycle and state persistence
- gate and rework policy
- execution request/response contracts
- evidence and observability

Must not know:

- acpx command syntax
- ACP session semantics
- agent registry names
- slash-command transforms
- prompt format for any specific transport

##### 2. Execution Adapter Layer

Introduce a strict adapter boundary:

```ts
interface PhaseExecutorAdapter {
  readonly id: string;
  readonly executionMode: "stateless" | "sessioned";
  execute(req: ExecutionRequest): Promise<ExecutionResult>;
  healthCheck(): Promise<ExecutorHealth>;
}
```

Core idea:

- orchestration talks only to adapters
- adapters own transport-specific invocation
- policy decides which adapter to use

##### 3. ACP Integration Split

Split ACP concerns into two sublayers:

1. **ACP Transport Adapter**
   - translates `ExecutionRequest` into ACP/acpx calls
   - handles stdout/stderr/structured parsing
   - bounded timeout/error mapping

2. **ACP Session Service**
   - explicit session lifecycle management
   - `ensure`, `status`, `cancel`, `recover`, TTL policy
   - queue/busy state inspection
   - stale-session reset semantics

This is the critical design correction: session management is not part of normal transport execution.

##### 4. Routing Policy Layer

Introduce a configuration-driven routing layer:

```ts
interface ExecutionRoutingPolicy {
  defaultMode: "local" | "acp" | "mock";
  phaseOverrides?: Record<string, {
    adapter: "local" | "acp";
    executionMode?: "stateless" | "sessioned";
  }>;
}
```

Default policy:

- all phases run through a bounded stateless adapter by default
- ACP is opt-in per phase/preset/channel
- sessioned ACP is opt-in on top of ACP, not automatic

#### Recommended Default Behavior

##### Phase Execution

- Default phase execution: **stateless**
- ACP default command mode: **`exec`**
- Sessioned mode allowed only when explicitly configured

##### Sessioned Execution Eligibility

Only allow `prompt --session` for cases such as:

- human-guided iterative refinement
- deliberately persistent research or coding conversations
- workflows that need context carry-over and are prepared to manage queue/session semantics

Do **not** use sessioned ACP for ordinary pipeline phase execution by default.

#### Refactor Boundaries

##### Keep Inside Orchestration Core

- `ExecutionRequest`
- `ExecutionResult`
- timeout budgets
- retry/rework policies
- structured evidence
- generic executor pool registration

##### Move Out of Core

- ACP slash-command transforms
- acpx `exec` vs `prompt --session` selection
- session TTL and queue semantics
- ACP-specific command flags
- agent-specific prompt templates

#### Proposed Module Shape

```text
plugins/rd3/skills/orchestration-v2/scripts/
  engine/
    runner.ts                  # orchestration only
  executors/
    adapter.ts                 # transport-agnostic interfaces
    local.ts                   # local bounded adapter
    acp-stateless.ts           # ACP exec adapter
    acp-sessioned.ts           # ACP sessioned adapter
    pool.ts                    # adapter registry only
  routing/
    policy.ts                  # phase->adapter selection
  integrations/acp/
    transport.ts               # acpx command execution/parsing
    sessions.ts                # ensure/status/cancel/recover
    prompts.ts                 # ACP prompt shaping
```

`acpx-query.ts` should either:

- shrink into a low-level transport utility, or
- be wrapped by `integrations/acp/*` so orchestration no longer calls it conceptually as a workflow primitive.

#### Migration Strategy

##### Phase 1: Introduce the boundary without behavior change

- add explicit adapter interfaces
- keep existing ACP path behind a compatibility adapter
- move no semantics yet, only redirect dependencies

##### Phase 2: Make stateless ACP the only default

- route ordinary ACP execution through `exec`
- keep sessioned mode behind explicit config/flag

##### Phase 3: Extract ACP session service

- move `session`, `ttl`, ensure/cancel/recover logic out of runner and executor core
- session mode becomes a dedicated integration capability

##### Phase 4: Add routing policy

- select adapter per phase/preset/channel
- make optimization decisions configurable instead of hardcoded

##### Phase 5: De-risk and simplify

- retire legacy compatibility paths once tests prove parity
- reduce `acpx-query.ts` surface if possible

#### Success Criteria

The refactor is successful when:

1. orchestration core can run without knowing ACP session semantics
2. normal pipeline execution does not depend on persistent ACP sessions
3. ACP can be disabled or swapped without reworking runner logic
4. phase routing can choose ACP/local/mock for optimization reasons
5. a session stall is isolated to the ACP integration layer, not the orchestration design center


### Solution

#### Concrete Refactor Proposal

1. **Define an execution-adapter contract**
   - Add transport-agnostic interfaces for adapters and routing policy.
   - Keep existing `ExecutionRequest`/`ExecutionResult` as the shared boundary.

2. **Split ACP into stateless and sessioned adapters**
   - `AcpStatelessExecutor`: always uses `acpx <agent> exec`
   - `AcpSessionedExecutor`: uses `acpx <agent> prompt --session`
   - Do not hide one behind the other.

3. **Make orchestration default to stateless execution**
   - Remove implicit session passthrough from the normal phase path.
   - Sessioned execution must be explicitly enabled by config or phase policy.

4. **Extract ACP session lifecycle into a dedicated service**
   - `ensureSession()`
   - `checkSessionHealth()`
   - `cancelSessionTurn()`
   - `recoverSession()`
   - `closeSessionIfNeeded()`

5. **Move prompt shaping out of the executor core**
   - ACP prompt templates belong in an ACP integration module.
   - Orchestration should pass structured context, not construct ACP-specific prompting logic directly.

6. **Introduce phase routing policy**
   - Add project config or pipeline-level policy for:
     - adapter selection
     - execution mode
     - fallback behavior
   - This is where future cost/performance/quality decisions should live.

7. **Preserve diagnostics and observability**
   - Keep the acpx timeout/signal/spawn diagnostics already added.
   - Add adapter/mode labels to evidence and events so failures are traceable by transport.

#### Decision Rules

- If the goal is deterministic bounded execution, use stateless transport.
- If the goal is context continuity, use sessioned transport with explicit lifecycle handling.
- If a transport requires queue/session semantics, it must not be hidden inside the default orchestration path.

#### Non-Goals

- Do not optimize for ACP reuse before the core boundary exists.
- Do not make orchestration depend on ACP-specific “smart” recovery logic.
- Do not add more transport knobs to runner core until routing policy is separated.


### Plan

| # | Step | Deliverable | Notes |
|---|------|-------------|-------|
| 1 | Introduce transport-agnostic executor interfaces | `executors/adapter.ts`, updated pool contract | No behavior change yet |
| 2 | Add explicit routing policy module | `routing/policy.ts` | Default all phases to stateless/local-compatible behavior |
| 3 | Extract current ACP command execution into ACP integration module | `integrations/acp/transport.ts` | Preserve current parsing and diagnostics |
| 4 | Split current `AcpExecutor` into stateless and sessioned variants | `acp-stateless.ts`, `acp-sessioned.ts` | Sessioned variant remains opt-in |
| 5 | Remove session semantics from normal runner path | `runner.ts` no longer passes raw session fields by default | Core orchestration becomes transport-agnostic |
| 6 | Add ACP session lifecycle service | `integrations/acp/sessions.ts` | Only consumed by sessioned adapter |
| 7 | Move ACP prompt shaping into ACP integration layer | `integrations/acp/prompts.ts` | Avoid executor-core prompt coupling |
| 8 | Wire config/pipeline policy to choose adapter + mode per phase | project config and/or pipeline metadata | Enables later optimization decisions |
| 9 | Add regression tests for adapter separation and routing policy | unit + integration coverage | Verify stateless default and sessioned opt-in |
| 10 | Document migration and operator guidance | refs + SKILL.md updates | Explain when to use ACP and when not to |

#### Delivery Stages

##### Stage A: Architecture Skeleton

- interfaces
- routing policy
- ACP integration module skeleton

##### Stage B: Compatibility Refactor

- keep current behavior working behind compatibility adapter
- redirect callers to new boundaries

##### Stage C: Default-Mode Correction

- make stateless execution the default
- require explicit opt-in for sessioned mode

##### Stage D: Verification and Cleanup

- remove transitional coupling
- document stable extension points


### Review



### Testing

#### Verification Strategy

##### Architecture/Contract Tests

1. Runner can execute phases without referencing ACP-specific session fields in the normal path.
2. Executor pool selects adapters through routing policy, not hardcoded ACP assumptions.
3. ACP stateless and sessioned adapters expose the same `ExecutionResult` contract.

##### Behavior Tests

1. Default delegated phase execution uses stateless ACP `exec`.
2. Sessioned ACP is used only when explicitly configured.
3. Local/mock execution still works when ACP is unavailable.
4. ACP transport failure does not imply orchestration-core failure shape changes.

##### Stall/Failure Tests

1. Stateless ACP timeout returns bounded failure with diagnostics.
2. Sessioned ACP busy/stale session scenarios are isolated to the session service.
3. Session-specific errors are reported as ACP integration failures, not opaque runner errors.

##### Migration Tests

1. Existing orchestrator CLI runs still succeed with no session flag.
2. Explicit `--session` behavior remains supported through the new sessioned adapter.
3. Preset/channel/routing behavior remains backward compatible where intended.

##### Evidence Required Before Completion

- targeted unit tests for adapter boundaries
- integration tests for runner + pool + ACP stateless path
- integration tests for explicit sessioned path
- `bun run check` clean

#### Acceptance Criteria

- no ACP session policy in orchestration core default execution path
- explicit adapter separation merged and covered by tests
- session mode clearly isolated, documented, and opt-in
- architecture supports future optimization routing without further core redesign


### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References

- [plugins/rd3/skills/orchestration-v2/scripts/engine/runner.ts](/Users/robin/projects/cc-agents/plugins/rd3/skills/orchestration-v2/scripts/engine/runner.ts)
- [plugins/rd3/skills/orchestration-v2/scripts/executors/acp.ts](/Users/robin/projects/cc-agents/plugins/rd3/skills/orchestration-v2/scripts/executors/acp.ts)
- [plugins/rd3/skills/orchestration-v2/scripts/executors/pool.ts](/Users/robin/projects/cc-agents/plugins/rd3/skills/orchestration-v2/scripts/executors/pool.ts)
- [plugins/rd3/skills/orchestration-v2/scripts/model.ts](/Users/robin/projects/cc-agents/plugins/rd3/skills/orchestration-v2/scripts/model.ts)
- [plugins/rd3/scripts/libs/acpx-query.ts](/Users/robin/projects/cc-agents/plugins/rd3/scripts/libs/acpx-query.ts)
- [plugins/rd3/skills/run-acp/SKILL.md](/Users/robin/projects/cc-agents/plugins/rd3/skills/run-acp/SKILL.md)
- Existing context task: [docs/tasks2/0361_Fix_orchestration-v2_preset_and_acpx_execution_issues.md](/Users/robin/projects/cc-agents/docs/tasks2/0361_Fix_orchestration-v2_preset_and_acpx_execution_issues.md)

