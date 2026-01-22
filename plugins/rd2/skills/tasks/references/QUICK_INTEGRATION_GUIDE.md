# Quick Integration Guide: Tasks ↔ TodoWrite

## TL;DR

Enable automatic synchronization between Claude Code's TodoWrite (ephemeral session tasks) and the tasks skill (persistent project tasks).

## 5-Minute Setup

### Step 1: Update hooks.json

Create or update `/Users/robin/projects/cc-agents/plugins/rd2/hooks/hooks.json`:

```json
{
  "hooks": [
    {
      "name": "todowrite-auto-promote",
      "description": "Auto-promote TodoWrite items to external task files",
      "event": "PreToolUse",
      "tool": "TodoWrite",
      "action": {
        "type": "bash",
        "command": "python3 ${CLAUDE_PLUGIN_ROOT}/skills/tasks/scripts/tasks.py sync todowrite --data \"${TOOL_INPUT}\""
      }
    }
  ]
}
```

### Step 2: Test the Integration

```bash
# In Claude Code session, create a TodoWrite item
User: "Implement user authentication with OAuth2"

# Check if external task was auto-created
tasks list

# Should see: 0048_implement_user_authentication.md [WIP]
```

### Step 3: Verify Logs

```bash
# Check promotion log
cat .claude/tasks_sync/promotions.log

# Expected output:
# {"timestamp": "2026-01-21T...", "wbs": "0048", "content": "Implement user...", "reason": "Complex keyword: implement"}
```

## How It Works

### Architecture

```
TodoWrite Item Created/Updated
         │
         ▼
  PreToolUse Hook Fires
         │
         ▼
  tasks.py sync todowrite
         │
         ├─→ Analyze promotion criteria
         ├─→ Create external task file (if needed)
         ├─→ Update session_map.json
         └─→ Log promotion event
         │
         ▼
  External Task File Created/Updated
```

### State Mapping

| TodoWrite State | External Task Status |
|-----------------|---------------------|
| pending         | Todo                |
| in_progress     | WIP                 |
| completed       | Done                |

### Promotion Rules

A TodoWrite item is auto-promoted to an external task if it meets **any** of these criteria:

1. **Complex Keywords**: Contains `implement`, `refactor`, `design`, `architecture`, `integrate`, `migrate`, `optimize`, `feature`
2. **Long Content**: > 50 characters
3. **In Progress**: Status is `in_progress` (active work deserves tracking)
4. **Explicit Reference**: Mentions `wbs`, `task file`, or `docs/prompts`

## Configuration

### Custom Promotion Rules

Create `.claude/tasks_sync/config.json`:

```json
{
  "auto_promotion": {
    "enabled": true,
    "min_content_length": 30,
    "complex_keywords": [
      "implement", "refactor", "design", "bug", "fix",
      "add", "create", "build", "integrate"
    ],
    "always_promote_in_progress": true
  }
}
```

### Disable Auto-Promotion

```json
{
  "auto_promotion": {
    "enabled": false
  }
}
```

## Commands

### Sync TodoWrite to External Tasks

```bash
# Manual sync (if hook not configured)
tasks sync todowrite --data '{"todos": [...]}'

# View session mapping
cat .claude/tasks_sync/session_map.json

# View promotion log
cat .claude/tasks_sync/promotions.log
```

### Resume Session from External Tasks

```bash
# Restore TodoWrite items from active external tasks
tasks sync restore

# Output: TodoWrite items for WIP/Testing tasks
```

## Examples

### Example 1: Simple Task (No Promotion)

```
TodoWrite: "Fix typo in README" [pending]
  ↓
Hook fires → Promotion check
  ✗ Content too short (< 50 chars)
  ✗ No complex keywords
  ✗ Status is pending (not in_progress)
  ↓
Result: No external task created (ephemeral only)
```

### Example 2: Complex Task (Auto-Promotion)

```
TodoWrite: "Implement OAuth2 authentication with Google provider" [in_progress]
  ↓
Hook fires → Promotion check
  ✓ Contains "implement" keyword
  ✓ Content > 50 chars
  ✓ Status is in_progress
  ↓
SyncOrchestrator:
  Creates: docs/prompts/0048_implement_oauth2.md
  Status: WIP
  Maps: session_map.json {"abc123": "0048"}
  Logs: promotions.log
  ↓
Result: External task 0048 created and synced
```

### Example 3: State Sync

```
TodoWrite: "Implement OAuth2..." [in_progress] → [completed]
  ↓
Hook fires → Check session_map
  Found: {"abc123": "0048"}
  ↓
SyncOrchestrator:
  Updates: docs/prompts/0048_implement_oauth2.md
  Status: WIP → Done
  ↓
Result: External task 0048 marked as Done
```

## Troubleshooting

### Hook Not Firing

**Problem**: TodoWrite items not auto-promoting
**Solutions**:
1. Check hooks.json exists: `/Users/robin/projects/cc-agents/plugins/rd2/hooks/hooks.json`
2. Verify hook syntax (valid JSON)
3. Check Claude Code logs for hook errors
4. Test manually: `tasks sync todowrite --data '{"todos": [...]}'`

### Invalid Session Map

**Problem**: session_map.json corrupted
**Solution**: Delete and regenerate

```bash
rm .claude/tasks_sync/session_map.json
# Hook will regenerate on next TodoWrite event
```

### Duplicate Tasks

**Problem**: Same TodoWrite item creates multiple external tasks
**Solution**: Check session_map integrity

```bash
# View current mappings
cat .claude/tasks_sync/session_map.json

# Clean up duplicates manually
tasks list
# Delete duplicate task files if needed
```

## Best Practices

### 1. Use Descriptive TodoWrite Content

**Good**: "Implement user authentication with OAuth2 and JWT tokens"
**Bad**: "Auth stuff"

Why: Promotion detection and task naming rely on content quality

### 2. Let Auto-Promotion Work

Don't manually create external tasks for TodoWrite items - let the hook handle it automatically.

### 3. Review Promotion Log Periodically

```bash
# Check what's being promoted
tail -20 .claude/tasks_sync/promotions.log
```

### 4. Adjust Promotion Rules

If too many ephemeral tasks are being promoted, increase `min_content_length` in config.json.

### 5. Use Session Resume

When resuming work on a project:

```bash
# Restore active tasks to TodoWrite
tasks sync restore
```

## Performance

- **Hook Latency**: < 50ms (minimal impact on TodoWrite)
- **Storage**: ~1KB per 100 promotions (session_map + logs)
- **Disk I/O**: Append-only logging (efficient)

## Security

- **No Code Execution**: Hook uses safe Python script
- **Input Validation**: JSON parsing with error handling
- **Path Safety**: All file operations use Path objects
- **Log Rotation**: Automatic cleanup of old logs (>30 days)

## Advanced Usage

### Custom Hook Actions

Add post-promotion notifications:

```json
{
  "name": "todowrite-notify",
  "event": "PostToolUse",
  "tool": "Bash",
  "filter": {
    "command_pattern": "tasks sync todowrite"
  },
  "action": {
    "type": "bash",
    "command": "echo '✅ TodoWrite synced to external tasks' >> .claude/notifications.log"
  }
}
```

### Bi-directional Sync

Notify when external tasks change:

```json
{
  "name": "tasks-update-notify",
  "event": "PostToolUse",
  "tool": "Bash",
  "filter": {
    "command_pattern": "tasks update"
  },
  "action": {
    "type": "bash",
    "command": "python3 ${CLAUDE_PLUGIN_ROOT}/skills/tasks/scripts/tasks.py notify task-updated --data \"${TOOL_OUTPUT}\""
  }
}
```

## Migration from Manual Workflow

If you've been manually creating both TodoWrite items and external tasks:

### Step 1: Enable Auto-Promotion

Add hook to hooks.json (see Step 1 above)

### Step 2: Clean Up Existing Tasks

```bash
# Review existing TodoWrite-task pairs
tasks list
# Manually delete duplicate external tasks if needed
```

### Step 3: Let Hook Handle Future Work

From now on:
- ✅ Create TodoWrite items as usual
- ✅ Let hook auto-promote complex work
- ❌ Don't manually create external tasks for TodoWrite items

## Next Steps

1. **Enable Hook**: Add to hooks.json
2. **Test**: Create a complex TodoWrite item
3. **Verify**: Check `tasks list` for auto-promoted task
4. **Customize**: Adjust promotion rules in config.json
5. **Monitor**: Review promotions.log periodically

## References

- [Full Integration Plan](INTEGRATION_PLAN.md)
- [TodoWrite System Prompt](https://github.com/Piebald-AI/claude-code-system-prompts/blob/main/system-prompts/tool-description-todowrite.md)
- [Hook Integration Reference](../references/hook-integration.md)
