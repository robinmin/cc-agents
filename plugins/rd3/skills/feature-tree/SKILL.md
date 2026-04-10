---
name: feature-tree
description: "Manage feature trees with WBS-linked task states. Use when organizing work into hierarchical feature trees, tracking feature status roll-up (backlog → validated → executing → done), or linking features to task IDs. Triggers: show features, feature tree, link WBS to feature, check feature status, digest feature."
license: Apache-2.0
metadata:
  author: rd3
  version: "1.0"
  platforms: "claude-code,codex,openclaw,opencode,antigravity"
  interactions:
    - pipeline
openclaw:
  emoji: "🌲"
---

# Feature Tree

Manage hierarchical feature trees with automatic status roll-up and WBS task linking. The ftree CLI is a thin client; all logic runs in a Bun daemon with SQLite persistence.

## When to use

Use this skill when You must:
- Organize work into hierarchical feature trees
- Track feature status roll-up (backlog → validated → executing → done)
- Link features to WBS task IDs for traceability
- Query a focused subtree view for LLM context (minimizes token bloat)

## Workflow

Follow these steps to work with feature trees:

### Step 1: Start the daemon

Ensure the ftree daemon is running with WAL mode enabled.

```bash
ftree serve
```

### Step 2: List the feature tree

View the hierarchical tree with status indicators.

```bash
ftree ls
```

**Output format:**
```
[ROOT] ftree-v1 (Executing)
├── [f_12a] Auth System (Executing)
│   ├── [f_12b] OAuth2 integration (Done) -> [WBS-101]
│   └── [f_12c] Magic Links (Backlog)
└── [f_45d] Database Schema (Validated)
```

### Step 3: Digest a feature

Link WBS IDs and flip status to `executing` atomically.

```bash
ftree digest --feature-id f1 --wbs-ids WBS-101,WBS-102
```

### Step 4: Query a subtree

Get focused context for an LLM, including node, parent, children, and linked WBS.

```bash
ftree tree <feature-id>
```

**Response payload:**
```json
{
  "node": { "id": "f1", "title": "Auth", "status": "executing", "metadata": {} },
  "parent": { "id": "root", "title": "Core Platform" },
  "children": [
    { "id": "f2", "title": "OAuth", "status": "backlog" }
  ],
  "linked_wbs": ["WBS-101", "WBS-102"]
}
```

## Behavior

**Pipeline with state machine:**
1. Features start in `backlog`
2. PM/Architect agent confirms design → status becomes `validated`
3. `digest` command links WBS and sets status to `executing`
4. When all linked WBS tasks are done → status rolls up to `done`
5. Manual `blocked` flag when WBS is stalled

**Status transitions:**
```
backlog → validated → executing → done
                    ↘ blocked ↗
```

## Code Examples

### Basic Usage

```bash
# Start daemon
ftree serve

# List tree
ftree ls

# Query subtree
ftree tree f_12a
```

### Advanced Usage

```bash
# Digest with multiple WBS links
ftree digest --feature-id f_12b --wbs-ids WBS-101,WBS-102,WBS-103

# Query with full ancestry
ftree tree f_12b --ancestry
```

## Gotchas

1. **Daemon unreachable (Exit 2):** The ftree server is not running. Start with `ftree serve`.
2. **WAL mode not enabled:** Ensure `PRAGMA journal_mode = WAL` is set on startup — prevents lock contention.
3. **Invalid feature ID on digest:** The `digest` command validates feature existence before linking; returns exit 1 if feature not found.

## Resources

### scripts/

- `ftree.ts` — Main CLI entry point
- `daemon.ts` — Bun server with SQLite WAL mode
- `db.ts` — Database schema and trigger definitions

### references/

- `state-machine.md` — Full status transition rules and triggers
- `api.md` — API endpoint documentation

## Platform Notes

### Claude Code
Use `!ftree` for live command execution. Use `$ARGUMENTS` for parameter references.

### Codex / OpenClaw / OpenCode / Antigravity
Run commands via Bash tool. Arguments provided in chat.

---

**Template type**: technique
**Purpose**: Step-by-step workflows with concrete instructions
