---
name: decomposition-decision-rules
description: "Extracted section: Decomposition Decision Rules"
see_also:
  - rd3:task-decomposition
---

# Decomposition Decision Rules

Before decomposing, evaluate whether the task actually needs decomposition. Apply these rules deterministically.

### Decompose When ANY Condition Is Met

| # | Condition | Rationale |
|---|-----------|-----------|
| D1 | Requirements list **3+ distinct deliverables** targeting different components or files | Multiple deliverables = multiple work streams |
| D2 | Implementation touches **3+ source files** across different modules/directories | Cross-module work has implicit dependencies to manage |
| D3 | Estimated effort exceeds **4 hours** (half-day threshold) | Large tasks benefit from intermediate checkpoints |
| D4 | Task spans **multiple layers** (e.g., backend + frontend, DB + API + UI) | Cross-layer work requires sequencing and different skill sets |

### Do NOT Decompose When ALL Conditions Are True

| # | Condition |
|---|-----------|
| S1 | Single deliverable targeting 1-2 files in the same module |
| S2 | Estimated effort under 4 hours |
| S3 | No cross-layer or cross-module dependencies |

### Skip Justification

When deciding NOT to decompose, write a brief justification in the parent task's **Solution** section:

```
No decomposition needed: single-file change in `src/auth/tokens.ts`, ~2h estimated effort, no cross-module dependencies.
```

This makes the skip decision auditable and reversible.

### Post-Decomposition Status Transition

After decomposition, update the parent task:
1. Write subtask list into the parent task's **Solution** section (see Output Format)
2. Update parent task status to `Done` via `tasks update <WBS> decomposed` (alias for Done)

This signals: "This task has been decomposed into subtasks — track progress via the subtasks."
#
