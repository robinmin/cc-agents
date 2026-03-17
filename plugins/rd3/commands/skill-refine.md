---
description: Evaluate and fix skill issues in one step
argument-hint: "<skill-path> [--migrate] [--best-practices] [--llm-refine] [--platform all|claude|codex|openclaw|opencode|antigravity] [--dry-run]"
---

# Skill Refine

Evaluate skill issues and apply fixes in one step. **Runs evaluation internally** then applies improvements.

## What It Does

1. **Runs evaluation** internally to identify issues
2. **Applies deterministic fixes** (TODOs, Windows paths, formatting)
3. **Runs LLM refinement** for fuzzy issues (imperative form, clarity)
4. **Migrates rd2 skills** to rd3 format
5. **Generates platform companions**

## When to Use

- Fix skill issues in one step (no need to run evaluate separately)
- Apply best practice fixes automatically
- Use LLM to fix style/voice issues
- Migrate existing rd2 skills to rd3

## Examples

```bash
# Evaluate + apply deterministic fixes
/rd3:skill-refine ./skills/my-skill --best-practices

# Evaluate + use LLM to refine style
/rd3:skill-refine ./skills/my-skill --llm-refine

# Migrate rd2 skill to rd3 (includes evaluation)
/rd3:skill-refine ./skills/my-skill --migrate

# Preview without applying
/rd3:skill-refine ./skills/my-skill --dry-run
```

## Options

| Option | Description |
|--------|-------------|
| `--best-practices` | Auto-fix TODOs, Windows paths, formatting |
| `--llm-refine` | Use LLM for style/voice fixes |
| `--migrate` | Migrate rd2 to rd3 format |
| `--dry-run` | Preview changes without applying |

## Output

Shows evaluation results, then applied fixes:
```
✓ Evaluation passed (85%)
--- Weaknesses ---
- Missing Overview section
- Uses second-person voice
--- Applied Fixes ---
✓ Added Overview section
✓ Fixed second-person voice
```

## Implementation

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-skills/scripts/refine.ts <skill-path> [options]
```

## See Also

- `/rd3:skill-evaluate` - Evaluate only (no changes) - useful for checking current score
- `/rd3:skill-add` - Create new skill
