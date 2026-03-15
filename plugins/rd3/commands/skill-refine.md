---
description: Refine and improve skills with migration support
argument-hint: "<skill-path> [--migrate] [--platform <name>] [--dry-run]"
---

# Skill Refine

Refine and improve skills based on evaluation results, with optional rd2 to rd3 migration.

## When to Use

- Improving skill quality after evaluation
- Migrating existing rd2 skills to rd3 format
- Adding platform-specific companions to existing skills
- Applying best practices fixes

## Usage

```bash
/rd3:skill-refine <skill-path> [options]
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--migrate` | Enable rd2 to rd3 migration mode | false |
| `--platform <name>` | Target platform: all, claude, codex, openclaw, opencode, antigravity | all |
| `--dry-run` | Show what would be changed without making changes | false |
| `--verbose, -v` | Show detailed output | false |

## Migration Mode

When `--migrate` is enabled, the following transformations are applied:

| rd2 Feature | Detection | Migration Action |
|-------------|-----------|------------------|
| Missing `name:` field | Frontmatter check | Add explicit `name:` from directory |
| Missing `platforms:` | Frontmatter check | Add `metadata.platforms` field |
| Missing `openclaw:` | Frontmatter check | Add `metadata.openclaw` with defaults |
| No Platform Notes | Content check | Add Platform Notes section |

## Examples

```bash
# Migrate an rd2 skill to rd3 format
/rd3:skill-refine ./skills/my-skill --migrate

# Add Codex and OpenClaw companions
/rd3:skill-refine ./skills/my-skill --platform codex,openclaw

# Preview changes without applying
/rd3:skill-refine ./skills/my-skill --dry-run --verbose

# Full migration with all platforms
/rd3:skill-refine ./skills/my-skill --migrate --platform all
```

## Workflow

This command:

1. **Analyzes** current skill structure
2. **Migrates** rd2-specific patterns (if --migrate)
3. **Generates** platform-specific companions
4. **Reports** all changes made

## Output

The command outputs:
- Migration actions taken
- Generated companion files
- Any errors encountered

## Exit Codes

- `0` - Refinement completed successfully
- `1` - Refinement failed

## Related Commands

- `/rd3:skill-add` - Create new skill
- `/rd3:skill-evaluate` - Evaluate skill quality

## Implementation

To execute this command, the AI agent should choose the appropriate execution path based on its environment:

### For Claude Code
Use the `rd2:skill-expert` subagent:
```python
Task(
    subagent_type="rd2:skill-expert",
    prompt="Refine skill at {skill_path} with migrate flag {migrate} and platform {platform} using the scripts at ${CLAUDE_PLUGIN_ROOT:-.}/plugins/rd3/skills/cc-skills/scripts/refine.ts",
    description="Refine skill {skill_path}"
)
```

### For Other Coding Agents (Codex, Antigravity, OpenCode, OpenClaw)
Explicitly use the terminal or bash execution tool to run the TypeScript script directly:
```bash
bun ./plugins/rd3/skills/cc-skills/scripts/refine.ts <skill-path> [--migrate] [--platform <name>] [--dry-run]
```
