---
name: decomposition-decision-rules
description: "Extracted section: Decomposition Decision Rules"
see_also:
  - rd3:task-decomposition
---

# Decomposition Decision Rules

Before decomposing, evaluate whether the task actually needs decomposition. Apply these rules deterministically.

## Foundational Principle: Decompose Only When Necessary

**Every subtask has a cost.** Decomposition is not free — it creates:
- Tracking overhead (multiple task files to manage)
- Sequential bottleneck (subtasks must be executed in order)
- Review fragmentation (multiple PRs or one bloated PR)
- Context switches (each subtask requires re-reading scope)

**Decompose only when the benefits outweigh these costs.**

The right question is not "can I decompose this?" but "do I need to?"

Decomposition is necessary ONLY when:
- The work has genuinely independent parallel streams that can be executed by different people/agents simultaneously
- The work requires distinct review/approval gates that cannot be combined
- A subtask has a materially different risk profile (e.g., one is safety-critical, another is cosmetic)
- A subtask has a materially different domain expert (e.g., one needs a DB specialist, another needs a UI specialist)

Decomposition is NOT necessary when:
- The work fits in one person's/agent's head
- The work touches related files in the same module
- The work has a single review/approval gate
- The work is a single deliverable with one rollback boundary

### The 2-Hour Rule

As a practical heuristic: if you cannot describe a subtask in one sentence that a non-technical person would understand, it is probably an implementation step, not a deliverable.

Bad subtask names (implementation steps):
- "Add interface to model.ts"
- "Update commands.ts"
- "Wire events case in switch"
- "Run bun check"

Good subtask names (deliverables):
- "Add events CLI command to orchestrator"
- "Implement WBS normalization for task_ref"
- "Add gate analytics dashboard"

### Decomposition is NOT the Same as Planning

Decomposition creates independent work units with their own task files and WBS numbers.

Planning creates a structured implementation order within ONE task file.

If your "subtasks" are just the steps of your implementation plan, write them in the **Plan** section of the parent task's Solution — do NOT create separate task files.

### Decompose When ALL of These Are True (Multi-person/agent context)

| # | Condition | Rationale |
|---|-----------|------------|
| D1 | Work can be split into **2+ parallel streams** that different people/agents can execute independently without blocking each other | Parallel execution is the primary benefit of decomposition |
| D2 | Each stream has a **distinct deliverable** that can be **reviewed independently** | If everything needs to be reviewed together, decomposition adds overhead |
| D3 | Each stream has a **distinct rollback boundary** | If one part fails, only that part should be rolled back |

### Decompose When ANY of These Is True (Single-person/agent context)

Even for single-agent work, decompose if:

| # | Condition | Rationale |
|---|-----------|------------|
| D4 | Estimated effort exceeds **8 hours** (full day) | Requires intermediate checkpoints for resume after interruption |
| D5 | Task spans **multiple layers** requiring different expertise (e.g., backend + frontend, DB + API) | Each layer may need different verification approach |
| D6 | One part is **safety-critical** and requires separate review | Security/financial/critical paths need independent sign-off |

### Do NOT Decompose When ALL of These Are True

| # | Condition |
|---|-----------|
| S1 | One person/agent can hold the entire scope in context |
| S2 | All work goes into the same module, same PR |
| S3 | Single review/approval gate |
| S4 | One rollback boundary |
| S5 | Estimated effort under 8 hours |

### Minimum Subtask Size (Absolute Floor)

**Never create a subtask smaller than 2 hours.**

Examples of bad decomposition (0335 over-decomposed into 6 subtasks):
```
0335: Add events CLI command
  ├── 0336: Add EventsOptions interface to model.ts
  ├── 0337: Add events to VALID_COMMANDS
  ├── 0338: Implement handleEvents in run.ts
  ├── 0339: Wire events case in switch
  ├── 0340: Add events.test.ts
  └── 0341: Run bun run check        ← NOT a deliverable
```

Task 0341 ("Run bun run check") is not a deliverable — it is what you do at the end of every task. This is over-decomposition.

Rule: if the subtask name ends with a file name or describes a step in an implementation plan, it is NOT a subtask — write it in the **Plan** section instead.

### Over-Decomposition Warning Signs

| Warning | Indicator |
|---------|----------|
| Subtask name mentions a specific file | Implementation detail, not a deliverable |
| Subtask name describes a pipeline phase | These are already phases in the pipeline |
| Subtask can be described in one verb + one file | Implementation step |
| Subtask is "run tests" or "write tests" | Tests are part of implementation, not a separate task |
| Multiple subtasks must all pass for any of them to matter | Fragile — they are really one task |

### When in Doubt: Write to Plan, Not to Subtasks

If unsure whether to create a subtask, write the work breakdown in the **Plan** section of the parent task's Solution. Only create subtask files when you are certain they will be executed independently.

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
3. **Only decompose if committed to executing the subtasks.** Orphaned subtasks in Backlog are a sign of over-decomposition.

This signals: "This task has been decomposed into subtasks — track progress via the subtasks."
