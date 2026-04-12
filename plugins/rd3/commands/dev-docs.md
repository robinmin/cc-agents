---
description: Refresh documentation for a skill or plugin folder based on the current codebase
argument-hint: "<folder-path> [--dry-run] [--skip-tests] [--architecture <path>] [--spec <path>] [--user-manual <path>]"
allowed-tools: ["Read", "Glob", "Grep", "Bash", "Edit", "Write", "Skill"]
---

# Dev Docs

Standalone documentation refresh for a specified folder. Scans the current codebase and updates canonical project docs so documentation stays in sync with code.

This command is **task-irrelevant** — it operates on a folder, not a WBS task. Use it whenever docs drift from code, regardless of pipeline state.

## When to Use

- Canonical project docs are stale after code changes
- After refactoring, adding features, or fixing bugs in a skill/plugin
- Before packaging or publishing a skill
- Onboarding review — "does the documentation match what the code actually does?"

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `folder-path` | Yes | Path to the skill or plugin folder (e.g. `plugins/rd3/skills/orchestration-v2/`) |
| `--dry-run` | No | Show what would change without writing files |
| `--skip-tests` | No | Skip scanning test files for coverage/behavior documentation |
| `--architecture <path>` | No | Architecture document path. Default: `docs/01_ARCHITECTURE_SPEC.md` |
| `--spec <path>` | No | Developer spec document path. Default: `docs/02_DEVELOPER_SPEC.md` |
| `--user-manual <path>` | No | User manual document path. Default: `docs/03_USER_MANUAL.md` |

### Target Detection

| Input Pattern | Resolution | Example |
|---------------|------------|---------|
| Path ending with `/` | Folder scan | `plugins/rd3/skills/orchestration-v2/` |
| Path to `SKILL.md` | Parent folder | `plugins/rd3/skills/code-docs/SKILL.md` |
| Skill name (`rd3:xxx`) | Resolve to `plugins/rd3/skills/xxx/` | `rd3:orchestration-v2` |

## Workflow

### Phase 1: Scan

1. **Read folder structure** — Glob for all `.ts`, `.md`, `.yaml`, `.jsonc` files in the target folder
2. **Read SKILL.md** — Parse as context input (name, description, what the skill claims to do) — **read only, never write**
3. **Read source files** — Scan scripts/ for:
   - Exported functions, classes, interfaces (public API surface)
   - CLI command handlers and their flags
   - Configuration schemas and validation rules
   - Error codes and exit constants
4. **Read test files** (unless `--skip-tests`) — Identify:
   - Test count and coverage areas
   - Key behaviors being tested
   - Edge cases worth documenting
5. **Read reference docs** — Load all `.md` files under `references/`
6. **Read examples** — Load all `.yaml` files under `references/examples/`

### Phase 2: Diff

Compare codebase reality against canonical project docs. Flag discrepancies:

| Check | What It Catches |
|-------|----------------|
| CLI flags documented vs parsed | Undocumented or removed flags |
| Phase names in YAML vs docs | Stale phase references |
| Error codes in code vs docs | Missing or phantom error codes |
| Public API vs documented API | Undocumented exports |
| Example YAML validity | Examples that don't match schema |
| Test count | "X tests" claims vs actual count |

### Phase 3: Update

Write updates **only** to canonical project docs — never to SKILL.md or skill-internal files.

**Canonical doc updates:**
- `--architecture` (default: `docs/01_ARCHITECTURE_SPEC.md`) — system boundaries, design decisions
- `--spec` (default: `docs/02_DEVELOPER_SPEC.md`) — developer-facing workflows, commands, conventions
- `--user-manual` (default: `docs/03_USER_MANUAL.md`) — user-facing CLI behavior and examples
- `docs/99_EXPERIENCE.md` (always fixed path) — durable lessons from bugs, fixes, debugging

Only update canonical docs when the code changes materially affect their content. Skip if no relevant changes found.

### Phase 4: Validate

1. **Internal consistency** — Cross-reference doc claims against actual code
2. **Example validity** — Run `orchestrator validate` on each example YAML (if available)
3. **No orphan references** — Ensure no doc references deleted code

## Output

Report what was found and what changed:

```
▶ Dev Docs: plugins/rd3/skills/orchestration-v2/

  Scanned:
    14 source files, 6 test files, 7 reference docs, 4 examples

  Discrepancies found: 3
    ✗ cli-reference.md lists --source flag — not parsed in run.ts
    ✗ default.yaml has docs phase — removed from schema
    ✗ "4445 tests" in comment — actual count is 4443

  Updated:
    ✓ docs/01_ARCHITECTURE_SPEC.md — phase DAG section updated
    ✓ docs/02_DEVELOPER_SPEC.md — CLI flags synced
    ✓ docs/03_USER_MANUAL.md — examples updated

  Skipped (no changes needed):
    docs/99_EXPERIENCE.md
```

## Rules

1. **Read before write** — Never overwrite a doc without reading it first
2. **SKILL.md is read-only** — SKILL.md is the skill author's source of truth; this command never modifies it
3. **Preserve structure** — Update in-place; don't reorganize sections
4. **No speculation** — Only document what the code actually does, not what it should do
5. **Minimal diffs** — Change only what's stale; don't rewrite stable sections
6. **Diagrams as Mermaid** — If a doc needs a diagram, use fenced Mermaid blocks
7. **No boilerplate** — Don't add placeholder sections or TODO markers

## Examples

```bash
# Refresh docs for orchestration-v2 skill
/rd3:dev-docs plugins/rd3/skills/orchestration-v2/

# Preview changes without writing
/rd3:dev-docs plugins/rd3/skills/orchestration-v2/ --dry-run

# Refresh docs for a specific skill by name
/rd3:dev-docs rd3:code-docs

# Skip scanning test files
/rd3:dev-docs plugins/rd3/skills/tasks/ --skip-tests

# Target a command folder
/rd3:dev-docs plugins/rd3/commands/

# Target an entire plugin
/rd3:dev-docs plugins/rd3/

# With custom canonical doc paths
/rd3:dev-docs plugins/rd3/skills/orchestration-v2/ --architecture docs/ARCH.md --spec docs/SPEC.md --user-manual docs/MANUAL.md
```

## Scope Guidance

| Target Scope | What Gets Updated |
|-------------|-------------------|
| Single skill folder (`plugins/rd3/skills/xxx/`) | Canonical docs affected by that skill |
| Commands folder (`plugins/rd3/commands/`) | Canonical docs affected by commands |
| Full plugin (`plugins/rd3/`) | All canonical docs affected by the plugin |

For full-plugin scans, process each skill folder independently to keep changes atomic.

## See Also

- **rd3:code-docs**: Cumulative project documentation refresh (canonical docs like architecture, developer spec)
- **rd3:dev-run**: Pipeline-driven task execution
- **rd3:dev-verify**: Verification chain execution
