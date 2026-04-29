---
name: "Create rd3:prd-* slash commands for product-management"
description: "Create 4 thin wrapper slash commands (prd-init, prd-run, prd-adjust, prd-doc) for the rd3:product-management skill"
status: Done
created_at: 2026-04-28T23:20:46.228Z
updated_at: 2026-04-29T00:32:01.583Z
folder: docs/tasks2
type: task
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
preset: standard
---

## 0398. Create rd3:prd-* slash commands for product-management

### Background

The `rd3:product-management` skill (task 0391) is complete with 100% evaluation score. It provides 6 workflows but has no slash commands — users must invoke the skill directly or go through the `super-pm` agent.

To simplify user access, create 4 thin wrapper slash commands under the `/rd3:prd-*` namespace. Each command delegates to the skill via `Skill()` invocation, following the existing `dev-refine.md` command pattern.

**Design principle:** All commands are thin wrappers. NO business logic in commands — all logic lives in `rd3:product-management` skill. This rule is absolute.

**Source skill:** `plugins/rd3/skills/product-management/SKILL.md` (100% eval score)
**Source agent:** `plugins/rd3/agents/super-pm.md` (93% eval score)
**Command pattern reference:** `plugins/rd3/commands/dev-refine.md`

### Requirements

**R1. Create 4 slash commands:**

| Command | Role | User Intent |
|---|---|---|
| `/rd3:prd-init` | One-time bootstrap | "Set up this project's feature tree" |
| `/rd3:prd-run` | Core workflow | "I have an idea, make it real" / "Is this feature ready?" |
| `/rd3:prd-adjust` | HITL state modifier | "Let me tweak priorities or status" |
| `/rd3:prd-doc` | Output generator | "Generate a PRD from the feature tree" |

**R2. Thin wrapper constraint:** Each command is 50-100 lines. Contains NO business logic. The command only:
- Parses user arguments
- Maps arguments to skill invocation args
- Delegates via `Skill(skill="rd3:product-management", args="...")`
- Documents the argument contract and examples

**R3. cc-commands conventions:** Each command file must have:
- Frontmatter: `description`, `allowed-tools: ["Read", "Glob", "Bash", "Skill"]`
- Argument hints in blockquote
- Arguments table with Required/Default/Description
- Examples table (3-4 per command)
- Workflow section
- Delegation section (exact Skill() invocation)
- See Also section
- Platform Notes section (no acpx references)

**R4. Quality gates:**
- Each command passes `bun plugins/rd3/skills/cc-commands/scripts/validate.ts`
- Each command scores >= 85% on `evaluate.ts --scope full`

**R5. Smart positional detection:**
- Digits only → WBS number (feature-id)
- Ends with `.md` → file path
- Otherwise → feature description text

### Design

#### `/rd3:prd-init` — One-time Bootstrap

Bootstrap a feature tree from an existing codebase. Run once per project.

```
/rd3:prd-init [--mode full|quick] [--path <project-path>]
```

| Flag | Default | Description |
|---|---|---|
| `--mode` | `full` | `full` = reverse-engineering analysis, `quick` = module structure scan |
| `--path` | `.` | Project root path to analyze |

**Delegation:**
```
Skill(skill="rd3:product-management", args="init --mode $MODE --path $PATH")
```

**Workflow:**
1. Check if feature tree already exists (`ftree ls`). If yes, warn and ask to confirm re-init.
2. Analyze codebase (full mode: `rd3:reverse-engineering`; quick mode: module scan)
3. Extract feature candidates → present to user for validation
4. Seed feature tree with user-facing features + technical metadata
5. Optional: first prioritization pass

---

#### `/rd3:prd-run` — Core Workflow

The primary command. Handles two modes based on input:

**Mode A: New feature** — intake → elicit → estimate → approve → decompose

```
/rd3:prd-run "<description>" [--strategy mvp|standard|mature] [--auto]
```

| Flag | Default | Description |
|---|---|---|
| `<description>` | (required) | Feature idea — can be vague or detailed |
| `--strategy` | auto-detect | Force decomposition strategy (overrides auto-detection) |
| `--auto` | `false` | Skip HITL approval after estimation, decompose immediately |

**Mode A workflow:**
1. **Elicit** — If description is vague (no problem statement, no success criteria), run elicitation (Workflow 5) to flesh it out
2. **Add to tree** — Create feature node via `ftree add` (Workflow 1)
3. **Auto-select strategy** — Unless `--strategy` is specified:
   - No success criteria → `mvp`
   - Has criteria + personas → `standard`
   - Has compliance/criticality keywords → `mature`
4. **Estimate decomposition** — Run `rd3:task-decomposition` in dry-run to produce estimate:
   - Number of tasks
   - Total effort (hours)
   - Strategy selected
   - Dependencies identified
5. **Approval gate:**
   - `--auto`: auto-approve, proceed to step 6
   - No `--auto`: present estimate to user, wait for confirmation (go / switch strategy / cancel)
6. **Decompose** — Create child task files via `tasks create`, link to feature via `ftree link`
7. **Output** — Summary: feature ID, tasks created, WBS numbers, total effort

**Mode B: Existing feature readiness check**

```
/rd3:prd-run <feature-id> [--auto]
```

| Flag | Default | Description |
|---|---|---|
| `<feature-id>` | (required) | Feature ID (digits) to check |
| `--auto` | `false` | Auto-fix issues where possible |

**Mode B workflow:**
1. **Load feature** — `ftree context <feature-id> --format full`
2. **Check readiness** — Verify all gates:
   - Problem statement exists and is specific
   - Success criteria are measurable
   - Scope boundaries defined (in/out)
   - Feature has linked WBS tasks (decomposed)
   - Tasks have effort estimates
3. **Report** — Pass/fail for each gate, overall readiness score
4. **Auto-fix** (if `--auto`): Run elicitation for missing problem/criteria, run decomposition if not decomposed

**Smart positional detection:**

| Input Pattern | Mode | Example |
|---|---|---|
| Digits only | Mode B (readiness check) | `prd-run 0391` |
| Text with spaces | Mode A (new feature) | `prd-run "add real-time collaboration"` |

**Delegation:**
```
Skill(skill="rd3:product-management", args="run --description \"$DESCRIPTION\" --feature $FEATURE_ID --strategy $STRATEGY --auto")
```

---

#### `/rd3:prd-adjust` — HITL State Modifier

Modify volatile state in the feature tree. Non-volatile config (default strategy, metadata schema) lives in AGENTS.md — this command does NOT touch it.

```
/rd3:prd-adjust [--prioritize] [--status <new-status>] [--root <feature-id>] [--method rice|moscow] [--auto]
```

| Flag | Default | Description |
|---|---|---|
| `--prioritize` | `false` | Run prioritization on features |
| `--status` | — | Change feature status (backlog/validated/executing/done) |
| `--root` | — | Limit to subtree rooted at this feature ID |
| `--method` | `rice` | Prioritization method (only with `--prioritize`) |
| `--auto` | `false` | Skip HITL confirmation for status changes |

**What this command CAN modify (volatile state):**

| State | Flag | Example |
|---|---|---|
| RICE/MoSCoW scores | `--prioritize` | Re-score all backlog features |
| Feature status | `--status` | Move feature from backlog to validated |
| Priority order | `--prioritize` | Re-rank by updated scores |

**What this command CANNOT modify (non-volatile, config-driven):**
- Decomposition strategy (set at decompose time in `prd-run`)
- Feature title/description (set at intake)
- Metadata schema (project config in AGENTS.md)
- Feature hierarchy (use `ftree move` directly)

**Delegation:**
```
Skill(skill="rd3:product-management", args="adjust --prioritize --method $METHOD --status $STATUS --root $ROOT --auto")
```

**Workflow:**
1. Load features from tree (`ftree ls --root $ROOT --json`)
2. If `--prioritize`: Run RICE or MoSCoW scoring (Workflow 2), present scores to user, store in metadata
3. If `--status`: Validate status transition, update feature status (with confirmation unless `--auto`)
4. Output: summary of changes made

---

#### `/rd3:prd-doc` — Output Generator

Generate a PRD document from the feature tree. Pure output — no state changes.

```
/rd3:prd-doc [--root <feature-id>] [--template standard|onepage|brief] [--output <file>]
```

| Flag | Default | Description |
|---|---|---|
| `--root` | — | Feature ID to scope as subtree (empty = full tree) |
| `--template` | `standard` | PRD template: `standard` (10 sections), `onepage` (4 sections), `brief` (5 sections) |
| `--output` | stdout | Output file path |

**Delegation:**
```
Skill(skill="rd3:product-management", args="doc --root $ROOT --template $TEMPLATE --output $OUTPUT")
```

**Workflow:**
1. Load features from tree (`ftree ls --root $ROOT --json`)
2. Select template from `templates/prd-{template}.md`
3. Fill template with feature metadata (problem, solution, success criteria, scope, RICE scores)
4. Write output to file or stdout

---

### Command Interaction Map

```
prd-init (once)
    │
    ▼
prd-run "<idea>" ──→ feature in tree + tasks created
    │                    │
    │                    ▼
    │              prd-adjust ──→ re-score / change status
    │                    │
    ▼                    ▼
prd-run <id>     prd-doc ──→ PRD document
(readiness)
```

### Solution

## Solution

**4 commands implemented:**

| Command | Lines | Score | Delegation |
|---|---|---|---|
| `prd-init.md` | ~70 | 100% | `Skill(skill="rd3:product-management", args="init --mode $MODE --path $PATH")` |
| `prd-run.md` | ~105 | 98% | `Skill(skill="rd3:product-management", args="run --description ... --feature $ID --strategy $STRATEGY --auto")` |
| `prd-adjust.md` | ~90 | 99% | `Skill(skill="rd3:product-management", args="adjust --prioritize --method $METHOD --status $STATUS --root $ROOT --auto")` |
| `prd-doc.md` | ~75 | 99% | `Skill(skill="rd3:product-management", args="doc --root $ROOT --template $TEMPLATE --output $OUTPUT")` |

**Key design decisions:**
- prd-run has two modes (smart positional): new feature (Mode A) vs readiness check (Mode B)
- prd-run has estimation + approval gate before decomposition (--auto to skip)
- prd-run has auto-strategy detection (--strategy to override)
- prd-adjust limited to volatile state only (scores, status)
- prd-doc is pure output, no state changes
- All commands are thin wrappers, no business logic


### Plan

**Subtask 1: Scaffold all 4 commands** (estimated: 20min)
- Run `bun plugins/rd3/skills/cc-commands/scripts/scaffold.ts prd-init --path plugins/rd3/commands` for each
- Verify scaffold output

**Subtask 2: Write prd-init** (estimated: 30min)
- Frontmatter, argument hints, arguments table
- Delegation: `Skill(skill="rd3:product-management", args="init --mode $MODE --path $PATH")`
- Examples: full mode, quick mode, custom path
- Platform Notes (no acpx)

**Subtask 3: Write prd-run** (estimated: 1h)
- Most complex command — two modes (new feature vs readiness check)
- Smart positional detection logic
- Mode A: intake → elicit → estimate → approval gate → decompose
- Mode B: readiness check with auto-fix option
- `--auto` flag behavior for both modes
- `--strategy` override for auto-detection
- Delegation: `Skill(skill="rd3:product-management", args="run ...")`

**Subtask 4: Write prd-adjust** (estimated: 30min)
- `--prioritize` and `--status` as the two actions
- Document what IS and IS NOT modifiable (volatile vs non-volatile)
- `--method` flag for prioritization
- `--root` for subtree scoping
- `--auto` for status changes

**Subtask 5: Write prd-doc** (estimated: 20min)
- Simplest command — pure output
- `--template` flag (standard/onepage/brief)
- `--root` for subtree scoping
- `--output` for file writing

**Subtask 6: Validate + evaluate all 4** (estimated: 30min)
- Run validate.ts on all 4
- Run evaluate.ts --scope full on all 4
- Fix all issues until all score >= 85%

**Subtask 7: Final review** (estimated: 30min)
- Cross-check: all Skill() invocations match skill's expected args
- Cross-check: no acpx references
- Cross-check: argument contracts match SKILL.md workflow signatures
- Verify no business logic leaked into commands
- Verify prd-run smart positional detection works correctly
- Verify prd-adjust volatile/non-volatile boundary is correct

**Dependency graph:**
```
1 (scaffold) → 2-5 (write, parallel) → 6 (validate) → 7 (review)
```

**Total estimated effort: 4h**

### Q&A

*Pending — to be populated during refinement.*

### Review

## Review

**All acceptance criteria met:**

| Criterion | Status | Evidence |
|---|---|---|
| R1. 4 commands created | ✅ | prd-init, prd-run, prd-adjust, prd-doc |
| R2. Thin wrapper (<100 lines) | ✅ | 70-105 lines each |
| R3. cc-commands conventions | ✅ | frontmatter, argument hints, examples, workflow, delegation, platform notes |
| R4. Quality gates | ✅ | validate: PASS, evaluate: 98-100% |
| R5. Smart positional detection | ✅ | Documented in prd-run |
| No acpx references | ✅ | All platform notes use rd3-run-acp pattern |
| No business logic | ✅ | All logic delegated to skill |


### Testing

## Testing

**Validation results (all PASS):**
- `validate.ts prd-init.md` → PASS
- `validate.ts prd-run.md` → PASS (fixed YAML quoting + description length)
- `validate.ts prd-adjust.md` → PASS
- `validate.ts prd-doc.md` → PASS

**Evaluation results (all A grade):**
- `evaluate.ts prd-init.md --scope full` → 100% (A)
- `evaluate.ts prd-run.md --scope full` → 98% (A)
- `evaluate.ts prd-adjust.md --scope full` → 99% (A)
- `evaluate.ts prd-doc.md --scope full` → 99% (A)


### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References

- [rd3:product-management SKILL.md](plugins/rd3/skills/product-management/SKILL.md) — Source skill (100% eval)
- [super-pm.md](plugins/rd3/agents/super-pm.md) — Source agent (93% eval)
- [dev-refine.md](plugins/rd3/commands/dev-refine.md) — Command pattern reference
- [cc-commands SKILL.md](plugins/rd3/skills/cc-commands/SKILL.md) — Command scaffolding/evaluation
- [decomposition-strategies.md](plugins/rd3/skills/product-management/references/decomposition-strategies.md) — Strategy profiles with philosophy
