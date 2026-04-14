# Tasks User Manual V2 (rd3)

**A practical guide to the rd3 task orchestration system.**

---

## Quick Start: Your First Task

In `rd3`, you don't just "create" a task; you orchestrate its lifecycle.

```bash
# 1. Plan and execute a simple feature in one command
/rd3:dev-run "Add user email validation" --profile simple

# 2. Start a full complex project with multiple phases
/rd3:dev-run "Build a distributed authentication system" --profile complex
```

The system will automatically:
1. **Intake**: Gather and refine requirements.
2. **Decompose**: Split large work into subtasks.
3. **Implement**: Generate code using TDD (Test-Driven Development).
4. **Verify**: Run tests and measure coverage.
5. **Review**: Perform a multi-model code review.
6. **Finalize**: Update documentation and mark `Done`.

---

## 1. Understanding the rd3 Ecosystem

The `rd3` task system is built on three layers:

1.  **Storage (`tasks` CLI)**: The source of truth. Task records are stored as Markdown files in `docs/tasks/`.
2.  **Specialists (`dev-*` commands)**: Targeted tools for planning, implementation, and review.
3.  **Orchestrator (`dev-run`)**: The brain that sequences the specialists through a 9-phase pipeline.

### Core Concepts

| Concept | Description |
|---------|-------------|
| **WBS (0047)** | A unique 4-digit ID assigned to every task. |
| **9-Phase Pipeline** | The lifecycle from requirements (P1) to documentation (P9). |
| **Execution Profile** | A preset governing which phases to run (`simple`, `complex`). |
| **Execution Channel** | Where the work happens (`auto`, explicit agent channels like `codex`, `opencode`; `current` is a deprecated alias of `auto`). |

---

## 2. Command Reference

### The "Dev" Command Family

The `dev-*` commands are your primary interface for task-driven development.

| Command | Purpose | Best For... |
|---------|---------|-------------|
| **`/rd3:dev-run <ref>`** | Runs the full pipeline. | Most development work. |
| **`/rd3:dev-plan <ref>`** | Runs phases 2, 3, and 4. | Architecture, Design, and Decomposition. |
| **`/rd3:dev-refine <ref>`** | Runs phase 1 (Intake). | Clarifying vague requirements. |
| **`/rd3:dev-unit <ref>`** | Runs phase 6 (Testing). | Fixing test regressions or coverage gaps. |
| **`/rd3:dev-review <ref>`** | Runs phase 7 (Review). | Final quality checks. |
| **`/rd3:dev-docs <ref>`** | Runs phase 9 (Docs). | Updating system specs after a change. |

### Smart Positional Inputs
All `dev-*` commands accept a `<ref>` which auto-detects:
- `0047` → WBS number.
- `docs/tasks/0047_*.md` → Physical file path.
- `"Description"` → (For `dev-run`/`dev-refine`) New requirements string.

---

## 3. Execution Profiles

Profiles determine which phases of the 9-phase pipeline are active.

| Profile | Phases | Description |
|---------|--------|-------------|
| **`simple`** | 5, 6 | Fast-track: Implementation and Testing only. |
| **`standard`** | 1, 4-9 | Default: Full lifecycle minus deep architecture/design. |
| **`complex`** | 1-9 | Maximum Rigor: Includes Architecture and Design reviews. |
| **`research`** | 1, 9 | Investigation: Requirements gathering and documentation only. |

**Usage:**
```bash
/rd3:dev-run 0047 --profile complex
```

---

## 4. The Kanban Web UI

The `rd3` system includes a real-time Kanban board for visual task tracking.

### Starting the Server
```bash
/rd3:tasks-cli server
```
This starts a local server (default: `http://localhost:3456`) where you can:
- **View Columns**: Backlog, Todo, WIP, Testing, Blocked, Done, Canceled.
- **Track Progress**: Real-time updates as agents move phases via SSE.
- **Inspect Artifacts**: Click tasks to view implementation details.
- **Drag-and-Drop**: Move tasks between columns to change status.
- **Create Tasks**: Add new tasks directly from the UI.

### Building the UI

If the UI isn't built yet:
```bash
cd plugins/rd3/skills/tasks/scripts/server/ui && bun run build
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TASKS_PORT` | `3456` | Server port |
| `TASKS_HOST` | `127.0.0.1` | Server bind address |

---

## 5. Working with Task Files

Task files live in `docs/tasks/`. While agents manage them via the `tasks` CLI, you can manually edit them to provide context.

### Lifecycle of a Task File
1.  **Backlog**: Initial idea or vague requirement.
2.  **Todo**: Requirements are finalized and design is approved.
3.  **WIP**: Implementation (Phase 5) is active.
4.  **Testing**: Unit tests (Phase 6) are running.
5.  **Done**: All gates (including Code Review) are passed.

### Validation Guards
The system prevents "lazy" status transitions. You cannot move a task to `WIP` or `Done` if mandatory sections (Requirements, Solution, Plan) are placeholder-only or empty.

---

## 6. Tips & Best Practices

- **Use `--auto` for Speed**: If you trust the agent for a minor task, use `/rd3:dev-run 0047 --auto` to skip human approval gates.
- **Cross-Channel Delegation**: Use `--channel codex` to run heavy implementation tasks on more powerful models while keeping your current session responsive.
- **Batch Creation**: Use `tasks batch-create --from-agent-output` to convert a brainstorming session into multiple concrete WBS tasks in one go.
- **Dry Run First**: If unsure about a complex profile, use `--dry-run` to see the execution plan without modifying files.

---

*End of User Manual. v2.3.0 — Generated by Lord Robb — 2026-04-14.*
