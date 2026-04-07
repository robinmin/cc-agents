---
description: Verify task implementation via Phase 7 code review + Phase 8 requirements traceability
argument-hint: "<task-ref> [--mode <mode>] [--fix-priority <blockers-first|all>] [--auto] [--channel <backend>]"
allowed-tools: ["Read", "Glob", "Bash", "Edit", "Skill"]
---

# Dev Verify

Task verification command. Delegates to `rd3:dev-verification` agent skill.

## Usage

```
/rd3:dev-verify <task-ref> [--mode <mode>] [--fix-priority <priority>] [--auto] [--channel <backend>]
```

## Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `task-ref` | Yes | — | WBS number or task file path |
| `--mode` | No | `full` | `full`, `review-only`, `func-only` |
| `--auto` | No | `false` | Skip confirmation before applying fixes |
| `--fix-priority` | No | `blockers-first` | `blockers-first` or `all` |
| `--channel` | No | `auto` | Phase 7 backend |

## Delegation

This command delegates all work to the `rd3:dev-verification` agent skill.

See: `plugins/rd3/skills/dev-verification/SKILL.md`
