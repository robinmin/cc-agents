---
name: cc-agents
description: Meta-skill for creating, evaluating, and refining Claude Code Agent subagents. Use when: building new subagents, writing agent definition files, evaluating agent quality, or refining existing agents with best practices. Follows 8-section anatomy, verification-first development, and agent-specific quality assessment.
---

# cc-agents: Claude Code Agent Subagents

## Overview

Create, evaluate, and refine Claude Code Agent subagents that extend AI capabilities with specialized knowledge and workflows. Use this skill when building new subagents, evaluating agent quality, or improving existing agents.

## Quick Start

```bash
# Evaluate an existing agent
rd2:agent-evaluate plugins/rd2/agents/my-agent.md

# Create a new agent from template
rd2:agent-add my-domain-expert

# Refine an existing agent
rd2:agent-refine plugins/rd2/agents/my-agent.md
```

## Workflows

### Creating a New Agent

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

**Workflow:**

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

## Architecture: Fat Skills, Thin Wrappers

Follow the **Fat Skills, Thin Wrappers** pattern:

- **Skills** contain all core logic, workflows, and domain knowledge (this file)
- **Commands** are minimal wrappers (~50 lines) that invoke skills for human users
- **Agents** are minimal wrappers (~100 lines) that invoke skills for AI workflows

## Agent Structure (8-Section Anatomy)

### Section 1: METADATA (~5-15 lines)

```yaml
---
name: domain-expert
description: |
  Senior {Domain} expert. Use PROACTIVELY for {trigger keywords}.

  <example>
  Context: {Situation}
  user: "{Request}"
  assistant: "{Response with verification}"
  <commentary>{Explanation}</commentary>
  </example>

tools: [Read, Write, Edit, Grep, Glob, WebSearch, WebFetch]
model: inherit
color: {category-color}
---
```

### Section 2: PERSONA (~20 lines)

```markdown
# 1. METADATA

**Name:** domain-expert
**Role:** Senior {Domain} Engineer & Verification Specialist
**Purpose:** {One sentence with verification focus}

# 2. PERSONA

You are a **Senior {Domain} Expert** with {X}+ years experience.

Your expertise spans:

- {Core competency 1}
- {Core competency 2}
- **Verification methodology** — you never guess, you verify first
```

### Section 3: PHILOSOPHY (~30 lines)

```markdown
# 3. PHILOSOPHY

## Core Principles

1. **Verification Before Generation** [CRITICAL]
2. **{Domain Principle 1}**
3. **{Domain Principle 2}**
4. **Graceful Degradation**
```

### Section 4: VERIFICATION PROTOCOL (~50 lines)

Include: Red Flags, Source Priority, Citation Format, Confidence Scoring, Fallback Protocol

### Section 5: COMPETENCY LISTS (~150-200 lines)

**Minimum Requirements:**
- Total items: 50+ across all categories
- Each category: At least 10 items
- Include "When NOT to use"

### Section 6: ANALYSIS PROCESS (~40 lines)

```markdown
# 6. ANALYSIS PROCESS

## Phase 1: Diagnose

## Phase 2: Solve

## Phase 3: Verify
```

### Section 7: ABSOLUTE RULES (~40 lines)

```markdown
# 7. ABSOLUTE RULES

## What I Always Do ✓

- [ ] {8-12 positive behaviors}

## What I Never Do ✗

- [ ] {8-12 prohibited behaviors}
```

### Section 8: OUTPUT FORMAT (~30 lines)

Include templates with confidence scoring.

## Line Count Guidelines

| Section | Target Lines |
|---------|--------------|
| Metadata | ~15 |
| Persona | ~20 |
| Philosophy | ~30 |
| Verification | ~50 |
| Competencies | ~150-200 |
| Process | ~40 |
| Rules | ~40 |
| Output | ~30 |
| **Total** | **400-600** |

## Color Guidelines

When creating subagents, select unique category colors for visual identification. See [references/colors.md](references/colors.md) for a comprehensive list of available colors.

| Category | Colors |
|----------|--------|
| Language experts | `blue`, `cyan` |
| Framework experts | `green`, `teal` |
| Domain experts | `magenta`, `purple` |
| Task experts | `yellow`, `orange` |
| Quality/Security | `red`, `crimson` |

**Subagent-Specific Color Suggestions:**

| Subagent Type | Suggested Colors |
|---------------|------------------|
| Skill evaluators (skill-doctor) | `lavender`, `plum` |
| Skill creators (skill-expert) | `teal`, `turquoise` |
| Agent evaluators (agent-doctor) | `crimson`, `rose` |
| Agent creators (agent-expert) | `electric blue`, `azure` |

## Best Practices

### Naming Conventions (CRITICAL)

**Follow official Claude Code naming rules:**

1. **ALWAYS use full namespace** for plugin skills: `plugin-name:skill-name`
   - When referencing skills in documentation, use full namespace
   - When invoking skills via slash commands, use full namespace
   - In `agents.md` skills field, reference without prefix (internal)
   - Never omit the plugin prefix in user-facing documentation

2. **NEVER reuse names** across components
   - Slash commands, subagents, and skills must have UNIQUE names
   - Skills take precedence over commands with same name (blocks invocation)
   - Use distinct naming patterns to avoid confusion

| Component | Naming Pattern | Example |
|-----------|---------------|---------|
| Slash Command | `verb-noun` | `test-code` |
| Slash Command (grouped) | `noun-verb` | `agent-add`, `agent-evaluate`, `agent-refine` (groups related commands) |
| Skill | `verb-ing-noun` | `reviewing-code` |
| Subagent | `role-agent` | `code-reviewer-agent` |

**Slash Command Grouping Rule:**
- When multiple slash commands share the same domain, use `noun-verb` format (NOT `verb-noun`)
- This groups related commands together alphabetically in listings
- Examples:
  - `agent-add.md`, `agent-evaluate.md`, `agent-refine.md` (all "agent" commands grouped)
  - `code-generate.md`, `code-review.md` (all "code" commands grouped)
  - `tasks-plan.md`, `tasks-cli.md` (all "tasks" commands grouped) |

**Sources:**
- [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills)
- [GitHub Issue #14945](https://github.com/anthropics/claude-code/issues/14945) - Slash commands blocked by skill name collision
- [GitHub Issue #15944](https://github.com/anthropics/claude-code/issues/15944) - Cross-plugin skill references

### Skill Composition Rules

**DO:**
- Keep agents and skills INDEPENDENT
- Use subagents to orchestrate multiple skills via the `skills` field
- Leverage `context: fork` for skill isolation

**DON'T:**
- Make agents/skills directly call other agents/skills
- Add explicit dependencies between skills (not supported)
- Assume cross-plugin skill references work (feature request only)

**Example correct pattern:**
```yaml
# agents/orchestrator.md
---
name: orchestrator
skills:
  - research
  - writing
  - review
context: fork
---
```

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
| **Skill dependencies** | **Not supported** | **Use subagents** |

## Verification Protocol Template

Every agent MUST include:

```markdown
## Verification Protocol [MANDATORY]

### Before Answering ANY Technical Question

1. **Search First**: Use ref/WebSearch to verify current information
2. **Check Recency**: Look for updates in last 6 months
3. **Cite Sources**: Every technical claim must reference documentation
4. **Acknowledge Uncertainty**: If unsure, say "I need to verify this"
5. **Version Awareness**: Always note version numbers

### Red Flags — STOP and verify

- API endpoints or method signatures from memory
- Configuration options without documentation backing
- Version-specific features without version check
- Performance claims without benchmark citations

### Confidence Scoring (REQUIRED)

| Level | Threshold | Criteria |
|-------|-----------|----------|
| HIGH | >90% | Direct quote from official docs |
| MEDIUM | 70-90% | Synthesized from multiple sources |
| LOW | <70% | FLAG FOR USER REVIEW |
```

## Output Templates

### Standard Evaluation Report

```markdown
# Agent Evaluation Report: {agent-name}

## Quick Stats

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Total Lines | {X} | 400-600 | ✓/✗ |
| Competency Items | {Y} | 50+ | ✓/✗ |
| DO ✓ Rules | {Z} | 8+ | ✓/✗ |
| DON'T ✗ Rules | {W} | 8+ | ✓/✗ |

## Overall Score: {S}/100

### Dimension Breakdown

| Dimension | Score | Weight | Points | Status |
|-----------|-------|--------|--------|--------|
| Structure | {X}/20 | 20% | {P} | ✓/✗ |
| Verification | {X}/25 | 25% | {P} | ✓/✗ |
| Competencies | {X}/20 | 20% | {P} | ✓/✗ |
| Rules | {X}/15 | 15% | {P} | ✓/✗ |
| Auto-Routing | {X}/10 | 10% | {P} | ✓/✗ |
| Examples | {X}/10 | 10% | {P} | ✓/✗ |

## Recommendations

### High Priority
1. {Specific actionable recommendation}
2. {Specific actionable recommendation}
```

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
