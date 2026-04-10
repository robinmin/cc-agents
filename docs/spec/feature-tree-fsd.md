# Feature Tree (`ftree`) — Functional Specification v2.0

## 1. Overview

`ftree` is a CLI tool that manages **hierarchical feature trees** with automatic status roll-up and WBS (Work Breakdown Structure) task linking. Designed for AI agent workflows where features are decomposed into sub-features, linked to implementation tasks, and tracked through a state machine.

**Key design principle:** Thin CLI over embedded SQLite — no daemon, no HTTP server. The CLI opens the database, runs the operation, and exits. This matches agent execution patterns (stateless, one-shot commands) and eliminates process management complexity.

---

## 2. Technology Stack

| Component | Choice | Rationale |
|:---|:---|:---|
| Runtime | Bun (latest) | Project standard |
| Database | `bun:sqlite` (SQLite 3, WAL mode) | Zero-config, embedded, no daemon needed |
| Linter/Formatter | Biome | Project standard |
| ID Strategy | `cuid2` | Short, secure, collision-resistant, agent-friendly |
| Output | STDOUT (tree text or JSON via `--json` flag) | Dual-mode for human and agent consumption |

---

## 3. Database Schema

### 3.1 Table: `features`

| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| `id` | TEXT | PRIMARY KEY | cuid2 generated |
| `parent_id` | TEXT | REFERENCES features(id) ON DELETE CASCADE | Nullable (root node) |
| `title` | TEXT | NOT NULL | Human/agent-readable name |
| `status` | TEXT | NOT NULL DEFAULT 'backlog' | State machine value (see §4) |
| `metadata` | TEXT | DEFAULT '{}' | JSON string for agent-specific data |
| `depth` | INTEGER | NOT NULL DEFAULT 0 | Tree depth (0 = root) |
| `position` | INTEGER | NOT NULL DEFAULT 0 | Sort order within siblings |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last modification timestamp |

**Indexes:**
- `idx_features_parent` ON `features(parent_id)` — tree traversal
- `idx_features_status` ON `features(status)` — status queries

### 3.2 Table: `feature_wbs_links`

| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| `feature_id` | TEXT | REFERENCES features(id) ON DELETE CASCADE | Feature node |
| `wbs_id` | TEXT | NOT NULL | External task system ID |
| PRIMARY KEY | | `(feature_id, wbs_id)` | Prevent duplicate mapping |

**Index:** `idx_wbs_feature` ON `feature_wbs_links(wbs_id)` — reverse lookup

### 3.3 SQLite Triggers

**Auto-timestamp on update:**
```sql
CREATE TRIGGER IF NOT EXISTS feature_updated_at
AFTER UPDATE ON features
FOR EACH ROW
BEGIN
  UPDATE features SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
```

**Cascade delete children:**
```sql
-- SQLite CASCADE handles this via foreign key, but requires PRAGMA foreign_keys = ON
```

**Integrity:**
- `PRAGMA foreign_keys = ON` — enforced on every connection
- `PRAGMA journal_mode = WAL` — concurrent read safety
- `PRAGMA busy_timeout = 5000` — wait up to 5s on lock contention

---

## 4. State Machine

### 4.1 Valid Statuses

| Status | Description |
|:---|:---|
| `backlog` | Default. Feature exists but not yet designed. |
| `validated` | Design/sub-features confirmed by architect. |
| `executing` | Actively being implemented (has linked WBS tasks). |
| `done` | All linked WBS tasks and sub-features complete. |
| `blocked` | Manual flag — implementation stalled. |

### 4.2 Allowed Transitions

```
backlog   → validated, blocked
validated → executing, backlog, blocked
executing → done, blocked
blocked   → backlog, validated, executing
done      → blocked (regression)
```

**Rule:** Any status can transition to `blocked`. Blocked can resume to any prior status. Forward flow is linear except `done→blocked` for regression.

### 4.3 Status Roll-up Logic (Application-Level)

Roll-up is computed at query time, not via triggers, to avoid cascading side-effects:

- A feature's **effective status** is the worst-case among its children:
  - If any child is `blocked` → parent shows `blocked`
  - If any child is `executing` → parent shows `executing`
  - If all children are `done` → parent shows `done`
  - If any child is `validated` (rest done) → parent shows `validated`
  - If all children are `backlog` → parent shows `backlog`
- Roll-up is **display-only**. The stored status is set explicitly. The CLI shows `[stored → rollup]` when they differ.

**Rationale:** Triggers that auto-mutate parent status cause surprising side-effects for agents. Explicit control with advisory roll-up is safer.

### 4.4 Done Detection

A feature is eligible for `done` when:
1. All linked WBS tasks are marked complete (external check or manual confirmation), **AND**
2. All child features have status `done`.

The CLI provides `ftree check-done <id>` to verify eligibility without auto-transitioning.

---

## 5. CLI Commands

All commands follow the pattern: `ftree <command> [options]`

### 5.1 Initialization

```
ftree init [--db <path>]
```
- Creates the SQLite database with schema, indexes, and triggers.
- Default path: `.ftree/db.sqlite` relative to CWD.
- Creates `.ftree/` directory if needed.
- Idempotent — safe to run on existing DB.

### 5.2 Feature CRUD

#### Add a feature
```
ftree add <title> [--parent <id>] [--status <status>] [--metadata <json>]
```
- Creates a new feature node.
- If `--parent` omitted, creates under root (or as root if none exists).
- Returns the created feature ID.
- Sets `depth` and `position` automatically.

#### Update a feature
```
ftree update <id> [--title <title>] [--status <status>] [--metadata <json>] [--position <n>]
```
- Updates mutable fields.
- Validates status transition against §4.2.
- Fails with exit 1 on invalid transition.

#### Delete a feature
```
ftree delete <id> [--force]
```
- Without `--force`: fails if feature has children or linked WBS.
- With `--force`: cascades delete to children and links.

#### Move a feature
```
ftree move <id> --parent <new-parent-id>
```
- Reparents the feature (and its subtree).
- Validates no circular reference (a node cannot become its own ancestor).
- Recalculates `depth` for the moved subtree.

### 5.3 Tree Visualization

#### List tree
```
ftree ls [--root <id>] [--depth <n>] [--status <status>] [--json]
```
- Shows tree in Unicode box-drawing format (default) or JSON (`--json`).
- `--root` starts from a specific node (default: global root).
- `--depth` limits traversal depth.
- `--status` filters to show only matching branches.

**Human-readable output:**
```
[ROOT] ftree-v1 (executing)
├── [f_12a] Auth System (executing)
│   ├── [f_12b] OAuth2 integration (done) → WBS-101, WBS-102
│   └── [f_12c] Magic Links (backlog)
└── [f_45d] Database Schema (validated)
```

**JSON output:**
```json
{
  "id": "root-id",
  "title": "ftree-v1",
  "status": "executing",
  "children": [
    {
      "id": "f_12a",
      "title": "Auth System",
      "status": "executing",
      "wbs": ["WBS-101", "WBS-102"],
      "children": []
    }
  ]
}
```

#### Show subtree context (agent-optimized)
```
ftree context <id> [--format brief|full] [--json]
```
- Returns agent-optimized view: node + parent + children + linked WBS.
- Designed for LLM context injection (minimal token bloat).
- `brief` (default): one-line-per-feature (title + status + WBS links). Minimal tokens.
- `full`: includes metadata. For architect agents who need the complete picture.
- Always JSON output.

**Output (full format):**
```json
{
  "node": { "id": "f1", "title": "Auth", "status": "executing", "metadata": {} },
  "parent": { "id": "root", "title": "Core Platform" },
  "children": [
    { "id": "f2", "title": "OAuth", "status": "backlog", "wbs": [] }
  ],
  "linked_wbs": ["WBS-101", "WBS-102"]
}
```

**Output (brief format):**
```json
{
  "node": "f1: Auth (executing)",
  "parent": "root: Core Platform",
  "children": ["f2: OAuth (backlog)"],
  "linked_wbs": ["WBS-101", "WBS-102"]
}
```

### 5.4 WBS Linking

#### Link WBS tasks
```
ftree link <feature-id> --wbs <id1,id2,...>
```
- Creates entries in `feature_wbs_links`.
- Idempotent — duplicate links are silently ignored.
- Does NOT auto-change status (explicit control).

#### Unlink WBS tasks
```
ftree unlink <feature-id> --wbs <id1,id2,...>
```
- Removes entries from `feature_wbs_links`.
- Silent on missing links.

#### List WBS links
```
ftree wbs <feature-id>
```
- Returns all linked WBS IDs for a feature.

### 5.5 Digest (Atomic Status + Link)

```
ftree digest <feature-id> [--wbs <id1,id2,...>] [--status <status>]
```
- **Atomic operation**: links WBS IDs AND transitions status.
- Default status transition: current → `executing`.
- Validates: feature exists, status transition is valid per §4.2.
- Transactional — all-or-nothing.

### 5.6 Done Check

```
ftree check-done <id>
```
- Reports eligibility for `done` status.
- Checks: all children are `done`, all linked WBS tasks accounted for.
- Returns exit 0 if eligible, exit 1 with reasons if not.

### 5.7 Import/Export

#### Import from JSON
```
ftree import <file.json>
```
- Bulk-creates features from a JSON tree structure.
- Validates the tree structure before writing.
- Idempotent on re-import (upsert by title path).

#### Export to JSON
```
ftree export [--root <id>] [--output <file>]
```
- Exports the full tree (or subtree) as JSON.
- Default: STDOUT. `--output` writes to file.

### 5.8 Global Options

| Flag | Description |
|:---|:---|
| `--db <path>` | Override database path (default: `.ftree/db.sqlite`) |
| `--json` | Output in JSON format (for `ls`, `tree`) |
| `--quiet` | Suppress non-essential output |
| `--help` | Show command help |

---

## 6. Error Handling

| Exit Code | Meaning |
|:---|:---|
| 0 | Success |
| 1 | Validation/logic error (invalid transition, feature not found, circular reference) |
| 2 | Database error (corruption, lock timeout) |

**Error output format:**
- Human mode: `<error-prefix>: <message>` to STDERR
- JSON mode: `{"error": "<code>", "message": "<description>"}` to STDOUT

---

## 7. Module Structure

```
plugins/rd3/skills/feature-tree/
├── SKILL.md                    # Agent-facing skill definition
├── metadata.openclaw           # OpenClaw platform metadata
├── agents/                     # Subagent definitions
├── scripts/
│   ├── ftree.ts                # CLI entry point (bin), subcommand routing via parseCli()
│   ├── db.ts                   # Connection factory, PRAGMA setup, schema DDL, migrations
│   ├── dao/
│   │   ├── sql.ts              # Centralized SQL constants (FEATURE_SQL, WBS_LINK_SQL)
│   │   └── parsers.ts          # Row parsers (parseFeature, parseWbsLink)
│   ├── lib/
│   │   └── state-machine.ts    # TRANSITION_MAP + validateTransition() pure function
│   ├── commands/
│   │   ├── init.ts             # ftree init
│   │   ├── add.ts              # ftree add
│   │   ├── update.ts           # ftree update
│   │   ├── delete.ts           # ftree delete
│   │   ├── move.ts             # ftree move
│   │   ├── ls.ts               # ftree ls
│   │   ├── context.ts           # ftree context
│   │   ├── link.ts             # ftree link/unlink
│   │   ├── digest.ts           # ftree digest
│   │   ├── check-done.ts       # ftree check-done
│   │   └── import-export.ts    # ftree import/export
│   ├── types.ts                # TypeScript types and status machine
│   └── utils.ts                # Shared helpers (tree rendering, validation)
├── references/
│   ├── state-machine.md        # Status transition reference
│   └── api-examples.md         # JSON output examples
├── tests/
│   ├── db.test.ts              # Database schema, triggers, CRUD
│   ├── commands.test.ts        # CLI command tests
│   ├── state-machine.test.ts   # Status transition validation
│   ├── tree-operations.test.ts # Move, depth, position, roll-up
│   └── import-export.test.ts   # Import/export round-trip tests
└── templates/
    └── feature-tree.json       # Example import template
```

---

## 8. Test Strategy

| Layer | Coverage Target | Focus |
|:---|:---|:---|
| Database | 90%+ | Schema creation, triggers, CRUD operations, WAL mode |
| State Machine | 100% | All valid transitions, all invalid transitions rejected |
| CLI Commands | 90%+ | Each command's happy path and error cases |
| Tree Operations | 90%+ | Move (circular detection), depth calc, position ordering |
| Import/Export | 90%+ | Round-trip fidelity, validation, idempotency |

**Test runner:** `bun:test`
**Coverage threshold:** 90% functions, 90% lines

---

## 9. Dependencies

| Package | Purpose | Version |
|:---|:---|:---|
| `cuid2` | ID generation | latest |

No other external dependencies. Uses `bun:sqlite`, `bun:fs`, `bun:path` natively.

---

## 10. CLI Registration

Register `ftree` as a bin in the project's `package.json`:

```json
{
  "bin": {
    "ftree": "./plugins/rd3/skills/feature-tree/scripts/ftree.ts"
  }
}
```

Or as a workspace-level bin in `plugins/rd3/package.json`.

---

## 11. Out of Scope (v1)

These are explicitly excluded from the first implementation:
- HTTP API / daemon mode
- Multi-project support (one DB per project is sufficient)
- Web UI / TUI for tree visualization
- Real-time sync or collaborative editing
- WBS status auto-polling (agents handle this externally)
- Authentication / access control
- Orchestrator hooks (ftree is not called by orchestrator in v1)
- Bidirectional sync with `tasks` skill (no auto-update when WBS task status changes)
- WBS ID validation against `docs/.tasks/` (loose coupling — agent is integration layer)

**TODO (v2 candidates):**
- Snapshots/versioning: `ftree snapshot` + `ftree diff` for scope drift detection
- Orchestrator hooks: optional `ftree_feature_id` config for auto-status updates
- task-decomposition redesign: integrate ftree hierarchy into decomposition output
- Markdown import: import features from structured product specs
