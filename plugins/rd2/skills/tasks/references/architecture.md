# Tasks Architecture

Detailed technical architecture of the tasks CLI system.

## Component Structure

```
tasks/
├── scripts/
│   └── tasks.py          # Main CLI (326 lines, 75% coverage)
│       ├── TaskStatus     # Enum with alias mapping
│       ├── TasksConfig    # Configuration & git root detection
│       ├── TaskFile       # Single task file operations
│       └── TasksManager   # CLI command handlers
├── tests/
│   └── test_tasks.py      # 33 tests, 75% coverage
└── SKILL.md
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

**Frontmatter Fields:**
- `name`: Task name (from filename)
- `description`: Optional detailed description
- `status`: One of Backlog, Todo, WIP, Testing, Done
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

## Kanban Board Format

The `.kanban.md` file uses Obsidian Kanban plugin format:

```markdown
---
kanban-plugin: board
---

## Backlog

- [ ] 0048_task_one

## Todo

- [ ] 0049_task_two

## WIP

- [.] 0047_task_three

## Testing

- [.] 0050_task_four

## Done

- [x] 0046_task_complete
```

**Checkbox States:**
- `[ ]` - Backlog/Todo (not started)
- `[.]` - WIP/Testing (in progress)
- `[x]` - Done (complete)

## TaskStatus Enum

```python
class TaskStatus(Enum):
    BACKLOG = "Backlog"
    TODO = "Todo"
    WIP = "WIP"
    TESTING = "Testing"
    DONE = "Done"
```

Supports 15+ aliases via `from_alias()` classmethod.

## TasksConfig Class

Handles configuration and git root detection:

```python
class TasksConfig:
    DEFAULT_DIR = "docs/prompts"
    KANBAN_FILE = ".kanban.md"
    TEMPLATE_FILE = ".template.md"

    def __init__(self, project_root: Path | None = None):
        self.project_root = project_root or self._find_git_root()
        self.prompts_dir = self.project_root / self.DEFAULT_DIR
```

**Key Behavior:** Auto-detects git repository root by searching upward for `.git` directory.

## TaskFile Class

Represents a single task file:

```python
class TaskFile:
    def __init__(self, path: Path):
        self.path = path

    @property
    def wbs(self) -> str:
        # Extracts 4-digit WBS from filename

    @property
    def name(self) -> str:
        # Extracts task name from filename

    def get_status(self) -> TaskStatus:
        # Reads status from frontmatter

    def update_status(self, new_status: TaskStatus) -> None:
        # Updates status in frontmatter
```

## TasksManager Class

Main command handler with methods for each CLI command:

- `cmd_init()` - Initialize tasks system
- `cmd_create(task_name)` - Create new task
- `cmd_list(stage)` - List tasks (optional filter)
- `cmd_update(wbs, stage)` - Update task status
- `cmd_open(wbs)` - Open in editor
- `cmd_refresh()` - Refresh kanban board
- `cmd_hook(operation, data)` - Handle TodoWrite events
- `cmd_log(prefix, data)` - Log developer events

## Data Flow

```
CLI Command (main)
    ↓
ArgumentParser
    ↓
TasksManager.cmd_*()
    ↓
TasksConfig → TaskFile → File I/O
    ↓
Kanban Board Refresh (on status changes)
```

## WBS Numbering Algorithm

```python
# Count existing tasks (excluding dotfiles)
existing_tasks = list(prompts_dir.glob("*.md"))
existing_tasks = [t for t in existing_tasks if not t.name.startswith(".")]

# Next WBS is count + 1, formatted as 4-digit
next_seq = len(existing_tasks) + 1
wbs = f"{next_seq:04d}"  # 0001, 0002, ..., 0047, ...
```

## Short WBS Support

Commands accept both short and full WBS:

```python
# Normalized in cmd_update() and cmd_open()
wbs_normalized = f"{int(wbs):04d}"  # "47" → "0047"
```
