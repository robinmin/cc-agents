---
name: refactor-tasks-py-into-modular-architecture
description: "Phase 4: Refactor monolithic tasks.py (1491 lines) into modular architecture with separate concerns"
status: Done
created_at: 2026-02-09 16:13:41
updated_at: 2026-02-10 09:03:13
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
dependencies: [0178]
tags: [tasks-enhancement, refactoring, architecture]
---

## 0179. refactor-tasks-py-into-modular-architecture

### Background

The `tasks.py` file has grown to 1491 lines as a monolithic script containing all task management logic. It includes CLI argument parsing, file operations, frontmatter parsing, kanban board generation, TodoWrite sync, promotion engine, and more — all in a single file. This makes it difficult to maintain, test, and extend.

The `rd2:super-architect` recommended splitting this into a modular package structure, especially after Phases 1-3 add significant new functionality (validation engine, TaskBackendPort, batch creation, etc.).

### Requirements

**Functional Requirements:**

1. **Split `tasks.py` into a package**:
   - `tasks/` directory with `__init__.py` and `__main__.py`
   - Separate modules for distinct concerns
   - Entry point preserved: `python tasks/` works same as `python tasks.py`

2. **Module breakdown**:
   - `models.py` — TaskStatus, TaskFile, ValidationResult, TaskEntry dataclasses
   - `config.py` — TasksConfig, git root detection, path management
   - `frontmatter.py` — YAML frontmatter parsing, writing, impl_progress management
   - `validation.py` — Tiered validation engine (from Phase 1b)
   - `backend.py` — TaskBackendPort, NativeTaskBackend, TodoWriteBackend (from Phase 2)
   - `kanban.py` — Kanban board generation and refresh
   - `manager.py` — TasksManager with high-level operations (create, update, list, etc.)
   - `cli.py` — Argument parsing and CLI entry point
   - `batch.py` — Batch creation and agent output parsing (from Phase 3)

3. **Preserve all functionality**:
   - All existing CLI commands work identically
   - All existing tests pass without modification
   - No behavioral changes — pure structural refactoring

4. **Add observability features**:
   - `tasks health` — Report overall task system health (orphan files, stale WIP, validation summary)
   - `tasks metrics` — Quick stats (total tasks, by status, by phase)
   - Structured logging for debugging

**Acceptance Criteria:**
- [ ] `tasks.py` replaced with `tasks/` package
- [ ] All existing CLI commands work identically
- [ ] All existing tests pass
- [ ] Each module has clear single responsibility
- [ ] `tasks health` reports system health
- [ ] `tasks metrics` reports quick stats
- [ ] No behavioral changes from user perspective

### Q&A

**Q:** Should we keep a `tasks.py` shim for backward compatibility?
**A:** Yes, keep `tasks.py` as a thin shim that imports and runs from `tasks/`. This preserves all existing references.

**Q:** What about the `scripts/` directory structure?
**A:** Transform `plugins/rd2/skills/tasks/scripts/tasks.py` into `plugins/rd2/skills/tasks/scripts/tasks/` package. The shim file `scripts/tasks.py` delegates to `scripts/tasks/__main__.py`.

### Design

**Proposed Package Structure:**
```
plugins/rd2/skills/tasks/scripts/
├── tasks.py              # Shim: from tasks import main; main()
└── tasks/
    ├── __init__.py       # Package exports
    ├── __main__.py       # Entry point
    ├── cli.py            # Argument parsing
    ├── config.py         # Configuration and paths
    ├── models.py         # Data classes
    ├── frontmatter.py    # YAML operations
    ├── validation.py     # Tiered validation
    ├── backend.py        # TaskBackendPort implementations
    ├── kanban.py         # Kanban board generation
    ├── batch.py          # Batch creation
    └── manager.py        # TasksManager operations
```

**Module Dependency Graph:**
```
cli.py → manager.py → {frontmatter.py, validation.py, backend.py, kanban.py, batch.py}
                    → models.py, config.py (shared by all)
```

### Plan

1. **Create package structure**
   - [ ] Create `scripts/tasks/` directory
   - [ ] Create `__init__.py` and `__main__.py`
   - [ ] Create shim `scripts/tasks.py` (backward compat)

2. **Extract models and config**
   - [ ] Move TaskStatus, TaskFile, ValidationResult to `models.py`
   - [ ] Move TasksConfig to `config.py`
   - [ ] Update imports throughout

3. **Extract frontmatter operations**
   - [ ] Move YAML parsing, writing to `frontmatter.py`
   - [ ] Move impl_progress management
   - [ ] Move template rendering

4. **Extract validation engine**
   - [ ] Move validation logic to `validation.py`
   - [ ] Include tiered validation from Phase 1b

5. **Extract backend and sync**
   - [ ] Move TaskBackendPort to `backend.py`
   - [ ] Move NativeTaskBackend, TodoWriteBackend
   - [ ] Move simplified sync logic

6. **Extract kanban and batch**
   - [ ] Move kanban generation to `kanban.py`
   - [ ] Move batch creation to `batch.py`

7. **Extract manager and CLI**
   - [ ] Move TasksManager to `manager.py`
   - [ ] Move CLI argument parsing to `cli.py`
   - [ ] Wire up `__main__.py` entry point

8. **Add observability**
   - [ ] Implement `tasks health` command
   - [ ] Implement `tasks metrics` command
   - [ ] Add structured logging

9. **Test and verify**
   - [ ] Run all existing tests
   - [ ] Verify all CLI commands work identically
   - [ ] Test backward compatibility via shim

### Artifacts

| Type | Path | Generated By | Date |
|------|------|--------------|------|

### References

- Current monolith: `plugins/rd2/skills/tasks/scripts/tasks.py` (1491 lines)
- Dependencies: 0178 (batch creation must exist before extracting to module)
- super-architect recommendation: modular package structure
