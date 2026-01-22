# tasks User Manual

Markdown-based task management with WBS numbering, kanban board synchronization, and intelligent TodoWrite integration for seamless ephemeral-to-persistent task promotion.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Overview](#overview)
- [Available Commands](#available-commands)
- [TodoWrite Integration](#todowrite-integration)
- [Slash Commands](#slash-commands)
- [Usage Examples](#usage-examples)
- [Configuration](#configuration)
- [Hooks Integration](#hooks-integration)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

---

## Quick Start

### Installation

The tasks tool is located at:
```
plugins/rd2/skills/tasks/
```

### Basic Usage

After initialization, you can use the short `tasks` command from anywhere:

```bash
# Initialize (creates symlink at $HOMEBREW_PREFIX/bin/tasks)
python3 ${CLAUDE_PLUGIN_ROOT}/skills/tasks/scripts/tasks.py init

# Then use the short command from anywhere
tasks create "Set up project infrastructure"
tasks list
tasks update 1 wip
```

**Fallback** (if symlink not available):
```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/tasks/scripts/tasks.py <command> [arguments]
```

### First-Time Setup

```bash
# 1. Initialize the tasks system (creates symlink + directories)
tasks init

# 2. Create your first task
tasks create "Set up project infrastructure"

# 3. List all tasks
tasks list

# 4. Update task status
tasks update 1 wip

# 5. Work with TodoWrite integration (automatic)
# TodoWrite items are auto-promoted to tasks when complex enough
```

---

## Overview

tasks is a **task management CLI** that manages markdown-based task files with automatic kanban board synchronization and intelligent TodoWrite integration. It provides:

- **WBS Numbering**: Auto-incrementing 4-digit work breakdown structure numbers (0047, 0048, ...)
- **Status Tracking**: 5-stage workflow (Backlog → Todo → WIP → Testing → Done)
- **Flexible Aliases**: Use shorthand like `wip`, `done`, `in-progress`
- **Kanban Sync**: Automatic board updates on task changes
- **Short WBS**: Reference tasks by short numbers (47 → 0047)
- **Smart TodoWrite Integration**: Auto-promotes complex TodoWrite items to persistent tasks
- **Bidirectional Sync**: TodoWrite ↔ External Tasks state synchronization
- **Session Resume**: Restore active tasks when resuming work
- **Convenient Access**: Symlink at `$HOMEBREW_PREFIX/bin/tasks` for global use

### Key Concepts

**WBS (Work Breakdown Structure)**
- 4-digit zero-padded numbers: 0001, 0047, 0123
- Auto-assigned sequentially
- Stored in filename: `0047_task_name.md`

**Task Lifecycle**
```
Backlog → Todo → WIP → Testing → Done
```

**Task Files**
- Location: `docs/prompts/`
- Format: Markdown with YAML frontmatter
- Template-based creation

**Kanban Board**
- Location: `docs/prompts/.kanban.md`
- Format: Obsidian Kanban plugin compatible
- Auto-synced on task changes

**TodoWrite Integration**
- Smart auto-promotion based on 5 signals
- Bidirectional state synchronization
- Session resume across work sessions
- Logs: `.claude/tasks_sync/promotions.log`

---

## Available Commands

### init

Initialize the tasks management system.

```bash
tasks init
```

**Creates:**
```
docs/prompts/
├── .kanban.md          # Kanban board
└── .template.md       # Task template

$HOMEBREW_PREFIX/bin/
└── tasks              # Symlink to tasks.py (if Homebrew installed)
```

**Behavior:**
- Creates directories if missing
- Skips existing files
- Creates symlink for convenient `tasks` command
- Checks for `glow` installation (optional)
- Reports success/warnings for each step

### create

Create a new task file.

```bash
tasks create "<task name>"
```

**Arguments:**
- `task_name`: Descriptive name for the task (max 200 chars)

**Creates:**
- Task file: `docs/prompts/0048_task_name.md`
- Auto-refreshes kanban board
- Adds to session map if TodoWrite integration enabled

**Example:**
```bash
tasks create "Implement user authentication"
# Creates: docs/prompts/0048_implement_user_authentication.md
```

**Security:**
- Validates task name length (max 200 chars)
- Sanitizes filename (replaces spaces, slashes)
- Prevents path traversal attacks

### list

List tasks, optionally filtered by stage.

```bash
# List all tasks
tasks list

# Filter by stage
tasks list wip
tasks list backlog
tasks list done
```

**Supported Filters:**
- `backlog`, `todo`, `wip`, `testing`, `done`
- All status aliases work: `in-progress`, `working`, `completed`, etc.

**Output:**
- Uses `glow` for markdown rendering if available
- Falls back to plain text
- Shows WBS numbers and task names
- Displays checkbox states ([ ], [.], [x])

**Example Output:**
```
## WIP

- [.] 0047_implement_oauth2
- [.] 0048_refactor_api_layer

## Testing

- [.] 0046_add_input_validation
```

### update

Update a task's status.

```bash
tasks update <WBS> <stage>
```

**Arguments:**
- `WBS`: Task number (1-4 digits: `47` or `0047`)
- `stage`: New status (supports aliases)

**Behavior:**
- Validates WBS number (1-4 digits only)
- Updates frontmatter status field
- Updates `updated_at` timestamp
- Auto-refreshes kanban board
- Syncs to TodoWrite if integration enabled

**Examples:**
```bash
# Short WBS
tasks update 47 wip

# Full WBS
tasks update 0047 testing

# Using alias
tasks update 47 in-progress

# Move to done
tasks update 47 completed
```

**Supported Aliases:**
See [Configuration](#configuration) section for full alias list.

### open

Open a task file in your default editor.

```bash
tasks open <WBS>
```

**Arguments:**
- `WBS`: Task number (1-4 digits: `47` or `0047`)

**Editor Detection:**
- macOS: `open`
- Linux: `xdg-open`
- Windows: `cmd /c start`

**Example:**
```bash
tasks open 47
# Opens: docs/prompts/0047_task_name.md in default editor
```

**Use Cases:**
- View/edit task details
- Update Background/Requirements sections
- Add references or notes
- Modify frontmatter manually

### refresh

Regenerate the kanban board from task files.

```bash
tasks refresh
```

**Behavior:**
- Scans all task files in `docs/prompts/`
- Reads status from frontmatter
- Maps status to checkbox state
- Rewrites `.kanban.md`
- Skips dotfiles (`.kanban.md`, `.template.md`)

**Checkbox Mapping:**
- Backlog/Todo → `[ ]` (empty)
- WIP/Testing → `[.]` (in progress)
- Done → `[x]` (complete)

**When to use:**
- Manual board updates
- After external task file edits
- Recovery from corrupted board
- Sync after bulk file changes

### hook

Handle TodoWrite PreToolUse hook events (internal use).

```bash
tasks hook <operation> --data '<json>'
```

**Arguments:**
- `operation`: Hook operation (`add`, `update`, `remove`)
- `--data`: JSON string with hook event data

**Behavior:**
- Validates JSON structure
- Logs operation to `.claude/tasks_hook.log`
- Captures first 3 items for debugging
- Returns 0 on success, 1 on failure

**Used by:**
- PreToolUse hooks (automatic)
- Manual testing of hook integration

**Log Location:**
- `<project-root>/.claude/tasks_hook.log`

**Example:**
```bash
# Manual testing
tasks hook add --data '{"tool_input":{"items":[{"content":"Test task"}]}}'
```

**Note:** This command is primarily for internal hook integration. Most users won't need to call it directly.

### log

Log developer events with timestamps (debugging tool).

```bash
tasks log <prefix> --data '<json>'
```

**Arguments:**
- `prefix`: Log prefix (e.g., `DEBUG`, `HOOK`, `TEST`)
- `--data`: JSON string containing event payload

**Behavior:**
- Writes single-line JSON to `.claude/logs/hook_event.log`
- Includes timestamp, prefix, and payload
- Creates log directory if needed

**Log Format:**
```
2026-01-21T15:39:20.165650 DEBUG {"key": "value", "status": "ok"}
```

**Example:**
```bash
tasks log DEBUG --data '{"event": "test", "value": 42}'
```

**Use Cases:**
- Testing hook events
- Debugging integration issues
- Monitoring task operations

### sync

Synchronize TodoWrite items with external tasks.

#### sync todowrite

Auto-promote TodoWrite items to external tasks.

```bash
tasks sync todowrite --data '<json>'
```

**Arguments:**
- `--data`: JSON string from `${TOOL_INPUT}` containing todos array

**Behavior:**
- Parses TodoWrite items from hook data
- Evaluates promotion criteria (5 signals)
- Creates external tasks for promoted items
- Updates session map
- Logs promotions to `.claude/tasks_sync/promotions.log`

**Example Hook Data:**
```json
{
  "todos": [
    {
      "content": "Implement OAuth2 authentication",
      "status": "in_progress",
      "activeForm": "Implementing OAuth2 authentication"
    }
  ]
}
```

**Used by:**
- PreToolUse hooks (automatic)
- Manual promotion testing

#### sync restore

Restore active tasks to TodoWrite (session resume).

```bash
tasks sync restore
```

**Behavior:**
- Scans task files for WIP/Testing status
- Generates TodoWrite-compatible items
- Prints JSON to stdout
- Updates session map

**Example Output:**
```json
[
  {
    "content": "Continue refactor_api_layer (WBS 0048)",
    "status": "in_progress",
    "activeForm": "Continuing refactor_api_layer"
  }
]
```

**Use Cases:**
- Session resume after closing Claude Code
- User asks "What was I working on?"
- Restore context for multi-day projects

---

## TodoWrite Integration

### How It Works

The tasks skill seamlessly integrates with Claude Code's TodoWrite tool to provide automatic promotion of ephemeral tasks to persistent project tracking.

```
TodoWrite Item Created → PreToolUse Hook → Promotion Check → Auto-Create Task File
```

### Promotion Signals (OR Logic)

TodoWrite items are **auto-promoted** when **any** of these 5 signals trigger:

| Signal | Trigger | Example |
|--------|---------|---------|
| **complex_keyword** | Contains: implement, refactor, design, architecture, integrate, migrate, optimize, feature, build | "Implement OAuth2" ✓ |
| **long_content** | Length > 50 characters | "Add comprehensive error handling with custom exceptions" ✓ |
| **active_work** | Status = `in_progress` | TodoWrite item marked as in progress ✓ |
| **explicit_tracking** | Mentions: wbs, task file, docs/prompts | "Create task file for this feature" ✓ |
| **multi_step** | Contains numbered or bulleted lists | "1. Setup database 2. Configure API" ✓ |

### State Mapping

Bidirectional state synchronization:

| TodoWrite State | External Task Status |
|-----------------|---------------------|
| `pending` | Todo |
| `in_progress` | WIP |
| `completed` | Done |

**Reverse Mapping:**
- Backlog/Todo → `pending`
- WIP/Testing → `in_progress`
- Done → `completed`

### Promotion Examples

**Example 1: Simple Task (No Promotion)**
```
TodoWrite: "Fix typo in README" [pending]
  ↓
Signals: ✗ Too short, ✗ No keywords, ✗ Pending status
  ↓
Result: Ephemeral only (correct behavior)
```

**Example 2: Complex Task (Auto-Promoted)**
```
TodoWrite: "Implement OAuth2 authentication with Google provider" [in_progress]
  ↓
Signals: ✓ "implement" keyword, ✓ > 50 chars, ✓ in_progress
  ↓
Auto-Promotion:
  - Creates: docs/prompts/0048_implement_oauth2.md
  - Status: WIP
  - Session Map: {hash → "0048"}
  - Log: promotions.log
  ↓
Result: Persistent tracking across sessions
```

**Example 3: Session Resume**
```
Session 1 (Monday):
  TodoWrite: "Refactor API layer" [in_progress]
  → Task: 0048_refactor_api.md [WIP]
  ↓
Session ends → TodoWrite cleared
  ↓
Session 2 (Tuesday):
  tasks sync restore
  ↓
TodoWrite: "Continue refactor_api (WBS 0048)" [in_progress]
  ↓
Result: Seamless work continuation
```

### Session Map

Tracks TodoWrite → Task associations using MD5 hashes:

**Location:** `.claude/tasks_sync/session_map.json`

**Format:**
```json
{
  "a3f2b1c8": "0048",
  "d9e7f6a5": "0049"
}
```

### Promotion Logs

Audit trail for all auto-promotions:

**Location:** `.claude/tasks_sync/promotions.log`

**Entry Format:**
```json
{
  "timestamp": "2026-01-21T15:39:20.165650",
  "wbs": "0048",
  "content": "Implement OAuth2 authentication with Google provider",
  "signals": ["complex_keyword:implement", "long_content", "active_work"],
  "reason": "complex_keyword:implement"
}
```

### Customization

Create `.claude/tasks_sync/config.json` to customize promotion behavior:

```json
{
  "auto_promotion": {
    "enabled": true,
    "min_content_length": 50,
    "complex_keywords": [
      "implement", "refactor", "design", "architecture",
      "integrate", "migrate", "optimize", "feature", "build"
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

**Disable Auto-Promotion:**
```json
{
  "auto_promotion": {
    "enabled": false
  }
}
```

---

## Slash Commands

The tasks skill provides slash commands for quick task management.

### /tasks

Quick access to task operations.

**Usage:**
```
/tasks <command> [arguments]
```

**Available Subcommands:**
- `init` - Initialize tasks system
- `create <name>` - Create new task
- `list [stage]` - List tasks
- `update <WBS> <stage>` - Update status
- `open <WBS>` - Open task file
- `refresh` - Refresh kanban board
- `sync restore` - Restore active tasks to TodoWrite

**Examples:**
```
/tasks create "Fix memory leak"
/tasks list wip
/tasks update 47 done
/tasks open 47
/tasks sync restore
```

**Note:** TodoWrite integration happens automatically via hooks. You don't need to manually sync unless restoring a session.

---

## Usage Examples

### Example 1: Complete Task Lifecycle

```bash
# 1. Initialize (first time only)
tasks init

# 2. Create task
tasks create "Build authentication system"

# 3. Move to Todo
tasks update 1 todo

# 4. Start work
tasks update 1 wip

# 5. Testing
tasks update 1 testing

# 6. Complete
tasks update 1 done

# 7. View board
tasks list
```

### Example 2: Working with Multiple Tasks

```bash
# Create multiple tasks
tasks create "Design database schema"
tasks create "Implement API endpoints"
tasks create "Write unit tests"

# List backlog
tasks list backlog

# Start first task
tasks update 1 wip

# Check WIP tasks
tasks list wip

# Filter by status
tasks list testing
tasks list done
```

### Example 3: Bulk Status Updates

```bash
# Move multiple tasks to todo
for wbs in 1 2 3; do
    tasks update $wbs todo
done

# Move range to testing
for wbs in {47..52}; do
    tasks update $wbs testing
done
```

### Example 4: TodoWrite Integration Workflow

```bash
# Scenario: User creates TodoWrite item in Claude Code
# TodoWrite: "Implement OAuth2 authentication with Google provider" [in_progress]

# Auto-promotion happens automatically via hook
# Result: Creates docs/prompts/0048_implement_oauth2.md [WIP]

# Check promotion log
tail -20 .claude/tasks_sync/promotions.log

# View session map
cat .claude/tasks_sync/session_map.json

# Later: Resume session
tasks sync restore
# Outputs TodoWrite items for active tasks
```

### Example 5: Session Resume

```bash
# Day 1: Working on project
tasks list wip
# Shows: 0047_refactor_api, 0048_implement_oauth2

# Day 2: Resume work
tasks sync restore
# Restores TodoWrite items:
# - "Continue refactor_api (WBS 0047)" [in_progress]
# - "Continue implement_oauth2 (WBS 0048)" [in_progress]

# Continue work seamlessly
tasks update 47 testing
```

### Example 6: Project Organization

```bash
# Create main task
tasks create "Refactor payment module"

# Create subtasks (manual directory creation)
mkdir -p docs/prompts/0049
tasks create "Update data models"      # Creates 0050
tasks create "Migrate API endpoints"   # Creates 0051
tasks create "Update tests"            # Creates 0052

# Track progress
tasks list wip
```

---

## Configuration

### Directory Structure

Default locations:

```
project-root/
├── docs/
│   └── prompts/
│       ├── .kanban.md          # Kanban board
│       ├── .template.md       # Task template
│       ├── 0047_task_one.md
│       ├── 0048_task_two.md
│       └── 0049/
│           └── subtask.md    # Optional subdirectory
├── .claude/
│   ├── tasks_hook.log         # TodoWrite hook events
│   ├── logs/
│   │   └── hook_event.log     # Developer event log
│   └── tasks_sync/
│       ├── session_map.json   # TodoWrite hash → WBS mapping
│       ├── promotions.log     # Auto-promotion audit trail
│       └── config.json        # Optional integration config
└── $HOMEBREW_PREFIX/bin/
    └── tasks                  # Symlink to tasks.py
```

### Task Template

Edit `docs/prompts/.template.md` to customize new task structure:

```markdown
---
name: { { PROMPT_NAME } }
description: <prompt description>
status: Backlog
created_at: { { CREATED_AT } }
updated_at: { { UPDATED_AT } }
---

## { { WBS } }. { { PROMPT_NAME } }

### Background

### Requirements / Objectives

### Solutions / Goals

### References
```

### Status Aliases

Full list of supported status aliases:

| Alias | Maps To |
|-------|---------|
| `backlog` | Backlog |
| `todo`, `to-do` | Todo |
| `wip`, `in-progress`, `inprogress`, `working` | WIP |
| `testing`, `test`, `review`, `inreview` | Testing |
| `done`, `completed`, `complete`, `finished`, `closed` | Done |

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `TASKS_DIR` | Prompts directory | `docs/prompts` |
| `TASKS_KANBAN` | Kanban filename | `.kanban.md` |
| `TASKS_TEMPLATE` | Template filename | `.template.md` |
| `HOMEBREW_PREFIX` | Homebrew path for symlink | Auto-detected |

### Custom Template Variables

Add custom variables to template and update `cmd_create()` to replace them:

```python
# In template
category: { { CATEGORY } }
priority: { { PRIORITY } }

# In cmd_create()
content = content.replace("{ { CATEGORY } }", category)
```

---

## Hooks Integration

### TodoWrite PreToolUse Hook

Location: `plugins/rd2/hooks/hooks.json`

The hook automatically logs TodoWrite operations:

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "TodoWrite",
      "hooks": [{
        "type": "command",
        "command": "python3 ${CLAUDE_PLUGIN_ROOT}/skills/tasks/scripts/tasks.py hook ${hook_input.tool_input.operation} --data '${hook_input}'"
      }]
    }]
  }
}
```

### Hook Log Formats

**TodoWrite Hook Log** (`.claude/tasks_hook.log`):
```json
{
  "timestamp": "2026-01-21T15:39:20",
  "operation": "add",
  "item_count": 1,
  "items": [{"content": "Task name", "status": "pending"}]
}
```

**Promotion Log** (`.claude/tasks_sync/promotions.log`):
```json
{
  "timestamp": "2026-01-21T15:39:20.165650",
  "wbs": "0048",
  "content": "Implement OAuth2 authentication",
  "signals": ["complex_keyword:implement", "long_content"],
  "reason": "complex_keyword:implement"
}
```

**Developer Event Log** (`.claude/logs/hook_event.log`):
```
2026-01-21T15:39:20.165650 DEBUG {"event": "test", "status": "ok"}
```

### Viewing Hook Logs

```bash
# View recent hook events
tail -20 .claude/tasks_hook.log

# View promotions
tail -20 .claude/tasks_sync/promotions.log

# Count operations by type
grep -c '"operation": "add"' .claude/tasks_hook.log
grep -c '"operation": "update"' .claude/tasks_hook.log

# View promotion signal distribution
grep -o '"signals":\[[^]]*\]' .claude/tasks_sync/promotions.log | sort | uniq -c

# Pretty print with jq
jq '.' .claude/tasks_hook.log
jq '.' .claude/tasks_sync/promotions.log

# Check session map
cat .claude/tasks_sync/session_map.json | jq
```

---

## Troubleshooting

### Issue: "Not in a git repository"

**Cause:** Running outside of git repository or malformed `.git` directory.

**Solution:** Ensure you're in a git repository:
```bash
git init  # If not initialized
git status  # Verify
```

### Issue: "Kanban file not found"

**Cause:** Tasks system not initialized.

**Solution:**
```bash
python3 scripts/tasks.py init
```

### Issue: \"No task found with WBS\"

**Cause:** Incorrect WBS format or file doesn't exist.

**Solutions:**
```bash
# List all tasks to find correct WBS
tasks list

# Try short form
tasks open 47

# Try full form
tasks open 0047

# Check file exists
ls docs/prompts/0047*.md
```

### Issue: \"Glow not rendering markdown\"

**Cause:** `glow` not installed or not in PATH.

**Solution:**
```bash
# Install glow (macOS)
brew install glow

# Verify installation
glow --version

# Test rendering
tasks list | glow

# Alternative: tasks list (auto-detects glow)
```

### Issue: \"Task file has wrong status\"

**Cause:** Manual editing or external modification.

**Solution:**
```bash
# Refresh to resync from task files
tasks refresh

# Or update specific task
tasks update 47 correct-status
```

### Issue: \"Hook not logging\"

**Cause:** Hook not configured or path incorrect.

**Solutions:**
```bash
# Check hook configuration
cat plugins/rd2/hooks/hooks.json

# Test hook manually
tasks hook add --data '{"tool_input":{"items":[{"content":"Test"}]}}'

# Check log file
cat .claude/tasks_hook.log

# Check hook event log
tail -20 .claude/logs/hook_event.log
```

### Issue: \"TodoWrite items not auto-promoting\"

**Cause:** Integration not configured or promotion criteria not met.

**Solutions:**
```bash
# 1. Verify hooks are configured
cat plugins/rd2/hooks/hooks.json

# 2. Test manual sync
tasks sync todowrite --data '{"todos":[{"content":"Implement feature X","status":"in_progress"}]}'

# 3. Check promotion logs
tail -20 .claude/tasks_sync/promotions.log

# 4. Verify session map
cat .claude/tasks_sync/session_map.json

# 5. Check for errors
grep ERROR .claude/tasks_hook.log
```

**Common Reasons:**
- Content too short (< 50 chars)
- No complex keywords
- Status is `pending` (not `in_progress`)
- No multi-step indicators

### Issue: \"Duplicate tasks created\"

**Cause:** Session map corrupted or hash collisions.

**Solution:**
```bash
# Clean up session map
rm .claude/tasks_sync/session_map.json

# Hook will regenerate on next TodoWrite event

# Verify integrity
tasks sync restore
```

### Issue: \"Session restore not working\"

**Cause:** No active tasks or session map empty.

**Solutions:**
```bash
# Check for active tasks
tasks list wip
tasks list testing

# Verify session map exists
cat .claude/tasks_sync/session_map.json

# Force restore
tasks sync restore

# Check output
tasks sync restore | jq
```

### Issue: \"Invalid WBS number\"

**Cause:** WBS validation failed (must be 1-4 digits).

**Solution:**
```bash
# Valid formats
tasks update 47 wip      # short form (1-2 digits)
tasks update 0047 wip    # full form (4 digits)

# Invalid formats (will fail)
tasks update abc wip     # not numeric
tasks update 12345 wip   # too many digits
tasks update 0 wip       # zero not allowed
```

### Issue: \"Symlink creation failed\"

**Cause:** No write permissions or `$HOMEBREW_PREFIX` not set.

**Solutions:**
```bash
# Check Homebrew prefix
echo $HOMEBREW_PREFIX

# Manual symlink (if needed)
sudo ln -s $(pwd)/plugins/rd2/skills/tasks/scripts/tasks.py /usr/local/bin/tasks

# Or use full path
alias tasks="python3 ${CLAUDE_PLUGIN_ROOT}/skills/tasks/scripts/tasks.py"
```

---

## Best Practices

### Task Naming

**Good:**
- "Implement user authentication"
- "Fix memory leak in parser"
- "Add input validation to API"

**Avoid:**
- "stuff"
- "issue"
- "fix bug"

### Status Workflow

Follow natural progression:

```bash
# New task
tasks create "New feature"
# Status: Backlog (default)

# Ready to work
tasks update 1 todo

# Start work
tasks update 1 wip

# Testing phase
tasks update 1 testing

# Complete
tasks update 1 done
```

### TodoWrite Integration Best Practices

**Let Auto-Promotion Work:**
- Don't manually create external tasks for TodoWrite items
- Trust the 5-signal heuristic
- Review promotion logs periodically

**Use Descriptive Content:**
```bash
# Good (will promote)
TodoWrite: "Implement user authentication with OAuth2 and JWT tokens" [in_progress]

# Bad (won't promote)
TodoWrite: "Auth stuff" [pending]
```

**Review Promotion Logs:**
```bash
# Check what's being promoted
tail -20 .claude/tasks_sync/promotions.log

# Analyze promotion patterns
grep -o '"reason":"[^"]*"' .claude/tasks_sync/promotions.log | sort | uniq -c
```

**Use Session Restore:**
```bash
# When resuming work on a project
tasks sync restore

# Or via slash command
/tasks sync restore
```

**Monitor Session Map:**
```bash
# Check active mappings
cat .claude/tasks_sync/session_map.json

# Count tracked items
cat .claude/tasks_sync/session_map.json | jq 'length'
```

### Working with Subtasks

For complex tasks with subtasks:

```bash
# 1. Create main task
python3 scripts/tasks.py create "Payment system overhaul"

# 2. Create subdirectory
mkdir -p docs/prompts/0050/

# 3. Create subtasks (they get 0051, 0052, etc.)
# 4. Reference main task in subtask frontmatter
```

### Regular Maintenance

```bash
# Weekly refresh
tasks refresh

# Review completed tasks
tasks list done

# Clean up old promotions (manual)
# Promotions log grows over time, consider archiving
mv .claude/tasks_sync/promotions.log .claude/tasks_sync/promotions.$(date +%Y%m%d).log

# Session map cleanup (remove completed)
# This is optional - completed tasks naturally drop from session map
```

---

## Integration with Claude Code

### TodoWrite Synchronization

When Claude Code uses `TodoWrite`:

1. **PreToolUse hook fires** (automatic)
2. **Promotion check** evaluates 5 signals
3. **Auto-promotion** creates external task if criteria met
4. **Session map updated** (TodoWrite hash → WBS)
5. **Promotion logged** to `.claude/tasks_sync/promotions.log`
6. **State sync** updates TodoWrite ↔ Tasks bidirectionally

### Using with /tasks Command

```
/tasks create "Implement feature X"
/tasks list wip
/tasks update 47 testing
/tasks sync restore
```

### Multi-Agent Workflow

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

**Integration with Three-Agent Workflow:**

```
orchestrator-expert (Meta-Coordinator)
     ├─→ task-decomposition-expert (Planning)
     │        ↓
     │   Task Files (docs/prompts/XXXX_name.md)
     │   + TodoWrite Sync (automatic)
     │        ↓
     └─→ task-runner (Execution)
              ↓
         Code→Test→Fix→Done
              ↓
      orchestrator-expert (continues loop)
```

---

## Additional Resources

- **SKILL.md**: Main skill documentation (330 lines)
- **spec-tasks.md**: Developer technical specification
- **docs/prompts/.template.md**: Task template
- **docs/prompts/.kanban.md**: Kanban board

---

## Version History

- **1.0.0** (2026-01-21): Initial release
  - Python implementation of shell script
  - TodoWrite PreToolUse hook integration
  - Smart auto-promotion (5-signal heuristic)
  - Bidirectional state synchronization
  - Session resume functionality
  - Symlink creation for global `tasks` command
  - 26+ tests with 77%+ coverage
  - Short WBS support (1-4 digits)
  - 15+ status aliases
  - Developer logging (`tasks log`)
  - Session map management
  - Promotion audit trail
