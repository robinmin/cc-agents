# Brainstorm: rd3:cc-magents Meta Skill

## Executive Summary

This document presents a comprehensive brainstorm and requirements analysis for `rd3:cc-magents` -- a universal meta skill for managing **main agent configuration files** (AGENTS.md, CLAUDE.md, GEMINI.md, .cursorrules, etc.) across 23+ AI coding agent platforms. This is distinct from `rd3:cc-agents` which handles subagent definitions.

The key insight: main agent configs are fundamentally different from subagents. They are project-scoped living documents, not single-file definitions. They have hierarchical inheritance (global -> project -> directory), platform-specific discovery mechanisms, and no frontmatter contract. This demands a different operational model while maintaining architectural alignment with the cc-agents/cc-skills/cc-commands family.

**Confidence**: HIGH
**Sources**: AGENTS.md official spec (agents.md, 2026), 25+ academic papers (2023-2026), 328 analyzed CLAUDE.md files (Santos et al., 2025), existing rd3:cc-agents codebase, sample prototypes at /Users/robin/tcc/repo/docs/research/0001/
**Date**: 2026-03-19

---

## 1. Operations Analysis

### 1.1 Comparison: Subagent vs Main Agent Operations

| cc-agents (Subagent) | cc-magents (Main Agent) | Why Different |
|----------------------|------------------------|---------------|
| scaffold | synthesize | Main agents are generated from requirements + domain, not templates with tiers |
| validate | validate | Structure checking applies to both, but different schemas |
| evaluate | evaluate (doctor) | Different dimensions: 5 (magent) vs 10 (subagent) |
| refine | evolve | Main agents self-improve from interaction feedback, not just fix issues |
| adapt | adapt | Cross-platform conversion applies to both |
| -- | merge | Main agents need combining (global + project + directory) |
| -- | diff | Compare two configs to understand divergence |

### 1.2 Recommended Operations (7 Total)

#### Operation 1: synthesize

**Purpose**: Generate a new main agent config (AGENTS.md/CLAUDE.md/etc.) from requirements, domain, and project context.

**Pros**:
- Most requested operation -- users start here
- Domain templates (dev, research, content, data, devops, general) provide strong starting points
- Can analyze existing codebase to auto-detect tech stack, tooling, conventions
- Aligns with magent-synthesizer prototype

**Cons**:
- Generating good main agent configs requires deep project understanding
- Over-templating can produce generic configs that add little value
- Different platforms have wildly different feature sets

**Recommendation**: Include. This is the primary entry point. Use project analysis (scan package.json, Makefile, CI configs) to auto-populate rather than relying solely on templates.

**Script**: `scripts/synthesize.ts`

**Key features**:
- Project auto-detection (language, framework, tooling, test runner)
- Domain template selection (6 templates as assets)
- Platform-specific generation (AGENTS.md, CLAUDE.md, GEMINI.md, .cursorrules)
- Personality pattern selection (expert, assistant, collaborator)
- Hierarchical config awareness (generate global vs project vs directory)

#### Operation 2: validate

**Purpose**: Check structural correctness of a main agent config file.

**Pros**:
- Fast, deterministic check before evaluation
- Catches common errors (broken YAML, missing sections, oversized files)
- Platform-specific validation rules (32 KiB limit for Codex, etc.)
- Low complexity to implement

**Cons**:
- Main agent configs have no required fields per AGENTS.md spec ("standard Markdown, any headings")
- Validation rules are looser than subagent frontmatter contracts

**Recommendation**: Include. Even without strict schemas, structural validation catches real issues: broken markdown, exceeding size limits, conflicting directives, dangerous patterns (hardcoded secrets, overly permissive rules).

**Script**: `scripts/validate.ts`

**Key checks**:
- Markdown well-formedness
- YAML frontmatter validity (if present)
- Platform-specific size limits (Codex: 32 KiB, others: configurable)
- Security scan (no hardcoded secrets, no dangerous shell commands in examples)
- Section hierarchy depth (shallow is better -- Santos et al., 2025)
- Cross-reference validation (mentioned files/commands exist)

#### Operation 3: evaluate (doctor)

**Purpose**: Score main agent config quality across 5 dimensions with actionable recommendations.

**Pros**:
- Directly answers "how good is my AGENTS.md?"
- Research-backed 5-dimension framework
- Grades (A-F) provide clear quality signal
- Aligns with magent-doctor prototype

**Cons**:
- Quality is partially subjective (what makes a "good" AGENTS.md?)
- Weights may need tuning per platform and use case
- Evolution-Readiness dimension is aspirational for most platforms

**Recommendation**: Include. This is the diagnostic tool. Use the 5-dimension framework from research but with adjusted weights for main agent configs vs subagents (see Section 4).

**Script**: `scripts/evaluate.ts`

#### Operation 4: refine

**Purpose**: Fix issues identified by validate/evaluate, apply best practices.

**Pros**:
- Completes the evaluate-refine feedback loop
- Can auto-fix deterministic issues (formatting, missing sections)
- LLM-assisted refinement for content quality
- Aligns with cc-agents pattern

**Cons**:
- Auto-modifying main agent configs is riskier than subagents (wider blast radius)
- Requires careful safety constraints

**Recommendation**: Include. But with mandatory `--dry-run` default and human approval gates for any content changes to CRITICAL sections.

**Script**: `scripts/refine.ts`

#### Operation 5: evolve

**Purpose**: Self-improve main agent config based on interaction feedback, failure patterns, and performance metrics.

**Pros**:
- Key differentiator from other meta skills
- Research-backed (Gao et al., 2025; Kar et al., 2026)
- Practical: collects failure patterns and suggests targeted improvements
- Addresses the "AGENTS.md staleness" problem

**Cons**:
- Requires interaction history (not all platforms provide this)
- Safety risk: autonomous modification of the file that governs agent behavior
- Version history and rollback add complexity
- Production self-evolution is still research-frontier

**Recommendation**: Include, but as a semi-automated operation (suggest changes, require human approval). Full autonomous evolution is out of scope for v1.

**Script**: `scripts/evolve.ts`

**Key features**:
- Pattern analysis from interaction logs (if available)
- Failure clustering by type (prompt issues, workflow gaps, tool misuse, context missing)
- Improvement proposal generation with diff preview
- CRITICAL rule protection (never auto-modify safety rules)
- Version history in `evolution-history/` directory
- Rollback capability

#### Operation 6: adapt

**Purpose**: Convert between platform-specific formats (AGENTS.md <-> CLAUDE.md <-> GEMINI.md <-> .cursorrules <-> etc.).

**Pros**:
- Directly addresses multi-platform reality (23+ agents)
- Most users work across multiple tools
- Cross-platform adapter pattern already proven in cc-agents
- AGENTS.md as universal interchange format

**Cons**:
- Main agent configs are more complex than subagent definitions
- Platform-specific features (Claude hooks, Gemini settings.json) don't always translate
- Lossy conversion is inevitable for some features

**Recommendation**: Include. This is essential for multi-platform teams. Use AGENTS.md as the canonical format (it is the official standard) and generate platform-specific companions.

**Script**: `scripts/adapt.ts`

**Supported conversions**:

| Source -> Target | Fidelity | Notes |
|-----------------|----------|-------|
| AGENTS.md -> CLAUDE.md | High | Add Claude-specific sections (tools, hooks, memory) |
| AGENTS.md -> GEMINI.md | High | Add settings.json integration |
| AGENTS.md -> .cursorrules | Medium | Flatten to Cursor format |
| AGENTS.md -> .windsurfrules | Medium | Similar to Cursor |
| AGENTS.md -> codex config | Medium | Generate TOML with project_docs |
| CLAUDE.md -> AGENTS.md | High | Strip Claude-specific features |
| Any -> Any | Via AGENTS.md | Two-step: parse to canonical, generate target |

#### Operation 7: diff

**Purpose**: Compare two main agent configs and produce a structured comparison report.

**Pros**:
- Useful for reviewing changes before/after evolution
- Helps teams understand config divergence across platforms
- Essential for merge operations

**Cons**:
- Markdown diff is harder than structured data diff
- Semantic diff (meaning) vs textual diff (characters) is complex

**Recommendation**: Include, but as a lightweight operation (not full script). Implement as a utility function within `utils.ts` used by evolve and merge.

**Not a separate script** -- integrated into evolve (before/after) and merge (conflict detection).

### 1.3 Deferred Operations (v2)

| Operation | Reason to Defer |
|-----------|----------------|
| **merge** | Complex conflict resolution; rare use case in v1 |
| **audit** | Track config changes over time; needs git integration |
| **benchmark** | A/B test configs against tasks; needs execution environment |

### 1.4 Final Operation List (v1)

```
synthesize -> validate -> evaluate -> refine -> evolve -> adapt
     |             |           |          |         |         |
  generate     check       score      fix      improve   convert
```

**6 operations, 6 scripts** -- aligned with cc-agents pattern but with evolve replacing the simple refine-only model.

---

## 2. Architecture

### 2.1 Directory Structure

```
plugins/rd3/skills/cc-magents/
├── SKILL.md                          # Fat skill definition (source of truth)
├── package.json                      # Bun/Node dependencies
├── tsconfig.json                     # TypeScript configuration
├── biome.json                        # Linting configuration
├── scripts/
│   ├── synthesize.ts                 # Generate new main agent config
│   ├── validate.ts                   # Structural validation
│   ├── evaluate.ts                   # 5-dimension quality scoring
│   ├── refine.ts                     # Fix issues, apply best practices
│   ├── evolve.ts                     # Self-evolution from feedback
│   ├── adapt.ts                      # Cross-platform conversion
│   ├── types.ts                      # Universal Main Agent Model (UMAM)
│   ├── utils.ts                      # Shared parsing/generation utilities
│   ├── evaluation.config.ts          # Scoring weights and thresholds
│   └── adapters/
│       ├── base.ts                   # Base adapter interface
│       ├── index.ts                  # Adapter registry
│       ├── agents-md.ts              # AGENTS.md (canonical standard)
│       ├── claude-md.ts              # CLAUDE.md
│       ├── gemini-md.ts              # GEMINI.md
│       ├── cursorrules.ts            # .cursorrules / .cursorprompt
│       ├── windsurfrules.ts          # .windsurfrules
│       ├── codex-config.ts           # Codex AGENTS.md + config.toml
│       ├── opencode-rules.ts         # OpenCode rules
│       ├── zed-rules.ts              # Zed .zed/rules
│       ├── aider-conventions.ts      # Aider .aider.conf.yml
│       └── generic-agentsmd.ts       # Generic AGENTS.md for unlisted platforms
├── references/
│   ├── agents-md-spec.md             # AGENTS.md official spec summary
│   ├── platform-features.md          # Per-platform feature matrix
│   ├── evaluation-framework.md       # 5-dimension scoring details
│   ├── evolution-patterns.md         # Self-evolution patterns from research
│   ├── safety-protocols.md           # Safety constraints for evolution
│   ├── domain-patterns.md            # Domain-specific config patterns
│   ├── hierarchy-patterns.md         # Global -> Project -> Directory patterns
│   ├── scripts-usage.md              # Full CLI arguments for all scripts
│   ├── troubleshooting.md            # Common issues and fixes
│   └── workflows.md                  # Workflow definitions for all operations
├── assets/
│   ├── templates/
│   │   ├── dev-agent.md              # Software development template
│   │   ├── research-agent.md         # Research/academic template
│   │   ├── content-agent.md          # Content creation template
│   │   ├── data-agent.md             # Data science/analysis template
│   │   ├── devops-agent.md           # DevOps/infrastructure template
│   │   └── general-agent.md          # General-purpose template
│   └── sections/
│       ├── anti-hallucination.md      # Reusable anti-hallucination block
│       ├── tool-priority.md           # Reusable tool priority matrix
│       ├── confidence-scoring.md      # Reusable confidence scoring block
│       ├── quality-gates.md           # Reusable quality gates block
│       └── memory-patterns.md         # Reusable memory architecture block
└── tests/
    ├── synthesize.test.ts
    ├── validate.test.ts
    ├── evaluate.test.ts
    ├── refine.test.ts
    ├── evolve.test.ts
    ├── adapt.test.ts
    └── fixtures/
        ├── sample-agents.md           # Sample AGENTS.md for testing
        ├── sample-claude.md           # Sample CLAUDE.md for testing
        ├── sample-gemini.md           # Sample GEMINI.md for testing
        └── sample-cursorrules         # Sample .cursorrules for testing
```

### 2.2 Key Architectural Decisions

#### Decision 1: Universal Main Agent Model (UMAM)

Just as cc-agents has UAM (Universal Agent Model) for subagents, cc-magents needs UMAM for main agent configs. However, main agent configs are fundamentally different:

**Subagent UAM**: Structured frontmatter + body (22 typed fields)
**Main Agent UMAM**: Semi-structured sections + metadata (flexible, section-based)

```typescript
interface UniversalMainAgent {
    // --- Source info ---
    sourcePath: string;
    sourceFormat: MagentPlatform;

    // --- Optional metadata (frontmatter if present) ---
    metadata?: {
        name?: string;
        description?: string;
        version?: string;
        effective?: string;          // Date
        globs?: string;              // File patterns
        alwaysApply?: boolean;
    };

    // --- Sections (the actual content) ---
    sections: MagentSection[];

    // --- Computed properties ---
    hierarchy?: 'global' | 'project' | 'directory';
    estimatedTokens?: number;
    platformFeatures?: string[];     // Platform-specific features detected
}

interface MagentSection {
    heading: string;                  // e.g., "## Critical Rules"
    level: number;                    // Heading level (1-6)
    content: string;                  // Section body
    category?: SectionCategory;       // Classified category
    criticality?: 'critical' | 'important' | 'recommended' | 'informational';
}

type SectionCategory =
    | 'identity'           // Role, persona, expertise
    | 'rules'              // Critical rules, constraints
    | 'workflow'           // Process, decision trees
    | 'tools'             // Tool priority, selection
    | 'standards'         // Coding standards, conventions
    | 'verification'      // Anti-hallucination, confidence
    | 'memory'            // Memory architecture, persistence
    | 'evolution'         // Self-improvement, learning
    | 'environment'       // Dev environment, setup
    | 'testing'           // Test instructions
    | 'output'            // Output format, style
    | 'custom';           // Unclassified
```

**Rationale**: Main agent configs don't have a rigid schema. AGENTS.md explicitly says "standard Markdown, any headings." The UMAM must be flexible enough to represent any config while still enabling structured analysis.

#### Decision 2: TypeScript with Bun

Consistent with cc-agents, cc-skills, cc-commands. All scripts use:
- Bun runtime for TypeScript execution
- No compilation step needed
- Shared utilities via imports
- CLI interface: `bun scripts/<operation>.ts [args]`

#### Decision 3: Adapter Pattern (Expanded)

cc-agents has 6 platform adapters. cc-magents needs more because main agent configs vary more widely:

| Adapter | Format | Discovery | Notes |
|---------|--------|-----------|-------|
| agents-md | Markdown | Git root traversal | Canonical standard |
| claude-md | Markdown | ~/.claude/ + project | Multi-layer (global/project/memory) |
| gemini-md | Markdown | ~/.gemini/ + project | settings.json integration |
| cursorrules | Plaintext | .cursorrules in project root | Simple format |
| windsurfrules | Plaintext | .windsurfrules in project root | Similar to Cursor |
| codex-config | Markdown + TOML | AGENTS.md + config.toml | Size-limited (32 KiB) |
| opencode-rules | Markdown | Project rules | Rules-based |
| zed-rules | Plaintext | .zed/rules/ | Directory of rules |
| aider-conventions | YAML + MD | .aider.conf.yml | Conventions-based |
| generic-agentsmd | Markdown | AGENTS.md | Fallback for unlisted platforms |

Each adapter implements:
```typescript
interface MagentAdapter {
    platform: MagentPlatform;
    parse(content: string, filePath: string): UniversalMainAgent;
    validate(agent: UniversalMainAgent): ValidationResult;
    generate(agent: UniversalMainAgent, options: GenerateOptions): string;
    detectFeatures(agent: UniversalMainAgent): string[];
    getDiscoveryPaths(projectRoot: string): string[];
}
```

#### Decision 4: Section Library (Composable Blocks)

Instead of only full templates, provide composable section blocks in `assets/sections/`. Users can mix-and-match:

```bash
# Generate AGENTS.md with specific sections
bun scripts/synthesize.ts --domain dev \
    --sections identity,rules,workflow,tools,testing \
    --output ./AGENTS.md
```

This addresses the "generic template" problem -- users get exactly the sections they need.

---

## 3. Platform Compatibility Strategy

### 3.1 Platform Tiers

Based on research and market adoption, group platforms into tiers:

| Tier | Platforms | Support Level | Adapter Complexity |
|------|-----------|--------------|-------------------|
| **Tier 1** (Full) | Claude Code, Gemini CLI, Codex | Parse + Generate + Validate | Full bidirectional |
| **Tier 2** (Standard) | Cursor, Windsurf, Zed, OpenCode | Parse + Generate | Standard bidirectional |
| **Tier 3** (Basic) | Aider, Warp, RooCode, Amp, VS Code | Generate only | One-directional |
| **Tier 4** (Generic) | All others (23+ per AGENTS.md spec) | AGENTS.md pass-through | No platform-specific features |

### 3.2 Cross-Platform Feature Matrix

| Feature | AGENTS.md | CLAUDE.md | GEMINI.md | .cursorrules | Codex |
|---------|-----------|-----------|-----------|-------------|-------|
| YAML frontmatter | Optional | Yes | Optional | No | No |
| Hierarchical loading | Yes (dir traversal) | Yes (global/project) | Yes (global/workspace) | No (single file) | Yes (dir traversal) |
| Size limit | None | None | None | None | 32 KiB |
| File patterns (globs) | No | Yes | No | No | No |
| Override files | AGENTS.override.md | No | No | No | AGENTS.override.md |
| Fallback names | Configurable | AGENTS.md | AGENTS.md | No | CLAUDE.md, README.md |
| Memory integration | No | Yes (MEMORY.md) | No | No | No |
| Hooks | No | Yes | No | No | No |
| MCP servers | No | Yes | No | No | No |
| Tool configuration | No | Yes | No | No | No |

### 3.3 Conversion Strategy

**Canonical format**: AGENTS.md (the official standard under Linux Foundation)

**Conversion approach**:
1. All conversions go through UMAM (Universal Main Agent Model)
2. Platform-specific features are preserved in `platformFeatures`
3. Lossy conversions emit warnings (e.g., "Claude hooks not supported in Cursor")
4. Generate platform-specific companion files alongside AGENTS.md

**Example workflow**:
```
CLAUDE.md (with hooks, tools, memory)
    -> parse to UMAM
    -> generate AGENTS.md (universal content, drop Claude-specific)
    -> generate GEMINI.md (add settings.json hints)
    -> generate .cursorrules (flatten to rules format)
    -> warnings: "Hooks, MCP servers, memory dropped for non-Claude targets"
```

### 3.4 Discovery Integration

Each adapter knows how to find its platform's config files:

```typescript
// Example: Claude adapter discovery
getDiscoveryPaths(projectRoot: string): string[] {
    return [
        `${projectRoot}/CLAUDE.md`,
        `${projectRoot}/.claude/CLAUDE.md`,
        `${HOME}/.claude/CLAUDE.md`,
        `${HOME}/.claude/projects/${projectRoot}/CLAUDE.md`,
    ];
}

// Example: Codex adapter discovery
getDiscoveryPaths(projectRoot: string): string[] {
    return [
        `${projectRoot}/AGENTS.override.md`,
        `${projectRoot}/AGENTS.md`,
        `${HOME}/.codex/AGENTS.override.md`,
        `${HOME}/.codex/AGENTS.md`,
    ];
}
```

---

## 4. Scoring / Evaluation Framework

### 4.1 Dimension Analysis

The research identifies 5 dimensions. Here is the analysis of each for main agent configs:

#### Dimension 1: Completeness (Weight: 25%)

**What it measures**: All necessary sections present and substantive.

**Scoring criteria**:
| Item | Points | Description |
|------|--------|-------------|
| Identity/Role defined | 0-20 | Agent knows what it is and its expertise |
| Rules specified with priority levels | 0-20 | CRITICAL/IMPORTANT/RECOMMENDED classification |
| Workflow patterns documented | 0-20 | Decision trees, process flows, tool selection |
| Technical standards included | 0-20 | Toolchain, quality gates, conventions |
| Output/Communication defined | 0-20 | Format requirements, confidence scoring |

**Difference from subagents**: Subagents need 8-section anatomy with frontmatter contract. Main agents are flexible -- completeness is about coverage of key concerns, not rigid structure.

#### Dimension 2: Specificity (Weight: 20%)

**What it measures**: Concrete, actionable instructions vs vague guidance.

**Scoring criteria**:
| Item | Points | Description |
|------|--------|-------------|
| Concrete examples provided | 0-20 | Before/after, code samples, exact commands |
| Version numbers specified | 0-20 | Tool versions, API versions, date stamps |
| Exact commands/paths given | 0-20 | Runnable commands, absolute paths |
| Threshold values defined | 0-20 | Numbers, not "appropriate" or "reasonable" |
| No vague language | 0-20 | "Use X" not "consider using something like X" |

**Key finding** (Santos et al., 2025): The most effective CLAUDE.md files are dominated by "operational commands, technical implementation notes" -- high specificity correlates with high agent effectiveness.

#### Dimension 3: Verifiability (Weight: 20%)

**What it measures**: Can the agent verify its own claims and outputs?

**Scoring criteria**:
| Item | Points | Description |
|------|--------|-------------|
| Anti-hallucination protocol present | 0-20 | Search-before-answer pattern |
| Confidence scoring required | 0-20 | HIGH/MEDIUM/LOW or equivalent |
| Source citation requirements | 0-20 | "Cite sources with dates" |
| Verification steps defined | 0-20 | Quality gates, test commands |
| Fallback chains documented | 0-20 | What to do when primary tool fails |

**Note**: This dimension is most relevant for Claude Code and less applicable to simpler platforms. Weight should be adjustable per platform.

#### Dimension 4: Safety (Weight: 20%)

**What it measures**: Protection against harmful agent behavior.

**Scoring criteria**:
| Item | Points | Description |
|------|--------|-------------|
| CRITICAL rules clearly marked | 0-20 | Non-negotiable constraints identified |
| Destructive action warnings | 0-20 | git reset, rm -rf, force push, etc. |
| Secret protection | 0-20 | Never commit .env, credentials, API keys |
| Human approval gates | 0-20 | When to ask vs decide autonomously |
| Permission boundaries | 0-20 | What the agent is NOT allowed to do |

**Key finding** (Liu et al., 2025): Cursor attack success rate of 84% highlights that safety constraints in agent configs are not just theoretical.

#### Dimension 5: Evolution-Readiness (Weight: 15%)

**What it measures**: How well the config supports iterative improvement.

**Scoring criteria**:
| Item | Points | Description |
|------|--------|-------------|
| Memory architecture described | 0-20 | Session, episodic, semantic patterns |
| Learning triggers defined | 0-20 | When to update, what to track |
| Feedback mechanisms present | 0-20 | How to incorporate lessons learned |
| Version history maintained | 0-20 | Changelog, dated effective dates |
| Modular structure | 0-20 | Sections can be updated independently |

**Note**: This is the most aspirational dimension. Most existing AGENTS.md files score low here. Weight at 15% reflects current reality while encouraging evolution-readiness.

### 4.2 Weight Profiles

| Profile | Completeness | Specificity | Verifiability | Safety | Evolution | Use When |
|---------|:---:|:---:|:---:|:---:|:---:|----------|
| **standard** | 25% | 20% | 20% | 20% | 15% | Default profile |
| **minimal** | 30% | 25% | 10% | 25% | 10% | Simple configs, .cursorrules |
| **advanced** | 20% | 20% | 25% | 15% | 20% | Self-evolving configs |

### 4.3 Grading Scale

| Grade | Score | Status | Action |
|-------|-------|--------|--------|
| A | 90-100 | Production-ready | Ship it |
| B | 80-89 | Minor improvements | Polish specific sections |
| C | 70-79 | Significant gaps | Targeted refine needed |
| D | 60-69 | Major issues | Substantial rework |
| F | <60 | Fundamental problems | Rebuild recommended |

**Pass threshold**: 75% (Grade C or higher)

### 4.4 Differences from Subagent Evaluation

| Aspect | cc-agents (Subagent) | cc-magents (Main Agent) |
|--------|---------------------|------------------------|
| Dimensions | 10 (4 categories) | 5 (flat) |
| Frontmatter weight | High (strict contract) | Low (optional, flexible) |
| Body structure weight | High (8-section anatomy) | Medium (any headings OK) |
| Platform compat weight | Medium | High (23+ platforms) |
| Evolution weight | None | 15% |
| Total points | 100 | 100 |

---

## 5. Self-Evolution Mechanism Design

### 5.1 Evolution Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Collect      │────>│  Analyze     │────>│  Propose     │
│  Interaction  │     │  Patterns    │     │  Changes     │
│  Data         │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
                                                │
                                                v
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Document    │<────│  Apply       │<────│  Validate    │
│  Evolution   │     │  (with human │     │  Safety      │
│  History     │     │   approval)  │     │  Checks      │
└──────────────┘     └──────────────┘     └──────────────┘
```

### 5.2 Data Collection

**Sources for evolution data** (platform-dependent):

| Source | Platform | Data Type |
|--------|----------|-----------|
| Claude Code conversation logs | Claude | Success/failure, tool usage, clarifications |
| Git commit history | All | What changes were made, what was reverted |
| PR review comments | All | What human reviewers flagged |
| CI/CD failures | All | What automated checks caught |
| User explicit feedback | All | Direct "this doesn't work" signals |
| MEMORY.md entries | Claude | Curated lessons learned |

**Practical approach for v1**: Focus on what's universally available -- git history, CI results, and explicit user feedback. Platform-specific logs are a v2 feature.

### 5.3 Pattern Analysis

Cluster collected data into improvement categories:

| Pattern Type | Indicators | Suggested Action |
|-------------|------------|-----------------|
| **Prompt Gaps** | Agent misunderstands requests | Add examples, clarify instructions |
| **Workflow Holes** | Missing steps, wrong order | Add/reorder workflow sections |
| **Tool Confusion** | Wrong tool selection | Add/improve tool selection matrix |
| **Context Deficit** | Repeated clarifications needed | Add domain knowledge sections |
| **Safety Violations** | Destructive actions taken | Strengthen safety rules |
| **Style Drift** | Inconsistent output format | Add output format templates |

### 5.4 Safety Constraints

**CRITICAL Rule Protection** (non-negotiable):
1. NEVER auto-modify sections marked `[CRITICAL]` or containing "never", "always", "must not"
2. NEVER remove safety constraints without explicit human approval
3. NEVER weaken permission boundaries
4. ALWAYS create backup before any modification
5. ALWAYS show diff preview before applying

**Rollback Protocol**:
```
agent-config/
├── AGENTS.md                    # Current version
├── .magent-history/
│   ├── v1.0.0.md               # Initial version
│   ├── v1.1.0.md               # After first evolution
│   ├── v1.1.0-to-v1.2.0.diff  # Change record
│   └── evolution-log.json       # Full evolution audit trail
```

**Auto-rollback triggers**:
- Agent-doctor grade drops by more than one letter grade
- Safety dimension score decreases
- User reports regression within 5 interactions

### 5.5 Evolution Maturity Levels

| Level | Name | Description | When |
|-------|------|-------------|------|
| L0 | **Manual** | User edits config directly | Default |
| L1 | **Suggested** | evolve suggests changes, user applies | v1 target |
| L2 | **Semi-Auto** | evolve applies with human approval | v2 target |
| L3 | **Autonomous** | evolve self-applies with rollback | Research only |

**v1 targets L1**: The evolve script analyzes patterns, generates a proposed diff, and presents it for human review. No auto-application.

---

## 6. Slash Commands

### 6.1 Command Naming Convention

Following the project convention: `noun-verb` for grouped commands.

All commands are thin wrappers (~50 lines) that invoke cc-magents skill scripts.

### 6.2 Recommended Commands (6)

| Command | Purpose | Maps To |
|---------|---------|---------|
| `/rd3:magent-create` | Synthesize new main agent config | `synthesize.ts` |
| `/rd3:magent-check` | Validate + Evaluate (combined) | `validate.ts` + `evaluate.ts` |
| `/rd3:magent-refine` | Fix issues, apply best practices | `refine.ts` |
| `/rd3:magent-evolve` | Self-improve from feedback | `evolve.ts` |
| `/rd3:magent-adapt` | Convert between platforms | `adapt.ts` |
| `/rd3:magent-compare` | Diff two configs | `diff` utility |

**Design choice**: Combine validate + evaluate into `magent-check` for UX simplicity. Users rarely want to validate without evaluating. Separate scripts still exist for programmatic use.

### 6.3 Command Examples

```markdown
# /rd3:magent-create
---
description: Generate a new AGENTS.md or platform-specific main agent config
argument-hint: "<domain>" [--platform <platform>] [--output <path>]
---

# Invocation examples:
/rd3:magent-create dev --platform agents-md --output ./AGENTS.md
/rd3:magent-create research --platform claude-md
/rd3:magent-create --auto-detect   # Scan project to determine domain
```

```markdown
# /rd3:magent-check
---
description: Validate structure and score quality of a main agent config
argument-hint: "<path-to-config>" [--profile <standard|minimal|advanced>]
---

# Invocation examples:
/rd3:magent-check ./AGENTS.md
/rd3:magent-check ~/.claude/CLAUDE.md --profile advanced
/rd3:magent-check .cursorrules --profile minimal
```

```markdown
# /rd3:magent-evolve
---
description: Analyze interaction patterns and suggest improvements
argument-hint: "<path-to-config>" [--history <path>] [--dry-run]
---

# Invocation examples:
/rd3:magent-evolve ./CLAUDE.md --dry-run
/rd3:magent-evolve ./AGENTS.md --history ./evolution-log.json
```

```markdown
# /rd3:magent-adapt
---
description: Convert main agent config between platform formats
argument-hint: "<source-path>" --to <platform> [--output <path>]
---

# Invocation examples:
/rd3:magent-adapt ./CLAUDE.md --to agents-md
/rd3:magent-adapt ./AGENTS.md --to all
/rd3:magent-adapt .cursorrules --to claude-md --output ./CLAUDE.md
```

---

## 7. Subagent Wrapper

### 7.1 Analysis: Is a Dedicated Subagent Needed?

**Arguments for**:
- Consistent with cc-agents pattern (has agent-expert, agent-doctor subagents)
- Provides natural language interface for complex operations
- Can orchestrate multi-step workflows (synthesize -> validate -> evaluate -> refine)

**Arguments against**:
- Slash commands already provide human-friendly interface
- Adding another subagent increases discovery/routing complexity
- The skill itself is invocable by any existing agent (rd2:super-planner, etc.)

### 7.2 Recommendation: One Thin-Wrapper Subagent

Create **one** subagent: `magent-expert` (not three separate ones like the prototypes).

**Rationale**: The cc-agents pattern uses pairs (agent-expert for creation, agent-doctor for evaluation). But for main agent configs, the operations are more interrelated. A single `magent-expert` that routes to the appropriate operation based on user intent is cleaner.

```markdown
# magent-expert.md (thin wrapper)
---
name: magent-expert
description: |
  Use PROACTIVELY for "create AGENTS.md", "evaluate my agent config",
  "improve my CLAUDE.md", "convert between agent formats", "evolve agent config",
  "check agent quality", "adapt AGENTS.md to CLAUDE.md".

  <example>
  user: "Create an AGENTS.md for this Python project"
  assistant: Invokes cc-magents synthesize with domain auto-detection
  <commentary>Triggers on agent config creation requests</commentary>
  </example>

model: inherit
color: "amber"
tools: [Read, Write, Edit, Bash, Glob, Grep, WebSearch]
skills: [cc-magents]
---

# Magent Expert

## Role
Universal main agent configuration specialist. Route requests to
rd3:cc-magents skill operations.

## Process
1. Detect operation from user intent
2. Invoke appropriate cc-magents script
3. Present results
4. Suggest next steps

## Operation Routing
| User Intent | Operation |
|-------------|-----------|
| "create", "generate", "new" | synthesize |
| "check", "validate", "score", "evaluate" | validate + evaluate |
| "fix", "improve", "refine" | refine |
| "evolve", "self-improve", "optimize" | evolve |
| "convert", "adapt", "port" | adapt |
| "compare", "diff" | diff |
```

---

## 8. Prioritized Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

| Task | Priority | Effort | Description |
|------|----------|--------|-------------|
| types.ts (UMAM) | P0 | 2d | Universal Main Agent Model + platform types |
| utils.ts | P0 | 2d | Parsing, section detection, serialization |
| agents-md adapter | P0 | 1d | Canonical AGENTS.md parse/generate |
| claude-md adapter | P0 | 1d | CLAUDE.md parse/generate |
| validate.ts | P0 | 2d | Structural validation script |
| SKILL.md skeleton | P0 | 1d | Initial skill definition |

**Deliverable**: Can parse and validate AGENTS.md and CLAUDE.md files.

### Phase 2: Evaluation (Week 3)

| Task | Priority | Effort | Description |
|------|----------|--------|-------------|
| evaluation.config.ts | P0 | 1d | 5-dimension scoring weights |
| evaluate.ts | P0 | 3d | Full quality scoring script |
| evaluation-framework.md | P1 | 1d | Reference documentation |

**Deliverable**: Can score any main agent config with grade A-F.

### Phase 3: Creation & Refinement (Week 4-5)

| Task | Priority | Effort | Description |
|------|----------|--------|-------------|
| Domain templates (6x) | P0 | 2d | Asset templates for each domain |
| Section library | P1 | 1d | Composable section blocks |
| synthesize.ts | P0 | 3d | Generation with project auto-detection |
| refine.ts | P1 | 2d | Auto-fix + LLM refinement |

**Deliverable**: Can generate and refine main agent configs.

### Phase 4: Adaptation (Week 6)

| Task | Priority | Effort | Description |
|------|----------|--------|-------------|
| Tier 2 adapters (4x) | P1 | 3d | Cursor, Windsurf, Zed, OpenCode |
| Tier 3 adapters (basic) | P2 | 1d | Generate-only for remaining platforms |
| adapt.ts | P1 | 2d | Cross-platform conversion script |

**Deliverable**: Can convert between all major platform formats.

### Phase 5: Evolution (Week 7-8)

| Task | Priority | Effort | Description |
|------|----------|--------|-------------|
| evolve.ts | P1 | 4d | Pattern analysis + proposal generation |
| evolution-patterns.md | P1 | 1d | Reference documentation |
| safety-protocols.md | P0 | 1d | Safety constraints documentation |
| Version history system | P1 | 2d | Backup, rollback, audit trail |

**Deliverable**: Can analyze patterns and suggest evolution improvements.

### Phase 6: Commands & Agent (Week 9)

| Task | Priority | Effort | Description |
|------|----------|--------|-------------|
| 6 slash commands | P1 | 2d | Thin wrappers |
| magent-expert subagent | P2 | 1d | Thin wrapper subagent |
| tests | P1 | 3d | Test suite for all operations |
| SKILL.md completion | P0 | 1d | Final skill documentation |

**Deliverable**: Complete skill with commands and subagent.

### Total Estimated Effort: ~40 person-days (8-9 weeks)

---

## 9. Risk Analysis & Mitigation

### Risk 1: AGENTS.md Spec Instability

**Risk**: The AGENTS.md spec is relatively new and may change significantly.
**Probability**: Medium
**Impact**: High (would require adapter rewrites)
**Mitigation**:
- Use UMAM as abstraction layer -- spec changes only affect the agents-md adapter
- Pin to specific spec version in references
- Monitor agents.md for updates
- Keep adapters thin and focused

### Risk 2: Platform Fragmentation

**Risk**: 23+ platforms means many edge cases and maintenance burden.
**Probability**: High
**Impact**: Medium (adapter maintenance)
**Mitigation**:
- Tier-based support (Tier 1 full, Tier 4 generic)
- Generic AGENTS.md adapter as catch-all
- Community contributions for Tier 3/4 adapters
- Test fixtures for each supported platform

### Risk 3: Self-Evolution Safety

**Risk**: Evolution mechanism could degrade agent config quality or introduce unsafe rules.
**Probability**: Medium
**Impact**: High (agent behavior regression)
**Mitigation**:
- L1 (suggested only) in v1 -- no auto-application
- CRITICAL rule protection
- Mandatory backup before any changes
- Auto-rollback on grade regression
- Human approval gate for all modifications

### Risk 4: Scope Creep

**Risk**: Trying to handle all 23+ platforms equally leads to never shipping.
**Probability**: High
**Impact**: High (delayed delivery)
**Mitigation**:
- Phase 1-3 focus on AGENTS.md + CLAUDE.md only (highest value)
- Tier system caps effort per platform
- Defer merge, audit, benchmark to v2
- Ship incrementally (validate before evaluate before synthesize)

### Risk 5: Template Staleness

**Risk**: Domain templates become outdated as best practices evolve.
**Probability**: Medium
**Impact**: Low (templates are starting points, not final products)
**Mitigation**:
- Version templates with dates
- Include "last updated" in each template
- Evolution mechanism can be applied to templates themselves
- Community feedback loop for template improvement

### Risk 6: Overlap with cc-agents

**Risk**: Confusion between cc-agents (subagents) and cc-magents (main agents).
**Probability**: High
**Impact**: Medium (user confusion, routing errors)
**Mitigation**:
- Clear naming: "magent" always means "main agent"
- Separate trigger phrases in descriptions
- Documentation explicitly compares the two
- Subagent routing uses distinct keywords

---

## 10. Key Design Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Operations count | 6 (synthesize, validate, evaluate, refine, evolve, adapt) | Matches cc-agents pipeline + adds evolve |
| Deferred operations | merge, audit, benchmark | Scope control for v1 |
| Internal model | UMAM (section-based, flexible) | Main agents have no rigid schema |
| Canonical format | AGENTS.md | Official standard under Linux Foundation |
| Scoring dimensions | 5 (research-backed) | Simpler than subagent's 10, appropriate for flexibility |
| Evolution maturity | L1 (suggested only) | Safety-first approach |
| Subagent count | 1 (magent-expert) | Single routing point, not three prototypes |
| Slash commands | 6 | One per operation, validate+evaluate combined |
| Platform tiers | 4 (Full/Standard/Basic/Generic) | Prioritizes effort where it matters |
| Language | TypeScript (Bun) | Consistent with cc-agents/cc-skills/cc-commands |

---

## 11. Open Questions for Decision

1. **Should evolve support Claude MEMORY.md as input?** Claude's auto-memory contains curated lessons that could drive evolution. This would be Claude-specific but high value.

2. **Should synthesize scan the codebase automatically?** Auto-detecting tech stack from package.json/Makefile/CI configs adds complexity but dramatically improves output quality. Recommend yes.

3. **Should the diff operation be exposed as a command?** Currently proposed as internal utility. May be valuable enough for a standalone `/rd3:magent-compare` command.

4. **What is the minimum AGENTS.md that should pass validation?** The official spec says "any headings." Should we require at least a role/rules section to pass?

5. **Should templates be platform-specific or universal?** Currently proposed as universal with platform adaptation. Alternative: separate template sets per platform.

---

## 12. References

### Academic Papers
1. Santos, H.V.F., et al. (2025). "Decoding the Configuration of AI Coding Agents: Insights from Claude Code Projects." https://hf.co/papers/2511.09268
2. Chatlatanagulchai, W., et al. (2025). "On the Use of Agentic Coding Manifests." https://hf.co/papers/2509.14744
3. Watanabe, M., et al. (2025). "On the Use of Agentic Coding: An Empirical Study of Pull Requests on GitHub." https://hf.co/papers/2509.14745
4. Liu, Y., et al. (2025). "Your AI, My Shell: Prompt Injection Attacks on Agentic AI Coding Editors." https://hf.co/papers/2509.22040
5. Gao, H., et al. (2025). "A Survey of Self-Evolving Agents." https://hf.co/papers/2507.21046
6. Kar, I., et al. (2026). "Towards AGI: A Pragmatic Approach Towards Self Evolving Agent." https://hf.co/papers/2601.11658
7. Jiang, X., et al. (2024). "Long Term Memory: The Foundation of AI Self-Evolution." https://hf.co/papers/2410.15665
8. Li, H., et al. (2026). "AIDev: Studying AI Coding Agents on GitHub." https://hf.co/papers/2602.09185

### Standards & Specifications
- AGENTS.md Official Specification: https://agents.md/
- Agentic AI Foundation (Linux Foundation): https://aaif.io
- OpenAI Codex AGENTS.md Guide: https://developers.openai.com/codex/guides/agents-md
- Gemini CLI GEMINI.md: https://geminicli.com/docs/cli/gemini-md/

### Internal References
- rd3:cc-agents SKILL.md: `plugins/rd3/skills/cc-agents/SKILL.md`
- rd3:cc-skills SKILL.md: `plugins/rd3/skills/cc-skills/SKILL.md`
- rd3:cc-commands SKILL.md: `plugins/rd3/skills/cc-commands/SKILL.md`
- Research: `docs/reasearch/0001_perfect_AGENTS_research.md`
- Research: `docs/reasearch/0002_AGENTS_support_comparison_report.md`
- Sample prototypes: `/Users/robin/tcc/repo/docs/research/0001/`

### Confidence
**Level**: HIGH
**Reasoning**: Based on direct analysis of existing codebase (rd3:cc-agents, cc-skills, cc-commands), 25+ academic papers, official AGENTS.md specification, and sample prototype implementations. All key decisions are traceable to evidence.
