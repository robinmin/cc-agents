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

## When to Use

Use this skill when:
- Creating a new skill from scratch
- Scaffolding a skill directory with templates
- Validating skill structure across multiple platforms
- Generating platform-specific companion files
- Migrating existing rd2 skills to the new universal format

## Quick Start

```bash
# Initialize a new skill
bun ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/scaffold.ts my-skill --path ./skills

# Validate skill structure
bun ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/validate.ts ./skills/my-skill

# Evaluate skill quality
bun ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/evaluate.ts ./skills/my-skill --scope full
```

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

## Commands Reference

```bash
# Create new skill with template
/rd3:skill-add <name> --template <type> --resources <list>

# Validate skill structure
/rd3:skill-evaluate <path> --scope basic

# Evaluate skill quality
/rd3:skill-evaluate <path> --scope full --platform all

# Refine skill based on evaluation
/rd3:skill-refine <path> --from-eval <results.json>

# Migrate rd2 skill to rd3
/rd3:skill-refine <path> --migrate --platform all
```

## Migration from rd2

| rd2 Feature | Migration Action |
|-------------|-----------------|
| `!`cmd`` syntax | Keep for Claude, add Platform Notes |
| `$ARGUMENTS`, `$N` | Keep for Claude, document limitation |
| Missing `name:` field | Add explicit `name:` from directory |
| Python scripts | Keep (scripts are platform-agnostic) |

## Examples

### Example 1: Create a New Skill

```bash
# Scaffold a new technique-type skill
bun run scripts/scaffold.ts my-api-skill --template technique --path ./skills

# The skill is created at: ./skills/my-api-skill/SKILL.md
```

### Example 2: Evaluate and Refine

```bash
# First evaluate the skill
bun run scripts/evaluate.ts ./skills/my-api-skill --scope full --verbose --json

# Then refine based on findings
bun run scripts/refine.ts ./skills/my-api-skill --from-eval eval-results.json
```

### Example 3: Generate Platform Companions

```bash
# Generate Codex-specific companions
bun run scripts/refine.ts ./skills/my-api-skill --platform codex

# Generate OpenClaw companions
bun run scripts/refine.ts ./skills/my-api-skill --platform openclaw

# Generate all platform companions
bun run scripts/refine.ts ./skills/my-api-skill --platform all
```

### Example 4: Package for Distribution

```bash
# Package skill for distribution
bun run scripts/package.ts ./skills/my-api-skill --output ./dist/my-api-skill
```

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

1. Run evaluation first: `bun run scripts/evaluate.ts ./old-skill --scope full`
2. Apply migration: `bun run scripts/refine.ts ./old-skill --migrate`
3. Verify: `bun run scripts/evaluate.ts ./old-skill --scope full`
4. Generate platform companions: `bun run scripts/refine.ts ./old-skill --platform all`

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

## Additional Resources

- **Platform Adapters Guide**: [adapters/README.md](adapters/README.md)
- **Evaluation Framework**: [references/evaluation-framework.md](references/evaluation-framework.md)
- **Platform Compatibility**: [references/platform-compatibility.md](references/platform-compatibility.md)
