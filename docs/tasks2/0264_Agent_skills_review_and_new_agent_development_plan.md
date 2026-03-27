---
name: Agent skills review and new agent development plan
description: Agent skills review and new agent development plan
status: Backlog
created_at: 2026-03-26T21:36:19.005Z
updated_at: 2026-03-26T22:10:00.000Z
folder: docs/tasks2
type: task
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0264. Agent skills review and new agent development plan

### Background

#### Refined 9-Phase Workflow

Task-file-driven software development with machine-first verification (BDD) + human review gate.

| # | Phase | Specialists Involved | Output | Gate |
|---|-------|---------------------|--------|------|
| 1 | **Business & System Analysis** | analyst (request-intake skill) | Enhanced task file (Background, Requirements, Constraints) | Human approves |
| 2 | **Architecture** | `backend-architect` → `frontend-architect` (sequential) | Architecture doc | Human approves |
| 3 | **Design** | `backend-design` + `frontend-design` + `ui-ux-design` (selective per task) | Design specs | Human approves |
| 4 | **Task Decomposition** | `task-decomposition` | Subtask files with WBS | Auto-validate |
| 5 | **Implementation** | `code-implement-common` | Code + passing tests | TDD cycle |
| 6 | **Unit Testing** | `sys-testing` / `advanced-testing` | Coverage report ≥ 80% | Auto-gate |
| 7 | **Code Review** | `code-review-common` | P1 issues resolved | Human approves |
| 8 | **Functional Review** | `bdd-workflow` + `functional-review` | BDD scenario pass/fail + human quality check | Human approves |
| 9 | **Documentation** | `code-docs` | Docs updated | Auto |

**Gate philosophy**: Hybrid — phases are skipped/inserted based on task `profile` (simple / standard / complex / research) in the task file frontmatter.

---

#### Missing Skills — Detailed Analysis

| Priority | Skill | Purpose | Gap it Fills |
|----------|-------|---------|--------------|
| 1 | **`verification-chain`** | Infrastructure protocol: nodes with Maker-Checker, parallel groups, retry policies, human pause | All workflow orchestration depends on this |
| 2 | **`bdd-workflow`** | BDD scenario generation + Gherkin execution + machine verification | Functional verification without manual test authoring |
| 3 | **`functional-review`** | Phase 8 gate: verify implementation against task file using bdd-workflow | No skill reviews "did we build what was asked" |
| 4 | **`request-intake`** | Heuristic Q&A to bootstrap task file from one-liner | Entry point for the pipeline |
| 5 | **`task-workflow`** | Orchestrate full pipeline, read profile, skip/insert phases, delegate to verification-chain | Ties everything together |
| 6 | **`code-docs`** | Auto-generate JSDoc/TSDoc, update task file References | Documentation is manual today |

---

#### Wish List — Agents & Commands to Create

**Agents** (thin wrappers, delegate to skills):

| Agent | Delegates to | Purpose |
|-------|--------------|---------|
| `expert-request-intake.md` | `request-intake` | Bootstrap task file from one-liner |
| `expert-bdd-workflow.md` | `bdd-workflow` | Run BDD scenarios |
| `expert-functional-review.md` | `functional-review` | Verify implementation vs task file |
| `expert-task-workflow.md` | `task-workflow` | Orchestrate full pipeline |
| `expert-verification-chain.md` | `verification-chain` | Execute a chain manifest |

**Commands** (human-facing CLI):

| Command | Purpose |
|---------|---------|
| `/rd3:request-intake` | Bootstrap task file via guided Q&A |
| `/rd3:bdd` | Run BDD workflow on a task file |
| `/rd3:functional-review` | Run functional review on a task file |
| `/rd3:task-workflow` | Kick off full pipeline |
| `/rd3:cov` | Execute a chain manifest directly |

---

#### What's Already Solid

These existing skills are well-covered and don't need rework:

- `code-implement-common` — TDD + worktree implementation
- `task-decomposition` — WBS + estimation
- `code-review-common` — SECU framework, P1-P4 taxonomy
- `sys-testing` / `advanced-testing` — coverage + mutation testing
- `brainstorm` — structured ideation
- `anti-hallucination` — verification-first protocol
- `backend-architect` / `frontend-architect` — architecture design
- `backend-design` / `frontend-design` / `ui-ux-design` — design specs

---

#### Recommended Priority

```
1. verification-chain     ← infrastructure, all workflows depend on it
2. bdd-workflow           ← enables machine-first functional verification
3. functional-review      ← fills phase 8 gap
4. request-intake         ← pipeline entry point
5. task-workflow          ← orchestrates everything
6. code-docs              ← nice-to-have, manual docs acceptable temporarily
```

Each skill is independent except: `bdd-workflow` and `functional-review` both depend on `verification-chain`; `task-workflow` depends on all others.


### Requirements

1. Review all existing rd3 skills and wt skills for completeness against the 9-phase workflow. 2. Map each workflow phase to existing skills or identify gaps. 3. Prioritize the missing skills by impact. 4. Produce a development plan for new skills with clear scope, inputs, outputs, and dependencies. 5. List all thin-agent wrappers and slash commands needed as a wish list.


### Q&A



### Design



### Solution



### Plan



### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


