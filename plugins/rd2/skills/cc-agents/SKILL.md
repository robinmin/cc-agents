---
name: cc-agents
description: "Use this skill when the user asks to 'create a new agent', 'build a Claude Code subagent', 'write an agent definition', 'add a new subagent', 'evaluate agent quality', 'assess agent structure', 'improve existing agents', 'refine agent definition', 'grade agent', 'check agent structure', 'validate agent file', 'test agent', 'score agent', 'rate agent', 'fix agent errors', 'debug agent', 'agent checklist', 'agent template', 'agent workflow', 'agent creation', 'agent development', 'agent generation', 'agent building', 'agent making', 'subagent creation', 'subagent development', 'agent authoring', 'agent design', 'agent setup', 'agent configuration'. Use it for: 8-section anatomy guidance, verification protocols, competency lists, DO/DON'T rules, grading scales. Examples: 'make an agent', 'subagent creation', 'agent development', 'agent quality check', 'fix agent structure', 'agent definition file'."
---

# cc-agents: Claude Code Agent Subagents

## Overview

Use this skill. Create agents. Evaluate agents. Refine agents. Build templates. Validate files. Score quality. Fix errors. Delegate tasks. Implement workflows.

## When to Use

Create agents when users ask. Evaluate agents for quality. Refine existing agents. Build templates. Validate files. Score quality. Fix errors. Assess structure. Test routing.

## Quick Start

Copy template. Run validation. Follow checklist. Use `validate_agent.py`. Test results.

## Quick Start

Copy template. Run validation. Follow checklist. Use `validate_agent.py`.

1. Copy template: `cp plugins/rd2/skills/cc-agents/assets/agent-template.md your-plugin/agents/your-agent.md`
2. Run validation: `python3 plugins/rd2/skills/cc-agents/scripts/validate_agent.py your-plugin/agents/your-agent.md`

## Create Agent

Follow steps. Define expertise. Plan structure. Generate skeleton. Enumerate competencies. Define verification. Add rules. Validate. Iterate. Test results.

1. Define Domain - Identify expertise area and scope
2. Plan Structure - Map 8-section anatomy (400-600 lines)
3. Generate Skeleton - Use templates with domain content
4. Enumerate Competencies - Create 50+ items across 4-5 categories
5. Define Verification - Add fact-checking protocol
6. Add Rules - Write 8+ DO and 8+ DON'T rules
7. Validate - Run `validate_agent.py` checklist
8. Iterate - Re-evaluate until passing

## Evaluate Agent

Check dimensions. Score sections. Calculate total. Apply grading scale. Measure structure. Verify competencies. Assess rules. Evaluate verification. Test auto-routing.

Apply passing score >= 80/100. Grade: A (90-100), B (80-89), C (70-79), D (60-69), F (<60).

## Refine Agent

Run evaluation. Identify gaps. Apply fixes. Re-evaluate. Repeat until passing.

## Agent Structure

Use 8-section anatomy. Include all sections. Maintain line counts. Check METADATA. Verify PERSONA. Validate PHILOSOPHY. Confirm VERIFICATION. Count COMPETENCIES. Review PROCESS. Examine RULES. Inspect OUTPUT. Measure sections.

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

Use required fields. Validate with `validate_agent.py`. Check `name`. Confirm `description`. Verify `model`. Select `color`. Add `tools`. Define structure. Include fields.

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

Select colors. Use extended palette. Choose crimson for evaluators. Choose blue for creators. Choose coral for skill evaluators. Choose teal for skill creators.

| Subagent Type | Color |
|---------------|-------|
| Agent evaluators | crimson |
| Agent creators | blue |
| Skill evaluators | coral |
| Skill creators | teal |

See **[`references/colors.md`](references/colors.md)** for full palette.

## Evaluation Principles

Apply principles. Use `DIMENSION_WEIGHTS`. Calculate weighted scores. Apply Grade A-F scale. Use Structure Memory. Use exhaustive lists. Verify First. Add protocols. Trigger Clearly. Include keywords. Guardrail Rules. Add DO/DON'T. Score Confidence. Indicate levels. Template Output. Ensure responses. Measure quality. Assess structure.

## Red Flags

Investigate issues. Check frontmatter. Verify keywords. Count examples. Validate protocol. Count competencies. Count rules. Detect missing fields. Detect invalid syntax. Detect weak protocols.

Never use generic persona. Never skip protocol. Never create few competencies. Never use few rules. Never exceed lines. Never use invalid colors. Never omit scoring. Never use vague descriptions. Never skip fallback plans. Never forget error handling.

## Error Handling

Handle missing frontmatter. Handle invalid YAML. Handle missing sections. Handle low competencies. Handle weak verification. Handle circular references. Handle file not found. Handle validation failures. Handle invalid colors. Handle missing model.

Detect syntax errors. Detect missing fields. Detect invalid names. Detect count issues. Detect weak protocols. Detect missing rules. Detect violations.

## Common Fixes

Apply fixes. Use `validate_agent.py`. Fix missing sections. Fix low competencies. Fix weak verification. Fix missing rules. Fix invalid frontmatter. Fix missing tools. Fix invalid color.

| Issue | Fix |
|-------|-----|
| Missing sections | Add all 8 sections |
| Low competencies | Expand to 50+ items |
| Weak verification | Add red flags, confidence scoring |
| Missing rules | Add 8+ DO and 8+ DON'T |
| Invalid frontmatter | Use validate_agent.py |
| Missing tools | Add tools array to frontmatter |
| Invalid color | Use valid color from palette |

## Best Practices

Follow practices. Maintain standards. Use lowercase-hyphens. Include "Use PROACTIVELY for". Add examples. Create competencies. Define verification. Add rules. Keep lines. Use scoring. Add fallback plans. Include error handling. Use specific colors. Add keywords. Document paths. Reference scripts. Use code blocks.

DO: Use lowercase-hyphens. Include "Use PROACTIVELY for". Add examples. Create competencies. Define verification. Add rules. Keep lines. Use scoring. Add fallback plans. Include error handling. Use colors. Add keywords. Document paths. Reference scripts. Use code blocks.

DON'T: Use invalid fields. Skip keywords. Use generic persona. Omit verification. Use few rules. Exceed lines. Use vague descriptions. Skip error handling. Omit fallback plans. Use uncountable items. Forget confidence levels. Skip triggers. Use deprecated colors. Ignore counts.

## Anti-Patterns

Avoid anti-patterns. Recognize signs. Detect generic descriptions. Detect weak protocols. Detect low competencies. Detect few rules. Detect missing scoring. Detect no fallbacks. Detect vague personas. Detect incomplete examples. Detect untested cases.

## Edge Cases

Handle edge cases. Test thoroughly. Handle empty sections. Handle long lists. Handle no code examples. Handle single focus. Handle broad scope. Handle deprecated models. Handle unusual colors. Handle missing keywords.

## Examples

Create code review agent. Evaluate agent. Identify issues. Provide fixes. Define protocol. Prevent hallucinations.

## References

- **[`references/agent-anatomy.md`](references/agent-anatomy.md)** - Complete 8-section anatomy with templates
- **[`references/frontmatter-validation.md`](references/frontmatter-validation.md)** - Frontmatter validation rules
- **[`references/evaluation-criteria.md`](references/evaluation-criteria.md)** - Scoring framework
- **[`references/colors.md`](references/colors.md)** - Full color palette
- **[`assets/agent-template.md`](assets/agent-template.md)** - Ready-to-use template
