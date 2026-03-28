---
description: Execute architecture, design, and task decomposition for a task
argument-hint: "<task-ref> [--auto]"
allowed-tools: ["Read", "Glob", "Bash", "Skill"]
disable-model-invocation: true
---

# Dev Plan

Execute phases 2-4 of the 9-phase pipeline: Architecture, Design, and Task Decomposition.

**Shortcut for:** `/dev-run {task-ref} --profile plan`

## When to Use

- After requirements are refined (via `/dev-refine`)
- Task needs architecture and design before implementation
- Breaking down a task into implementable subtasks

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `task-ref` | Yes | WBS number or file path |
| `--auto` | No | Auto-approve gates |

### Smart Positional Detection

| Input Pattern | Detection | Example |
|---------------|-----------|---------|
| Digits only | WBS number | `0274` |
| Ends with `.md` | File path | `docs/tasks2/0274_*.md` |

## Workflow

Delegates to **rd3:orchestration-dev** with plan profile:

```
Skill(skill="rd3:orchestration-dev", args="{task-ref} --profile plan --auto")
```

## Examples

```bash
/dev-plan 0274
/dev-plan docs/tasks2/0274_add_dev_slash_commands.md
```

## See Also

- **/dev-run**: Profile-driven pipeline execution
- **/dev-refine**: Refine requirements (phase 1)
