---
name: cc-skills
description: Create, modify, evaluate, evolve, and package Agent skills. This skill should be used when you want to scaffold a new skill directory, validate skill structure across multiple platforms, generate platform-specific companion files, migrate existing rd2 skills, or run a governed evolution workflow with proposal history and rollback.
license: Apache-2.0
metadata:
  author: cc-agents
  version: "3.0.0"
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  openclaw:
    emoji: "🛠️"
    requires:
      bins:
        - bun
  interactions:
    - generator
    - reviewer
    - pipeline
  severity_levels:
    - error
    - warning
    - info
  pipeline_steps:
    - create
    - validate
    - evaluate
    - refine
    - adapt
    - evolve
    - package
    - migrate
---

# cc-skills: Universal Skill Creator
<!-- eval-ignore-platform -->

Create Agent skills that work across ALL platforms from a single source of truth.

## Operations

This skill accepts **8 operations**:

| Operation | Purpose | Script |
|-----------|---------|--------|
| **add** | Scaffold a new skill | `scripts/scaffold.ts` |
| **validate** | Check skill structure and frontmatter | `scripts/validate.ts` |
| **evaluate** | Validate and score skill quality | `scripts/evaluate.ts` |
| **refine** | Fix issues and improve quality | `scripts/refine.ts` |
| **evolve** | Analyze and propose longitudinal improvements | `scripts/evolve.ts` |
| **adapt** | Generate cross-platform companions | `scripts/adapt.ts` |
| **package** | Package for distribution | `scripts/package.ts` |
| **migrate** | Multi-source skill migration with LLM refinement | `scripts/skill-migrate.ts` |

## Workflow Design

Each operation has a **step-by-step workflow** combining scripts and checklists.
LLM content improvement is embedded in the normal workflow; it is not a separate `--llm-eval` command mode.

### Task-Backed Execution

When a `cc-skills` workflow is tracked in a task file under `docs/tasks/`, do not mutate the task
record with isolated `tasks update --section ...` or `tasks update --phase ...` calls when a
canonical lifecycle operation exists.

Use the predefined `rd3:tasks` operations in
[../tasks/references/workflows.md](../tasks/references/workflows.md):

- `create`
- `planning`
- `design`
- `implementation`
- `review`
- `testing`

Each operation defines the required section updates, `impl_progress` target, and `status` target.
Follow the full command bundle for the operation rather than changing only one field.

### Hybrid Workflow Architecture

Workflow-related agent skills use a **hybrid approach** combining scripting for deterministic steps with markdown (checklists) for non-deterministic steps:

| Step Type | Handler | When to Use |
|-----------|---------|-------------|
| **Deterministic** | Script | File I/O, validation, parsing, generation, cross-platform adaptation |
| **Non-deterministic** | Markdown checklist | Quality assessment, voice consistency, trigger effectiveness, judgment calls |

**This hybrid approach is optimal** — it combines reliability (scripting) with flexibility (LLM judgment). However, the approach is not dogma:
- **Pure scripting** is appropriate when steps are fully deterministic (e.g., validate.ts, package.ts)
- **Pure markdown** is appropriate when fuzzy human judgment is required throughout
- **Hybrid** (default) combines both for workflow-related skills

**Key insight**: Scripts handle what machines do well (repetition, precision); checklists handle what LLMs do well (nuance, creativity).

### Workflow Components

| Component | Purpose | Examples |
|-----------|---------|----------|
| **Scripts** | Deterministic tasks | File creation, validation, companion generation |
| **Checklists** | Fuzzy verification | Imperative form, description clarity, voice |

### Workflow Flow Pattern

Each workflow follows this pattern:

1. **Step 1 → Step 2 → Step 3 → Step 4**
2. Each step specifies its handler (script or checklist)
3. **Branching**: If step fails, go back to X
4. **Retry**: Max 3 retries per step

**See [references/workflows.md](references/workflows.md)** for:
- Visual flow diagrams
- Step-by-step tables with handlers
- Success/failure criteria
- Mandatory checklist items
- Retry policies

## Quick Start

```sh
# Add: Initialize a new skill
bun scripts/scaffold.ts my-skill --path ./skills

# Add with ADK interaction patterns
bun scripts/scaffold.ts my-skill --path ./skills --interactions pipeline,reviewer

# Evaluate: Validate skill structure (Two-Tier: Structural + Quality)
bun scripts/evaluate.ts ./skills/my-skill --scope full

# Refine: Apply deterministic fixes (fuzzy checks via invoking agent checklist)
bun scripts/refine.ts ./skills/my-skill --best-practices

# Evolve: Analyze and propose longitudinal improvements
bun scripts/evolve.ts ./skills/my-skill --propose

# Package: Create distribution bundle
bun scripts/package.ts ./skills/my-skill --output ./dist
```

## When to Use

- Creating a new skill from scratch → use **add**
- Checking skill structure and frontmatter → use **validate**
- Scoring skill quality → use **evaluate**
- Fixing quality issues → use **refine**
- Planning longitudinal improvement → use **evolve**
- Generating cross-platform companions → use **adapt**
- Preparing for distribution → use **package**
- Migrating skills from multiple sources → use **migrate**
- Migrating rd2 frontmatter to rd3 format only → use **refine --migrate**

`evolve` is intentionally separate from the main build/package pipeline. Use it for proposal-driven maintenance with snapshot-backed apply, history, and rollback.

## Core Principles

### Single Source of Truth

ONE SKILL.md file contains all core logic. Platform companions (like `agents/openai.yaml`) are additive, not alternative versions.

### Universal Compatibility

Skills work across 30+ agents that support the agentskills.io format. The base format (`name` + `description` in YAML frontmatter) is portable everywhere.

### Progressive Disclosure

Skills use 3-tier loading:
1. **Metadata** - name + description (~100 tokens, always loaded)
2. **SKILL.md body** - Instructions (<500 lines, loaded on trigger)
3. **References** - Detailed docs (loaded on demand)

### Fat Skills, Thin Wrappers

All coding agents support agent skills now, but slash commands and subagents are not universally supported. So we **MUST** follow these principles:

- **Skills** = core logic, workflows, domain knowledge (source of truth)
- **Commands** = ~50 line wrappers invoking skills for humans
- **Agents** = ~100 line wrappers invoking skills for AI workflows

### Circular Reference Rule
Skills MUST NOT reference their associated agents or commands. This includes:

- ❌ Bad: `See also: my-agent, /plugin:my-command`
- ❌ Bad: Commands Reference section listing `/rd3:skill-*` commands
- ✅ Good: `This skill provides workflows for X.`

If you need command examples, reference generic patterns without specific command names (e.g., "Use Task() to delegate to specialist agents" instead of "/rd3:skill-add").

## Skill Types

| Type | Use When | Structure |
|------|----------|-----------|
| **Technique** | Follow concrete steps | Steps, code, mistakes |
| **Pattern** | Think about problems | Principles, when/when-not |
| **Reference** | Look up APIs/docs | Tables, searchable |

Choose based on content:
- Has steps? -> Technique
- Mental model? -> Pattern
- Lookup data? -> Reference

See [references/skill-patterns.md](references/skill-patterns.md) for advanced workflow patterns.

## Interaction Patterns (ADK)

ADK interaction patterns describe **runtime behavior**, not content structure.

Use them alongside skill types:
- **Type** answers: what does the skill contain?
- **Interaction pattern** answers: how should the skill behave?

Supported patterns:
- **Tool Wrapper**: load references or conventions on demand
- **Generator**: fill templates into structured output
- **Reviewer**: apply a rubric or checklist and return findings
- **Inversion**: ask questions before acting
- **Pipeline**: enforce ordered stages with gates

These patterns compose. A skill can combine them, such as:
- `["inversion", "generator"]` for requirement interview then document generation
- `["pipeline", "reviewer"]` for staged execution with a final audit

Add them in frontmatter under `metadata.interactions` when they materially describe the skill's behavior.

See [references/skill-patterns-adk.md](references/skill-patterns-adk.md) for the decision tree, composition guidance, and mapping to rd3 workflow heuristics.

## Directory Structure

```
skill-name/
├── SKILL.md                    # SINGLE SOURCE OF TRUTH (required)
│   ├── YAML frontmatter (name, description required)
│   └── Markdown instructions
│
├── agents/
│   └── openai.yaml             # Codex UI metadata (auto-generated)
│
├── scripts/                    # Executable code
├── references/                 # Documentation
└── assets/                     # Output files (templates, images)
```

## Platform Adapters

| Platform | Extensions | Companion Files |
|----------|------------|-----------------|
| **Claude Code** | Inline command syntax, argument placeholders, forked context mode, hooks | None (native) |
| **Codex** | `agents/openai.yaml` (UI metadata) | agents/openai.yaml |
| **OpenClaw** | Frontmatter `openclaw` metadata (emoji, requires) | None (embedded) |
| **OpenCode** | Config-level `permission.skill` | None (hints only) |
| **Antigravity** | Gemini CLI compatible | None (validates) |

## Migration from rd2

Two migration paths depending on scope:

| Path | Operation | What It Does |
|------|-----------|--------------|
| **Frontmatter only** | `refine --migrate` | Adds `name:`, `metadata.platforms`, `metadata.openclaw`, Platform Notes section |
| **Full migration** | `migrate` | Multi-source inventory, merge, Python→TS conversion, LLM content refinement, validation |

Use `refine --migrate` when skill content is already correct and only frontmatter needs rd3 alignment.
Use `migrate` when merging multiple source skills, converting scripts, or when content needs reconciliation.

**rd2 feature mapping:**

| rd2 Feature | Migration Action |
|-------------|-----------------|
| Claude inline command syntax | Keep for Claude, add Platform Notes |
| Claude argument placeholders | Keep for Claude, document limitation |
| Missing `name:` field | Add explicit `name:` from directory |
| Python scripts | Convert to TypeScript via `migrate`, or keep as-is via `refine --migrate` |

## Detailed Workflows

For complete workflow definitions with certainty/uncertainty split and checklists:

**See [references/workflows.md](references/workflows.md)**

## Advanced

### Custom Templates

Create custom templates in `assets/templates/` with the following structure:

```
assets/templates/
├── my-template/
│   ├── SKILL.md.template
│   └── config.json
```

### Platform-Specific Validation

Each platform adapter validates different aspects:

| Platform | Validates |
|----------|-----------|
| Claude Code | Frontmatter, structure, syntax compatibility |
| Codex | openai.yaml format, agent metadata |
| OpenClaw | frontmatter `openclaw` metadata, emoji, requirements |
| OpenCode | Permission hints, configuration |
| Antigravity | Gemini CLI compatibility |

### Migration Workflow

**Full multi-source migration:**
1. Run migration: `bun scripts/skill-migrate.ts --from rd2:old-skill --to rd3:new-skill --apply`
2. LLM refinement: The invoking agent improves merged content coherence
3. Validate: `bun scripts/evaluate.ts ./new-skill --scope full`

**Frontmatter-only migration (rd2→rd3 format):**
1. Evaluate first: `bun scripts/evaluate.ts ./old-skill --scope full`
2. Apply migration: `bun scripts/refine.ts ./old-skill --migrate`
3. Verify: `bun scripts/evaluate.ts ./old-skill --scope full`
4. Generate companions: `bun scripts/adapt.ts ./old-skill all`

## Platform Notes

### Claude Code
- Use Claude inline command execution syntax for live shell commands
- Use Claude argument placeholders to reference command-line arguments from the user
- Use Claude forked context mode for parallel reasoning in separate context
- Use Claude `hooks:` frontmatter for pre/post tool execution automation
- **Note**: These features are Claude-specific and not available on other platforms

### Codex / OpenClaw / OpenCode / Antigravity
- Run commands via Bash tool: use standard shell commands
- Arguments are provided directly in chat, not via Claude argument placeholders
- Platform companions (`openai.yaml`, OpenClaw metadata) are auto-generated

## Best Practices

Follow these best practices to create effective, maintainable skills. See [references/best-practices.md](references/best-practices.md) for the complete guide.

### Core Principles

- **Concise is Key**: Challenge each piece of information - does Claude really need this?
- **Set Degrees of Freedom**: Match specificity to task fragility (High/Medium/Low)
- **Test with Target Models**: Works differently on Haiku vs Sonnet vs Opus
- **Script vs LLM**: Use scripts for deterministic issues, LLM for fuzzy issues (see workflows.md)

<!-- Full best practices moved to references/best-practices.md -->

## MECE Evaluation Dimensions

Skills are scored across **4 categories, 10 dimensions, 100 points total** (source: `scripts/evaluation.config.ts`):

| Category | Dimension | Pts | What It Checks |
|----------|-----------|-----|----------------|
| **Core Quality** (40) | Frontmatter | 10 | YAML validity, required fields |
| | Structure | 5 | Directory organization |
| | Content | 15 | Body quality, examples |
| | Completeness | 10 | All required sections |
| **Discovery & Trigger** (20) | Trigger Design | 10 | Description triggers, when-to-use |
| | Platform Compatibility | 10 | Multi-platform support |
| **Safety & Security** (20) | Security | 10 | No dangerous patterns |
| | Circular Reference | 10 | No command/agent refs |
| **Code & Docs** (20) | Code Quality | 10 | Scripts executable, tested |
| | Progressive Disclosure | 10 | References used properly |

Grade: A (90+) / B (70-89) / C (50-69) / D (30-49) / F (<30). Pass threshold: **70 pts**.

See [references/evaluation-framework.md](references/evaluation-framework.md) for weight profiles (with/without scripts), security scanner rules, and full scoring details.

## Additional Resources

- **Workflows**: [references/workflows.md](references/workflows.md) - Detailed operation workflows
- **Security Guidelines**: [references/security.md](references/security.md) - Security checklist and patterns
- **Best Practices Guide**: [references/best-practices.md](references/best-practices.md)
- **Platform Adapters Guide**: [adapters/README.md](adapters/README.md)
- **Evaluation Framework**: [references/evaluation-framework.md](references/evaluation-framework.md)
- **Platform Compatibility**: [references/platform-compatibility.md](references/platform-compatibility.md)
- **Skill Categories**: [references/skill-categories.md](references/skill-categories.md) - 9 business-purpose categories (what to build)
- **Skill Patterns**: [references/skill-patterns.md](references/skill-patterns.md) - Six proven patterns for complex skills
- **Troubleshooting**: [references/troubleshooting.md](references/troubleshooting.md) - Common issues and fixes
- **Output Patterns**: [references/output-patterns.md](references/output-patterns.md) - Output formatting guidance
- **Quick Reference**: [references/quick-reference.md](references/quick-reference.md) - CLI commands and checklists
- **Skill Creation**: [references/skill-creation.md](references/skill-creation.md) - Step-by-step creation guide
