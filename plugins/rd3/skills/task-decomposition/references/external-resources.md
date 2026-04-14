---
name: external-resources
description: "External links, additional resources, and decomposition checklist for task-decomposition skill."
see_also:
  - rd3:task-decomposition
  - rd3:tasks
  - patterns
  - estimation
  - domain-breakdowns
  - examples
  - task-template
---

# Additional Resources

## Skill References

- `references/patterns.md` for layer, feature, phase, and risk decomposition patterns
- `references/estimation.md` for estimation techniques and buffer guidance
- `references/domain-breakdowns.md` for domain-specific breakdown examples
- `references/examples.md` for end-to-end sample decompositions
- `references/task-template.md` for task file structure and section content guidance

## Key Boundary Reminders

| Discipline | In-Scope for Task Decomposition? | Notes |
|------------|-----------------------------------|-------|
| **Task Decomposition** | YES | Transform understood work into actionable tasks |
| **Business Analysis** | NO - OUT | Requirements, ROI, stakeholder goals → record as prerequisites |
| **System Analysis** | NO - OUT | Architecture, integration, tech choices → record as prerequisites |
| **Task File Operations** | NO - OUT | File creation, WBS assignment → use `rd3:tasks` |

## Decomposition Checklist

Before finalizing task decomposition:

- [ ] Each task targets 2-8 hours
- [ ] No task is smaller than 2 hours
- [ ] Any 8-16 hour task has written rationale
- [ ] Each task has single responsibility
- [ ] Each task has clear deliverable
- [ ] Each task has verifiable outcome
- [ ] Dependencies identified and documented
- [ ] No circular dependencies
- [ ] High-risk tasks flagged
- [ ] Parallel opportunities identified
- [ ] Testing tasks included
- [ ] Documentation tasks included
- [ ] Buffers added to estimates
- [ ] References gathered from codebase
- [ ] Background content > 50 chars (ideally 100+)
- [ ] Requirements content > 50 chars (ideally 100+)
- [ ] Structured JSON output generated
