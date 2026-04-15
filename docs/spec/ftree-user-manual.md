# Feature Tree (ftree) — User Manual

## Quick Start

```bash
# Initialize database with a template
ftree init --template web-app

# List all features
ftree ls

# Add a new feature
ftree add --title "User Authentication"

# Link WBS tasks and start execution
ftree digest <feature-id> --wbs 001,002 --status executing

# Check if ready to mark done
ftree check-done <feature-id>

# Export tree as JSON
ftree export --output tree.json
```

---

## Installation & Setup

### CLI Entry Point

```bash
ftree <command> [options]
```

### Database Path Resolution

1. `--db <path>` flag (highest priority)
2. `FTREE_DB` environment variable
3. Default: `docs/.ftree/db.sqlite`

### Templates

Built-in templates seed the database with a starter feature tree:

| Template | Description |
|:---|:---|
| `web-app` | User Interface, API Integration, Data Layer |
| `cli-tool` | Core Commands, Configuration, Help System |
| `api-service` | REST Endpoints, Authentication, Data Access |

```bash
ftree init --template web-app    # Seed with web-app template
ftree init --template cli-tool   # Seed with cli-tool template
ftree init --template api-service  # Seed with api-service template
```

---

## Commands Reference

### `ftree init [--db <path>] [--template <name>]`

Initialize the feature tree database. Idempotent — safe to re-run.

```bash
ftree init                              # Create DB at default path
ftree init --template web-app           # Create DB and seed with template
ftree init --db /tmp/ftree.db          # Custom path
```

**Output:**
- First run: `Created new database at <path>`
- Subsequent runs: `Database schema verified at <path>`
- With template: `Seeded <N> features from template "<name>"`

---

### `ftree add --title <title> [--parent <id>] [--status <status>] [--metadata <json>]`

Add a feature to the tree. Auto-generates UUID, computes depth and position.

```bash
ftree add --title "User Auth"                        # Root feature
ftree add --title "OAuth2" --parent abc123           # Child feature
ftree add --title "API" --status executing           # With status
ftree add --title "Search" --metadata '{"pri":"hi"}' # With metadata
```

**Output:** New feature UUID to stdout.

**Status values:** `backlog` (default), `validated`, `executing`, `done`, `blocked`

---

### `ftree ls [--root <id>] [--depth <n>] [--status <status>] [--json]`

List features in Unicode tree view or JSON.

```bash
ftree ls                          # Full tree
ftree ls --root abc123            # Subtree
ftree ls --depth 2                # Depth limit
ftree ls --status executing       # Filter by status
ftree ls --json                   # JSON output
```

**Tree output:**
```
├── [abc123] User Auth (validated)
│   ├── [def456] OAuth2 (done) → 001, 002
│   └── [ghi789] Magic Links (backlog)
└── [jkl012] Database Schema (validated)
```

**JSON output:**
```json
{
  "id": "root-id",
  "title": "My Project",
  "status": "executing",
  "children": [
    {
      "id": "abc123",
      "title": "User Auth",
      "status": "validated",
      "wbs_ids": [],
      "children": [...]
    }
  ]
}
```

---

### `ftree context <feature-id> [--format brief|full]`

Agent-optimized context view. Always JSON. Minimizes token usage.

- `brief` (default): id, title, status, parent, child_count, linked_wbs
- `full`: complete node, parent, children nodes, linked WBS

```bash
ftree context abc123              # Brief — minimal tokens
ftree context abc123 --format full  # Full detail
```

**Brief output:**
```json
{
  "node": "abc123: User Auth (validated)",
  "parent": "root: My Project",
  "children": ["def456: OAuth2 (done)", "ghi789: Magic Links (backlog)"],
  "linked_wbs": ["001", "002"]
}
```

**Full output:**
```json
{
  "node": {
    "id": "abc123",
    "title": "User Auth",
    "status": "validated",
    "storedStatus": "validated",
    "metadata": {},
    "depth": 1,
    "position": 0,
    "children": [...],
    "wbs_ids": ["001", "002"]
  },
  "parent": { "id": "root", "title": "My Project" },
  "children": [...],
  "linked_wbs": ["001", "002"]
}
```

---

### `ftree link <feature-id> --wbs <id1,id2,...>`

Link a feature to WBS task IDs. Idempotent — duplicates ignored.

```bash
ftree link abc123 --wbs 001
ftree link abc123 --wbs 001,002,003
```

---

### `ftree unlink <feature-id> --wbs <id1,id2,...>`

Unlink specific WBS IDs. Silent on missing links.

```bash
ftree unlink abc123 --wbs 001,002
```

---

### `ftree wbs <feature-id>`

List linked WBS IDs for a feature, one per line.

```bash
ftree wbs abc123
# Output:
# 001
# 002
```

---

### `ftree digest <feature-id> --wbs <ids> [--status <status>]`

Atomic operation: link WBS IDs + transition status. Default target: `executing`.

```bash
ftree digest abc123 --wbs 001,002
ftree digest abc123 --wbs 001 --status validated
```

**Output:**
```json
{
  "id": "abc123",
  "title": "User Auth",
  "status": "executing",
  "previous_status": "backlog",
  "status_changed": true,
  "metadata": {},
  "depth": 1,
  "position": 0,
  "children_count": 2,
  "wbs_ids": ["001", "002"],
  "wbs_linked": ["001", "002"],
  "parent_id": "root"
}
```

---

### `ftree check-done <feature-id>`

Check done-eligibility. Exit 0 if eligible, exit 1 with reasons if not.

- Leaf node: always eligible
- Branch: all children must be `done`

```bash
ftree check-done abc123
# Exit 0 — eligible

ftree check-done abc123
# Exit 1 — not eligible
# Child "OAuth2" (def456) has status "executing", expected "done"
```

---

### `ftree update <id> [--title <title>] [--status <status>] [--metadata <json>]`

Update feature fields. Validates status transitions.

```bash
ftree update abc123 --title "New Title"
ftree update abc123 --status validated
ftree update abc123 --metadata '{"pri":"critical"}'
```

**Exit 1** if status transition is invalid (e.g., `backlog → done` is not allowed).

---

### `ftree delete <id> [--force]`

Delete a feature.

- Without `--force`: rejects if children or WBS links exist
- With `--force`: cascades delete to children and removes WBS links

```bash
ftree delete abc123                # Fails if has children/links
ftree delete abc123 --force        # Cascade delete
```

---

### `ftree move <id> --parent <new-parent-id>`

Move a feature to a new parent. Use `"null"` for root level.

```bash
ftree move abc123 --parent def456  # Move under new parent
ftree move abc123 --parent null    # Move to root
```

**Exit 1** if moving would create a circular reference.

---

### `ftree export [--root <id>] [--output <file>]`

Export tree as JSON. Default: stdout. Use `--output` to write to file.

```bash
ftree export                       # Full tree to stdout
ftree export --root abc123         # Subtree
ftree export --output tree.json    # Write to file
```

---

### `ftree import <file.json> [--parent <id>]`

Bulk-import features from JSON tree file. Reports count.

```bash
ftree import features.json
ftree import features.json --parent abc123  # Import under parent
```

**JSON format:**
```json
[
  {
    "title": "User Management",
    "status": "backlog",
    "children": [
      { "title": "Registration", "status": "backlog" },
      { "title": "Authentication", "status": "backlog" }
    ]
  }
]
```

---

## State Machine Reference

### Status Transitions

```
backlog   → validated, blocked
validated → executing, backlog, blocked
executing → done, blocked
blocked   → backlog, validated, executing
done      → blocked  (regression allowed)
```

### Roll-up Rules

Parent status = worst-case among children:

```
blocked > executing > validated > done > backlog
```

CLI shows `[stored → rollup]` when they differ.

---

## Exit Codes

| Code | Meaning |
|:---|:---|
| 0 | Success |
| 1 | Validation error, not found, or logic error |
| 2 | Database / internal error |

---

## Gotchas

1. **WAL mode:** `PRAGMA journal_mode = WAL` is set automatically on init.
2. **Idempotent init:** `ftree init` is safe to re-run.
3. **Circular move detection:** `ftree move` rejects if target parent is a descendant.
4. **State machine enforcement:** `ftree update` and `ftree digest` reject invalid transitions.
5. **Template paths:** Built-in templates resolve relative to CWD. Run from project root.
6. **Depth recalculation:** `ftree move` recalculates depth for the entire moved subtree.

---

## Examples

### PM Agent — Planning & Decomposition

```bash
# 1. Initialize tree for a project
ftree init --template web-app

# 2. Add top-level features
ftree add --title "User Management"
ftree add --title "Payment System"

# 3. Decompose into sub-features
PM_ID=$(ftree add --title "User Management")
ftree add --title "Registration" --parent "$PM_ID"
ftree add --title "Profile" --parent "$PM_ID"
ftree add --title "Auth" --parent "$PM_ID"
```

### Architect Agent — Design & Validation

```bash
# 1. Review tree structure
ftree ls --json

# 2. Get focused context
ftree context <feature-id> --format full

# 3. Add children for design components
ftree add --title "OAuth2 Provider" --parent <auth-id>

# 4. Mark validated after design review
ftree update <feature-id> --status validated
```

### Engineer Agent — Implementation & Tracking

```bash
# 1. Pick up a validated feature
ftree context <feature-id>

# 2. Link to WBS task and start executing
ftree digest <feature-id> --wbs 0371,0372 --status executing

# 3. Check done-eligibility
ftree check-done <feature-id>

# 4. Update status when complete
ftree update <feature-id> --status done
```

### Reporter — Status & Export

```bash
# Export full tree state
ftree export --output status.json

# List features by status
ftree ls --status blocked

# Check a feature's WBS links
ftree wbs <feature-id>
```
