---
name: feature-tree
description: "Manage feature trees with WBS-linked task states. Use when organizing work into hierarchical feature trees, tracking feature status roll-up (backlog → validated → executing → done), or linking features to task IDs. Triggers: show features, feature tree, link WBS to feature, check feature status, digest feature."
license: Apache-2.0
metadata:
  author: rd3
  version: "2.0"
  platforms: "claude-code,codex,openclaw,opencode,antigravity,pi"
  interactions:
    - pipeline
openclaw:
  emoji: "🌲"
---

# Feature Tree (ftree)

Manage hierarchical feature trees with automatic status roll-up and WBS task linking. CLI-only architecture — opens SQLite, runs command, exits. No daemon.

## When to Use

Use this skill when you need to:
- Organize work into hierarchical feature trees
- Track feature status roll-up (backlog → validated → executing → done)
- Link features to WBS task IDs for traceability
- Query a focused subtree view for LLM context (minimizes token bloat)
- Check done-eligibility before closing a feature
- Export tree state for reporting or cross-tool integration

## Modeling Rules

`ftree` models **product/project scope**, not execution mechanics. Treat features as capability boundaries that compose the system. Treat WBS tasks as delivery work packages derived from that scope.

### Feature vs. Sub-Feature

Split one feature into multiple sub-features when the children represent **real capability boundaries**, not just implementation steps.

Create sub-features when:
- The parent contains multiple distinct capabilities or user-meaningful concerns
- The children could reasonably be planned, discussed, or validated independently
- The structure is likely to remain useful after the current implementation cycle
- You need separate status roll-up for enduring parts of the product or project

Do **not** create sub-features when:
- The work is still one coherent capability and only needs several implementation tasks
- The split is just investigation/design/implementation/testing phases
- The split exists only to satisfy a one-feature-per-task bookkeeping rule
- The child nodes would not make sense to a PM/architect after the current task is done

Rule of thumb:
- **One capability, many work packages** → keep one leaf feature and link multiple WBS tasks
- **Several enduring capabilities** → split into sub-features, then link WBS tasks at the leaves

### Feature-to-Task Mapping

Default mapping discipline:
- One feature may link to many WBS tasks
- One WBS task should usually belong to one **primary** feature
- Prefer linking WBS tasks to **leaf features**, not branch features
- Avoid linking the same WBS task to both a parent and its child unless you explicitly want ambiguous ownership

Branch features may have direct WBS links only as an exception, for example:
- Cross-cutting coordination work owned at the parent level
- Temporary migration or rollout tasks spanning multiple child features

### Anti-Patterns

Avoid these modeling mistakes:
- Forcing `1 feature = 1 task`
- Turning every implementation step into a sub-feature
- Using `ftree` as a duplicate kanban board for task execution
- Creating tiny ephemeral child nodes that only exist because there are multiple files to edit

## Advisory Operating Mode

`ftree` is an **advisory/project-scope context layer**. It should improve planning, traceability, and progress review without becoming a hard dependency of orchestration.

### What Advisory Means

- `ftree` is the scope graph
- `rd3:task-decomposition` translates scope into executable tasks
- `rd3:tasks` stores the document-first execution records
- Orchestration and workflow execution remain agnostic to `ftree`

The agent is responsible for keeping `ftree` and WBS tasks aligned. There is no required auto-sync, no mandatory hook, and no execution gate based on `ftree`.

### Minimal Discipline for Advisory Use

To keep advisory mode useful and avoid drift:
- Decompose from a selected feature or subtree when possible, not from the entire project
- Link newly created WBS tasks back to the owning leaf feature
- Update feature status deliberately as planning and implementation progress
- Use `ftree check-done` before declaring a feature complete
- Use subtree context for planning and review, not as a substitute for task docs

Optional traceability metadata in task files:
- `feature_id`
- `feature_path`

These are helpful for agents, but they are advisory metadata rather than required orchestration inputs.

## Installation

The `ftree` CLI is registered as a bin in `plugins/rd3/package.json`:

```bash
# Run from project root
ftree <command> [options]
```

## Database Path Resolution

1. `--db <path>` flag (highest priority)
2. `FTREE_DB` environment variable
3. Default: `docs/.ftree/ftree.db`

## Commands Reference

### Core Operations (Phase 1)

#### `ftree init [--template <name>] [--db <path>]`

Initialize a feature tree database. Idempotent — safe to re-run.

```bash
ftree init                              # Create DB at default path
ftree init --template web-app           # Seed with template
ftree init --db /tmp/ftree.db           # Custom path
```

Built-in templates: `web-app`, `cli-tool`, `api-service`.

#### `ftree add --title <t> [--parent <id>] [--status <s>] [--metadata <json>] [--db <path>]`

Add a feature to the tree. Auto-generates UUID, computes depth and position.

```bash
ftree add --title "User Auth"                        # Root feature
ftree add --title "OAuth2" --parent <id>             # Child feature
ftree add --title "API" --status executing            # With status
ftree add --title "Search" --metadata '{"pri":"hi"}' # With metadata
```

Output: new feature UUID to stdout.

#### `ftree link <feature-id> --wbs <id1,id2,...> [--db <path>]`

Link a feature to WBS task IDs. Idempotent — duplicates ignored.

```bash
ftree link abc123 --wbs 001
ftree link abc123 --wbs 001,002,003
```

#### `ftree ls [--root <id>] [--depth <n>] [--status <s>] [--json] [--db <path>]`

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

### Read-Only Queries (Phase 2)

#### `ftree context <feature-id> [--format brief|full] [--db <path>]`

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
  "id": "abc123",
  "title": "Auth System",
  "status": "executing",
  "parent": null,
  "child_count": 2,
  "linked_wbs": ["001", "002"]
}
```

#### `ftree wbs <feature-id> [--db <path>]`

List linked WBS IDs, one per line.

```bash
ftree wbs abc123
# Output:
# 001
# 002
```

#### `ftree check-done <feature-id> [--db <path>]`

Check done-eligibility. Exit 0 if eligible, exit 1 with reasons if not.

- Leaf node: always eligible
- Branch: all children must be `done`

```bash
ftree check-done abc123
# {"eligible":true,"reasons":[]}
# Exit 0

ftree check-done abc123
# {"eligible":false,"reasons":["Child \"OAuth2\" (def456) has status \"executing\", expected \"done\""]}
# Exit 1
```

#### `ftree export [--root <id>] [--output <file>] [--db <path>]`

Export tree as JSON. Default: stdout. Use `--output` to write to file.

```bash
ftree export                       # Full tree to stdout
ftree export --root abc123         # Subtree
ftree export --output tree.json    # Write to file
```

### Secondary Mutations (Phase 3)

#### `ftree update <id> [--title <t>] [--status <s>] [--metadata <json>] [--db <path>]`

Update feature fields. Validates status transitions per state machine.

```bash
ftree update abc123 --title "New Title"
ftree update abc123 --status validated
ftree update abc123 --metadata '{"pri":"critical"}'
```

Exit 1 if status transition is invalid (e.g., `backlog → done` is not allowed).

#### `ftree delete <id> [--force] [--db <path>]`

Delete a feature. Without `--force`: rejects if children or WBS links exist. With `--force`: cascades delete to children and removes WBS links.

```bash
ftree delete abc123                # Fails if has children/links
ftree delete abc123 --force        # Cascade delete
```

#### `ftree move <id> --parent <new-parent-id> [--db <path>]`

Move a feature to a new parent. Use `"null"` for root level. Detects circular references.

```bash
ftree move abc123 --parent def456  # Move under new parent
ftree move abc123 --parent null    # Move to root
```

Exit 1 if moving would create a circular reference.

#### `ftree unlink <feature-id> --wbs <id1,id2,...> [--db <path>]`

Unlink specific WBS IDs. Silent on missing links.

```bash
ftree unlink abc123 --wbs 001,002
```

#### `ftree digest <id> --wbs <ids> [--status <s>] [--db <path>]`

Atomic operation: link WBS IDs + transition status. Default target: `executing`. Validates transition before executing — rolls back on failure.

```bash
ftree digest abc123 --wbs 001,002
ftree digest abc123 --wbs 001 --status validated
```

#### `ftree import <file.json> [--parent <id>] [--db <path>]`

Bulk-import from JSON tree file. Uses same schema as templates. Reports count.

```bash
ftree import features.json
ftree import features.json --parent abc123  # Import under parent
```

## State Machine

### Status Transitions

```
backlog  → validated, blocked
validated → executing, backlog, blocked
executing → done, blocked
blocked  → backlog, validated, executing
done     → blocked
```

### Roll-up Rules

Parent status is computed from children using worst-case wins:

```
blocked > executing > validated > done > backlog
```

Display shows `stored → rollup` when they differ (e.g., `backlog → validated` means the stored status is `backlog` but all children are `validated`).

## Agent Workflow

### PM Agent — Planning & Decomposition

```bash
# 1. Initialize tree for a project
ftree init --template web-app

# 2. Add top-level features from requirements
ftree add --title "User Management"
ftree add --title "Payment System"

# 3. Decompose into sub-features
PM_ID=$(ftree add --title "User Management")
ftree add --title "Registration" --parent "$PM_ID"
ftree add --title "Profile" --parent "$PM_ID"
ftree add --title "Auth" --parent "$PM_ID"
```

**Decision rule:** Create child features only when they are real capability boundaries. If "Auth" is one coherent capability that needs multiple implementation tasks, keep it as one leaf feature and link multiple WBS tasks to it later.

### Architect Agent — Design & Validation

```bash
# 1. Review tree structure
ftree ls --json

# 2. Get focused context for a sub-tree
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

# 3. Check done-eligibility after implementation
ftree check-done <feature-id>

# 4. Update status when complete
ftree update <feature-id> --status done
```

**Linking rule:** Prefer linking WBS IDs to the leaf feature being implemented. A single leaf feature may link to multiple WBS tasks when those tasks together deliver the same capability.

### Orchestrator Agent — Status & Reporting

```bash
# 1. Export full tree state
ftree export --output status.json

# 2. Check a feature's WBS links
ftree wbs <feature-id>

# 3. List features by status
ftree ls --status blocked

# 4. Move misplaced features
ftree move <id> --parent <new-parent-id>
```

**Scope rule:** Use `ftree` for advisory reporting and scope review. Do not make orchestration depend on `ftree` state to execute normal task workflows.

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Validation error, not found, or logic error |
| 2 | Database / internal error |

## Gotchas

1. **WAL mode:** PRAGMA `journal_mode = WAL` is set automatically on init. No manual setup needed.
2. **Idempotent init:** `ftree init` is safe to re-run — uses `CREATE TABLE IF NOT EXISTS`.
3. **Circular move detection:** `ftree move` rejects if the target parent is a descendant of the source node.
4. **State machine enforcement:** `ftree update` and `ftree digest` reject invalid transitions with descriptive error messages.
5. **Template paths:** Built-in templates resolve relative to CWD. Run from project root for correct path resolution.
6. **Depth recalculation:** `ftree move` recalculates depth for the entire moved subtree.

## Project Structure

```
plugins/rd3/skills/feature-tree/
├── SKILL.md                          ← This file
├── scripts/                          ← Monorepo root (@ftree/core + @ftree/cli)
│   ├── packages/core/src/
│   │   ├── types/feature.ts          ← FeatureStatus, Feature, FeatureNode, ContextView, WbsLink, TemplateNode, DoneCheckResult
│   │   ├── types/result.ts           ← Result<T, E>
│   │   ├── db/                       ← Adapter, BunSqliteAdapter, client singleton, Drizzle schema
│   │   ├── lib/
│   │   │   ├── dao/sql.ts            ← SQL constants (schema DDL, recursive CTEs, mutation queries)
│   │   │   ├── dao/parsers.ts        ← Row parsers
│   │   │   ├── state-machine.ts      ← TRANSITION_MAP, validateTransition, computeRollupStatus
│   │   │   └── tree-utils.ts         ← buildFeatureTree, renderTree, findNode, findParent
│   │   ├── services/feature-service.ts ← FeatureService class (all business logic)
│   │   ├── errors.ts                 ← AppError hierarchy
│   │   ├── config.ts                 ← CORE_CONFIG
│   │   ├── logger.ts + logging.ts    ← logtape logger
│   │   └── index.ts                  ← Barrel export
│   ├── packages/core/tests/          ← 176 tests, 99%+ coverage
│   ├── apps/cli/src/
│   │   ├── index.ts                  ← clipanion CLI setup, registers all commands
│   │   └── commands/                 ← 14 command files (init, add, link, ls, context, wbs, check-done, export, update, delete, move, unlink, digest, import)
│   └── templates/                    ← web-app.json, cli-tool.json, api-service.json
└── metadata.openclaw                  ← OpenClaw metadata
```

## Platform Notes

### Claude Code
Use `!ftree` for live command execution. Use `$ARGUMENTS` for parameter references.

### Codex / OpenClaw / OpenCode / Antigravity / Pi
Run commands via Bash tool: `ftree <command>`.

---

**Template type**: technique
**Purpose**: Step-by-step workflows with concrete instructions for agent-driven feature tree management
