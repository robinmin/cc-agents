---
description: Generate and update documentation based on task changes
argument-hint: "<task-ref> [--auto]"
allowed-tools: ["Read", "Glob", "Bash", "Skill"]
disable-model-invocation: true
---

# Dev Docs

Execute phase 9 (Documentation) of the 9-phase pipeline. Generates and updates documentation based on implementation artifacts.

**Shortcut for:** `/rd3:dev-run {task-ref} --profile docs`

## When to Use

- After implementation and review are complete
- Task file has documentation artifacts to generate
- Updating project docs based on code changes

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

Delegates to **rd3:orchestration-dev** with docs profile:

```
Skill(skill="rd3:orchestration-dev", args="{task-ref} --profile docs --auto")
```

## Examples

```bash
/rd3:dev-docs 0274
/rd3:dev-docs 0274 --auto
```

## See Also

- **/rd3:dev-run**: Profile-driven pipeline execution
- **rd3:code-docs**: Documentation generation skill
