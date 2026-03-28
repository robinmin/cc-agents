---
description: Refine task requirements via structured quality analysis
argument-hint: "<task-ref> [--auto]"
allowed-tools: ["Read", "Glob", "Bash", "Skill"]
disable-model-invocation: true
---

# Dev Refine

Refine task requirements by analyzing existing content for quality issues and improving them through targeted Q&A.

**Shortcut for:** `/rd3:dev-run {task-ref} --profile refine`

## When to Use

- Task has vague or incomplete Requirements section
- Requirements lack acceptance criteria or testability
- Background section is too brief
- Profile needs to be assigned or validated

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

Delegates to **rd3:orchestration-dev** with refine profile:

```
Skill(skill="rd3:orchestration-dev", args="{task-ref} --profile refine")

# Optional: bypass any future human gates
Skill(skill="rd3:orchestration-dev", args="{task-ref} --profile refine --auto")
```

## Examples

```bash
/rd3:dev-refine 0274
/rd3:dev-refine docs/tasks2/0274_add_dev_slash_commands.md
```

## See Also

- **/rd3:dev-run**: Profile-driven pipeline execution
- **rd3:request-intake**: Requirements elicitation skill
