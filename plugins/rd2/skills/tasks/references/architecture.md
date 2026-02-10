# Tasks Architecture

Detailed technical architecture of the tasks CLI system.

## Component Structure

```
tasks/
├── scripts/
│   └── tasks.py              # Main CLI
│       ├── TaskStatus         # Enum with 15+ alias mapping
│       ├── TasksConfig        # Dual-mode config, multi-folder, global WBS
│       ├── TaskFile           # Single task file operations
│       └── TasksManager       # CLI command handlers
├── tests/
│   └── test_tasks.py          # 67 tests
├── assets/
│   ├── .kanban.md             # Default kanban template
│   └── .template.md           # Default task template
├── references/                # Detailed docs
└── SKILL.md
```

## Dual-Mode Configuration

TasksConfig supports two modes for backward compatibility:

### Legacy Mode (no config.jsonc)

```
docs/prompts/
├── .kanban.md        # Kanban board
├── .template.md      # Task template
├── 0001_task.md ...  # Task files

```

### Config Mode (with docs/.tasks/config.jsonc)

```
docs/.tasks/          # Centralized metadata
├── config.jsonc      # Project configuration
├── kanban.md         # Global kanban board
├── template.md       # Task template
├── brainstorm/       # Brainstorm outputs
├── codereview/       # Code review outputs
├── design/           # Design outputs
└── sync/             # Sync data

docs/prompts/         # Task folder 1
├── 0001_task.md ...

docs/next-phase/      # Task folder 2 (optional)
├── 0201_task.md ...
```

## TasksConfig Class

Dual-mode configuration with multi-folder support:

```python
class TasksConfig:
    LEGACY_DIR = "docs/prompts"
    TASKS_META_DIR = "docs/.tasks"
    CONFIG_FILE = "config.jsonc"

    def __init__(self, project_root=None, folder=None):
        self.project_root = project_root or self._find_git_root()
        self._folder_override = folder
        self._load_config()  # Sets mode to "legacy" or "config"

    # Key properties (adapt based on mode):
    # - active_folder → current task folder
    # - prompts_dir   → alias for active_folder (backward compat)
    # - all_folders   → list of all configured folders
    # - kanban_file   → docs/.tasks/kanban.md (config) or docs/prompts/.kanban.md (legacy)
    # - template_file → docs/.tasks/template.md (config) or docs/prompts/.template.md (legacy)
    # - sync_dir      → docs/.tasks/sync/ (config) or docs/tasks_sync/ (legacy)

    def get_next_wbs(self) -> int:
        """Globally unique WBS across all folders with base_counter floor."""

    def find_task_by_wbs(self, wbs: str) -> Path | None:
        """Cross-folder task search."""
```

## Task File Format

Each task file uses YAML frontmatter:

```yaml
---
name: task name here
description: Task description
status: Backlog
created_at: 2026-01-21 14:22:18
updated_at: 2026-01-21 14:22:18
---

## 0047. task name here

### Background

[Task context]

### Requirements / Objectives

[What needs to be done]

### Solutions / Goals

[Implementation notes]

### References

[Links and resources]
```

## Kanban Board Format

The kanban file uses Obsidian Kanban plugin format:

```markdown
---
kanban-plugin: board
---

## Backlog

- [ ] 0048_task_one

## WIP

- [.] 0047_task_three

## Done

- [x] 0046_task_complete
```

**Checkbox States:** `[ ]` not started, `[.]` in progress, `[x]` complete

## WBS Numbering Algorithm (Global)

```python
def get_next_wbs(self) -> int:
    global_max = 0

    # Scan ALL configured folders
    for folder in self.all_folders:
        for task_file in folder.glob("*.md"):
            if not task_file.name.startswith("."):
                match = re.match(r"^(\d{4})", task_file.name)
                if match:
                    global_max = max(global_max, int(match.group(1)))

    # Apply base_counter floor for the active folder
    base_counter = active_folder_config.get("base_counter", 0)
    return max(global_max, base_counter) + 1
```

This guarantees no WBS collisions across any number of folders.

## config.jsonc Schema

```jsonc
{
  "$schema_version": 1,
  "active_folder": "docs/prompts",
  "folders": {
    "docs/prompts": { "base_counter": 0, "label": "Phase 1" },
    "docs/next-phase": { "base_counter": 200, "label": "Phase 2" }
  }
}
```

JSONC: Standard JSON with `//` line comments (stripped before parsing).

## Data Flow

```
CLI Command (main)
    ↓
ArgumentParser (--folder, --data, etc.)
    ↓
TasksConfig(folder=args.folder)
    ↓ loads config.jsonc or uses legacy mode
TasksManager.cmd_*()
    ↓
TasksConfig → find_task_by_wbs() (cross-folder)
    ↓       → get_next_wbs() (global unique)
TaskFile → File I/O
    ↓
Kanban Board Refresh (scans all folders)
```

## Write Guard

The `rd2_guard.sh` hook protects task files from direct Write tool usage:

1. Reads folder names from `docs/.tasks/config.jsonc` via `jq`
2. Falls back to `prompts` if no config exists
3. Blocks Write to `*/FOLDER/[0-9]{4}_*.md` for each configured folder
4. Edit tool is still allowed (for content section updates)

## Short WBS Support

Commands accept both short and full WBS:

```python
# Normalized in cmd_update() and cmd_open()
wbs_normalized = f"{int(wbs):04d}"  # "47" → "0047"
```
