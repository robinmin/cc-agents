---
wbs: "0385"
name: Redesign rd3:dev-refine as standalone command independent of rd3:orchestration-v2
status: completed
created_at: "2026-04-16"
updated_at: 2026-04-16T01:13:56.638Z
preset: standard
feature_id: ""
tags: [slash-command, standalone, request-intake, refinement]
background: "Strip orchestration-v2 dependency from dev-refine. Make it a thin wrapper around request-intake skill. Add --focus, --description, --auto flags. Remove --channel since refinement is interactive Q&A."
requirements: "1. Remove orchestration-v2 dependency. 2. Add --focus flag mapped to skill question taxonomy. 3. Add --description flag to guide Q&A. 4. Remove --channel flag. 5. Update allowed-tools. 6. Evaluate with cc-commands."
solution: "Rewrite dev-refine.md as thin wrapper. Delegate to request-intake skill --mode refine. --focus controls question categories. --description guides synthesis. --auto skips interactive Q&A. No --channel flag."
design: "dev-refine = thin wrapper (no orchestration-v2). request-intake --mode refine = skill. Fat Skill, Thin Wrapper pattern."
plan: "Phase 1: Read current files. Phase 2: Rewrite command. Phase 3: Evaluate and validate."
source:
---

### Background

#### Current State

`plugins/rd3/commands/dev-refine.md` (72 lines) is a thin wrapper that delegates entirely to `rd3:orchestration-v2`:

```
dev-refine.md → orchestration-v2 --preset refine → request-intake --mode refine
```

The orchestration-v2 layer adds no value here — it just passes through to `request-intake` with `execution_channel` injected. This is a wasted hop.

#### Why Redesign

1. **Orchestration-v2 dependency** — users can't run `dev-refine` without the full pipeline
2. **Interactive Q&A workflow** — refinement inherently requires one agent to ask questions and wait for answers
3. **`--channel` is unnecessary** — you can't delegate interactive Q&A to another agent cleanly
4. **No focus control** — users always get all 20 questions, even when only some categories matter

#### Key Design Decisions (Agreed with Robin)

| Decision | Rationale |
|----------|-----------|
| Remove `--channel` | Refinement is interactive Q&A — can't delegate to another agent cleanly |
| Add `--focus` | Control which Q&A categories to ask about |
| Add `--description` | Guide Q&A synthesis toward user's intent |
| Keep `--auto` | Skip interactive Q&A, use AI synthesis only |
| Standalone wrapper | Delegate directly to `request-intake --mode refine` |

### What to Read First

1. `plugins/rd3/commands/dev-refine.md` — current command file
2. `plugins/rd3/skills/request-intake/SKILL.md` — source skill with `refine` mode
3. `plugins/rd3/skills/request-intake/references/question-taxonomy.md` — question templates
4. `plugins/rd3/commands/dev-review.md` — reference for thin-wrapper pattern

### Files NOT to Modify

- `plugins/rd3/skills/request-intake/SKILL.md` — do NOT modify the skill itself
- `plugins/rd3/skills/orchestration-v2/SKILL.md` — do NOT modify
- `plugins/rd3/commands/dev-run.md` — do NOT modify

---

### Background

Strip `orchestration-v2` dependency from `dev-refine`. Make it a thin wrapper around `request-intake --mode refine`. Add `--focus` to control Q&A categories. Add `--description` to guide synthesis. Remove `--channel` since refinement is interactive Q&A.

### Design

Fat Skill, Thin Wrapper pattern.

- `dev-refine` = thin wrapper (direct to `request-intake --mode refine`, no orchestration-v2)
- `--focus` flag maps to skill's question taxonomy categories
- `--description` flag guides Q&A synthesis
- `--auto` skips interactive Q&A
- No `--channel` flag (refinement is single-agent interactive)

### Plan

Phase 1: Read current files (`dev-refine.md`, `request-intake` skill).

Phase 2: Rewrite `dev-refine.md` as thin wrapper with new flags.

Phase 3: Evaluate with `cc-commands evaluate`.

Phase 4: Run `bun run check`.

### Requirements

#### REQ-0385-1: Remove Orchestration-v2 Dependency

1. The command MUST NOT delegate to `rd3:orchestration-v2`
2. The command MUST delegate directly to `rd3:request-intake` skill with `--mode refine`
3. The workflow section MUST show the direct delegation pattern

### REQ-0385-2: Add `--focus` Flag

1. The `--focus` flag controls which Q&A categories to ask about
2. Valid values:

| Value | Q&A Categories Included |
|-------|----------------------|
| `all` | All 6 categories (default) |
| `requirements` | Scope + Acceptance Criteria + Purpose |
| `background` | Purpose only |
| `constraints` | Constraints + Dependencies + Timeline |
| `acceptance` | Acceptance Criteria + Users |
| `quick` | Scope + Acceptance only (fastest) |

3. The `--focus` value is passed to the skill via `--domain` or a custom flag
4. If `--focus` is `all`, ask all relevant categories
5. If `--focus` is a specific value, prioritize that category

**Mapping to skill input:**

The `request-intake` skill accepts `domain_hints?: string[]`. The `--focus` value can be passed as a domain hint to guide question selection. Additionally, the `--description` field provides context.

### REQ-0385-3: Add `--description` Flag

1. The `--description` flag provides context hint to guide refinement
2. Passed to the skill's `description?: string` field
3. Use cases:
   - `/rd3:dev-refine 0274 --description "make it production-ready"` → guides toward reliability, observability, security questions
   - `/rd3:dev-refine 0274 --description "performance critical"` → guides toward benchmarks, latency, scaling questions
   - `/rd3:dev-refine 0274` (no description) → generic gap analysis

### REQ-0385-4: Remove `--channel` Flag

1. The `--channel` flag MUST be removed entirely
2. Rationale: Refinement is an interactive Q&A workflow — you can't delegate interactive Q&A to another agent cleanly
3. The `--channel` column in Arguments table and examples must be removed
4. The Workflow section must NOT contain any delegation to `rd3:run-acp` or `acpx`

### REQ-0385-5: Keep `--auto` Flag

1. The `--auto` flag skips interactive Q&A and uses AI synthesis only
2. When `--auto` is set, the skill runs in fully automated mode
3. When `--auto` is NOT set (default), the skill asks interactive questions

### REQ-0385-6: Update `allowed-tools`

1. Add `Edit` to `allowed-tools` (skill may need to update task file)
2. Current: `["Read", "Glob", "Bash", "Skill"]`
3. New: `["Read", "Glob", "Bash", "Edit", "Skill"]`

### REQ-0385-7: Preserve Input Detection

1. The smart positional detection for `task-ref` must remain:
   - Digits only → WBS number
   - Ends with `.md` → File path

### REQ-0385-8: Update Examples

1. Add examples for `--focus` values
2. Add examples for `--description`
3. Add examples for `--auto`
4. Remove all `--channel` examples

### REQ-0385-9: Update "See Also"

1. Remove reference to `/rd3:dev-run`
2. Remove reference to `rd3:run-acp`
3. Keep reference to `rd3:request-intake`
4. Add reference to `/rd3:dev-verify` and `/rd3:dev-review` for context

---

### Solution

#### Phase 1: Rewrite Command as Thin Wrapper

Read `plugins/rd3/commands/dev-refine.md`, then rewrite it as a thin wrapper (~80 lines).

#### New Argument Interface

```
argument-hint: "<task-ref> [--description <text>] [--focus <all|requirements|background|constraints|acceptance|quick>] [--auto]"
```

#### New Arguments Table

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `task-ref` | Yes | — | WBS number or `.md` file path |
| `--description` | No | — | Context hint guiding refinement direction |
| `--focus` | No | `all` | Q&A categories to prioritize |
| `--auto` | No | `false` | Skip interactive Q&A, use AI synthesis |

#### New Workflow Section

```bash
# Direct delegation to request-intake skill (refine mode)
Skill(skill="rd3:request-intake", args="<task-ref> --mode refine --description <description> --domain <focus>")

# With auto mode
Skill(skill="rd3:request-intake", args="<task-ref> --mode refine --description <description> --domain <focus> --auto")
```

**Note**: The skill's `description` field guides synthesis. The skill's `domain_hints` can be mapped from `--focus` to guide question selection.

#### Argument Parsing in Skill

The skill's input schema:
```typescript
interface RequestIntakeInput {
  task_ref: string;
  description?: string;       // from --description
  domain_hints?: string[];     // from --focus
  mode?: 'create' | 'refine'; // always 'refine'
  execution_channel?: string;   // NOT used by command
}
```

The command passes:
- `task_ref` → positional argument
- `description` → `--description` value
- `domain_hints` → derived from `--focus` (see mapping below)
- `mode` → always `refine`
- `execution_channel` → NOT passed (removed from command)

#### Focus to Domain Hints Mapping

| `--focus` Value | Skill Domain Hints | Question Categories Prioritized |
|----------------|-------------------|-------------------------------|
| `all` | `[]` (no hints) | All categories |
| `requirements` | `["requirements", "scope", "acceptance"]` | Scope + Acceptance Criteria + Purpose |
| `background` | `["purpose"]` | Purpose only |
| `constraints` | `["constraints", "timeline", "dependencies"]` | Constraints + Dependencies + Timeline |
| `acceptance` | `["acceptance", "users"]` | Acceptance Criteria + Users |
| `quick` | `["scope", "acceptance"]` | Scope + Acceptance only |

The skill uses `domain_hints` to skip irrelevant question categories and prioritize relevant ones.

#### Input Detection (same as current)

```bash
if [[ "$TASK_REF" == *.md ]]; then
  tasks show "$TASK_REF" | head -60
  WBS=$(tasks get-wbs "$TASK_REF")
elif [[ "$TASK_REF" =~ ^[0-9]+$ ]]; then
  tasks show "$TASK_REF"
  WBS="$TASK_REF"
fi
```

#### New Examples Section

```bash
# Basic refinement
/rd3:dev-refine 0274

# With context hint
/rd3:dev-refine 0274 --description "make it production-ready"

/rd3:dev-refine 0274 --description "performance critical path"

/rd3:dev-refine 0274 --description "security sensitive"

/rd3:dev-refine 0274 --description "developer tooling improvement"

/rd3:dev-refine 0274 --description "refactoring technical debt"

/rd3:dev-refine 0274 --description "API endpoint addition"

# With focus (skip some question categories)
/rd3:dev-refine 0274 --focus requirements    # Scope + acceptance criteria focus
/rd3:dev-refine 0274 --focus background     # Purpose/context focus
/rd3:dev-refine 0274 --focus constraints    # Limits + dependencies focus
/rd3:dev-refine 0274 --focus acceptance     # Acceptance criteria focus
/rd3:dev-refine 0274 --focus quick         # Fast refinement

# Combined: context + focus
/rd3:dev-refine 0274 --description "make it production-ready" --focus requirements

# Auto mode (no interactive Q&A)
/rd3:dev-refine 0274 --auto

/rd3:dev-refine 0274 --description "performance critical" --focus efficiency --auto
```

#### New "When to Use" Section

```markdown
## When to Use

**Activate `rd3:dev-refine` for:**
- Task has vague or incomplete Requirements section
- Requirements lack acceptance criteria or testability
- Background section is too brief or missing context
- You want to clarify scope boundaries
- You want to add constraints or dependencies

**Use `--description` to:**
- Guide refinement toward a specific context (e.g., "production-ready", "performance critical")
- The description hint influences which questions are prioritized

**Use `--focus` to:**
- Skip question categories you don't need
- Accelerate refinement when you only need specific sections

**Use `--auto` to:**
- Skip interactive Q&A and use AI synthesis only
- Useful for CI or when you don't have time for Q&A

**Activate `rd3:dev-verify` or `rd3:dev-review` for:**
- Verifying implementation quality (not refining requirements)
```

#### New "See Also" Section

```markdown
## See Also

- **rd3:request-intake**: Requirements elicitation skill (source for this command)
- **rd3:dev-verify**: Task-oriented verification (Phase 7 + Phase 8)
- **rd3:dev-review**: Source-oriented code review
```

#### Platform Notes

```markdown
## Platform Notes

| Platform | Skill() | Recommended |
|----------|---------|-------------|
| Claude Code | ✅ | `Skill()` |
| pi | ❌ | Direct skill invocation |
| Codex/OpenCode | ❌ | Direct skill invocation |
| OpenClaw | ❌ | Direct skill invocation |

**Note**: No `--channel` flag since refinement is interactive Q&A and cannot be cleanly delegated to another agent.
```

---

## Key Reference: Question Taxonomy

The skill has 6 question categories with ~20 templates. Each question has:

1. **Recommended options** (binary, multi-choice, scale, pattern)
2. **Custom option** (always available)
3. **Rationale** (why recommended option is suggested)

### Categories and Templates

| Category | # Templates | Purpose |
|----------|-----------|---------|
| Purpose | 2 | Core motivation, expected outcomes |
| Scope | 4 | In-scope, out-of-scope, boundaries, MVP |
| Constraints | 3 | Technical, budget, timeline |
| Dependencies | 2 | What must be ready first |
| Acceptance | 4 | How to verify success |
| Users | 2 | Who benefits, personas |
| Timeline | 2 | Deadlines, milestones |

### Refine Mode Quality Checks

The skill's `--mode refine` analyzes existing content for:

| Check | Threshold | Red Flag |
|-------|-----------|----------|
| Background length | < 100 chars | Too brief |
| Requirements empty | < 10 chars | Missing |
| Vague language | Contains "etc", "things", "stuff" | Imprecise |
| No acceptance criteria | Missing "should", "must", "verify" | Untestable |
| Compound requirements | Contains "and" + 3+ concepts | Split needed |
| No constraints | Section empty or missing | Incomplete |
| Preset unassigned | Not in frontmatter | Missing |

### Refinement Question Format

```markdown
**Question:** [Clear question about the gap]

**Options:**
1. **Yes / Recommended** — [Why this is recommended]
2. **No / Alternative** — [When to choose this instead]
3. **Custom** — [Allow user to specify]

**Recommended:** Option 1 — [Brief rationale]
```

---

### Verification Criteria

#### VC-0385-1: Orchestration-v2 Removed

- [ ] Command does NOT delegate to `rd3:orchestration-v2`
- [ ] Command delegates to `rd3:request-intake --mode refine` directly
- [ ] Workflow section shows direct delegation

### VC-0385-2: Flags Correct

- [ ] `--description` flag documented with use cases
- [ ] `--focus` flag documented with all 6 values
- [ ] `--channel` flag completely removed
- [ ] `--auto` flag preserved with correct behavior

### VC-0385-3: Focus Mapping

- [ ] All 6 `--focus` values are documented
- [ ] Mapping to skill's question categories is clear
- [ ] Examples show each `--focus` value

### VC-0385-4: Examples Updated

- [ ] Examples for `--description` with varied contexts
- [ ] Examples for `--focus` values
- [ ] Examples for `--auto` mode
- [ ] NO examples with `--channel`

### VC-0385-5: Structure and Quality

- [ ] `allowed-tools` includes `Edit`
- [ ] `argument-hint` matches actual arguments
- [ ] Smart positional detection preserved
- [ ] "When to Use" section is clear
- [ ] "See Also" references updated
- [ ] "Platform Notes" explains no `--channel`

### VC-0385-6: Evaluation

- [ ] `cc-commands evaluate` score ≥ 80% (Grade A/B)
- [ ] `bun run check` passes (lint + typecheck + tests)
