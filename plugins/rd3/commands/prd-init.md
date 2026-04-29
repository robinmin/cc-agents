---
description: Bootstrap feature tree from existing codebase (one-time)
allowed-tools: ["Read", "Glob", "Bash", "Skill"]
---

> **Argument hints:** `[--mode full|quick]` `[--path <project-path>]`

# prd-init

Bootstrap a feature tree from an existing codebase. One-time entry point for projects that don't have a feature tree yet.

## When to Use

- First time applying product management to an existing project
- Project has code but no feature tree or product documentation
- User says: "initialize product", "bootstrap feature tree", "analyze this project"

Do NOT use when:
- Feature tree already exists (use `prd-run` to add features)
- Need to generate docs (use `prd-doc`)
- Need to adjust priorities (use `prd-adjust`)

## Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `--mode` | No | `full` | Analysis mode: `full` (reverse-engineering) or `quick` (module scan) |
| `--path` | No | `.` | Project root path to analyze |

## Examples

| Command | Effect |
|---------|--------|
| `/rd3:prd-init` | Full analysis of current directory |
| `/rd3:prd-init --mode quick` | Quick module scan of current directory |
| `/rd3:prd-init --path ./my-app` | Full analysis of specified path |
| `/rd3:prd-init --mode quick --path ./my-app` | Quick scan of specified path |

## Workflow

1. Check if feature tree already exists (`ftree ls`). If yes, warn and ask to confirm re-init.
2. Analyze codebase:
   - `full` mode: run `rd3:reverse-engineering` for comprehensive HLD
   - `quick` mode: scan module structure (directories, key files)
3. Extract feature candidates — user-facing capabilities with technical metadata
4. Present to user for validation (confirm / split / merge / rename)
5. Seed feature tree with validated features via `ftree init` + `ftree add`
6. Optional: first prioritization pass

## Delegation

```
Skill(skill="rd3:product-management", args="init --mode $MODE --path $PATH")
```

## See Also

- **rd3:prd-run**: Add features after initialization
- **rd3:prd-doc**: Generate PRD from initialized tree
- **rd3:product-management**: Source skill with Workflow 0

## Platform Notes

### Claude Code (primary)

Run the command directly. Uses `Skill()` for delegation.

### Other Platforms

Read the skill file and follow Workflow 0 manually. For cross-channel execution, use `rd3-run-acp`.
