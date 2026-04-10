---
name: tasks
description: "Markdown-based task management with WBS numbering and kanban boards. Use when: creating tasks, updating task status, listing tasks, managing task artifacts (put/get), validating task content, refreshing kanban boards, extracting WBS from file paths, or resolving task file paths from WBS numbers. Triggers: 'create task', 'new task', 'update task status', 'list tasks', 'show task', 'task artifacts', 'put file for task', 'get task artifacts', 'refresh kanban', 'get WBS', 'get task file', 'find task path'. NOT for: requirement decomposition or scope analysis."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-21
updated_at: 2026-04-10
platform: rd3
tags: [tasks, kanban, wbs, task-management, markdown]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  interactions:
    - tool-wrapper
  openclaw:
    emoji: "📋"
    requires:
      bins:
        - tasks
        - bun
see_also:
  - rd3:cc-skills
---

# rd3:tasks — Markdown-Based Task Management

Task files live in `docs/tasks/<wbs>_<name>.md` with YAML frontmatter and markdown body sections. Task metadata and templates live in `docs/.tasks/`. WBS numbers are globally unique across all configured folders. The canonical orchestration frontmatter key is `preset`; legacy task files may still use `profile`, and the CLI accepts both.

## Runtime Assumption

This skill assumes the `tasks` CLI is globally accessible on `PATH` and should always be invoked as `tasks ...`.

- Required operator setup: ensure `tasks` resolves to the rd3 implementation before using this skill.
- Do not invoke this skill via absolute or relative script paths such as `plugins/rd3/skills/tasks/scripts/tasks.ts`.
- Do not use `bun plugins/rd3/skills/tasks/scripts/tasks.ts ...` or similar path-based fallbacks inside agent workflows.

Quick check:

```bash
which tasks
```

## Core Commands

### Task Lifecycle

```bash
# Create a new task (assigns next available WBS)
tasks create "Implement user authentication"
tasks create "Implement user authentication" \
  --background "Why this work exists" \
  --requirements $'- Requirement 1\n- Requirement 2'
tasks create "Implement user authentication" --preset standard
tasks create "Implement user authentication" --profile standard   # legacy alias

# List all tasks (optionally filter by status)
tasks list
tasks list wip

# Update task status (Tier-2 validation blocks WIP/Testing/Done without content)
tasks update 0047 wip
tasks update 0047 testing --force   # bypass content warnings
tasks update 0047 done

# Show full task content (for agents)
tasks show 0047 --json

# Open task in editor (for humans)
tasks open 0047
```

### Advanced Operations

```bash
# Update a specific section from a file
tasks update 0047 --section Solution --from-file /tmp/solution.md

# Update implementation phase progress
tasks update 0047 --phase planning --phase-status completed
tasks update 0047 --phase design --phase-status in_progress
tasks update 0047 --field preset --value complex
tasks update 0047 --field profile --value complex   # legacy alias

# Batch create from JSON array
tasks batch-create --from-json /tmp/tasks.json

# Batch create from an agent <!-- TASKS: [...] --> footer
tasks batch-create --from-agent-output /tmp/analysis.md

# Store artifact for a task (lazy-creates <task-dir>/<wbs>/)
tasks put 0047 /tmp/design.png --name design.png

# List or tree artifacts for a task
tasks get 0047
tasks tree 0047
```

### Path & ID Lookup

```bash
# Extract WBS number from a task file path
tasks get-wbs docs/tasks/0047_my-task.md    # → 0047
tasks get-wbs 0047_my-task.md              # → 0047
tasks get-wbs /path/to/0123_task.md        # → 0123
tasks get-wbs invalid.md                    # → (blank)

# Get full file path for a WBS (searches all configured folders)
tasks get-file 0047    # → /path/to/docs/tasks/0047_my-task.md
tasks get-file 0001    # → /path/to/docs/prompts/0001_legacy-task.md
```

### Admin

```bash
# Initialize project (creates docs/.tasks/, copies templates, idempotent)
tasks init

# Refresh all kanban boards
tasks refresh

# Validate task content (non-zero exit on errors or warnings)
tasks check 0047

# Multi-folder config
tasks config                              # show current config
tasks config set-active docs/tasks        # switch active folder
tasks config add-folder docs/prompts --base-counter 100 --label legacy
tasks server
TASKS_PORT=4567 tasks server --host 127.0.0.1
```

### Server Mode

`tasks server` starts a local HTTP server for multi-agent and tool-driven task access.

```bash
tasks server
tasks server --port 4567 --host 127.0.0.1
TASKS_PORT=4567 tasks server
```

Defaults and behavior:

- Default bind: `127.0.0.1`
- Default port: `3456`
- Environment override: `TASKS_PORT`
- Mutating requests are serialized per-WBS to avoid concurrent task-file corruption
- All responses use the standard JSON envelope: `{ ok, data }` or `{ ok, error }`
- Both CLI and HTTP APIs accept canonical `preset` and legacy `profile`, but task-file writes normalize to `preset`

Endpoints:

```text
GET    /health
GET    /tasks
POST   /tasks
GET    /tasks/:wbs
PATCH  /tasks/:wbs
DELETE /tasks/:wbs
POST   /tasks/:wbs/artifacts
GET    /tasks/:wbs/artifacts
GET    /tasks/:wbs/tree
GET    /tasks/:wbs/check
POST   /tasks/batch-create
POST   /tasks/refresh
GET    /config
PATCH  /config
GET    /events
```

Notes:

- `GET /events` is a Server-Sent Events stream for task mutations.
- `GET /events?status=WIP` filters streamed events by resulting task status.
- `POST /tasks/:wbs/artifacts` requires `multipart/form-data` with a `file` field.
- Folder inputs must stay inside the project root; artifact names must be plain file names, not paths.

These commands are low-level primitives. For lifecycle mutations, do not invent ad-hoc sequences.
Use the canonical operation bundles in [references/workflows.md](references/workflows.md) so
section updates, `impl_progress`, and task `status` move together.

## Canonical Lifecycle Operations

Use one of these named operations when advancing a task:

| Operation | Primary Sections | Phase Target | Status Target |
|-----------|------------------|--------------|---------------|
| `create` | `Background`, `Requirements` | all `pending` | `Backlog` |
| `planning` | `Q&A` | `planning: completed` | `Todo` |
| `design` | `Design` | `design: completed` | `Todo` |
| `implementation` | `Solution`, `Plan`, `Artifacts` | `implementation: completed` | `WIP` |
| `review` | `Review` | `review: completed` | `Testing` |
| `testing` | `Testing`, `Artifacts`, `References` | `testing: completed` | `Done` |

Rule:

- Do not update `--section`, `--phase`, or `status` in isolation when one of the lifecycle
  operations applies.
- Execute the full command bundle for the chosen operation.
- Use `--force` only when validation warnings are understood and intentional.

See [references/workflows.md](references/workflows.md) for the exact command sequence for each
operation.

## WBS Numbering

WBS numbers are globally unique across ALL configured folders. `getNextWbs()` scans every folder and returns `max(all_wbs_numbers, all_base_counters) + 1`.

- Format: 4-digit zero-padded integer (`0001`, `0047`, `0234`)
- Canonical reference: `0047` and `47` are equivalent lookups
- Task file naming: `docs/tasks/0047_my-task-name.md`

## Activation Triggers

Activate rd3:tasks when you encounter:

| Trigger Phrase | Command Invoked |
|---------------|-----------------|
| "create a task", "new task", "add task" | `tasks create <name>` |
| "update task status", "move task to", "change task state" | `tasks update <wbs> <status>` |
| "list tasks", "show all tasks", "task board" | `tasks list` |
| "show task", "get task content", "view task" | `tasks show <wbs>` |
| "refresh kanban", "regenerate board" | `tasks refresh` |
| "check task", "validate task", "task quality" | `tasks check <wbs>` |
| "store artifact", "put file for task" | `tasks put <wbs> <file>` |
| "get task artifacts", "list task files" | `tasks get <wbs>` |
| "task tree", "task directory" | `tasks tree <wbs>` |
| "extract WBS", "get WBS from path" | `tasks get-wbs <file-path>` |
| "find task file", "get file for WBS", "resolve task path" | `tasks get-file <wbs>` |

### Scope Boundary

The rd3:tasks skill manages task records and lifecycle state. It does not perform requirement decomposition, business analysis, or system analysis.

If the request is still about clarifying scope, breaking work down, or shaping requirements, do not activate rd3:tasks yet. Use the appropriate planning or analysis workflow first, then return to rd3:tasks once concrete task records should be created or updated.

## Prohibited Behaviors (STRICT)

These rules are enforced by the skill instructions. Violations will produce errors.

### Forbidden: Direct File Writes

```typescript
// ❌ NEVER do this
Edit tool → "docs/tasks/0047_my-task.md"   // direct task file edit
Write tool → "docs/prompts/something.md"    // direct prompt file edit
Edit tool → "docs/tasks/0047/some-file.md"  // artifact subdir bypass
```

### Forbidden: Ad-Hoc Task Creation

```typescript
// ❌ NEVER do this
Edit/Create tool → "docs/tasks/new-feature-idea.md"   // not via tasks CLI
Edit/Create tool → "docs/prompts/0001_todo.md"        // not via tasks CLI
```

### Forbidden: Ad-Hoc Todos

```typescript
// ❌ NEVER do this
TodoWrite → tracking persistent project tasks
```

The `TodoWrite` tool is for transient scratchpad items only. All persistent task tracking MUST use rd3:tasks.

### Required: CLI for All Task Operations

```typescript
// ✅ ALWAYS do this
tasks create "Implement OAuth2 flow"
tasks update 0047 wip
tasks update 0047 --section Solution --from-file /tmp/solution.md
tasks put 0047 /tmp/screenshot.png --name screenshot.png
```

When performing lifecycle progress, prefer the canonical operation bundles from
`references/workflows.md` over one-off command combinations.

### Forbidden: Path-Based CLI Invocation

```typescript
// ❌ NEVER do this
plugins/rd3/skills/tasks/scripts/tasks.ts list
bun plugins/rd3/skills/tasks/scripts/tasks.ts create "Task"
/absolute/path/to/tasks.ts update 0047 done

// ✅ ALWAYS do this
tasks list
tasks create "Task"
tasks update 0047 done
```

### Required: Artifact Storage Via CLI

```typescript
// ❌ NEVER do this
Write tool → "docs/tasks/0047/design.png"

// ✅ ALWAYS do this
tasks put 0047 /tmp/design.png --name design.png
```

## JSON Output for Agents

All commands support `--json` for machine-readable output. Use this when invoking from subagents or scripts:

```bash
# Machine-readable output
tasks list --json
tasks show 0047 --json
tasks check 0047 --json
tasks get 0047 --json
tasks get-wbs docs/tasks/0047_my-task.md --json
tasks get-file 0047 --json

# Parse result in scripts
if tasks show 47 --json | jq '.ok' | grep -q true; then
  echo "Task exists"
fi
```

JSON output format:
```json
{
  "ok": true,
  "data": { ... command-specific payload ... }
}
```

Common payload shapes:

```json
{
  "ok": true,
  "data": {
    "wbs": "0047",
    "path": "/abs/path/docs/tasks/0047_my-task.md"
  }
}
```

```json
{
  "ok": true,
  "data": ["docs/tasks/0047/design.png"]
}
```

For errors:
```json
{
  "ok": false,
  "error": "Error message"
}
```

## Task File Format

```markdown
---
name: My Task
description: Brief description
status: Todo
created_at: 2026-03-21T10:00:00.000Z
updated_at: 2026-03-21T10:00:00.000Z
folder: docs/tasks
type: task
impl_progress:
  planning: pending
  design: in_progress
  implementation: pending
  review: pending
  testing: pending
---

### Background

Why this task exists and context.

### Requirements

Functional and non-functional requirements.

### Solution

Proposed approach and design decisions.

### Design

Detailed design with diagrams if applicable.

### Plan

Step-by-step implementation plan.

### Implementation Notes

Notes captured during implementation.

### Artifacts

| Type | Path | Agent | Date |
|------|------|-------|------|
| image | 0047/screenshot.png | | 2026-03-21 |

### References

Links to related docs, PRs, issues.
```

## Kanban Board

`tasks refresh` regenerates `docs/tasks/kanban.md`:

| Column | Emoji | Status |
|--------|-------|--------|
| Backlog | 🔴 | Backlog |
| Todo | 🔵 | Todo |
| In Progress | 🟡 | WIP |
| Blocked | ⛔ | Blocked |
| Testing | 🟠 | Testing |
| Done | 🟢 | Done |
| Canceled | ⚫ | Canceled |

WIP and Testing lines can include inline progress markers, for example:

```markdown
- [.] 0190_enhance_planner [🟡 plan 🔬 impl]
- [.] 0155_testing_phase [🔬 test]
```

## Tiered Validation

| Tier | Type | Blocks Transition | Fix |
|------|------|------------------|-----|
| Tier 1 | Structural error (missing status, invalid frontmatter) | YES | Fix task file |
| Tier 2 | Missing content (empty Background/Requirements/Solution/Design/Plan) | WIP/Testing/Done without `--force` | Fill in sections |
| Tier 3 | Missing References | NO | Add references |

Use `--force` to bypass Tier 2 warnings: `tasks update 0047 done --force`

`tasks check` exits non-zero when a task has validation errors or warnings.

## Configuration

Tasks use dual-mode config:

**Legacy mode** (no `docs/.tasks/config.jsonc`):
- Active folder: `docs/prompts/` (rd2 default)
- WBS counter: global, starts from 1

**Config mode** (with `docs/.tasks/config.jsonc`):
- Default active folder: `docs/tasks/`
- Multiple folders with independent base counters
- Config stored in `docs/.tasks/config.jsonc`
- Project templates stored in `docs/.tasks/task.md` and `docs/.tasks/kanban.md`

Run `tasks init` to migrate to config mode.
