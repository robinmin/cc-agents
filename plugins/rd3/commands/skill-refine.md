---
description: "Evaluate and fix skill issues in one step"
argument-hint: "<skill-path> [description] [--migrate] [--dry-run]"
allowed-tools: ["Read", "Write", "Glob", "Bash", "Skill"]
---

# Skill Refine

Wraps **rd3:cc-skills** skill.

Run evaluation internally then apply fixes in one step. **Best practices auto-fixes are enabled by default.**

## When to Use

- Fix skill issues without running evaluate separately
- Apply deterministic fixes automatically (best practices enabled by default)
- Migrate existing rd2 skills to rd3 format
- Clean up a skill after updating its type, docs, or interaction-pattern guidance

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `skill-path` | Path to the skill directory | (required) |
| `description` | Optional free-text goal to guide refinement | (none) |
| `--migrate` | Migrate rd2 to rd3 format | false |
| `--dry-run` | Preview changes without applying | false |
| `--platform` | Target platform: all, claude, codex, openclaw, opencode, antigravity | all |
| `--no-best-practices` | Disable best practice auto-fixes | false |

# Skill Refine

Wraps **rd3:cc-skills** skill.

Run evaluation internally then apply fixes in one step.

## When to Use

- Fix skill issues without running evaluate separately
- Apply deterministic fixes automatically
- Migrate existing rd2 skills to rd3 format
- Clean up a skill after updating its type, docs, or interaction-pattern guidance

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `skill-path` | Path to the skill directory | (required) |
| `description` | Optional free-text goal to guide refinement | (none) |
| `--migrate` | Migrate rd2 to rd3 format | false |
| `--dry-run` | Preview changes without applying | false |
| `--platform` | Target platform: all, claude, codex, openclaw, opencode, antigravity | all |

## Examples

```bash
# Evaluate then apply fixes (most common)
/rd3:skill-refine ./skills/my-skill

# Migrate rd2 skill to rd3 format
/rd3:skill-refine ./skills/my-skill --migrate

# Preview changes without applying
/rd3:skill-refine ./skills/my-skill --dry-run
```

## Implementation

Pass `$ARGUMENTS` to the underlying skill for processing.

Delegates to **rd3:cc-skills** skill:

```
Skill(skill="rd3:cc-skills", args="refine $ARGUMENTS")
```

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-skills/scripts/refine.ts $ARGUMENTS
```

## Platform Notes

- Claude Code: Invoke via `Skill()` delegation
- Other platforms: Run script directly via Bash tool
