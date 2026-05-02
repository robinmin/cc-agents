---
name: feature-planning
description: "Capture a brainstorm conversation as a new task file with feature-tree integration and optional plan synthesis. Phase 1+2 combined entry point that replaces the two-command dev-new-task → dev-plan sequence when --plan is used."
license: Apache-2.0
version: 1.0.0
created_at: 2026-05-02
updated_at: 2026-05-02
platform: rd3
tags: [task-creation, feature-tree, plan-synthesis, requirements, workflow]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,opencode,openclaw,antigravity,pi"
  category: orchestration
  interactions:
    - pipeline
  pipeline_steps:
    - title-determination
    - conversation-summary
    - feature-resolution
    - task-creation
    - plan-synthesis
    - feature-linking
see_also:
  - rd3:feature-tree
  - rd3:tasks
  - rd3:dev-plan
---

# rd3:feature-planning — Feature-Aware Task Creation with Optional Plan Synthesis

## Overview

Convert the in-context conversation into a new task file, resolve the owning feature via `ftree` CLI, and optionally synthesize an implementation Plan in a single pass. This skill replaces the two-step sequence (brainstorm → task → plan) when `--plan` is used, reducing context re-loads and total token usage.

## Quick Start

```bash
# Capture conversation with auto-derived title + feature-tree linking
Skill(skill="rd3:feature-planning", args="title=Add OAuth support")

# With plan synthesis (bypasses separate /rd3:dev-plan)
Skill(skill="rd3:feature-planning", args="title=Add OAuth support --plan")

# Dry-run preview
Skill(skill="rd3:feature-planning", args="title=Add OAuth support --dry-run")

# Agent-driven (title omitted — derived from conversation)
Skill(skill="rd3:feature-planning", args="")
```

## When to Use

- After `/rd3:dev-brainstorm` when the conversation is ready to capture as a task.
- To create a task and link it to the feature tree in one step.
- To create a task with a pre-synthesized Plan (bypassing separate `/rd3:dev-plan`).

## Arguments

| Arg / Flag | Required | Default | Description |
|---|---|---|---|
| `title` | No | Derived from conversation | Task name passed to `tasks create` (≤80 chars) |
| `--plan` | No | `false` | Synthesize Plan section into the task file |
| `--folder <path>` | No | `tasks` config `active_folder` | Target folder override |
| `--tags <a,b>` | No | none | Forwarded to `tasks create --tags` |
| `--dry-run` | No | `false` | Print synthesized markdown; do not create or update any file |

## Workflow

The skill executes a 6-stage workflow. Each stage is gated — if a stage cannot complete (e.g., `ftree` not initialized), it degrades gracefully and continues.

### Stage A: Title Determination

The title acts as a **scope lens** for conversation summarization in Stage B — it narrows extraction when a long brainstorm covers multiple topics.

**If `title` is provided:**

1. Validate (≤80 chars, non-empty).
2. Use as the scope lens for Stage B summarization — only extract conversation content relevant to this title's domain.
3. Proceed directly to Stage B.

**If `title` is omitted:**

1. Quick-scan the conversation for the dominant topic (first substantive sentence or most-repeated domain term).
2. Derive a provisional title: truncate to ≤80 characters, ending on a word boundary.
3. Use the provisional title as the scope lens for Stage B summarization.
4. After Stage B, present the derived title via `AskUserQuestion` with options: approve, edit (freeform), abort.
5. If the conversation has fewer than ~5 substantive turns: warn that context may be too sparse; still offer the derived title but flag potential low quality.

### Stage B: Summarize Conversation Context

Extract from the in-context conversation, **scoped by the title from Stage A**:

- **Background** (always) — motivation, pain points, desired outcome relevant to title scope.
- **Requirements** (always) — required behavior, constraints, success signals as bullets.
- **Q&A** (only if clarifications occurred) — verbatim or close-paraphrase Q/A pairs.
- **Design** (only if discussed) — opportunistic capture; mark `_partial_` if thin.
- **Solution** (only if discussed) — opportunistic capture; mark `_partial_` if thin.

**Quality rules:**
- Paraphrase only from the conversation; do not invent unsupported claims.
- Mark unverifiable specifics as `_TBD_`.
- Never populate Plan / Review / Testing / Artifacts / References — Plan is Stage E; others are downstream.

### Stage C: Feature-Tree Resolution

Resolve which feature this task belongs to. **Feature linking is a value-add, not a gate — task creation always proceeds regardless of match outcome.**

#### Step 1: Check Availability

```bash
ftree ls --json
```

If `ftree` is unavailable or uninitialized → skip this stage entirely, log a warning, continue to Stage D.

#### Step 2: Extract and Normalize Search Tokens

From the **title** (Stage A) and **conversation summary** (Stage B):

1. **Title tokens** (weight 2x): normalize title — lowercase, strip punctuation, split on word boundaries, remove stop words (a, the, in, of, for, to, and, or, is).
2. **Context tokens** (weight 1x): extract feature nouns, module names, and tool references from Background + Requirements sections. Normalize same as title.
3. **Combined token set** = title tokens × 2 + context tokens (duplicates increase weight).

#### Step 3: Score Every Leaf Feature

For each leaf feature in the JSON tree, compute a **Jaccard-like overlap score**:

```
score = |combined_tokens ∩ feature_title_tokens| / |combined_tokens|
```

Where `feature_title_tokens` are the normalized tokens from the feature's title.

Also score branch (parent) features independently — these inform Tier 3 decisions even when no leaf matches.

#### Step 4: Classify into Decision Tier

| Tier | Score Range | Meaning | Default Action | Confidence |
|---|---|---|---|---|
| **T1 — Exact** | ≥ 0.9 | Title is a near-exact match for a leaf feature | LINK to this feature | HIGH |
| **T2 — Strong** | ≥ 0.7 | High keyword overlap with a leaf feature | LINK to best match | HIGH |
| **T3 — Parent** | ≥ 0.5 on branch, no leaf ≥ 0.7 | Matches a parent category but no specific leaf | ADD sub-feature under parent | MEDIUM |
| **T4 — Weak** | ≥ 0.3 | Some overlap, ambiguous | SHOW best match + alternatives | LOW |
| **T5 — None** | < 0.3 or empty tree | No meaningful match | CREATE new root feature | NONE |

#### Step 5: Present Decision with Explicit Skip Option

Every tier presents "Skip — proceed to task creation" as a **co-equal option** (always option 3 or 4). The agent must not block on feature resolution.

**T1 — Exact match:**

| Option | Action |
|---|---|
| 1. Link to `{feature-title}` | `ftree link {id} --wbs <wbs>` after task creation |
| 2. Skip — proceed to task creation | Continue without feature linking |

`--auto` mode: select option 1 without prompting.

**T2 — Strong match:**

| Option | Action |
|---|---|
| 1. Link to `{feature-title}` (score: {n}%) | `ftree link {id} --wbs <wbs>` |
| 2. Create new feature instead | `ftree add --title "{title}"` before task creation |
| 3. Skip — proceed to task creation | Continue without feature linking |

**T3 — Parent match:**

| Option | Action |
|---|---|
| 1. Add sub-feature under `{parent-title}` | `ftree add --title "{title}" --parent {id}` before task creation |
| 2. Create as new root-level feature | `ftree add --title "{title}"` |
| 3. Skip — proceed to task creation | Continue without feature linking |

**T4 — Weak match:**

| Option | Action |
|---|---|
| 1. Link to best match `{feature-title}` (low confidence: {n}%) | `ftree link {id} --wbs <wbs>` |
| 2. Create new root-level feature | `ftree add --title "{title}"` |
| 3. Skip — proceed to task creation | Continue without feature linking |

**T5 — No match:**

| Option | Action |
|---|---|
| 1. Create new root-level feature `{title}` | `ftree add --title "{title}"` before task creation |
| 2. Skip — proceed to task creation | Continue without feature linking |

#### Step 6: Execute

| Decision | CLI Command | Timing |
|---|---|---|
| Link to existing | `ftree link <feature-id> --wbs <wbs>` | After Stage D (task exists) |
| Create new feature | `ftree add --title "<name>" [--parent <id>]` | Before Stage D (need feature-id) |
| Skip | None | Continue to Stage D |

**Design principle:** The user can always skip. Feature-tree traceability improves quality but must never block forward progress. Orphaned WBS tasks are acceptable — they can be linked later via `ftree link`.

### Stage D: Task Creation

**Always:**

```bash
tasks create "<title>" \
  --background "<background>" \
  --requirements "<requirements>" \
  [--folder <path>] [--tags <a,b>] \
  --json
```

Parse JSON to get `wbs` and `path`.

**Conditionally:**

If Q&A, Design, or Solution were captured in Stage B:
```bash
tasks update <wbs> --section Q&A --from-file <tmpfile>
tasks update <wbs> --section Design --from-file <tmpfile>
tasks update <wbs> --section Solution --from-file <tmpfile>
```

**Dry-run:** Print the rendered task body and exact CLI commands; do not persist.

### Stage E: Optional Plan Synthesis

Only when `--plan` is set.

Follow the same plan synthesis contract as `dev-plan.md`:

1. **Extract planning inputs** from Background + Requirements:
   - Scope items, non-goals, likely files/modules, constraints, risks.
2. **Verify codebase facts** with `Read`/`Bash` before stating file paths.
3. **Synthesize Plan** with ordered `- [ ]` checkbox steps covering:
   - Scope confirmation
   - Implementation
   - Tests/verification
   - Validation
   - Cleanup
4. **Add `#### Acceptance Criteria`** subsection with observable gates from Requirements.
5. **Persist:**
   ```bash
   tasks update <wbs> --section Plan --from-file <tmpfile>
   ```

**Anti-hallucination:** Mark unverified file paths and implementation details as `_TBD_`. Do not fabricate APIs, libraries, or architectural constraints.

### Stage F: Feature Linking + Validation

1. **Link WBS to feature** (if resolved in Stage C):
   ```bash
   ftree link <feature-id> --wbs <wbs>
   ```

2. **Validate:**
   ```bash
   tasks check <wbs>
   ```

3. **Report:**
   - Created WBS + path
   - Feature link status (linked / new feature / skipped)
   - Plan status (synthesized / skipped)
   - Suggest next step: `--plan` was set → suggest `
## Section Quality Contract

| Section | Required | Source | Notes |
|---|---:|---|---|
| Background | Yes | Conversation context | Explain why this task exists |
| Requirements | Yes | User-stated goals | Include acceptance criteria |
| Q&A | Conditional | Clarification turns | Preserve user intent closely |
| Design | Conditional | Discussed architecture/UI | Mark `_partial_` if incomplete |
| Solution | Conditional | Discussed implementation approach | Mark `_partial_` if incomplete |
| Plan | Conditional | Synthesized when `--plan` | Same contract as dev-plan.md |
| Review / Testing / Artifacts / References | No | — | Downstream only |

## CLI Contract

### Feature Tree (ftree)

```bash
# Check availability and get tree
ftree ls --json

# Create new feature (when no match found)
ftree add --title "<feature-name>" [--parent <parent-id>]

# Link WBS to feature
ftree link <feature-id> --wbs <wbs>
```

### Tasks

```bash
# Create task
tasks create "<title>" \
  --background "<background>" \
  --requirements "<requirements>" \
  [--folder <path>] [--tags <a,b>] \
  --json

# Update optional sections
tasks update <wbs> --section <name> --from-file <tmpfile>

# Validate
tasks check <wbs>
```

Do not use `tasks create --content`. Do not invoke `rd3:tasks` via `Skill()`.

## Edge Cases

| Situation | Handling |
|---|---|
| `ftree` CLI unavailable or uninitialized | Warn; skip feature linking; continue with task creation |
| Conversation < 5 substantive turns | Warn at title confirmation; flag potential low quality |
| `tasks create` fails | Surface error + rendered body; do not proceed |
| Optional section update fails | Surface error; report created WBS and which sections remain pending |
| `tasks check <wbs>` fails | Report validation output; do not claim completion |
| `--dry-run` | Print title + body + exact planned commands; never mutate files |
| `title` omitted, context too sparse | Prompt user for title explicitly |
| Feature match ambiguous (multiple candidates) | Tiered scoring resolves to single best match; user confirms or skips at their tier |
| Feature-tree uninitialized or empty | T5 — offer creating first root feature, or skip |
| User skips feature linking at any tier | Task creation proceeds normally; WBS can be linked later via `ftree link` |
| `--plan` with insufficient Background/Requirements | Synthesize minimal plan; mark gaps as `_TBD_`; warn that quality may be low |

## Anti-Hallucination

- Paraphrase only from the conversation; do not invent unsupported technical claims.
- Mark unverifiable specifics as `_TBD_`.
- If codebase facts are needed for Plan synthesis, verify with `Read`/`Bash` before stating them.
- Do not invent file paths, APIs, libraries, or constraints.
- Do not populate downstream sections (Review, Testing, Artifacts, References).

## Graceful Degradation

The skill is designed to always produce a task file, even when supporting tools are unavailable:

| Tool | Unavailable Behavior |
|---|---|
| `ftree` | Skip feature linking; warn user; task still created |
| `tasks` | Fatal — cannot proceed |
| Conversation context | Prompt user; do not fabricate |

## Platform Notes

| Platform | Skill Invocation | Notes |
|---|---|---|
| Claude Code | `Skill(skill="rd3:feature-planning", args="...")` | Primary platform |
| pi | Load SKILL.md + follow workflow | ACP alternative available |
| Codex/OpenCode | ACP via `rd3-run-acp` | Use ACP delegation |
| OpenClaw/Antigravity | ACP via `rd3-run-acp` | Use ACP delegation |

## Additional Resources

- **rd3:feature-tree** SKILL.md — Feature tree management and `ftree` CLI reference
- **rd3:tasks** SKILL.md — Task file management and `tasks` CLI reference
- **rd3:dev-plan** command — Standalone plan synthesis contract reused by Stage E
- **/rd3:dev-brainstorm** — Upstream ideation that produces the conversation
- **/rd3:dev-run** — Full implement/test/verify pipeline after planning

## See Also

- **rd3:feature-tree** — Feature tree management (ftree CLI)
- **rd3:tasks** — Task file management (tasks CLI)
- **rd3:dev-plan** — Standalone plan synthesis command
- **/rd3:dev-brainstorm** — Upstream ideation that produces the conversation
- **/rd3:dev-run** — Full implement/test/verify pipeline after planning
