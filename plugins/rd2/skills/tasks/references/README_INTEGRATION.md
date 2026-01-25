# Tasks ↔ TodoWrite Sophisticated Integration

## Overview

This document presents a **master-level prompt engineering solution** for integrating Claude Code's built-in TodoWrite tool with the tasks skill, creating a unified task management system that works seamlessly across ephemeral and persistent layers.

## 📚 Documentation Structure

### Quick Start (5 minutes)
**[Quick Integration Guide](QUICK_INTEGRATION_GUIDE.md)**
- Immediate setup instructions
- Hook configuration
- Basic workflow examples
- Troubleshooting guide

**Recommended for**: First-time users, quick POC

### Technical Architecture (30 minutes)
**[Integration Plan](INTEGRATION_PLAN.md)**
- Complete system architecture
- Component design (StateMapper, SyncOrchestrator, PromotionEngine)
- Implementation phases
- Testing strategy
- Migration path

**Recommended for**: System architects, senior developers

### Prompt Engineering Deep Dive (60 minutes)
**[Prompt Engineering Guide](PROMPT_ENGINEERING_GUIDE.md)**
- Prompt engineering techniques
- State mapping abstractions
- Promotion heuristics
- Session continuity patterns
- Event sourcing with hooks
- User experience flows

**Recommended for**: Prompt engineers, AI integration specialists

## 🎯 Problem & Solution

### The Problem

**Before Integration:**
```
┌──────────────────┐          ┌──────────────────┐
│ TodoWrite        │          │ External Tasks   │
│ (Ephemeral)      │          │ (Persistent)     │
├──────────────────┤          ├──────────────────┤
│ • Session-only   │          │ • Git-tracked    │
│ • Lost on exit   │   ✗ NO   │ • Survives       │
│ • Lightweight    │   SYNC   │ • Heavy process  │
│ • Auto-managed   │          │ • Manual         │
└──────────────────┘          └──────────────────┘

Result:
- Duplicate tracking effort
- Context loss between sessions
- Unclear escalation path
- Manual sync burden
```

### The Solution

**After Integration:**
```
┌──────────────────────────────────────────────────────┐
│           Unified Task Management System              │
├──────────────────────────────────────────────────────┤
│                                                        │
│  ┌────────────┐    Smart     ┌────────────┐         │
│  │ TodoWrite  │─── Promotion ─▶│  External  │         │
│  │ (Ephemeral)│◀── Sync ──────│  Tasks     │         │
│  └────────────┘               └────────────┘         │
│       │                             │                 │
│       │                             │                 │
│       ▼                             ▼                 │
│  Session State              Project Kanban            │
│  (In-memory)                (Persistent)              │
└──────────────────────────────────────────────────────┘

Result:
✅ Zero duplicate tracking
✅ Full context preservation
✅ Automatic escalation
✅ Seamless workflow
```

## 🏗️ Architecture Overview

### Three-Layer Design

```
Layer 1: Ephemeral (TodoWrite)
├─ Purpose: Quick session-level tracking
├─ Lifecycle: Conversation only
├─ States: pending → in_progress → completed
└─ Use Case: Simple, single-session tasks
        │
        │ Smart Promotion (Automatic)
        ▼
Layer 2: Persistent (External Tasks)
├─ Purpose: Project-level tracking
├─ Lifecycle: Git-tracked, multi-session
├─ States: Backlog → Todo → WIP → Testing → Done
└─ Use Case: Complex, multi-session work
        │
        │ Aggregation (Automatic)
        ▼
Layer 3: Project Kanban (Board View)
├─ Purpose: High-level visibility
├─ Lifecycle: Auto-generated from Layer 2
├─ View: Obsidian Kanban format
└─ Use Case: Stakeholder communication
```

### Key Components

| Component | Purpose | Location |
|-----------|---------|----------|
| **StateMapper** | Translate TodoWrite ↔ Tasks states | `tasks.py` |
| **PromotionEngine** | Decide when to promote ephemeral → persistent | `tasks.py` |
| **SyncOrchestrator** | Coordinate bidirectional sync | `tasks.py` |
| **SessionManager** | Restore context across sessions | `tasks.py` |
| **Hook Handlers** | Event-driven integration | `hooks.json` |

## 🚀 Quick Start

### 1. Enable Hook Integration

Edit `plugins/rd2/hooks/hooks.json` (from project root):

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

### 2. Test Integration

```bash
# In Claude Code session
User: "Implement user authentication with OAuth2"

# Check if auto-promoted
tasks list

# Expected: 0048_implement_user_authentication.md [WIP]
```

### 3. Monitor Sync

```bash
# View promotion log
cat .claude/tasks_sync/promotions.log

# View session mapping
cat .claude/tasks_sync/session_map.json
```

## 💡 How It Works

### Promotion Decision Logic

TodoWrite items are **automatically promoted** to external tasks when they exhibit **complexity signals**:

| Signal | Description | Example |
|--------|-------------|---------|
| **Complex Keywords** | Contains: implement, refactor, design, architecture | "Implement OAuth2" ✅ |
| **Long Content** | > 50 characters | "Add comprehensive error handling..." ✅ |
| **Active Work** | Status = in_progress | [in_progress] ✅ |
| **Explicit Tracking** | Mentions: wbs, task file, docs/prompts | "Create WBS task for this" ✅ |
| **Multi-Step** | Contains: 1., 2., 3. or bullet points | "1. Setup 2. Configure..." ✅ |

**Decision Rule**: If **ANY** signal triggers → PROMOTE

### State Synchronization

| TodoWrite State | External Task Status | Sync Direction |
|-----------------|---------------------|----------------|
| pending         | Todo                | Bidirectional  |
| in_progress     | WIP or Testing      | Bidirectional  |
| completed       | Done                | Bidirectional  |

### Session Resume

When starting a new session with active work:

```bash
# Restore TodoWrite from external tasks
tasks sync restore

# Claude sees:
# - WBS 0048: Implement OAuth2 [WIP]
# - WBS 0049: Fix memory leak [Testing]

# TodoWrite auto-populated with active tasks
```

## 📊 Benefits

### For Users

- **Zero Friction**: No manual task creation/sync
- **Full Context**: Resume work across sessions seamlessly
- **Smart Defaults**: Automatic promotion for complex work
- **Audit Trail**: Complete history of all promotions

### For Teams

- **Unified Tracking**: Single source of truth (external tasks)
- **Project Visibility**: Kanban board auto-updated
- **Clear Workflow**: Ephemeral → Persistent escalation path
- **Integration Ready**: Git-tracked, MCP-compatible

### For Prompt Engineers

- **Event Sourcing**: Hook-based architecture
- **State Management**: Bidirectional sync patterns
- **Heuristic Design**: Multi-signal promotion logic
- **Session Continuity**: Resume protocol design

## 🔧 Configuration

### Default Configuration

`.claude/tasks_sync/config.json`:

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

### Custom Promotion Rules

Adjust promotion sensitivity:

```json
{
  "auto_promotion": {
    "min_content_length": 30,  // More aggressive (promote shorter tasks)
    "complex_keywords": [
      "bug", "fix", "add", "create", "build"  // Add more keywords
    ]
  }
}
```

Disable auto-promotion:

```json
{
  "auto_promotion": {
    "enabled": false  // Manual workflow only
  }
}
```

## 📈 Workflow Examples

### Example 1: Simple Task (No Promotion)

```
TodoWrite: "Fix typo in README"
  ↓
Promotion Check:
  ✗ Length: 20 chars (< 50)
  ✗ Keywords: None
  ✗ Status: pending
  ↓
Result: Ephemeral only (correct)
```

### Example 2: Complex Task (Auto-Promotion)

```
TodoWrite: "Implement OAuth2 authentication with Google provider"
  ↓
Promotion Check:
  ✓ Keyword: "implement"
  ✓ Length: 54 chars
  ✓ Status: in_progress
  ↓
Promotion:
  Create: docs/prompts/0048_implement_oauth2.md
  Status: WIP
  Map: {"abc123": "0048"}
  ↓
Result: Persistent tracking (correct)
```

### Example 3: Session Resume

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
Result: Context restored (correct)
```

## 🧪 Testing

### Manual Test

```bash
# Test promotion
# In Claude session:
User: "Implement comprehensive logging system with rotation"

# Verify external task created
tasks list | grep logging

# Check promotion log
tail -1 .claude/tasks_sync/promotions.log

# Expected output:
# {"timestamp": "...", "wbs": "0048", "content": "Implement comprehensive...", "reason": "complex_keyword:implement"}
```

### Automated Test

```bash
# Run integration tests (from project root)
uv run pytest plugins/rd2/skills/tasks/tests/test_integration.py -v
```

## 📖 Further Reading

- **[Quick Integration Guide](QUICK_INTEGRATION_GUIDE.md)** - 5-minute setup
- **[Integration Plan](INTEGRATION_PLAN.md)** - Full architecture
- **[Prompt Engineering Guide](PROMPT_ENGINEERING_GUIDE.md)** - Deep dive

## 🤝 Contributing

To improve this integration:

1. **Adjust Promotion Rules**: Edit `.claude/tasks_sync/config.json`
2. **Add Signals**: Extend `PromotionEngine._evaluate_promotion()`
3. **Customize State Mapping**: Modify `StateMapper` class
4. **Add Hooks**: Extend `hooks.json` with new events

## 📊 Metrics

Track integration health:

```bash
# Promotion rate
echo "Promotions: $(grep -c 'promoted' .claude/tasks_sync/promotions.log)"

# Signal distribution
echo "Top signals:"
grep -o 'signal:[^"]*' .claude/tasks_sync/promotions.log | sort | uniq -c | sort -rn

# Session restores
echo "Session restores: $(grep -c 'session_restore' .claude/tasks_sync/events.log)"
```

## 🎓 Key Takeaways

**Prompt Engineering Principles Applied:**

1. **Automatic Escalation**: Smart heuristics eliminate manual decisions
2. **State Abstraction**: Bidirectional mapping preserves intent
3. **Event Sourcing**: Hook-based architecture ensures consistency
4. **Session Continuity**: Resume protocol prevents context loss
5. **Graceful Degradation**: Fallback paths maintain usability

**Result**: Sophisticated integration that respects both systems' design while providing unified workflow.

## 📞 Support

Questions or issues:
1. Check [Quick Integration Guide](QUICK_INTEGRATION_GUIDE.md) troubleshooting section
2. Review `.claude/tasks_sync/errors.log` for error details
3. Verify `hooks.json` configuration
4. Test with manual command: `tasks sync todowrite --data '...'`

---

**Last Updated**: 2026-01-21
**Version**: 1.0.0
**Status**: Ready for implementation
