---
name: core-principles
description: "Extracted section: Core Principles"
see_also:
  - rd3:task-decomposition
---

# Core Principles

### Granularity

**Ideal task size:** 2-8 hours of implementable work

- Too small (< 1 hour): Consider combining related tasks
- Too large (> 16 hours): Needs further decomposition
- Just right: Can be completed in a single focused work session

### Dependency Management

| Type | Description | Symbol |
|------|-------------|--------|
| **Blocking** | Task B cannot start until Task A completes | A -> B |
| **Related** | Task B references Task A but can proceed | A \|\| B |
| **Blocked** | Waiting on external factor | A X |

Document dependencies explicitly. Avoid circular dependencies. Explain WHY tasks depend on each other.

### Single Responsibility

Each task has: **One clear objective**, **One deliverable**, **One verification method**

### Testable Outcomes

Every task must be verifiable: Unit tests, Integration tests, Acceptance criteria

### Content Quality Thresholds

Tasks must be created with substantive content to support downstream workflows:

| Content | Minimum | Ideal | Rationale |
|---------|---------|-------|-----------|
| **Background** | 50 chars | 100+ chars | Context for why the task exists |
| **Requirements** | 50 chars | 100+ chars | Measurable success criteria |
| **Solution** | Optional | Recommended | Technical approach aids implementation |

Avoid placeholder text like "TBD", "[placeholder]", or "See above". Empty or skeletal tasks reduce decomposition value and may block status transitions in task management systems.
#
