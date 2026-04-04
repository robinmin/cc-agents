---
name: enhance rd3:task-decomposition
description: Add decomposition decision rules, simplify output format, add Decomposed status, and rewrite Phase 4 prompt to fix task-decomposition being skipped
status: Done
profile: standard
created_at: 2026-04-04T06:08:51.358Z
updated_at: 2026-04-04T06:08:51.358Z
folder: docs/tasks2
type: task
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0322. enhance rd3:task-decomposition

### Background

When working with the rd3 orchestration pipeline, task decomposition (Phase 4) is frequently skipped or avoided by the LLM agent. This happens because:

1. **No executable decomposition logic exists.** The `rd3:task-decomposition` skill (`plugins/rd3/skills/task-decomposition/`) is a pure knowledge library — 1 SKILL.md + 8 reference guides with patterns, checklists, and examples. There are zero executable scripts or automated decision rules. The LLM must interpret and follow free-form guidelines, which it often doesn't.

2. **The Phase 4 prompt is too vague.** The direct-skill prompt in `plugins/rd3/skills/orchestration-dev/scripts/direct-skill-runner.ts:78-93` says only: _"Break down the task into implementable subtasks with WBS numbers."_ It provides no decision criteria for whether decomposition is needed, no threshold rules, and no structured output contract.

3. **No decomposition threshold is enforced.** The skill mentions "2-8 hour granularity" as ideal task size but has no rule for when a task SHOULD be decomposed vs. left as-is. The agent can always rationalize skipping it.

4. **The output format is overcomplicated.** The skill describes JSON arrays, markdown reports, dependency graphs, ASCII diagrams, and structured output protocols — but none of this is enforced or validated by the auto gate (which only checks that `has_output: true`).

The core questions this task must resolve:
- **When** should a task be decomposed? (Clear, enforceable threshold rules)
- **How** should the output look? (Simple, consistent format in the parent task's Solution section)
- **What happens after?** (Parent task status management)

### Requirements

#### R1: Decomposition Decision Rules

Implement clear, deterministic rules in the Phase 4 prompt and SKILL.md to decide whether a task needs decomposition:

- **Decompose when ANY of these conditions are met:**
  - Requirements section lists 3+ distinct deliverables or acceptance criteria targeting different components/files
  - Implementation touches 3+ source files across different modules/directories
  - Estimated effort exceeds 4 hours (half-day threshold)
  - Task spans multiple layers (e.g., backend + frontend, or DB + API + UI)
- **Do NOT decompose when ALL of these are true:**
  - Single deliverable targeting 1-2 files in the same module
  - Estimated effort under 4 hours
  - No cross-layer or cross-module dependencies
- **Output of decision:** When skipping decomposition, write a brief justification in the Solution section (e.g., "Single-file change, ~2h effort — no decomposition needed") so the decision is traceable.

**Acceptance criteria:**
- [ ] Decision rules are codified in SKILL.md under a new "Decomposition Decision Rules" section
- [ ] The Phase 4 direct-skill prompt in `direct-skill-runner.ts` references these rules explicitly
- [ ] Rules are deterministic enough that two agents given the same task would reach the same decompose/skip decision >80% of the time

#### R2: Simplified Output Format

Replace the overcomplicated output protocol with a simple, consistent format. After decomposition, the parent task's **Solution** section should contain:

```markdown
### Solution

#### Subtasks

- [ ] [0323 - Subtask description](0323_0322_subtask_name.md)
- [ ] [0324 - Another subtask](0324_0322_another_subtask.md)
- [ ] [0325 - Third subtask](0325_0322_third_subtask.md)

**Dependency order:** 0323 → 0324 || 0325
**Estimated total effort:** 12-16 hours
```

Rules:
- Each subtask is a markdown checkbox linking to its task file
- Subtask filenames follow existing convention: `{new_wbs}_{parent_wbs}_{task_name}.md`
- Dependencies expressed inline with `→` (sequential) and `||` (parallel)
- Total effort estimate with range
- Subtask files are created via `tasks create` CLI (not Write tool)

**Acceptance criteria:**
- [ ] SKILL.md "Output Format" section is updated to describe this simplified format
- [ ] The Phase 4 prompt instructs the agent to write subtasks into the Solution section of the parent task
- [ ] The structured JSON output protocol in `references/structured-output-protocol.md` is updated to align with the simplified format (or deprecated with a pointer to the new format)
- [ ] Gate evidence validation in `gates.ts` checks for the presence of subtask links in the Solution section (not just `has_output: true`)

#### R3: Parent Task Status Transition

After successful decomposition, the parent task's status should be updated:

- Add `decomposed` as an alias for `Done` in `STATUS_ALIASES` (in `types.ts`)
- Status update uses `tasks update <WBS> decomposed` CLI command (resolves to Done)
- SKILL.md documents this transition

**Acceptance criteria:**
- [x] `decomposed` alias added to `STATUS_ALIASES` in `types.ts` mapping to `Done`
- [x] `tasks update <WBS> decomposed` works correctly (resolves to Done)
- [x] SKILL.md documents the status transition

#### R4: Phase 4 Prompt Enhancement

Rewrite the Phase 4 direct-skill prompt in `direct-skill-runner.ts` to be explicit and actionable:

- Include the decomposition decision rules (from R1)
- Specify the expected output format (from R2)
- Include the status transition instruction (from R3)
- Reference the parent task's Background and Requirements sections as input context
- Provide a concrete example of expected output

**Acceptance criteria:**
- [ ] Phase 4 prompt in `direct-skill-runner.ts:78-93` is rewritten with structured instructions
- [ ] Prompt references decision rules, output format, and status transition
- [ ] Prompt includes at least one inline example of the expected Solution section format

### Q&A

**Q: Why not add executable scripts for automated decomposition?**
A: The skill is designed as a knowledge library that guides LLM agents. The fix should focus on making the guidance unambiguous and enforceable through the prompt and gate validation, not on building a decomposition engine. The LLM's judgment is still needed for understanding task scope — but the rules should constrain when it can skip decomposition.

**Q: Should existing tasks with the old JSON output format be migrated?**
A: No. This change applies to new decompositions going forward. Existing subtask files already created via batch-create are fine as-is.

**Q: Why use "decomposed" as an alias for Done instead of a new status?**
A: Simpler. A decomposed task's work is captured in subtasks — the parent is effectively done. Adding a new status would require changes across kanban, UI, tests, and orchestration. An alias keeps the type system clean while giving agents a semantic verb to use.

**Q: What if the agent incorrectly decides not to decompose?**
A: The justification written to the Solution section (per R1) makes the decision auditable. If the user disagrees, they can re-run Phase 4 with rework feedback. The deterministic rules also reduce false negatives.



### Design



### Solution

#### Subtasks

- [ ] [0323 - Add decomposition decision rules to SKILL.md](0323_0322_Add_decomposition_decision_rules_to_SKILL.md.md) — R1
- [ ] [0324 - Simplify task-decomposition output format](0324_0322_Simplify_task-decomposition_output_format.md) — R2
- [ ] [0325 - Add Decomposed status to tasks CLI](0325_0322_Add_Decomposed_status_to_tasks_CLI.md) — R3
- [ ] [0326 - Rewrite Phase 4 direct-skill prompt](0326_0322_Rewrite_Phase_4_direct-skill_prompt.md) — R4

**Dependency order:** (0323 || 0324 || 0325) → 0326
**Estimated total effort:** 8-12 hours

### Plan



### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


