---
description: Create a new skill with scaffolding
argument-hint: "<skill-name> [--template <type>] [--resources <list>] [--platform <name>]"
---

# Skill Add

Create a new skill directory with templates and platform-specific companions.

## When to Use

- Creating a new skill from scratch
- Scaffolding a skill directory with proper structure
- Setting up platform-specific companion files

## Usage

```bash
/rd3:skill-add <skill-name> [options]
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--template <type>` | Template type: technique, pattern, reference | technique |
| `--resources <list>` | Comma-separated: scripts,references,assets | (none) |
| `--platform <name>` | Target platform: all, claude, codex, openclaw | all |
| `--path <dir>` | Output directory | ./skills |
| `--examples` | Include example files in resource directories | false |

## Examples

```bash
# Create a technique skill with all resources
/rd3:skill-add my-api-helper --template technique --resources scripts,references,assets --examples

# Create a pattern skill for Claude Code only
/rd3:skill-add decision-framework --template pattern --platform claude

# Create a reference skill with scripts only
/rd3:skill-add api-reference --template reference --resources scripts --path ./docs/skills
```

## Workflow

This command invokes the scaffold.ts script to:

1. **Validate** skill name (lowercase hyphen-case, max 64 chars)
2. **Create** skill directory structure
3. **Generate** SKILL.md from template
4. **Create** platform-specific companions (agents/openai.yaml for Codex)
5. **Create** resource directories with optional example files

## Next Steps

After running this command:

1. Edit SKILL.md to complete the TODO items
2. Update the description to include when to use the skill
3. Add resources to scripts/, references/, assets/ as needed
4. Run validation: `/rd3:skill-evaluate <path> --scope basic`
5. Test the skill with realistic user requests

## Related Commands

- `/rd3:skill-evaluate` - Validate and evaluate skill quality
- `/rd3:skill-refine` - Improve skill based on evaluation results
