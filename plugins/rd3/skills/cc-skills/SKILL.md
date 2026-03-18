---
name: cc-skills
description: Create, modify, evaluate, and package Agent skills. This skill should be used when you want to scaffold a new skill directory, validate skill structure across multiple platforms, generate platform-specific companion files, or migrate existing rd2 skills.
license: Apache-2.0
metadata:
  author: cc-agents
  version: "3.0.0"
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
---

# cc-skills: Universal Skill Creator
<!-- eval-ignore-platform -->

Create Agent skills that work across ALL platforms from a single source of truth.

## Operations

This skill accepts **4 operations**:

| Operation | Purpose | Script |
|-----------|---------|--------|
| **add** | Scaffold a new skill | `scripts/scaffold.ts` |
| **evaluate** | Validate and score skill quality | `scripts/evaluate.ts` |
| **refine** | Fix issues and improve quality | `scripts/refine.ts` |
| **package** | Package for distribution | `scripts/package.ts` |

## Workflow Design

Each operation has a **step-by-step workflow** combining scripts and checklists:

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

```bash
# Add: Initialize a new skill
bun scripts/scaffold.ts my-skill --path ./skills

# Evaluate: Validate skill structure (Two-Tier: Structural + Quality)
bun scripts/evaluate.ts ./skills/my-skill --scope full

# Refine: Apply fixes (deterministic + LLM)
bun scripts/refine.ts ./skills/my-skill --best-practices --llm-refine

# Package: Create distribution bundle
bun scripts/package.ts ./skills/my-skill --output ./dist
```

## When to Use

- Creating a new skill from scratch → use **add**
- Validating skill structure → use **evaluate**
- Fixing quality issues → use **refine**
- Preparing for distribution → use **package**
- Migrating rd2 skills to rd3 → use **refine --migrate**

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
| **Claude Code** | `!`cmd``, `$ARGUMENTS`, `context: fork`, `hooks:` | None (native) |
| **Codex** | `agents/openai.yaml` (UI metadata) | agents/openai.yaml |
| **OpenClaw** | `metadata.openclaw` (emoji, requires) | None (embedded) |
| **OpenCode** | Config-level `permission.skill` | None (hints only) |
| **Antigravity** | Gemini CLI compatible | None (validates) |

## Migration from rd2

| rd2 Feature | Migration Action |
|-------------|-----------------|
| `!`cmd`` syntax | Keep for Claude, add Platform Notes |
| `$ARGUMENTS`, `$N` | Keep for Claude, document limitation |
| Missing `name:` field | Add explicit `name:` from directory |
| Python scripts | Keep (scripts are platform-agnostic) |

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
| OpenClaw | metadata.openclaw format, emoji, requirements |
| OpenCode | Permission hints, configuration |
| Antigravity | Gemini CLI compatibility |

### Migration Workflow

When migrating from rd2:

1. Run evaluation first: `bun scripts/evaluate.ts ./old-skill --scope full`
2. Apply migration: `bun scripts/refine.ts ./old-skill --migrate`
3. Verify: `bun scripts/evaluate.ts ./old-skill --scope full`
4. Generate platform companions: `bun scripts/refine.ts ./old-skill --platform all`

## Platform Notes

### Claude Code
- Use `!`cmd`` for live command execution (e.g., `!\`ls -la\``)
- Use `$ARGUMENTS` to reference command-line arguments provided by user
- Use `context: fork` for parallel reasoning in separate context
- Use `hooks:` for pre/post tool execution automation
- **Note**: These features are Claude-specific and not available on other platforms

### Codex / OpenClaw / OpenCode / Antigravity
- Run commands via Bash tool: use standard shell commands
- Arguments are provided directly in chat, not via `$ARGUMENTS`
- Platform companions (openai.yaml, metadata.openclaw) are auto-generated

## Best Practices

Follow these best practices to create effective, maintainable skills. See [references/best-practices.md](references/best-practices.md) for the complete guide.

### Core Principles

- **Concise is Key**: Challenge each piece of information - does Claude really need this?
- **Set Degrees of Freedom**: Match specificity to task fragility (High/Medium/Low)
- **Test with Target Models**: Works differently on Haiku vs Sonnet vs Opus
- **Script vs LLM**: Use scripts for deterministic issues, LLM for fuzzy issues (see workflows.md)

<!-- Full best practices moved to references/best-practices.md -->

## Evaluation Dimensions

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
