---
name: Continue to simplify orchestration-v2
description: Continue to simplify orchestration-v2
status: Done
created_at: 2026-04-09T16:25:54.388Z
updated_at: 2026-04-09T18:34:15.000Z
folder: docs/tasks2
type: task
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: in_progress
  testing: completed
---

## 0367. Continue to simplify orchestration-v2

### Background

Task [0363](docs/tasks2/0363_Simplify_orchestration-v2_to_default_to_direct_execution_and_make_external_channels_explicit.md) completed the first major simplification wave for `rd3:orchestration-v2`: the engine is no longer forced to treat ACP as the only meaningful execution model, and the codebase now contains a real `direct` Bun-spawn executor.

However, the current design is still inconsistent in three places:

1. **Execution terminology is muddy**
   - `direct.ts` now represents real subprocess execution.
   - `local.ts` is still an ACP-backed compatibility wrapper (`AutoExecutor`).
   - some docs still claim that v2 has no supported `local` mode.

2. **Default behavior is still subprocess-oriented**
   - subprocess execution is useful for isolation, but it weakens visibility, steering, and current-session intervention compared to an in-process path.
   - for interactive workflows, that is the wrong default.

3. **Pipeline YAML and routing config remain heavier than needed**
   - execution intent is split across pipeline schema, external config, and adapter routing policy.
   - the resulting YAML is valid but harder to maintain than necessary for current rd3 workflows.

This task is the second simplification wave. It should:

- define a clean vocabulary for execution modes
- introduce a true **local/in-process** mode
- make local mode the default for interactive orchestration commands
- keep subprocess execution as an explicit `direct` mode
- keep ACP as an explicit external integration
- simplify the YAML/routing contract to the minimum shape needed for current workflows

### Problem Statement

`orchestration-v2` currently has three concepts entangled:

- **local**: execute in the current process/current session
- **direct**: execute in a Bun subprocess
- **external**: execute through ACP or another registered adapter

The codebase already supports the second and third concepts. This task exists to make the first concept real and first-class, while removing the naming and configuration debt left by the transitional architecture.


### Requirements

#### A. Execution Semantics

1. The orchestrator must define three distinct execution concepts with unambiguous names:
   - `local`: execute in the current process/current context
   - `direct`: execute in a Bun subprocess
   - external channel/adapter: execute through ACP or another registered backend
2. `local` must no longer mean “resolve to the configured external backend”.
3. `direct` must become the canonical term for Bun-spawn subprocess execution.
4. Any misleading compatibility layer, alias, class name, or documentation that conflates `local`, `auto`, `current`, and ACP-backed execution must be removed, renamed, or explicitly deprecated.

#### B. Real Local Mode

5. Implement a real in-process `local` execution path for orchestration-v2 phase execution.
6. The real local mode must preserve current-session visibility so users can observe progress and intervene while a task is running.
7. The real local mode must be able to execute the same phase/skill contracts as the current default direct path, or fail clearly for unsupported cases.
8. If a phase cannot safely run in-process, the engine must either require explicit `direct`/external configuration or fail with a clear validation/runtime message.

#### C. Default Behavior

9. `orchestrator run` must default to `local` execution for phases that do not explicitly request another executor.
10. `orchestrator exec` must default to `local` execution as well.
11. `auto` must be redefined to mean “use the orchestrator default execution mode”, and that default must resolve to `local` unless configuration explicitly overrides it.
12. External ACP-backed execution must remain opt-in and explicit.

#### D. Per-Phase Override Model

13. The pipeline definition must support an explicit way to mark a phase as `local`, `direct`, or external.
14. The configuration model must support phases that need subprocess isolation even when the workflow default is local.
15. The design must account for parallel execution: concurrently running phases must not rely on unsafe shared in-process state.
16. If true per-step execution override is not implemented in this task, the task must at minimum establish a forward-compatible phase-level contract that does not block step-level overrides later.

#### E. YAML / Schema Simplification

17. Simplify the pipeline YAML contract so the common rd3 workflow definition is easier to read and maintain.
18. Remove or collapse redundant configuration layers where the same routing intent is currently expressible in multiple places.
19. The simplified schema must preserve the currently required orchestration capabilities:
   - phase DAG dependencies
   - skill binding
   - payload/defaults
   - gate configuration
   - preset/profile selection
   - explicit executor selection where needed
20. Schema simplification must prefer a smaller, clearer contract over generic extensibility that is not yet needed by the project.

#### F. Compatibility and Migration

21. Existing ACP integrations must continue to work when explicitly configured.
22. Existing example pipelines, docs, and wrapper commands must be updated to match the new terminology and defaults.
23. Migration from the current v2 schema/config must be explicit:
   - either existing YAML continues to work with compatibility shims, or
   - validation errors and migration notes must tell users exactly what to change.

#### G. Verification

24. Verification must cover local, direct, and explicit external execution selection.
25. Verification must cover CLI parsing/help text for `run` and `exec`.
26. Verification must cover pipeline/schema parsing for the simplified YAML format.
27. Relevant skills, examples, and slash commands must be updated alongside the core scripts.
28. Final verification target remains `bun run check`.
29. Adapter-mode routing must expose the real `direct` transport instead of silently aliasing `local` back to ACP-backed auto execution.
30. Session-aware execution must honor `--session` / session-bearing requests during adapter selection so sessioned ACP routing works without manual policy edits.
31. Direct execution must support ordinary SKILL-only phases through a real runnable entrypoint or generic skill runner rather than assuming every skill package has `scripts/run.ts`.

### Q&A

| # | Question | Answer |
|---|----------|--------|
| Q1 | What is the main goal of this task? | Finish the second simplification wave by introducing a true in-process local mode, cleaning up naming, and shrinking the YAML/routing surface. |
| Q2 | What should `local` mean after this task? | Execute in the current process/current session with visible progress and operator steering potential. |
| Q3 | What should `direct` mean after this task? | Execute in a Bun subprocess with isolation and bounded lifecycle. |
| Q4 | What should `auto` mean after this task? | Resolve to the orchestrator default mode, which should be `local` unless explicitly overridden. |
| Q5 | Is ACP being removed? | No. ACP remains as an explicit external adapter/integration, not the default runtime path. |
| Q6 | Does this task need full per-step routing immediately? | No. Phase-level explicit selection is required now; step-level routing only needs a forward-compatible design if not fully implemented. |
| Q7 | Why is in-process local mode important? | Because subprocess-only execution weakens real-time visibility, operator steering, and current-session intervention. |
| Q8 | What kind of YAML simplification is intended? | Reduce redundant routing/configuration surface and keep only the fields needed for real rd3 workflows. |
| Q9 | What must not regress? | DAG scheduling, gates, state/event persistence, reporting, resume/undo behavior, and explicit external channel execution. |

### Design

#### Current State Summary

| Area | Current State | Problem |
|------|---------------|---------|
| Execution naming | `direct.ts` is truly subprocess execution; `local.ts` is still an ACP-backed wrapper | naming is misleading and docs are inconsistent |
| Default runtime | default path is better than before but still subprocess-oriented | operator visibility and steering remain weaker than desired |
| Routing | routing spans pipeline schema, external config, and adapter policy materialization | too many places express similar intent |
| YAML schema | valid but relatively heavy for daily editing | more ceremony than value for current rd3 use |
| Docs/examples | some still state “no local mode” | no longer aligned with the intended architecture |

#### Recommended Architecture

##### 1. Separate Runtime Modes Explicitly

Define a small runtime vocabulary and use it consistently:

- `local` = in-process execution in the current session
- `direct` = Bun subprocess execution
- `external` = named adapter/channel such as ACP-backed `codex`, `pi`, etc.

This distinction should exist in:

- model types
- routing policy
- pipeline YAML
- CLI help
- docs/examples

##### 2. Make Local the Interactive Default

Use `local` as the default runtime for:

- `orchestrator run`
- `orchestrator exec`
- any phase without an explicit executor override

Use `direct` only when the phase needs one or more of:

- process isolation
- bounded subprocess lifecycle
- safe parallel fan-out
- a contract that is easier to satisfy in a child process than in the current session

##### 3. Keep Executor Selection in One Obvious Place

The preferred target is a small phase-level executor block in pipeline YAML, for example:

```yaml
phases:
  implement:
    skill: rd3:super-coder
    executor:
      mode: local

  review:
    skill: rd3:super-reviewer
    executor:
      mode: direct

  heavy-research:
    skill: rd3:knowledge-seeker
    executor:
      adapter: acp-stateless:codex
```

The exact shape may differ, but the design rules should be:

- no executor block => use default `local`
- `mode: direct` => Bun subprocess
- explicit adapter/channel => external execution
- avoid duplicating the same routing intent across pipeline YAML, config, and policy shims

##### 4. Reduce YAML to the Core Contract

The simplified pipeline contract should keep only the parts orchestration-v2 demonstrably needs:

- phase name
- skill
- after/dependency list
- payload/defaults
- gate
- optional executor
- presets

Avoid speculative configuration axes that are not buying anything today.

##### 5. Compatibility Strategy

Use a two-layer migration approach:

1. accept current v2 config/YAML where reasonably possible
2. normalize into the new internal contract early in parsing/loading

This keeps the engine internals clean while avoiding a flag day migration unless there is a strong reason for one.

#### Non-Goals

- Removing ACP support entirely
- Rewriting the event/state/DAG core
- Introducing a large new workflow DSL
- Solving every future per-step routing use case in this same task

### Solution

#### Proposed Implementation Strategy

1. **Rename and normalize runtime concepts**
   - keep `direct` as the subprocess term
   - reserve `local` for in-process execution
   - remove misleading `LocalExecutor`/`AutoExecutor` naming collisions

2. **Add a true local executor/runner path**
   - execute skill/phase work in the current process
   - preserve incremental visibility and operator control where possible
   - normalize results into the same execution/result contract used by other executors

3. **Flip default resolution from direct to local**
   - `run` and `exec` use local unless a phase/command explicitly selects `direct` or an external adapter
   - keep explicit external channels working

4. **Collapse routing/configuration layers**
   - move the primary runtime choice into the pipeline phase definition or one clearly documented equivalent
   - reduce dependence on external default-channel indirection for ordinary pipeline behavior

5. **Simplify the pipeline schema and examples**
   - shrink the author-facing YAML shape
   - update example presets and docs
   - provide compatibility normalization or migration guidance

6. **Update wrapper skills and commands**
   - align `rd3-dev-*` wrappers and orchestration-v2 docs/help with the new default semantics
   - remove outdated statements such as “there is no supported local mode in v2”

#### Implemented

- added a phase-level `executor` contract (`mode`, `channel`, `adapter`) to the model, parser, and schema
- introduced a real in-process `LocalExecutor` and moved the ACP-backed compatibility executor into `auto.ts`
- made `local` the orchestrator default while keeping `direct` as the explicit Bun subprocess path and ACP adapters explicit
- made adapter selection session-aware so `--session` upgrades compatible ACP routing automatically
- kept direct execution viable for ordinary SKILL-only phases via the existing generic skill-runner fallback
- updated pipeline examples, CLI/help text, wrapper docs, and tests to match the new terminology and defaults

#### Concrete Review Findings To Address

##### Finding 1: `local` still routes to ACP-backed AutoExecutor

- **Issue**
  - In adapter mode, `pool.ts` still binds `local` to `AutoExecutor`, and the adapter registry does not expose `DirectExecutor` under the expected `local` / `direct` aliases.
  - As a result, policy overrides or built-in local/debug routing still travel through ACP/acpx instead of the real direct transport.
- **Impact**
  - the documented local/direct architecture is false in practice
  - offline or debug runs cannot use the new direct path reliably
  - “local” remains semantically misleading
- **Required solution**
  - register `DirectExecutor` as a first-class adapter in the pool
  - route `direct` to `DirectExecutor`
  - stop aliasing `local` to ACP-backed auto behavior
  - if `local` remains a supported alias during migration, it must resolve to the intended non-ACP path, not back to ACP
- **Primary files**
  - `plugins/rd3/skills/orchestration-v2/scripts/executors/pool.ts`
  - `plugins/rd3/skills/orchestration-v2/scripts/executors/direct.ts`
  - `plugins/rd3/skills/orchestration-v2/scripts/executors/local.ts`
  - `plugins/rd3/skills/orchestration-v2/scripts/routing/policy.ts`

##### Finding 2: Session-bearing requests are routed as stateless

- **Issue**
  - Adapter selection currently routes only by phase and channel.
  - Requests carrying `req.session` still resolve to stateless ACP adapters by default, so `--session <name>` becomes a no-op unless the user also customizes policy configuration by hand.
- **Impact**
  - the CLI contract is internally inconsistent
  - users can pass `--session` and receive stateless execution without warning
  - sessioned ACP support is effectively hidden behind manual routing configuration
- **Required solution**
  - make adapter selection aware of session-bearing requests
  - when `req.session` is present, prefer a compatible sessioned adapter unless an explicit executor override says otherwise
  - fail clearly if a requested channel/executor does not support session semantics
  - add tests proving `--session` changes runtime behavior without requiring manual policy edits
- **Primary files**
  - `plugins/rd3/skills/orchestration-v2/scripts/executors/pool.ts`
  - `plugins/rd3/skills/orchestration-v2/scripts/executors/acp-sessioned.ts`
  - `plugins/rd3/skills/orchestration-v2/scripts/executors/acp-stateless.ts`
  - `plugins/rd3/skills/orchestration-v2/scripts/run.ts`

##### Finding 3: Direct mode cannot execute ordinary SKILL-only phases

- **Issue**
  - The direct executor falls back to a skill directory for SKILL-only packages, but still invokes `bun <scriptPath>`, which requires an actual runnable file.
  - Many standard presets reference SKILL-only packages such as `request-intake`, `code-review-common`, and `code-docs`, so direct execution fails on common paths.
- **Impact**
  - the direct executor does not satisfy the normal pipeline contract
  - standard presets cannot rely on direct execution
  - the “default direct path” is incomplete for ordinary rd3 workflows
- **Required solution**
  - introduce or reuse a real generic skill runner for SKILL-only phases
  - ensure the direct executor resolves each skill package to an actual runnable target
  - keep direct execution compatible with both skill packages that expose `scripts/run.ts` and those that only provide `SKILL.md`
  - add regression coverage for standard preset phases that do not ship custom script entrypoints
- **Primary files**
  - `plugins/rd3/skills/orchestration-v2/scripts/executors/direct.ts`
  - any generic skill-runner integration used by orchestration-v2
  - relevant preset/integration tests

#### Expected Outcome

After this task:

- operators can run workflows locally in the current session by default
- subprocess execution remains available but is clearly named `direct`
- ACP stays supported as an explicit integration
- pipeline YAML becomes smaller and easier to maintain
- runtime terminology matches runtime behavior

### Plan

1. Audit all current uses of `local`, `auto`, `current`, and `direct` in orchestration-v2 code, docs, and examples.
2. Define the canonical runtime vocabulary and update model/parser/routing contracts to match it.
3. Implement the true in-process local execution path and wire it into `run` and `exec` defaults.
4. Fix adapter-pool wiring so `direct` is actually registered and `local` no longer resolves through ACP-backed auto execution.
5. Make routing session-aware so `--session` selects compatible sessioned adapters by default.
6. Add or integrate a generic skill runner so direct execution can run ordinary SKILL-only phases.
7. Add explicit phase-level executor selection for `local`, `direct`, and external adapters.
8. Simplify pipeline YAML/schema and add normalization or migration handling for older config shapes.
9. Update example pipelines, docs, and wrapper commands/skills to match the new defaults.
10. Add regression coverage for local/direct/external selection, parser/help text, session-aware routing, and SKILL-only direct execution.
11. Run `bun run check`.

### Review

- Refinement goal: convert an idea-level follow-up into a bounded phase-2 architecture task.
- Primary clarification added: this is no longer “make things simpler somehow”; it is specifically about separating `local`, `direct`, and external execution semantics, then shrinking the YAML/routing surface around that model.
- Risk called out explicitly: parallel execution and in-process local execution can conflict if shared mutable state is assumed. The final implementation must either constrain or explicitly route those cases.
- Follow-up review surfaced three concrete implementation gaps that now belong to this task:
  - adapter-mode `local` routing still points at ACP-backed auto execution instead of the real direct transport
  - session-bearing requests are still routed stateless unless policy is edited manually
  - the direct executor cannot run ordinary SKILL-only phases because it does not resolve them to a runnable entrypoint

#### Completion Review

Phase 7 code review: PASS
- runtime terminology is now consistent: `local` = in-process, `direct` = subprocess, explicit ACP adapters remain external
- default runtime resolution now lands on `local` for `run` and `exec`, while explicit phase-level overrides still work
- example pipelines pin SKILL-only phases that do not expose a local entrypoint to `executor: direct`, so unsupported in-process cases fail clearly instead of silently downgrading

Phase 8 requirements traceability: PASS
| Requirement Area | Status |
|------------------|--------|
| Real local mode and local default | MET |
| Explicit direct / external selection | MET |
| Phase-level executor contract | MET |
| Session-aware adapter routing | MET |
| YAML/schema simplification + normalization | MET |
| Docs/examples/wrappers alignment | MET |
| Final verification gate | MET |

### Testing

- Unit tests for executor selection, routing normalization, and schema parsing
- Integration tests for:
  - default local run
  - explicit direct run
  - explicit ACP/external phase execution
  - mixed pipeline with local + direct + external phases
- Focused regression tests for:
  - `local` / `direct` adapter registration and routing behavior
  - `--session` selecting session-capable routing automatically
  - direct execution of SKILL-only phases used by standard presets
- CLI tests for `run` / `exec` help and option behavior
- Full gate: `bun run check`

#### Verification Result

```bash
bun run check
```

- result: pass
- suite summary: 4255 tests passed, 0 failed

### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |
| code | `plugins/rd3/skills/orchestration-v2/scripts/model.ts` | Codex | 2026-04-09 |
| code | `plugins/rd3/skills/orchestration-v2/scripts/config/{parser.ts,schema.ts}` | Codex | 2026-04-09 |
| code | `plugins/rd3/skills/orchestration-v2/scripts/executors/{auto.ts,local.ts,direct.ts,pool.ts,adapter.ts}` | Codex | 2026-04-09 |
| code | `plugins/rd3/skills/orchestration-v2/scripts/engine/runner.ts` | Codex | 2026-04-09 |
| docs | `plugins/rd3/skills/orchestration-v2/{SKILL.md,references/}` | Codex | 2026-04-09 |
| tests | `plugins/rd3/skills/orchestration-v2/{scripts,tests}/**/*test.ts` | Codex | 2026-04-09 |

### References

- `docs/tasks2/0363_Simplify_orchestration-v2_to_default_to_direct_execution_and_make_external_channels_explicit.md`
- `docs/tasks2/0290_implement-phase-5-7-local-pilot-execution.md`
- `plugins/rd3/skills/orchestration-v2/scripts/executors/direct.ts`
- `plugins/rd3/skills/orchestration-v2/scripts/executors/local.ts`
- `plugins/rd3/skills/orchestration-v2/scripts/executors/pool.ts`
- `plugins/rd3/skills/orchestration-v2/scripts/executors/acp-sessioned.ts`
- `plugins/rd3/skills/orchestration-v2/scripts/executors/acp-stateless.ts`
- `plugins/rd3/skills/orchestration-v2/scripts/routing/policy.ts`
- `plugins/rd3/skills/orchestration-v2/scripts/model.ts`
- `plugins/rd3/skills/orchestration-v2/scripts/config/schema.ts`
- `plugins/rd3/skills/orchestration-v2/scripts/run.ts`
- `plugins/rd3/skills/orchestration-v2/SKILL.md`
