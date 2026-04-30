---
description: Assess task readiness and synthesize an implementation Plan
argument-hint: "<task-ref> [--auto] [--dry-run]"
allowed-tools: ["Read", "Bash", "AskUserQuestion"]
---

# Dev Plan

Assess an existing task file, confirm the relevant sections contain enough high-quality information, then synthesize an executable implementation Plan as `- [ ]` checkbox steps with a final `#### Acceptance Criteria` subsection.

Use the global `tasks` CLI for task-file operations. Do **not** invoke `rd3:tasks` via `Skill()`.

## When to Use

- After any slash command or workflow creates/refines a task that needs an implementation plan.
- Before invoking `/rd3:dev-run` so the implementation agent has concrete execution steps and final validation criteria.
- When an existing task has enough Background/Requirements context but lacks a solid Plan.

## Arguments

| Arg / Flag | Required | Default | Description |
|---|---|---|---|
| `task-ref` | Yes | — | WBS number (e.g. `0400`) or task file path |
| `--auto` | No | false | Skip confirmation gate; AI synthesis only |
| `--dry-run` | No | false | Print synthesized sections; do not modify the file |

Deprecated flags are intentionally unsupported: `--channel`, `--preset`.

## Workflow

1. **Parse arguments** from `$ARGUMENTS` and require exactly one `task-ref`.
2. **Resolve and load task**:
   - Digits only: treat as WBS and run `tasks show <wbs>`.
   - For a file path: `tasks get-wbs <path>`.
   - Anything else: refuse with usage guidance.
3. **Assess section quality** using the Section Quality Contract below:
   - Background and Requirements must pass before planning.
   - Q&A, Design, and Solution are optional but must be used when present and relevant.
   - Treat empty, template-placeholder, `_partial_`, and `_TBD_`-only sections as insufficient.
   - If a required section is insufficient, ask focused clarification questions unless `--auto` is set.
   - In `--auto`, stop when required planning facts are missing; do not fabricate them.
4. **Extract planning inputs**:
   - Identify scope, non-goals, touched files/components, implementation constraints, risks, tests, and validation commands.
   - Verify codebase-specific facts with `Read`/`Bash` before relying on them.
   - Mark unresolved non-blocking assumptions explicitly in the Plan.
5. **Synthesize or replace Plan**:
   - Use ordered `- [ ]` checkbox steps that a coding agent can execute directly.
   - Include implementation, tests, validation, documentation/task updates, and cleanup when relevant.
   - Add `#### Acceptance Criteria` as the final subsection under Plan.
   - Acceptance Criteria must be observable gates: behavior, tests/checks, file/content expectations, and `tasks check <wbs>`.
6. **Gate**:
   - Show the section quality table, assumptions, and proposed Plan via `AskUserQuestion`: approve, edit, abort.
   - Skip the gate when `--auto` is set.
   - If `--dry-run`, print the quality assessment, proposed Plan, and exact `tasks update` command, then exit without modifying files.
7. **Persist update**:
   - Write the approved Plan section to a temp file.
   - Run `tasks update <wbs> --section Plan --from-file <tmpfile>`.
8. **Validate and report**:
   - Run `tasks check <wbs>`.
   - Report the quality verdict, updated Plan, and suggest `/rd3:dev-run <wbs>`.

## CLI Contract

Use `Bash` for all task operations:

```bash
tasks get-wbs docs/tasks2/0400_create_new_slash_command_dev-new-task.md
tasks show 0400
tasks update 0400 --section Plan --from-file /tmp/dev-plan-plan.md
tasks check 0400
```

Do not call `Skill(skill="rd3:tasks", ...)`; Robin prefers the global `tasks` command for task-file operations.

## Section Quality Contract

| Section | Required for Planning | Pass Criteria | Fail / Needs Clarification |
|---|---:|---|---|
| Background | Yes | Explains why the task exists, current pain, and desired outcome | Empty, generic, no business/technical context |
| Requirements | Yes | Lists concrete behavior, constraints, and success signals | Vague verbs only, no acceptance signal, contradictory scope |
| Q&A | Conditional | Captures decisions that affect scope or execution | Missing only matters if the task depends on prior clarification |
| Design | Conditional | Identifies architecture, UX/API shape, boundaries, or explicit "no design impact" | `_partial_`, unresolved architecture choices, invented details |
| Solution | Conditional | Names practical implementation approach, likely files/components, and reuse points | No executable path, missing core dependency choice, unsupported paths |
| Plan | Output | Ordered executable checklist plus final `#### Acceptance Criteria` | Missing acceptance criteria, broad phases only, no validation commands |

Verdicts:

- **Pass**: enough information to plan without inventing facts.
- **Needs Clarification**: one or more planning-critical facts are missing; ask the user unless `--auto`.
- **Blocked**: required context is absent or contradictory; stop and recommend refinement.

## Plan Shape

Use this structure when synthesizing Plan:

```markdown
- [ ] 1. Confirm scope and constraints
  - [ ] Verify relevant files/components before editing
  - [ ] Resolve or record non-blocking assumptions
- [ ] 2. Implement the smallest coherent change
  - [ ] Follow existing project patterns and toolchain rules
  - [ ] Keep unrelated refactors out of scope
- [ ] 3. Add or update verification
  - [ ] Add targeted tests/checks where risk justifies them
  - [ ] Update docs/task notes if behavior or workflow changed
- [ ] 4. Validate
  - [ ] Run targeted checks
  - [ ] Run `bun run check` if code changed
  - [ ] Run `tasks check <wbs>`

#### Acceptance Criteria

- [ ] User-visible requirement X is satisfied
- [ ] Relevant files/components reflect the agreed design and solution
- [ ] Targeted tests/checks pass
- [ ] `tasks check <wbs>` passes
```

## Idempotency

- The command updates only the `Plan` section.
- Re-running the command may replace Plan when the user asks for a stronger or refreshed plan.
- Existing Background, Requirements, Q&A, Design, and Solution sections are assessment inputs, not mutation targets.
- `--auto` skips the confirmation gate but does not permit invented facts.

## Anti-Hallucination

- Every claim in the quality assessment and Plan must trace to the task file, current conversation, AGENTS/CLAUDE instructions, or verified codebase facts.
- Mark unverifiable specifics as `_TBD_`.
- Do not invent file paths, libraries, APIs, tests, or architectural constraints.
- If a fact matters and is not in the task, verify with `Read`/`Bash` before using it.

## Edge Cases

- Missing/invalid `task-ref`: refuse with usage examples; surface `tasks get-wbs` errors.
- Missing or low-quality required sections: ask focused questions; in `--auto`, stop with blockers.
- Existing Plan is already solid: report the quality assessment and ask whether to replace it unless `--auto`.
- User abort, persistence failure, or `tasks check <wbs>` failure: stop and report the exact failure; do not claim completion.
- `--dry-run`: print proposed content and commands; never persist.

## Examples

```bash
/rd3:dev-plan 0400
/rd3:dev-plan 0400 --dry-run
/rd3:dev-plan 0400 --auto
/rd3:dev-plan docs/tasks2/0400_create_new_slash_command_dev-new-task.md
```
