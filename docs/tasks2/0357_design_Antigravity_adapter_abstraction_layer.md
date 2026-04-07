---
name: design Antigravity adapter abstraction layer
description: design Antigravity adapter abstraction layer
status: Done
created_at: 2026-04-07T21:30:59.562Z
updated_at: 2026-04-07T21:30:59.562Z
folder: docs/tasks2
type: task
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0357. design Antigravity adapter abstraction layer

### Background

After investigating agy CLI and acpx source, need to design the Antigravity adapter interface. The adapter must conform to the existing acpx-query.ts interface contract so downstream consumers can switch backends via config only. Key considerations: agy wraps VS Code Electron, supports MCP servers, and has --add-mcp flag.

### Requirements

Design must include: (1) Interface defining exec, session, and health check methods matching AcpxQueryOptions/AcpxQueryResult, (2) Backend selector logic to route to acpx or agy based on config, (3) Error handling strategy for unsupported agy features, (4) Type definitions for AntigravityBackend enum. Output: design.md with interface definitions and rationale.

### Solution

**Architecture: Adapter Pattern with Backend Selection**

```
┌─────────────────────────────────────────────────────────────┐
│                     acpx-query.ts                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         Backend Selector (BACKEND env var)           │    │
│  └─────────────────────────────────────────────────────┘    │
│           │                           │                     │
│           ▼                           ▼                     │
│  ┌─────────────────┐       ┌─────────────────────┐       │
│  │   acpx Adapter   │       │   agy Adapter       │       │
│  │  (existing)     │       │  (new)              │       │
│  └─────────────────┘       └─────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

**Key Design Decisions:**

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend selection | `BACKEND=acpx\|antigravity` env var | Non-invasive, config-only switching |
| Default backend | `acpx` | Existing behavior preserved |
| Unsupported features | Return `{ ok: false, stderr: 'not supported by agy' }` | Graceful degradation |
| Binary path | `AGY_BIN` env var or `acpxBin` option | Flexible configuration |
| Interface | `AcpxQueryOptions` → `AcpxQueryResult` | Compatible with existing callers |

**New exports added to acpx-query.ts:**
- `Backend` type: `'acpx' | 'antigravity'`
- `getBackend()`: Returns current backend from `BACKEND` env var
- `buildAgyChatArgs()`: Builds `agy chat` command args
- `execAgyChat()`: Executes agy command synchronously
- `queryLlmAgy()`: LLM query via agy (mirrors `queryLlm`)
- `queryLlmFromFileAgy()`: File-based query via agy
- `runSlashCommandAgy()`: Returns "not supported" error
- `checkAgyHealth()`: Health check for agy availability
- `checkHealth()`: Unified health check for current backend
- `checkAllBackendsHealth()`: Health check for all backends
