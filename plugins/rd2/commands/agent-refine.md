---
description: Refine and improve an existing Claude Code Agent subagent
argument-hint: <agent-file>
---

# Refine Agent

Thin wrapper for `rd2:cc-agents` skill. Improves agent quality based on evaluation findings.

## Quick Start

```bash
/rd2:agent-refine plugins/rd2/agents/my-agent.md
```

## Arguments

| Argument     | Required | Description                                          |
| ------------ | -------- | ---------------------------------------------------- |
| `agent-file` | Yes      | Path to agent definition file (relative or absolute) |

## Workflow

1. **Evaluate** - Assess current quality (if not already done)
2. **Review Findings** - Check all dimensions, especially low scores
3. **Determine Action**:
   - Structure issues? → Add missing sections, adjust line counts
   - Content gaps? → Expand competency lists, add workflows
   - Verification weak? → Add red flags, source priority, fallbacks
   - Rules incomplete? → Add DO and DON'T rules
4. **Implement Fixes** - Edit agent file
5. **Re-evaluate** - Run evaluation again
6. **Repeat** - Continue until passing score achieved

## Common Improvements by Dimension

| Dimension             | Typical Fixes                                       |
| --------------------- | --------------------------------------------------- |
| Structure (<20/20)    | Add missing sections, adjust line counts to 400-600 |
| Verification (<25/25) | Add red flags, source priority, confidence scoring  |
| Competencies (<20/20) | Add items to reach 50+, improve categorization      |
| Rules (<15/15)        | Add DO and DON'T rules (8+ each)                    |
| Auto-Routing (<10/10) | Add "Use PROACTIVELY for" with specific keywords    |
| Examples (<10/10)     | Add 2-3 examples with commentary                    |

## Frontmatter Validation

**Invalid fields that will be detected and removed:**

| Invalid Field | Action |
|--------------|--------|
| `agent:` | Replace with `name:` |
| `subagents:` | Remove (not in schema) |
| `orchestrates:` | Remove (not in schema) |
| `skills:` | Remove (not in schema for agents) |

## Example

```bash
# Refine agent
/rd2:agent-refine plugins/rd2/agents/python-expert.md

# The refinement will:
# 1. Identify gaps in each dimension
# 2. Apply fixes to improve score
# 3. Ensure 8-section anatomy is complete
# 4. Add missing competencies
# 5. Strengthen verification protocol
```

## Grading Scale

| Grade | Score  | Action                               |
| ----- | ------ | ------------------------------------ |
| A     | 90-100 | Production ready                     |
| B     | 80-89  | Minor polish recommended             |
| C     | 70-79  | Refinement needed (use this command) |
| D     | 60-69  | Major revision needed                |
| F     | <60    | Complete rewrite required            |

## After Refinement

1. Re-evaluate: `/rd2:agent-evaluate <agent-file>`
2. Verify score is >= 80/100
3. Test agent with sample queries
4. Deploy to production

## Implementation

This command delegates to **rd2:agent-expert** for agent refinement:

```python
Task(
    subagent_type="rd2:agent-expert",
    prompt="""Refine and improve the agent at: {agent_file}

Based on evaluation findings or user requirements:
1. Analyze current agent structure and content
2. Identify gaps in each dimension (Structure, Verification, Competencies, Rules, Auto-Routing, Examples)
3. Apply fixes to improve score to >= 80/100
4. Ensure 8-section anatomy is complete
5. Add missing competencies to reach 50+ items
6. Strengthen verification protocol with red flags and sources
7. Add/expand DO and DON'T rules (8+ each)

Edit the agent file directly with improvements.
Provide summary of changes made and recommendations for further improvements.""",
    description="Refine {agent_name} agent"
)
```

**Note:** `rd2:agent-expert` internally uses `rd2:cc-agents` skill for best practices.

## See Also

- `/rd2:agent-evaluate` - Assess agent quality before/after refinement (delegates to rd2:agent-doctor)
- `/rd2:agent-add` - Create new agents (delegates to rd2:agent-expert)
- `rd2:agent-expert` - Agent creation and refinement specialist
- `rd2:cc-agents` - Refinement best practices (skill)
