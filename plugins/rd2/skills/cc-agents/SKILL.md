---
name: cc-agents
description: Meta-skill for creating, evaluating, and refining Claude Code Agent subagents. Use when: building new subagents, writing agent definition files, evaluating agent quality, or refining existing agents. Follows 8-section anatomy, verification-first development, and agent-specific quality assessment.
---

# cc-agents: Claude Code Agent Subagents

## Overview

Create, evaluate, and refine Claude Code Agent subagents that extend AI capabilities with specialized knowledge and workflows. Use this skill when building new subagents, evaluating agent quality, or improving existing agents.

## Quick Start

```bash
# Evaluate an existing agent (comprehensive quality assessment)
python3 /Users/robin/.claude/plugins/cache/cc-agents/rd2/0.2.1/skills/cc-skills/scripts/skills.py evaluate /path/to/plugin/agents/my-agent.md

# Create a new agent from template
rd2:agent-add my-domain-expert

# Refine an existing agent
rd2:agent-refine /path/to/plugin/agents/my-agent.md

# List all agents in a plugin
rd2:agent-list
```

## Workflows

### Creating an Agent

**Task Progress:**
- [ ] **Step 1: Define Domain** - Identify expertise area, scope boundaries, target users
- [ ] **Step 2: Plan Structure** - Map 8-section anatomy (400-600 lines target)
- [ ] **Step 3: Generate Skeleton** - Use templates with domain-specific content
- [ ] **Step 4: Enumerate Competencies** - Create 50+ items across 4-5 categories
- [ ] **Step 5: Define Verification** - Domain-specific fact-checking protocol
- [ ] **Step 6: Add Rules** - 8+ DO and 8+ DON'T absolute rules
- [ ] **Step 7: Validate** - Run evaluation checklist
- [ ] **Step 8: Iterate** - Address findings, re-evaluate until passing

### Evaluating an Agent

**Evaluation Dimensions:**

| Dimension | Weight | What It Measures |
|-----------|--------|------------------|
| Structure | 20% | All 8 sections present, 400-600 total lines |
| Verification | 25% | Complete protocol with red flags, fallbacks |
| Competencies | 20% | 50+ items across categories, properly categorized |
| Rules | 15% | 8+ DO and 8+ DON'T |
| Auto-Routing | 10% | "Use PROACTIVELY for" present with keywords |
| Examples | 10% | 2-3 examples with commentary |

**Passing Score:** >= 80/100

### Refining an Agent

**Use this workflow:**

1. **Evaluate current quality** - Identify gaps and issues
2. **Review findings** - Check all dimensions, especially low scores
3. **Determine action**:
   - Structure issues? → Add missing sections, adjust line counts
   - Content gaps? → Expand competency lists, add workflows
   - Verification weak? → Add red flags, source priority, fallbacks
   - Rules incomplete? → Add DO and DON'T rules
4. **Implement fixes** - Edit agent file
5. **Re-evaluate** - Run evaluation again
6. **Repeat** - Continue until passing score achieved

### Example: Creating a Python Expert Agent

**Step 1 - Define Domain:**
- Expertise: Python programming, testing, async, decorators
- Scope: Code generation, debugging, best practices
- Target: Developers working on Python projects

**Step 2-3 - Generate Skeleton:**
```yaml
---
name: python-expert
description: |
  Senior Python expert. Use PROACTIVELY for python, pytest, async, decorator, generator, type hint.

  <example>
  Context: User asks about implementing async functionality
  user: "How do I make this function async?"
  assistant: "I'll help you convert this to async. Let me first check the current implementation..."
  <commentary>User needs async Python guidance - this agent specializes in Python patterns</commentary>
  </example>

tools: [Read, Write, Edit, Grep, Glob, WebSearch, WebFetch]
model: inherit
color: blue
---
```

**Step 4 - Enumerate Competencies (excerpt):**
```markdown
### Core Python
- async/await patterns
- Type hints (PEP 484, 585, 612)
- Decorators (@property, @staticmethod, @lru_cache)
- Context managers (with statements)
- Generators and yield expressions

### Testing
- pytest fixtures and parametrization
- unittest.mock for mocking
- pytest-asyncio for async tests
- coverage.py integration
```

**Step 5-6 - Complete agent and validate.**

## Architecture: Fat Skills, Thin Wrappers

Follow the **Fat Skills, Thin Wrappers** pattern:

- **Skills** contain all core logic, workflows, and domain knowledge
- **Commands** are minimal wrappers (~50 lines) that invoke skills for human users
- **Agents** are minimal wrappers (~100 lines) that invoke skills for AI workflows

### Hybrid Approach for Complex Orchestration

**Command Layer (.md files)** - Use pseudocode with built-in tools (Task, SlashCommand, AskUserQuestion), explicit workflow sequences, self-documenting specifications

**Agent Layer (.md agents)** - Use flexible natural language with conditional logic, adaptive behavior, error handling and retries

### Built-in Tools for Orchestration

| Tool              | Purpose                | Example                                              |
| ----------------- | ---------------------- | ---------------------------------------------------- |
| `Task`            | Delegate to subagent   | `Task(subagent_type="super-planner", prompt="...")`  |
| `SlashCommand`    | Call another command   | `SlashCommand(skill="rd2:tasks-refine", args="...")` |
| `AskUserQuestion` | Interactive user input | Ask clarifying questions with options                |

## Agent Structure (8-Section Anatomy)

### Summary

Every Claude Code Agent subagent follows the 8-section anatomy. For detailed specifications, see **[`references/agent-anatomy.md`](references/agent-anatomy.md)**.

| Section | Lines | Purpose | Key Elements |
|---------|-------|---------|--------------|
| 1. METADATA | ~15 | Agent identification | name, description, tools, model, color |
| 2. PERSONA | ~20 | Role definition | Background, expertise, approach |
| 3. PHILOSOPHY | ~30 | Core principles | 4-6 principles, design values |
| 4. VERIFICATION | ~50 | Anti-hallucination | Red flags, sources, confidence, fallbacks |
| 5. COMPETENCIES | ~150-200 | Structured memory | 50+ items across 4-5 categories |
| 6. PROCESS | ~40 | Workflow phases | Diagnose, Solve, Verify |
| 7. RULES | ~40 | Guardrails | DO and DON'T lists |
| 8. OUTPUT | ~30 | Response formats | Templates with confidence |

**Total: 400-600 lines**

### Metadata Requirements

**Frontmatter fields:**

- `name` (required): lowercase-hyphens, 3-50 chars, alphanumeric start/end
- `description` (required): Include "Use PROACTIVELY for" + 2-3 `<example>` blocks with commentary
- `model` (required): `inherit` (recommended), `sonnet`, `opus`, `haiku`
- `color` (required): See [Color Guidelines](#color-guidelines)
- `tools` (optional): Restrict agent to specific tools (default: all tools)

**Description format:**
```yaml
description: |
  Senior {Domain} expert. Use PROACTIVELY for {trigger-keywords}.

  <example>
  Context: {situation}
  user: "{request}"
  assistant: "{response}"
  <commentary>{why-agent-triggers}</commentary>
  </example>
```

### Color Guidelines

Select colors by functional category. For complete palette, see **[`references/colors.md`](references/colors.md)**.

```
blue   = Code gen    purple = Planning    crimson = Review
orange = Architect   teal   = Design      gray    = Docs
```

**Quick Assignments:**

| Subagent Type | Color | Category |
|---------------|-------|----------|
| Agent evaluators | `crimson` | Review |
| Agent creators | `blue` | Code Generation |
| Skill evaluators | `coral` | Review |
| Skill creators | `teal` | Design |

## Best Practices

### Naming Conventions (CRITICAL)

1. **ALWAYS use full namespace** for plugin skills: `plugin-name:skill-name`
   - In user-facing documentation: `rd2:my-skill`
   - In `agents.md` skills field: `my-skill` (internal reference only)

2. **NEVER reuse names** across components
   - Skills take precedence over commands with same name (blocks user invocation)
   - Use distinct naming patterns to avoid confusion

| Component | Naming Pattern | Example |
|-----------|---------------|---------|
| Slash Command | `verb-noun` | `test-code` |
| Slash Command (grouped) | `noun-verb` | `agent-add`, `agent-evaluate` |
| Skill | `verb-ing-noun` | `reviewing-code` |
| Subagent | `role-agent` | `code-reviewer-agent` |

**Slash Command Grouping Rule:**
- When multiple slash commands share the same domain, use `noun-verb` format
- This groups related commands together alphabetically: `agent-add.md`, `agent-evaluate.md`, `agent-refine.md`

### Skill Composition Rules

**DO:**
- Keep agents and skills INDEPENDENT
- Use subagents to orchestrate multiple skills via the `skills` field
- Leverage `context: fork` for skill isolation

**DON'T:**
- Make agents/skills directly call other agents/skills
- Add explicit dependencies between skills (not supported)
- Assume cross-plugin skill references work (feature request only)

### Writing Guidelines

- **Use imperative/infinitive form** ("Create X", not "Creates X")
- **Frontmatter description**: Include BOTH what the agent does AND when to use it
- **Body**: Focus on procedural instructions and workflow guidance
- **Competency lists**: Be exhaustive - LLMs cannot invent what's not in the prompt

### Common Anti-Patterns

| Anti-Pattern | Issue | Fix |
|--------------|-------|-----|
| Too short (<400 lines) | Missing competencies | Add competency items |
| Too long (>600 lines) | Verbose | Condense descriptions |
| Missing verification | High hallucination risk | Add verification protocol |
| Incomplete rules | Missing guardrails | Add 8+ DO and 8+ DON'T |
| No auto-routing | Won't trigger automatically | Add "Use PROACTIVELY for" |
| Too few examples | Users unclear when to use | Add 2-3 examples |
| **Name reuse** | **Blocks invocation** | **Use distinct names** |

## Quality Checklist

Before completing an agent:

- [ ] All 8 sections present
- [ ] 400-600 total lines
- [ ] 50+ competency items
- [ ] 8+ DO and 8+ DON'T rules
- [ ] Verification protocol with red flags
- [ ] "Use PROACTIVELY for" in description
- [ ] 2-3 examples with commentary
- [ ] Output format with confidence scoring
- [ ] Evaluation score >= 80/100

## References

### Bundled Resources

- **[`references/agent-anatomy.md`](references/agent-anatomy.md)** - Complete 8-section anatomy with templates and examples
- **[`references/colors.md`](references/colors.md)** - Full color palette with category assignments
- **[`references/ClaudeCodeBuilt-inTools.md`](references/ClaudeCodeBuilt-inTools.md)** - Built-in tools reference (Task, SlashCommand, AskUserQuestion)
- **[`assets/agent-template.md`](assets/agent-template.md)** - Ready-to-use agent template

### Agent Organization

```
plugin-name/
└── agents/
    ├── analyzer.md
    ├── reviewer.md
    └── generator.md
```

All `.md` files in `agents/` are auto-discovered. Namespacing is automatic:
- Single plugin: `agent-name`
- With subdirectories: `plugin:subdir:agent-name`

### External References

- [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills)
- [Claude Code Agent Documentation](https://code.claude.com/docs/en/agents)
- [GitHub Issue #14945](https://github.com/anthropics/claude-code/issues/14945) - Slash commands blocked by skill name collision
- [GitHub Issue #15944](https://github.com/anthropics/claude-code/issues/15944) - Cross-plugin skill references
