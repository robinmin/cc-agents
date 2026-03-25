---
description: Redesign and migrate rd2 skills into rd3
argument-hint: "--from <rd2-skill[,rd2-skill...]|all> --to <rd3-skill> [goal] [--report <path>] [--apply] [--dry-run]"
allowed-tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash", "Agent", "AskUserQuestion"]
---

# Migrate To Rd3

Run a full redesign-first migration workflow from one or more existing rd2 skills into one rd3 target skill under `plugins/rd3/skills/`.

This file lives at `.claude/commands/migrate-to-rd3.md`, so in Claude Code it should be invoked as `/migrate-to-rd3`.

This command is intentionally **all-in-one**. It does **not** need to follow the "Fat Skills, Thin Wrappers" rule. Treat it as a one-off migration operator that contains the analysis, redesign, mapping, and migration workflow in one place.

## When to Use

- Migrate one or more existing skills from `plugins/rd2/skills/` into rd3
- Redesign overlapping or ambiguous skill scopes before porting anything
- Build a migration batch plan for a software-development agent team
- Decide whether a source skill should be kept, merged, split, rewritten, or skipped

## Migration Contract

This command always works with an explicit migration tuple:

- **From**: one rd2 skill or many rd2 skills from `plugins/rd2/skills/`
- **To**: one rd3 target skill in `plugins/rd3/skills/`
- **Goal**: optional free-text description of the intended outcome for the new or refined rd3 skill

Supported shapes:

- **1:1 migration**: one rd2 source skill -> one rd3 target skill
- **many:1 migration**: multiple rd2 source skills -> one rd3 target skill
- **all:1 redesign exercise**: `--from all` for broad taxonomy analysis before selecting a narrower batch

`--to` semantics:

- If `plugins/rd3/skills/<to>/` already exists, treat it as an **existing rd3 skill to refine or merge into**
- If `plugins/rd3/skills/<to>/` does not exist, treat it as a **new rd3 skill to create**
- The command must explicitly state which of those two cases applies in the report before any migration work starts

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `--from` | Source rd2 skill name list, comma-separated, or `all` | (required) |
| `--to` | Target rd3 skill directory name | (required) |
| `goal` | Optional free-text goal describing what the rd3 skill should become | (empty) |
| `--report <path>` | Write the redesign and migration report to a markdown file | `docs/plans/rd3-skill-migration-report.md` |
| `--apply` | After redesign and mapping, execute the approved migration work | false |
| `--dry-run` | Do analysis and planning only; do not write rd3 skill files | false |

## Rules

1. Do **not** assume 1:1 migration from rd2 to rd3, even when only one source skill is provided.
2. Redesign taxonomy and scope boundaries **before** porting content.
3. Prefer merge or rewrite over duplication when scopes overlap.
4. Preserve rd3 as the canonical target: Bun, TypeScript, Biome, multi-platform compatibility.
5. Simplify the tech stack during migration: convert Python implementation code and generic Python sample code to TypeScript by default.
6. Keep Python only when it is the subject of the skill itself or when the example is explicitly teaching Python-specific concepts.
7. Evaluate all back references from skills to subagents, slash commands, or named wrappers. Remove them unless they are strictly necessary and still valid in rd3.
8. Prefer pure reusable skills over skills that are tightly coupled to a particular command or subagent.
9. A skill describes **HOW** and **WHEN** — never **WHO**. Remove all content that describes which agents, commands, or wrappers call the skill. That knowledge belongs in the wrapper layer (the agent or command that lists the skill in its `skills:` field). Reason: embedding caller identity in a skill couples it to a specific agent topology. When agents are renamed, added, or removed, every skill that names them must be updated. Keeping skills caller-agnostic makes them portable across agent teams and platforms without churn.
10. Treat migration helpers as bootstrap only. Do not claim a skill is migrated unless the content, scripts, tests, and references are actually reviewed and ported or intentionally dropped.
11. Do not migrate vendor-specific thin wrappers early if a generic rd3-native abstraction should exist first.
12. Do not migrate `rd2:task-workflow`; treat it as obsolete and drop it unless a narrow surviving fragment is explicitly justified.
13. Do not migrate `rd2:workflow-orchestration`; orchestration belongs in main agent configuration and orchestration policy, not in this rd3 skill migration.
14. If `--apply` is not present, stop after producing the redesign and migration mapping report.
15. If redesign uncovers ambiguity that changes scope materially, stop and ask for approval before writing new skill directories.
16. Treat the `goal` argument as a steering constraint. If it conflicts with source material, call out the conflict explicitly in the report.
17. If `--to` does not exist yet, create it only after the redesign confirms the target boundary is stable enough to warrant a new rd3 skill.
18. Before declaring a migration complete, delegate to `rd3:expert-skill` to evaluate the migrated skill and refine it to standard if needed.

## Required Output

Produce a markdown report with these sections:

1. `Current Inventory`
2. `Overlap Analysis`
3. `Target Taxonomy`
4. `Tech Stack Simplification`
5. `Target Skill Decision`
6. `Source-to-Target Mapping`
7. `Dependency Closure`
8. `Migration Batches`
9. `Per-Skill Migration Checklist`
10. `Expert Review Gate`
11. `Open Decisions`

Use this table format in `Source-to-Target Mapping`:

| Source Skill | Current Purpose | Overlap | Target rd3 Skill | Goal Fit | Action | Priority | Notes |
|--------------|-----------------|---------|------------------|----------|--------|----------|-------|

Allowed `Action` values:
- `keep`
- `merge`
- `split`
- `rewrite`
- `fold-into-existing`
- `skip`

## Workflow

### Phase 1: Inventory

Collect the current state from:

- `plugins/rd2/skills/*/SKILL.md`
- `plugins/rd3/skills/*/SKILL.md`
- `.claude/commands/*.md`
- `plugins/rd3/commands/*.md` if any plugin-scoped command definitions still exist and are relevant for comparison
- `package.json`

Use `rg`, `find`, and `sed` via Bash for quick inventory and summaries.

Checklist:

- Resolve the explicit `--from` source set
- Resolve the explicit `--to` target
- Capture the optional `goal`
- Determine whether `--to` is an existing rd3 skill or a new target to create
- List all rd2 skills relevant to the source set
- List all rd3 skills relevant to the target area
- Identify skills already migrated
- Identify references in rd3 to missing skills
- Identify direct references from skill docs to subagents, slash commands, or named wrappers
- Identify script-backed skills vs knowledge-only skills
- Identify Python-based legacy implementations that must be ported to Bun/TypeScript
- Identify Python examples in markdown that should be converted to TypeScript
- Identify Python examples that should remain because they are explicitly Python-specific teaching material

### Phase 2: Overlap Analysis

Before migrating any skill, detect conceptual and scope overlap across both plugins, with emphasis on the chosen source set and target skill.

Analyze:

- duplicate responsibilities
- near-duplicate responsibilities with different names
- skills that should become one generic rd3 skill
- skills that should become thin variants only after a generic rd3 skill exists
- stale rd2 concepts that rd3 already supersedes
- back references that make a skill impure or overly coupled to wrappers

Pay special attention to these categories:

- workflow and orchestration
- task management and decomposition
- coding and review delegation
- planning and architecture
- testing and debugging
- search and refactoring
- research and evidence gathering
- frontend design and UX

### Phase 3: Target Taxonomy Redesign

Define the rd3 target taxonomy before any migration.

Use this default taxonomy unless repo evidence clearly supports a better one:

| Category | Purpose |
|----------|---------|
| `meta-core` | `cc-skills`, `cc-agents`, `cc-commands`, `cc-magents` |
| `workflow-core` | task decomposition and tool selection only |
| `execution-core` | generic coding, generic review, ACP delegation |
| `engineering-core` | debugging, TDD, test cycle, code patterns, knowledge extraction |
| `architecture-design` | backend, frontend, UI/UX, cloud, language planners |
| `qa-depth` | coverage, advanced testing, unit test generation |
| `search-refactor` | quick-grep and any AST-aware search/rewrite rules |
| `vendor-variants` | optional wrappers only if a generic abstraction already exists |

Apply these redesign rules:

- `ast-grep` should normally fold into `quick-grep`, not become a separate rd3 skill
- `coder-*` should normally be redesigned behind a generic rd3 coding layer before vendor wrappers
- `code-review-*` should normally be redesigned behind a generic rd3 review layer before vendor wrappers
- `task-workflow` should normally be dropped as obsolete unless a small reusable fragment survives redesign
- `workflow-orchestration` should normally be dropped from skill migration because orchestration is handled by main agent configuration
- language planners should be migrated only for languages actually used by the team
- explicit references to subagents and slash commands should normally be removed so the resulting rd3 skill is a pure skill
- rd3 references to missing skills must be resolved as part of dependency closure

Then produce a target-skill definition for the requested `--to` skill:

- target purpose
- target boundaries
- included responsibilities
- excluded responsibilities
- source skills feeding it
- how the optional `goal` changes or narrows scope

Special case for `task-decomposition`:

- define what belongs to task decomposition
- define what belongs to business analysis
- define what belongs to system analysis
- state which of those concerns are in-scope vs out-of-scope for the rd3 skill

### Phase 4: Tech Stack Simplification

Produce an explicit conversion plan for implementation code and examples.

By default:

- Python scripts under `scripts/` should be rewritten in Bun/TypeScript
- Python test files should be rewritten to Bun test
- Generic Python snippets in `SKILL.md`, `references/`, `examples/`, and `assets/` should be converted to TypeScript

Allowed exception:

- Keep Python examples only when the skill is explicitly teaching Python-specific APIs, syntax, idioms, or project structures

Document:

- which Python scripts will be ported
- which Python tests will be ported
- which markdown examples will be converted to TypeScript
- which examples, if any, remain Python and why

### Phase 5: Target Skill Decision

Decide which of these two modes applies:

- **Refine existing rd3 skill**: `plugins/rd3/skills/<to>/` already exists and remains the correct destination
- **Create new rd3 skill**: `plugins/rd3/skills/<to>/` does not exist and redesign shows that a new rd3 skill is warranted

Document:

- current existence status of `--to`
- why reusing the target is correct, or why a new rd3 skill is justified
- whether the `goal` can be satisfied inside an existing rd3 boundary
- whether creating the new target would increase overlap elsewhere in rd3

### Phase 6: Source-to-Target Mapping

For each source skill in scope, decide one target action for the requested `--to` target:

- `keep`: migrate with mostly the same scope
- `merge`: combine several rd2 skills into one rd3 skill
- `split`: break one rd2 skill into multiple rd3 skills
- `rewrite`: preserve intent but redesign structure and implementation
- `fold-into-existing`: absorb into an existing rd3 skill
- `skip`: intentionally do not migrate

For each mapping row, include:

- why the old scope is or is not valid in rd3
- whether the skill is knowledge-only or script-backed
- whether legacy Python scripts must be ported to TypeScript
- whether Python markdown examples must be ported to TypeScript
- whether tests must be rewritten to Bun
- whether platform companions are needed
- whether wrapper references should be removed to keep the skill pure
- whether the source contributes directly to the requested `goal`

### Phase 7: Dependency Closure

Identify gaps that block a stable agent team.

Minimum dependency closure should answer:

- Which missing rd3 skills are already referenced by other rd3 skills?
- Which skills are foundational for planner/orchestrator agents?
- Which skills are foundational for maker/checker agents?
- Which migrations must happen before vendor-specific wrappers make sense?

If a target skill depends on another missing target skill, schedule the dependency first.

### Phase 8: Migration Batches

Group migration into batches. Use this default order unless analysis proves otherwise.

For a focused invocation, produce:

- one batch for the requested `--to` skill
- optional prerequisite batches that must land first

Use this default order unless analysis proves otherwise:

1. `workflow-core`
2. `execution-core`
3. `engineering-core`
4. `architecture-design`
5. `qa-depth`
6. `vendor-variants`

For each batch, list:

- target skills
- source skills feeding them
- why the batch order matters
- blockers
- acceptance criteria

### Phase 9: Apply Migration

Run this phase only if `--apply` is present and the redesign is coherent.

For each approved target skill:

1. Create or reuse the rd3 target directory under `plugins/rd3/skills/`
2. Merge only the source content that still belongs in the redesigned scope for `--to`
3. Rewrite frontmatter and body for rd3 conventions
4. Port Python scripts to Bun/TypeScript when the script is still needed
5. Port Python tests to Bun test
6. Convert generic Python markdown examples to TypeScript
7. Keep only explicitly Python-specific examples in Python
8. Add or update references and examples
9. Generate or update platform companions if the skill requires them
10. Update any rd3 references that pointed to missing or renamed skills
11. **Add frontmatter to all reference files** — each must have `name`, `description`, and `see_also` linking to related reference files and the parent skill

Frontmatter rules for reference files:

```yaml
---
name: <reference-name>
description: "<one-line description, ~80 chars>"
see_also:
  - rd3:<parent-skill>
  - rd3:<related-skill>
  - <sibling-reference>
---
```

Frontmatter rules for SKILL.md:

- `description`: ~100 tokens maximum (triggers belong in body, not frontmatter)
- `tags`: must include the skill category (e.g., `workflow-core`, `engineering-core`)
- `metadata.interactions`: set accurately (`knowledge-only` for pure skills, `generator` if it emits structured output)

Creation rule:

- If `--to` was new, create `plugins/rd3/skills/<to>/` only after Phase 4 confirms a new skill is justified
- If `--to` already existed, do not create a parallel duplicate; refine or merge into the existing target

Do not blindly preserve:

- rd2-only wording
- stale platform assumptions
- duplicate references
- dead scripts
- generic Python code examples
- references to slash commands or subagents that are not required
- vendor-specific logic that belongs in a generic rd3 abstraction
- content that duplicates other rd3 skills (e.g., task file format details belonging in rd3:tasks)

### Phase 10: Verification

After any applied migration, verify:

- target skill directory structure is valid
- `SKILL.md` matches the redesigned scope
- scripts, if present, are Bun/TypeScript unless there is a documented exception
- generic sample code is TypeScript unless there is a documented language-specific reason
- tests exist for script-backed skills
- no stale `rd2:` references remain unless intentional
- unnecessary references to slash commands or subagents have been removed
- no rd3 skill points to a missing dependency
- repo typecheck and tests still pass for affected areas

Recommended commands:

```bash
bun test
bun tsc --noEmit
biome format --write plugins/rd3
biome lint --write plugins/rd3
```

If a full repo run is too expensive, run the narrowest affected verification and state what was not run.

### Phase 11: Expert Review Gate

Before closing the migration, delegate the migrated rd3 skill to `rd3:expert-skill` for quality enforcement.

Required steps:

1. Ask `expert-skill` to evaluate the target skill at full scope
2. Review the findings
3. If issues remain, ask `expert-skill` to refine the target skill
4. Re-run evaluation until the skill is at acceptable standard or remaining gaps are explicitly documented

Rate limit handling: if `expert-skill` hits rate limits on first attempt, retry with a more focused prompt. Example fallback:

```text
Agent(subagent_type="rd3:expert-skill", prompt="Evaluate plugins/rd3/skills/<to> for: frontmatter quality, trigger coverage, boundary clarity, content structure, reference quality, cross-references, purity (no agent coupling), platform metadata. Report a score 0-100 with critical/major/minor issues.")
```

Preferred delegation pattern:

```text
Agent(subagent_type="rd3:expert-skill", prompt="Evaluate plugins/rd3/skills/<to> at full scope and report issues")
Agent(subagent_type="rd3:expert-skill", prompt="Refine plugins/rd3/skills/<to> based on the evaluation findings")
```

At minimum, the final report must include:

- whether `expert-skill` was invoked
- evaluation outcome (score and grade)
- whether refinement was applied
- any residual issues left intentionally unresolved

## Migration Heuristics

Use these defaults unless local evidence disproves them:

| rd2 Skill Pattern | Default rd3 Decision |
|-------------------|----------------------|
| already present in rd3 | `skip` or refine existing rd3 skill |
| knowledge-only workflow skill | `keep` or `rewrite` |
| script-backed Python skill with durable value | `rewrite` |
| vendor-specific coding or review wrapper | `merge` behind a generic rd3 layer first |
| obsolete orchestration or wrapper-coupled skill | `skip` or extract only reusable fragments |
| narrow feature already covered by `quick-grep` | `fold-into-existing` |
| stale or low-value operational helper | `skip` |

## Examples

```bash
# 1:1 migration planning
/migrate-to-rd3 --from sys-debugging --to sys-debugging

# many:1 merge planning
/migrate-to-rd3 --from code-review-common,code-review-claude,code-review-gemini,code-review-opencode,code-review-auggie --to code-review-common "Create one rd3-native review skill with generic routing and optional vendor adapters"

# redesign-first planning with explicit goal
/migrate-to-rd3 --from ast-grep --to quick-grep "Fold AST search guidance into quick-grep and keep one search/refactor skill"

# task decomposition redesign with explicit boundary analysis
/migrate-to-rd3 --from task-decomposition --to task-decomposition "Enhance task decomposition and define a clean boundary versus business analysis and system analysis"

# broad taxonomy review before focused migrations
/migrate-to-rd3 --from all --to workflow-core "Design the remaining planning and workflow skill boundaries without reviving obsolete workflow-orchestration or task-workflow"

# refine an existing rd3 target rather than creating a new one
/migrate-to-rd3 --from ast-grep --to quick-grep "Absorb AST-aware guidance into the existing quick-grep skill" --apply

# create a new rd3 target if redesign proves it is justified
/migrate-to-rd3 --from sys-debugging,tdd-workflow,test-cycle --to engineering-core "Create a consolidated engineering execution skill" --apply
```

## Execution Notes

- Use Bash with `rg` for inventory, overlap detection, and reference tracing
- Use Read for close inspection of the shortlisted skills and scripts
- Use Write only for the report and approved rd3 target files
- Use `Task` to delegate the final evaluation/refinement pass to `expert-skill`
- Prefer small, auditable migrations per batch
- Stop and surface decisions when the redesign changes user-facing skill boundaries
