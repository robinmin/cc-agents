---
name: Create super-pm thin wrapper agent
description: Create super-pm thin wrapper agent
status: Done
created_at: 2026-04-28T19:57:39.836Z
updated_at: 2026-04-28T20:02:42.986Z
folder: docs/tasks2
type: task
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0394. Create super-pm thin wrapper agent

### Background

Subtask of 0391. Create plugins/rd3/agents/super-pm.md as a thin wrapper agent (<100 lines) that routes PM-related requests to rd3:product-management skill. Must follow cc-agents naming convention.


### Requirements

- <100 lines
- Routes: prioritize, PRD, roadmap, feature intake, decomposition strategy
- Delegates to rd3:product-management skill
- Passes cc-agents validate.ts


### Q&A



### Design

Thin wrapper pattern: routing table + delegation to skill. <100 lines. No code.


### Solution

Created super-pm.md at plugins/rd3/agents/super-pm.md. Thin wrapper (68 lines) routing PM requests to rd3:product-management skill. Evaluated by cc-agents evaluate.ts (85%, B grade, PASS).


### Plan

1. Scaffold via cc-agents 2. Write routing logic 3. Validate 4. Evaluate


### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


