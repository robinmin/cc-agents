---
description: Evaluate and fix skill issues in one step
argument-hint: "<skill-path> [--migrate] [--best-practices] [--llm-refine] [--platform all|claude|codex|openclaw|opencode|antigravity] [--dry-run]"
allowed-tools: ["Read", "Write", "Glob", "Bash"]
---

# Skill Refine

Wraps **rd3:cc-skills** skill.

Evaluate skill issues and apply fixes in one step. **Runs evaluation internally** then applies improvements.

## When to Use

- Fix skill issues in one step (no need to run evaluate separately)
- Apply best practice fixes automatically
- Use LLM to fix style/voice issues
- Migrate existing rd2 skills to rd3

## Expected Results

- Evaluation results showing score and weaknesses
- Applied fixes (deterministic and/or LLM-based)
- Migrated rd2 skills to rd3 format
- Generated platform companion files

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `skill-path` | Path to the skill directory | (required) |
| `--best-practices` | Auto-fix TODOs, Windows paths, formatting | false |
| `--llm-refine` | Use LLM for style/voice fixes | false |
| `--migrate` | Migrate rd2 to rd3 format | false |
| `--dry-run` | Preview changes without applying | false |
| `--platform` | Target platform: all, claude, codex, openclaw, opencode, antigravity | all |

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

## Implementation

Delegates to **rd3:cc-skills** skill:

```
Skill(skill="rd3:cc-skills")
```

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-skills/scripts/refine.ts <skill-path> [options]
```

## Platform Notes

- Claude Code: Use `Skill()` for skill delegation
- Other platforms: Run script directly via Bash tool
