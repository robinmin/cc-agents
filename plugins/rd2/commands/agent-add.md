---
description: Create a new Claude Code Agent subagent with 8-section anatomy and best practices
skills: [rd2:cc-agents, rd2:anti-hallucination]
argument-hint: <plugin-name> <agent-name>
---

# Add New Agent

Thin wrapper for `rd2:cc-agents` skill. Creates production-ready agent skeletons with 8-section anatomy.

## Quick Start

```bash
/rd2:agent-add rd2 rust-expert        # Create agent in rd2 plugin
/rd2:agent-add rd2 ml-architect        # Create agent in rd2 plugin
```

## Arguments

| Argument      | Required | Description                            |
| ------------- | -------- | -------------------------------------- |
| `plugin-name` | Yes      | Target plugin (e.g., "rd", "rd2")      |
| `agent-name`  | Yes      | Agent name (lowercase-hyphens, max 64) |

## Workflow

1. **Define Domain** - Identify expertise area and scope
2. **Generate Skeleton** - Apply 8-section template with domain content
3. **Customize** - Add domain-specific competencies and verification
4. **Validate** - Run evaluation to ensure quality

## Agent Structure (8-Section Anatomy)

| Section         | Target Lines | Purpose              |
| --------------- | ------------ | -------------------- |
| 1. METADATA     | ~15          | Agent identification |
| 2. PERSONA      | ~20          | Role definition      |
| 3. PHILOSOPHY   | ~30          | Core principles      |
| 4. VERIFICATION | ~50          | Anti-hallucination   |
| 5. COMPETENCIES | ~150-200     | Structured memory    |
| 6. PROCESS      | ~40          | Workflow phases      |
| 7. RULES        | ~40          | Guardrails           |
| 8. OUTPUT       | ~30          | Response formats     |
| **Total**       | **400-600**  | **Complete agent**   |

## Example

```bash
# Create agent
/rd2:agent-add rd2 data-engineering

# This generates:
# - plugins/rd2/agents/data-engineering.md
# - With all 8 sections
# - 50+ competency items
# - Verification protocol included
```

## Color Guidelines

| Category          | Colors              |
| ----------------- | ------------------- |
| Language experts  | `blue`, `cyan`      |
| Framework experts | `green`, `teal`     |
| Domain experts    | `magenta`, `purple` |
| Task experts      | `yellow`, `orange`  |
| Quality/Security  | `red`, `crimson`    |

## Frontmatter Validation

**Valid Agent Frontmatter Fields (Official Schema):**

| Field | Required | Options |
|-------|----------|---------|
| `name` | Yes | lowercase-hyphens, 3-50 chars |
| `description` | Yes | Text with `<example>` blocks |
| `model` | Yes | `inherit`, `sonnet`, `opus`, `haiku` |
| `color` | Yes | `blue`, `cyan`, `green`, `yellow`, `magenta`, `red` |
| `tools` | No | Array of tool names |

**DO NOT USE these invalid fields:**
- `agent:` → Use `name:` instead
- `subagents:` → Not in schema
- `orchestrates:` → Not in schema
- `skills:` → Not in schema for agents

## Next Steps

1. Edit generated agent - customize persona and competencies
2. Add domain-specific verification sources
3. Validate: `/rd2:agent-evaluate <agent-file>`
4. Refine: `/rd2:agent-refine <agent-file>`

## Implementation

This command delegates to **rd2:agent-expert** for agent creation:

```python
Task(
    subagent_type="rd2:agent-expert",
    prompt="""Create a new agent following the rd2:agent-expert methodology:

Agent Specifications:
- Plugin: {plugin_name}
- Agent name: {agent_name}
- Domain: {user_description or 'General expertise'}

Generate complete agent file with:
- All 8 sections (METADATA, PERSONA, PHILOSOPHY, VERIFICATION, COMPETENCIES, PROCESS, RULES, OUTPUT)
- 50+ competency items organized by category
- Verification protocol with tool selection decision tree
- Domain-specific rules and guardrails

Output: plugins/{plugin_name}/agents/{agent_name}.md""",
    description="Create {agent_name} agent"
)
```

**Note:** `rd2:agent-expert` internally uses `rd2:cc-agents` skill for domain knowledge.

## See Also

- `/rd2:agent-evaluate` - Assess agent quality (delegates to rd2:agent-doctor)
- `/rd2:agent-refine` - Improve existing agents (delegates to rd2:agent-expert)
- `rd2:agent-expert` - Agent creation specialist
- `rd2:cc-agents` - Agent creation best practices (skill)
