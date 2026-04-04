---
name: add server command to rd3:tasks
description: add server command to rd3:tasks
status: Done
created_at: 2026-04-02T18:51:10.245Z
updated_at: 2026-04-02T18:51:10.245Z
folder: docs/tasks2
type: task
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0317. Add `server` command to rd3:tasks

### Background

The `tasks` CLI is the sole interface for rd3 task management. All operations (create, list, update, show, check, put, get, tree, refresh, batch-create, config) run as one-shot CLI invocations that read/write markdown files on disk.

This works well for single-agent workflows. For **multi-agent teams** (pi teams, ACP sessions, orchestration pipelines) and **external tool integration** (IDE extensions, MCP servers, dashboards), the CLI-only approach has friction:

1. **Process spawn overhead** — every task operation forks a new process, parses CLI args, reads config, and exits. In a multi-agent session doing 50+ task operations, this adds latency.
2. **No shared in-memory state** — each CLI invocation re-reads config and scans folders independently. No caching or watch-based incremental updates.
3. **No event feed** — agents can't be notified when another agent changes a task's status. They must poll via `tasks list`.
4. **No remote access** — agents running in separate processes/machines can't reach task state without filesystem access.

Adding an HTTP server mode addresses all four gaps while keeping the CLI as the primary interface.

### Requirements

#### FR-1: `tasks server` subcommand

- `tasks server` starts a long-running HTTP server exposing all existing task operations as REST endpoints.
- The server reuses the same command implementations (no logic duplication).
- Default port: `3456`. Configurable via `--port <number>` flag and `TASKS_PORT` environment variable.
- Binds to `127.0.0.1` only by default. Configurable via `--host <addr>`.
- Graceful shutdown on `SIGINT` / `SIGTERM`.
- Startup banner prints the listening address.

#### FR-2: REST API surface

Map existing CLI commands to RESTful endpoints. Every endpoint returns JSON (`{ ok: true, data: ... }` or `{ ok: false, error: "..." }`) matching the existing `--json` output format.

| Method | Path | CLI Equivalent | Notes |
|--------|------|----------------|-------|
| `GET` | `/tasks` | `tasks list` | Query params: `status`, `folder`, `all` |
| `POST` | `/tasks` | `tasks create` | JSON body with name + optional fields |
| `GET` | `/tasks/:wbs` | `tasks show` | — |
| `PATCH` | `/tasks/:wbs` | `tasks update` | JSON body: status, section+fromFile, phase+phaseStatus, field+value |
| `DELETE` | `/tasks/:wbs` | `tasks update <wbs> Canceled` | Soft-delete via status transition |
| `POST` | `/tasks/:wbs/artifacts` | `tasks put` | Multipart form upload |
| `GET` | `/tasks/:wbs/artifacts` | `tasks get` | Query param: `artifactType` |
| `GET` | `/tasks/:wbs/tree` | `tasks tree` | — |
| `GET` | `/tasks/:wbs/check` | `tasks check` | — |
| `POST` | `/tasks/batch-create` | `tasks batch-create` | JSON body: items array |
| `POST` | `/tasks/refresh` | `tasks refresh` | — |
| `GET` | `/config` | `tasks config` | — |
| `PATCH` | `/config` | `tasks config set-active / add-folder` | JSON body |
| `GET` | `/health` | (new) | Returns `{ ok: true, uptime }` |

#### FR-3: Section update via file content

`PATCH /tasks/:wbs` with `{ section, content }` writes the content to a temp file, then delegates to the existing `updateTask()` with `fromFile`. This avoids forcing callers to manage temp files.

#### FR-4: Event stream (SSE)

- `GET /events` exposes a Server-Sent Events endpoint.
- Emits events when tasks are created, updated, or deleted by any HTTP request.
- Event payload: `{ type: "created"|"updated"|"deleted", wbs, status, timestamp }`.
- Optional query param `?status=WIP` filters events by the task's resulting status.
- This enables agents to subscribe to task changes without polling.

#### FR-5: No new runtime dependencies

- Use `Bun.serve()` for the HTTP server. No Fastify, Express, or Hono.
- Continue using only the existing `yaml` dependency.
- Route matching via a simple path parser (no external router).

#### NFR-1: Startup time

- Server must be ready to accept connections within 500ms of invocation.
- Config and folder scanning happen on first request, not at startup (lazy init).

#### NFR-2: Thread safety

- The underlying file operations are not concurrent-safe by nature (markdown files on disk). The server serializes writes per-WBS using an in-memory lock map.
- Concurrent reads are safe (no lock needed).

#### NFR-3: Testability

- All route handlers are plain functions that receive `(projectRoot, request) => Response`.
- Testable without starting the actual HTTP server (direct function invocation in tests).
- Existing CLI tests remain untouched.

#### NFR-4: Backward compatibility

- The `server` command is additive. No existing CLI commands, flags, or behavior change.
- SKILL.md gains a new "Server Mode" section.
- `tasks.ts` help text includes `server` in the command list.

### Q&A

Test Q&A content

### Design

<!-- To be filled during design phase -->

### Solution

Add a `server` subcommand to the `tasks` CLI that starts a long-running HTTP server using `Bun.serve()`. The server exposes all existing task operations as REST endpoints, plus an SSE event stream for real-time change notifications.

**Architecture:**

```
tasks.ts (CLI entry)
  └─ case 'server' → server.ts
       └─ Bun.serve({ fetch: router })
            └─ router.ts — path-based dispatch
                 ├─ routeHandlers.ts — pure (projectRoot, request) => Response functions
                 │    └─ delegates to existing command modules (createTask, updateTask, etc.)
                 ├─ sse.ts — SSE emitter for task change events
                 └─ writeLock.ts — per-WBS write serialization map
```

**Key decisions:**

1. **No framework** — `Bun.serve()` + hand-rolled router. The route surface is small (14 endpoints), a dependency would be overkill.
2. **Route handlers as pure functions** — each handler receives `(projectRoot, request)` and returns `Response`. Testable without starting a server.
3. **Reuse existing commands** — `routeHandlers.ts` imports and calls `createTask()`, `updateTask()`, `listTasks()`, etc. directly. No logic duplication.
4. **SSE via `GET /events`** — a simple `EventSource`-compatible stream. The `sse.ts` module maintains a `Set<Response>` of active connections and broadcasts on every mutating request.
5. **Per-WBS write locks** — a `Map<string, Promise<void>>` that serializes concurrent writes to the same task file. Reads are lock-free.
6. **Section content via body** — `PATCH /tasks/:wbs` accepts `{ section, content }`. The handler writes content to a temp file via `Bun.file()` and delegates to the existing `updateTask()` with `fromFile`.
7. **Multipart artifact upload** — `POST /tasks/:wbs/artifacts` uses Bun's built-in `Request.formData()` parsing.

**New files:**

| File | Purpose | ~Lines |
|------|---------|--------|
| `scripts/commands/server.ts` | `Bun.serve()` bootstrap, args, signal handling | ~80 |
| `scripts/server/router.ts` | Path + method matching → handler dispatch | ~100 |
| `scripts/server/routeHandlers.ts` | Pure handler functions for all 14 endpoints | ~300 |
| `scripts/server/sse.ts` | SSE connection management + broadcast | ~60 |
| `scripts/server/writeLock.ts` | Per-WBS mutex map | ~30 |
| `scripts/server/types.ts` | Shared server types (request/response) | ~30 |

**Modified files:**

| File | Change |
|------|--------|
| `scripts/tasks.ts` | Add `server` case to command switch + help text |
| `SKILL.md` | Add "Server Mode" section |

No changes to existing command modules (`create.ts`, `update.ts`, `list.ts`, etc.) or types.


### Plan

<!-- To be filled during implementation phase -->

### Review

<!-- To be filled during review phase -->

### Testing

<!-- To be filled during testing phase -->

### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References

- [rd3:tasks SKILL.md](plugins/rd3/skills/tasks/SKILL.md) — existing CLI documentation
- [tasks.ts CLI entry point](plugins/rd3/skills/tasks/scripts/tasks.ts) — command dispatcher
- [types.ts](plugins/rd3/skills/tasks/scripts/types.ts) — shared types
- [workflows.md](plugins/rd3/skills/tasks/references/workflows.md) — canonical lifecycle operations
- [Bun.serve() API](https://bun.sh/docs/api/http) — native HTTP server


