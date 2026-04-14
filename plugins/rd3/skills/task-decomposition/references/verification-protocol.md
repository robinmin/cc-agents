---
name: verification-protocol
description: "Extracted section: Verification Protocol"
see_also:
  - rd3:task-decomposition
---

# Verification Protocol

### Before Decomposing Any Task

1. **Understand the Goal:** What is the objective? What does success look like?
2. **Identify Constraints:** Time, resources, technical limitations
3. **Map Dependencies:** What depends on what? What can run in parallel?
4. **Define Success Criteria:** How do we know each task is complete?
5. **Gather References:** What codebase files relate to this work?

### Red Flags — STOP and Verify

- Unclear success criteria or deliverables
- Vague acceptance criteria (cannot be objectively verified)
- Tasks above 16 hours of effort (must decompose) or 8-16 hour tasks without written rationale
- Conflicting or circular dependencies
- Missing context about constraints
- External dependencies without clear ownership
- Critical path identified but no buffers included
- No relevant codebase files to reference
- Empty Background/Requirements content (signals over-decomposition — merge into fewer, richer tasks)

### Confidence Scoring

| Level | Criteria |
|-------|----------|
| **HIGH** | Clear requirements, verified approach, authoritative methodology, substantive content |
| **MEDIUM** | Reasonable approach with some assumptions, mixed sources |
| **LOW** | Unclear requirements, many assumptions, unverified approach — FLAG FOR REVIEW |

### Decomposition Quality Checklist

- [ ] Each task targets 2-8 hours, with no task below 2 hours
- [ ] Each task has substantive Background content (> 50 chars)
- [ ] Each task has substantive Requirements content (> 50 chars)
- [ ] Each task has success criteria
- [ ] Dependencies explicitly mapped
- [ ] Parallel opportunities identified
- [ ] Effort estimated
- [ ] Blocked tasks marked with reasons
- [ ] References gathered from codebase
- [ ] No circular dependencies
- [ ] High-risk tasks flagged
