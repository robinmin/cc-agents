---
description: Capture the current brainstorm conversation as a new task file with feature-tree integration and optional plan synthesis
argument-hint: "[title] [--plan] [--folder <path>] [--tags <a,b>] [--dry-run]"
allowed-tools: ["Read", "Bash", "AskUserQuestion"]
---

# Dev New Task

Convert the in-context conversation (typically after `/rd3:dev-brainstorm`) into a new task file, resolve the owning feature, and optionally synthesize an implementation Plan — all in one pass.

This command delegates to `rd3:feature-planning`, which replaces the two-command sequence (`dev-new-task` → `dev-plan`) when `--plan` is used.

## When to Use

- A brainstorm conversation has reached enough alignment to capture as a task.
- You want to preserve conversation context as a structured task file before it scrolls out of memory.
- You want the task automatically linked to the feature tree.
- You want the Plan section synthesized in the same pass (with `--plan`).

## Arguments

| Arg / Flag | Required | Default | Description |
|---|---|---|---|
| `title` | No | Derived from conversation | Task name (≤80 chars). Omit to auto-derive from context. |
| `--plan` | No | `false` | Synthesize Plan section (bypasses separate `/rd3:dev-plan` call) |
| `--folder <path>` | No | `tasks` config `active_folder` | Target folder override |
| `--tags <a,b>` | No | none | Forwarded to `tasks create --tags` |
| `--dry-run` | No | `false` | Print synthesized markdown; do not create or update any file |

## Workflow

1. **Parse arguments** from `$ARGUMENTS`. Detect `--plan`, `--folder`, `--tags`, `--dry-run`. Everything else is the positional `title`.
2. **Delegate to `rd3:feature-planning`** skill with all parsed arguments. The skill executes:
   - Stage A: Title determination (scope lens for summarization)
   - Stage B: Summarize conversation context (scoped by title)
   - Stage C: Feature-tree resolution (5-tier matching, always skippable)
   - Stage D: Task creation (tasks CLI) — gated by AskUserQuestion for title + preview
   - Stage E: Optional plan synthesis (if `--plan`)
   - Stage F: Feature linking + validation
3. **Report** final WBS, feature link status, and suggested next command.

## Delegation

```
Skill(skill="rd3:feature-planning", args="$ARGUMENTS")
```

## Anti-Hallucination

- Do not invent task content — only synthesize from conversation context.
- Do not fabricate file paths, APIs, or architectural facts in Plan synthesis.
- Mark unverified specifics as `_TBD_`.

## Edge Cases

| Situation | Handling |
|---|---|
| `ftree` unavailable | Skill skips feature linking; task still created |
| Title omitted, context sparse | Skill prompts for title |
| `--dry-run` | Print preview; never mutate files |
| `tasks create` fails | Surface error + rendered body |

## Examples

```bash
# Capture conversation; agent derives title
/rd3:dev-new-task

# Explicit title
/rd3:dev-new-task "Add OAuth support to API"

# With plan synthesis (bypasses /rd3:dev-plan)
/rd3:dev-new-task "Refactor auth" --plan

# Dry-run preview with plan
/rd3:dev-new-task --plan --dry-run

# With folder + tags
/rd3:dev-new-task "Refactor auth" --folder docs/tasks2 --tags refactor,auth
```

## See Also

- **rd3:feature-planning** — Skill that executes the full workflow
- **/rd3:dev-brainstorm** — Upstream ideation that produces the conversation
- **/rd3:dev-plan** — Standalone plan synthesis (needed only when `--plan` not used here)
- **/rd3:dev-run** — Full implement/test/verify pipeline after planning
- **tasks** — Global task-file CLI
