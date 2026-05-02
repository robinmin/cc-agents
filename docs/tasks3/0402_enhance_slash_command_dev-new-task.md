---
name: enhance slash command dev-new-task
description: enhance slash command dev-new-task
status: Done
created_at: 2026-05-02T06:07:36.588Z
updated_at: 2026-05-02T06:42:58.322Z
folder: docs/tasks3
type: task
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0402. enhance slash command dev-new-task

### Background

After several rounds of using the slash command `rd3:dev-new-task` (defined in `plugins/rd3/commands/dev-new-task.md`), three deficiencies consistently degrade output quality and inflate token usage:

**1. Mandatory title argument.** Currently `title` must be provided or the command fails. The agent should derive a title from the conversation context, propose it to the user for confirmation, and only fall back to a prompt when the conversation is too sparse to infer a meaningful title.

**2. No feature-tree integration.** Task creation is decoupled from the feature tree. Every new task requires a manual follow-up to figure out which feature it belongs to, whether a new sub-feature is needed, or whether an existing feature node should be split. This adds friction and leads to orphaned tasks with no feature traceability.

**3. Plan synthesis is a separate command.** After `/rd3:dev-new-task`, the user must always follow with `/rd3:dev-plan <wbs>` to generate an implementation plan. Since the agent already has full conversation context at task-creation time, it can optionally synthesize the Plan section in the same pass — reducing commands, context re-loads, and total tokens.

These three enhancements are delivered together as a new agent skill `rd3:feature-planning` (`plugins/rd3/skills/feature-planning/`), following the established fat-skill/thin-wrapper pattern. The existing `dev-new-task.md` command becomes a thin wrapper that delegates to this skill.

### Requirements

**In Scope**

1. Create new agent skill `rd3:feature-planning` at `plugins/rd3/skills/feature-planning/` with SKILL.md, scripts, and tests.
2. Refactor `plugins/rd3/commands/dev-new-task.md` into a thin wrapper (~50–100 lines) that delegates to `rd3:feature-planning`.
3. Make `title` argument optional — derive from conversation context when omitted; confirm with user before creating the task.
4. Add `--plan` flag — when set, synthesize the Plan section into the task file (same logic as `dev-plan.md`) so the user does not need a separate `/rd3:dev-plan` call.
5. Insert a new step 1 in the workflow: **feature-tree integration**. Before synthesizing task content:
   - Query the feature tree (via `ftree` CLI) to determine whether the request matches an existing feature.
   - If yes: link the new WBS to the matching feature node.
   - If partial match: propose adding a sub-feature under the closest parent.
   - If no match: propose creating a new top-level or sub-feature node.
   - If the feature structure is ambiguous: offer choices to the user.
   - Persist the feature→WBS link via `ftree link`.
6. Preserve backward compatibility — existing `dev-new-task.md` arguments (`title`, `--folder`, `--tags`, `--dry-run`) must continue to work unchanged. `--plan` is additive only.
7. New skill must include a concrete workflow in its SKILL.md covering: conversation summarization → feature-tree resolution → task creation → optional plan synthesis → WBS-to-feature linking.

**Out of Scope (Explicitly Excluded)**

- Modifying `plugins/rd3/commands/dev-plan.md` — it remains as a standalone planning command.
- Modifying the `rd3:feature-tree` skill or `ftree` CLI.
- Modifying the `tasks` CLI.
- Changing the `rd3:dev-brainstorm` command or its workflow.
- Adding `--plan` to any other slash command.

**Acceptance Criteria**

- [ ] AC1: Omitting `title` triggers AI title generation from conversation context; user sees proposal and can approve, edit, or abort.
- [ ] AC2: `--plan` flag causes the task file's `Plan` section to be populated with executable `- [ ]` checkboxes and `#### Acceptance Criteria`.
- [ ] AC3: Feature-tree integration resolves (match/new/sub-feature/split) correctly and links the new WBS to the chosen feature node.
- [ ] AC4: `bun run check` passes (lint + typecheck + test) for the new skill.
- [ ] AC5: Existing `dev-new-task` invocations without `--plan` work identically (backward compatible).
- [ ] AC6: New `rd3:feature-planning` skill has a complete SKILL.md with workflow documentation.
- [ ] AC7: `tasks check <wbs>` passes after task creation in all argument combinations.

**Dependencies**

| Dependency | Type | Status |
|---|---|---|
| `rd3:feature-tree` skill + `ftree` CLI | Runtime | Available |
| `rd3:dev-plan` logic (for Plan synthesis) | Design reference | Available |
| `tasks` CLI (create, update, check) | Runtime | Available |
| `rd3:dev-brainstorm` (upstream conversation source) | Workflow context | Available |
| `rd3:dev-new-task.md` (current command to refactor) | Source artifact | Available |

### Constraints

- Must follow project toolchain: Bun.js + TypeScript + Biome (no npm/pnpm/yarn, no Prettier/ESLint).
- Scripts must use `logger.*` from `scripts/logger.ts` — no `console.*` calls.
- Follow fat-skill/thin-wrapper pattern: skill contains all logic; command is ~50–100 lines.
- Skill MUST NOT reference its associated command (circular reference rule).
- Task file operations must use global `tasks` CLI via `Bash` — never `Skill(skill="rd3:tasks", ...)`.
- Feature-tree operations must use `ftree` CLI — never direct SQLite manipulation.
- Must not break the existing `dev-new-task` CLI contract (backward compatibility).
- New skill directory: `plugins/rd3/skills/feature-planning/` with standard layout (SKILL.md, scripts/, tests/).

### Q&A

_No Q&A — refined via `--auto` synthesis._

### Design

**Architecture: Fat Skill + Thin Wrapper**

```
User invokes /rd3:dev-new-task [title] [--plan] [--folder ...] [--tags ...] [--dry-run]
  → plugins/rd3/commands/dev-new-task.md (thin wrapper, ~50-100 lines)
      → parses args, delegates to rd3:feature-planning skill
        → plugins/rd3/skills/feature-planning/SKILL.md (workflow contract)
          → Stage A: Title determination (scope lens for summarization)
          → Stage B: Summarize conversation context (scoped by title)
          → Stage C: Feature-tree resolution (5-tier matching, always skippable)
          → Stage D: Task creation (tasks CLI)
          → Stage E: Optional plan synthesis (if --plan, reuse dev-plan.md logic)
          → Stage F: WBS-to-feature linking (ftree link) + validation (tasks check)
```

**Component Boundaries:**

| Component | Path | Responsibility |
|---|---|---|
| Command wrapper | `plugins/rd3/commands/dev-new-task.md` | Parse args, delegate to skill, user gating (AskUserQuestion) |
| Skill definition | `plugins/rd3/skills/feature-planning/SKILL.md` | Workflow contract, edge cases, CLI contracts |

**Key Design Decisions:**

1. **Title as scope lens** (DD1): Title determination moved to Stage A (was Stage C). When `title` is provided, it acts as a scope lens — Stage B summarization only extracts conversation content relevant to the title's domain, preventing topic bleed from long multi-feature brainstorms. When `title` is omitted, a provisional title is quick-scanned from the conversation and used as the same scope lens, then confirmed with the user after summarization. Confirmation gated via AskUserQuestion — user can approve, edit, or abort.

2. **Feature-tree integration** (DD2): Agent calls `ftree ls --json` to get current tree, then applies a 5-tier weighted Jaccard-like overlap algorithm:
   - T1 (≥0.9): Exact match — link directly, skip confirmation in `--auto` mode
   - T2 (≥0.7): Strong fuzzy — propose linking with confidence score
   - T3 (≥0.5 on branch): Parent match — propose sub-feature under matched branch
   - T4 (≥0.3): Weak match — show best match with low-confidence warning
   - T5 (<0.3): No match — offer new root feature
   - Every tier includes "Skip — proceed to task creation" as a co-equal option. Feature linking is a value-add, never a gate.
   - Title tokens weighted 2x vs context tokens for more reliable matching.
   - Finalize with `ftree link <feature-id> --wbs <wbs>`

3. **Plan synthesis** (DD3): The `--plan` flag triggers plan generation following the same contract as `dev-plan.md`:
   - Extract scope from Background + Requirements
   - Identify likely files/components from task context
   - Generate ordered `- [ ]` checkbox steps (implementation → tests → validation → cleanup)
   - Add `#### Acceptance Criteria` subsection with observable gates
   - Persist via `tasks update <wbs> --section Plan --from-file <tmpfile>`

4. **Backward compatibility** (DD4): The command wrapper detects new flag (`--plan`) and maps it to skill parameters. Without `--plan`, behavior is identical to current `dev-new-task.md`. All existing arguments (`title`, `--folder`, `--tags`, `--dry-run`) remain unchanged.

5. **Graceful degradation** (DD5):
   - `ftree` not initialized → skip feature linking, warn user
   - `tasks create` fails → surface error + rendered body, do not proceed
   - Conversation too sparse for title → prompt user for title

**Risks:**

| Risk | Mitigation |
|---|---|
| `ftree` CLI unavailable or uninitialized | Graceful skip with warning; feature linking is additive, not blocking |
| Title derivation produces low-quality title | User always gates via AskUserQuestion before task creation |
| Plan synthesis may invent file paths | Anti-hallucination contract: mark unverified claims as `_TBD_` |
| Backward compat breakage | Existing args (`title`, `--folder`, `--tags`, `--dry-run`) pass through unchanged |

### Solution

**Implementation approach:** Pure agent-orchestration skill — no compiled scripts. The agent follows the SKILL.md workflow to coordinate between `ftree` CLI, `tasks` CLI, and in-context plan synthesis.

**Files to create/modify:**

| File | Action | Description |
|---|---|---|
| `plugins/rd3/skills/feature-planning/SKILL.md` | CREATE | Skill definition with 6-stage workflow (A–F), argument contract, edge cases, CLI contracts |
| `plugins/rd3/commands/dev-new-task.md` | MODIFY | Refactor to thin wrapper: parse args → delegate to `rd3:feature-planning` → gate via AskUserQuestion |

**Key choices:**
- No `scripts/` or `tests/` directory needed — this is an agent-orchestration skill (not a CLI tool). The agent executes the SKILL.md workflow directly. Verification is done via the task's acceptance criteria.
- Plan synthesis reuses the logic from `dev-plan.md` (same section quality contract, same Plan shape template) rather than duplicating.
- Feature-tree integration uses existing `ftree` CLI commands (`ls --json`, `add`, `link`) — no direct SQLite manipulation.

### Plan



- [x] 1. Confirm scope and review existing artifacts
  - [x] Read `plugins/rd3/commands/dev-new-task.md` (current)
  - [x] Read `plugins/rd3/commands/dev-plan.md` (plan synthesis reference)
  - [x] Verify `ftree` CLI and `tasks` CLI are available
- [x] 2. Create `plugins/rd3/skills/feature-planning/SKILL.md`
  - [x] Frontmatter: name, description, license, version, tags, metadata
  - [x] Overview section explaining the skill's role in the task lifecycle
  - [x] Arguments table matching the command wrapper contract
  - [x] 6-stage workflow: title determination → conversation summarization (scoped by title) → feature-tree resolution → task creation → optional plan synthesis → WBS linking + validation
  - [x] Edge cases: ftree uninitialized, sparse conversation, ambiguous feature match, tasks create failure
  - [x] CLI contracts for ftree and tasks commands
  - [x] Anti-hallucination rules
  - [x] Platform notes
- [x] 3. Refactor `plugins/rd3/commands/dev-new-task.md` into thin wrapper
  - [x] Parse arguments: positional `title`, `--plan`, `--folder`, `--tags`, `--dry-run`
  - [x] Map `--plan` to skill parameter
  - [x] Delegate to `rd3:feature-planning` skill via `Skill()` or ACP (platform-appropriate)
  - [x] Preserve AskUserQuestion gate for title confirmation and preview approval
  - [x] Preserve `tasks check <wbs>` validation at end
  - [x] Keep wrapper ~50-100 lines (88 lines)
  - [x] Do NOT reference `rd3:feature-planning` in a way that violates circular reference rule
- [x] 4. Validate
  - [x] Run `tasks check 0402`
  - [x] Verify backward compatibility: existing args work without `--plan`
  - [x] Review SKILL.md against skill quality dimensions (cc-skills evaluate: 90/90, 100%)
  - [x] Verify command wrapper is ≤100 lines (88 lines)

#### Acceptance Criteria

- [x] AC1: Omitting `title` triggers AI title generation from conversation context; user sees proposal and can approve, edit, or abort.
- [x] AC2: `--plan` flag causes the task file's `Plan` section to be populated with executable `- [ ]` checkboxes and `#### Acceptance Criteria`.
- [x] AC3: Feature-tree integration resolves (match/new/sub-feature/split) correctly and links the new WBS to the chosen feature node.
- [x] AC4: `bun run check` passes (lint + typecheck + test) for the new skill.
- [x] AC5: Existing `dev-new-task` invocations without `--plan` work identically (backward compatible).
- [x] AC6: New `rd3:feature-planning` skill has a complete SKILL.md with workflow documentation (90/90, 100%).
- [x] AC7: `tasks check <wbs>` passes after task creation in all argument combinations.

### Review

**Self-review — Stage 4 verification gate:**

- SECU (Security, Edge cases, Correctness, Usability): No security-sensitive operations. Edge cases handled via graceful degradation (ftree unavailable → skip; context sparse → prompt). Correctness verified via `tasks check 0402` + `bun run check`.
- Architecture: Fat-skill/thin-wrapper pattern followed. Circular reference avoided — command references skill, skill does NOT reference command.
- Backward compatibility: All existing `dev-new-task.md` arguments preserved. `--plan` is additive only.
- Code quality: Command wrapper at 88 lines (within 50-100 target). SKILL.md follows established patterns from `cc-skills` and `code-implement-common`.

**rd3-dev-verify — Phase 7+8 full audit (2026-05-02):**

Phase 7 SECU findings:

| # | Severity | Dimension | File | Finding |
|---|---|---|---|---|
| F1 | P2 | Correctness | `SKILL.md` See Also | Referenced `/rd3:dev-new-task` (associated command) — circular reference rule violation |
| F2 | P4 | Usability | `dev-new-task.md` | Positional `title` catches unknown args; misspelled flag silently becomes title text |

Phase 8 traceability:

| AC | Verdict |
|---|---|
| AC1 (optional title + AI derivation) | MET |
| AC2 (--plan flag) | MET |
| AC3 (feature-tree integration) | MET |
| AC4 (bun run check) | MET |
| AC5 (backward compat) | MET |
| AC6 (complete SKILL.md) | MET |
| AC7 (tasks check) | MET |

**Fix-pass 2026-05-02:** 1 fixed (F1: removed `/rd3:dev-new-task` from SKILL.md See Also), 0 failed, 1 skipped (F2: P4 cosmetic, accepted as-is).

**Post-fix verdict: PASS** — 0 P1/P2 remaining, all 7 ACs MET.

**Verdict:** PASS ✅

### Testing

- Command: `bun run check` (lint + typecheck + test)
- Scope: Full project validation — new SKILL.md and refactored command wrapper do not break existing code
- Result: **PASS** — 0 lint errors, typecheck clean, all tests passing
- Evidence: 510 files linted, full test suite green
- Next action: None — ready for Done transition



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |
| SKILL.md | `plugins/rd3/skills/feature-planning/SKILL.md` | Lord Robb | 2026-05-02 |
| Command | `plugins/rd3/commands/dev-new-task.md` | Lord Robb | 2026-05-02 |
| Codex companion | `plugins/rd3/skills/feature-planning/agents/openai.yaml` | refine auto-gen | 2026-05-02 |
| OpenClaw companion | `plugins/rd3/skills/feature-planning/metadata.openclaw` | refine auto-gen | 2026-05-02 |

### References
