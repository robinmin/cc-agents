---
name: product-management
description: "Product management orchestration skill: feature intake, prioritization (RICE/MoSCoW), PRD export, strategy-driven decomposition (simplify/MVP/standard/mature), and adaptive requirements elicitation. Layers product thinking on top of rd3:feature-tree, rd3:tasks, and rd3:task-decomposition. Use when: prioritizing features, generating PRDs, decomposing with strategy profiles, eliciting requirements, or managing product roadmap."
license: Apache-2.0
metadata:
  author: cc-agents
  version: "1.0.0"
  platforms: "claude-code,codex,openclaw,opencode,antigravity,pi"
  interactions:
    - pipeline
    - knowledge-only
    - generator
  pipeline_steps:
    - product-initialization
    - feature-intake
    - prioritization
    - prd-export
    - strategy-decomposition
    - requirements-elicitation
  openclaw:
    emoji: "📋"
see_also:
  - rd3-feature-tree
  - rd3-task-decomposition
  - rd3-tasks
  - rd3-request-intake
---

# rd3:product-management — Product Management Orchestration

## Overview

Orchestrate product-level decisions: feature intake, prioritization, PRD generation, strategy-driven decomposition, and adaptive requirements elicitation. Build on top of `rd3:feature-tree`, `rd3:tasks`, and `rd3:task-decomposition` — do NOT reimplement their capabilities.

**Key distinction:**
- **`product-management`** = product thinking (what to build, why, in what order)
- **`feature-tree`** = scope graph (hierarchical feature storage and status)
- **`task-decomposition`** = execution breakdown (how to split into implementable tasks)
- **`tasks`** = file management (task CRUD, WBS, kanban)

## When to Use

| Trigger Phrase | Workflow |
|---|---|
| "initialize product", "bootstrap feature tree", "analyze this project" | Product Initialization |
| "prioritize features", "RICE score", "MoSCoW" | Prioritization |
| "generate PRD", "export PRD", "write requirements doc" | PRD Export |
| "decompose with simplify strategy", "decompose with MVP strategy", "break down as standard" | Strategy Decomposition |
| "feature intake", "new feature idea", "add to roadmap" | Feature Intake |
| "elicit requirements", "flesh out this feature", "interview for requirements" | Requirements Elicitation |
| "product roadmap", "what should we build next" | Prioritization + Roadmap |

Do NOT use when:
- Pure task file management (use `rd3-tasks`)
- Technical architecture decisions (use `rd3-backend-architect`)
- Code implementation (use `rd3-code-implement-common`)

## Quick Start

```bash
# 0. Bootstrap from existing codebase (first time only)
# (see Workflow 0: Product Initialization)

# 1. Initialize a feature tree (if not exists)
ftree init

# 2. Add features via intake workflow
# (see Workflow 1: Feature Intake)

# 3. Prioritize features
# (see Workflow 2: Prioritization)

# 4. Export as PRD
# (see Workflow 3: PRD Export)

# 5. Decompose into tasks with strategy
# (see Workflow 4: Strategy Decomposition)
```

## Workflow 0: Product Initialization

Bootstrap a feature tree from an existing codebase. One-time entry point for projects that don't have a feature tree yet.

### When to Use

- First time applying `rd3:product-management` to an existing project
- Project has code but no feature tree or product documentation
- User says: "initialize product", "bootstrap feature tree", "analyze this project"

### Initialization Modes

Default mode: `quick`.

| Mode | Analysis | Existing task linking | Use When |
|---|---|---|---|
| `full` | Comprehensive HLD via reverse-engineering | Yes | Need both source-code feature extraction and existing task-file traceability |
| `standard` | Comprehensive HLD via reverse-engineering | No | Need source-code feature extraction without task-linking overhead |
| `quick` | Module structure scan (directories, key files) | No | Need a fast feature tree seed with minimal token usage |

### Standard Mode Steps

1. **Run reverse engineering:**
   ```
   Skill(skill="rd3-reverse-engineering", args="<project-path>")
   ```
   This produces: HLD document with component map, module structure, data flow, and critical issues.

2. **Extract feature candidates** from HLD:
   - Parse component map for user-facing capabilities
   - Group related modules into features (e.g., `src/auth/*` → "Authentication")
   - Create two-layer mapping:
     - **Primary (user-facing):** Feature names as capabilities ("User Authentication", "Payment Processing")
     - **Metadata (technical):** Module paths, endpoints, data models stored in ftree metadata
   - Target depth: 2-3 levels (root → feature group → individual feature)

3. **Present to user for validation:**
   - Show proposed feature tree structure
   - User confirms, splits, merges, or renames features
   - User marks any features as "out of scope" or "deprecated"

4. **Seed the feature tree:**
   ```bash
   ftree init
   ftree add --title "User Authentication" --status validated
   ftree add --title "Login" --parent <auth-id> --status validated
   ftree add --title "OAuth" --parent <auth-id> --status validated
   ```
   Store technical metadata:
   ```bash
   ftree context <feature-id> --format full
   # Merge existing metadata with the modules/endpoints fields before updating.
   ftree update <feature-id> --metadata '{"modules":["src/auth/login.ts","src/auth/oauth.ts"],"endpoints":["POST /auth/login","GET /auth/oauth/callback"]}'
   ```

5. **Optional first prioritization:**
   - Run RICE or MoSCoW on the seeded tree (Workflow 2)
   - Helps identify which features need attention first

### Full Mode Additional Steps

Run the Standard Mode steps, then link existing task files to the generated feature tree:

1. **Inspect existing task files** using task metadata, titles, requirements, and WBS numbers.
2. **Map tasks to feature nodes** by user-facing capability first, then by technical metadata such as modules, endpoints, or package names.
3. **Ask for confirmation** when a task plausibly maps to multiple feature nodes.
4. **Link confirmed tasks**:
   ```bash
   ftree link <feature-id> --wbs <task-wbs>
   ```
5. **Verify traceability** by checking feature context includes the linked WBS ids.

### Quick Mode Steps

1. **Scan module structure** (no reverse-engineering):
   ```bash
   find . -type f -name "*.ts" -o -name "*.js" -o -name "*.py" | head -100
   ls -la src/
   ```
   Identify top-level directories and their purposes.

2. **Extract feature candidates** from directory structure:
   - Each top-level module directory → candidate feature group
   - Key files (routes, controllers, models) → individual features
   - Package.json / go.mod / requirements.txt → technology context

3. **Present + seed** using the same validation and seeding flow as Standard Mode.

### Two-Layer Mapping

The feature tree uses **user-facing names** as the primary structure, with **technical metadata** attached:

```
├── [abc] User Authentication (validated)
│   metadata: {modules: ["src/auth/*"], endpoints: ["POST /login", "POST /signup"]}
│   ├── [def] Login (validated)
│   │   metadata: {modules: ["src/auth/login.ts"], endpoints: ["POST /auth/login"]}
│   └── [ghi] OAuth (validated)
│       metadata: {modules: ["src/auth/oauth.ts"], endpoints: ["GET /auth/callback"]}
├── [jkl] Payment Processing (validated)
│   metadata: {modules: ["src/payments/*"], endpoints: ["POST /checkout"]}
```

This gives PMs the capability view while preserving technical traceability for developers.

### Output

- Initialized ftree with user-facing feature hierarchy
- Technical metadata on each feature (modules, endpoints, data models)
- Optional: first prioritization pass results

## Workflow 1: Feature Intake

Elicit and structure new feature ideas into the feature tree.

### Steps

1. **Capture the idea** — Accept a vague or detailed feature description from the user
2. **Classify expertise level** — Detect user's PM expertise to calibrate question depth:
   - **Beginner**: Asks foundational questions (who benefits, what problem, how do we know it works)
   - **Intermediate**: Asks about scope boundaries, competitive context, success metrics
   - **Expert**: Asks about trade-offs, opportunity cost, strategic alignment
3. **Elicit details** — Use the question taxonomy from `references/elicitation.md` to fill gaps:
   - Purpose: Why this feature? What outcome?
   - Scope: What's in/out? What are the boundaries?
   - Users: Who benefits? What personas?
   - Success: How do we measure? What does "done" look like?
4. **Structure the feature** — Produce a structured feature description:
   - Title (concise, capability-oriented)
   - Problem statement (who, what, when, why)
   - Proposed solution (high-level)
   - Success criteria (measurable)
   - Priority hint (from user or default: backlog)
5. **Add to feature tree:**
   ```bash
   ftree add --title "<title>" [--parent <parent-id>] --status backlog
   ```
6. **Link metadata** — Store problem statement, success criteria in ftree metadata. `ftree update --metadata` replaces the metadata blob, so read the existing metadata first and write back a merged object:
   ```bash
   ftree context <feature-id> --format full
   # Merge existing metadata with: {"problem":"...","success_criteria":"...","personas":["..."]}
   ftree update <feature-id> --metadata '{"problem":"...","success_criteria":"...","personas":["..."]}'
   ```

### Output

Feature node in ftree with structured metadata, ready for prioritization.

## Workflow 2: Prioritization

Apply RICE or MoSCoW scoring to feature tree nodes.

### RICE Scoring

Use when a quantitative ranking across many features is needed.

1. **List candidate features:**
   ```bash
   ftree ls --status backlog --json
   ```
2. **Score each feature** using the RICE formula from `references/frameworks.md`:
   - **Reach** — How many users will this affect per quarter? (number)
   - **Impact** — How much will it improve the metric? (3=massive, 2=high, 1=medium, 0.5=low, 0.25=minimal)
   - **Confidence** — How sure are we about the estimates? (100%=high, 80%=medium, 50%=low)
   - **Effort** — How many person-months to build? (number)
   - **Score** = (Reach × Impact × Confidence) / Effort
3. **Rank features** by RICE score (highest = top priority)
4. **Store scores** in ftree metadata. Preserve existing metadata fields such as `problem`, `success_criteria`, and `personas`; merge the RICE object into the current metadata before updating:
   ```bash
   ftree context <feature-id> --format full
   # Write the full merged metadata, including prior fields plus the rice field.
   ftree update <feature-id> --metadata '{"problem":"...","success_criteria":"...","personas":["..."],"rice":{"reach":1000,"impact":2,"confidence":0.8,"effort":2,"score":800}}'
   ```
5. **Update status** for top-N features:
   ```bash
   ftree update <feature-id> --status validated
   ```

### MoSCoW Prioritization

Use when categorical buckets for release scoping are needed.

1. **List candidate features** (same as RICE step 1)
2. **Categorize each feature:**
   - **Must have** — Release fails without this. Critical path, blocking dependencies.
   - **Should have** — Important but not vital. High value, can slip to next release if needed.
   - **Could have** — Desirable but not necessary. Nice-to-have if capacity allows.
   - **Won't have** — Explicitly out of scope for this release. Document for future.
3. **Store category** in ftree metadata. Preserve existing metadata fields; merge `moscow` into the current metadata before updating:
   ```bash
   ftree context <feature-id> --format full
   # Write the full merged metadata, including prior fields plus the moscow field.
   ftree update <feature-id> --metadata '{"problem":"...","success_criteria":"...","personas":["..."],"moscow":"must"}'
   ```
4. **Validate** — Ensure "Must have" features collectively satisfy the release goal
5. **Generate release scope** — List all Must + Should features as the release candidate

## Workflow 3: PRD Export

Generate a structured PRD markdown document from the feature tree.

### Steps

1. **Select scope** — Choose which subtree to export:
   ```bash
   ftree ls --root <feature-id> --json    # Subtree
   ftree ls --json                        # Full tree
   ```
2. **Choose template** from `templates/`:
   - `templates/prd-standard.md` — Complex features (6+ weeks, 8 sections)
   - `templates/prd-onepage.md` — Simple features (2-4 weeks, 4 sections)
   - `templates/prd-feature-brief.md` — Exploration phase (1 week, 5 sections)
3. **Generate PRD** by filling the template with ftree data:
   - Problem section ← feature metadata `problem` field
   - Solution section ← feature title + description
   - Success Metrics ← feature metadata `success_criteria`
   - User Stories ← feature metadata `personas` + problem statement
   - Acceptance Criteria ← derived from success criteria
   - Out of Scope ← sibling features NOT in selected subtree
   - Priority ← RICE/MoSCoW scores from metadata
4. **Output** — Write PRD markdown to stdout or file

> Template selection guide: see `references/prd-templates.md` for when to use each template.

## Workflow 4: Strategy-Driven Decomposition

Decompose features into tasks using strategy profiles.

### Strategy Profiles

| Profile | Scope | Testing | Documentation | Edge Cases | When to Use |
|---------|-------|---------|---------------|------------|-------------|
| `simplify` | Minimum useful decomposition | Smoke/manual only | Task titles + brief requirements | Skip unless blocking | Fast intake, low-risk requests, minimal ceremony |
| `mvp` | Minimal viable | Basic happy path | README only | Skip | Validation, speed-to-market |
| `standard` | Balanced | Unit + integration | User docs + API docs | Cover known cases | Default for most features |
| `mature` | Full | Unit + integration + E2E + perf | Comprehensive | Exhaustive | Production-critical, regulated |

See `references/decomposition-strategies.md` for detailed profile definitions.

### Steps

1. **Select feature** to decompose:
   ```bash
   ftree context <feature-id> --format full
   ```
2. **Choose strategy** based on context:
   - Simplify: low-risk request, user wants speed, or only core task creation is needed
   - MVP: early-stage, uncertain demand, need to learn fast
   - Standard: validated need, normal risk, team capacity available
   - Mature: production-critical, compliance required, high reliability
3. **Decompose** using `rd3:task-decomposition`:
   ```
   Skill(skill="rd3-task-decomposition", args="<task-ref>")
   ```
   Apply the strategy profile's scope filters during decomposition:
   - **Simplify**: Ask only blocking questions, skip detailed estimation, create the minimum useful task set
   - **MVP**: Strip nice-to-haves, defer edge cases, minimal testing
   - **Standard**: Include proper testing, documentation, known edge cases
   - **Mature**: Add performance testing, accessibility, observability, security hardening
4. **Create task files** via `rd3:tasks`:
   ```bash
   tasks create "<subtask title>" --background "..." --requirements "..."
   ```
5. **Link tasks to feature:**
   ```bash
   ftree link <feature-id> --wbs <task-wbs>
   ```
6. **Update feature status using legal transitions only.** New features start as `backlog`, and ftree enforces `backlog → validated → executing → done`. If the feature is still `backlog`, validate it first, then move it to `executing`:
   ```bash
   ftree update <feature-id> --status validated
   ftree update <feature-id> --status executing
   ```
   If the feature is already `validated`, update directly to `executing`. If it is `blocked` or another non-standard state, resolve the blocked reason and choose the legal transition from the current state.

## Workflow 5: Requirements Elicitation

Adaptive Q&A workflow for fleshing out vague feature descriptions.

### Expertise Detection

Before asking questions, assess the user's PM expertise level:

| Signal | Level | Question Depth |
|---|---|---|
| User provides problem + personas + metrics | Expert | Trade-offs, opportunity cost |
| User provides problem + rough scope | Intermediate | Scope boundaries, success criteria |
| User provides only a feature name | Beginner | Foundational (who, what, why, how-measure) |

### Question Taxonomy

Use questions from `references/elicitation.md` organized by category:

- **Purpose** (2 prompts) — Why this feature? What outcome?
- **Scope** (4 prompts) — What's in/out? Boundaries? Dependencies?
- **Users** (2 prompts) — Who benefits? What personas?
- **Success** (4 prompts) — How to verify? Acceptance criteria? Metrics?
- **Constraints** (3 prompts) — Budget? Timeline? Technical limits?

### Process

1. **Assess expertise level** from user's initial description
2. **Select 3-7 questions** from taxonomy based on gaps + expertise level
3. **Ask questions** — batch related questions, don't ask one-at-a-time
4. **Synthesize answers** into structured feature metadata
5. **Store** in ftree metadata via `ftree update` after merging with existing metadata
6. **Confirm** with user before proceeding

## Integration Points

### With rd3:feature-tree

All feature tree operations use `ftree` CLI. This skill does NOT reimplement tree management.

| Operation | Command |
|---|---|
| Add feature | `ftree add --title "..." [--parent <id>]` |
| Update metadata | `ftree update <id> --metadata '{...}'` after merging with existing metadata |
| Update status | `ftree update <id> --status <status>` |
| List features | `ftree ls [--status <s>] [--json]` |
| Get context | `ftree context <id> --format full` |
| Link to tasks | `ftree link <id> --wbs <wbs1,wbs2>` |
| Export tree | `ftree export [--root <id>] [--output <file>]` |
| Check done | `ftree check-done <id>` |

### With rd3:task-decomposition

Decomposition follows `rd3:task-decomposition` patterns. Strategy profiles add scope filters on top.

### With rd3:tasks

Task file creation uses `tasks create` CLI. This skill does NOT manage task files directly.

## Gotchas

1. **ftree metadata is replaced, not merged** — Always read current metadata, merge new fields locally, then pass the full JSON blob to `ftree update --metadata`.
2. **Feature status transitions are enforced** — `backlog → validated → executing → done`. Cannot skip states.
3. **PRD export is a workflow, not a script** — The agent reads ftree JSON and fills a template. There is no `ftree export-prd` command.
4. **Strategy profiles are guidelines** — They inform decomposition scope but don't enforce it programmatically. The agent applies the filters.
5. **RICE scores are stored in metadata** — They don't affect ftree status automatically. The agent must explicitly update status based on scores.

## References

- `references/frameworks.md` — RICE, MoSCoW, JTBD, Kano, User Story Mapping
- `references/prd-templates.md` — Standard PRD, One-Pager, Feature Brief templates
- `references/elicitation.md` — Adaptive Q&A patterns and question taxonomy
- `references/decomposition-strategies.md` — MVP/Standard/Mature strategy profiles

## Additional Resources

- [rd3-feature-tree SKILL.md](/Users/robin/.agents/skills/rd3-feature-tree/SKILL.md) — Feature tree CLI reference
- [rd3-task-decomposition SKILL.md](/Users/robin/.agents/skills/rd3-task-decomposition/SKILL.md) — Task decomposition methodology
- [rd3-tasks SKILL.md](/Users/robin/.agents/skills/rd3-tasks/SKILL.md) — Task file management
- [rd3-reverse-engineering SKILL.md](/Users/robin/.agents/skills/rd3-reverse-engineering/SKILL.md) — Codebase analysis for product initialization
- [rd3-request-intake SKILL.md](/Users/robin/.agents/skills/rd3-request-intake/SKILL.md) — Requirements elicitation

## Platform Notes

### Claude Code (primary)

Use `Skill()` for skill invocation. Use `ftree` CLI directly for feature tree operations. Cross-channel delegation via `--channel` flag forwarded to `rd3-run-acp`.

### Other Platforms

Run `ftree` commands via Bash tool. For cross-channel execution, use `rd3-run-acp` (not acpx directly). See `rd3-task-runner` for the canonical channel delegation pattern.
