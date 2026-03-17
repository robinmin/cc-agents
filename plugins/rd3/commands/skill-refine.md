---
description: Refine and improve skills with migration support
argument-hint: "<skill-path> [--migrate] [--best-practices] [--llm-refine] [--platform all|claude|codex|openclaw|opencode|antigravity] [--dry-run]"
---

# Skill Refine

Refine and improve skills based on evaluation results, with optional rd2 to rd3 migration.

## When to Use

- Improving skill quality after evaluation
- Migrating existing rd2 skills to rd3 format
- Adding platform-specific companions to existing skills
- Applying best practices fixes

## Examples

```bash
# Migrate rd2 skill to rd3 format
/rd3:skill-refine ./skills/my-skill --migrate

# Apply deterministic best practice fixes
/rd3:skill-refine ./skills/my-skill --best-practices

# Use LLM to refine fuzzy issues
/rd3:skill-refine ./skills/my-skill --llm-refine

# Preview changes without applying
/rd3:skill-refine ./skills/my-skill --dry-run
```

## Options

| Option | Description |
|--------|-------------|
| `--migrate` | Enable rd2 to rd3 migration |
| `--best-practices` | Auto-fix deterministic issues (TODOs, Windows paths) |
| `--llm-refine` | Use LLM for fuzzy issues (requires ANTHROPIC_API_KEY) |
| `--dry-run` | Preview changes without applying |

## Implementation

Delegates to **rd3:cc-skills** skill:

```
Skill(skill="rd3:cc-skills")
```

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-skills/scripts/refine.ts <skill-path> [options]
```

## See Also

- `/rd3:skill-add` - Create new skill
- `/rd3:skill-evaluate` - Evaluate skill quality
