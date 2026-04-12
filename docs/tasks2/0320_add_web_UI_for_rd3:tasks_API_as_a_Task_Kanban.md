---
name: add web UI for rd3tasks API as a Task Kanban
description: add web UI for rd3tasks API as a Task Kanban
status: Done
created_at: 2026-04-03T03:41:49.939Z
updated_at: 2026-04-03T17:15:00.000Z
folder: docs/tasks2
type: task
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
profile: standard
---

## 0320. add web UI for rd3:tasks API as a Task Kanban

### Background
The `rd3:tasks` CLI now exposes an HTTP server (task 0317) with a full REST API for task CRUD, SSE events, and kanban data. However, the only way to visualize tasks is through the terminal-based kanban output or direct CLI commands.

A web UI would provide:
1. **Visual kanban board** — drag-and-drop columns for the 7 statuses (Backlog, Todo, WIP, Testing, Blocked, Done, Canceled)
2. **Real-time updates** — SSE `/events` endpoint enables live status changes without page refresh
3. **Task detail view** — view task content and metadata in a side panel without touching markdown
4. **Multi-folder support** — switch between configured task folders via `/config` API
5. **Zero external backend** — the existing `tasks server` is the backend; the UI is a static SPA served from it

This task adds a React + shadcn/ui single-page application that consumes the existing REST API. Vite builds static assets committed to the repo — no separate frontend server needed in production.


### Requirements
#### FR-1: Static SPA served by tasks server

- The `tasks server` serves a single-page application from the root path `/`.
- Frontend is built with React + shadcn/ui + Vite into static assets committed to the repo.
- No separate frontend dev server needed in production — `tasks server` is the only process.

#### FR-2: Kanban board view

- Display a kanban board with columns matching the 7 task statuses: Backlog, Todo, WIP, Testing, Blocked, Done, Canceled.
- Each column shows task cards with WBS number, name, and status emoji.
- Tasks are fetched via `GET /tasks` and grouped by status client-side.
- Columns are ordered left-to-right following the canonical status flow (Backlog → Todo → WIP → Testing → Done; Blocked and Canceled as side columns or at the end).

#### FR-3: Drag-and-drop status transition

- Use `@hello-pangea/dnd` (maintained fork of react-beautiful-dnd) for production-grade kanban drag-and-drop.
- Users can drag a task card from one status column to another.
- Dropping triggers `PATCH /tasks/:wbs` with `{ status: "NewStatus" }`.
- The UI shows visual feedback during drag (ghost card, drop zone highlight).
- If the API returns an error (e.g., invalid transition), show the error and revert the card to its original column.

#### FR-4: Real-time updates via SSE

- On page load, connect to `GET /events` SSE endpoint.
- When a `created`, `updated`, or `deleted` event arrives, update the kanban board without full page reload.
- Handle reconnection gracefully (auto-reconnect on connection loss).
- Show a subtle indicator when SSE connection is lost.

#### FR-5: Task detail panel

- Clicking a task card opens a detail panel using shadcn/ui Sheet or Dialog component.
- Panel displays all frontmatter fields (name, status, created_at, updated_at, folder, type, profile, impl_progress, tags, dependencies).
- Panel renders markdown sections (Background, Requirements, Design, etc.) as rendered HTML using a lightweight markdown renderer.
- Impl progress shows a mini progress bar with phase icons.

#### FR-6: Task creation from UI

- A "New Task" button opens a creation form using shadcn/ui form components.
- Form requires `name` field; optional fields: background, requirements, solution, priority, tags.
- Submits via `POST /tasks` API.
- New task appears in the Backlog column immediately via SSE event.

#### FR-7: Inline status change (non-drag)

- Task detail panel includes a status dropdown (shadcn/ui Select) to change status without drag-and-drop.
- Also allow quick status changes via a context menu or button on the task card.

#### FR-8: Folder selector

- If multiple task folders are configured (via `GET /config`), show a dropdown/selector (shadcn/ui Select) to switch between them.
- Switching folders re-fetches tasks with the `?folder=` query param.

#### FR-9: Responsive design

- The UI works on desktop browsers (1280px+ wide) and is usable on tablets (768px+).
- On mobile, columns stack vertically or show a scrollable horizontal layout.

#### FR-10: Build toolchain

- React + shadcn/ui + Vite for development.
- shadcn/ui components are copy-pasted (owned code, not a runtime npm dependency).
- `@hello-pangea/dnd` for drag-and-drop.
- Build output: static files committed to `plugins/rd3/skills/tasks/scripts/static/`.
- Build command: `cd scripts/server/ui && bun run build` (Vite production build).
- Dev server: `cd scripts/server/ui && bun run dev` (Vite dev server with HMR).
- CSS via Tailwind CSS (shadcn/ui's standard approach).

#### NFR-1: Performance

- Initial page load under 500ms on localhost.
- Kanban board renders 100+ task cards without noticeable lag.
- SSE events reflect in the UI within 200ms of server emission.

#### NFR-2: Accessibility

- Keyboard-navigable (Tab through cards, Enter to open detail, Escape to close).
- shadcn/ui components ship with built-in Radix UI accessibility (ARIA, keyboard navigation).
- Status colors are not the only differentiator — use icons/labels too.
- Respects `prefers-color-scheme` for dark/light mode.

#### NFR-3: Security

- The UI connects to `localhost` only (matching server bind address).
- No external CDN dependencies in production build — all assets bundled by Vite.
- No user authentication required (local-only tool, same trust model as CLI).


### Q&A

**Q1: Where are the static frontend assets stored?**
A: Under `plugins/rd3/skills/tasks/scripts/static/` — Vite build output committed to the repo. Source code lives in `plugins/rd3/skills/tasks/scripts/server/ui/src/`.

**Q2: Which frontend framework?**
A: React + shadcn/ui + Vite. shadcn/ui components are owned code (copy-pasted), not a runtime npm dependency. Uses Tailwind CSS for styling and Radix UI primitives for accessibility.

**Q3: How does the server serve static files alongside the API?**
A: Add a static file handler in `router.ts` — serves `plugins/rd3/skills/tasks/scripts/static/index.html` at `/`, `plugins/rd3/skills/tasks/scripts/static/assets/*` at `/assets/*`. SPA fallback only at root `/`.

**Q4: Drag-and-drop implementation?**
A: `@hello-pangea/dnd` — maintained fork of react-beautiful-dnd. Production-grade kanban DnD with smooth animations, accessibility support, and well-tested API.

**Q5: Markdown rendering in the detail panel?**
A: Lightweight markdown-to-HTML library (e.g., `marked` or `react-markdown`) bundled by Vite. Render client-side from the `GET /tasks/:wbs` response.

**Q6: Should the UI support editing task sections?**
A: Not in v1. The initial UI is read-only for sections (display only) with write support limited to status changes and task creation. Section editing can be added later.

**Q7: Why not vanilla JS / Web Components?**
A: A polished kanban board requires significant UI work (DnD, modals, dropdowns, responsive layout, accessibility). React + shadcn/ui solves all of these with mature, well-tested components. The build output is still static files — no runtime difference.

**Q8: Does this add runtime dependencies to tasks server?**
A: No. The build output is static HTML/CSS/JS files. The npm packages (react, shadcn/ui, vite, tailwind, @hello-pangea/dnd) are devDependencies used only during `bun run build:ui`. The server just serves static files.


### Design



### Solution

Add a static web UI to the existing `tasks server` that renders a kanban board consuming the REST API.

**Architecture:**

```
scripts/
  ├─ static/                    Vite production build output (committed)
  │   ├─ index.html             UI entry point (served at /)
  │   └─ assets/               Bundled JS + CSS
  └─ server/
      └─ ui/                   Frontend source (separate build pipeline)
          ├─ src/              React components, hooks, API client
          ├─ vite.config.ts   Vite config → plugins/rd3/skills/tasks/scripts/static/
          └─ package.json     devDependencies only

tasks server (Bun.serve) — single process
  ├─ /                         → plugins/rd3/skills/tasks/scripts/static/index.html
  ├─ /assets/*                 → plugins/rd3/skills/tasks/scripts/static/assets/*
  └─ /tasks, /events, /health, /config  REST API
```

**Frontend stack:**
- React 19 + TypeScript
- shadcn/ui (Radix UI primitives + Tailwind CSS)
- @hello-pangea/dnd for kanban drag-and-drop
- Vite for production build
- Native EventSource API for SSE real-time updates

**Build:**
```bash
# Development (hot reload):
cd scripts/server/ui && bun run dev
# Vite dev server on :5173 proxies API to :3456

# Production build (outputs to plugins/rd3/skills/tasks/scripts/static/):
cd scripts/server/ui && bun run build

# Run (single server — API + UI on one port):
bun tasks server
# Open http://localhost:3456/
```

**Server changes:**
- `router.ts`: static handler serves `/` → `plugins/rd3/skills/tasks/scripts/static/index.html`, `/assets/*` → `plugins/rd3/skills/tasks/scripts/static/assets/*`
- SPA fallback only at root `/` — unknown API paths return JSON 404 (preserves existing test contracts)

**Plan:**
1. Fix broken `task-detail.tsx`
2. Configure Vite `base: "/"`, `outDir` → `plugins/rd3/skills/tasks/scripts/static/`
3. Update `router.ts` static handler
4. Install dependencies and build production bundle
5. Integration test

### Review
- Static file handler serves UI at `/`
- Backend persistence verified via `PATCH /tasks/:wbs` with `body` field
- `@uiw/react-md-editor` provides professional editing experience
- Task detail panel width optimized to `max-w-5xl`

### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |
| Build | `plugins/rd3/skills/tasks/scripts/static/` | Antigravity | 2026-04-03 |

### References
- [Task 0317: server command](0317_add_server_command_to_rd3:tasks.md)
- [server/router.ts](plugins/rd3/skills/tasks/scripts/server/router.ts)
- [server/routeHandlers.ts](plugins/rd3/skills/tasks/scripts/server/routeHandlers.ts)
- [server/ui/src/components/task-detail.tsx](plugins/rd3/skills/tasks/scripts/server/ui/src/components/task-detail.tsx)
