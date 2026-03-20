---
name: cc-magents
description: "Use this skill when the user asks to 'create an AGENTS.md', 'evaluate config quality', 'refine CLAUDE.md', 'evolve agent config', 'convert between platforms', 'adapt AGENTS.md to CLAUDE.md', 'score main agent config', 'generate agent rules', 'create a main agent', 'main agent configuration'. Creates, evaluates, refines, evolves, and adapts main agent configuration files (AGENTS.md, CLAUDE.md, GEMINI.md, .cursorrules, etc.) across 23+ platforms using a Universal Main Agent Model (UMAM) and 5-dimension quality scoring."
license: Apache-2.0
version: "1.0.0"
author: cc-agents
platforms: "agents-md,claude-md,gemini-md,codex,cursorrules,windsurfrules,zed-rules,opencode-rules,aider,warp,roocode,amp,vscode-instructions,junie,augment,cline"
tags: ["agents-md", "claude-md", "gemini-md", "main-agent", "configuration", "multi-platform"]
triggers:
  - "create an AGENTS.md"
  - "create CLAUDE.md"
  - "generate AGENTS.md"
  - "evaluate config quality"
  - "score main agent config"
  - "refine CLAUDE.md"
  - "improve AGENTS.md"
  - "evolve agent config"
  - "convert between platforms"
  - "adapt AGENTS.md to CLAUDE.md"
  - "convert to cursorrules"
  - "generate agent rules"
  - "create main agent configuration"
  - "score AGENTS.md"
  - "assess CLAUDE.md quality"
  - "lint agent config"
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
# Create a new AGENTS.md with auto-detection
/rd3:magent-add dev-agent

# Score quality (5 dimensions, A-F grade) - validation runs automatically
/rd3:magent-evaluate AGENTS.md

# Fix issues (preview first)
/rd3:magent-refine AGENTS.md --dry-run

# Apply fixes
/rd3:magent-refine AGENTS.md --apply

# Suggest improvements from patterns
/rd3:magent-evolve AGENTS.md --propose

# Convert CLAUDE.md to .cursorrules
/rd3:magent-adapt CLAUDE.md --to cursorrules
```

## Operations

This skill provides **5 operations**:

| Operation | Purpose | Script | Command |
|-----------|---------|--------|---------|
| **add** | Generate new config from requirements + auto-detection | `scripts/synthesize.ts` | `/rd3:magent-add` |
| **evaluate** | 5-dimension quality scoring with A-F grading (validates first) | `scripts/evaluate.ts` | `/rd3:magent-evaluate` |
| **refine** | Fix issues, apply best practices (validates first) | `scripts/refine.ts` | `/rd3:magent-refine` |
| **evolve** | Self-improve from interaction feedback (L1: suggest only) | `scripts/evolve.ts` | `/rd3:magent-evolve` |
| **adapt** | Cross-platform conversion via UMAM | `scripts/adapt.ts` | `/rd3:magent-adapt` |

## Workflows

### New Config Workflow

```
add -> evaluate -> refine -> adapt
```

1. **add**: Create from template with project auto-detection
2. **evaluate**: Score quality across 5 dimensions (validation runs first)
3. **refine**: Auto-fix structural issues
4. **adapt**: Convert to target platforms (if needed)

### Improve Existing Workflow

```
evaluate -> refine -> evaluate (verify improvement)
```

1. **evaluate**: Initial quality assessment
2. **refine**: Apply auto-fixes and suggestions
3. **evaluate**: Verify improvement

### Cross-Platform Workflow

```
evaluate -> adapt -> evaluate (target platform)
```

1. **evaluate**: Verify source config quality (validation runs first)
2. **adapt**: Convert to target platform
3. **evaluate**: Verify target config quality

### Self-Evolution Workflow

```
evolve --analyze -> evolve --propose -> evolve --apply -> evaluate
```

1. **evolve --analyze**: Scan data sources for patterns
2. **evolve --propose**: Generate improvement proposals
3. **evolve --apply**: Apply approved proposals (with --confirm)
4. **evaluate**: Verify grade improvement

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
# Auto-detect project and create AGENTS.md
/rd3:magent-add

# Create CLAUDE.md for Go project
/rd3:magent-add dev-agent --platform claude-md --output CLAUDE.md

# Create for specific template
/rd3:magent-add data-agent
```

## Evaluate Operation

Quality scoring across 5 dimensions.

### Dimensions

| Dimension | Weight (Standard) | Measures |
|-----------|------------------|----------|
| **Completeness** | 25% | Required sections present and substantive |
| **Specificity** | 20% | Examples, decision trees, versions |
| **Verifiability** | 20% | Anti-hallucination, confidence scoring |
| **Safety** | 20% | CRITICAL rules, destructive warnings |
| **Evolution-Readiness** | 15% | Memory, feedback mechanisms |

### Weight Profiles

| Profile | Completeness | Specificity | Verifiability | Safety | Evolution |
|---------|-------------|-------------|---------------|--------|-----------|
| **standard** | 25% | 20% | 20% | 20% | 15% |
| **minimal** | 30% | 20% | 15% | 30% | 5% |
| **advanced** | 20% | 15% | 25% | 15% | 25% |

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
/rd3:magent-evaluate AGENTS.md

# For simple configs (prioritize completeness/safety)
/rd3:magent-evaluate CLAUDE.md --profile minimal

# For self-evolving configs
/rd3:magent-evaluate AGENTS.md --profile advanced

# JSON for CI
/rd3:magent-evaluate AGENTS.md --json --output report.json
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
/rd3:magent-refine AGENTS.md --dry-run

# Apply fixes
/rd3:magent-refine CLAUDE.md --apply

# Output to new file
/rd3:magent-refine AGENTS.md --output refined.md
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

| Level | Behavior |
|-------|----------|
| **L1** (default) | Suggest-only, all changes require approval |
| **L2** | Semi-auto, low-risk changes auto-apply |
| **L3** | Auto, fully autonomous |

### Commands

```bash
# Analyze patterns
/rd3:magent-evolve AGENTS.md --analyze

# Generate proposals
/rd3:magent-evolve AGENTS.md --propose

# Apply approved proposal
/rd3:magent-evolve AGENTS.md --apply p1abc1234 --confirm

# View history
/rd3:magent-evolve AGENTS.md --history

# Rollback
/rd3:magent-evolve AGENTS.md --rollback v2 --confirm
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
/rd3:magent-adapt CLAUDE.md --to agents-md

# Convert to .cursorrules
/rd3:magent-adapt AGENTS.md --to cursorrules

# Convert to all platforms
/rd3:magent-adapt CLAUDE.md --to all --output ./converted/
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
| 1 (Full) | AGENTS.md, CLAUDE.md, GEMINI.md, Codex | Parse + Generate + Validate |
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
- Internal: `plugins/rd3/skills/cc-agents/SKILL.md` (subagent meta skill)
- `references/evaluation-framework.md` (scoring rubric)
- `references/evolution-protocol.md` (self-evolution safety)
