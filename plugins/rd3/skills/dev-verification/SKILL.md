---
name: rd3-ev-verification
description: Task verification combining Phase 7 code review and Phase 8 requirements traceability
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-23
updated_at: 2026-04-07
type: technique
tags: [verification, phase-7, phase-8, code-review, requirements]
metadata:
  author: cc-agents
  platforms: "claude,codex,openclaw,opencode,antigravity"
  category: verification
  interactions: [reviewer, pipeline]
  severity_levels: [blocker, warning, info]
  pipeline_steps: [review, traceability, verdict]
argument-hint: "<task-ref> [--mode <mode>] [--fix-priority <priority>] [--auto] [--channel <backend>]"
allowed-tools: ["Read", "Glob", "Bash", "Edit", "Skill"]
---

# Dev Verification

## Overview

Run final task verification by combining Phase 7 code review, Phase 8 requirements traceability, and an optional remediation loop before marking a task Done.

Wraps **rd3-orchestration-v2** and **rd3-functional-review** skills.

## When to Use

- After implementation, before marking a task Done
- Check code quality and requirements completeness in one pass
- Investigate scope drift between requirements and implementation

## Quick Start

```bash
# Full verification with auto-fix

# Review only (Phase 7)

# Requirements traceability only (Phase 8)
```

## Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `task-ref` | Yes | — | WBS number or task file path |
| `--mode` | No | `full` | `full` (both phases), `review-only` (Phase 7), `func-only` (Phase 8) |
| `--auto` | No | `false` | Skip confirmation before applying fixes |
| `--fix-priority` | No | `blockers-first` | `blockers-first` fixes blocking then re-verifies; `all` fixes everything in one pass |
| `--channel` | No | `auto` | Phase 7 backend: `auto`, `current`, `claude-code`, `codex`, `openclaw`, `opencode`, `antigravity`, or `pi` |

## Workflow

1. Detect the execution platform.
   Claude Code uses `Skill()`. Other platforms use the CLI path directly. If the delegated backend is the thing being fixed, keep Phase 7 inline instead of using unsupported local delegation.
2. Resolve task scope.
   Digits use the configured task resolver. Paths ending in `.md` are read directly. Load frontmatter plus `Requirements`, `Design`, and `Solution`.

```bash
if [[ "$TASK_REF" == *.md ]]; then
  sed -n '1,240p' "$TASK_REF"
else
  tasks show "$TASK_REF"
fi
```

3. Run Phase 7 and Phase 8 in parallel.

Claude Code path:

```bash
Skill(skill="rd3:orchestration-v2", args="$TASK_REF --preset review --channel $CHANNEL")
Skill(skill="rd3:functional-review", args="$TASK_REF")
```

CLI path:

```bash
orchestrator run "$TASK_REF" \
  --preset review \
  --channel "${CHANNEL:-auto}" \
  --auto 2>&1
```

Inline Phase 8 when `Skill()` is unavailable:
- Parse each requirement from the task file
- Search implementation files for `file:line` evidence
- Mark each requirement as `met`, `partial`, or `unmet`
- Derive the overall functional verdict from those results

4. Merge reports.
   Order the output as Phase 7 findings, then Phase 8 traceability, then the final verdict.

5. Apply the mode gate.

| Mode | Behavior |
|------|----------|
| `--mode review-only` | Stop after the Phase 7 report |
| `--mode func-only` | Stop after the Phase 8 report |
| `--mode full` | Continue to the fix pass |

6. Run the optional fix pass.
   Unless `--auto` is set, confirm before editing code.

```text
--fix-priority blockers-first:
  1. Fix all blockers from Phase 7
  2. Run bun run check
  3. If pass -> fix non-blockers
  4. Run bun run check
  5. Report final state

--fix-priority all:
  1. Fix all findings in severity order
  2. Run bun run check
  3. Report final state
```

For each fix batch:
- Apply fixes locally
- Validate with `bun run check`
- If checks pass, continue
- If checks fail, stop and report the failure

If remediation changes code, rerun verification.

7. Produce the final verdict.

| Verdict | Condition |
|---------|-----------|
| **PASS** | Functional review passes and no blocking review findings remain |
| **PARTIAL** | Requirements are partial or only non-blocking review findings remain |
| **FAIL** | Unmet requirements or blocking review findings remain |

Update task status after the verdict:
- `Done` for PASS
- `In Progress` for PARTIAL with the next action noted
- `In Progress` for FAIL with the blocker list noted

## Ownership

| Concern | Owned By |
|---------|----------|
| Code quality, bugs, security, performance | Phase 7 (orchestration-v2) |
| Requirements completeness, traceability, scope drift | Phase 8 (functional-review) |
| Final remediation loop, verdict | Phase 7 + Phase 8 combined |

## Examples

```bash
```

## Platform Notes

### Claude Code

- Use `Skill()` for both delegated phases
- Run the two phase calls concurrently

### Other Platforms

- Use `orchestrator run <task> --preset review --channel <ch> --auto` for Phase 7
- Run Phase 8 inline when `Skill()` is unavailable
- Avoid unsupported `local` delegation; keep the affected phase inline

### Gate Command Standardization

Use `bun run check` as the universal gate command. Do not substitute `bun test` or `bun tsc --noEmit` for the full gate.

## Additional Resources

- [rd3-orchestration-v2](../orchestration-v2/SKILL.md) - Pipeline orchestration
- [rd3-functional-review](../functional-review/SKILL.md) - Requirements traceability
