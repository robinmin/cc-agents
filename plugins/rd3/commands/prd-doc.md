---
description: Generate PRD document from feature tree
allowed-tools: ["Read", "Glob", "Bash", "Skill"]
---

> **Argument hints:** `[--root <feature-id>]` `[--template standard|onepage|brief]` `[--output <file>]`

# prd-doc

Generate a PRD (Product Requirements Document) from the feature tree. Pure output — no state changes.

## When to Use

- "Generate a PRD for the auth feature" → `--root <id>`
- "Write me a one-pager for this project" → `--template onepage`
- "Export the feature tree as a PRD" → no flags (full tree)

Do NOT use when:
- Need to add features (use `prd-run`)
- Need to adjust priorities (use `prd-adjust`)
- Need to bootstrap the project (use `prd-init`)

## Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `--root` | No | — | Feature ID to scope as subtree (empty = full tree) |
| `--template` | No | `standard` | PRD template: `standard` (10 sections), `onepage` (4 sections), `brief` (5 sections) |
| `--output` | No | stdout | Output file path |

## Template Selection Guide

| Template | Sections | When to Use |
|---|---|---|
| `standard` | 10 | Complex features, 6+ weeks, multiple stakeholders |
| `onepage` | 4 | Simple features, 2-4 weeks, single team |
| `brief` | 5 | Exploration phase, 1 week, validation |

## Examples

| Command | Effect |
|---------|--------|
| `/rd3:prd-doc` | Full-tree PRD with standard template |
| `/rd3:prd-doc --root abc123` | Subtree PRD for specific feature |
| `/rd3:prd-doc --template onepage` | One-page PRD for entire tree |
| `/rd3:prd-doc --template brief --output brief.md` | Feature brief written to file |
| `/rd3:prd-doc --root abc123 --template standard --output prd.md` | Standard PRD for subtree, saved to file |

## Workflow

1. Load features from tree (`ftree ls --root $ROOT --json`)
2. Select template from `templates/prd-{template}.md`
3. Fill template with feature metadata:
   - Problem section ← feature metadata `problem` field
   - Solution section ← feature title + description
   - Success Metrics ← feature metadata `success_criteria`
   - User Stories ← feature metadata `personas` + problem statement
   - Acceptance Criteria ← derived from success criteria
   - Out of Scope ← sibling features NOT in selected subtree
   - Priority ← RICE/MoSCoW scores from metadata
   - Appendix ← RICE scores, MoSCoW categorization
4. Write output to file or stdout

## Delegation

```
Skill(skill="rd3:product-management", args="doc --root $ROOT --template $TEMPLATE --output $OUTPUT")
```

## See Also

- **rd3:prd-run**: Add and decompose features before generating PRD
- **rd3:prd-adjust**: Re-prioritize before generating PRD
- **rd3:product-management**: Source skill with Workflow 3

## Platform Notes

### Claude Code (primary)

Run the command directly. Uses `Skill()` for delegation.

### Other Platforms

Read the skill file and follow the workflow manually. For cross-channel execution, use `rd3-run-acp`.
