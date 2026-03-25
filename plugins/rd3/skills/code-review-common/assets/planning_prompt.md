---
name: code-review-planning-prompt
description: "Prompt template for architecture and solution planning reviews"
see_also:
  - rd3:code-review-common
  - rd3:backend-architect
  - rd3:run-acp
---

# Planning Prompt Template

Use this template when conducting architecture or solution planning reviews.

## When to Use

Use this template when reviewing:
- Proposed architecture decisions
- Solution design approaches
- Implementation plans
- System integration designs

**Note:** This is for SOLUTION REVIEW (design) — use `review_prompt.md` for CODE REVIEW (implementation).

## Template

```
## Architecture / Solution Review Request

**Target:** {target_path}
**Type:** {planning|architecture|design}
**Scope:** {scope_description}

### Review Focus

Review the proposed solution at {target_path} for:

1. **Architectural Soundness**
   - Does the design address the actual requirements?
   - Are design patterns appropriate?
   - Is the architecture scalable?

2. **System Integration**
   - Are component boundaries clear?
   - Is coupling minimized?
   - Are dependencies managed?

3. **Trade-offs**
   - What are the explicit trade-offs made?
   - Are there alternatives not considered?
   - Are consequences understood?

### Analysis Dimensions

Evaluate across these dimensions:

| Dimension | Questions |
|-----------|-----------|
| **Correctness** | Does it solve the right problem? |
| **Completeness** | Are edge cases addressed? |
| **Simplicity** | Is the design as simple as possible? |
| **Flexibility** | Can requirements change easily? |
| **Reliability** | Is error handling comprehensive? |
| **Performance** | Are there obvious bottlenecks? |

### Output Format

```yaml
---
type: solution-review
target: {target_path}
mode: planning
date: <ISO_timestamp>
---

## Executive Summary

Brief assessment of the proposed solution.

## Strengths

[What's good about this approach]

## Concerns

[Potential issues or risks]

## Recommendations

[Suggested improvements]

## Alternatives Considered

[Other approaches and why not chosen]

## Decision

<Approve|Proceed with Changes|Request Redesign>
```

### Review Guidelines

1. **Understand requirements first** — What problem does this solve?
2. **Challenge assumptions** — What is being assumed that may not be true?
3. **Consider scale** — How does this handle growth?
4. **Identify risks** — What could go wrong?
5. **Propose alternatives** — If something is wrong, suggest better approaches

### Questions to Ask

- Does this solution match the actual requirements?
- Are there simpler alternatives?
- What happens when requirements change?
- How does this handle failure modes?
- Is the complexity justified?
- What is the testing strategy?

### Notes

{additional_context}
```

## Usage with rd3:run-acp

```bash
# Architecture review
acpx codex "Review the proposed microservice architecture for src/services/"

# Design pattern review
acpx opencode "Assess the repository pattern implementation for database access"

# Integration review
acpx codex "Review the API integration design for payment processing"
```

## Code Review vs Solution Review

| Aspect | Code Review | Solution Review |
|--------|-------------|-----------------|
| **What** | Implementation quality | Design correctness |
| **When** | After implementation | Before/during implementation |
| **Focus** | How code is written | What solution achieves |
| **Skill** | rd3:code-review-common | rd3:backend-architect |
| **Output** | P1-P4 findings | Architecture assessment |
