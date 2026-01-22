---
name: tasks
description: External task management with WBS numbers, kanban board sync, and TodoWrite integration. Auto-promotes complex TodoWrite items to persistent tasks. Use when creating tasks, updating status, listing tasks, WBS references (0047, task 47), or TodoWrite sync. Triggers "create task", "tasks create", "list tasks", "update status", WBS numbers, TodoWrite integration.
---

# Tasks

## Overview

Manages markdown-based task files with automatic kanban board synchronization and TodoWrite integration. Each task gets a WBS number (e.g., 0047) and is stored in `docs/prompts/` with frontmatter status tracking. Seamlessly integrates with Claude Code's TodoWrite for automatic promotion of complex ephemeral tasks to persistent project tracking.

## When to Use

**Activate this skill when:**

- User mentions: "create task", "update task status", "list tasks", "tasks wip/done"
- User references WBS numbers: "0047", "task 47", "update 48"
- Managing external task files with kanban board
- Coordinating multi-phase work with status tracking
- Need project-level task visibility
- **TodoWrite integration**: Complex work (implement, refactor, design), in_progress items, multi-step tasks

**Do NOT use for:**

- Simple ephemeral todos (TodoWrite handles automatically)
- Non-project task management
- Tasks that don't need cross-session persistence

## Quick Start

### `tasks` : Symlink for Short Commands

Always try to use the `tasks` command for convenience. If not available, use the full path:

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/tasks/scripts/tasks.py init
```

This initializes the tasks system and creates a symlink in `$HOMEBREW_PREFIX/bin`.

### Core Commands

```bash
# Initialize tasks system
tasks init

# Task management
tasks create "Implement feature X"
tasks list
tasks list wip
tasks update 47 testing
tasks update 0047 done
tasks refresh

# TodoWrite integration (automatic via hooks)
tasks sync todowrite --data '{"todos": [...]}'  # Auto-called by PreToolUse hook
tasks sync restore                               # Restore active tasks to TodoWrite
```

## TodoWrite Integration

The tasks skill integrates with Claude Code's built-in TodoWrite tool for seamless task management across ephemeral and persistent layers.

### How It Works

```
TodoWrite Item Created (e.g., "Implement OAuth2 authentication")
         ↓
  PreToolUse Hook Fires (automatic)
         ↓
  Smart Promotion Engine Evaluates (5 signals)
         ↓
  If ANY signal → Auto-promote to external task
         ↓
  Create Task File (WBS assigned, status synced)
         ↓
  Session Map Updated (hash → WBS tracking)
         ↓
  Promotion Logged (.claude/tasks_sync/promotions.log)
```

### Promotion Signals (OR Logic)

TodoWrite items are **auto-promoted** to external tasks when **any** signal triggers:

| Signal              | Description                                       | Example                                |
| ------------------- | ------------------------------------------------- | -------------------------------------- |
| **complex_keyword** | Contains: implement, refactor, design, etc.       | "Implement OAuth2" ✓                   |
| **long_content**    | > 50 characters                                   | "Add comprehensive error handling..." ✓ |
| **active_work**     | Status = in_progress                              | [in_progress] ✓                        |
| **explicit_track**  | Mentions: wbs, task file, docs/prompts            | "Create task for this" ✓               |
| **multi_step**      | Contains numbered/bulleted lists (1., 2., -, \*) | "1. Setup 2. Configure..." ✓           |

### State Mapping

| TodoWrite State | External Task Status |
| --------------- | -------------------- |
| pending         | Todo                 |
| in_progress     | WIP                  |
| completed       | Done                 |

**Reverse mapping** (Tasks → TodoWrite): Backlog/Todo → pending, WIP/Testing → in_progress, Done → completed

### Session Resume

When resuming work across sessions:

```bash
# Restore active tasks to TodoWrite
tasks sync restore

# Output: TodoWrite items for all WIP/Testing tasks
# Format: "Continue {task_name} (WBS {wbs})"
```

## Multi-Agent Workflow

The tasks CLI enables external task management for coordinated workflows:

```
User Request
     ↓
Planning Phase
     │
     tasks create "Implement feature"
     │
     Creates: docs/prompts/0048_implement_feature.md
     ↓
Execution Phase (with TodoWrite sync)
     │
     TodoWrite: "Implement feature X" [in_progress]
     │  → Auto-synced to task 0048 (WIP)
     │
     tasks update 48 testing
     ↓
Monitoring / Review Phase
     │
     tasks list
     tasks update 48 done
```

| Command   | Purpose                                              |
| --------- | ---------------------------------------------------- |
| `create`  | Create new task files from work breakdown           |
| `update`  | Move tasks through lifecycle stages                  |
| `list`    | View kanban board, monitor progress                  |
| `open`    | View/edit task file details                          |
| `sync`    | Sync TodoWrite ↔ Tasks (automatic via hooks)         |
| `refresh` | Regenerate kanban board from task files              |

**Status Flow:** Backlog → Todo → WIP → Testing → Done

## Workflows

### Task Lifecycle

1. **Initialize** - Set up tasks directory and kanban board

   ```bash
   python3 ${CLAUDE_PLUGIN_ROOT}/skills/tasks/scripts/tasks.py init
   ```

   - Creates `docs/prompts/` directory
   - Copies `.kanban.md` board from [assets/.kanban.md](assets/.kanban.md)
   - Copies `.template.md` from [assets/.template.md](assets/.template.md)

2. **Create Task** - Generate new task with WBS number

   ```bash
   tasks create "Task name here"
   ```

   - Auto-assigns next WBS number (0048, 0049, ...)
   - Creates task file from template
   - Refreshes kanban board

3. **Update Status** - Move task through stages

   ```bash
   tasks update 48 wip
   tasks update 0048 done
   ```

**Status Stages:** Backlog → Todo → WIP → Testing → Done

**Aliases:** wip, in-progress, working → WIP | done, completed, finished → Done

### TodoWrite Integration Workflow

**Scenario 1: Simple Task (No Promotion)**

```
User adds TodoWrite: "Fix typo in README" [pending]
  ↓
Hook fires → Promotion check
  ✗ Content too short (< 50 chars)
  ✗ No complex keywords
  ✗ Status is pending
  ↓
Result: Ephemeral only (correct behavior)
```

**Scenario 2: Complex Task (Auto-Promotion)**

```
User adds TodoWrite: "Implement OAuth2 authentication with Google provider" [in_progress]
  ↓
Hook fires → Promotion check
  ✓ Contains "implement" keyword
  ✓ Content > 50 chars
  ✓ Status is in_progress
  ↓
Auto-promotion:
  Create: docs/prompts/0048_implement_oauth2.md
  Status: WIP
  Session Map: {hash → "0048"}
  Log: promotions.log
  ↓
Result: Persistent tracking across sessions
```

**Scenario 3: Session Resume**

```
Session 1 (Monday):
  TodoWrite: "Refactor API layer" [in_progress]
  → External Task: 0048_refactor_api.md [WIP]
  ↓
Session ends → TodoWrite cleared
  ↓
Session 2 (Tuesday):
  tasks sync restore
  ↓
TodoWrite: "Continue refactor_api (WBS 0048)" [in_progress]
  ↓
Result: Work continues seamlessly
```

### Listing Tasks

```bash
# Show all stages
tasks list

# Filter by stage
tasks list wip
tasks list backlog
```

Output uses `glow` for markdown rendering if available.

## Architecture

**Core Components:**

- **TaskStatus enum** - Status definitions and aliases
- **TasksConfig** - Git root detection and path management
- **TaskFile** - Frontmatter parsing and WBS extraction
- **TasksManager** - CLI command handlers
- **StateMapper** - Bidirectional TodoWrite ↔ Tasks state translation
- **PromotionEngine** - 5-signal heuristic for smart auto-promotion
- **SyncOrchestrator** - Coordination layer with session map management

**Data Storage:**

- Task files: `docs/prompts/0047_task_name.md` (markdown + YAML frontmatter)
- Kanban board: `docs/prompts/.kanban.md` (Obsidian Kanban format)
- Default templates: `docs/prompts/.template.md` (Customizable per project)
- Session map: `.claude/tasks_sync/session_map.json` (TodoWrite hash → WBS)
- Promotion log: `.claude/tasks_sync/promotions.log` (Audit trail)

**References:**

- [Status Aliases](references/status-aliases.md) - 15+ supported aliases
- [Architecture](references/architecture.md) - Component details, WBS algorithm, data flow
- [Hook Integration](references/hook-integration.md) - TodoWrite event logging
- **[TodoWrite Integration Overview](references/README_INTEGRATION.md)** - Master integration guide
- **[Quick Integration Guide](references/QUICK_INTEGRATION_GUIDE.md)** - 5-minute setup
- **[Integration Plan](references/INTEGRATION_PLAN.md)** - Full technical architecture
- **[Prompt Engineering Guide](references/PROMPT_ENGINEERING_GUIDE.md)** - Deep dive techniques

## Core Principles

### Short WBS

Commands accept both short and full WBS: `tasks update 47 wip` = `tasks update 0047 wip`

### Git Root Detection

Works from any subdirectory - auto-detects git repository root

### Cross-Platform Editor

The `open` command uses: macOS `open`, Linux `xdg-open`, Windows `start`

### Zero-Friction Integration

TodoWrite items auto-promote to tasks with no manual intervention - hooks handle synchronization automatically

## Best Practices

### Task Naming

**Good:** "Add user authentication", "Fix memory leak in parser"
**Avoid:** "stuff", "fix bug"

### Status Workflow

Follow natural progression: create → todo → wip → testing → done

### TodoWrite Integration

**Let auto-promotion work** - Don't manually create external tasks for TodoWrite items

**Use descriptive content** - Promotion detection relies on content quality
- Good: "Implement user authentication with OAuth2 and JWT tokens"
- Bad: "Auth stuff"

**Review promotion logs** - Monitor what's being promoted

```bash
tail -20 .claude/tasks_sync/promotions.log
```

**Use session restore** - When resuming work on a project

```bash
tasks sync restore
```

### Bulk Operations

```bash
# Move multiple tasks
for wbs in 47 48 49; do
    tasks update $wbs todo
done
```

## Troubleshooting

### "Not in a git repository"

**Problem**: Running tasks commands outside a git repository
**Solution**: Ensure you're in a git-tracked directory or run `git init` to initialize a repository

```bash
git init
python3 ${CLAUDE_PLUGIN_ROOT}/skills/tasks/scripts/tasks.py init
```

### "Kanban file not found"

**Problem**: Kanban board not initialized
**Solution**: Run the init command first

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/tasks/scripts/tasks.py init
```

### "Invalid WBS number"

**Problem**: WBS must be 1-4 digits
**Solution**: Use valid WBS format

```bash
# Valid formats
tasks update 47 wip      # short form
tasks update 0047 wip    # full form

# Invalid
tasks update abc wip     # not numeric
tasks update 12345 wip   # too many digits
```

### "No task found with WBS"

**Problem**: Task file doesn't exist or was deleted
**Solution**: List tasks to see available WBS numbers

```bash
tasks list               # view all tasks
```

### TodoWrite Integration Not Working

**Problem**: TodoWrite items not auto-promoting
**Solutions**:

1. Check hooks configuration exists: `plugins/rd2/hooks/hooks.json`
2. Verify PreToolUse hook for TodoWrite is configured
3. Check Claude Code logs for hook errors
4. Test manually: `tasks sync todowrite --data '{"todos": [...]}'`

**Problem**: Duplicate tasks created
**Solution**: Check session map integrity

```bash
cat .claude/tasks_sync/session_map.json
# Clean up if corrupted:
rm .claude/tasks_sync/session_map.json
# Hook will regenerate on next TodoWrite event
```

**Problem**: Session restore not working
**Solution**: Verify active tasks exist

```bash
tasks list wip           # Check for WIP tasks
tasks list testing       # Check for Testing tasks
tasks sync restore       # Restore active tasks
```

## Configuration

### Default Templates

The `init` command copies default files from `assets/`:

- **[assets/.kanban.md](assets/.kanban.md)** - Kanban board template
- **[assets/.template.md](assets/.template.md)** - Task file template

### Customization

Edit `docs/prompts/.template.md` to customize new task format.

### TodoWrite Integration Settings

Create `.claude/tasks_sync/config.json` to customize promotion behavior:

```json
{
  "auto_promotion": {
    "enabled": true,
    "min_content_length": 50,
    "complex_keywords": [
      "implement", "refactor", "design", "architecture",
      "integrate", "migrate", "optimize", "feature"
    ],
    "always_promote_in_progress": true
  },
  "state_sync": {
    "enabled": true,
    "sync_direction": "bidirectional"
  },
  "session_resume": {
    "enabled": true,
    "restore_wip_tasks": true,
    "restore_testing_tasks": true
  }
}
```

**Disable auto-promotion** (manual workflow only):

```json
{
  "auto_promotion": {
    "enabled": false
  }
}
```

### Optional: Glow

For better markdown rendering: `brew install glow` (macOS)

## Logs & Debugging

The tasks skill maintains logs for troubleshooting and audit trails:

### Hook Logs

- **`.claude/tasks_hook.log`** - TodoWrite PreToolUse hook execution
- **`.claude/logs/hook_event.log`** - General hook event logging

```bash
# Watch hook events in real-time
tail -f .claude/tasks_hook.log

# View recent hook activity
tail -20 .claude/logs/hook_event.log
```

### TodoWrite Integration Logs

- **`.claude/tasks_sync/promotions.log`** - Auto-promotion events with signals
- **`.claude/tasks_sync/session_map.json`** - TodoWrite hash → WBS mapping

```bash
# View recent promotions
tail -20 .claude/tasks_sync/promotions.log

# Check session mapping
cat .claude/tasks_sync/session_map.json

# Promotion signal distribution
grep -o '"signals":\[[^]]*\]' .claude/tasks_sync/promotions.log | sort | uniq -c
```

## Performance & Security

**Hook Latency**: < 50ms (minimal impact on TodoWrite)

**Storage**: ~1KB per 100 promotions (session_map + logs)

**Security**:
- No shell=True in subprocess calls (command injection prevention)
- Explicit WBS validation with regex (1-4 digits only)
- Input validation on all JSON parsing
- Path safety with Path objects
- Log rotation (automatic cleanup of old logs >30 days)
