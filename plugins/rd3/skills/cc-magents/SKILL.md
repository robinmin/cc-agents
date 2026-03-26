---
name: cc-magents
description: "Use PROACTIVELY for creating AGENTS.md, evaluating config quality, refining CLAUDE.md, evolving agent configs, converting between platforms, adapting AGENTS.md to CLAUDE.md, scoring main agent configs, generating agent rules, creating main agent configurations. Supports 23+ platforms using a Universal Main Agent Model (UMAM) and 5-dimension quality scoring."
license: Apache-2.0
metadata:
  author: cc-agents
  version: "4.0.0"
  platforms: "claude,codex,openclaw,opencode,antigravity"
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
---

# cc-magents: Universal Main Agent Config Manager

Create, validate, evaluate, refine, evolve, and adapt main agent configuration files across 23+ AI coding agent platforms.

**Key difference from rd3:cc-agents**: This skill manages **main agent configs** (AGENTS.md, CLAUDE.md, etc.) -- the top-level project/global files that govern agent behavior. rd3:cc-agents manages **subagent definitions** (individual agent .md files within plugin directories).

## When to Use

- Creating a new AGENTS.md, CLAUDE.md, or other main agent config -> use **add**
- Scoring config quality across 5 dimensions (validates automatically) -> use **evaluate**
- Fixing issues and applying best practices (validates automatically) -> use **refine**
- Self-improving from interaction feedback -> use **evolve**
- Converting between platform formats -> use **adapt**

## Commands

Invoke operations via slash commands:

| Command | Operation | When to Use |
|---------|-----------|-------------|
| `/rd3:magent-add` | add | Create new config from template |
| `/rd3:magent-evaluate` | evaluate | Score quality (A-F grade) |
| `/rd3:magent-refine` | refine | Auto-fix issues |
| `/rd3:magent-evolve` | evolve | Self-improvement proposals |
| `/rd3:magent-adapt` | adapt | Convert between platforms |

## Quick Start

```bash
# Create a new AGENTS.md from template
bun scripts/synthesize.ts general-agent --output AGENTS.md

# Score quality (5 dimensions, A-F grade) - validation runs automatically
bun scripts/evaluate.ts AGENTS.md --profile standard

# Fix issues (preview first)
bun scripts/refine.ts AGENTS.md --dry-run

# Apply fixes
bun scripts/refine.ts AGENTS.md --apply

# Suggest improvements from patterns
bun scripts/evolve.ts AGENTS.md --propose

# Convert CLAUDE.md to .cursorrules
bun scripts/adapt.ts CLAUDE.md --to cursorrules --output .cursorrules
```

## Operations

This skill provides **6 operations**:

| Operation | Purpose | Script | Command |
|-----------|---------|--------|---------|
| **add** | Generate new config from requirements + auto-detection | `scripts/synthesize.ts` | `/rd3:magent-add` |
| **validate** | Check config structure before evaluation | `scripts/validate.ts` | `/rd3:magent-validate` |
| **evaluate** | 5-dimension quality scoring with A-F grading | `scripts/evaluate.ts` | `/rd3:magent-evaluate` |
| **refine** | Fix issues, apply best practices | `scripts/refine.ts` | `/rd3:magent-refine` |
| **evolve** | Self-improve from interaction feedback (L1: suggest only) | `scripts/evolve.ts` | `/rd3:magent-evolve` |
| **adapt** | Cross-platform conversion via UMAM | `scripts/adapt.ts` | `/rd3:magent-adapt` |

## Workflows

### New Config Workflow

```
add -> validate -> evaluate -> refine -> adapt
```

1. **add**: Create from template with project auto-detection
2. **validate**: Check config structure
3. **evaluate**: Score quality across 5 dimensions
4. **refine**: Auto-fix structural issues
5. **adapt**: Convert to target platforms (if needed)

### Improve Existing Workflow

```
validate -> evaluate -> refine -> evaluate (verify improvement)
```

1. **validate**: Check config structure
2. **evaluate**: Initial quality assessment
3. **refine**: Apply auto-fixes and suggestions
4. **evaluate**: Verify improvement

### Cross-Platform Workflow

```
validate -> evaluate -> adapt -> validate (target) -> evaluate (target)
```

1. **validate**: Verify source config structure
2. **evaluate**: Verify source config quality
3. **adapt**: Convert to target platform
4. **validate**: Check target config structure
5. **evaluate**: Verify target config quality

### Self-Evolution Workflow

```
evolve --analyze -> evolve --propose -> evolve --apply -> evaluate
```

1. **evolve --analyze**: Scan data sources for patterns
2. **evolve --propose**: Generate improvement proposals
3. **evolve --apply**: Apply approved proposals (with --confirm)
4. **evaluate**: Verify grade improvement

Embedded LLM content improvement is part of the normal workflow for every operation; it is not a separate CLI mode.

For detailed workflow definitions with step-by-step flows, branching logic, retry policies, and embedded LLM content-improvement checklists:

**See [references/workflows.md](references/workflows.md)**

## Add Operation

Generate new main agent configuration files from templates.

### Templates

| Template | Purpose | Best For |
|----------|---------|----------|
| `dev-agent` | Software development | Node.js, Go, Rust, Python projects |
| `research-agent` | Research and analysis | Investigation tasks |
| `content-agent` | Content creation | Documentation, blogs |
| `data-agent` | Data science and ML | Data analysis projects |
| `devops-agent` | DevOps and infrastructure | CI/CD, deployments |
| `general-agent` | General purpose | Any project type |

### Auto-Detection

Add auto-detects:
- Primary language (Node.js, Go, Rust, Python, etc.)
- Frameworks (React, FastAPI, NestJS, etc.)
- Package manager (npm, pnpm, yarn, go mod, cargo, pip)
- Test runner (vitest, jest, pytest, etc.)
- CI/CD platform (GitHub Actions, GitLab, Jenkins)

### Examples

```bash
# Create AGENTS.md for a Node.js project
bun scripts/synthesize.ts dev-agent --output AGENTS.md

# Create CLAUDE.md for a Go project
bun scripts/synthesize.ts dev-agent --platform claude-md --output CLAUDE.md
```

## Evaluate Operation

Quality scoring across 5 MECE dimensions.

### Dimensions

| Dimension | Weight (Standard) | Measures |
|-----------|------------------|----------|
| **Coverage** | 25% | Core sections and concerns are present and substantive |
| **Operability** | 25% | Decision trees, executable examples, output contracts |
| **Grounding** | 20% | Evidence, verification steps, uncertainty handling |
| **Safety** | 20% | CRITICAL rules, approvals, destructive warnings, prompt injection defense, tool scoping |
| **Maintainability** | 10% | Memory architecture, bootstrap, evolution loops, version tracking |

### Weight Profiles

| Profile | Coverage | Operability | Grounding | Safety | Maintainability |
|---------|----------|-------------|-----------|--------|-----------------|
| **standard** | 25% | 25% | 20% | 20% | 10% |
| **minimal** | 30% | 20% | 15% | 30% | 5% |
| **advanced** | 20% | 20% | 25% | 15% | 20% |

### Grade Thresholds

| Grade | Score | Pass? |
|-------|-------|-------|
| A | >= 90% | Yes |
| B | >= 80% | Yes |
| C | >= 70% | Warning |
| D | >= 60% | No |
| F | < 60% | No |

### Examples

```bash
# Standard evaluation
bun scripts/evaluate.ts AGENTS.md

# For simple configs (prioritize coverage/safety)
bun scripts/evaluate.ts AGENTS.md --profile minimal

# For self-evolving configs
bun scripts/evaluate.ts AGENTS.md --profile advanced

# JSON for CI
bun scripts/evaluate.ts AGENTS.md --json --output evaluation-report.json
```

## Refine Operation

Auto-fix structural issues and apply best practices.

### Actions

| Type | Approval Required | Examples |
|------|------------------|----------|
| **structural** | Sometimes | Remove empty sections, merge duplicates |
| **quality** | Yes | Add missing sections, expand content |
| **best-practice** | No | Remove forbidden AI phrases |

### CRITICAL Protection

Sections containing `[CRITICAL]` markers are NEVER modified, even with `--apply`.

### Forbidden Phrases (auto-removed)

- "great question"
- "I'm sorry"
- "would you like me to"
- "let me think"
- "as an AI"

### Examples

```bash
# Preview changes
bun scripts/refine.ts AGENTS.md --dry-run

# Apply fixes
bun scripts/refine.ts AGENTS.md --apply

# Output to new file
bun scripts/refine.ts AGENTS.md --output ./output/AGENTS.refined.md
```

## Evolve Operation

Self-improvement based on pattern analysis.

### Data Sources

| Source | Looks For |
|--------|-----------|
| Git history | Commit frequency, section modifications |
| CI results | Test failures, quality trends |
| User feedback | Ratings, explicit signals |
| Memory files | MEMORY.md patterns |
| Interaction logs | Command usage, success/failure |

### Safety Levels

> **Note**: Safety levels (L1/L2/L3) are documented for future use. Currently all apply operations require explicit `--confirm` regardless of safety level.

| Level | Behavior |
|-------|----------|
| **L1** (default) | Suggest-only, all changes require approval |
| **L2** | Reserved for future semi-auto behavior |
| **L3** | Reserved for fully autonomous behavior |

### Commands

```bash
# Analyze patterns
bun scripts/evolve.ts AGENTS.md --analyze

# Generate proposals
bun scripts/evolve.ts AGENTS.md --propose

# Apply approved proposal
bun scripts/evolve.ts AGENTS.md --apply proposal-id --confirm

# View history
bun scripts/evolve.ts AGENTS.md --history

# Rollback
bun scripts/evolve.ts AGENTS.md --rollback v1 --confirm
```

## Adapt Operation

Convert between platform formats.

### Supported Platforms

#### Tier 1: Full Support (Parse + Generate + Validate)

| Platform | File Names |
|----------|------------|
| agents-md | AGENTS.md, .agents.md |
| claude-md | CLAUDE.md, .claude/CLAUDE.md |
| gemini-md | GEMINI.md, .gemini/GEMINI.md |
| codex | codex.md, .codex/AGENTS.md |
| openclaw | SOUL.md, IDENTITY.md, AGENTS.md, USER.md, TOOLS.md, HEARTBEAT.md, MEMORY.md |

#### Tier 2: Standard Support (Parse + Generate)

| Platform | File Names |
|----------|------------|
| cursorrules | .cursorrules |
| windsurfrules | .windsurfrules |
| zed-rules | .zed/rules |
| opencode-rules | opencode.md, .opencode/rules.md |

#### Tier 3: Basic (Generate Only)

| Platform | File Names |
|----------|------------|
| junie | .junie/rules.md, junie.md |
| augment | .augment/rules.md, augment.md |
| cline | .cline/rules.md, cline.md |
| aider | .aider.conf.yml |
| warp | .warp/rules.md |
| roocode | .roo/rules.md, .roocode/rules.md |
| amp | .amp/rules.md |
| vscode-instructions | .github/copilot-instructions.md |

### Conversion Warnings

Some features may be lost in conversion:

| Source | Target | Issue |
|--------|--------|-------|
| CLAUDE.md | Codex | Memory patterns lost |
| CLAUDE.md | .cursorrules | Hooks not portable |
| GEMINI.md | Any except GEMINI | save_memory not portable |

### Examples

```bash
# Convert to AGENTS.md
bun scripts/adapt.ts CLAUDE.md --to agents-md --output AGENTS.md

# Convert to .cursorrules
bun scripts/adapt.ts AGENTS.md --to cursorrules --output .cursorrules

# Convert to all platforms
bun scripts/adapt.ts AGENTS.md --to all --output ./converted
```

## Architecture

### Universal Main Agent Model (UMAM)

All configs are parsed into UMAM -- a section-based internal representation:

```typescript
interface UniversalMainAgent {
    sourcePath: string;
    sourceFormat: MagentPlatform;
    metadata?: MagentMetadata;
    sections: MagentSection[];    // Ordered array of content sections
    hierarchy?: 'global' | 'project' | 'directory';
    estimatedTokens?: number;
    platformFeatures?: string[];
}
```

**Key difference from UAM** (subagent model): UMAM is section-based with flexible headings. UAM is frontmatter-based with rigid 8-section anatomy.

### Platform Tiers

| Tier | Platforms | Support |
|------|-----------|---------|
| 1 (Full) | AGENTS.md, CLAUDE.md, GEMINI.md, Codex, OpenClaw | Parse + Generate + Validate |
| 2 (Standard) | .cursorrules, .windsurfrules, Zed, OpenCode | Parse + Generate |
| 3 (Basic) | Aider, Warp, RooCode, Amp, VS Code | Generate only |
| 4 (Generic) | All others | AGENTS.md pass-through |

**Canonical format**: AGENTS.md (official standard under Agentic AI Foundation). All conversions go through UMAM.

## Integration with rd3:cc-agents

**rd3:cc-agents** manages subagent definitions (individual agent .md files in plugin directories).

**rd3:cc-magents** manages main agent configs (AGENTS.md, CLAUDE.md at project root).

Both use similar quality frameworks but different models:
- Subagent: UAM (frontmatter-based, 8-section anatomy)
- Main agent: UMAM (section-based, flexible headings)

## References

- [AGENTS.md Official Specification](https://agents.md/)
- [Agentic AI Foundation](https://aaif.io)
- `references/evaluation-framework.md` (scoring rubric)
- `references/evolution-protocol.md` (self-evolution safety)
- `references/platform-compatibility.md` (cross-platform feature matrix)
- `references/red-flags.md` (red flags checklist)
- `references/workspace-file-taxonomy.md` (OpenClaw 7-file model)
- `references/security-hardening.md` (tiered security patterns)
- `references/memory-architecture.md` (daily memory and curation)
- `references/bootstrap-patterns.md` (first-run and progressive adoption)
- `references/troubleshooting.md` (common issues and fixes)
- `references/workflows.md` (detailed workflow definitions)

See [Additional Resources](references/external-resources.md) for detailed content.
