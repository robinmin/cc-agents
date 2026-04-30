---
name: create new slash command dev-new-task
description: create new slash command dev-new-task
status: Done
created_at: 2026-04-30T04:31:01.053Z
updated_at: 2026-04-30T06:47:06.800Z
folder: docs/tasks2
type: task
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: pending
  testing: pending
---

## 0400. create new slash command dev-new-task

### Background

Workflow today: start a conversation with `/rd3:dev-brainstorm` on a topic, iterate with the agent for several rounds until alignment is reached, then need to capture the conversation as a structured task file with enough detail to drive implementation without drift.

This task delivers two cooperating commands that split the lifecycle into clean phases:

- **`/rd3:dev-new-task`** (new) — Phase 1: capture conversation into a task file. Always writes Background + Requirements; optionally captures Q&A and any Design/Solution that were discussed.
- **`/rd3:dev-plan`** (rewrite) — Phase 2: gap-fill Design + Solution if missing, then synthesize Plan. Replaces the existing `dev-plan` which delegates to the deprecated `rd3:orchestration-v2` (no longer used).

The end-to-end lifecycle becomes: `/rd3:dev-brainstorm` → `/rd3:dev-new-task` → `/rd3:dev-plan` → `/rd3:dev-run` → `/rd3:dev-review`.

### Requirements

#### R1. Deliver `/rd3:dev-new-task` (new command)

- Pure markdown command file at `plugins/rd3/commands/dev-new-task.md` (concise prompt; currently ~126 lines).
- **No new skill.** The agent does the synthesis directly from the markdown prompt — there is no `rd3:task-synthesis` skill, no TypeScript, no library code.
- Command surface:
  ```
  /rd3:dev-new-task [title] [--folder <path>] [--preset <name>] [--tags <a,b>] [--dry-run]
  ```
  | Arg / Flag | Required | Default | Description |
  |---|---|---|---|
  | `title` | No | Agent-derived from conversation (≤80 chars) | Task name passed to `tasks create` |
  | `--folder <path>` | No | `tasks` config `active_folder` | Override target folder |
  | `--preset <name>` | No | none | Forwarded to `tasks create --preset` |
  | `--tags <a,b>` | No | none | Forwarded to `tasks create --tags` |
  | `--dry-run` | No | false | Print synthesized markdown; do not call `tasks create` |
- Behavior:
  1. Synthesize sections from in-context conversation history.
  2. Single confirmation gate — show full markdown body via `AskUserQuestion`; allow approve/edit/abort.
  3. On approve, call the global `tasks` CLI (NEVER use Write tool — per CLAUDE.md; NEVER route through `Skill(skill="rd3:tasks")`). Use `tasks create --background ... --requirements ... --json`, then update optional richer sections with `tasks update <wbs> --section <name> --from-file <tmpfile>`.
  4. Run `tasks check <wbs>`, print created WBS + path, and suggest next step `/rd3:dev-plan <wbs>`.
- Section content contract for Phase 1:
  | Section | Always populated? | Source |
  |---|---|---|
  | Background | Yes | Conversation context, motivation |
  | Requirements | Yes | Stated requirements + acceptance criteria as bulleted list |
  | Q&A | If clarifications occurred | Verbatim Q/A pairs from conversation |
  | Design | Only if discussed | Opportunistic capture; mark `_partial_` if thin |
  | Solution | Only if discussed | Opportunistic capture; mark `_partial_` if thin |
  | Plan | Never (Phase 2 owns it) | — |
  | Review / Testing / Artifacts / References | Never | Reserved for downstream commands |
- Anti-hallucination: command prompt MUST instruct the agent to NOT invent technical claims unsupported by conversation. Mark unverified specifics as `_TBD_` rather than fabricating.

#### R2. Rewrite `/rd3:dev-plan` (replace orchestration-v2 delegation)

- Replace existing `plugins/rd3/commands/dev-plan.md`. Backup before overwrite (per CLAUDE.md): `cp plugins/rd3/commands/dev-plan.md plugins/rd3/commands/dev-plan.md.bak`.
- Pure markdown command file (concise prompt; currently ~162 lines). Same "no skill" rule — the agent does the synthesis directly from the markdown prompt.
- New command surface:
  ```
  /rd3:dev-plan <task-ref> [--auto] [--dry-run]
  ```
  | Arg / Flag | Required | Default | Description |
  |---|---|---|---|
  | `task-ref` | Yes | — | WBS number (e.g. `0400`) or file path |
  | `--auto` | No | false | Skip confirmation gate; AI synthesis only (for non-interactive use) |
  | `--dry-run` | No | false | Print synthesized sections; do not modify file |
- Drop deprecated flags: `--channel`, `--preset` (orchestration-v2 path is gone).
- Behavior:
  1. Resolve `task-ref` → load task file via `tasks show <wbs>` (and `tasks get-wbs <path>` first if path given).
  2. **Gap-fill Design** if missing or marked `_partial_`. Use `AskUserQuestion` to elicit when conversation context is insufficient.
  3. **Gap-fill Solution** if missing or marked `_partial_`. Same elicitation pattern.
  4. **Synthesize Plan** as `- [ ]` checkbox steps derived from Design + Solution.
  5. Single confirmation gate — show updated sections (skipped if `--auto`).
  6. Persist via the global `tasks update <wbs> --section <name> --from-file <tmpfile>` command for each updated section (Design, Solution, Plan). No changes to `rd3:tasks` needed — primitive already exists at `plugins/rd3/skills/tasks/scripts/commands/update.ts:112-133`.
  7. Run `tasks check <wbs>`, print summary, and suggest next step `/rd3:dev-run <wbs>`.

#### R3. Validation

- No code to unit-test (markdown command files are validated by manual smoke test).
- `tasks check 0400` must pass.
- Manual smoke test: invoke `/rd3:dev-new-task` on a real conversation; then `/rd3:dev-plan <wbs>` on the resulting task; verify both flows end-to-end.

#### Out of Scope (deferred to separate task)

- Removing the `plan_only` preset from `rd3:orchestration-v2`.
- Cleaning up `plugins/rd3/commands/dev-refine.md:100` "See Also" reference.
- Updating `plugins/rd3/CHANGELOG.md`.
- Any `git` operations (branch, commit, push). User performs git steps manually after review.


### Q&A

**Q:** Should `/rd3:dev-new-task` accept a `--skip-plan` flag?
**A:** No. The two-command split makes `--skip-plan` redundant — Phase 1 (`dev-new-task`) never produces Plan; Phase 2 (`dev-plan`) is the only producer.

**Q:** Where does the synthesis logic live — extend `rd3:tasks`, create a new skill, or keep it in the command markdown?
**A:** Keep it in the command markdown. Slash commands ARE the runtime prompt the agent executes; there is no algorithmic logic to extract into a TypeScript skill. Adding a skill layer would be pure indirection ("a command that tells the agent to invoke a skill that tells the agent to do X"). `rd3:tasks` is unchanged.

**Q:** Should we add a `tasks update --section` primitive?
**A:** Not needed. It already exists at `plugins/rd3/skills/tasks/scripts/commands/update.ts:112-133` (called via `tasks update <wbs> --section <name> --from-file <path>`). Zero changes to `rd3:tasks`.

**Q:** Hard replace the old `/rd3:dev-plan`, coexist via flag, or dispatch internally?
**A:** Hard replace (Option A). User has stopped using `rd3:orchestration-v2` entirely; preserving an unused code path violates "no features for hypothetical future requirements" rule.

**Q:** Keep `--auto` flag on `/rd3:dev-plan`?
**A:** Yes. Useful for non-interactive synthesis (CI, scripted flows).

**Q:** Keep `plan_only` preset in `rd3:orchestration-v2`?
**A:** Out of scope for this task. The new `/rd3:dev-plan` no longer uses orchestration-v2, but cleanup of legacy preset code is deferred to a separate task. The orphaned `plan_only` preset stays put for now.

**Q:** Should this task touch `dev-refine.md`, CHANGELOG, or any orchestration-v2 file?
**A:** No. Scope is strictly the two new/rewritten command files. Anything else is a separate task.

**Q:** What if Phase 1 conversation is too short (<5 substantive turns)?
**A:** The command prompt instructs the agent to warn and ask the user to confirm before proceeding (or suggest running `/rd3:dev-brainstorm` first).

**Q:** What if user runs `/rd3:dev-plan` twice on the same task?
**A:** Idempotent. The command prompt instructs the agent to detect already-populated sections; only re-synthesize those marked `_partial_` or empty. Already-complete sections are left alone unless the user explicitly asks to regenerate.

**Q:** What if `tasks create` fails (e.g. duplicate name)?
**A:** Surface the error with the rendered body so user can save manually. Exit non-zero.


### Design

#### Architecture decision: pure markdown commands, no skill

Slash commands in this codebase are **markdown prompt files** that the agent (Claude) executes at runtime. The "fat skills, thin wrappers" pattern from CLAUDE.md applies when there is non-trivial reusable logic (parsing, scoring, multi-step orchestration). For this task, the agent itself does the synthesis from in-context conversation — there is no algorithmic logic to extract into a TypeScript skill. Adding one would be over-engineering.

**What the commands actually do:**
- `dev-new-task.md` and `dev-plan.md` are pure markdown files in `plugins/rd3/commands/`.
- They contain step-by-step instructions for the agent: how to synthesize sections, when to use `AskUserQuestion`, which `tasks` CLI commands to invoke, and the anti-hallucination contract.
- All persistence flows through the global `tasks` CLI (`tasks create --background --requirements --json`, followed by `tasks update <wbs> --section <name> --from-file <path>` for optional sections). The command prompts must not call `Skill(skill="rd3:tasks", ...)`.

#### Files involved

```
plugins/rd3/commands/
├── dev-new-task.md   # NEW — Phase 1 prompt (~197 lines)
├── dev-plan.md       # REWRITTEN — Phase 2 prompt (~198 lines)
└── dev-plan.md.bak   # BACKUP — old orchestration-v2-based version (delete after smoke test)
```

No `plugins/rd3/skills/task-synthesis/` directory. No TypeScript scripts. No unit tests for non-existent code.

#### Data Flow (Phase 1: `/rd3:dev-new-task`)

```
User invocation → command markdown loaded into agent context
  → agent paraphrases in-context conversation into Background/Requirements/Q&A/(Design/Solution if discussed)
  → agent derives title (or uses provided one)
  → agent shows synthesized body to user via AskUserQuestion (gate)
  → agent invokes Bash("tasks create <title> --background ... --requirements ... --json")
  → agent parses WBS/path from JSON
  → agent invokes Bash("tasks update <wbs> --section <name> --from-file <tmpfile>") for Q&A/Design/Solution if captured
  → agent runs Bash("tasks check <wbs>")
  → agent reports created WBS + path; suggests "/rd3:dev-plan <wbs>"
```

#### Data Flow (Phase 2: `/rd3:dev-plan`)

```
User invocation → command markdown loaded into agent context
  → agent invokes Bash("tasks get-wbs <path>") if a path was provided, then Bash("tasks show <wbs>") to load existing sections
  → agent detects gaps in [Design, Solution] (empty / _partial_ / _TBD_)
  → for each gap: agent synthesizes content (uses AskUserQuestion when conversation insufficient)
  → agent synthesizes Plan as `- [ ]` checkbox steps from Design + Solution
  → agent shows updated sections via AskUserQuestion (gate; skipped if --auto)
  → for each updated section: agent writes tmpfile + invokes Bash("tasks update <wbs> --section <name> --from-file <tmpfile>")
  → agent runs Bash("tasks check <wbs>")
  → agent reports summary; suggests "/rd3:dev-run <wbs>"
```

#### Section Quality Markers

Used by the agent to signal section completeness in task files:
- Empty → section never populated
- `_TBD_` → placeholder for content the agent could not verify
- `_partial_` → section has some content but is acknowledged as incomplete (Phase 2 will gap-fill)
- Normal content → section is complete

#### Why no skill?

Three reasons the original "skill + lib + tests" plan was wrong:

1. **No reusable algorithmic logic.** The synthesis is the agent paraphrasing context. There's nothing to factor out into pure TypeScript functions that aren't trivially equivalent to "render section heading + content".
2. **Slash commands already are the prompt.** Markdown command files are the runtime prompt the agent executes. Adding a skill layer means the command's job becomes "tell the agent to invoke a skill that tells the agent to do X" — pure indirection.
3. **Existing global `tasks` CLI provides every needed primitive.** `tasks create --background --requirements --json` plus `tasks update --section --from-file` covers the richer body flow without new mechanics or `rd3:tasks` skill delegation.


### Solution

#### Implementation: two markdown files only

The implementation consists of writing/editing two markdown command files. No TypeScript, no skill scaffolding, no unit tests.

| File | Action | Lines | Purpose |
|---|---|---|---|
| `plugins/rd3/commands/dev-new-task.md` | NEW | ~197 | Phase 1 prompt for the agent |
| `plugins/rd3/commands/dev-plan.md` | REWRITE (with `.bak`) | ~198 | Phase 2 prompt for the agent |
| `plugins/rd3/commands/dev-plan.md.bak` | BACKUP | — | Old orchestration-v2-based version, retained until smoke test passes |

#### Implementation Order (actual)

1. ✅ **Backup** — `cp plugins/rd3/commands/dev-plan.md plugins/rd3/commands/dev-plan.md.bak`
2. ✅ **Write `dev-new-task.md`** — Phase 1 prompt covering arg parsing, section synthesis contract, anti-hallucination rules, gate, persistence via global `tasks create` + optional `tasks update --section --from-file`, validation, success messaging.
3. ✅ **Rewrite `dev-plan.md`** — Phase 2 prompt covering task resolution via global `tasks get-wbs`/`tasks show`, gap detection, Design/Solution synthesis with `AskUserQuestion` elicitation, Plan synthesis as `- [ ]` checkboxes, gate, per-section persistence via `tasks update --section --from-file`, validation, idempotency rules.
4. ⏳ **Manual smoke test** — invoke `/rd3:dev-new-task` and `/rd3:dev-plan` end-to-end (deferred to user).
5. ⏳ **Delete `dev-plan.md.bak`** once smoke test passes (deferred to user).

> Note: Cleanup of `rd3:orchestration-v2` (orphaned `plan_only` preset, `dev-refine.md` See Also, CHANGELOG) is deferred to a separate task. Git operations (branch, commit, push) are performed manually by the user, not by the implementation agent.

#### Reuse Inventory

| Need | Mechanism |
|---|---|
| Task file creation (Background + Requirements only) | `tasks create "<title>" --background "..." --requirements "..." [--folder ...] [--preset ...] [--tags ...]` |
| Task file creation (with Q&A/Design/Solution) | `tasks create "<title>" --background "..." --requirements "..." --json`, then `tasks update <wbs> --section Q&A|Design|Solution --from-file <tmpfile>` |
| Per-section update | `tasks update <wbs> --section <name> --from-file <tmpfile>` (existing primitive) |
| Section reading | `tasks show <wbs>` |
| WBS resolution from path | `tasks get-wbs <path>` |
| User confirmation | `AskUserQuestion` tool |
| Task-file operation routing | Global `tasks` CLI via Bash; do not use `Skill(skill="rd3:tasks")` |
| Anti-hallucination protocol | Documented inline in each command's prompt |

#### Out of Scope

- Multi-task batch creation (Phase 1 creates one task per invocation).
- Cross-task dependency wiring (use `tasks update --field dependencies` separately).
- Rendering Design as diagrams (text only; mermaid/diagrams deferred).
- Preserving conversation message-turn citations (paraphrase, not quote).
- Any TypeScript skill or library code (the agent does the synthesis directly from the markdown prompt).
- Unit tests (no code to test — the markdown prompts are validated by manual smoke test).


### Plan

Step-by-step implementation plan. Scope: the task file plus the two slash command markdown files. **No git operations.** **No new skill/library/tests** (slash commands are pure markdown prompts; the agent does the synthesis at runtime). **No changes to `rd3:orchestration-v2`, `dev-refine.md`, or CHANGELOG** — those are deferred to a separate task.

- [x] 1. Review drift against the stated lifecycle
  - [x] Compare `docs/tasks2/0400_create_new_slash_command_dev-new-task.md` with `plugins/rd3/commands/dev-new-task.md` and `plugins/rd3/commands/dev-plan.md`
  - [x] Identify incorrect `rd3:tasks` skill delegation and unsupported `tasks create --content` guidance
  - [x] Confirm supported global CLI primitives: `tasks create --background --requirements --json`, `tasks get-wbs`, `tasks show`, `tasks update --section --from-file`, `tasks check`
- [x] 2. Fix `/rd3:dev-new-task`
  - [x] Remove `Skill` from allowed tools
  - [x] Require global `tasks` CLI usage instead of `Skill(skill="rd3:tasks")`
  - [x] Define create-then-update flow for optional Q&A/Design/Solution sections
  - [x] Preserve anti-hallucination, approval gate, dry-run, and next-step behavior
- [x] 3. Fix `/rd3:dev-plan`
  - [x] Remove `Skill` from allowed tools
  - [x] Require global `tasks get-wbs`/`tasks show`/`tasks update`/`tasks check`
  - [x] Preserve Design/Solution gap filling, Plan synthesis, idempotency, `--auto`, and `--dry-run`
  - [x] Keep `rd3:orchestration-v2`, `--channel`, and `--preset` out of the new planning path
- [x] 4. Update this task file
  - [x] Align Requirements, Design, Solution, Plan, and Review with the global `tasks` CLI preference
  - [x] Remove stale claims that the commands should delegate to `rd3:tasks` skill or use `tasks create --content`
  - [x] Record the current verification status accurately
- [x] 5. Verify
  - [x] Run `tasks check 0400`
  - [x] Confirm command files no longer allow or instruct `Skill(skill="rd3:tasks")`
  - [ ] Manual smoke test `/rd3:dev-new-task` then `/rd3:dev-plan <wbs>` on a real conversation (human-in-the-loop)

**Acceptance Gates**
- [x] `plugins/rd3/commands/dev-new-task.md` exists and defines Phase 1 capture using global `tasks`
- [x] `plugins/rd3/commands/dev-plan.md` exists and defines Phase 2 planning using global `tasks`
- [x] No `rd3:orchestration-v2` delegation remains in the planning implementation
- [x] No new task-synthesis skill or TypeScript code exists
- [x] `tasks check 0400` passes
- [ ] Manual smoke test confirms both commands work end-to-end


### Review

#### Verification Run 4 — 2026-04-29 (global `tasks` CLI alignment)

**Status:** Commands and task spec realigned to the intended two-step lifecycle after brainstorming.

**Issues Found and Fixed**

| # | Issue | Dimension | Resolution |
|---|---|---|---|
| 1 | The command prompts delegated task-file operations to `Skill(skill="rd3:tasks")` | Correctness / User preference | Replaced delegation with explicit global `tasks` CLI operations through Bash. `Skill` was removed from both command frontmatter `allowed-tools`. |
| 2 | The task spec referenced `tasks create --content`, but the current global CLI help does not expose a `--content` flag | Correctness | Reworked Phase 1 persistence to create the task with `tasks create --background --requirements --json`, then update optional Q&A/Design/Solution sections with `tasks update <wbs> --section <name> --from-file <tmpfile>`. |
| 3 | The previous Review/Plan text claimed thin wrappers should hide CLI mechanics behind `rd3:tasks` | Documentation drift | Updated Requirements, Design, Solution, Plan, and Review to make global `tasks` CLI the canonical task-file operation path. |
| 4 | `dev-plan.md` needed to remain a replacement for the old orchestration-v2 path without reviving deprecated flags | Correctness | Kept `--channel` and `--preset` unsupported, retained `--auto`/`--dry-run`, and documented direct `tasks get-wbs`/`tasks show`/`tasks update`/`tasks check` usage. |

**Requirements Traceability**

| Req | Verdict | Evidence |
|---|---|---|
| R1 | **MET** | `plugins/rd3/commands/dev-new-task.md` captures Background/Requirements, optional Q&A/Design/Solution, anti-hallucination rules, confirmation gate, dry-run, and global `tasks` create/update/check flow. |
| R2 | **MET** | `plugins/rd3/commands/dev-plan.md` resolves WBS/path, gap-fills Design/Solution, synthesizes Plan, respects idempotency, persists via global `tasks update --section --from-file`, and does not delegate to `rd3:orchestration-v2`. |
| R3 | **PARTIAL** | `tasks check 0400` passes. Manual smoke testing of live slash command execution remains human-in-the-loop. |
| Out of Scope | **MET** | No new skill/library/test code and no `rd3:orchestration-v2`, `dev-refine.md`, CHANGELOG, branch, commit, or push work. |

**Verdict:** PASS for static implementation and task-file alignment. Manual slash-command smoke testing remains pending.


### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References
