---
description: Capture the current brainstorm conversation as a new task file
argument-hint: "[title] [--folder <path>] [--tags <a,b>] [--dry-run]"
allowed-tools: ["Read", "Bash", "AskUserQuestion"]
---

# Dev New Task

Convert the current in-context conversation (typically after `/rd3:dev-brainstorm`) into a new task file.

This is **Phase 1** of the two-command task lifecycle:

- **Phase 1 — `/rd3:dev-new-task`**: capture Background + Requirements always; capture Q&A and any Design/Solution only when already discussed.
- **Phase 2 — `/rd3:dev-plan <wbs>`**: gap-fill missing Design/Solution and synthesize Plan.

Use the global `tasks` CLI for task-file operations. Do **not** invoke `rd3:tasks` via `Skill()`, and do **not** write task files directly.

## When to Use

- A brainstorm conversation has reached enough alignment to capture as a task.
- You want to preserve conversation context as a structured task file before it scrolls out of memory.

## Arguments

| Arg / Flag | Required | Default | Description |
|---|---|---|---|
| `title` | No | Derived from Background (≤80 chars) | Task name passed to `tasks create` |
| `--folder <path>` | No | `tasks` config `active_folder` | Target folder override |
| `--tags <a,b>` | No | none | Forwarded to `tasks create --tags` |
| `--dry-run` | No | false | Print synthesized markdown; do not create or update any file |

## Workflow

1. **Parse arguments** from `$ARGUMENTS`.
2. **Synthesize sections** from the in-context conversation:
   - **Background** (always) — motivation and context.
   - **Requirements** (always) — required behavior and acceptance criteria as bullets.
   - **Q&A** (only if clarifications occurred) — verbatim or close-paraphrase Q/A pairs.
   - **Design** (only if discussed) — opportunistic capture; mark `_partial_` if thin.
   - **Solution** (only if discussed) — opportunistic capture; mark `_partial_` if thin.
   - Never populate **Plan / Review / Testing / Artifacts / References** — downstream commands own them.
3. **Conversation sufficiency check**:
   - If the conversation has fewer than ~5 substantive turns, warn via `AskUserQuestion` and offer: proceed, abort, or run `/rd3:dev-brainstorm` first.
4. **Derive title** if omitted from the first clear Background sentence; keep it ≤80 characters.
5. **Render preview markdown** containing the sections that will be written.
6. **Gate** via `AskUserQuestion` with choices: approve, edit, abort. Show the derived title, target folder, forwarded flags, and full rendered body. If `--dry-run`, print the preview and exit without asking.
7. **Create the task** with global `tasks` CLI:
   - Always start with `tasks create "<title>" --background "<background>" --requirements "<requirements>" [--folder <path>] [--tags <a,b>] --json`.
   - Parse the returned JSON to get `wbs` and `path`.
   - If Q&A, Design, or Solution were captured, write each section to a temp file and persist it with `tasks update <wbs> --section <name> --from-file <tmpfile>`.
8. **Validate and report**:
   - Run `tasks check <wbs>`.
   - Print created WBS + path, updated optional sections, and suggest `/rd3:dev-plan <wbs>`.

## CLI Contract

Use `Bash` for all task operations:

```bash
tasks create "<title>" \
  --background "<background>" \
  --requirements "<requirements>" \
  [--folder <path>] [--tags <a,b>] \
  --json

tasks update <wbs> --section Q&A --from-file /tmp/dev-new-task-qna.md
tasks update <wbs> --section Design --from-file /tmp/dev-new-task-design.md
tasks update <wbs> --section Solution --from-file /tmp/dev-new-task-solution.md
tasks check <wbs>
```

Do not use `tasks create --content`; the global CLI contract for rich task creation is create first, then update optional sections.

## Section Quality Contract

| Section | Required | Source | Notes |
|---|---:|---|---|
| Background | Yes | Conversation context | Explain why this task exists |
| Requirements | Yes | User-stated goals | Include acceptance criteria |
| Q&A | Conditional | Clarification turns | Preserve user intent closely |
| Design | Conditional | Discussed architecture/UI | Mark `_partial_` if incomplete |
| Solution | Conditional | Discussed implementation approach | Mark `_partial_` if incomplete |
| Plan | No | — | Phase 2 only |
| Review / Testing / Artifacts / References | No | — | Downstream only |

## Anti-Hallucination

- Paraphrase only from the conversation; do not invent unsupported technical claims.
- Mark unverifiable specifics as `_TBD_`.
- If codebase facts are needed, verify with `Read`/`Bash` before stating them.
- Do not invent file paths, APIs, libraries, or constraints.

## Edge Cases

| Situation | Handling |
|---|---|
| Conversation < 5 substantive turns | Warn; ask whether to proceed, abort, or brainstorm first |
| `tasks create` fails | Surface the error and rendered body so the user can save manually |
| Optional section update fails | Surface the error; report created WBS and which sections remain pending |
| `tasks check <wbs>` fails | Report validation output; do not claim completion |
| `--dry-run` | Print title + body + exact planned commands; never mutate files |
| `title` omitted | Derive title; show it at the gate so the user can edit |

## Examples

```bash
# Capture conversation; agent derives title
/rd3:dev-new-task

# Explicit title
/rd3:dev-new-task "Add OAuth support to API"

# Dry-run preview
/rd3:dev-new-task --dry-run

# With folder + tags
/rd3:dev-new-task "Refactor auth" --folder docs/tasks2 --tags refactor,auth
```

## See Also

- **/rd3:dev-brainstorm** — upstream ideation that produces the conversation
- **/rd3:dev-plan** — Phase 2: gap-fill Design/Solution and synthesize Plan
- **/rd3:dev-run** — full implement/test/verify pipeline after planning
- **tasks** — global task-file CLI (`tasks create`, `tasks update`, `tasks show`, `tasks check`)
