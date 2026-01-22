# TodoWrite Hook Integration

The tasks CLI integrates with Claude Code via PreToolUse hooks to track TodoWrite operations.

## Hook Configuration

Location: `plugins/rd2/hooks/hooks.json`

```json
{
  "description": "Hooks for rd2 plugin - TodoWrite synchronization",
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "TodoWrite",
        "hooks": [
          {
            "type": "command",
            "command": "python3 ${CLAUDE_PLUGIN_ROOT}/skills/tasks/scripts/tasks.py hook ${hook_input.tool_input.operation} --data '${hook_input}'"
          }
        ]
      }
    ]
  }
}
```

## How It Works

1. **Matcher**: `"TodoWrite"` - Triggers on any TodoWrite tool call
2. **Operation**: `${hook_input.tool_input.operation}` - Captures operation type (add/update/remove)
3. **Data**: `${hook_input}` - Full JSON payload with items array

## Hook Log Format

Location: `<project-root>/.claude/tasks_hook.log`

```json
{"timestamp": "2026-01-21T15:39:20.165650", "operation": "add", "item_count": 1, "items": [{"content": "Task name", "status": "pending", "activeForm": "Working on task"}]}
```

**Fields:**
- `timestamp`: ISO 8601 timestamp
- `operation`: TodoWrite operation (add/update/remove)
- `item_count`: Number of items in the operation
- `items`: First 3 items (for logging preview)

## cmd_hook Implementation

```python
def cmd_hook(self, operation: str, data: str | None = None) -> int:
    """Handle TodoWrite PreToolUse hook events.

    Logs TodoWrite operations to project-local .claude/tasks_hook.log

    Args:
        operation: The TodoWrite operation (add/update/remove)
        data: JSON string containing tool_input data

    Returns:
        0 on success, 1 on failure.
    """
    try:
        # Parse and validate the input data if provided
        items = []
        if data:
            try:
                hook_data = json.loads(data)
                if not isinstance(hook_data, dict):
                    return 1
                tool_input = hook_data.get("tool_input", {})
                if not isinstance(tool_input, dict):
                    return 1
                items = tool_input.get("items", [])
                if not isinstance(items, list):
                    return 1
            except json.JSONDecodeError:
                return 1

        # Log to project-local .claude directory
        log_file = self.config.project_root / ".claude" / "tasks_hook.log"
        log_file.parent.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().isoformat()
        log_entry = {
            "timestamp": timestamp,
            "operation": operation,
            "item_count": len(items),
            "items": items[:3] if items else [],
        }

        with open(log_file, "a") as f:
            f.write(json.dumps(log_entry) + "\n")

        return 0
    except Exception as e:
        print(f"[ERROR] Hook failed: {e}", file=sys.stderr)
        return 1
```

## Viewing Hook Logs

```bash
# View recent hook events
tail -20 .claude/tasks_hook.log

# Count operations by type
grep -c '"operation": "add"' .claude/tasks_hook.log
grep -c '"operation": "update"' .claude/tasks_hook.log

# Pretty print with jq
jq '.' .claude/tasks_hook.log | less

# Filter by operation
jq 'select(.operation == "add")' .claude/tasks_hook.log
```

## Future: Auto-Sync Extension

The hook can be extended to automatically create task files:

```python
# In cmd_hook() method
if operation == "add" and items:
    for item in items:
        task_name = item.get("content", "")
        if task_name and not self._task_exists(task_name):
            self.cmd_create(task_name)
```

This would enable automatic task file creation from TodoWrite operations.

## Developer Testing: log Command

For testing hook events, use the `log` command:

```bash
# Log a test event
python3 scripts/tasks.py log TEST_EVENT --data '{"key": "value"}'

# View the log
cat .claude/logs/hook_event.log
```

Log format: `timestamp prefix json_payload`

Example:
```
2026-01-21T15:30:00 TEST_EVENT {"key": "value"}
```

## Security Considerations

The hook processes external JSON data. Input validation is critical:

1. **Type checking**: Verify all JSON objects are expected types
2. **Structure validation**: Ensure `tool_input` is a dict, `items` is a list
3. **Error handling**: Catch JSONDecodeError and return error code
4. **Path safety**: Log files use project-local `.claude/` directory

Current implementation includes all these safeguards.
