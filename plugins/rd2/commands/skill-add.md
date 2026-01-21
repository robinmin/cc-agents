---
description: Create a new Claude Code Agent Skill with templates and best practices
skills: [rd2:cc-skills, rd2:anti-hallucination]
argument-hint: <plugin-name> <skill-name>
---

# Add New Skill

Thin wrapper for `rd2:cc-skills` skill. Creates skill directories with proper structure.

## Quick Start

```bash
/rd2:skill-add rd api-docs           # Create skill in rd plugin
/rd2:skill-add rd2 code-review       # Create skill in rd2 plugin
```

## Arguments

| Argument      | Required | Description                            |
| ------------- | -------- | -------------------------------------- |
| `plugin-name` | Yes      | Target plugin (e.g., "rd", "rd2")      |
| `skill-name`  | Yes      | Skill name (lowercase-hyphens, max 64) |

## Workflow

1. **Validate** - Check name format and uniqueness
   - Verify plugin exists at `plugins/<plugin-name>/.claude/plugin.json`
   - Check skill doesn't already exist at `plugins/<plugin-name>/skills/<skill-name>`
2. **Initialize** - Run `python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py init` (see `rd2:cc-skills` for details)
3. **Update plugin.json** - Add skill name into the attribute `skills` in `plugins/<plugin-name>/.claude/plugin.json`
4. **Customize** - Edit SKILL.md with specific content

## Example

```bash
# Create skill
/rd2:skill-add rd2 data-pipeline
```

## Next Steps

1. Edit SKILL.md - complete TODO items
2. Delete unused example files
3. Validate: `/rd2:skill-evaluate <skill-name>`
4. Refine: `/rd2:skill-refine <skill-name>`

## See Also

- `/rd2:skill-evaluate` - Assess skill quality
- `/rd2:skill-refine` - Improve existing skills
- `rd2:cc-skills` - Best practices reference
