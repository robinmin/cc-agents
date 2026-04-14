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

### Deliverable Test

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

## Rubric-First Protocol

`references/rubric-model.md` is the source of truth for decomposition decisions. This file explains how to apply it consistently.

### Step 1: Gather Signals

Estimate the five rubric signals before deciding:

- **E** — Estimated effort in hours
- **D** — Independently reviewable deliverables
- **L** — Layers/modules touched
- **C** — Coordination complexity (`none`, `moderate`, `high`)
- **R** — Risk class (`low`, `medium`, `high`)

### Step 2: Compute the Composite Score

```
score = E + D + L + C + R
```

### Step 3: Apply Overrides in Precedence Order

Apply overrides in this exact order:

1. **Force must** if `R = high`
2. **Force must** if `E > 16 hours`
3. **Force skip** only if no force-must rule applied **and** all of the following are true:
   - one file/module
   - one deliverable
   - one layer
   - zero coordination
   - one review/rollback boundary

This precedence is mandatory. High-risk work wins over force-skip even when the change is small and localized.

### Step 4: Read the Decision Band

| Score | Decision | Meaning |
|-------|----------|---------|
| 0-2 | `skip` | Keep as one task. Write skip justification. |
| 3-4 | `should decompose` | Decomposition is recommended, but a single-task plan is still allowed with written rationale. |
| 5+ | `must decompose` | Decomposition is mandatory. Create deliverable-based subtasks. |

### Practical Interpretation

These are not extra triggers; they are ways to estimate the rubric signals accurately:

| Situation | Rubric Effect |
|-----------|---------------|
| 2+ parallel streams with independent review | Usually increases `D` and/or `C`, often landing in `should` or `must` |
| Distinct rollback boundaries | Usually increases `D` and `C` |
| Cross-layer work (DB + API + UI) | Increases `L`; may still stay `should` if it is one deliverable |
| Security/financial/safety-critical change | Sets `R = high`, which forces `must` |
| Single-file/single-module change with no coordination | Usually lands in `skip`; may force-skip a raw score of 3-4 |

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

Target 2-8 hours when you do decompose. If a proposed subtask lands in the 8-16 hour caution band, re-run the rubric and keep it whole only with written rationale. If it exceeds 16 hours, decompose further.

### ⚠️ Critical: Do NOT Decompose by Implementation Phases

**The most common anti-pattern is decomposing by implementation phases:**

```yaml
# BAD: Decomposing by phase (investigation, design, implement, test)
0352: Add Antigravity adapter
  ├── 0356: investigate agy CLI      ← Phase, not deliverable
  ├── 0357: design adapter           ← Phase, not deliverable
  ├── 0358: implement adapter       ← Part of the feature
  ├── 0359: integrate backend        ← Part of the feature
  └── 0360: add unit tests          ← Part of implementation
```

**Why this is wrong:**
1. Phases are NOT features — they are activities within a feature
2. "Investigation" task (0356) was marked "Done" before actual implementation
3. 5 task files for work that could be 1 self-contained task
4. Fragments review and implementation unnecessarily

**Correct approach — Feature Complexity Decomposition:**

```yaml
# GOOD: Decompose by deliverable complexity
0352: Add Antigravity adapter

### Solution

#### Subtasks

- [ ] [0356 - Implement Antigravity adapter core](0356_antigravity_adapter_core.md)
- [ ] [0357 - Add backend selection and health checks](0357_backend_selection.md)

**Dependency order:** 0356 → 0357
**Estimated total effort:** 4-6 hours
```

**Or better yet — don't decompose at all:**

```yaml
# If the rubric lands in skip/should and the work is still one deliverable, keep it as ONE task
0352: Add Antigravity adapter

### Solution

(No decomposition — single task is sufficient)

### Plan

1. Research: `agy --help`, understand capabilities
2. Design: Document adapter interface in Design section
3. Implement: Add functions to acpx-query.ts
4. Integrate: BACKEND env var
5. Test: Unit tests
6. Verify: bun run check
```

**Detection:** If your subtask names are pipeline phases (investigate, design, implement, test), you're doing it wrong.

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
No decomposition needed: single-file change in `src/auth/tokens.ts`, score 0 (`E=0,D=0,L=0,C=0,R=0`), one deliverable, no cross-module coordination.
```

This makes the skip decision auditable and reversible.

### Post-Decomposition Status Transition

After decomposition, update the parent task:
1. Write subtask list into the parent task's **Solution** section (see Output Format)
2. Update parent task status to `Done` via `tasks update <WBS> decomposed` (alias for Done)
3. **Only decompose if committed to executing the subtasks.** Orphaned subtasks in Backlog are a sign of over-decomposition.

This signals: "This task has been decomposed into subtasks — track progress via the subtasks."
