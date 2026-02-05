---
wbs: "0001"
topic: "rd2:tasks Agent Skill Upgrade"
status: "pending"
priority: "high"
created: "2026-02-02"
updated: "2026-02-02"
owner: "rd2:super-coder"
---

# rd2:tasks Agent Skill Upgrade Task

## Background

The `rd2:tasks` agent skill is a CLI-based task management tool for Claude Code that provides file-based task tracking with Work Breakdown Structure (WBS) numbering. Currently, it relies on Claude Code's `TodoWrite` tool for synchronization with the Claude Code session.

### Current Architecture

```
rd2:tasks CLI
    │
    ├── Task Files (docs/prompts/{WBS}_{topic}.md)
    │
    ├── TodoWrite Sync Layer
    │       └── Translates to Claude Code's Todo System
    │
    └── Kanban Board Sync
            └── External task board integration
```

### Current Limitations

1. **No dedicated Task tools**: Uses TodoWrite for all operations
2. **No explicit dependency tracking**: Cannot express task dependencies
3. **Single-point-of-failure**: If TodoWrite fails, entire sync breaks
4. **No task-level operations**: Must manipulate entire list at once
5. **ID management issues**: No persistent task IDs across sessions

### New Claude Code Task System Capabilities

Claude Code v2.1.16+ provides:
- **TaskList**: Query active tasks without modification
- **TaskGet**: Retrieve specific task details by ID
- **TaskUpdate**: Update or delete individual tasks
- **Dependency tracking**: Tasks can reference other tasks
- **Persistent IDs**: Task IDs survive session boundaries

## Requirements

### Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR1 | Support TaskList for reading tasks | HIGH | - |
| FR2 | Support TaskGet for single task details | HIGH | - |
| FR3 | Support TaskUpdate for modifications | HIGH | - |
| FR4 | Implement dependency tracking in WBS | MEDIUM | - |
| FR5 | Maintain backward compatibility with TodoWrite | HIGH | - |
| FR6 | Auto-detection of available tools | MEDIUM | - |
| FR7 | Graceful fallback when new tools unavailable | HIGH | - |
| FR8 | Support task deletion via TaskUpdate | MEDIUM | - |
| FR9 | Preserve file-based task format | HIGH | - |
| FR10 | Maintain kanban board sync capability | MEDIUM | - |

### Non-Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| NFR1 | Performance: Task operations < 500ms | LOW | - |
| NFR2 | Reliability: 99.9% operation success | HIGH | - |
| NFR3 | Usability: Clear error messages | MEDIUM | - |
| NFR4 | Maintainability: Clean separation of concerns | HIGH | - |
| NFR5 | Testability: Unit tests for core functions | HIGH | - |

## Design

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    rd2:tasks Agent Skill                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    ┌─────────────────────────────────┐    │
│  │ User Input  │───>│  Command Router                  │    │
│  │ (CLI/API)   │    │  - rd2:tasks create             │    │
│  └─────────────┘    │  - rd2:tasks list                │    │
│                     │  - rd2:tasks update              │    │
│                     │  - rd2:tasks refresh             │    │
│                     └────────────┬──────────────────────┘    │
│                                  │                           │
│                                  ▼                           │
│                     ┌─────────────────────────────┐         │
│                     │  Tool Abstraction Layer      │         │
│                     │  - ToolSelector              │         │
│                     │  - CompatibilityChecker      │         │
│                     └────────────┬──────────────────┘         │
│                                  │                           │
│                    ┌─────────────┼─────────────┐             │
│                    ▼             ▼             ▼             │
│           ┌──────────────┐ ┌──────────────┐ ┌────────────┐  │
│           │ TodoWrite    │ │ TaskList     │ │ TaskGet    │  │
│           │ Adapter      │ │ Adapter      │ │ Adapter    │  │
│           └──────┬───────┘ └──────┬───────┘ └─────┬──────┘  │
│                  │                │                │         │
│           ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐  │
│           │ TaskUpdate  │  │ File System │  │ Kanban      │  │
│           │ Adapter     │  │ Adapter     │  │ Adapter     │  │
│           └──────┬──────┘  └─────────────┘  └─────────────┘  │
│                  │                                              │
│                  ▼                                              │
│           ┌─────────────────────────────────┐                  │
│           │  Claude Code Session            │                  │
│           │  - TaskList                     │                  │
│           │  - TaskGet                      │                  │
│           │  - TaskUpdate                   │                  │
│           │  - TodoWrite (fallback)         │                  │
│           └─────────────────────────────────┘                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Component Specifications

#### 1. Tool Abstraction Layer

```typescript
interface ToolAdapter {
  name: string;
  isAvailable(): Promise<boolean>;
  listTasks(): Promise<Task[]>;
  getTask(id: string): Promise<Task | null>;
  updateTask(id: string, updates: TaskUpdates): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  // Note: Claude Code's TaskUpdate is used for both creating and updating tasks
  // Create is done by calling update with a new task object
}

class TaskListAdapter implements ToolAdapter {
  name = 'TaskList';
  async isAvailable(): Promise<boolean> {
    // Test if TaskList tool is available
    try {
      await TaskList();
      return true;
    } catch {
      return false;
    }
  }
  // ... other implementations
}
```

#### 2. Compatibility Checker

```typescript
class CompatibilityChecker {
  async checkToolAvailability(): Promise<ToolAvailability> {
    const results = await Promise.all([
      this.checkTool('TaskList'),
      this.checkTool('TaskGet'),
      this.checkTool('TaskUpdate'),
      this.checkTool('TodoWrite')
    ]);

    return {
      hasNewTools: results.slice(0, 3).every(r => r),
      hasTodoWrite: results[3],
      preferredTool: results.slice(0, 3).every(r => r) ? 'new' : 'legacy'
    };
  }

  private async checkTool(name: string): Promise<boolean> {
    // Implementation to check if tool exists and works
  }
}
```

#### 3. WBS with Dependencies

```typescript
interface TaskFile {
  wbs: string;           // "0001", "0001.001", etc.
  topic: string;
  subject: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  activeForm?: string;
  dependencies?: string[];  // WBS numbers of dependent tasks
  metadata?: {
    created: string;
    updated: string;
    owner?: string;
    priority?: string;
  };
}
```

### File Format

```markdown
---
wbs: "0001"
topic: "rd2:tasks-upgrade"
subject: "Upgrade rd2:tasks to use new Task tools"
description: "Migrate from TodoWrite to TaskList/TaskGet/TaskUpdate"
status: "pending"
activeForm: "Upgrading rd2:tasks to use new Task tools"
dependencies: ["0002", "0003"]
metadata:
  created: "2026-02-02"
  updated: "2026-02-02"
  owner: "rd2:super-coder"
  priority: "high"
---

# Task Details

## Background
...

## Requirements
...

## Design
...

## Implementation Notes
...
```

### Command Mappings

| Command | Old Behavior | New Behavior |
|---------|--------------|--------------|
| `rd2:tasks create` | Write file + TodoWrite sync | Write file + TaskUpdate create |
| `rd2:tasks list` | Read files + display | Read files + TaskList sync |
| `rd2:tasks update` | Update file + TodoWrite | Update file + TaskUpdate |
| `rd2:tasks refresh` | Full sync | Full sync with tool auto-detection |

## Implementation Plan

### Phase 1: Foundation (Tasks 0001-0005)

| WBS | Task | Description | Duration |
|-----|------|-------------|----------|
| 0001 | Tool Abstraction Layer | Create ToolSelector and adapters | 30 min |
| 0002 | Compatibility Checker | Implement version detection | 15 min |
| 0003 | TaskList Adapter | Implement TaskList integration | 20 min |
| 0004 | TaskGet Adapter | Implement TaskGet integration | 15 min |
| 0005 | TaskUpdate Adapter | Implement TaskUpdate integration | 25 min |

### Phase 2: Core Features (Tasks 0006-0010)

| WBS | Task | Description | Duration |
|-----|------|-------------|----------|
| 0006 | WBS Dependency Support | Add dependency field to task files | 20 min |
| 0007 | Command Router Update | Update CLI to use adapters | 30 min |
| 0008 | Error Handling Layer | Implement fallback and error recovery | 25 min |
| 0009 | Backward Compatibility | Ensure TodoWrite fallback works | 30 min |
| 0010 | Unit Tests - Adapters | Test all adapter implementations | 45 min |

### Phase 3: Integration (Tasks 0011-0015)

| WBS | Task | Description | Duration |
|-----|------|-------------|----------|
| 0011 | Integration Tests | Test full command flows | 45 min |
| 0012 | Documentation Update | Update SKILL.md and examples | 30 min |
| 0013 | Performance Testing | Verify < 500ms operations | 20 min |
| 0014 | Edge Case Testing | Test failure scenarios | 30 min |
| 0015 | Final Review | Code review and quality check | 30 min |

## Dependencies

### External Dependencies

1. **Claude Code v2.1.16+**: Required for new Task tools
2. **Node.js 18+**: For TypeScript execution
3. **TypeScript 5.x**: For type safety

### Internal Dependencies

| From Task | To Task | Dependency Type |
|-----------|---------|-----------------|
| 0001 | 0003 | Required |
| 0001 | 0004 | Required |
| 0001 | 0005 | Required |
| 0002 | 0006 | Required |
| 0003-0005 | 0007 | Required |
| 0007 | 0008 | Required |
| 0008 | 0009 | Required |
| 0006-0009 | 0010 | Required |
| 0010 | 0011 | Required |

## Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| New tools unavailable in some environments | HIGH | LOW | Always fall back to TodoWrite |
| Performance regression with new adapters | MEDIUM | LOW | Test and optimize hot paths |
| Breaking changes in future Claude Code versions | MEDIUM | MEDIUM | Version detection and adapter pattern |
| Task ID mismatch between file and Claude Code | MEDIUM | LOW | Use WBS as canonical ID, sync on changes |

## Testing Strategy

### Unit Tests

```typescript
describe('Tool Adapter', () => {
  describe('TaskListAdapter', () => {
    it('should return empty array when no tasks', async () => {
      // Mock TaskList returning empty
      // Expect empty array
    });

    it('should return tasks with correct structure', async () => {
      // Mock TaskList returning tasks
      // Expect properly formatted Task[]
    });

    it('should throw on tool unavailable', async () => {
      // Mock TaskList throwing
      // Expect AdapterError
    });
  });
});
```

### Integration Tests

```typescript
describe('rd2:tasks Commands', () => {
  it('should create task with new tools', async () => {
    // Setup: Clean environment
    // Execute: rd2:tasks create "Test Task"
    // Verify: File created, TaskUpdate called
  });

  it('should fallback to TodoWrite when new tools unavailable', async () => {
    // Setup: Mock new tools unavailable
    // Execute: rd2:tasks create "Test Task"
    // Verify: TodoWrite called instead
  });

  it('should sync correctly after session resume', async () => {
    // Setup: Create tasks, end session
    // Execute: Resume, rd2:tasks refresh
    // Verify: Tasks synced correctly
  });
});
```

## Acceptance Criteria

- [ ] Tool abstraction layer implemented with all adapters
- [ ] Compatibility checker correctly detects tool availability
- [ ] All commands work with new tools when available
- [ ] Fallback to TodoWrite works when new tools unavailable
- [ ] Dependency tracking implemented in WBS format
- [ ] All unit tests pass (>90% coverage)
- [ ] All integration tests pass
- [ ] Documentation updated with new architecture
- [ ] Performance meets requirements (<500ms per operation)

## References

- [Todo Lists - Claude Code SDK](https://docs.claude.com/en/docs/claude-code/sdk/todo-tracking)
- [TypeScript SDK Reference](https://docs.claude.com/en/docs/claude-code/sdk/sdk-typescript)
- Claude Code v2.1.16-2.1.21 Release Notes

## Notes

### Implementation Notes

1. **Tool Auto-Detection**: The system should check for tool availability on initialization and prefer new tools when available.

2. **WBS as Canonical ID**: Use WBS number as the primary identifier in task files, mapping to Claude Code task IDs internally.

3. **Sync Strategy**: Two-way sync between file system (source of truth) and Claude Code session (display).

4. **Error Recovery**: On failure, log error, continue with remaining tasks, provide summary at end.

### Open Questions

1. Should we implement a daemon mode for real-time sync?
2. How to handle concurrent sessions modifying the same task file?
3. Should we add support for task templates?

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-02 | 1.0 | Initial task file creation |
