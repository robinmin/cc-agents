# Prompt Engineering Guide: TodoWrite ↔ Tasks Integration

## Executive Summary

This guide presents a **sophisticated prompt engineering solution** for seamlessly integrating Claude Code's built-in TodoWrite tool (ephemeral session tasks) with the tasks skill (persistent project tasks). The solution eliminates duplicate tracking, preserves context across sessions, and automatically promotes important work to persistent storage.

## Problem Statement

### Current Pain Points

**Dual-Tracking Burden**
```
Claude Session:
  TodoWrite: "Implement authentication" [in_progress]

User must manually:
  $ tasks create "Implement authentication"
  $ tasks update 48 wip

Result: Duplicate effort, easy to forget, lost sync
```

**Context Loss Between Sessions**
```
Session 1 (Monday):
  TodoWrite: "Refactor API layer" [in_progress]
  ↓
Session 1 ends → TodoWrite state lost
  ↓
Session 2 (Tuesday):
  User must recall: "What was I working on?"

Result: Mental overhead, context switching cost
```

**Unclear Escalation Path**
```
Simple task: "Fix typo" → Keep in TodoWrite ✓
Complex task: "Implement OAuth2" → Should it be a persistent task? 🤔

Result: Decision paralysis, inconsistent tracking
```

## Solution Architecture

### Design Philosophy

**Three-Layer Task Management**

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Ephemeral (TodoWrite)                          │
│ Purpose: Session-level tracking                         │
│ Lifecycle: Conversation only                            │
│ State: pending → in_progress → completed                │
│ Use Case: Simple, single-session tasks                  │
└─────────────────────────────────────────────────────────┘
                       │
                       │ Smart Promotion
                       ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 2: Persistent (External Tasks)                    │
│ Purpose: Project-level tracking                         │
│ Lifecycle: Git-tracked, multi-session                   │
│ State: Backlog → Todo → WIP → Testing → Done           │
│ Use Case: Complex, multi-session work                   │
└─────────────────────────────────────────────────────────┘
                       │
                       │ Aggregation
                       ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 3: Project Kanban (Obsidian Board)               │
│ Purpose: High-level project visibility                  │
│ Lifecycle: Auto-generated from Layer 2                  │
│ View: Kanban columns, GitHub-style project board        │
│ Use Case: Stakeholder communication, sprint planning    │
└─────────────────────────────────────────────────────────┘
```

### Key Insight: Automatic Escalation

**The Promotion Principle:**
> "Keep tasks ephemeral by default, promote to persistent automatically when they exhibit complexity signals."

This respects TodoWrite's design (ephemeral, lightweight) while ensuring important work persists.

## Prompt Engineering Techniques

### Technique 1: State Mapping Abstraction

**Problem**: TodoWrite and Tasks use different state models

**Solution**: Bidirectional translation layer in prompts

```markdown
## State Translation Protocol

When syncing TodoWrite → External Tasks:

| TodoWrite State | Tasks Status | Rationale |
|-----------------|--------------|-----------|
| pending         | Todo         | Not started yet |
| in_progress     | WIP          | Active work |
| completed       | Done         | Finished work |

When syncing External Tasks → TodoWrite:

| Tasks Status | TodoWrite State | Rationale |
|--------------|-----------------|-----------|
| Backlog      | pending         | Not prioritized |
| Todo         | pending         | Ready but not started |
| WIP          | in_progress     | Active work |
| Testing      | in_progress     | Still in progress |
| Done         | completed       | Finished |

**Critical Rule**: Tasks.Testing maps to TodoWrite.in_progress because
testing is still active work, not completed.
```

**Prompt Pattern:**
```
When processing TodoWrite events, ALWAYS:
1. Extract item status: pending | in_progress | completed
2. Map to Tasks status using State Translation Protocol
3. Update external task file with mapped status
4. Log mapping decision for audit trail
```

### Technique 2: Promotion Heuristics

**Problem**: How to automatically decide when ephemeral → persistent?

**Solution**: Multi-signal heuristic with clear decision tree

```markdown
## Promotion Decision Tree

Evaluate TodoWrite item with these signals (OR logic):

### Signal 1: Complex Keywords
If content contains ANY of these keywords, promote:
- "implement", "refactor", "design", "architecture"
- "integrate", "migrate", "optimize", "feature"
- "build", "create" (when > 30 chars)

**Rationale**: These words signal non-trivial work requiring planning

### Signal 2: Content Length
If content > 50 characters, promote

**Rationale**: Long descriptions = complex scope

### Signal 3: Active Work
If status transitions to in_progress, promote

**Rationale**: Once work starts, it should be tracked persistently

### Signal 4: Explicit Tracking
If content mentions "wbs", "task", or "docs/prompts", promote

**Rationale**: User explicitly wants persistent tracking

### Signal 5: Multi-Step Detection
If content contains numbered steps (1., 2., 3.) or bullet points, promote

**Rationale**: Multi-step tasks need persistent tracking

## Decision Example

TodoWrite Item: "Implement OAuth2 authentication with Google provider"
  ├─ Signal 1: ✓ Contains "implement"
  ├─ Signal 2: ✓ Length = 54 chars
  ├─ Signal 3: ✗ Status = pending (not in_progress yet)
  ├─ Signal 4: ✗ No explicit tracking keywords
  └─ Signal 5: ✗ No numbered steps

Decision: PROMOTE (2 signals triggered)
Action: Create external task with WBS 0048
```

**Prompt Pattern:**
```
When TodoWrite PreToolUse hook fires:
1. Extract item content and status
2. Evaluate ALL 5 promotion signals
3. If ANY signal returns true, execute promotion:
   a. Create external task file
   b. Map item_hash → WBS in session_map.json
   c. Log promotion with triggered signal
4. If NO signals, keep ephemeral (do nothing)
```

### Technique 3: Session Continuity

**Problem**: New sessions lose context of active work

**Solution**: Session resume from persistent state

```markdown
## Session Start Protocol

On SessionStart event or when user asks "What was I working on?":

### Step 1: Scan External Tasks
Query all task files with status = WIP or Testing

### Step 2: Generate TodoWrite Items
For each active external task, create TodoWrite item:
- content: "Continue {task_name} (WBS {wbs})"
- status: in_progress (if WIP) or in_progress (if Testing)
- activeForm: "Continuing {task_name}"

### Step 3: Present Context
Show user:
"Resuming previous session. Active tasks:
- WBS 0048: Implement OAuth2 authentication [WIP]
- WBS 0049: Fix memory leak in parser [Testing]

Would you like to continue with any of these?"

### Step 4: Restore Session Map
Regenerate session_map.json from external tasks to prevent duplicates
```

**Prompt Pattern:**
```
When session starts and external tasks exist:
1. List active tasks (WIP, Testing)
2. Generate resume summary
3. Ask user which task to continue
4. Restore session_map to link TodoWrite ↔ WBS
```

### Technique 4: Hook-Based Event Sourcing

**Problem**: How to capture TodoWrite state changes without modifying Claude Code internals?

**Solution**: Event sourcing via PreToolUse hooks

```markdown
## Event Sourcing Pattern

### PreToolUse Hook (TodoWrite)
Captures BEFORE TodoWrite executes:
- Input: ${TOOL_INPUT} contains new todos array
- Parse: Extract items with content, status, activeForm
- Process: Apply promotion heuristics
- Action: Create/update external tasks if needed

### PostToolUse Hook (Tasks)
Captures AFTER tasks command executes:
- Input: ${TOOL_OUTPUT} contains command result
- Parse: Extract WBS and new status
- Process: Reverse sync to TodoWrite (if session_map exists)
- Action: Update TodoWrite items to match external state

### Event Log Structure
.claude/tasks_sync/events.log:
{
  "timestamp": "2026-01-21T14:30:00",
  "event": "PreToolUse",
  "tool": "TodoWrite",
  "trigger": "in_progress transition",
  "action": "promoted to WBS 0048",
  "session_map_update": {"abc123": "0048"}
}
```

**Prompt Pattern:**
```
For each TodoWrite event:
1. Capture full tool input as event
2. Extract semantic changes (new items, status transitions)
3. Apply business logic (promotion, sync)
4. Log event with decision rationale
5. Update session_map for tracking
```

### Technique 5: Graceful Degradation

**Problem**: What if hooks fail or user disables auto-promotion?

**Solution**: Fallback to manual workflow with clear guidance

```markdown
## Fallback Strategy

### If Hook Fails
1. Log error to .claude/tasks_sync/errors.log
2. Continue with ephemeral TodoWrite only
3. User can manually run: tasks sync todowrite

### If Auto-Promotion Disabled
Config: {"auto_promotion": {"enabled": false}}

Behavior:
- TodoWrite works normally (ephemeral only)
- No automatic external task creation
- User can manually create tasks: tasks create "..."

### If Session Map Corrupted
1. Detect: JSON parse error on load
2. Action: Delete session_map.json
3. Recover: Regenerate from external task files
4. Log: Corruption event for debugging

### User Guidance Prompts
When auto-promotion disabled or hook fails:
"Note: Auto-promotion is disabled. Complex tasks can be manually tracked with:
  tasks create 'Your task description here'"
```

**Prompt Pattern:**
```
ALWAYS provide fallback path:
1. Try automatic sync
2. If fails, log error
3. Inform user of manual option
4. Continue normal operation
```

## Implementation Prompts

### Prompt 1: Hook Handler (cmd_hook_sync)

```python
def cmd_hook_sync(self, data: str | None = None) -> int:
    """
    Handle TodoWrite PreToolUse hook event for auto-promotion.

    Workflow:
    1. Parse TodoWrite items from hook data
    2. Evaluate promotion criteria for each item
    3. Create/update external tasks as needed
    4. Maintain session_map for TodoWrite ↔ WBS tracking
    5. Log all promotion events

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

        # Load session map
        session_map = self._load_session_map()

        for item in todos:
            content = item.get("content", "")
            status = item.get("status", "")

            # Generate stable hash for TodoWrite item
            item_hash = hashlib.md5(content.encode()).hexdigest()[:8]

            # Check if already promoted
            if item_hash in session_map:
                wbs = session_map[item_hash]
                # Update existing external task
                self._sync_to_external_task(wbs, item)
                continue

            # Evaluate promotion criteria
            should_promote, signals = self._evaluate_promotion(item)

            if should_promote:
                # Create external task
                wbs = self._create_external_task_from_todowrite(item)
                # Map TodoWrite item → WBS
                session_map[item_hash] = wbs
                # Log promotion
                self._log_promotion(item, wbs, signals)

        # Save session map
        self._save_session_map(session_map)

        return 0

    except Exception as e:
        print(f"[ERROR] Hook sync failed: {e}", file=sys.stderr)
        return 1
```

### Prompt 2: Promotion Evaluator

```python
def _evaluate_promotion(self, todo_item: dict) -> tuple[bool, list[str]]:
    """
    Evaluate if TodoWrite item should be promoted to external task.

    Uses 5-signal heuristic (OR logic):
    - Complex keywords (implement, refactor, design, etc.)
    - Long content (> 50 chars)
    - Active work (in_progress status)
    - Explicit tracking (mentions wbs, task file)
    - Multi-step detection (numbered lists)

    Args:
        todo_item: TodoWrite item dict

    Returns:
        (should_promote: bool, triggered_signals: list[str])
    """
    content = todo_item.get("content", "")
    status = todo_item.get("status", "")

    triggered_signals = []

    # Signal 1: Complex keywords
    COMPLEX_KEYWORDS = [
        "implement", "refactor", "design", "architecture",
        "integrate", "migrate", "optimize", "feature", "build"
    ]
    for keyword in COMPLEX_KEYWORDS:
        if keyword.lower() in content.lower():
            triggered_signals.append(f"complex_keyword:{keyword}")
            break

    # Signal 2: Long content
    if len(content) > 50:
        triggered_signals.append("long_content")

    # Signal 3: Active work
    if status == "in_progress":
        triggered_signals.append("active_work")

    # Signal 4: Explicit tracking
    TRACKING_KEYWORDS = ["wbs", "task file", "docs/prompts"]
    for keyword in TRACKING_KEYWORDS:
        if keyword.lower() in content.lower():
            triggered_signals.append(f"explicit_tracking:{keyword}")
            break

    # Signal 5: Multi-step detection
    if re.search(r'\d+\.|\-\s', content):  # Matches "1." or "- "
        triggered_signals.append("multi_step")

    return (len(triggered_signals) > 0, triggered_signals)
```

### Prompt 3: Session Resume

```python
def cmd_sync_restore(self) -> int:
    """
    Restore TodoWrite items from active external tasks.

    Use case: Session resume or user asks "What was I working on?"

    Workflow:
    1. Scan external task files for WIP/Testing status
    2. Generate TodoWrite-compatible items
    3. Print items in TodoWrite format
    4. Regenerate session_map to prevent duplicates

    Output format (stdout):
    [
      {
        "content": "Continue implement_oauth2 (WBS 0048)",
        "status": "in_progress",
        "activeForm": "Continuing implement_oauth2"
      }
    ]

    Returns:
        0 on success, 1 on failure
    """
    try:
        self.config.validate()

        # Find active tasks
        active_items = []
        session_map = {}

        for task_file in self.config.prompts_dir.glob("*.md"):
            if task_file.name.startswith("."):
                continue

            task = TaskFile(task_file)
            status = task.get_status()

            # Only restore WIP and Testing tasks
            if status in [TaskStatus.WIP, TaskStatus.TESTING]:
                # Map to TodoWrite state
                todowrite_state = "in_progress"

                # Generate TodoWrite item
                item = {
                    "content": f"Continue {task.name} (WBS {task.wbs})",
                    "status": todowrite_state,
                    "activeForm": f"Continuing {task.name}",
                }
                active_items.append(item)

                # Regenerate session map
                item_hash = hashlib.md5(item["content"].encode()).hexdigest()[:8]
                session_map[item_hash] = task.wbs

        # Save regenerated session map
        self._save_session_map(session_map)

        # Print TodoWrite items as JSON
        print(json.dumps(active_items, indent=2))

        return 0

    except Exception as e:
        print(f"[ERROR] Session restore failed: {e}", file=sys.stderr)
        return 1
```

## User Experience Flow

### Flow 1: First-Time User

```
1. User creates TodoWrite item:
   "Implement user authentication with OAuth2"

2. PreToolUse hook fires:
   → Evaluates promotion criteria
   → Signals: complex_keyword:implement, long_content
   → Decision: PROMOTE

3. External task created:
   → docs/prompts/0048_implement_user_authentication.md
   → Status: Todo (since TodoWrite was pending)
   → session_map: {"abc123": "0048"}

4. User sees notification:
   "✅ Task promoted to persistent tracking (WBS 0048)"

5. User marks TodoWrite as in_progress:
   → Hook fires again
   → Syncs: 0048 status → WIP

6. User views kanban:
   $ tasks list wip
   → Shows: 0048_implement_user_authentication [WIP]
```

### Flow 2: Returning User (Session Resume)

```
1. User starts new Claude session

2. User asks: "What was I working on yesterday?"

3. Claude invokes:
   $ tasks sync restore

4. Output shows:
   - WBS 0048: Implement user authentication [WIP]
   - WBS 0049: Fix memory leak in parser [Testing]

5. Claude suggests:
   "You have 2 active tasks. Would you like to:
   a) Continue WBS 0048 (authentication)
   b) Continue WBS 0049 (memory leak)
   c) Start something new"

6. User selects: "a"

7. TodoWrite auto-populated:
   - "Continue implement_user_authentication (WBS 0048)" [in_progress]

8. Work continues with full context
```

### Flow 3: Manual Override

```
1. User wants ephemeral task only:
   "Fix typo in README" (short, simple)

2. Hook evaluates:
   → Signals: (none - too short, no complex keywords)
   → Decision: KEEP EPHEMERAL

3. TodoWrite only (no external task):
   - "Fix typo in README" [pending] → [completed]

4. No promotion, no persistence (correct behavior)
```

## Monitoring & Observability

### Key Metrics to Track

```bash
# Promotion rate
grep -c "promoted to WBS" .claude/tasks_sync/promotions.log

# Signal distribution
grep -o "signal:[^\"]*" .claude/tasks_sync/promotions.log | sort | uniq -c

# Session resume usage
grep -c "session_restore" .claude/tasks_sync/events.log

# Hook failures
grep -c "ERROR" .claude/tasks_sync/errors.log
```

### Health Checks

```bash
# Verify session map integrity
python3 -m json.tool .claude/tasks_sync/session_map.json

# Check for orphaned mappings (WBS no longer exists)
tasks sync verify-mappings

# Audit log for anomalies
tail -100 .claude/tasks_sync/events.log | grep "WARN\|ERROR"
```

## Conclusion

This sophisticated integration solution leverages **prompt engineering principles** to create a seamless bridge between ephemeral (TodoWrite) and persistent (external tasks) tracking systems. Key innovations:

1. **Automatic Escalation**: Smart promotion heuristics eliminate manual decision-making
2. **State Mapping**: Bidirectional translation preserves semantic intent
3. **Session Continuity**: Resume protocol prevents context loss
4. **Event Sourcing**: Hook-based architecture ensures consistency
5. **Graceful Degradation**: Fallback paths maintain usability

The result: **Zero-friction task management** that respects both systems' design philosophies while providing unified workflow.

## References

- [Full Integration Plan](INTEGRATION_PLAN.md) - Complete technical architecture
- [Quick Integration Guide](QUICK_INTEGRATION_GUIDE.md) - 5-minute setup
- [TodoWrite System Prompt](https://github.com/Piebald-AI/claude-code-system-prompts/blob/main/system-prompts/tool-description-todowrite.md) - Official specification
