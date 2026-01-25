# Tasks ↔ TodoWrite Integration Plan

## Overview

Sophisticated bidirectional integration between Claude Code's TodoWrite (ephemeral) and tasks skill (persistent) for seamless task management across session and project lifecycles.

## Architecture Components

### 1. State Mapper

**Purpose**: Translate states between TodoWrite and external tasks

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

    @staticmethod
    def to_task_status(todowrite_state: str) -> TaskStatus:
        """Convert TodoWrite state to TaskStatus."""
        return StateMapper.TODOWRITE_TO_TASKS.get(
            todowrite_state, TaskStatus.BACKLOG
        )

    @staticmethod
    def to_todowrite_state(task_status: TaskStatus) -> str:
        """Convert TaskStatus to TodoWrite state."""
        return StateMapper.TASKS_TO_TODOWRITE.get(
            task_status, "pending"
        )
```

### 2. Smart Promotion Engine

**Purpose**: Auto-detect when ephemeral TodoWrite items should become persistent tasks

**Promotion Criteria:**

```python
class PromotionCriteria:
    """Determine when TodoWrite items should be promoted to external tasks."""

    MIN_CONTENT_LENGTH = 50  # Characters
    COMPLEX_KEYWORDS = [
        "implement", "refactor", "design", "architecture",
        "integrate", "migrate", "optimize", "feature"
    ]

    @staticmethod
    def should_promote(todo_item: dict) -> tuple[bool, str]:
        """
        Evaluate if a TodoWrite item should be promoted to external task.

        Args:
            todo_item: TodoWrite item dict with 'content', 'status', 'activeForm'

        Returns:
            (should_promote: bool, reason: str)
        """
        content = todo_item.get("content", "")
        status = todo_item.get("status", "")

        # Rule 1: Long-running work (in_progress for multiple turns)
        if status == "in_progress":
            # Check session duration (requires session tracking)
            return True, "Long-running work in progress"

        # Rule 2: Complex multi-step tasks
        if len(content) > PromotionCriteria.MIN_CONTENT_LENGTH:
            return True, "Complex multi-step task"

        # Rule 3: Contains complex keywords
        for keyword in PromotionCriteria.COMPLEX_KEYWORDS:
            if keyword.lower() in content.lower():
                return True, f"Contains complex keyword: {keyword}"

        # Rule 4: User explicitly mentioned WBS or task tracking
        if any(term in content.lower() for term in ["wbs", "task file", "docs/prompts"]):
            return True, "Explicit task tracking mentioned"

        return False, "Does not meet promotion criteria"
```

### 3. Sync Orchestrator

**Purpose**: Coordinate synchronization between TodoWrite and external tasks

```python
class SyncOrchestrator:
    """Orchestrates bidirectional sync between TodoWrite and external tasks."""

    def __init__(self, config: TasksConfig):
        self.config = config
        self.state_mapper = StateMapper()
        self.session_map_file = config.project_root / "docs/tasks_sync/session_map.json"
        self.session_map: dict[str, str] = self._load_session_map()

    def _load_session_map(self) -> dict[str, str]:
        """Load TodoWrite → WBS mapping from disk."""
        if self.session_map_file.exists():
            return json.loads(self.session_map_file.read_text())
        return {}

    def _save_session_map(self) -> None:
        """Persist TodoWrite → WBS mapping to disk."""
        self.session_map_file.parent.mkdir(parents=True, exist_ok=True)
        self.session_map_file.write_text(json.dumps(self.session_map, indent=2))

    def on_todowrite_update(self, todo_items: list[dict]) -> None:
        """
        Handle TodoWrite PreToolUse hook event.

        Workflow:
        1. Detect newly completed items
        2. Check promotion criteria
        3. Create or update external task files
        4. Maintain session_map for TodoWrite → WBS tracking
        """
        for item in todo_items:
            content = item.get("content", "")
            status = item.get("status", "")

            # Hash content for stable mapping
            item_hash = hashlib.md5(content.encode()).hexdigest()[:8]

            # Check if already promoted
            if item_hash in self.session_map:
                wbs = self.session_map[item_hash]
                # Update existing external task
                self._sync_to_external_task(wbs, item)
            else:
                # Check promotion criteria
                should_promote, reason = PromotionCriteria.should_promote(item)
                if should_promote:
                    # Create new external task
                    wbs = self._create_external_task(item, reason)
                    self.session_map[item_hash] = wbs
                    self._save_session_map()

    def _create_external_task(self, todo_item: dict, reason: str) -> str:
        """Create external task file from TodoWrite item."""
        # Use TasksManager to create task
        manager = TasksManager(self.config)
        task_name = todo_item["content"][:100]  # Truncate to reasonable length

        # Create task (returns WBS)
        # Note: Need to modify cmd_create to return WBS instead of exit code
        manager.cmd_create(task_name)

        # Get the latest task (just created)
        task_files = sorted(self.config.prompts_dir.glob("*.md"))
        latest_task = TaskFile(task_files[-1])
        wbs = latest_task.wbs

        # Log promotion
        self._log_promotion(todo_item, wbs, reason)

        return wbs

    def _sync_to_external_task(self, wbs: str, todo_item: dict) -> None:
        """Update external task status based on TodoWrite state."""
        task_status = self.state_mapper.to_task_status(todo_item["status"])
        manager = TasksManager(self.config)
        manager.cmd_update(wbs, task_status.value.lower())

    def _log_promotion(self, todo_item: dict, wbs: str, reason: str) -> None:
        """Log task promotion event."""
        log_file = self.config.project_root / "docs/tasks_sync/promotions.log"
        log_file.parent.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().isoformat()
        log_entry = {
            "timestamp": timestamp,
            "wbs": wbs,
            "content": todo_item["content"],
            "reason": reason,
        }

        with open(log_file, "a") as f:
            f.write(json.dumps(log_entry) + "\n")
```

### 4. Hook Event Handlers

**Enhanced hooks.json configuration:**

```json
{
  "hooks": [
    {
      "name": "todowrite-sync",
      "description": "Sync TodoWrite items to external task files",
      "event": "PreToolUse",
      "tool": "TodoWrite",
      "action": {
        "type": "bash",
        "command": "python3 ${CLAUDE_PLUGIN_ROOT}/skills/tasks/scripts/tasks.py hook sync --data \"${TOOL_INPUT}\""
      }
    },
    {
      "name": "tasks-update-notification",
      "description": "Notify when external tasks are updated",
      "event": "PostToolUse",
      "tool": "Bash",
      "filter": {
        "command_pattern": "tasks update"
      },
      "action": {
        "type": "bash",
        "command": "python3 ${CLAUDE_PLUGIN_ROOT}/skills/tasks/scripts/tasks.py hook notify-update --data \"${TOOL_OUTPUT}\""
      }
    }
  ]
}
```

### 5. Session Resume Support

**Purpose**: Restore TodoWrite state from persistent tasks when resuming work

```python
class SessionResume:
    """Restore TodoWrite items from external tasks on session start."""

    @staticmethod
    def restore_from_tasks(config: TasksConfig) -> list[dict]:
        """
        Generate TodoWrite items from active external tasks.

        Returns:
            List of TodoWrite-compatible todo items
        """
        todos = []
        state_mapper = StateMapper()

        # Find all WIP/Testing tasks
        for task_file in config.prompts_dir.glob("*.md"):
            if task_file.name.startswith("."):
                continue

            task = TaskFile(task_file)
            status = task.get_status()

            # Only restore active work
            if status in [TaskStatus.WIP, TaskStatus.TESTING]:
                todowrite_state = state_mapper.to_todowrite_state(status)

                todos.append({
                    "content": f"Continue {task.name} (WBS {task.wbs})",
                    "status": todowrite_state,
                    "activeForm": f"Continuing {task.name}",
                })

        return todos
```

## Implementation Phases

### Phase 1: Enhanced Hook Processing (Week 1)
- [x] Implement StateMapper
- [ ] Implement PromotionCriteria
- [ ] Update `cmd_hook` to support sync operation
- [ ] Add session_map.json storage
- [ ] Test hook with TodoWrite events

### Phase 2: Smart Promotion (Week 2)
- [ ] Implement SyncOrchestrator
- [ ] Add promotion logging
- [ ] Create promotion_rules.json configuration
- [ ] Test auto-promotion workflow

### Phase 3: Bidirectional Sync (Week 3)
- [ ] Implement reverse sync (Tasks → TodoWrite notification)
- [ ] Add PostToolUse hook for tasks commands
- [ ] Test state consistency

### Phase 4: Session Resume (Week 4)
- [ ] Implement SessionResume
- [ ] Add SessionStart hook
- [ ] Test resume workflow with active tasks

### Phase 5: User Configuration (Week 5)
- [ ] Add .claude/tasks_sync/config.json
- [ ] Allow users to customize promotion rules
- [ ] Add opt-out for auto-promotion

## Configuration File Format

**.claude/tasks_sync/config.json:**

```json
{
  "auto_promotion": {
    "enabled": true,
    "min_content_length": 50,
    "complex_keywords": [
      "implement", "refactor", "design", "architecture",
      "integrate", "migrate", "optimize", "feature"
    ],
    "promote_on_in_progress": true,
    "promote_duration_minutes": 5
  },
  "state_sync": {
    "enabled": true,
    "sync_direction": "bidirectional",
    "sync_on_completion": true
  },
  "session_resume": {
    "enabled": true,
    "restore_wip_tasks": true,
    "restore_testing_tasks": true
  }
}
```

## Workflow Examples

### Example 1: Auto-Promotion

```
User: "Implement user authentication with OAuth2"
  ↓
TodoWrite creates:
  - "Implement user authentication with OAuth2" [pending]
  ↓
Claude starts work:
  TodoWrite updates: [in_progress]
  ↓
PreToolUse hook fires:
  PromotionCriteria evaluates:
    ✓ Contains "implement" keyword
    ✓ Long content (> 50 chars)
  ↓
SyncOrchestrator:
  Creates: docs/prompts/0048_implement_user_authentication.md
  Status: WIP
  Logs: promotion_rules.log
  Maps: session_map.json {"abc123": "0048"}
  ↓
User sees: "Promoted to persistent task 0048"
```

### Example 2: State Sync

```
TodoWrite: "Fix memory leak" [completed]
  ↓
PreToolUse hook:
  session_map.json: {"def456": "0047"}
  ↓
SyncOrchestrator:
  Updates: docs/prompts/0047_fix_memory_leak.md
  Status: WIP → Done
  ↓
External task file updated automatically
```

### Example 3: Session Resume

```
New Claude session starts
  ↓
SessionStart hook fires
  ↓
SessionResume.restore_from_tasks():
  Finds: 0048_implement_auth.md [WIP]
  Finds: 0049_fix_tests.md [Testing]
  ↓
Generates TodoWrite items:
  - "Continue implement_auth (WBS 0048)" [in_progress]
  - "Continue fix_tests (WBS 0049)" [in_progress]
  ↓
User sees restored context automatically
```

## Benefits

1. **Zero Context Loss**: Work persists across sessions
2. **Automatic Escalation**: Important work auto-promoted to persistent tracking
3. **Unified View**: Both ephemeral and persistent tasks in sync
4. **Audit Trail**: Complete history of promotions and syncs
5. **Smart Defaults**: Works out-of-box with sensible promotion rules
6. **User Control**: Configurable via .claude/tasks_sync/config.json

## Testing Strategy

### Unit Tests
- StateMapper bidirectional conversion
- PromotionCriteria decision logic
- SyncOrchestrator session_map persistence

### Integration Tests
- PreToolUse hook → external task creation
- TodoWrite state change → task file update
- Session resume → TodoWrite restoration

### E2E Tests
- Complete workflow: TodoWrite → promotion → sync → resume
- Error handling: missing task files, invalid WBS
- Configuration: custom promotion rules

## Migration Path

For existing users:

1. **Optional Opt-in**: Auto-promotion disabled by default
2. **Manual Migration**: `tasks sync-from-todowrite` command
3. **Gradual Rollout**: Enable one feature at a time
4. **Fallback**: Can always disable in config.json

## References

- [TodoWrite System Prompt](https://github.com/Piebald-AI/claude-code-system-prompts/blob/main/system-prompts/tool-description-todowrite.md)
- [Current Hook Integration](../references/hook-integration.md)
- [Architecture Reference](../references/architecture.md)
