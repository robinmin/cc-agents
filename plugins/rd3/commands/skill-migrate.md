---
description: "Migrate and merge skills from one or more sources into a destination skill via rd3:cc-skills migrate operation with LLM-powered content refinement"
argument-hint: "--from <path> [--from <path>...] --to <path> [description] [--dry-run] [--apply] [--strict] [--force]"
allowed-tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash", "Skill"]
---

# Skill Migrate

Multi-source skill migration tool that extracts content from one or more source skills and merges them into a destination skill. Supports LLM-powered conflict resolution via `rd3:knowledge-extraction`.

## When to Use

- Migrate a skill from one plugin to another (e.g. rd2 to rd3)
- Merge multiple related skills into a unified skill
- Consolidate overlapping skill content with conflict resolution
- Absorb useful content from a source skill into an existing destination skill

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `description` | Optional free-text goal to guide LLM content refinement in Phase 5 (e.g. "absorb the emerging patterns section", "focus on deduplication and conciseness") | (none) |
| `--from <path>` | Source skill path (may be specified multiple times) | (required) |
| `--to <path>` | Destination skill path (filesystem path, not a skill name) | (required unless --dry-run) |
| `--dry-run` | Inventory and plan without writing files | true |
| `--apply` | Execute the migration plan and write files | false |
| `--strict` | Block apply if evaluate.ts score < 70 (runs evaluate.ts --scope full --json) | false |
| `--force` | Allow overwriting existing destination files | false |

## Path Resolution

**`--from` supports skill-name shortcuts and filesystem paths:**

| Input Form | Resolution |
|------------|------------|
| `rd2:<skill>` | `plugins/rd2/skills/<skill>/` |
| `rd3:<skill>` | `plugins/rd3/skills/<skill>/` |
| `<bare-name>` | Searches rd3 then rd2; errors if ambiguous |
| `path:<path>` | Exact filesystem path |
| `~/...`, `~` | Tilde expansion to user home directory |
| `vendors/...`, `./`, `../` | Relative to current working directory |

**`--to` is always a filesystem path — never a skill name lookup:**

| Input Form | Resolution |
|------------|------------|
| `/absolute/path` | Exact absolute path |
| `~/...`, `~` | Tilde expansion to user home directory |
| `vendors/...`, `./`, `../` | Relative to current working directory |
| `path:<path>` | Exact filesystem path |

## Examples

```bash
# Dry-run migration from rd2 to rd3
/rd3:skill-migrate --from rd2:tasks --to rd3:tasks-new --dry-run

# Multi-source merge with apply
/rd3:skill-migrate --from rd3:cc-skills --from rd3:cc-commands --to /tmp/merged --apply

# Migrate with description to guide LLM content refinement
/rd3:skill-migrate "absorb emerging patterns, deduplicate capabilities" --from vendors/new-skill --to plugins/rd3/skills/my-skill --apply

# Migrate from vendor skill into existing rd3 skill (detects conflicts)
/rd3:skill-migrate --from vendors/my-skill --to plugins/rd3/skills/my-skill --apply --force

# Strict mode blocks apply on quality issues
/rd3:skill-migrate --from rd2:tasks --to rd3:tasks-copy --apply --strict
```

## When Destination Has Conflicts

If a source file has the same relative path as a file already at the destination (e.g. both have `SKILL.md`), the script:

1. **Detects** the conflict during merge planning
2. **Reconcilies** both versions via `rd3:knowledge-extraction` — section-level merge that preserves unique content from each source
3. **Reports** the conflict and resolution in the migration report
4. **Blocks** apply unless `--force` is set (prevents silent overwrites)

Always run `--dry-run` first to review what conflicts exist before applying.

## Implementation

Route through the cc-skills skill:

```
Skill(skill="rd3:cc-skills", args="migrate [description] --from <path>... --to <path> [--dry-run] [--apply] [--strict] [--force]")
```

The `description` argument is forwarded to the invoking agent as guidance for Phase 5 LLM content refinement.

This delegates to the migrate workflow defined in [references/workflows.md](../skills/cc-skills/references/workflows.md#migrate-workflow), which orchestrates the migration script and LLM content refinement.

## Phases

| Phase | Handler | Description |
|-------|---------|-------------|
| 1-4 | `skill-migrate.ts` (script) | Inventory, merge planning, reconciliation, conversion |
| 5 | LLM (invoking agent) | Content refinement guided by `description` — resolves TODO markers, deduplicates, improves coherence |
| 6 | `evaluate.ts` (script) | Validate migrated skill quality |

**Phases 1-4 (deterministic script):**
1. **Inventory** — Scan each `--from` source for SKILL.md, scripts/, tests/, references/
2. **Merge Planning** — Compare inventories across sources AND against existing destination files; identify overlapping files and destination conflicts
3. **Reconciliation** — Resolve conflicts via `rd3:knowledge-extraction` reconciliation engine (handles both multi-source conflicts and source-vs-destination conflicts)
4. **Conversion** — Convert Python scripts to TypeScript/Bun
5. **Apply** — Write reconciled files to `--to` destination (if `--apply`)
6. **Report** — Generate `migration-report-<timestamp>.md`

**Phase 5 (LLM content refinement — agent):**
After phases 1-4, the invoking agent uses LLM to improve merged content: resolves `// TODO: Convert import` markers, fixes tone shifts, resolves semantic contradictions, ensures voice consistency.

**Phase 6 (validation — script):**
Runs `evaluate.ts --scope full` to score migrated skill. Score < 70 triggers retry of Phase 5 (max 2 retries).
