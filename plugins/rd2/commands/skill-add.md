---
description: Create a new Claude Code Agent Skill using the official 6-step skill creation process. Use PROACTIVELY when building new skills, writing SKILL.md files, designing skill workflows, or packaging skills for distribution.
argument-hint: <plugin-name> <skill-name> [--type technique|pattern|reference]
---

# Add New Skill

Thin wrapper command for `rd2:skill-expert` agent. Creates skill directories with proper structure following the official 6-step skill creation process documented in rd2:cc-skills.

## Quick Start

```bash
/rd2:skill-add rd2 api-docs --type reference    # API docs skill
/rd2:skill-add rd2 debugging --type technique   # Step-by-step method
/rd2:skill-add rd2 architecture --type pattern  # Mental model/decisions
/rd2:skill-add rd2 code-review                  # Generic (no type)
```

## Arguments

| Argument      | Required | Description                            |
| ------------- | -------- | -------------------------------------- |
| `plugin-name` | Yes      | Target plugin (e.g., "rd", "rd2")      |
| `skill-name`  | Yes      | Skill name (lowercase-hyphens, max 64) |
| `--type`      | No       | Template type (see table below)        |

### Skill Types

| Type        | Use For                                                    | Template                      |
| ----------- | ---------------------------------------------------------- | ----------------------------- |
| `technique` | Concrete steps, debugging methods, repeatable processes    | `skill-template-technique.md` |
| `pattern`   | Mental models, architectural decisions, ways of thinking   | `skill-template-pattern.md`   |
| `reference` | API docs, syntax guides, tool documentation                | `skill-template-reference.md` |
| `mcp`       | Skills that enhance MCP tool access with workflow guidance | `skill-template-mcp.md`       |

If `--type` is omitted, the generic `skill-template.md` is used.

### 5 Official Skill Patterns

The official Claude Skills Guide documents 5 proven patterns (see `references/skill-patterns.md`):

| Pattern                      | Use Case                               |
| ---------------------------- | -------------------------------------- |
| Sequential Workflow          | Multi-step processes in specific order |
| Multi-MCP Coordination       | Workflows spanning multiple services   |
| Iterative Refinement         | Quality loops with validation scripts  |
| Context-Aware Tool Selection | Decision trees for tool choice         |
| Domain-Specific Intelligence | Embedded compliance, audit trails      |

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
# Create technique skill (concrete steps)
/rd2:skill-add rd2 data-pipeline --type technique

# Create reference skill (API docs)
/rd2:skill-add rd2 sql-syntax --type reference
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
Type: {type or 'generic'}

Follow the official 6-step skill creation process:
1. Understanding with Concrete Examples
2. Plan Reusable Contents
3. Create Skill Structure (use --type {type} if specified)
4. Edit the Skill (complete TODO markers)
5. Validate and Test
6. Iterate

Initialize with:
python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py init {skill_name} --path {plugin_path}/skills [--type {type}]

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
