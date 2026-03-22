---
name: upgrade_and_simplify_tasks
description: Port rd2:tasks from Python to TypeScript, simplify the codebase, strengthen agent enforcement, and add put/get/tree commands for WBS-specific file storage
status: Done
created_at: 2026-03-21
updated_at: 2026-03-22T17:31:58.464Z
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0251. Upgrade and Simplify Tasks CLI

### Background

We developed rd2:tasks and use it daily. It works well, but we have accumulated technical debt:

1. **Python to TypeScript migration**: The 2324-line `tasks.py` was written in Python. We want to standardize on TypeScript + Bun + Biome for consistency with rd3 skill architecture and better type safety / linting.

2. **Simplification needed**: The current script has grown organically and contains features that are redundant, rarely used, or overly complex:
   - The `_analyze_requirement()` method uses hardcoded keyword patterns (authentication, oauth, api, etc.) that are a limited subset of what the `rd2:task-decomposition` skill already does better
   - `cmd_log()` is developer debugging code, not product functionality
   - Log rotation is a nice-to-have rather than core functionality
   - Symlink creation in `cmd_init()` makes assumptions about Homebrew being installed
   - `--from-stdin` and `--from-agent-output` add complexity for marginal benefit
   - `decompose` command duplicates the dedicated `rd2:task-decomposition` skill

3. **Agent skill enforcement**: The current rd2:tasks skill does not strongly enforce that agents MUST use `tasks` CLI for all task operations. We need a more opinionated skill that prevents agents from directly editing task files or creating ad-hoc task management.

4. **WBS-specific file storage**: Currently there is no CLI support for managing complementary files (design docs, diagrams, test outputs) that belong to a specific task. We want `docs/tasks/<wbs>/` to be the canonical location for task-related files, with CLI support to put/get them.

### Requirements

#### Default Folder Convention

| Folder | Purpose | Base Counter Default |
|--------|---------|---------------------|
| `docs/tasks/` | Primary task storage | 0 |
| `docs/tasks/` | Primary task storage | 0 |
| `docs/prompts/` | Deprecated legacy storage | configurable |

- `docs/tasks/` is the **default active folder** for new projects initialized with `tasks init`
- `docs/prompts/` is **deprecated** (legacy Phase 1 naming) — existing projects keep their config
- Folders are configurable via `tasks config add-folder <path> --base-counter <N>`
- Each folder's `base_counter` prevents WBS collisions within that folder

#### Write Guard Integration

The Write guard is implemented as a **CLI command**, not a separate shell script:

**`tasks write-guard --stdin`**
- Reads JSON from stdin: `{"tool_name":"Edit","tool_input":{"file_path":"docs/tasks/0251_test.md"}}`
- Returns exit code: `0` = allow, `1` = warn, `2` = block
- The PreToolUse hook calls: `bun scripts/tasks.ts write-guard --stdin` with the tool JSON
- No changes to `rd2_guard.sh` required — the hook already calls a command; just point it to `tasks write-guard`

#### Template Refinements

Templates are **bundled with the skill** and copied to the project on `tasks init`:

| Template | Skill Location | Project Destination | Changes |
|----------|---------------|-------------------|---------|
| Task template | `plugins/rd3/skills/tasks/templates/task.md` | `docs/.tasks/template.md` | Add `### Solution`; add `folder`/`type` frontmatter |
| Kanban template | `plugins/rd3/skills/tasks/templates/kanban.md` | `docs/.tasks/kanban.md` | Add emoji per column |
| Legacy template | `plugins/rd3/skills/tasks/templates/prompts.md` | `docs/prompts/.template.md` | Add `### Solution` section |

**On `tasks init`:**
- If `docs/.tasks/template.md` already exists → skip (preserve project customization)
- If missing → copy from `plugins/rd3/skills/tasks/templates/task.md`
- Same logic for `kanban.md` and `docs/prompts/.template.md`

**Kanban emoji convention:**

| Column | Emoji | Example |
|--------|-------|---------|
| Backlog | 🔴 | `- [ ] 0251_upgrade_tasks` |
| Todo | 🔵 | `- [ ] 0171_fix_bug` |
| WIP | 🟡 | `- [.] 0190_enhance_planner` with `[🟡 plan 🔬 impl ⚙️ review]` inline |
| Testing | 🟠 | `- [.] 0155_testing_phase` with `[🔬 test]` inline |
| Blocked | ⛔ | `- [X] 0160_blocked_issue` |
| Done | 🟢 | `- [x] 0142_structured_output` |

#### Core Commands (Keep & Port)

Port these commands from rd2:tasks to rd3:tasks with same behavior, preserving existing CLI usage patterns:

| Command | Description |
|---------|-------------|
| `init` | Initialize tasks metadata directory (idempotent) |
| `create <name>` | Create new task file |
| `list [stage]` | List tasks, optionally filtered by stage |
| `list --json` | JSON output for agent consumption |
| `status` | Alias for `list` (human mental model) |
| `update <WBS> <stage>` | Update task status with validation |
| `update <WBS> --section <name> --from-file <path>` | Update section content |
| `show <WBS>` | Show task content (for agents) |
| `open <WBS>` | Open task in editor (for humans) |
| `refresh` | Regenerate kanban boards |
| `check [WBS]` | Validate task(s) |
| `config [set-active\|add-folder]` | Configure multi-folder |
| `batch-create --from-json FILE` | Create multiple tasks |

#### Commands to Add

1. **`tasks put <WBS> <file> [--name <display-name>]`**
   - Copy a file to `docs/tasks/<wbs>/`
   - Lazily create the `docs/tasks/<wbs>/` directory on first put (do NOT create on task creation)
   - Track the file in the task's Artifacts table
   - If `--name` not provided, use original filename
   - **Bypasses Write guard hook** — this is a file organization command, not a task content edit

2. **`tasks get <WBS> [--artifact-type <type>]`**
   - List files stored for a task in `docs/tasks/<wbs>/`
   - With `--artifact-type`, filter by type column in Artifacts table
   - Output JSON array of file paths for agent consumption
   - `tasks get <WBS> --json` for structured output

3. **`tasks tree <WBS>`**
   - Show the directory structure of `docs/tasks/<wbs>/`

#### Commands to Remove (Simplification)

| Removed Command | Reason |
|----------------|--------|
| `decompose` | Duplicates `rd2:task-decomposition` skill functionality |
| `log` | Developer debugging tool, not product functionality |
| `--from-stdin` on create | Unused complexity |
| `--from-agent-output` | Complex feature rarely used |
| Symlink creation in `init` | Makes assumptions about Homebrew |
| Log rotation | Nice-to-have, not core functionality |

#### Features to Retain (with potential refactoring)

- **Dual-mode config**: Legacy mode (no config.jsonc) and config mode (with config.jsonc) must both work
- **Global WBS uniqueness**: WBS numbers must never collide across folders
- **Tiered validation**: Tier 1 (errors), Tier 2 (warnings with --force), Tier 3 (suggestions)
- **Multi-folder support**: Tasks stored across multiple folders with per-folder kanban boards
- **impl_progress tracking**: Phase-based progress in frontmatter

### New Features & Suggestions

These are recommended additions based on implementation experience with rd2:tasks:

| # | Feature | Rationale |
|---|---------|-----------|
| F1 | **`--json` output mode for all commands** | Agents parse structured output reliably; humans get human-readable by default |
| F2 | **Idempotent commands** | `tasks init` safe to re-run; `tasks create` warns if WBS already exists |
| F3 | **`--dry-run` flag** | Preview status transitions before committing |
| F4 | **Per-folder WBS base offset** | `docs/tasks/engineering/` starts at 1000, `docs/tasks/research/` at 5000 — reduces coordination overhead |
| F5 | **Result-type error handling** | No more `print` + `sys.exit()` mixing — use `Result<T, Error>` pattern |
| F6 | **`tasks status` alias** | Alias for `list` — matches common human mental model |

### Agent Skill Improvements

The rd3:tasks skill must be more opinionated:

1. **Activation triggers** (expand existing):
   - All existing triggers from rd2:tasks
   - Add: "create subtasks", "break down", "decompose requirement" (route to task-decomposition skill instead)

2. **Prohibited behaviors** (enforce via skill instructions):
   - NEVER use Write tool directly on task files (`docs/tasks/*.md`, `docs/prompts/*.md`)
   - NEVER create task-like markdown files outside the tasks CLI
   - NEVER use ad-hoc todos for persistent task tracking
   - ALWAYS use `tasks create` for new tasks
   - ALWAYS use `tasks update` for status changes
   - NEVER edit task frontmatter or content directly
   - NEVER bypass `tasks put` for files that belong to a task's `docs/tasks/<wbs>/` directory

3. **Required output format**:
   - When creating tasks, output WBS numbers prominently
   - Include `<!-- TASKS: [...] -->` footer for batch operations
   - Always use `--json` flag when invoking `tasks` from subagents for parseable output

### Data Compatibility

- rd3:tasks **MUST** read and write the same task file format as rd2:tasks
- `docs/.tasks/config.jsonc` format remains unchanged
- Kanban board format remains unchanged
- **Migration path**: Existing projects can continue using rd2:tasks or migrate to rd3:tasks (same data format, coexist supported)
- **Kanban format**: Updated to include emoji per column (🔴 🔵 🟡 🟠 ⛔ 🟢) and inline impl_progress for WIP/Testing tasks

### Platform Compatibility

- CLI entry point: `bun scripts/tasks.ts`
- Linting/formatting: `biome` (per rd3 stack)
- All platform detection code (darwin/linux/win32) must be preserved from rd2:tasks
- Shell completion support is **out of scope** for this phase

### Quality Requirements

- Minimum **80% test coverage** for core commands
- All existing rd2:tasks tests that test preserved behavior must have equivalent TypeScript tests
- **Backward compatibility test**: files created by rd2:tasks work correctly with rd3:tasks
- **`--dry-run` validation test**: status transitions preview correctly before commit

### Q&A

**Q: Why remove `decompose` command?**
A: The `_analyze_requirement()` method uses hardcoded keyword patterns that are a poor substitute for the dedicated `rd2:task-decomposition` skill which has proper AI-powered decomposition. Having both creates confusion.

**Q: How does `tasks put` relate to the Write guard hook?**
A: `tasks put` copies files to `docs/tasks/<wbs>/` which is a subdirectory of the task folder. The Write guard hook protects `docs/tasks/*.md` files from direct writes. `tasks put` operates on the subdirectory — agents should use `tasks put` for file organization rather than Write tool directly.

**Q: Can rd2:tasks and rd3:tasks coexist?**
A: Yes, they use the same data format. Projects can migrate incrementally.

**Q: Why lazy directory creation for `docs/tasks/<wbs>/`?**
A: Most tasks don't have complementary files. Creating directories eagerly wastes filesystem overhead and creates clutter for tasks that never accumulate artifacts.

**Q: What about the Write guard hook in rd2_guard.sh?**
A: It must be updated to allow writes to `docs/tasks/<wbs>/` subdirectories while protecting `docs/tasks/*.md` and `docs/prompts/*.md` files. This is a separate change — coordinate with the hook update.

### Design

#### TypeScript Project Structure

```
plugins/rd3/skills/tasks/
├── SKILL.md
├── scripts/
│   └── tasks.ts           # Main CLI entry
├── templates/              # Bundled with skill, copied to project on `init`
│   ├── task.md            # Default task template
│   ├── kanban.md          # Kanban board template
│   └── prompts.md         # Legacy template (docs/prompts/.template.md)
├── src/
│   ├── commands/           # One file per command
│   │   ├── init.ts
│   │   ├── create.ts
│   │   ├── list.ts
│   │   ├── update.ts
│   │   ├── show.ts
│   │   ├── open.ts
│   │   ├── refresh.ts
│   │   ├── check.ts
│   │   ├── config.ts
│   │   ├── batchCreate.ts
│   │   ├── put.ts
│   │   ├── get.ts
│   │   ├── tree.ts
│   │   └── writeGuard.ts  # PreToolUse hook integration
│   ├── lib/
│   │   ├── taskFile.ts    # Read/write task files
│   │   ├── wbs.ts         # WBS number management
│   │   ├── config.ts      # Config loading (dual-mode)
│   │   ├── kanban.ts      # Kanban board generation
│   │   ├── result.ts      # Result type for error handling
│   │   └── template.ts    # Template loading & variable substitution
│   └── types.ts           # Shared TypeScript types
└── tests/
    ├── commands/
    │   ├── create.test.ts
    │   ├── list.test.ts
    │   ├── update.test.ts
    │   └── ...
    └── lib/
        └── wbs.test.ts
```

#### Output Format

All commands support two output modes:

- **Human mode** (default): Pretty-printed, colored, contextual
- **JSON mode** (`--json`): Machine-parseable, consistent structure

```typescript
// Example: tasks list --json
{
  "ok": true,
  "data": [
    { "wbs": "0251", "name": "Upgrade and Simplify Tasks", "status": "Backlog", "folder": "docs/tasks" }
  ]
}

// Example: tasks get 0251 --json
{
  "ok": true,
  "wbs": "0251",
  "artifacts": [
    { "name": "design.md", "path": "docs/tasks/0251/design.md", "type": "design" }
  ]
}
```

### Solution

[To be populated during implementation phase]

### Plan

**Phase 1: Design & Simplification (P1)**
- [ ] Audit current features of rd2:tasks, confirm removal list
- [ ] Design new `put`/`get`/`tree` commands with CLI interface
- [ ] Define TypeScript project structure
- [ ] Finalize template files (task template, kanban with emojis, config.jsonc)
- [ ] Design per-folder WBS base offset feature (F4)
- [ ] Implement `tasks write-guard --stdin` command

**Phase 2: TypeScript Implementation (P2)**
- [ ] Set up TypeScript project with Bun + Biome
- [ ] Implement core types and `Result` error handling
- [ ] Implement `init`, `create`, `list`, `show`, `open`, `refresh`, `check`, `config`
- [ ] Implement `update` with `--dry-run` and tiered validation
- [ ] Implement `batch-create`
- [ ] Implement `put`, `get`, `tree`
- [ ] Add `--json` output mode to all commands
- [ ] Make commands idempotent where sensible

**Phase 3: Agent Skill Enhancement (P3)**
- [ ] Update SKILL.md with prohibited behaviors
- [ ] Add new activation triggers (route "decompose" to task-decomposition)
- [ ] Define required output format for agents
- [ ] Document `--json` usage for subagent communication

**Phase 4: Testing & Migration (P4)**
- [ ] Write unit tests targeting 80% coverage
- [ ] Backward compatibility test (rd2:tasks files work with rd3:tasks)
- [ ] Integration test: full workflow create → put → get → update → refresh
- [ ] Create migration guide for projects switching from rd2:tasks

### Artifacts

| Type | Path | Generated By | Date |
|------|------|--------------|------|
| TypeScript project | `plugins/rd3/skills/tasks/` | implementor | TBD |
| SKILL.md | `plugins/rd3/skills/tasks/SKILL.md` | implementor | TBD |
| Tests | `plugins/rd3/skills/tasks/tests/` | implementor | TBD |
| Refined templates | `docs/.tasks/template.md`, `docs/.tasks/kanban.md` | rd2:super-brain | 2026-03-21 |

### References

- Existing rd2:tasks: `plugins/rd2/skills/tasks/`
- Task decomposition skill: `plugins/rd2/skills/task-decomposition/`
- rd3 cc-skills for TypeScript project pattern: `plugins/rd3/skills/cc-skills/`
- Biome for linting/formatting: `biome` (aligned with rd3 stack)
