---
description: Evaluate a Claude Code Agent subagent for quality and production readiness
skills: [cc-agents]
argument-hint: <agent-file>
---

# Evaluate Agent

Thin wrapper for cc-agents skill. Assesses agent quality across 6 dimensions with scoring.

## Quick Start

```bash
/rd2:agent-evaluate plugins/rd2/agents/my-agent.md
```

## Arguments

| Argument     | Required | Description                                          |
| ------------ | -------- | ---------------------------------------------------- |
| `agent-file` | Yes      | Path to agent definition file (relative or absolute) |

## Evaluation Dimensions

| Dimension        | Weight | What I Check                              | Pass Criteria           |
| ---------------- | ------ | ----------------------------------------- | ----------------------- |
| **Structure**    | 20%    | All 8 sections present, 400-600 lines     | 8 sections + line count |
| **Verification** | 25%    | Red flags, sources, confidence, fallbacks | Complete protocol       |
| **Competencies** | 20%    | 50+ items across categories               | 50+ items total         |
| **Rules**        | 15%    | DO and DON'T lists                        | 8+ of each              |
| **Auto-Routing** | 10%    | "Use PROACTIVELY for" + keywords          | Phrase present          |
| **Examples**     | 10%    | 2-3 examples with commentary              | Complete examples       |

**Passing Score:** >= 80/100

## Output

```markdown
# Agent Evaluation Report: {agent-name}

## Quick Stats

| Metric           | Value | Target  | Status  |
| ---------------- | ----- | ------- | ------- |
| Total Lines      | {X}   | 400-600 | {check} |
| Competency Items | {Y}   | 50+     | {check} |
| DO Rules         | {Z}   | 8+      | {check} |
| DON'T Rules      | {W}   | 8+      | {check} |

## Overall Score: {S}/100 ({Grade})

### Dimension Breakdown

| Dimension    | Score  | Weight | Points | Status  |
| ------------ | ------ | ------ | ------ | ------- |
| Structure    | {X}/20 | 20%    | {P}    | {check} |
| Verification | {X}/25 | 25%    | {P}    | {check} |
| Competencies | {X}/20 | 20%    | {P}    | {check} |
| Rules        | {X}/15 | 15%    | {P}    | {check} |
| Auto-Routing | {X}/10 | 10%    | {P}    | {check} |
| Examples     | {X}/10 | 10%    | {P}    | {check} |

## Recommendations

### High Priority (Required for Production)

1. {Specific actionable recommendation}

### Medium Priority (Recommended)

1. {Specific actionable recommendation}

## Next Steps

- Use `/rd2:agent-refine <agent-file>` to implement recommendations
- Re-evaluate to confirm improvements
```

## Grading Scale

| Grade | Score  | Status    | Action                    |
| ----- | ------ | --------- | ------------------------- |
| A     | 90-100 | Excellent | Production ready          |
| B     | 80-89  | Good      | Minor polish recommended  |
| C     | 70-79  | Fair      | Improvement needed        |
| D     | 60-69  | Poor      | Major revision needed     |
| F     | <60    | Fail      | Complete rewrite required |

## Example

```bash
# Evaluate agent
/rd2:agent-evaluate plugins/rd2/agents/rust-expert.md

# Output shows:
# - Overall score: 85/100 (Grade B)
# - Structure: 18/20 (missing one section)
# - Competencies: 15/20 (only 38 items, need 50+)
# - Recommendations to reach Grade A
```

## After Evaluation

- If score >= 80: Agent is production-ready with minor polish
- If score < 80: Use `/rd2:agent-refine` to implement recommendations
- Always re-evaluate after refinement

## See Also

- `/rd2:agent-refine` - Improve agents based on evaluation findings
- `/rd2:agent-add` - Create new agents
- `cc-agents` - Evaluation criteria reference
