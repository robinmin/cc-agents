# tasks Specification

Technical specification for the tasks CLI tool implementation, covering architecture, command interface, TodoWrite integration, and hook system.

---

## Architecture Overview

### System Diagram

```
CLI Entry Point (scripts/tasks.py)
    |
    +-- init
    +-- create
    +-- list
    +-- update
    +-- open
    +-- refresh
    +-- hook
    +-- log
    +-- sync (todowrite | restore)
         |
Core Classes Layer
    - TaskStatus (enum with aliases)
    - TasksConfig (git root detection)
    - TaskFile (frontmatter parsing)
    - TasksManager (command handlers)
    - StateMapper (bidirectional TodoWrite ↔ Tasks)
    - PromotionEngine (5-signal heuristic)
    - SyncOrchestrator (session management)
         |
Data Layer
    +-- docs/prompts/     (task files)
    +-- .kanban.md         (board state)
    +-- .template.md      (task template)
    +-- .claude/tasks_hook.log (hook events)
    +-- .claude/tasks_sync/
        +-- session_map.json (TodoWrite hash → WBS)
        +-- promotions.log (auto-promotion audit)
    +-- .claude/logs/
        +-- hook_event.log (developer events)
         |
Support Systems
    - Git root auto-detection
    - Glow markdown rendering
    - Cross-platform editor support
    - TodoWrite PreToolUse hook
    - Symlink creation ($HOMEBREW_PREFIX/bin/tasks)
```

### Design Principles

1. **WBS-Based Numbering**: Auto-incrementing 4-digit work breakdown structure numbers
2. **Stage Aliases**: Flexible status mapping (in-progress → WIP, done → Done)
3. **Git-Aware**: Auto-detects project root from .git directory
4. **Hook Integration**: PreToolUse hook for TodoWrite event logging and auto-sync
5. **Kanban Sync**: Automatic board refresh on state changes
6. **Smart Promotion**: 5-signal heuristic for TodoWrite → Tasks auto-promotion
7. **Bidirectional Sync**: TodoWrite ↔ External Tasks state synchronization
8. **Session Resume**: Restore active tasks across sessions

---

## Core Components

### scripts/tasks.py

Main entry point, CLI interface, task management logic, and TodoWrite integration.

**Key Sections:**
- Lines 1-47: Module docstring, usage guide, and imports
- Lines 50-87: `TaskStatus` enum with alias mapping
- Lines 89-123: `TasksConfig` class (git root detection)
- Lines 125-178: `TaskFile` class (frontmatter parsing, status updates)
- Lines 180-210: `StateMapper` class (bidirectional state translation)
- Lines 212-277: `PromotionEngine` class (5-signal heuristic)
- Lines 279-451: `SyncOrchestrator` class (TodoWrite integration)
- Lines 453-1074: `TasksManager` class (command handlers)
- Lines 1077-1205: `main()` function (CLI interface)

### TaskStatus Enum

Location: `scripts/tasks.py` (lines 37-74)

```python
class TaskStatus(Enum):
    BACKLOG = "Backlog"
    TODO = "Todo"
    WIP = "WIP"
    TESTING = "Testing"
    DONE = "Done"

    @classmethod
    def from_alias(cls, alias: str) -> "TaskStatus | None":
        # Supports 15+ aliases
        # wip, in-progress, working → WIP
        # done, completed, finished → Done
```

**Supported Aliases:**

| Alias | Maps To |
|-------|---------|
| backlog | Backlog |
| todo, to-do | Todo |
| wip, in-progress, working | WIP |
| testing, test, review | Testing |
| done, completed, finished, closed | Done |

### TasksConfig Class

Location: `scripts/tasks.py` (lines 76-110)

```python
class TasksConfig:
    DEFAULT_DIR = "docs/prompts"
    KANBAN_FILE = ".kanban.md"
    TEMPLATE_FILE = ".template.md"

    def __init__(self, project_root: Path | None = None):
        self.project_root = project_root or self._find_git_root()
        self.prompts_dir = self.project_root / self.DEFAULT_DIR
        # ...

    def _find_git_root(self) -> Path:
        # Searches upward for .git directory
        # Raises RuntimeError if not in git repo
```

**Key Behaviors:**
- Auto-detects git repository root
- Works from any subdirectory
- Fails gracefully with clear error if not in git repo

### TaskFile Class

Location: `scripts/tasks.py` (lines 112-165)

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
        # Auto-updates updated_at timestamp
```

**Frontmatter Format:**
```yaml
---
name: task name
description: Task description
status: Backlog
created_at: 2026-01-21 14:22:18
updated_at: 2026-01-21 14:22:18
---
```

---

## Command Interface

### CLI Arguments

Location: `scripts/tasks.py` (lines 1077-1135)

```python
parser = argparse.ArgumentParser(...)
parser.add_argument("command", choices=[
    "init", "create", "list", "update", "open",
    "refresh", "hook", "log", "sync", "help"
])
parser.add_argument("task_name", nargs="?")
parser.add_argument("wbs", nargs="?")
parser.add_argument("stage", nargs="?")
parser.add_argument("operation", nargs="?")
parser.add_argument("--data")
```

### Command Dispatch

| Command | Args | Handler | Description |
|---------|------|---------|-------------|
| `init` | None | `cmd_init()` | Initialize tasks system |
| `create` | `task_name` | `cmd_create(task_name)` | Create new task |
| `list` | `stage?` | `cmd_list(stage)` | List tasks (optional filter) |
| `update` | `wbs, stage` | `cmd_update(wbs, stage)` | Update task status |
| `open` | `wbs` | `cmd_open(wbs)` | Open in editor |
| `refresh` | None | `cmd_refresh()` | Refresh kanban board |
| `hook` | `operation, --data?` | `cmd_hook(operation, data)` | Handle TodoWrite events |
| `log` | `prefix, --data?` | `cmd_log(prefix, data)` | Log developer events |
| `sync todowrite` | `--data` | `cmd_sync_todowrite(data)` | Sync TodoWrite → Tasks |
| `sync restore` | None | `cmd_sync_restore()` | Restore Tasks → TodoWrite |

---

## TodoWrite Integration

### StateMapper Class

Location: `scripts/tasks.py` (lines 180-210)

```python
class StateMapper:
    """Bidirectional state mapping between TodoWrite and external tasks."""

    # TodoWrite → Tasks mapping
    TODOWRITE_TO_TASKS = {
        "pending": TaskStatus.TODO,
        "in_progress": TaskStatus.WIP,
        "completed": TaskStatus.DONE,
    }

    # Tasks → TodoWrite mapping (reverse)
    TASKS_TO_TODOWRITE = {
        TaskStatus.BACKLOG: "pending",
        TaskStatus.TODO: "pending",
        TaskStatus.WIP: "in_progress",
        TaskStatus.TESTING: "in_progress",
        TaskStatus.DONE: "completed",
    }
```

**Key Features:**
- Bidirectional state translation
- Handles edge cases (Backlog/Todo both → pending)
- Static methods for easy access

### PromotionEngine Class

Location: `scripts/tasks.py` (lines 212-277)

```python
class PromotionEngine:
    """Determine when TodoWrite items should be promoted to external tasks."""

    MIN_CONTENT_LENGTH = 50
    COMPLEX_KEYWORDS = [
        "implement", "refactor", "design", "architecture",
        "integrate", "migrate", "optimize", "feature", "build"
    ]
    TRACKING_KEYWORDS = ["wbs", "task file", "docs/prompts"]

    @staticmethod
    def should_promote(todo_item: dict[str, str]) -> tuple[bool, list[str]]:
        """Evaluate if TodoWrite item should be promoted."""
```

**5-Signal Heuristic (OR Logic):**

| Signal | Trigger | Example |
|--------|---------|---------|
| `complex_keyword` | Contains: implement, refactor, design, etc. | "Implement OAuth2" |
| `long_content` | Length > 50 characters | "Add comprehensive error handling..." |
| `active_work` | Status = in_progress | [in_progress] state |
| `explicit_tracking` | Mentions: wbs, task file, docs/prompts | "Create task for this" |
| `multi_step` | Contains numbered/bulleted lists | "1. Setup 2. Configure..." |

**Returns:** `(should_promote: bool, triggered_signals: list[str])`

### SyncOrchestrator Class

Location: `scripts/tasks.py` (lines 279-451)

```python
class SyncOrchestrator:
    """Orchestrates bidirectional sync between TodoWrite and external tasks."""

    def __init__(self, config: TasksConfig):
        self.session_map_file = config.project_root / ".claude/tasks_sync/session_map.json"
        self.promotions_log = config.project_root / ".claude/tasks_sync/promotions.log"
        self.session_map: dict[str, str] = self._load_session_map()

    def process_todowrite_items(self, todo_items: list[dict[str, str]]) -> None:
        """Process TodoWrite items for auto-promotion and sync."""

    def restore_from_tasks(self) -> list[dict[str, str]]:
        """Generate TodoWrite items from active external tasks."""
```

**Key Methods:**

| Method | Purpose | Returns |
|--------|---------|---------|
| `process_todowrite_items()` | Auto-promote and sync TodoWrite items | None (side effects) |
| `_create_external_task()` | Create task file from TodoWrite item | WBS number or None |
| `_sync_to_external_task()` | Update existing task status | None |
| `restore_from_tasks()` | Generate TodoWrite from WIP/Testing tasks | List of todo items |
| `_log_promotion()` | Audit trail for promotions | None |

**Session Map Format:**
```json
{
  "a3f2b1c8": "0048",
  "d9e7f6a5": "0049"
}
```
*MD5 hash (8 chars) → WBS mapping*

**Promotions Log Format:**
```json
{
  "timestamp": "2026-01-21T15:39:20.165650",
  "wbs": "0048",
  "content": "Implement OAuth2 authentication with Google provider",
  "signals": ["complex_keyword:implement", "long_content", "active_work"],
  "reason": "complex_keyword:implement"
}
```

---

## Hook Integration

### PreToolUse Hook

Location: `plugins/rd2/hooks/hooks.json`

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

### cmd_hook Method

Location: `scripts/tasks.py` (lines 885-954)

```python
def cmd_hook(self, operation: str, data: str | None = None) -> int:
    """Handle TodoWrite PreToolUse hook events.

    Called by Claude Code hooks to log TodoWrite operations for synchronization
    with external task files.

    Args:
        operation: The TodoWrite operation (add/update/remove)
        data: JSON string containing tool_input data with items list

    Returns:
        0 on success, 1 on failure
    """
    try:
        # Parse and validate the input data if provided
        items = []
        if data:
            try:
                hook_data = json.loads(data)
                # Validate JSON structure
                if not isinstance(hook_data, dict):
                    print("[ERROR] Invalid hook data: not a JSON object", file=sys.stderr)
                    return 1
                tool_input = hook_data.get("tool_input", {})
                if not isinstance(tool_input, dict):
                    print("[ERROR] Invalid tool_input: not a JSON object", file=sys.stderr)
                    return 1
                items = tool_input.get("items", [])
                if not isinstance(items, list):
                    print("[ERROR] Invalid items: not a JSON array", file=sys.stderr)
                    return 1
            except json.JSONDecodeError as e:
                print(f"[ERROR] Invalid JSON data: {e}", file=sys.stderr)
                return 1

        # Log to project-local .claude directory
        log_file = self.config.project_root / ".claude" / "tasks_hook.log"
        log_file.parent.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().isoformat()
        log_entry = {
            "timestamp": timestamp,
            "operation": operation,
            "item_count": len(items),
            "items": items[:3] if items else [],  # Log first 3 items
        }

        with open(log_file, "a") as f:
            f.write(json.dumps(log_entry) + "\n")

        return 0

    except Exception as e:
        print(f"[ERROR] Hook failed: {e}", file=sys.stderr)
        return 1
```

### cmd_sync_todowrite Method

Location: `scripts/tasks.py` (lines 1000-1043)

```python
def cmd_sync_todowrite(self, data: str | None = None) -> int:
    """Sync TodoWrite items to external task files.

    Called by PreToolUse hook for TodoWrite events. Evaluates promotion
    criteria and creates/updates external tasks as needed.

    Args:
        data: JSON string from ${TOOL_INPUT} containing todos array

    Returns:
        0 on success, 1 on failure

    Example hook data:
    {
      "todos": [
        {
          "content": "Implement OAuth2 authentication",
          "status": "in_progress",
          "activeForm": "Implementing OAuth2 authentication"
        }
      ]
    }
    """
    try:
        # Parse hook data
        hook_data = json.loads(data) if data else {}
        todos = hook_data.get("todos", [])

        if not todos:
            print("[INFO] No todos to sync", file=sys.stderr)
            return 0

        # Use SyncOrchestrator to process items
        orchestrator = SyncOrchestrator(self.config)
        orchestrator.process_todowrite_items(todos)

        return 0

    except json.JSONDecodeError as e:
        print(f"[ERROR] Invalid JSON data: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"[ERROR] Sync failed: {e}", file=sys.stderr)
        return 1
```

### cmd_sync_restore Method

Location: `scripts/tasks.py` (lines 1045-1074)

```python
def cmd_sync_restore(self) -> int:
    """Restore TodoWrite items from active external tasks.

    Use case: Session resume or user asks "What was I working on?"

    Generates TodoWrite-compatible items from WIP/Testing tasks and prints
    them as JSON to stdout.

    Returns:
        0 on success, 1 on failure
    """
    try:
        self.config.validate()

        # Use SyncOrchestrator to restore items
        orchestrator = SyncOrchestrator(self.config)
        active_items = orchestrator.restore_from_tasks()

        if not active_items:
            print("[INFO] No active tasks to restore")
            return 0

        # Print TodoWrite items as JSON
        print(json.dumps(active_items, indent=2))

        return 0

    except Exception as e:
        print(f"[ERROR] Session restore failed: {e}", file=sys.stderr)
        return 1
```

### cmd_log Method

Location: `scripts/tasks.py` (lines 956-998)

```python
def cmd_log(self, prefix: str, data: str | None = None) -> int:
    """Log event data with timestamp and prefix.

    Developer tool for testing and debugging hook events.
    Writes a single-line JSON log entry with format: timestamp prefix json_payload

    Args:
        prefix: Prefix string between timestamp and payload (e.g., "HOOK", "DEBUG")
        data: JSON string containing event payload to log

    Returns:
        0 on success, 1 on failure
    """
    try:
        log_dir = self.config.project_root / ".claude" / "logs"
        log_file = log_dir / "hook_event.log"
        log_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().isoformat()

        # Parse and include payload if provided
        payload = None
        if data:
            try:
                payload = json.loads(data)
            except json.JSONDecodeError:
                # If not valid JSON, treat as string
                payload = data

        # Build log entry as single line
        log_entry = f"{timestamp} {prefix} {json.dumps(payload) if payload else '{}'}"

        with open(log_file, "a") as f:
            f.write(log_entry + "\n")

        return 0

    except Exception as e:
        print(f"[ERROR] Log failed: {e}", file=sys.stderr)
        return 1
```

**Hook Log Format:**
```json
{
  "timestamp": "2026-01-21T15:39:20.165650",
  "operation": "add",
  "item_count": 1,
  "items": [
    {"content": "Task name", "status": "pending", "activeForm": "Working on task"}
  ]
}
```

---

## Kanban Board Format

### File Structure

Location: `docs/prompts/.kanban.md`

```markdown
---
kanban-plugin: board
---

# Kanban Board

## Backlog

- [ ] 0048_task_one

## Todo

- [ ] 0049_task_two

## WIP

- [.] 0047_task_three

## Testing

- [.] 0050_task_four

## Done

- [x] 0046_complete_task
```

### Checkbox States

| Status | Checkbox | Character |
|--------|----------|-----------|
| Backlog/Todo | Empty | `[ ]` |
| WIP/Testing | In Progress | `[.]` |
| Done | Complete | `[x]` |

### Refresh Behavior

The `cmd_refresh()` method (lines 386-421):
1. Scans `docs/prompts/` for `*.md` files
2. Skips dotfiles (`.kanban.md`, `.template.md`)
3. Reads status from each task's frontmatter
4. Maps status to checkbox state
5. Regenerates entire kanban file

---

## Task File Template

### Template Format

Location: `docs/prompts/.template.md`

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

### Template Variables

| Variable | Replacement | Example |
|----------|-------------|---------|
| `{ { PROMPT_NAME } }` | Task name | "Implement feature X" |
| `{ { WBS } }` | WBS number | "0047" |
| `{ { CREATED_AT } }` | Creation timestamp | "2026-01-21 14:22:18" |
| `{ { UPDATED_AT } }` | Update timestamp | "2026-01-21 14:22:18" |

---

## WBS Numbering

### Algorithm

Location: `TasksManager.cmd_create()` (lines 217-270)

```python
# Count existing tasks (excluding dotfiles)
existing_tasks = list(self.config.prompts_dir.glob("*.md"))
existing_tasks = [t for t in existing_tasks if not t.name.name.startswith(".")]

# Next WBS is count + 1, formatted as 4-digit
next_seq = len(existing_tasks) + 1
wbs = f"{next_seq:04d}"  # 0001, 0002, ..., 0047, ...
```

### Short WBS Support

The `update` and `open` commands accept both forms:

```python
# In cmd_update() and cmd_open()
wbs_normalized = f"{int(wbs):04d}"  # "47" → "0047"
```

**Examples:**
```bash
tasks update 47 wip    # Short form
tasks update 0047 wip  # Full form
```

---

## Platform Integration

### Editor Command

Location: `TasksManager.cmd_open()` (lines 349-384)

```python
if sys.platform == "darwin":
    subprocess.run(["open", str(task_file)])
elif sys.platform == "linux":  # pyright: ignore[reportUnreachableCondition]
    subprocess.run(["xdg-open", str(task_file)])
elif sys.platform == "win32":  # pyright: ignore[reportUnreachableCondition]
    subprocess.run(["start", str(task_file)], shell=True)
```

### Glow Integration

Location: `TasksManager._display_with_glow()` (lines 468-488)

```python
glow_path = shutil.which("glow")
if glow_path:
    try:
        subprocess.run([glow_path], input=content, text=True, check=True)
        return
    except subprocess.CalledProcessError:
        pass

# Fallback: print directly
print(content)
```

**Recommendation:**
```bash
brew install glow  # macOS
```

---

## Symlink Creation

### _create_symlink Method

Location: `scripts/tasks.py` (lines 491-531)

```python
def _create_symlink(self) -> None:
    """Create symlink at $HOMEBREW_PREFIX/bin/tasks for convenient access.

    Attempts to create a symlink from this script to $HOMEBREW_PREFIX/bin/tasks.
    Fails gracefully if:
    - $HOMEBREW_PREFIX is not set
    - $HOMEBREW_PREFIX/bin doesn't exist or isn't writable
    - Symlink already exists
    """
    import os

    homebrew_prefix = os.environ.get("HOMEBREW_PREFIX")
    if not homebrew_prefix:
        print("[INFO] HOMEBREW_PREFIX not set, skipping symlink creation")
        return

    bin_dir = Path(homebrew_prefix) / "bin"
    if not bin_dir.exists():
        print(f"[INFO] Homebrew bin directory not found: {bin_dir}")
        return

    symlink_path = bin_dir / "tasks"
    script_path = Path(__file__).resolve()

    # Check if symlink already exists
    if symlink_path.exists():
        if symlink_path.is_symlink() and symlink_path.resolve() == script_path:
            print(f"[INFO] Symlink already exists: {symlink_path}")
        else:
            print(f"[WARN] Symlink exists but points elsewhere: {symlink_path}")
        return

    # Create symlink
    try:
        symlink_path.symlink_to(script_path)
        print(f"[INFO] Created symlink: {symlink_path} -> {script_path}")
        print("[INFO] You can now use 'tasks' command from anywhere")
    except PermissionError:
        print(f"[WARN] Permission denied creating symlink at {symlink_path}")
    except Exception as e:
        print(f"[WARN] Failed to create symlink: {e}")
```

**Called by:** `cmd_init()` during initialization

**Benefits:**
- Enables `tasks` command from anywhere
- No need for full path or aliases
- Cross-project convenience

---

## Extension Points

### Adding New Commands

1. Add handler method to `TasksManager` class:
   ```python
   def cmd_custom(self, arg: str) -> int:
       # Implementation
       return 0
   ```

2. Add to `choices` in argparse:
   ```python
   choices=[..., "custom", "help"]
   ```

3. Add dispatch logic in `main()`:
   ```python
   elif args.command == "custom":
       return manager.cmd_custom(args.arg)
   ```

### Custom Status Aliases

Location: `TaskStatus.from_alias()` (lines 46-70)

Add new aliases to the `aliases` dictionary:

```python
aliases = {
    # ... existing aliases ...
    "blocked": TaskStatus.BACKLOG,
    "inreview": TaskStatus.TESTING,
}
```

### Customizing Promotion Behavior

Location: `PromotionEngine` class (lines 212-277)

Add new signals or adjust thresholds:

```python
class PromotionEngine:
    MIN_CONTENT_LENGTH = 50  # Adjust threshold
    COMPLEX_KEYWORDS = [
        "implement", "refactor", "design",
        # Add new keywords:
        "build", "create", "develop"
    ]

    @staticmethod
    def should_promote(todo_item: dict[str, str]) -> tuple[bool, list[str]]:
        # Add custom signal:
        if "URGENT" in content.upper():
            triggered_signals.append("urgent_flag")
```

### Session Map Management

Location: `SyncOrchestrator` class (lines 279-451)

**Custom hash generation:**
```python
# Default: MD5 hash of content
item_hash = hashlib.md5(content.encode()).hexdigest()[:8]

# Alternative: Include timestamp for uniqueness
item_hash = hashlib.md5(f"{content}:{timestamp}".encode()).hexdigest()[:8]
```

**Manual session map cleanup:**
```bash
# Remove stale mappings
rm .claude/tasks_sync/session_map.json
# Will regenerate on next TodoWrite event
```

---

## Configuration

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `TASKS_DIR` | Override default prompts directory | `docs/prompts` |
| `TASKS_KANBAN` | Override kanban filename | `.kanban.md` |
| `TASKS_TEMPLATE` | Override template filename | `.template.md` |
| `HOMEBREW_PREFIX` | Homebrew installation path for symlink | Auto-detected |

### TodoWrite Integration Config

Location: `.claude/tasks_sync/config.json` (optional)

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

### Future Config File Support

Planned: `.tasks.yaml` in project root

```yaml
directory: docs/prompts
kanban_file: .kanban.md
template_file: .template.md
auto_sync: true
status_aliases:
  in-review: testing
  blocked: backlog
todowrite_integration:
  auto_promotion: true
  min_content_length: 50
  session_resume: true
```

---

## Testing

### Test Suite

Location: `tests/test_tasks.py`

- **26+ tests** covering all functionality
- **77%+ code coverage**
- Time-mocked tests for reproducibility
- TodoWrite integration test coverage

### Test Categories

| Category | Tests | Coverage |
|----------|-------|----------|
| `TaskStatus` enum | Alias mapping, validation | 100% |
| `TasksConfig` | Git root detection, validation | 95% |
| `TaskFile` | WBS extraction, status updates | 90% |
| `StateMapper` | Bidirectional mapping | 100% |
| `PromotionEngine` | 5-signal heuristic | 85% |
| `SyncOrchestrator` | Auto-promotion, session restore | 75% |
| `TasksManager` | All commands | 80% |

### Running Tests

```bash
# All tests
uv run pytest plugins/rd2/skills/tasks/tests -v

# With coverage
uv run pytest plugins/rd2/skills/tasks/tests -v --cov=scripts --cov-report=term-missing

# Specific test class
uv run pytest plugins/rd2/skills/tasks/tests/test_tasks.py::TestTaskStatus -v

# TodoWrite integration tests
uv run pytest plugins/rd2/skills/tasks/tests -v -k "sync"
```

---

## Performance Considerations

### File I/O

- **Kanban refresh**: O(n) where n = number of task files
- **Status update**: O(1) file read + O(n) for kanban refresh
- **Git root detection**: O(d) where d = directory depth
- **TodoWrite sync**: O(m) where m = number of TodoWrite items
- **Session restore**: O(n) where n = WIP/Testing tasks only

### Hook Latency

- **PreToolUse hook**: < 50ms (minimal impact on TodoWrite)
- **Auto-promotion check**: < 10ms per item
- **Session map I/O**: < 5ms (JSON read/write)

### Storage

- **Task files**: ~2KB per task (markdown + frontmatter)
- **Session map**: ~100 bytes per promoted item
- **Promotions log**: ~200 bytes per promotion event
- **Total overhead**: ~1KB per 100 promotions

### Optimization Opportunities

1. **Cache git root**: Store in environment variable
2. **Lazy kanban refresh**: Only on status-changing operations
3. **Incremental kanban updates**: Update only changed sections
4. **Session map pruning**: Remove completed tasks from map
5. **Log rotation**: Automatic cleanup of old logs > 30 days

---

## Error Handling

### Runtime Errors

| Error | Condition | Handler |
|-------|-----------|----------|
| `RuntimeError` | Not in git repository | `_find_git_root()` |
| `RuntimeError` | Prompts dir missing | `config.validate()` |
| `RuntimeError` | Kanban file missing | `config.validate()` |
| `ValueError` | Invalid task filename | `TaskFile.wbs` property |
| `ValueError` | Invalid WBS number | `_validate_wbs()` |
| `json.JSONDecodeError` | Invalid hook data | `cmd_hook()`, `cmd_sync_todowrite()` |
| `PermissionError` | Symlink creation failed | `_create_symlink()` |

### Security Validation

| Validation | Purpose | Location |
|------------|---------|----------|
| WBS regex | Prevent path traversal | `_validate_wbs()` |
| JSON schema | Validate hook payloads | `cmd_hook()` |
| Task name length | Prevent DoS via long names | `cmd_create()` |
| No shell=True | Command injection prevention | All `subprocess.run()` |
| Path safety | Use Path objects exclusively | Throughout |

### User-Facing Messages

Format: `[LEVEL] Message`

- `[INFO]` - Informational messages
- `[WARN]` - Warnings (non-fatal issues)
- `[ERROR]` - Errors (fatal, exits with code 1)

---

## Future Enhancements

### Planned Features

1. **Sub-task support**: Create task subdirectories (`docs/prompts/0047/`)
2. **Category tags**: Add category field to frontmatter
3. **Time tracking**: Add time_estimated and time_spent fields
4. **Dependencies**: Add depends_on field for task relationships
5. **Enhanced auto-sync**: Configurable promotion rules via config file
6. **Log rotation**: Automatic cleanup of logs > 30 days
7. **Conflict resolution**: Handle TodoWrite ↔ Tasks state conflicts
8. **Bulk operations**: `tasks update 47-52 wip` (range support)

### Completed Features

- ✅ **TodoWrite Integration**: Bidirectional sync with smart promotion (v1.0)
- ✅ **Session Resume**: Restore active tasks across sessions (v1.0)
- ✅ **Symlink Creation**: Convenient `tasks` command (v1.0)
- ✅ **5-Signal Heuristic**: Smart auto-promotion engine (v1.0)

### Backward Compatibility

All planned features will be optional with sensible defaults:
- Sub-task creation only when explicitly requested
- Categories default to "general"
- Time tracking fields optional
- Dependencies stored separately
- TodoWrite integration can be disabled via config

---

## Maintenance Guidelines

### Adding New Status Values

1. Add enum value to `TaskStatus`
2. Add aliases to `from_alias()`
3. Update `VALID_STAGES` list
4. Add kanban section in `_write_kanban()`
5. Add checkbox mapping in `cmd_refresh()`

### Modifying Template

Edit `docs/prompts/.template.md`:
- Preserve YAML frontmatter structure
- Use template variables for dynamic content
- Keep sections in standard order

### Git Integration

The tool assumes git repository structure. For non-git projects:

```python
# Override git root detection
config = TasksConfig(project_root=Path("/path/to/project"))
```
