---
description: "Migrate and merge skills from one or more sources into a destination skill with LLM-powered conflict resolution"
argument-hint: "--from <path> [--from <path>...] --to <path> [--dry-run] [--apply] [--strict]"
allowed-tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash", "Skill"]
---

# Skill Migrate

Multi-source skill migration tool that extracts content from one or more source skills and merges them into a destination skill. Supports LLM-powered conflict resolution via `rd3:knowledge-extraction`.

## When to Use

- Migrate a skill from one plugin to another (e.g., rd2 to rd3)
- Merge multiple related skills into a unified skill
- Consolidate overlapping skill content with conflict resolution

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `--from <path>` | Source skill path (may be specified multiple times) | (required) |
| `--to <path>` | Destination skill path | (required unless --dry-run) |
| `--dry-run` | Inventory and plan without writing files | true |
| `--apply` | Execute the migration plan and write files | false |
| `--strict` | Block apply if quality gate reports CRITICAL issues | false |

## Path Resolution

| Input Form | Resolution |
|------------|------------|
| `rd2:<skill>` | `plugins/rd2/skills/<skill>/` |
| `rd3:<skill>` | `plugins/rd3/skills/<skill>/` |
| `<bare-name>` | Searches rd3 then rd2; errors if ambiguous |
| `path:<path>` | Exact filesystem path |
| `./relative` or `/absolute` | Standard filesystem path |

## Examples

```bash
# Dry-run migration from rd2 to rd3
/rd3:skill-migrate --from rd2:tasks --to rd3:tasks-new --dry-run

# Multi-source merge with apply
/rd3:skill-migrate --from rd3:cc-skills --from rd3:cc-commands --to /tmp/merged --apply

# Strict mode blocks apply on quality issues
/rd3:skill-migrate --from rd2:tasks --to rd3:tasks-copy --apply --strict
```

## Implementation

Run the migration script directly:

```bash
bun plugins/rd3/skills/cc-skills/scripts/skill-migrate.ts $ARGUMENTS
```

## Phases

1. **Inventory** — Scan each `--from` source for SKILL.md, scripts/, tests/, references/
2. **Merge Planning** — Compare inventories, identify overlapping files and conflicts
3. **Reconciliation** — Resolve conflicts via `rd3:knowledge-extraction` reconciliation engine
4. **Conversion** — Convert Python scripts to TypeScript/Bun
5. **Apply** — Write reconciled files to `--to` destination (if `--apply`)
6. **Report** — Generate `migration-report-<timestamp>.md`
