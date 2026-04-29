---
description: Bootstrap feature tree from existing codebase (one-time)
argument-hint: "[--mode quick|standard|full] [--path <project-path>]"
allowed-tools: ["Read", "Glob", "Bash", "Skill"]
---

> **Argument hints:** `[--mode quick|standard|full]` `[--path <project-path>]`

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
| `--mode` | No | `quick` | Initialization mode: `quick` (module scan), `standard` (HLD), or `full` (HLD + existing task linking) |
| `--path` | No | `.` | Project root path to analyze |

## Examples

| Command | Effect |
|---------|--------|
| `/rd3:prd-init` | Quick module scan of current directory |
| `/rd3:prd-init --mode quick` | Quick module scan of current directory |
| `/rd3:prd-init --mode standard` | Reverse-engineering analysis and HLD-driven feature extraction |
| `/rd3:prd-init --mode full` | Standard analysis plus linking existing task files to generated feature nodes |
| `/rd3:prd-init --path ./my-app` | Quick module scan of specified path |
| `/rd3:prd-init --mode quick --path ./my-app` | Quick scan of specified path |

## Workflow

1. Check if feature tree already exists (`ftree ls`). If yes, warn and ask to confirm re-init.
2. Select initialization mode:
   - `quick`: scan module structure (directories, key files)
   - `standard`: run `rd3:reverse-engineering` for comprehensive HLD
   - `full`: run `standard`, then inspect existing task files and link relevant WBS ids to generated feature nodes
3. Extract feature candidates — user-facing capabilities with technical metadata
4. Present to user for validation (confirm / split / merge / rename)
5. Seed feature tree with validated features via `ftree init` + `ftree add`
6. If `full`, link existing task files to feature nodes via `ftree link`
7. Optional: first prioritization pass

## Delegation

Forward the raw slash-command arguments. Do not expand command-specific wrapper variables before delegation.

```
Skill(skill="rd3:product-management", args="init $ARGUMENTS")
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
