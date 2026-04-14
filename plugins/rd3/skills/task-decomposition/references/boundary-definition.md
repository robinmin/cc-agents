---
name: boundary-definition
description: "Extracted section: Boundary Definition"
see_also:
  - rd3:task-decomposition
---

# Boundary Definition

This skill has a precise scope. Understanding what belongs here versus adjacent disciplines prevents scope creep and keeps the skill focused.

### Task Decomposition (IN-SCOPE)

Transform understood, scoped work into actionable tasks:

- Break requirements into implementable pieces (target 2-8 hours, absolute floor 2 hours)
- Identify dependencies, sequencing, and parallel opportunities
- Apply decomposition patterns (layer-based, feature-based, project-phase-based, risk-based)
- Estimate effort using structured techniques (PERT, T-shirt, time-boxing, historical)
- Generate structured JSON output compatible with batch task creation
- Define success criteria and verification methods for each task
- Record assumptions and open questions surfaced during decomposition

### Business Analysis (OUT-OF-SCOPE)

Business analysis determines WHAT the problem is and WHY it matters. It feeds INTO task decomposition as input:

- Problem framing and stakeholder goal identification
- Success criteria definition at the project level
- Requirement clarification and prioritization
- ROI analysis and business case construction

**Handoff model:** Business analysis outputs (requirements, constraints, success criteria) are inputs to task decomposition. When decomposition surfaces business analysis questions, record them as open questions — do not attempt to answer them.

### System Analysis (OUT-OF-SCOPE)

System analysis designs the technical architecture and component interactions. It also feeds INTO task decomposition as input:

- Technical architecture design and component boundary definition
- System integration reasoning and API contract design
- Technology selection and infrastructure planning
- Performance modeling and capacity planning

**Handoff model:** System analysis outputs (architecture decisions, component boundaries, technical constraints) are inputs to task decomposition. When decomposition surfaces architecture questions, record them as assumptions requiring validation — do not attempt to resolve them.

### Task Lifecycle (OUT-OF-SCOPE)

Task file operations belong in `rd3:tasks`:

- File creation, WBS assignment, status management
- Kanban board operations and refresh
- Task validation and content checking
- Artifact storage and retrieval

**Handoff model:** Task decomposition generates structured output (JSON). That output is consumed by `rd3:tasks batch-create` or `rd3:tasks create` for file operations.
