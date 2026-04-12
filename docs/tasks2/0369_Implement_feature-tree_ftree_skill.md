---
name: Implement feature-tree (ftree) skill
description: Implement ftree CLI — single source of truth for product/project scope with hierarchical features status state machine WBS linking and agent-optimized context output. Reuses shared libs (parseCli Result DAO pattern logger).
status: Done
created_at: 2026-04-10T00:14:39.907Z
updated_at: 2026-04-10T05:30:11.945Z
folder: docs/tasks2
type: task
impl_progress:
  planning: done
  design: done
  implementation: pending
  review: pending
  testing: pending
preset: "standard"
---

## 0369. Implement feature-tree (ftree) skill

### Background

AI agents need a structured way to decompose features into hierarchies, link them to WBS task IDs, and track status through a defined state machine. The existing feature-tree skill directory has a SKILL.md but no implementation. The spec (docs/spec/feature-tree-fsd.md) has been refined to v2.0 — shifting from a daemon+HTTP architecture to a simpler embedded SQLite CLI matching agent execution patterns.

**Strategic goal:** `ftree` is the **single source of truth for product/project scope**. It is consumed by subagents acting as product managers, project managers, system architects, and engineers. The agent workflow is:

1. PM agent creates high-level features in ftree
2. Architect agent decomposes features into sub-features via ftree
3. Engineer agent creates WBS tasks via `tasks create`, links them via `ftree link`
4. Orchestrator runs pipelines on WBS tasks
5. Agent calls `ftree check-done` to verify feature completion

**Integration philosophy:** Loose coupling. ftree stores WBS IDs as opaque strings — no validation against `docs/.tasks/`. The *agent* is the integration layer between ftree, tasks, and orchestrator. No auto-sync, no bidirectional hooks. Each tool does one thing well (Unix philosophy).


### Requirements

**Core insight:** ftree has exactly two atomic operations — everything else derives from them:
1. **Add leaf node** under a parent → builds the tree
2. **Link node → WBS IDs** (one-to-many) → connects scope to execution

All other commands are read-only queries, secondary mutations, or convenience wrappers on top of these two primitives. The plan is structured accordingly: core ops first (skill is usable after Phase 1), then queries, then secondary mutations.

---

**R1: Database Layer**
- [ ] R1.1: `ftree init` creates `docs/.ftree/db.sqlite` with `features` and `feature_wbs_links` tables, indexes on `parent_id`/`status`/`wbs_id`, and auto-timestamp trigger
- [ ] R1.2: WAL mode, foreign keys, and busy_timeout (5s) enforced on every connection via `PRAGMA`
- [ ] R1.3: `ftree init` is idempotent — safe to re-run on existing DB (no data loss, no error)
- [ ] R1.4: `features` table columns: `id` (TEXT PK cuid2), `parent_id` (TEXT FK CASCADE), `title` (TEXT NOT NULL), `status` (TEXT NOT NULL DEFAULT 'backlog'), `metadata` (TEXT DEFAULT '{}'), `depth` (INT NOT NULL DEFAULT 0), `position` (INT NOT NULL DEFAULT 0), `created_at`, `updated_at`
- [ ] R1.5: `feature_wbs_links` table: composite PK `(feature_id, wbs_id)`, FK CASCADE on feature_id

**R2: State Machine**
- [ ] R2.1: `FeatureStatus` union type: `'backlog' | 'validated' | 'executing' | 'done' | 'blocked'`
- [ ] R2.2: Transition map enforces: `backlog→{validated,blocked}`, `validated→{executing,backlog,blocked}`, `executing→{done,blocked}`, `blocked→{backlog,validated,executing}`, `done→{blocked}`. All other transitions rejected with exit code 1 and descriptive error.
- [ ] R2.3: Status roll-up computed at query time (display-only, not stored). Roll-up rules: blocked > executing > validated > done > backlog (worst-case wins among children).
- [ ] R2.4: `ftree ls` shows `[stored → rollup]` when stored and roll-up status differ.

**R3: CLI Commands — Core Operations (P0)**

These two commands + init are the minimum viable skill. After these, agents can build trees and link WBS.

- [ ] R3.1: `ftree init [--db <path>] [--template <name>]` — creates DB, idempotent, exit 0 on success. With `--template`: seeds root + child nodes from `templates/<name>.json`.
- [ ] R3.2: `ftree add <title> [--parent <id>] [--status <status>] [--metadata <json>]` — **core op 1**: returns new feature ID to STDOUT, auto-calculates depth and position
- [ ] R3.3: `ftree link <feature-id> --wbs <id1,id2,...>` — **core op 2**: idempotent, silent on duplicates
- [ ] R3.4: `ftree ls [--root <id>] [--depth <n>] [--status <s>] [--json]` — Unicode tree (default) or JSON array; respects `--depth` limit. Needed to verify tree after add/link.

**R4: CLI Commands — Read-Only Queries (P1)**

These commands query the tree built by core ops. No mutations.

- [ ] R4.1: `ftree context <id> [--format brief|full] [--json]` — agent-optimized context view: {node, parent, children, linked_wbs}. `brief` = one-line-per-feature (title + status + WBS), minimal tokens. `full` = includes metadata. Default: `brief`. Always JSON.
- [ ] R4.2: `ftree wbs <feature-id>` — lists linked WBS IDs, one per line
- [ ] R4.3: `ftree check-done <id>` — exit 0 if all children `done` and no outstanding conditions; exit 1 with reasons to STDERR
- [ ] R4.4: `ftree export [--root <id>] [--output <file>]` — exports subtree as JSON; STDOUT default, file with `--output`

**R5: CLI Commands — Secondary Mutations (P2)**

Less frequent operations. These modify existing nodes or provide convenience wrappers.

- [ ] R5.1: `ftree update <id> [--title <t>] [--status <s>] [--metadata <j>] [--position <n>]` — validates status transition per R2.2, rejects invalid with exit 1
- [ ] R5.2: `ftree delete <id> [--force]` — without `--force`: rejects if children or WBS links exist (exit 1); with `--force`: cascades delete
- [ ] R5.3: `ftree move <id> --parent <new-parent-id>` — rejects circular reference (node becoming its own ancestor), recalculates depth for subtree
- [ ] R5.4: `ftree unlink <feature-id> --wbs <id1,id2,...>` — silent on missing links
- [ ] R5.5: `ftree digest <feature-id> [--wbs <ids>] [--status <status>]` — convenience wrapper: links WBS + transitions status in single transaction. Default target status: `executing`. Rolls back on any failure.
- [ ] R5.6: `ftree import <file.json>` — bulk-creates from JSON tree, validates structure before write, upserts by title-path

**R6: Project Templates**
- [ ] R6.1: `ftree init --template <name>` seeds the DB from `templates/<name>.json` — root node + initial child structure
- [ ] R6.2: Ship 3 built-in templates: `web-app`, `cli-tool`, `api-service`
- [ ] R6.3: Template format: JSON tree matching `ftree import` schema (reuse same parser)
- [ ] R6.4: Templates are additive — can be applied to an existing DB (no data loss, appends under root)

**R7: Output Format**
- [ ] R7.1: Human mode: Unicode box-drawing tree (├──, └──, │) with `[id] title (status)` and `→ WBS-ids` suffix
- [ ] R7.2: JSON mode (`--json`): structured output to STDOUT, no extra text
- [ ] R7.3: Errors: human-readable to STDERR in normal mode; `{"error": "code", "message": "..."}` to STDOUT in `--json` mode
- [ ] R7.4: Exit codes: 0 = success, 1 = validation/logic error, 2 = database error

**R8: Testing**
- [ ] R8.1: `tests/db.test.ts` — schema creation, idempotent init, PRAGMA verification, auto-timestamp trigger, CASCADE delete
- [ ] R8.2: `tests/state-machine.test.ts` — every valid transition accepted, every invalid transition rejected, 100% edge coverage
- [ ] R8.3: `tests/core-ops.test.ts` — add + link happy paths and errors, template seeding
- [ ] R8.4: `tests/queries.test.ts` — context brief/full, wbs listing, check-done, export
- [ ] R8.5: `tests/mutations.test.ts` — update (status transitions), delete (cascade), move (circular detection), unlink, digest (atomic), import (round-trip)
- [ ] R8.6: `tests/tree-rendering.test.ts` — Unicode rendering, roll-up accuracy, depth limits
- [ ] R8.7: Overall coverage ≥ 90% functions, ≥ 90% lines

**R9: Skill Integration**
- [ ] R9.1: SKILL.md updated to match implemented commands, output formats, and agent workflow (PM → architect → engineer → orchestrator)
- [ ] R9.2: `ftree` registered as bin in `plugins/rd3/package.json`
- [ ] R9.3: Zero `console.*` calls — all output via `logger.*` from `scripts/logger.ts`
- [ ] R9.4: Biome lint + format clean (`bun run format && bun run lint` passes)
- [ ] R9.5: `bun run check` passes (lint + typecheck + test)
- [ ] R9.6: SKILL.md documents the agent consumption workflow with concrete examples for each agent role (PM, architect, engineer)

**R10: Constraints**
- C1: No daemon/server architecture. CLI opens DB, runs command, exits.
- C2: Single external dependency: `cuid2` only. All other functionality via `bun:*` native APIs.
- C3: DB path resolves via 3-tier chain: `--db` flag → `FTREE_DB` env → `docs/.ftree/db.sqlite` (CWD).
- C4: `PRAGMA foreign_keys = ON` on every connection — CASCADE deletes must work.
- C5: No auto-mutation of stored status. Roll-up is display-only.
- C6: One DB per project. No multi-project support in v1.
- C7: No external WBS polling. `check-done` checks child status only. No bidirectional sync with `tasks` skill.
- C8: Biome strict — no `biome-ignore` except `noUselessConstructor` for V8 coverage.
- C9: Bun-first imports — `bun:sqlite`, `bun:fs`, `bun:path`. No `node:*` unless Bun lacks the API.
- C10: WBS IDs are opaque strings — ftree does NOT validate existence against `docs/.tasks/`. The agent is the integration layer.
- C11: No orchestrator hooks in v1. Orchestrator does not call ftree. Manual agent control only.

**R11: Shared Library Reuse**
- [ ] R11.1: CLI arg parsing via `parseCli()` from `plugins/rd3/scripts/libs/cli-args.ts` — no hand-rolled parser. Subcommand routing on top.
- [ ] R11.2: Result type (`Ok<T>/Err<E>`) — commonize from `plugins/rd3/skills/tasks/scripts/lib/result.ts` into `plugins/rd3/scripts/libs/result.ts`, then import from the shared location. Update tasks skill to import from shared location too.
- [ ] R11.3: DAO pattern — model after `plugins/rd3/skills/orchestration-v2/scripts/dao/` (centralized SQL constants in `dao/sql.ts` + row parsers in `dao/parsers.ts`).
- [ ] R11.4: Logger — mandatory `plugins/rd3/scripts/logger.ts` import. Zero `console.*`.
- [ ] R11.5: FS utils — use `plugins/rd3/scripts/fs.ts` for directory creation and path resolution.
- [ ] R11.6: State machine — pure function `validateTransition(from, to): boolean` with `TRANSITION_MAP` constant. Do NOT reuse FSMEngine class (different lifecycle). Follow the pattern, not the implementation.


### Q&A


**Q: Why embedded SQLite instead of daemon?**
A: Agents run stateless one-shot commands. A daemon requires lifecycle management (start, stop, health checks) that adds complexity with no benefit. Embedded SQLite with WAL mode handles concurrent reads fine.

**Q: Why application-level roll-up instead of SQL triggers?**
A: Triggers that auto-mutate parent status cause surprising side-effects. Agents need explicit control over state transitions. Display-only roll-up shows advisory state without mutating stored data.

**Q: What's the maximum tree depth?**
A: No hard limit, but `--depth` flag on `ls` prevents runaway output. Recommended max: 5 levels for practical use.

**Q: How does `check-done` know if external WBS tasks are complete?**
A: It doesn't — it checks that all child features are `done` and reports linked WBS IDs for the agent to verify externally. No auto-polling.

**Q: Why loose coupling with WBS IDs (no validation against tasks)?**
A: The *agent* is the integration layer. `ftree link` stores opaque string IDs so it works with any WBS source, not just rd3:tasks. This follows Unix philosophy — each tool does one thing well. The agent calls both `ftree` and `tasks` to cross-reference.

**Q: Why not auto-sync with orchestrator?**
A: v1 is fully manual — the agent decides when to update feature status. If orchestrator matures with a hook system in v2+, we can add optional ftree hooks. But tool-level coupling is premature.

**Q: Why parseCli() instead of hand-rolled arg parser?**
A: `plugins/rd3/scripts/libs/cli-args.ts` already handles help, validation, defaults, and gives consistent UX across all rd3 CLIs. Subcommand routing is trivial on top.

**Q: Why commonize Result type?**
A: `Result<T, E>` is already used by tasks and orchestration-v1 (cross-skill import). Moving to `plugins/rd3/scripts/libs/result.ts` eliminates the cross-skill import smell and makes it a first-class shared utility.

**Q: Why rename `ftree tree` to `ftree context`?**
A: "tree" is ambiguous with `ftree ls` (which also shows a tree). "context" communicates the intent: agent-optimized, token-efficient context injection. The `--format brief|full` flag lets agents choose their token budget.

**Q: Why restructure the plan around two core operations?**
A: ftree has exactly two atomic operations: (1) add leaf node, (2) link node → WBS IDs. Everything else is a read-only query, secondary mutation, or convenience wrapper. Structuring the plan this way means the skill is *usable* after Phase 1 alone — agents can build trees and link WBS immediately. The remaining phases add value on top of this foundation without blocking early adoption.

**Q: Why project templates instead of just `ftree import`?**
A: Templates (`--template web-app`) give agents an immediate structure to work within rather than building from scratch. A PM agent can `ftree init --template web-app` and get a root node + 3-5 child features instantly. Templates reuse the same JSON format as `ftree import`, so no separate parser is needed.


### Design

**Architecture:** Thin CLI → Command modules → DAO layer → Database

```
ftree.ts (CLI entry, subcommand routing via parseCli())
  → commands/*.ts (one module per command)
    → dao/sql.ts (centralized SQL constants)
    → dao/parsers.ts (row → typed object)
    → db.ts (connection factory, PRAGMA setup, migrations)
      → bun:sqlite (embedded)
  → lib/result.ts (imported from plugins/rd3/scripts/libs/result.ts)
  → lib/state-machine.ts (TRANSITION_MAP + validateTransition())
```

**Key types (types.ts):**
- `FeatureStatus` — union: `'backlog' | 'validated' | 'executing' | 'done' | 'blocked'`
- `Feature` — database row interface
- `FeatureNode` — tree node with children (for output)
- `ContextView` — agent-optimized view: {node, parent, children, linked_wbs} with brief/full modes
- `TransitionMap` — `Record<FeatureStatus, Set<FeatureStatus>>`
- `WbsLink` — feature_id + wbs_id pair

**Database path resolution (3-tier):**
1. `--db` flag (explicit)
2. `FTREE_DB` env var
3. `docs/.ftree/db.sqlite` in CWD (default)

**CLI arg parsing:** Uses `parseCli()` from `plugins/rd3/scripts/libs/cli-args.ts`. Each subcommand defines a `CliSpec`. Entry point routes subcommand → command module. Each command module exports `run(args: string[]): Promise<number>` returning exit code.

**DAO pattern:** Modeled after `orchestration-v2/scripts/dao/`. SQL constants in `dao/sql.ts` (e.g., `FEATURE_SQL.insert`, `FEATURE_SQL.selectByParent`). Row parsers in `dao/parsers.ts` (e.g., `parseFeature(row) → Feature`).

**State machine:** Pure function `validateTransition(from: FeatureStatus, to: FeatureStatus): boolean` with a `TRANSITION_MAP` constant. Not a class — ftree is stateless CLI, no lifecycle to manage. Roll-up is display-only advisory — never auto-mutates stored status.

**Project templates:** `ftree init --template <name>` loads from `templates/<name>.json`. Ships with 3 built-in templates: `web-app`, `cli-tool`, `api-service`. Template format is the same JSON tree as `ftree import` — same parser, no duplication. Templates are additive (safe to apply to existing DB).

**Agent consumption:** CLI-only with `--json` flag. SKILL.md serves as the agent-facing API documentation with workflow examples per agent role.

**Command priority tiers:**
- **P0 (core ops):** `init`, `add`, `link`, `ls` — minimum viable skill
- **P1 (queries):** `context`, `wbs`, `check-done`, `export` — read-only views
- **P2 (mutations):** `update`, `delete`, `move`, `unlink`, `digest`, `import` — secondary operations

### Solution

#### Subtasks

- [ ] [0370 - ftree Phase 0: Commonize Result type into shared libs](0370_ftree_Phase_0_Commonize_Result_type_into_shared_libs.md)
- [ ] [0371 - ftree Phase 1: Core Operations — init, add, link, ls, templates](0371_ftree_Phase_1_Core_Operations_init_add_link_ls_templates.md)
- [ ] [0372 - ftree Phase 2: Read-Only Queries — context, wbs, check-done, export](0372_ftree_Phase_2_Read-Only_Queries_context_wbs_check-done_export.md)
- [ ] [0373 - ftree Phase 3: Secondary Mutations — update, delete, move, unlink, digest, import](0373_ftree_Phase_3_Secondary_Mutations_update_delete_move_unlink_digest_import.md)
- [ ] [0374 - ftree Phase 4: Polish + Skill Integration](0374_ftree_Phase_4_Polish_Skill_Integration.md)

**Dependency order:** 0370 → 0371 → (0372 || 0373) → 0374
**Estimated total effort:** 16-24 hours


### Plan

**Priority principle:** The two core operations (add leaf node, link WBS) land first. After Phase 1, the skill is *usable* — agents can build trees, link tasks, and verify via `ls`. Subsequent phases add queries, secondary mutations, and polish.

#### Phase 0: Shared Library Prep
- [ ] 0.1 Commonize Result type: copy `plugins/rd3/skills/tasks/scripts/lib/result.ts` → `plugins/rd3/scripts/libs/result.ts`
- [ ] 0.2 Update tasks skill imports to use `plugins/rd3/scripts/libs/result.ts` (find/replace `../lib/result` → shared path)
- [ ] 0.3 Verify `bun run check` passes after Result type move

#### Phase 1: Core Operations (P0 — minimum viable skill)

After this phase: `ftree init`, `ftree add`, `ftree link`, `ftree ls` all work. Agents can build feature trees and link WBS.

- [ ] 1.1 Create `scripts/types.ts` — FeatureStatus, Feature, FeatureNode, ContextView, TransitionMap, WbsLink
- [ ] 1.2 Create `scripts/lib/state-machine.ts` — TRANSITION_MAP constant + `validateTransition()` pure function
- [ ] 1.3 Create `scripts/dao/sql.ts` — centralized SQL constants (FEATURE_SQL, WBS_LINK_SQL)
- [ ] 1.4 Create `scripts/dao/parsers.ts` — row parsers (parseFeature, parseWbsLink)
- [ ] 1.5 Create `scripts/db.ts` — connection factory, PRAGMA setup, schema DDL, migrations
- [ ] 1.6 Create `scripts/ftree.ts` — CLI entry point with subcommand routing via `parseCli()` and --db resolution
- [ ] 1.7 Create `scripts/commands/init.ts` — with `--template <name>` support
- [ ] 1.8 Create `scripts/commands/add.ts` — **core op 1**: auto depth/position
- [ ] 1.9 Create `scripts/commands/link.ts` — **core op 2**: idempotent WBS linking
- [ ] 1.10 Create `scripts/utils.ts` — tree rendering (Unicode box-drawing), roll-up computation
- [ ] 1.11 Create `scripts/commands/ls.ts` — human + JSON output (verify tree after add/link)
- [ ] 1.12 Create `templates/web-app.json`, `templates/cli-tool.json`, `templates/api-service.json`
- [ ] 1.13 Write `tests/db.test.ts` — schema creation, idempotent init, PRAGMA verification
- [ ] 1.14 Write `tests/core-ops.test.ts` — add + link happy paths and errors, template seeding
- [ ] 1.15 Write `tests/state-machine.test.ts` — every valid/invalid transition
- [ ] 1.16 Register bin in package.json, verify `bun run check` passes

#### Phase 2: Read-Only Queries (P1)

After this phase: agents can query focused context, check done eligibility, export trees.

- [ ] 2.1 Create `scripts/commands/context.ts` — agent-optimized view with `--format brief|full`
- [ ] 2.2 Create `scripts/commands/wbs.ts` — list linked WBS IDs
- [ ] 2.3 Create `scripts/commands/check-done.ts` — done eligibility check
- [ ] 2.4 Create `scripts/commands/export.ts` — JSON export to STDOUT or file
- [ ] 2.5 Write `tests/queries.test.ts` — context brief/full, wbs listing, check-done, export

#### Phase 3: Secondary Mutations (P2)

After this phase: full CRUD + convenience wrappers. Less frequent operations.

- [ ] 3.1 Create `scripts/commands/update.ts` — with state machine validation
- [ ] 3.2 Create `scripts/commands/delete.ts` — with cascade protection
- [ ] 3.3 Create `scripts/commands/move.ts` — with circular reference detection
- [ ] 3.4 Create `scripts/commands/unlink.ts` — silent on missing links
- [ ] 3.5 Create `scripts/commands/digest.ts` — atomic link + status transition
- [ ] 3.6 Create `scripts/commands/import.ts` — bulk-create from JSON tree
- [ ] 3.7 Write `tests/mutations.test.ts` — update, delete, move (circular detection), unlink, digest (atomic), import (round-trip)
- [ ] 3.8 Write `tests/tree-rendering.test.ts` — Unicode rendering, roll-up accuracy, depth limits

#### Phase 4: Polish + Skill Integration

- [ ] 4.1 Update SKILL.md: match implementation, document agent workflow (PM → architect → engineer → orchestrator), add per-role examples
- [ ] 4.2 Final coverage check — ≥ 90% functions, ≥ 90% lines
- [ ] 4.3 Final `bun run check` pass (lint + typecheck + test)


### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### Out of Scope (v1)

- HTTP API / daemon mode
- Multi-project support (one DB per project)
- Web UI / TUI for tree visualization
- Real-time sync or collaborative editing
- WBS status auto-polling (agents handle externally)
- Authentication / access control
- Orchestrator hooks (ftree is not called by orchestrator in v1)
- Bidirectional sync with `tasks` skill (no auto-update when WBS task status changes)

**TODO (v2 candidates):**
- [ ] **Snapshots/versioning**: `ftree snapshot [--tag <name>]` to serialize current tree to `docs/.ftree/snapshots/<timestamp>-<tag>.json`. `ftree diff <s1> <s2>` for scope drift detection. Schema already supports this via `created_at`/`updated_at`.
- [ ] **Orchestrator hooks**: When orchestrator gains a hook system, add optional `ftree_feature_id` config to auto-update feature status on pipeline phase completion.
- [ ] **task-decomposition redesign**: Integrate ftree's hierarchical structure into task-decomposition output, so decomposition can directly produce feature sub-trees.
- [ ] **Markdown import**: Import features from a structured markdown product spec (e.g., headings → features, bullets → sub-features).

### References


- Spec: `docs/spec/feature-tree-fsd.md` (refined v2.0)
- Existing SKILL.md: `plugins/rd3/skills/feature-tree/SKILL.md`
- Project conventions: `AGENTS.md` (root)
- Logger: `scripts/logger.ts`
- Reference skill structure: `plugins/rd3/skills/cc-skills/`
- **Shared CLI args**: `plugins/rd3/scripts/libs/cli-args.ts` — `parseCli()`, `CliSpec`, `CliOption`
- **Result type (to commonize)**: `plugins/rd3/skills/tasks/scripts/lib/result.ts` → target: `plugins/rd3/scripts/libs/result.ts`
- **DAO pattern reference**: `plugins/rd3/skills/orchestration-v2/scripts/dao/` (sql.ts + parsers.ts)
- **FSM pattern reference**: `plugins/rd3/skills/orchestration-v2/scripts/engine/fsm.ts` (transition map pattern, not the class)
- **FS utils**: `plugins/rd3/scripts/fs.ts`
- **WBS lib (tasks)**: `plugins/rd3/skills/tasks/scripts/lib/wbs.ts` — for reference on WBS ID format (not imported by ftree)
- **task-decomposition patterns**: `plugins/rd3/skills/task-decomposition/references/` — decomposition patterns for agent workflow context
