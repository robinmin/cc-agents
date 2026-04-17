---
description: Run a task through the workflow loop with optional gates.
argument-hint: "<task-ref> [--preset <simple|standard|complex|research>] [--channel <current|codex|openclaw|opencode|antigravity|pi|claude-code>] [--auto] [--coverage <n>] [--dry-run] [--verify] [--preflight-verify] [--postflight-verify] [--stage <all|plan-only|implement-only>] [--max-loop-iterations <n>]"
allowed-tools: ["Read", "Glob", "Bash", "Edit", "Skill"]
---

# Dev Run

Execute a task through a **workflow-owned execution loop** with optional pre/post-flight quality gates and staged execution.

Delegate to the `rd3:task-runner` skill. Keep all workflow logic in the skill.

## When to Use

- Run a task from refinement/planning through implementation, testing, and verification
- Validate task file quality before execution (`--preflight-verify`)
- Validate delivery claims before `done` transition (`--postflight-verify`)
- Run staged workflows for scheduler integration (`--stage plan-only` or `--stage implement-only`)

## Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `task-ref` | Yes | — | WBS number or task file path |
| `--preset` | No | task frontmatter or `standard` | Workflow preset: `simple`, `standard`, `complex`, `research` |
| `--channel <name>` | No | `current` | Execution channel override |
| `--auto` | No | `false` | Skip confirmations where supported |
| `--coverage <n>` | No | — | Coverage target for testing |
| `--dry-run` | No | `false` | Emit workflow plan as JSON and exit |
| `--preflight-verify` | No | `false` | Run Stage 0.5 task file structural validation |
| `--postflight-verify` | No | `false` | Run Stage 5 completion-proof gate before `done` |
| `--verify` | No | `false` | Shortcut for `--preflight-verify --postflight-verify` |
| `--stage <value>` | No | `all` | `all`, `plan-only`, `implement-only` |
| `--max-loop-iterations <n>` | No | `3` | Cap for implement ↔ test loop iterations |

## Delegation

Forward `$ARGUMENTS` to the `rd3:task-runner` skill:

```
Skill(skill="rd3:task-runner", args="$ARGUMENTS")
```

## Examples

```bash
# Standard run
/rd3:dev-run 0274 --preset standard

# Compact run for localized change
/rd3:dev-run 0274 --preset simple

# Complex run with delegation
/rd3:dev-run 0274 --preset complex --channel codex --auto

# Preview workflow shape as JSON
/rd3:dev-run 0274 --preset standard --dry-run

# Run with pre + post-flight quality gates
/rd3:dev-run 0274 --verify

# Scheduled decomposition only
/rd3:dev-run 0274 --stage plan-only --auto

# Scheduled implementation after decomposition
/rd3:dev-run 0274 --stage implement-only --auto

# Cap retry iterations
/rd3:dev-run 0274 --max-loop-iterations 5
```

## See Also

- **rd3:task-runner**: Core workflow skill with full contract
- **/rd3:dev-refine**: Improve requirements before execution
- **/rd3:dev-unit**: Testing-focused path
- **/rd3:dev-verify**: Verification-only path
- **/rd3:dev-docs**: Documentation refresh as a separate command
- **rd3:code-implement-common**: Primary implementation skill
- **rd3:sys-testing**: Testing and coverage skill
- **rd3:code-verification**: Review + traceability skill
- **rd3:run-acp**: Cross-channel delegation

## Platform Notes

### Claude Code (primary)

Run the command directly; it invokes the skill via `Skill()` with `$ARGUMENTS` substitution. Do not route through `rd3:orchestration-v2`.

### Other Platforms

Replace `$ARGUMENTS` with the raw invocation arguments — the `$ARGUMENTS` placeholder is Claude-specific. Read `rd3:task-runner` SKILL.md for the platform-agnostic workflow contract and invoke the skill directly.
