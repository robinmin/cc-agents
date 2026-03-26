# rd2 -> rd3 Migration Plan

## Purpose

This document is the working proposal for migrating useful skills from `plugins/rd2/skills/` into `plugins/rd3/skills/`.

It assumes:

- the new slash command [`/migrate-to-rd3`](/Users/robin/projects/cc-agents/.claude/commands/migrate-to-rd3.md) is acceptable for now
- migration is **redesign-first**, not a blind copy
- every completed migration ends with an `expert-skill` quality gate via [`plugins/rd3/agents/expert-skill.md`](/Users/robin/projects/cc-agents/plugins/rd3/agents/expert-skill.md)

## Current State

### rd2 skills

rd2 currently contains 39 skills:

- `advanced-testing`
- `anti-hallucination`
- `ast-grep`
- `backend-architect`
- `brainstorm`
- `cc-agents`
- `cc-commands`
- `cc-hooks`
- `cc-skills`
- `cloud-architect`
- `code-patterns`
- `code-review-auggie`
- `code-review-claude`
- `code-review-common`
- `code-review-gemini`
- `code-review-opencode`
- `coder-agy`
- `coder-auggie`
- `coder-claude`
- `coder-gemini`
- `coder-opencode`
- `frontend-architect`
- `frontend-design`
- `knowledge-extraction`
- `pl-golang`
- `pl-javascript`
- `pl-python`
- `pl-typescript`
- `sys-debugging`
- `task-decomposition`
- `task-workflow`
- `tasks`
- `tdd-workflow`
- `test-coverage`
- `test-cycle`
- `tool-selection`
- `ui-ux-design`
- `unit-tests-generation`
- `workflow-orchestration`

### rd3 skills

rd3 currently contains 8 skills:

- `anti-hallucination`
- `cc-agents`
- `cc-commands`
- `cc-magents`
- `cc-skills`
- `quick-grep`
- `run-acp`
- `tasks`

### Immediate gaps

- rd3 does not yet have a clear planning-side decomposition skill with explicit boundaries versus business analysis and system analysis.
- rd3 does not yet have a clear baseline testing operations skill that unifies test execution, coverage-driven gap handling, and pragmatic test extension.
- rd3 has ACP transport via [`plugins/rd3/skills/run-acp/SKILL.md`](/Users/robin/projects/cc-agents/plugins/rd3/skills/run-acp/SKILL.md), but it is still undecided whether rd3 needs standalone generic coding or review coordination skills.
- rd3 has `quick-grep`, so `ast-grep` should be absorbed there rather than migrated as a separate skill.
- rd3 has migration helpers in `cc-skills`, but they are bootstrap helpers, not a complete semantic migration pipeline.

## Migration Principles

1. Migrate by **target capability**, not by source folder count.
2. Prefer **merge**, **fold**, or **rewrite** when rd2 scopes overlap.
3. Keep rd3 aligned to the repo standard: Bun, TypeScript, Biome, multi-platform companions where needed.
4. Re-evaluate each rd2 skill for present-day value before planning its migration.
5. Close **real** dependency gaps first, not theoretical ones.
6. Build a **generic rd3 abstraction** before reviving vendor-specific wrappers.
7. Evaluate references from skill docs to subagents and slash commands; remove them unless they are truly necessary.
8. Prefer pure reusable skills over wrapper-coupled skills.
9. Use `expert-skill` at the end of each migration to evaluate and refine the resulting rd3 skill.
10. Centralize day-to-day implementation knowledge in `sys-developing` where the material is clearly execution-oriented.

## Naming Policy For This Migration

Use selective renaming, not broad taxonomy cleanup.

- Rename `code-patterns` to `sys-developing` to align it with the `sys-*` operational naming pattern.
- Keep the current architecture and design skill names as they are for now.
- Do not spend this migration on large naming normalization across `backend-architect`, `frontend-architect`, `cloud-architect`, `frontend-design`, `backend-design`, or `ui-ux-design`.

Reason:

- those design-stage skills still need more scope work first
- renaming them now would create churn without enough architectural clarity
- `code-patterns` is the one rename with immediate value because it sits in the daily engineering execution layer
- `sys-developing` should become the center of gravity for execution-stage development knowledge over time

## Target Taxonomy

The proposed rd3 target taxonomy is:

| Category | Purpose | Notes |
|----------|---------|-------|
| `meta-core` | skill, command, agent, main-agent authoring | Already mostly covered by rd3 |
| `workflow-core` | decomposition and other planning primitives | Highest priority missing layer |
| `execution-core` | generic coding and generic review routing | Should sit on top of `run-acp` |
| `engineering-core` | debugging, TDD, baseline testing, implementation patterns, research | Core daily delivery stack, with `sys-developing` as the execution knowledge hub |
| `architecture-design` | backend, frontend, UX, cloud, language planning | Migrate after core execution stack |
| `qa-depth` | specialized testing depth beyond the baseline stack | Keep focused and opt-in |
| `search-refactor` | unified search, AST matching, safe rewrites | `quick-grep` is the anchor |
| `vendor-variants` | optional wrappers for specific backends | Only after generic layers exist |

## Re-Evaluation Matrix

Each rd2 skill is re-evaluated against current direct value for building an rd3 software-development team.

Decision meanings:

- `done` — already present in rd3 or explicitly dropped
- `migrate-now` — clear present-day value, move into an early wave
- `migrate-later` — useful, but not part of the first practical migration slice
- `revisit` — possible value, but not enough current signal to justify migration now

| Source Skill | Proposed rd3 Target | Decision | Priority | Why |
|--------------|---------------------|----------|----------|-----|
| `anti-hallucination` | existing `anti-hallucination` | done | done | Already present in rd3 |
| `cc-agents` | existing `cc-agents` | done | done | Already present in rd3 |
| `cc-commands` | existing `cc-commands` | done | done | Already present in rd3 |
| `cc-skills` | existing `cc-skills` | done | done | Already present in rd3 |
| `tasks` | existing `tasks` | done | done | Already present in rd3 |
| `task-workflow` | none | done | done | Obsolete and non-used; do not migrate |
| `workflow-orchestration` | none | done | done | Orchestration will be customized through main agent configuration instead |
| `ast-grep` | existing `quick-grep` | done | done | Already absorbed by rd3 `quick-grep`; refine `quick-grep` directly if gaps remain |
| `task-decomposition` | `task-decomposition` | migrate-now | high | Distinct planning value if its boundary is cleaned up |
| `sys-debugging` | `sys-debugging` | migrate-now | high | Strong daily-use debugging methodology |
| `tdd-workflow` | `tdd-workflow` | migrate-now | high | Core engineering discipline for makers; should stay separate from general testing operations |
| `test-cycle` | `sys-testing` | migrate-now | high | Best baseline source for a unified rd3 testing operations skill |
| `code-patterns` | `sys-developing` | migrate-now | high | High-value implementation reference and a good fit for the `sys-*` operational naming pattern |
| `knowledge-extraction` | `knowledge-extraction` | migrate-now | high | High-value research and synthesis primitive |
| `pl-typescript` | `pl-typescript` | migrate-now | medium | Highest-value language planner for this repo |
| `backend-architect` | `backend-architect` | migrate-later | medium | Useful, but not before core engineering stack |
| `frontend-architect` | `frontend-architect` | migrate-later | medium | Useful, but not before core engineering stack |
| `frontend-design` | `frontend-design` | migrate-later | medium | Useful after core engineering workflows land |
| `ui-ux-design` | `ui-ux-design` | migrate-later | medium | Valuable, but not an immediate migration blocker |
| `test-coverage` | `sys-testing` | migrate-now | medium | Coverage policy belongs in the baseline testing skill, not as a standalone rd3 skill |
| `advanced-testing` | `advanced-testing` | migrate-later | medium | Useful after baseline testing stack lands |
| `code-review-common` + `code-review-*` | `code-review-common` | revisit | medium | Desirable, but not obviously needed before the first core skill migrations |
| `coder-*` | `coder-common` | revisit | medium | Desirable, but not clearly needed before the first core skill migrations |
| `tool-selection` | `tool-selection` | revisit | low | No direct value is evident right now; do not migrate until a concrete need appears |
| `pl-python` | `pl-python` | revisit | low | Migrate only if Python remains active in real workflows |
| `pl-golang` | `pl-golang` | revisit | low | Migrate only if Go remains active in real workflows |
| `pl-javascript` | `pl-javascript` | revisit | low | Lower value than TypeScript here |
| `unit-tests-generation` | `sys-testing` | migrate-now | medium | Fold only the pragmatic gap-closing and targeted test creation workflow into `sys-testing`, not the full standalone AI-test-generation skill |
| `cloud-architect` | `cloud-architect` | revisit | low | Useful only when infrastructure planning becomes active |
| `brainstorm` | `brainstorm` | revisit | low | Not enough direct value yet |
| `cc-hooks` | `cc-hooks` | revisit | low | Meta infrastructure, not justified yet |

## Migration Waves

### Wave 0: Already covered in rd3

No migration needed now:

- `anti-hallucination`
- `cc-agents`
- `cc-commands`
- `cc-skills`
- `cc-magents`
- `tasks`
- `quick-grep`
- `ast-grep` -> `quick-grep`
- `run-acp`

### Wave 1: Core Engineering Skills

This is the first migration wave because these skills provide the clearest direct value for day-to-day software development.

This wave also establishes the execution hub:

- `sys-developing` becomes the central home for routine implementation knowledge
- `sys-testing` becomes the central home for routine testing operations
- adjacent specialist skills stay separate until their boundaries are cleaner

Targets:

- `task-decomposition`
- `sys-debugging`
- `tdd-workflow`
- `sys-testing` from `test-cycle` + `test-coverage` + practical parts of `unit-tests-generation`
- `sys-developing` from `code-patterns`
- `knowledge-extraction`

### Wave 2: Primary Planning Skill

This wave adds the most justified planning capability after the core engineering stack lands.

Targets:

- `pl-typescript`

### Wave 3: Architecture and Design Skills

Targets:

- `backend-architect`
- `frontend-architect`
- `frontend-design`
- `ui-ux-design`

### Wave 4: QA Depth Skills

Targets:

- `advanced-testing`

### Wave 5: Revisit Queue

Targets:

- `tool-selection`
- `code-review-common`
- `coder-common`
- `pl-python`
- `pl-golang`
- `pl-javascript`
- `cloud-architect`
- `brainstorm`
- `cc-hooks`

## Migration Commands

The commands below are proposal commands. Run them first without `--apply` to generate the redesign and mapping report for that slice. After approval, re-run the same command with `--apply`.

### Wave 1 commands

```bash
# Need this early because task decomposition is still a distinct planning capability even after simplifying rd3:tasks.
# This keeps rd3:tasks focused on task records and lifecycle mechanics.
# It also forces an explicit redesign decision: task decomposition stays separate from business analysis and system analysis.
/migrate-to-rd3 --from task-decomposition --to task-decomposition "Enhance task decomposition for rd3 and define a clean boundary versus business analysis and system analysis"

# Need this as a durable debugging operating model for every maker and checker agent.
/migrate-to-rd3 --from sys-debugging --to sys-debugging "Port the root-cause-first debugging workflow into rd3 and improve it based on the industry best practices and SOTA techniques" --apply

# Need this because rd3 maker workflows should keep strict red-green-refactor discipline.
/migrate-to-rd3 --from tdd-workflow --to tdd-workflow "Port the strict TDD workflow into rd3 for feature work, bug fixes, and refactors and improve it based on the industry best practices and SOTA techniques" --apply

# Need this as the default rd3 testing operations skill.
# It should merge baseline test execution, coverage-guided gap handling, and pragmatic targeted test creation.
# It should NOT absorb tdd-workflow or advanced-testing.
/migrate-to-rd3 --from test-cycle,test-coverage,unit-tests-generation --to sys-testing "Create a baseline rd3 testing skill that unifies test execution, coverage-driven gap handling, and pragmatic test extension without absorbing TDD or advanced testing and improve it based on the industry best practices and SOTA techniques" --apply

# Need this because many coding tasks still need production-ready implementation patterns, not only process guidance.
# Rename it during migration so the rd3 execution stack uses a clearer `sys-*` operational name.
/migrate-to-rd3 --from code-patterns --to sys-developing "Port the implementation patterns library into rd3 as sys-developing for API, database, Docker, and testing guidance and improve it based on the industry best practices and SOTA techniques" --apply

# Need this because research and evidence synthesis are core support functions for architecture and coding work.
/migrate-to-rd3 --from knowledge-extraction --to knowledge-extraction "Port the knowledge extraction skill into rd3 for cross-source synthesis and validation and improve it based on the industry best practices and SOTA techniques" --apply
```

### Wave 2 commands

```bash
# Need this next because this repo is Bun and TypeScript centered.
# It is the planning skill with the strongest direct value signal after the core engineering set.
/migrate-to-rd3 --from pl-typescript --to pl-typescript "Port the TypeScript planning skill into rd3 as the primary language-planning layer and improve it based on the industry best practices and SOTA techniques" --apply
```

### Wave 3 commands

```bash
# Need this because backend design remains a distinct planning concern that should not be collapsed into generic implementation guidance.
/migrate-to-rd3 --from backend-architect,cloud-architect --to backend-architect "Port the backend architecture planning skill into rd3 and improve it based on the industry best practices and SOTA techniques" --apply

# Need this because high-level frontend architecture has a different scope from component-level frontend design.
/migrate-to-rd3 --from frontend-architect --to frontend-architect "Port the frontend system architecture skill into rd3 and improve it based on the industry best practices and SOTA techniques" --apply

# Need this because component architecture, routing, state, and data-fetching guidance are used frequently in implementation planning.
/migrate-to-rd3 --from frontend-design --to frontend-design "Port the frontend design and implementation planning skill into rd3 and improve it based on the industry best practices and SOTA techniques" --apply

# Need this because UX, accessibility, and design-token guidance should remain explicit rather than implied by frontend-design.
/migrate-to-rd3 --from ui-ux-design,ui-ux-designer --to ui-ux-design "Port the UI and UX design skill into rd3 and improve it based on the industry best practices and SOTA techniques" --apply
```

### Wave 4 commands

```bash
# Need this because mutation testing, property-based testing, and accessibility testing are distinct advanced QA capabilities.
/migrate-to-rd3 --from advanced-testing --to advanced-testing "Port the advanced testing skill into rd3 for deeper QA workflows and improve it based on the industry best practices and SOTA techniques" --apply
```

### Wave 5 commands

```bash
# Revisit this only if a concrete routing problem appears that is not solved inside other skills or main agent config.
/migrate-to-rd3 --from tool-selection --to tool-selection "Re-evaluate whether a standalone tool-selection skill is actually needed in rd3"

# Revisit this only if a generic review coordinator becomes clearly necessary.
/migrate-to-rd3 --from code-review-common,code-review-claude,code-review-gemini,code-review-opencode,code-review-auggie --to code-review-common "We need to consolidate all of these agent skills into a single, unified code review agent skill. It will be the major agent skill used for code reviews across all channels going forward, we MUST ensure its reliable and accurate. 

What we do not need are the channel-specific things, because we will use the new agent skill rd3:run-acp to run the code review agent skill across all channels.

Meanwhile, we also need to re-evaluate and improve it based on the industry best practices and SOTA techniques.

Another thing for the code review report, we will use rd3:tasks to create a new task file as the code review report instead of adding any new. That means we need to fold the findings and relevant comments into its section `Background` as subsections. In its section `Requirements`, we can just put a simple request for issue fixing. This is prepared for possible next step action." --apply

# Revisit this only if a generic coding coordinator becomes clearly necessary.
/migrate-to-rd3 --from coder-claude,coder-gemini,coder-opencode,coder-auggie,coder-agy --to code-implement-common "We need to consolidate all of these agent skills into a single, unified code implementation agent skill. It will be the major agent skill used for code implementation across all channels going forward, we MUST ensure its reliable and accurate. 

What we do not need are the channel-specific things, because we will use the new agent skill rd3:run-acp to run the code review agent skill across all channels.

Meanwhile, we also need to re-evaluate and improve it based on the industry best practices and SOTA techniques.

Another thing for the agent skill is its input and output. To simplify the inter-process communication and reduce the chance to share session information between these processes, we use task file as its major inputs. Of course, we also can carry one liner prompt to streamline the process, but it must be precise and concise. And most importantly, the task file name must be contained in it. With this way, we can pass enought inforamtion to the downstream processes and reduct to do session sharing things accross the proceses.

Additinally, we also need embed git worktree workflow as the mandatory option. This needs more requests to deal with the broken prcoess. The normal git worktree workflow should be like the following at least:
- Create the worktree: git worktree add ../hotfix main
- Switch folders: cd ../hotfix
- Fix and push: Do your work, then git commit and git push.
- Clean up: cd ../original-repo then git worktree remove ../hotfix. 

Of cource, we can fine tune the workflow with existing code implementation requirements. Another assumption here we can made is that we will ensure all available agent channels have been install all agent skills and subagents and slash command from plugin rd3 as the infrustrature.

By the way, we need to take serious consideration to see whether we also neet to migrate these scripts accrosing several existing agent skils, as we already have the solid agent skill rd3:run-acp.
" --apply

# Revisit these only if concrete product usage justifies them.
/migrate-to-rd3 --from pl-python --to pl-python "Port the Python agent skill into rd3 as the another programing language agent skill and improve it based on the industry best practices and SOTA techniques" --apply
/migrate-to-rd3 --from pl-golang --to pl-golang "Port the Golang agent skill into rd3 as the another programing language agent skill and improve it based on the industry best practices and SOTA techniques" --apply
/migrate-to-rd3 --from pl-javascript --to pl-javascript "Port the Javascript agent skill into rd3 as the another programing language agent skill and improve it based on the industry best practices and SOTA techniques" --apply
/migrate-to-rd3 --from brainstorm --to brainstorm "Port the brainstorm agent skill into rd3 for brainstorming and improve it based on the industry best practices and SOTA techniques. We will use it for these heuristic tasks" --apply
/migrate-to-rd3 --from cc-hooks --to cc-hooks "Re-evaluate whether hook design belongs in the near-term rd3 migration"
```

## What Not To Migrate 1:1

These should not be copied directly:

- `ast-grep`
  - Already absorbed by `quick-grep`. Do not plan a separate migration; only refine `quick-grep` if concrete gaps are found.
- `code-patterns`
  - Do not keep the old rd2-facing name. Migrate it as `sys-developing`.
- `test-cycle`, `test-coverage`, `unit-tests-generation`
  - Do not preserve these as separate rd3 skills. Merge the baseline operational value into `sys-testing`.
- `advanced-testing`
  - Keep separate from `sys-testing` because it is specialist depth, not baseline testing behavior.
- `task-workflow`
  - Drop it. It is old and non-used.
- `workflow-orchestration`
  - Drop it. Orchestration will be handled through main agent configuration instead of a migrated skill.
- `coder-claude`, `coder-gemini`, `coder-opencode`, `coder-auggie`, `coder-agy`
  - Merge first into `coder-common`.
- `code-review-claude`, `code-review-gemini`, `code-review-opencode`, `code-review-auggie`
  - Merge first into `code-review-common`.
- `anti-hallucination`, `cc-agents`, `cc-commands`, `cc-skills`, `tasks`
  - Already present in rd3, so treat future work as refinement, not migration.

## Purity Cleanup

During each migration, explicitly review back references from the source skill to:

- subagents
- slash commands
- named wrappers

Default action:

- remove those references to keep the rd3 skill pure and reusable

Allowed exception:

- keep a reference only when it is still necessary, still correct, and does not re-couple the skill to a wrapper-specific workflow

This matters because a large part of the rd2 library accumulated wrapper-oriented references that are not appropriate in the rd3 pure-skill model.

## Task Decomposition Boundary

`task-decomposition` should be migrated, but not as a raw copy.

Preferred shape:

- create a standalone `rd3:task-decomposition` skill
- do not fold decomposition workflow into `rd3:tasks`

The rd3 target should answer this boundary explicitly:

- **Business analysis**
  - problem framing
  - stakeholder goals
  - success criteria
  - requirement clarification
- **System analysis**
  - technical architecture
  - system boundaries
  - component interactions
  - integration and data-flow reasoning
- **Task decomposition**
  - transform already-understood scoped work into actionable tasks
  - identify dependencies, granularity, sequencing, and verification
  - record assumptions and open questions, but do not absorb full business analysis or full system design

Why this separation is better:

- `rd3:tasks` is now intentionally a low-level task record and lifecycle skill; adding decomposition back into it would blur the boundary again
- decomposition is optional planning intelligence, not a universal requirement for every task mutation
- keeping decomposition separate preserves a cleaner pure-skill model and avoids coupling planning logic to the task CLI workflow
- this also keeps room for business analysis and system analysis to evolve independently without turning `rd3:tasks` into a catch-all planning skill

The migration goal is to make `task-decomposition` stronger and cleaner, not broader.

## Testing Skill Boundary

The rd3 testing redesign should use three layers:

- **`tdd-workflow`**
  - development discipline
  - red-green-refactor
  - regression-first and characterization-test workflows
- **`sys-testing`**
  - default testing operations
  - test execution, failure triage, retry/escalation
  - coverage-guided gap analysis
  - pragmatic targeted test extension to close useful gaps
- **`advanced-testing`**
  - specialist depth
  - mutation testing
  - property-based testing
  - accessibility testing
  - implementation comparison and similar advanced techniques

Why this split is preferred:

- `tdd-workflow` is about how code is developed, not about general test operations after the fact
- `sys-testing` becomes the obvious default skill for routine testing work without forcing advanced methods every time
- `advanced-testing` stays opt-in and focused instead of bloating the default testing skill
- this removes redundant overlap while avoiding a single oversized catch-all testing skill

## Sys-Developing Boundary

`sys-developing` should become the default rd3 skill for execution-stage software development knowledge.

What belongs in `sys-developing`:

- implementation patterns
- practical coding workflows
- common engineering heuristics
- delivery-oriented guidance for APIs, databases, Docker, testing, and similar build work
- reusable execution knowledge that applies during normal feature and bug work

What should stay outside `sys-developing` for now:

- business analysis
- system analysis
- high-level architecture decisions
- specialist testing depth owned by `advanced-testing`
- the red-green-refactor methodology owned by `tdd-workflow`

Why this boundary is preferred:

- it gives the agent team one obvious default skill for "how do I build this?"
- it reduces overlap among implementation-focused skills without collapsing unlike concerns together
- it lets architecture and design skills mature before any larger consolidation is attempted
- it gives rd3 a cleaner operational center without turning one skill into the whole development stack

## Standard End-of-Migration Gate

Every applied migration should finish with this quality loop:

```text
Agent(subagent_type="rd3:expert-skill", prompt="Evaluate plugins/rd3/skills/<target-skill> at full scope and report issues")
Agent(subagent_type="rd3:expert-skill", prompt="Refine plugins/rd3/skills/<target-skill> based on the evaluation findings")
Agent(subagent_type="rd3:expert-skill", prompt="Re-evaluate plugins/rd3/skills/<target-skill> at full scope and summarize any residual gaps")
```

This is required because the migration command itself is intentionally broad and operational. The `expert-skill` pass is the standards gate that ensures the final rd3 skill is consistent with `cc-skills` evaluation and refinement logic.

## Recommended Execution Order

1. Wave 1
2. Wave 2
3. Wave 3
4. Wave 4
5. Wave 5

Do not start large optional migrations before:

- `task-decomposition`
- `sys-debugging`
- `tdd-workflow`
- `sys-testing`
- `sys-developing`
- `knowledge-extraction`
- `pl-typescript`

are decided and stable.

## Success Criteria

The rd2 -> rd3 migration is successful when:

- all required planning and skill dependency gaps are closed
- overlapping rd2 skills are merged or folded instead of duplicated
- `sys-developing` serves as the explicit execution knowledge hub for routine software-development work
- unnecessary subagent and slash-command references have been removed from migrated skills
- migrated script-backed skills are Bun/TypeScript-first unless explicitly documented otherwise
- migrated skills pass the `expert-skill` evaluation/refinement gate
- deferred skills have been consciously classified as `migrate-later` or `revisit` instead of being carried forward by inertia
- rd3 becomes the canonical software-development agent team stack, with rd2 kept only as legacy history
