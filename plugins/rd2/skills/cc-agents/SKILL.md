---
name: cc-agents
description: Meta-skill for creating, evaluating, and refining Claude Code Agent subagents. Use when: building new subagents, writing agent definition files, evaluating agent quality, or refining existing agents. Follows 8-section anatomy, verification-first development, and agent-specific quality assessment.
---

# cc-agents: Claude Code Agent Subagents

## Overview

Create, evaluate, and refine Claude Code Agent subagents that extend AI capabilities with specialized knowledge and workflows. Use this skill when building new subagents, evaluating agent quality, or improving existing agents.

## Quick Start

```bash
# Use the agent template as starting point:
# Copy: plugins/rd2/skills/cc-agents/assets/agent-template.md
# To: your-plugin/agents/your-agent.md

# Key evaluation dimensions to check:
# - Structure: All 8 sections present, 400-600 lines
# - Verification: Complete protocol with red flags, fallbacks
# - Competencies: 50+ items across 4-5 categories
# - Rules: 8+ DO and 8+ DON'T
# - Auto-Routing: "Use PROACTIVELY for" with keywords
# - Examples: 2-3 examples with commentary
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

**Grading Scale:**
- A (90-100): Production ready
- B (80-89): Minor polish recommended
- C (70-79): Needs improvement
- D (60-69): Major revision needed
- F (<60): Complete rewrite required

### Refining an Agent

**Use this workflow:**

1. **Evaluate current quality** - Identify gaps and issues
2. **Review findings** - Check all dimensions, especially low scores
3. **Determine action:**
   - Structure issues? → Add missing sections, adjust line counts
   - Content gaps? → Expand competency lists, add workflows
   - Verification weak? → Add red flags, source priority, fallbacks
   - Rules incomplete? → Add DO and DON'T rules
4. **Implement fixes** - Edit agent file
5. **Re-evaluate** - Run evaluation again
6. **Repeat** - Continue until passing score achieved

## Architecture: Fat Skills, Thin Wrappers

Follow the **Fat Skills, Thin Wrappers** pattern:

- **Skills** contain all core logic, workflows, and domain knowledge (1,500-2,000 words)
- **Commands** are minimal wrappers (~150 lines) that invoke skills for human users
- **Agents** are minimal wrappers (~100-150 lines) that invoke skills for AI workflows

### Hybrid Approach for Complex Orchestration

**Command Layer (.md files)** - Use pseudocode with built-in tools (Task, SlashCommand, AskUserQuestion), explicit workflow sequences, self-documenting specifications

**Agent Layer (.md agents)** - Use flexible natural language with conditional logic, adaptive behavior, error handling and retries

### Built-in Tools for Orchestration

| Tool | Purpose | Example |
|------|---------|---------|
| `Task` | Delegate to subagent | `Task(subagent_type="specialist", prompt="...")` |
| `SlashCommand` | Call another command | `SlashCommand(skill="plugin:command-name", args="...")` |
| `AskUserQuestion` | Interactive user input | Ask clarifying questions with options |

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

**Required frontmatter fields:**

| Field | Description |
|-------|-------------|
| `name` | lowercase-hyphens, 3-50 chars, alphanumeric start/end |
| `description` | "Use PROACTIVELY for" + 2-3 `<example>` blocks with `<commentary>` |
| `model` | `inherit`/`sonnet`/`opus`/`haiku` |
| `color` | `blue`/`cyan`/`green`/`yellow`/`magenta`/`red` |
| `tools` | Optional: restrict to specific tools |

**CRITICAL - Invalid fields (agents won't appear in `/agents`):**
- `agent:`, `subagents:`, `orchestrates:`, `skills:` (document in body instead)

For detailed metadata templates, see **[`references/agent-anatomy.md`](references/agent-anatomy.md)**.

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

## Evaluation Principles

**Agent Creation Standards:**

1. **Structured Memory** - Competency lists are the agent's knowledge base - be exhaustive
2. **Verification First** - Every agent needs domain-specific fact-checking protocol
3. **Clear Triggers** - "Use PROACTIVELY for" with specific keywords ensures auto-routing
4. **Guardrails** - 8+ DO and 8+ DON'T rules prevent common mistakes
5. **Confidence Scoring** - Always indicate certainty level (HIGH/MEDIUM/LOW)
6. **Output Consistency** - Templates ensure predictable, actionable responses

**Evaluation Principles:**

- Constructive assessment - Identify both strengths and areas for improvement
- Specific recommendations - Provide concrete before/after examples
- Context-aware - Consider the agent's purpose when applying standards
- Evidence-based - Cite specific sections, patterns, and anti-patterns
- Progressive fixes - Prioritize by impact (critical > high > medium)

## Red Flags and Anti-Patterns

**Critical Red Flags (Stop and Investigate):**

- Missing frontmatter fields (name, description, model, color required)
- Description without "Use PROACTIVELY for" (won't auto-route)
- Too few examples (<2) or missing commentary
- Verification protocol missing or incomplete
- Competency list under 50 items
- Fewer than 8 DO or 8 DON'T rules
- Total lines outside 400-600 range

**Anti-Patterns:**

- Generic persona: "You are a helpful assistant" (no domain expertise)
- Vague triggering: "Use when user asks for help" (too broad)
- Missing verification: No red flags or confidence scoring
- Empty competencies: Less than 10 items per category
- No process: Missing workflow phases
- Generic rules: "Be helpful" instead of specific domain guidance
- Copy-pasted content: Competencies irrelevant to domain
- Circular references: Skill references commands that use the skill

## Common Issues by Category

**Structure Issues:**

- Missing one or more of the 8 sections
- Total lines outside 400-600 range
- Sections in wrong order
- Sections significantly over/under target line counts

**Metadata Issues:**

- Missing required fields (name, description, model, color)
- Invalid field names (agent:, subagents:, skills:)
- Color not from valid list
- Description lacks "Use PROACTIVELY for"
- Fewer than 2 examples in description
- Examples missing <commentary> tags

**Verification Issues:**

- No red flags defined
- Missing source priority
- No confidence scoring approach
- No fallback protocol
- Verification not domain-specific

**Competency Issues:**

- Fewer than 50 total items
- Items not categorized
- Categories not relevant to domain
- Missing "When NOT to use" section
- Items too vague/generic

**Rules Issues:**

- Fewer than 8 DO rules
- Fewer than 8 DON'T rules
- Rules too generic ("Be helpful")
- Rules not domain-specific
- Rules contradict each other

## Best Practices: DO and DON'T

**DO:**

- Use lowercase-hyphens for agent names (python-expert, code-reviewer)
- Include "Use PROACTIVELY for" in description with specific keywords
- Add 2-4 examples with <commentary> explaining why agent triggers
- Create 50+ competency items across 4-5 categories
- Define domain-specific red flags and verification protocol
- Include 8+ DO and 8+ DON'T rules
- Use second person in persona ("You are a...")
- Keep total lines between 400-600
- Use appropriate color for functional category
- Reference this skill for detailed templates

**DON'T:**

- Use invalid frontmatter fields (agent:, subagents:, skills:)
- Skip "Use PROACTIVELY for" in description
- Use generic persona ("You are a helpful assistant")
- Create fewer than 50 competency items
- Omit verification protocol
- Use fewer than 8 rules in either DO or DON'T list
- Exceed 600 lines (move details to references/)
- Fall below 400 lines (add competencies or verification)
- Use colors outside the valid list
- Reference commands that use this skill (circular reference)

## Agent Organization

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

## References

### Bundled Resources

- **[`references/agent-anatomy.md`](references/agent-anatomy.md)** - Complete 8-section anatomy with templates and examples
- **[`references/evaluation-criteria.md`](references/evaluation-criteria.md)** - Detailed evaluation criteria, scoring framework, and quality standards
- **[`references/colors.md`](references/colors.md)** - Full color palette with category assignments
- **[`references/ClaudeCodeBuilt-inTools.md`](references/ClaudeCodeBuilt-inTools.md)** - Built-in tools reference (Task, SlashCommand, AskUserQuestion)
- **[`references/hybrid-architecture.md`](references/hybrid-architecture.md)** - Hybrid approach for complex orchestration
- **[`assets/agent-template.md`](assets/agent-template.md)** - Ready-to-use agent template

### External References

- [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills)
- [Claude Code Agent Documentation](https://code.claude.com/docs/en/agents)
- [GitHub Issue #14945](https://github.com/anthropics/claude-code/issues/14945) - Slash commands blocked by skill name collision
- [GitHub Issue #15944](https://github.com/anthropics/claude-code/issues/15944) - Cross-plugin skill references
