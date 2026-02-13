---
name: demote-todowrite-to-notification-layer
description: "Phase 2: Demote TodoWrite from sync mechanism to notification-only layer, add impl_progress auto-mapping"
status: Done
created_at: 2026-02-09 16:13:36
updated_at: 2026-02-10 09:03:13
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
dependencies: [0181]
tags: [tasks-enhancement, todowrite, architecture]
---

## 0182. demote-todowrite-to-notification-layer

### Background

The current `rd2:tasks` skill deeply integrates with the legacy TodoWrite tool for bidirectional synchronization. Claude Code has evolved to use TaskCreate/TaskList/TaskGet/TaskUpdate natively, making the TodoWrite integration increasingly fragile and complex. The PromotionEngine and SyncOrchestrator components add significant complexity to maintain bidirectional sync that often breaks.

Both `rd2:super-brain` and `rd2:super-architect` recommended demoting TodoWrite to a one-way notification layer: task file changes push to TodoWrite/TaskCreate for UI display, but TodoWrite changes no longer flow back to task files. This simplifies the architecture significantly.

Additionally, `impl_progress` phase tracking should automatically drive task status. When all phases are `completed`, the task status should auto-advance. When any phase is `blocked`, status should reflect that.

### Requirements

**Functional Requirements:**

1. **Demote TodoWrite to notification-only**:
   - Task files remain the single source of truth
   - `tasks update` pushes status to TaskCreate/TaskUpdate for UI display
   - Remove reverse sync: TodoWrite/TaskUpdate changes no longer flow back to task files
   - Remove or simplify PromotionEngine (no longer auto-promoting TodoWrite items)
   - Simplify SyncOrchestrator to one-way push only

2. **Use native Task tools where available**:
   - Detect Claude Code environment (TaskCreate/TaskList available vs TodoWrite only)
   - If native Task tools available: use TaskCreate/TaskUpdate for UI notifications
   - If only TodoWrite available: use TodoWrite as fallback
   - Abstract behind `TaskBackendPort` interface

3. **impl_progress auto-mapping**:
   - When impl_progress changes, automatically compute task status:
     - Any phase `in_progress` → Task status: WIP
     - All phases `completed` → Task status: Done
     - Any phase `blocked` → Task status: Blocked
   - `tasks update` accepts `--phase <phase_name> <status>` to update impl_progress
   - Phase updates trigger automatic status computation

4. **Session reconciliation on resume**:
   - On session start, reconcile task file states with in-memory task list
   - Push current file-based state to UI (TaskCreate/TodoWrite)
   - No reverse sync needed

**Acceptance Criteria:**
- [ ] Task files are the single source of truth (no reverse sync from TodoWrite)
- [ ] `tasks update 0180 --phase implementation completed` updates impl_progress and auto-computes status
- [ ] All phases completed → status automatically becomes Done
- [ ] PromotionEngine removed or reduced to minimal functionality
- [ ] SyncOrchestrator simplified to one-way push
- [ ] TaskBackendPort interface abstracts notification layer
- [ ] Backward compatible with environments that only have TodoWrite

### Q&A

[Clarifications added during planning phase]

### Design

**TaskBackendPort Interface (conceptual):**
```python
class TaskBackendPort:
    def notify_task_created(self, task: TaskFile) -> None: ...
    def notify_task_updated(self, task: TaskFile, old_status: str) -> None: ...
    def notify_task_deleted(self, wbs: str) -> None: ...
    def push_all_tasks(self, tasks: list[TaskFile]) -> None: ...

class NativeTaskBackend(TaskBackendPort):
    """Uses TaskCreate/TaskUpdate for Claude Code native task system"""

class TodoWriteBackend(TaskBackendPort):
    """Fallback: Uses TodoWrite for legacy environments"""
```

**Auto-Status Computation:**
```
impl_progress phases → computed status:
  all pending → Backlog
  any in_progress → WIP
  any blocked → Blocked
  all completed → Done
  mixed completed/pending → WIP (some work done)
```

### Plan

1. **Create TaskBackendPort abstraction**
   - [ ] Define abstract interface for task notifications
   - [ ] Implement NativeTaskBackend (TaskCreate/TaskUpdate)
   - [ ] Implement TodoWriteBackend (legacy fallback)
   - [ ] Add environment detection to select backend

2. **Simplify sync architecture**
   - [ ] Remove reverse sync from SyncOrchestrator
   - [ ] Remove or simplify PromotionEngine
   - [ ] Convert all sync points to one-way push (file → UI)
   - [ ] Remove session_map.json dependency for reverse sync

3. **Implement impl_progress auto-mapping**
   - [ ] Add `--phase` flag to `tasks update`
   - [ ] Implement auto-status computation logic
   - [ ] Update frontmatter writer to handle impl_progress updates
   - [ ] Add phase validation (valid phase names, valid status values)

4. **Session reconciliation**
   - [ ] On session start, read all task files
   - [ ] Push current state to selected backend
   - [ ] Remove stale entries from UI that no longer have task files

5. **Test and migrate**
   - [ ] Unit tests for TaskBackendPort implementations
   - [ ] Integration tests for auto-status computation
   - [ ] Update SKILL.md documentation
   - [ ] Update rd2:task-workflow skill references

### Artifacts

| Type | Path | Generated By | Date |
|------|------|--------------|------|

### References

- TodoWrite evolution article: `/Users/robin/tcc/repo/collections/agentic_coding/claude-code-todo-or-task-system-evolution/6-publish/article_en.md`
- Current sync code: `plugins/rd2/skills/tasks/scripts/tasks.py` (PromotionEngine, SyncOrchestrator)
- rd2:task-workflow skill: `plugins/rd2/skills/task-workflow/SKILL.md`
- Dependencies: 0181 (validation must exist before changing sync architecture)
