---
name: task-runner
description: "Workflow-owned task execution loop with refine, plan, implement/test cycling, and verification gates. Triggers: 'run task', 'execute task', 'dev-run', 'task workflow'. NOT for: DAG scheduling, source-only review, docs refresh."
license: Apache-2.0
version: 1.0.0
created_at: 2026-04-16
updated_at: 2026-04-16
platform: rd3
type: technique
tags: [task-execution, workflow, implement-test-loop, verification, staged-execution]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,opencode,openclaw,antigravity,pi"
  category: orchestration
  interactions:
    - pipeline
    - tool-wrapper
  pipeline_steps:
    - preflight
    - preflight-verify
    - refine
    - plan
    - implement-test-loop
    - verify
    - postflight-verify
    - done-transition
---

# rd3:task-runner — Workflow-Owned Task Execution

## Overview

`task-runner` executes a task through a **workflow-owned loop** with bounded implement ↔ test cycling, explicit status ownership, and optional pre/post-flight quality gates. It is intentionally **not** a wrapper over `rd3:orchestration-v2` — it defines a smaller, more reliable workflow using stable skills plus explicit task-status rules.

## Quick Start

```text
Skill(skill="rd3:task-runner", args="0274 --preset standard")
```

For a preview without execution:

```text
Skill(skill="rd3:task-runner", args="0274 --preset standard --dry-run")
```

## When to Use

- Run a task from refinement/planning through implementation, testing, and verification
- Keep execution reliable without DAG scheduling, resume state, or hidden routing
- Ensure the task file stays consistent even when delegated skills don't own status changes
- Validate task file quality before execution (pre-flight)
- Validate delivery claims before `done` transition (post-flight)
- Run staged workflows for scheduler integration (plan-only, implement-only)

## Key Distinctions

- **`task-runner`** = workflow-owned execution loop
- **`orchestration-v2`** = DAG-based phase orchestration (not used here)
- **`dev-review`** = source-oriented review (no task file)
- **`dev-verify`** = task-oriented verification (SECU + traceability only)

## Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `task-ref` | Yes | — | WBS number or task file path |
| `--preset` | No | task frontmatter preset → legacy profile → standard | Workflow preset: `simple`, `standard`, `complex`, `research` |
| `--channel <name>` | No | `current` | Execution channel override. Use `auto` to let `rd3:run-acp` choose the channel based on task metadata. |
| `--auto` | No | `false` | Skip confirmations where delegated skill supports it |
| `--coverage <n>` | No | — | Coverage target. Forwarded to `rd3:sys-testing` (Stage 3) and to `postflight-check.ts` (Stage 5) for threshold enforcement. Not forwarded to `rd3:code-verification`. |
| `--dry-run` | No | `false` | Emit structured JSON workflow plan and exit |
| `--preflight-verify` | No | `false` | Run Stage 0.5 task file structural validation |
| `--postflight-verify` | No | `false` | Run Stage 5 completion-proof gate before `done` |
| `--verify` | No | `false` | Shortcut for `--preflight-verify --postflight-verify` |
| `--stage <value>` | No | `all` | Execution stage: `all`, `plan-only`, `implement-only` |
| `--max-loop-iterations <n>` | No | `3` | Cap for implement ↔ test loop iterations |
| `--force` | No | `false` | Bypass task status guard in Stage 4. Passed through to `rd3:code-verification`. Allows re-verification of `Done` tasks |

## Presets

| Preset | Refine | Plan | Implement/Test Loop | Verify | Scope |
|--------|--------|------|---------------------|--------|-------|
| `simple` | Optional | Skip by default | Required | Required | Small localized work |
| `standard` | Optional | Optional | Required | Required | Default path |
| `complex` | Required | Required | Required | Required with `--bdd` | Larger/riskier implementation |
| `research` | Required | Required | Required | Required | Unclear domain; investigate first |

**Optional-step rules:**
- **Refine required when:** Background/Requirements/Constraints incomplete, acceptance criteria weak, preset is `complex` or `research`
- **Plan required when:** spans multiple modules, likely needs decomposition, architecture open, preset is `complex` or `research`
- **Verify mandatory for every preset** — never skip before `done`

## Workflow

The workflow executes as a sequence of stages. Each stage delegates to a stable skill or runs a deterministic script; status transitions are owned by `task-runner`, not delegated.

```
Stage 0:    Preflight (always)
Stage 0.5:  Pre-flight Verify  ← when --preflight-verify or --verify
Stage 1:    Optional Refine
Stage 2:    Optional Plan + Decomposition
            └─ EXIT POINT for --stage plan-only
Stage 3:    Implement ↔ Test Loop (bounded)
            └─ SKIPPED upstream for --stage implement-only
Stage 4:    Verification Gate
Stage 5:    Post-flight Verify  ← when --postflight-verify or --verify
Final:      tasks update <WBS> done (guarded)
```

### Stage 0: Preflight

1. Resolve `task-ref`
2. Read task file
3. Determine preset
4. Check if task is single or should fork into decomposition
5. Check if current workspace is acceptable for local implementation
6. Resolve execution channel (default: `current`; delegate only if `--channel` provided)
7. Build stage plan (refine? plan? implement/test? verify? pre/post-flight?)
8. If `--dry-run`: invoke `scripts/dry-run-output.ts` with resolved state and exit

**Preflight must answer:**
- Will `refine` run?
- Will `plan` run?
- Will the task fork into subtasks?
- Will implementation stay local or use explicit isolation?
- Will execution stay local or delegate?

### Stage 0.5: Pre-flight Verify (Optional)

Active when `--preflight-verify` or `--verify` is set.

Purpose: ensure the task file is structurally runnable before execution starts. This is a **lightweight structural gate**, not full SECU review — use the dedicated verification skill for that.

**LLM-mediated — no script.** Stage 0.5 is executed by the agent (LLM), not by a deterministic script. The contract below defines what triggers which path.

| Condition | Path |
|-----------|------|
| `tasks check <WBS>` exits 0 | Proceed to Stage 1 |
| Missing Background / Requirements / acceptance criteria | Attempt auto-backfill using guards helper (see `references/status-transitions.md`) |
| `complex` or `research` preset with weak sections | Route to `rd3:request-intake --mode refine` (auto-backfill not sufficient) |
| Validation still fails after backfill/refine + `--auto` | Halt with actionable error listing failed checks |
| Validation still fails after backfill/refine, no `--auto` | Prompt user with remediation options |

See `references/status-transitions.md` for guard details and backfill templates.

### Stage 1: Optional Refine

```text
Skill(skill="rd3:request-intake", args="--mode refine --task_ref <task-ref> [--auto]")
```

Purpose: tighten ambiguous requirements, improve acceptance criteria, ensure task is executable.

### Stage 2: Optional Plan + Decomposition

1. Use specialist planning/design skills as needed (e.g., `rd3:backend-architect`, `rd3:frontend-architect`, `rd3:pl-typescript`)
2. Finish with:

```text
Skill(skill="rd3:task-decomposition", args="<task-ref>")
```

**Note:** When `rd3:task-decomposition` emits a structured decomposition output, use the `structured-output-protocol` invocation pattern — pass the decomposition JSON directly to the child-creation step rather than re-parsing the human-readable summary. See `rd3:task-decomposition` SKILL.md for the structured output contract.

**`rd3:task-decomposition` is analysis-only.** It does NOT create child task files. If decomposition is required, `task-runner` must create children through `rd3:tasks` before stopping parent execution.

See `references/decomposition-handoff.md` for full handoff contract, batch JSON paths, and parent-status rules.

**Exit point for `--stage plan-only`:** After Stage 2, emit stage exit JSON envelope and stop. Parent task remains non-terminal.

### Stage 3: Implement ↔ Test Loop

With `--stage implement-only`, Stages 1-2 are skipped and execution enters this loop directly. Design and Plan sections must already be present in the task file.

**Loop body:**

1. Apply pre-implementation guard (see `references/status-transitions.md`), then `tasks update <WBS> wip`
2. Execute implementation with default review handoff disabled:

```text
Skill(skill="rd3:code-implement-common", args="implement <resolved-task-file> --no-review")
```

3. Before testing: ensure `Plan` + `Design` sufficient
4. `tasks update <WBS> testing`
5. Execute testing:

```text
Skill(skill="rd3:sys-testing", args="<task-ref> [--coverage <n>]")
```

6. Write testing evidence back to task file (see `references/status-transitions.md` Minimum Testing Structure)
7. If tests fail, coverage misses, or requirements not met → back to step 1
**Pre-testing guard:** Before `tasks update <WBS> testing`, run `tasks check <WBS>`. If it returns non-zero, backfill missing sections (see `references/status-transitions.md` Minimum Structures) before retrying the transition. Do not use `--force` as a substitute for honest backfill.

8. **Loop exit:** all of below true:
   - implementation present
   - tests pass
   - coverage met or explicitly accepted
   - no unresolved blocker
   - task can transition to `Testing` without `--force`

See `references/delegated-prompts.md` for the full prompt contract for each delegated stage.

**Iteration cap:** `--max-loop-iterations <n>` (default `3`). On exhaustion:
- keep status `wip`
- document blocker in task file
- switch to `rd3:sys-debugging` with `blocked` state

### Stage 4: Verification Gate

```text
Skill(skill="rd3:code-verification", args="--mode verify --task-ref <task-ref> --mode-verify full [--bdd] [--auto] [--force] [--channel <current|normalized-channel>]")
```

**Note:** `--force` is passed through when the task-runner itself is invoked with `--force`, allowing re-verification of tasks that have already transitioned to `Done`.

Purpose: SECU review + requirements traceability + go/no-go signal before `done`.

**Artifacts required:** `Review` section updated, traceability written, verdict `PASS`/`PARTIAL`/`FAIL`.

### Stage 5: Post-flight Verify (Optional)

Active when `--postflight-verify` or `--verify` is set.

1. Invoke `scripts/postflight-check.ts <WBS> [--coverage <n>] [--start-commit <sha>] [--delegation-used]`
   - Pass `--coverage` when `--coverage <n>` was supplied to `task-runner`
   - Pass `--delegation-used` when any stage ran via `--channel` other than `current`
2. Parse verdict JSON from stdout
3. If `verdict === "PASS"` (exit code 0): proceed to `done`
4. If `verdict === "BLOCKED"` (exit code 1):
   - write `## Completion Blockers` section to task file listing each entry from `blockers[]`
   - keep task in `Testing`
   - do NOT transition to `Done`
   - exit non-zero if `--auto`
5. If the script errors (exit code 2):
   - treat as script failure, not verdict
   - keep task in `Testing`
   - surface stderr to user and halt

See `references/postflight-checks.md` for the seven-check catalog and `PostflightVerdict` schema.

### Final: Transition to `done`

Apply completion guards (see `references/status-transitions.md`), then `tasks update <WBS> done`.

**`done` requires ALL of:**
- verification verdict is `PASS`
- task satisfies `rd3:tasks` `Done` guards
- testing evidence exists in `Testing`
- no unresolved blocker
- delegated evidence reconciled locally
- post-flight gate passed (if enabled)

## `--stage` Semantics

| Value | Behavior |
|-------|----------|
| `all` | Full workflow (default) |
| `plan-only` | Exit cleanly after Stage 2; emit JSON envelope; parent non-terminal |
| `implement-only` | Skip Stages 1-2; require Design + Plan present; enter loop directly |

**Preset interactions:**
- `complex` + `plan-only`: valid
- `complex` + `implement-only`: warn "preset requires plan; trusting operator"; continue
- `research` + `implement-only`: warn "preset requires plan; trusting operator"; continue
- All others: valid

**JSON envelope for `plan-only`:** See `references/decomposition-handoff.md` — Stage Exit JSON Envelope.

## Implementation Workspace Policy

Default: current workspace. Do not introduce worktree isolation unless explicitly requested.

**Required behavior:**
1. Treat current workspace as default implementation context
2. If explicit isolation is requested, prepare it before implementation starts
3. Propagate same task/workspace context through implement, test, verify — do not rely on shell `cd`

## Channel Delegation

Default: `current`. Delegate only if `--channel` is explicit.

- Keep `refine` and `test` on `current` unless strong reason
- `plan`, `implement`, `verify` may delegate via `--channel`
- When modifying `rd3:run-acp` or `rd3:code-verification`: force `--channel current`

Channel normalization is owned by `rd3:run-acp`. See `references/channel-delegation.md` for documentation (reference only).

Delegation prompt templates: see `references/delegated-prompts.md`.

## Task Status Ownership

`task-runner` is the workflow owner for status transitions. Delegated skills may update content but not status.

Full rules and guards: see `references/status-transitions.md`.

**Key principle:** `done` comes from workflow verdict, not implementation alone.

## Direct Skill Mapping

```text
refine     -> Skill(skill="rd3:request-intake", args="--mode refine --task_ref <task-ref> [--auto]")
plan       -> targeted planning skill(s) + Skill(skill="rd3:task-decomposition", args="<task-ref>")
implement  -> Skill(skill="rd3:code-implement-common", args="implement <resolved-task-file> --no-review")
test       -> Skill(skill="rd3:sys-testing", args="<task-ref> [--coverage <n>]")
verify     -> Skill(skill="rd3:code-verification", args="--mode verify --task-ref <task-ref> --mode-verify full [--bdd] [--auto] [--channel]")
delegate   -> Skill(skill="rd3:run-acp", args="<normalized-channel> exec \"<phase-specific prompt>\"")
```

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/dry-run-output.ts` | Emit standardized dry-run JSON (see `references/dry-run-schema.md`) |
| `scripts/postflight-check.ts` | Run post-flight completion gate (see `references/postflight-checks.md`) |

Both deterministic, testable, CI-reusable. Invoked from agent workflow with resolved state.

## Reliability Rules

- Prefer `standard` unless task clearly fits `simple` or requires `complex`/`research`
- Keep `docs` out of this workflow — run documentation refresh independently
- Treat implement/test as a loop, not isolated phases
- Stop parent execution when decomposition requires splitting
- `task-runner` owns task status transitions when delegated skill doesn't
- Always prefer honest backfill over `tasks update --force`

## Dogfood Rule

When executing a task that modifies `rd3:run-acp`, `rd3:code-verification`, or `rd3:task-runner` itself, force `--channel current` to avoid circular delegation. Without this rule, the skill-under-change could be invoked via ACP routing through its own in-progress modifications, producing unpredictable results.

## Examples

### Standard run

```text
Skill(skill="rd3:task-runner", args="0274 --preset standard")
```

### Compact run for localized change

```text
Skill(skill="rd3:task-runner", args="0274 --preset simple")
```

### Complex run with delegation

```text
Skill(skill="rd3:task-runner", args="0274 --preset complex --channel codex --auto")
```

### Preview workflow shape as JSON

```text
Skill(skill="rd3:task-runner", args="0274 --preset standard --dry-run")
```

### Run with quality gates

```text
Skill(skill="rd3:task-runner", args="0274 --verify")
```

### Scheduled decomposition only

```text
Skill(skill="rd3:task-runner", args="0274 --stage plan-only --auto")
```

### Scheduled implementation after decomposition

```text
Skill(skill="rd3:task-runner", args="0274 --stage implement-only --auto")
```

### Cap retry iterations

```text
Skill(skill="rd3:task-runner", args="0274 --max-loop-iterations 5")
```

## Additional Resources

- **`references/status-transitions.md`** — Guards, backfill templates, state machine, lifecycle bundles
- **`references/decomposition-handoff.md`** — Paths A/B, batch JSON schema, parent-task contract, stage exit envelope
- **`references/channel-delegation.md`** — Channel routing reference (execution owned by `rd3:run-acp`)
- **`references/delegated-prompts.md`** — Plan/Implement/Verify prompt contracts
- **`references/dry-run-schema.md`** — JSON schema for `--dry-run` output
- **`references/postflight-checks.md`** — Post-flight check catalog and verdict schema

## Platform Notes

### Claude Code (primary)

Invoked via a thin command wrapper that calls `Skill(skill="rd3:task-runner", ...)`.

### Other Platforms

Recreate the workflow directly with underlying skills or ACP prompts. Contract:

1. Optional pre-flight verify
2. Optional refine
3. Optional plan (with decomposition handoff)
4. Implement ↔ test loop
5. Verification gate
6. Optional post-flight verify
7. Task status transitions owned by the workflow
