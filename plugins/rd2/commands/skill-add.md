---
description: Create a new Claude Code Agent Skill using the official 6-step skill creation process. Use PROACTIVELY when building new skills, writing SKILL.md files, designing skill workflows, or packaging skills for distribution.
skills:
  - rd2:cc-skills
  - rd2:anti-hallucination
argument-hint: <plugin-name> <skill-name>
---

# Add New Skill

Thin wrapper command for `rd2:skill-expert` agent. Creates skill directories with proper structure following the official 6-step skill creation process documented in rd2:cc-skills.

## Quick Start

```bash
/rd2:skill-add rd2 api-docs          # Create skill in rd2 plugin
/rd2:skill-add rd2 code-review       # Create skill in rd2 plugin
```

## Arguments

| Argument      | Required | Description                            |
| ------------- | -------- | -------------------------------------- |
| `plugin-name` | Yes      | Target plugin (e.g., "rd", "rd2")      |
| `skill-name`  | Yes      | Skill name (lowercase-hyphens, max 64) |

## Workflow

This command follows the official 6-step skill creation process:

1. **Understanding with Concrete Examples** - Gather usage examples from user
2. **Plan Reusable Contents** - Identify scripts/references/assets needed
3. **Create Skill Structure** - Initialize directory with init script
4. **Edit the Skill** - Write SKILL.md and create resources
5. **Validate and Test** - Check structure, triggers, writing style
6. **Iterate** - Improve based on evaluation feedback

## Example

```bash
# Create skill
/rd2:skill-add rd2 data-pipeline
```

## What Gets Created

```
plugin-name/skills/skill-name/
├── SKILL.md              # Main skill file (frontmatter + content)
├── references/           # Detailed documentation (optional)
├── examples/             # Working code examples (optional)
└── scripts/              # Executable utilities (optional)
```

## Next Steps

1. **Edit SKILL.md** - Add domain-specific content and workflows
2. **Add resources** - Create references/, examples/, scripts/ as needed
3. **Validate** - Run `/rd2:skill-evaluate <skill-name>` to check quality
4. **Iterate** - Address findings until Grade A/B achieved
5. **Test** - Verify skill triggers on expected queries

## Implementation

This command delegates to the **rd2:skill-expert** agent for skill creation:

```
Task(
    subagent_type="rd2:skill-expert",
    prompt="""Create a new skill in plugin '{plugin_name}':

Skill name: {skill_name}

Follow the official 6-step skill creation process:
1. Understanding with Concrete Examples
2. Plan Reusable Contents
3. Create Skill Structure
4. Edit the Skill
5. Validate and Test
6. Iterate

Initialize skill directory with:
- SKILL.md with proper frontmatter
- references/ (optional)
- examples/ (optional)
- scripts/ (optional)

Follow rd2:cc-skills best practices.
   """,
    description="Create {skill_name} skill in {plugin_name}"
)
```

## See Also

- `rd2:skill-expert` - Agent that handles skill creation
- `/rd2:skill-evaluate` - Assess skill quality (delegates to skill-doctor)
- `/rd2:skill-refine` - Improve existing skills
- `rd2:cc-skills` - Best practices reference with detailed guides
- `rd2:skill-doctor` - Quality evaluator agent
