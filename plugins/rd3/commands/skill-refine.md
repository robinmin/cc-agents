---
description: Evaluate and fix skill issues in one step
argument-hint: "<skill-path> [description] [--best-practices] [--llm-refine] [--migrate] [--dry-run]"
allowed-tools: ["Read", "Write", "Glob", "Bash"]
---

# Skill Refine

Wraps **rd3:cc-skills** skill.

Run evaluation internally then apply fixes in one step.

## When to Use

- Fix skill issues without running evaluate separately
- Apply best practice fixes automatically
- Use LLM to fix style and voice issues
- Migrate existing rd2 skills to rd3 format
- Clean up a skill after updating its type, docs, or interaction-pattern guidance

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `skill-path` | Path to the skill directory | (required) |
| `description` | Optional free-text goal to guide refinement | (none) |
| `--best-practices` | Auto-fix TODOs, Windows paths, formatting | false |
| `--llm-refine` | Use LLM for style/voice fixes | false |
| `--migrate` | Migrate rd2 to rd3 format | false |
| `--dry-run` | Preview changes without applying | false |
| `--platform` | Target platform: all, claude, codex, openclaw, opencode, antigravity | all |

## Examples

```bash
# Evaluate then apply deterministic fixes (most common)
/rd3:skill-refine ./skills/my-skill --best-practices

# Refine with a goal description
/rd3:skill-refine ./skills/my-skill "REST API scaffolding with OpenAPI integration"

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
