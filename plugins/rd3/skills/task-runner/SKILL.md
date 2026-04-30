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
| `--postflight-verify` | No | **`true`** | Run Stage 5 completion-proof full audit (7 checks) before `done`. **Default-on as of v1.1** to close the early-report-complete reliability gap. |
| `--no-postflight-verify` | No | — | Opt out of the Stage 5 full audit (mandatory subset still runs — see Final stage). Use only for known-safe paths (docs-only refresh, dogfood runs modifying `task-runner` itself). |
| `--verify` | No | `false` | Shortcut for `--preflight-verify --postflight-verify` (the latter is already default-on; this primarily enables Stage 0.5) |
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
| `scripts/postflight-check.ts` | Run completion gate. Two modes: `--mandatory-only` (always-on subset of 3 cheap checks before every `Done`) and full audit (7 checks, default-on via `--postflight-verify`; skip with `--no-postflight-verify`). See `references/postflight-checks.md`. |

Both deterministic, testable, CI-reusable. Invoked from agent workflow with resolved state.

## Workflow

Stages execute in order; status transitions are owned by `task-runner`, not delegated skills.

```
Stage 0:    Preflight (always)
Stage 0.5:  Pre-flight Verify  ← when --preflight-verify or --verify
Stage 1:    Optional Refine
Stage 2:    Optional Plan + Decomposition  ← exit point for --stage plan-only
Stage 3:    Implement ↔ Test Loop (bounded)  ← skipped upstream for --stage implement-only
Stage 4:    Verification Gate
Stage 5:    Final / Done  ← always-on mandatory subset + default-on full audit
```

See [`references/workflow.md`](references/workflow.md) for full stage-by-stage semantics, gate thresholds, retry rules, and skip conditions.

## Reliability Rules

- Prefer `standard` unless task clearly fits `simple` or requires `complex`/`research`
- Keep `docs` out of this workflow — run documentation refresh independently
- Treat implement/test as a loop, not isolated phases
- Stop parent execution when decomposition requires splitting
- `task-runner` owns task status transitions when delegated skill doesn't
- Always prefer honest backfill over `tasks update --force`
- **Always-on completion gate**: the mandatory pre-`Done` subset (sections populated, verdict `PASS`, code diff non-empty) runs on every transition regardless of flags. It is the floor, not the ceiling — `--postflight-verify` adds the four remaining checks (testing freshness, drift, coverage, delegation).

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

### Run with all quality gates

`--postflight-verify` is default-on; `--verify` adds the optional Stage 0.5 pre-flight check.

```text
Skill(skill="rd3:task-runner", args="0274 --verify")
```

### Opt out of the post-flight full audit (mandatory subset still runs)

```text
Skill(skill="rd3:task-runner", args="0274 --no-postflight-verify")
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

- **`references/workflow.md`** — Full stage-by-stage workflow (Stage 0–5)
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
6. Post-flight full audit (default-on; skip with `--no-postflight-verify`)
7. Mandatory pre-`Done` subset (always-on; sections, verdict, diff)
8. Task status transitions owned by the workflow

See [Workflow](references/workflow.md) for detailed content.
