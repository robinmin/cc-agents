---
name: Enhance the common library
description: Enhance the common library
status: Done
created_at: 2026-04-07T21:30:41.770Z
updated_at: 2026-04-09T18:05:00.000Z
folder: docs/tasks2
type: task
impl_progress:
  planning: done
  design: done
  implementation: done
  review: done
  testing: done
---

## 0365. Enhance the common library

### Background

The cc-agents project has accumulated several utility scripts with inconsistent patterns:

1. **Logger**: `plugins/rd3/scripts/logger.ts` currently supports console output but lacks file rotation/persistence needed for web/API server deployments.
2. **File System**: Multiple access patterns exist (`Bun.file`, `node:fs`) creating coupling to specific runtimes and hindering cross-platform portability.

With the shift toward running agents in web/API server contexts, these inconsistencies need addressing to support production deployments.


### Requirements

### 1. Logger Enhancement

The logger in `plugins/rd3/scripts/logger.ts` must support file-based logging:

| Requirement | Description |
|------------|-------------|
| File appender | Write logs to a file in addition to stdout |
| Log levels | Support: DEBUG, INFO, WARN, ERROR |
| Configurable output | Toggle console/file via environment or config |
| Timestamp | Include ISO 8601 timestamps |
| Rotation | Daily log files with optional retention |
| Async writes | Non-blocking file I/O |

**Acceptance Criteria:**
- [ ] `logger.info()` writes to both console and file when file logging enabled
- [ ] Log file path configurable via `LOG_DIR` env var or config
- [ ] Each log entry contains: timestamp, level, message, optional context
- [ ] Web server can run without blocking on log writes

### 2. File System Abstraction Layer

Create `plugins/rd3/scripts/fs.ts` with an abstract FS interface:

| Requirement | Description |
|------------|-------------|
| Abstract interface | Define `FileSystem` interface with common operations |
| Bun.js adaptor | Implement `BunFileSystemAdapter` using `bun:fs` |
| Common API | `readFile`, `writeFile`, `exists`, `readDir`, `mkdir`, `remove` |
| Consistent signatures | All methods return typed results |
| Error handling | Custom `FsError` class with path and cause |

**Acceptance Criteria:**
- [ ] `FileSystem` interface defines all public methods with TypeScript types
- [ ] `BunFileSystemAdapter` implements the interface using `bun:fs` primitives
- [ ] Existing scripts in `plugins/rd3/scripts/` refactored to use the abstraction
- [ ] No direct imports of `node:fs` or `Bun.file` in new code
- [ ] `bun run check` passes after refactoring

### 3. Migration Strategy

| Phase | Scope |
|-------|-------|
| Phase 1 | Logger enhancement (standalone) |
| Phase 2 | FS abstraction layer (interface + Bun adapter) |
| Phase 3 | Migrate `plugins/rd3/scripts/*.ts` to use FS abstraction |
| Phase 4 | Migrate `plugins/rd3/skills/*/scripts/*.ts` (if applicable) |


### Q&A

- Q: Does task `0365` require migrating every `plugins/rd3/skills/*/scripts/*.ts` file?
- A: No. The implementation followed the phased migration strategy. This task completed the common library and root `plugins/rd3/scripts/*.ts` migration surface; deeper skill-script migration remains optional follow-on work.



### Design

- Added a Bun-oriented filesystem abstraction in `plugins/rd3/scripts/fs.ts`:
  - `FileSystem` interface for async common operations
  - `BunFileSystemAdapter` for Bun-native file reads/writes with typed error wrapping
  - `FsError` for operation/path-aware failures
  - compatibility exports so root shared scripts can stop importing `node:fs` directly
- Enhanced `plugins/rd3/scripts/logger.ts` with:
  - async file appender support
  - env-driven configuration (`LOG_DIR`, `LOG_FILE_ENABLED`, `LOG_CONSOLE`, `LOG_FILENAME`, `LOG_DAILY_ROTATION`, `LOG_MAX_FILES`, `LOG_FILE_LEVEL`)
  - daily rotation with retention cleanup
  - unified console/file toggling without blocking writes
- Migrated relevant root common scripts to the new abstraction:
  - `best-practice-fixes.ts`
  - `evolution-engine.ts`
  - `utils.ts`
  - `libs/acpx-query.ts`



### Solution

- Implemented the required FS abstraction in `plugins/rd3/scripts/fs.ts`.
- Added regression-safe logger file configuration and fixed the file-appender rotation lifecycle so the appender remains writable after date rollover.
- Added focused tests covering:
  - logger env-based file routing
  - file-disable behavior
  - rotation-after-rollover behavior
  - Bun FS adapter contract and `FsError` wrapping
- Suppressed noisy stdout in file-appender logger tests so `bun run check` output remains clean.



### Plan

1. Compare task requirements against the current local implementation.
2. Fix logger drift:
   - `LOG_DIR` and related env configuration
   - rotation lifecycle bug
   - clean test output
3. Replace the initial `fs.ts` utility wrapper with the required abstraction layer.
4. Migrate root common scripts off direct `node:fs` imports to the shared FS module.
5. Verify with targeted tests, lint, typecheck, and repo gate.



### Review

- Requirement coverage review:
  - Logger enhancement: met
  - FS abstraction layer: met
  - Root common-script migration in `plugins/rd3/scripts/*.ts`: met
- Scope drift review:
  - No material drift found in the task implementation.
  - `bun run check` now passes after the unrelated `direct.ts` coverage gap was closed.



### Testing

- Passed:
  - `bun test plugins/rd3/scripts/fs.test.ts plugins/rd3/scripts/logger.test.ts plugins/rd3/tests/logger.test.ts`
  - `bun run typecheck`
  - `biome format --write` on changed files
  - `biome lint --write` on changed files
  - `bun run check`
- Repo gate status:
  - `bun run check` exits `0`.
- Acceptance criteria status:
  - [x] `logger.info()` writes to both console and file when file logging enabled
  - [x] Log file path configurable via `LOG_DIR` env var or config
  - [x] Each log entry contains timestamp, level, message, optional serialized context
  - [x] Web server can run without blocking on log writes
  - [x] `FileSystem` interface defines all public methods with TypeScript types
  - [x] `BunFileSystemAdapter` implements the interface with Bun-oriented primitives
  - [x] Existing scripts in `plugins/rd3/scripts/` were refactored to use the abstraction
  - [x] No direct imports of `node:fs` remain in migrated root common scripts
  - [x] `bun run check` passes after refactoring



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References
