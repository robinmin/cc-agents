---
description: Adjust feature priorities and status with HITL
allowed-tools: ["Read", "Glob", "Bash", "Skill"]
---

> **Argument hints:** `[--prioritize]` `[--status <new-status>]` `[--root <feature-id>]` `[--method rice|moscow]` `[--auto]`

# prd-adjust

Modify volatile state in the feature tree with human-in-the-loop. Non-volatile config (default strategy, metadata schema) lives in AGENTS.md — this command does NOT touch it.

## When to Use

- "Re-prioritize the backlog" → `--prioritize`
- "Move this feature to validated" → `--status validated`
- "Re-score these features with MoSCoW" → `--prioritize --method moscow`

Do NOT use when:
- Need to add a new feature (use `prd-run`)
- Need to change feature title/description (set at intake, not adjustable)
- Need to change decomposition strategy (set at decompose time, not adjustable)
- Need to generate docs (use `prd-doc`)

## Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `--prioritize` | No | `false` | Run prioritization on features |
| `--status` | No | — | Change feature status: `backlog`, `validated`, `executing`, `done` |
| `--root` | No | — | Limit to subtree rooted at this feature ID |
| `--method` | No | `rice` | Prioritization method (only with `--prioritize`): `rice` or `moscow` |
| `--auto` | No | `false` | Skip HITL confirmation for status changes |

## What IS Modifiable (Volatile State)

| State | Flag | Example |
|---|---|---|
| RICE/MoSCoW scores | `--prioritize` | Re-score all backlog features |
| Feature status | `--status` | Move feature from backlog to validated |
| Priority order | `--prioritize` | Re-rank by updated scores |

## What is NOT Modifiable (Non-Volatile, Config-Driven)

| State | Why Not | Where It Lives |
|---|---|---|
| Decomposition strategy | Set at decompose time | Task file metadata |
| Feature title/description | Set at intake | ftree node |
| Metadata schema | Project config | AGENTS.md |
| Feature hierarchy | Structural | Use `ftree move` directly |

## Examples

| Command | Effect |
|---------|--------|
| `/rd3:prd-adjust --prioritize` | Re-score all backlog features with RICE |
| `/rd3:prd-adjust --prioritize --method moscow` | Re-score with MoSCoW categories |
| `/rd3:prd-adjust --prioritize --root abc123` | Re-score subtree only |
| `/rd3:prd-adjust --status validated` | Move features to validated (with confirmation) |
| `/rd3:prd-adjust --status validated --auto` | Move to validated without confirmation |
| `/rd3:prd-adjust --prioritize --status validated` | Re-score then change status |

## Workflow

1. Load features from tree (`ftree ls --root $ROOT --json`)
2. If `--prioritize`:
   - Run RICE or MoSCoW scoring on loaded features
   - Present scores to user for review
   - Store scores in ftree metadata
3. If `--status`:
   - Validate status transition is legal
   - Show affected features to user
   - Confirm (unless `--auto`) and update status
4. Output: summary of changes made

## Delegation

```
Skill(skill="rd3:product-management", args="adjust --prioritize --method $METHOD --status $STATUS --root $ROOT --auto")
```

## See Also

- **rd3:prd-run**: Add and decompose features (sets initial state)
- **rd3:prd-doc**: Generate PRD with current scores
- **rd3:product-management**: Source skill with Workflow 2

## Platform Notes

### Claude Code (primary)

Run the command directly. Uses `Skill()` for delegation.

### Other Platforms

Read the skill file and follow the workflow manually. For cross-channel execution, use `rd3-run-acp`.
