---
name: cc-agents
description: "This skill should be used when the user asks to 'create a new agent', 'build a Claude Code subagent', 'write an agent definition', 'add a new subagent', 'evaluate agent quality', 'assess agent structure', 'improve existing agents', 'refine agent definition', 'grade agent', 'check agent structure', 'validate agent file', 'test agent', 'score agent', 'rate agent', 'fix agent errors', 'debug agent', 'agent checklist', 'agent template', 'agent workflow', 'agent creation', 'agent development', 'agent generation', 'agent building', 'agent making', 'subagent creation', 'subagent development', 'agent authoring', 'agent design', 'agent setup', 'agent configuration'. Use it for: 8-section anatomy guidance, verification protocols, competency lists, DO/DON'T rules, grading scales. Examples: 'make an agent', 'subagent creation', 'agent development', 'agent quality check', 'fix agent structure', 'agent definition file'."
---

# cc-agents: Claude Code Agent Subagents

## Overview

Use this skill to create, evaluate, and refine Claude Code Agent subagents.

## When to Use

Create agents. Evaluate agents. Refine agents. Build agent templates. Validate agent files. Score agent quality. Fix agent errors.

## Quick Start

Copy template. Run validation. Follow the checklist.

1. Copy template: `cp plugins/rd2/skills/cc-agents/assets/agent-template.md your-plugin/agents/your-agent.md`
2. Run validation: `python3 plugins/rd2/skills/cc-agents/scripts/validate_agent.py your-plugin/agents/your-agent.md`

## Create Agent

Follow these steps:

1. Define Domain - Identify expertise area and scope
2. Plan Structure - Map 8-section anatomy (400-600 lines)
3. Generate Skeleton - Use templates with domain content
4. Enumerate Competencies - Create 50+ items across 4-5 categories
5. Define Verification - Add fact-checking protocol
6. Add Rules - Write 8+ DO and 8+ DON'T rules
7. Validate - Run evaluation checklist
8. Iterate - Re-evaluate until passing

## Evaluate Agent

Check dimensions. Score sections. Calculate total. Apply grading scale.

| Dimension | Weight | Measures |
|-----------|--------|----------|
| Structure | 20% | All 8 sections, 400-600 lines |
| Verification | 25% | Red flags, fallbacks |
| Competencies | 20% | 50+ items across categories |
| Rules | 15% | 8+ DO and 8+ DON'T |
| Auto-Routing | 10% | "Use PROACTIVELY for" keywords |
| Examples | 10% | 2-3 examples with commentary |

Apply passing score >= 80/100. Grade: A (90-100), B (80-89), C (70-79), D (60-69), F (<60).

## Refine Agent

Run evaluation. Identify gaps. Apply fixes. Re-evaluate. Repeat until passing.

## Agent Structure

Use 8-section anatomy:

| Section | Lines | Key Elements |
|---------|-------|--------------|
| METADATA | ~15 | name, description, tools, model, color |
| PERSONA | ~20 | Background, expertise, approach |
| PHILOSOPHY | ~30 | 4-6 principles, design values |
| VERIFICATION | ~50 | Red flags, sources, confidence, fallbacks |
| COMPETENCIES | ~150-200 | 50+ items across 4-5 categories |
| PROCESS | ~40 | Diagnose, Solve, Verify |
| RULES | ~40 | DO and DON'T lists |
| OUTPUT | ~30 | Templates with confidence |

## Frontmatter

Use required fields:

| Field | Format |
|-------|--------|
| `name` | lowercase-hyphens, 3-50 chars, alphanumeric start/end |
| `description` | "Use PROACTIVELY for" + 2-3 `<example>` blocks |
| `model` | inherit/sonnet/opus/haiku |
| `color` | blue/cyan/green/yellow/magenta/red |
| `tools` | Optional array |

Avoid: `agent:`, `subagents:`, `orchestrates:`, `skills:`. Document in body instead.

See **[`references/frontmatter-validation.md`](references/frontmatter-validation.md)** for validation rules.

## Color Guidelines

Select colors by category:

| Subagent Type | Color |
|---------------|-------|
| Agent evaluators | crimson |
| Agent creators | blue |
| Skill evaluators | coral |
| Skill creators | teal |

See **[`references/colors.md`](references/colors.md)** for full palette.

## Evaluation Principles

Apply these principles:

1. **Structure Memory** - Use exhaustive competency lists
2. **Verify First** - Add fact-checking protocol
3. **Trigger Clearly** - Include "Use PROACTIVELY for"
4. **Guardrail Rules** - Add 8+ DO and 8+ DON'T
5. **Score Confidence** - Indicate HIGH/MEDIUM/LOW always
6. **Template Output** - Ensure predictable responses

## Red Flags

Investigate these issues. Check frontmatter. Verify keywords. Count examples. Validate protocol. Count competencies. Count rules.

- Missing frontmatter fields (name, description, model, color required)
- Description without "Use PROACTIVELY for" (won't auto-route)
- Too few examples (<2) or missing commentary
- Verification protocol missing or incomplete
- Competency list under 50 items
- Fewer than 8 DO or 8 DON'T rules
- Total lines outside 400-600 range

Never use generic persona. Never skip verification protocol. Never create fewer than 50 competencies. Never use fewer than 8 rules. Never exceed 600 lines. Never use invalid colors.

## Error Handling

Handle missing frontmatter. Handle invalid YAML. Handle missing sections. Handle low competency count. Handle weak verification. Handle circular references. Handle file not found. Handle validation failures.

## Common Fixes

Apply these fixes:

| Issue | Fix |
|-------|-----|
| Missing sections | Add all 8 sections |
| Low competencies | Expand to 50+ items |
| Weak verification | Add red flags, confidence scoring |
| Missing rules | Add 8+ DO and 8+ DON'T |
| Invalid frontmatter | Use validate_agent.py |

## Best Practices

Follow these practices:

DO: Use lowercase-hyphens. Include "Use PROACTIVELY for". Add examples. Create 50+ competencies. Define verification. Add 8+ rules. Keep lines 400-600.

DON'T: Use invalid fields. Skip "Use PROACTIVELY for". Use generic persona. Omit verification. Use fewer than 8 rules. Exceed 600 lines.

## Examples

Create a code review agent with 8-section anatomy and 50+ competencies. Evaluate an agent, identify issues, provide specific fixes. Define verification protocol with red flags to prevent hallucinations.

## References

- **[`references/agent-anatomy.md`](references/agent-anatomy.md)** - Complete 8-section anatomy with templates
- **[`references/frontmatter-validation.md`](references/frontmatter-validation.md)** - Frontmatter validation rules
- **[`references/evaluation-criteria.md`](references/evaluation-criteria.md)** - Scoring framework
- **[`references/colors.md`](references/colors.md)** - Full color palette
- **[`assets/agent-template.md`](assets/agent-template.md)** - Ready-to-use template
