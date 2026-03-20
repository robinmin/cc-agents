---
name: create meta skill cc-magents
description: Universal meta skill for main agent config management (AGENTS.md, CLAUDE.md, GEMINI.md, .cursorrules) across 23+ AI coding agent platforms, with 6 operations (synthesize, validate, evaluate, refine, evolve, adapt), 6 slash commands, 1 subagent wrapper, and self-evolution capability
status: Done
created_at: 2026-03-19 10:15:14
updated_at: 2026-03-20 10:15:00
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0234. create meta skill cc-magents

### Background

We already have a dedicated meta agent skill `rd3:cc-agents`, but it's designed for **subagents** (individual agent definition files like `plugins/rd2/agents/super-coder.md`). We need a separate meta skill for **main agent** configuration files -- the top-level project/global configs that govern agent behavior across platforms.

**Main agent configs** include:
- `AGENTS.md` -- Universal standard under the [Agentic AI Foundation](https://aaif.io) (Linux Foundation), used by 60,000+ open-source projects, supported by 23+ AI coding agents
- `CLAUDE.md` -- Claude Code native (supports hooks, skills, tools, memory)
- `GEMINI.md` -- Gemini CLI native (settings.json integration)
- `.cursorrules` -- Cursor IDE native
- `.windsurfrules` -- Windsurf native
- Codex config, Zed rules, Aider conventions, OpenCode rules, and more

**Key difference from rd3:cc-agents:**

| Aspect | rd3:cc-agents (Subagent) | rd3:cc-magents (Main Agent) |
|--------|--------------------------|----------------------------|
| Target | Subagent .md files | Project/global config files (AGENTS.md, CLAUDE.md, etc.) |
| Schema | Rigid 8-section anatomy, YAML frontmatter | Flexible markdown, any headings (per AGENTS.md spec) |
| Scope | Single file, single agent | Hierarchical (global -> project -> directory) |
| Platforms | 6 | 23+ (tiered support) |
| Evolution | None | Self-evolution from interaction feedback |

**Research completed:**
- docs/reasearch/how_to_create_perfect_AGENTS.md.md -- Research task definition
- docs/reasearch/0001_perfect_AGENTS_research.md -- Systematic review (25 papers, 25+ implementations)
- docs/reasearch/0002_AGENTS_support_comparison_report.md -- Platform comparison matrix
- docs/reasearch/0234_cc_magents_brainstorm.md -- Full brainstorm document

**Sample prototypes** (reference only, not the target design):
- `/Users/robin/tcc/repo/docs/research/0001/magent-doctor/` -- Quality validator prototype
- `/Users/robin/tcc/repo/docs/research/0001/magent-evolver/` -- Self-evolution prototype
- `/Users/robin/tcc/repo/docs/research/0001/magent-synthesizer/` -- Generation prototype

### Requirements

#### R1. Fat Meta Skill: rd3:cc-magents

Create a universal meta skill at `plugins/rd3/skills/cc-magents/` with **6 operations**:

| # | Operation | Purpose | Script | Priority |
|---|-----------|---------|--------|----------|
| 1 | **synthesize** | Generate new main agent config from requirements + project auto-detection | `scripts/synthesize.ts` | P0 |
| 2 | **validate** | Structural correctness checking (markdown, size limits, security scan) | `scripts/validate.ts` | P0 |
| 3 | **evaluate** | 5-dimension quality scoring with A-F grading | `scripts/evaluate.ts` | P0 |
| 4 | **refine** | Fix issues, apply best practices (dry-run default, human approval for CRITICAL) | `scripts/refine.ts` | P1 |
| 5 | **evolve** | Self-improve from interaction feedback (L1: suggest only, human approval required) | `scripts/evolve.ts` | P1 |
| 6 | **adapt** | Cross-platform conversion via UMAM (Universal Main Agent Model) | `scripts/adapt.ts` | P1 |

**Pipeline**: `synthesize -> validate -> evaluate -> refine -> evolve -> adapt`

**Deferred to v2**: merge, audit, benchmark

##### R1.1 Universal Main Agent Model (UMAM)

The internal representation for all main agent configs. Section-based (not rigid frontmatter like subagents):

```typescript
interface UniversalMainAgent {
    sourcePath: string;
    sourceFormat: MagentPlatform;
    metadata?: {
        name?: string;
        description?: string;
        version?: string;
        effective?: string;
        globs?: string;
        alwaysApply?: boolean;
    };
    sections: MagentSection[];
    hierarchy?: 'global' | 'project' | 'directory';
    estimatedTokens?: number;
    platformFeatures?: string[];
}

interface MagentSection {
    heading: string;
    level: number;
    content: string;
    category?: SectionCategory;
    criticality?: 'critical' | 'important' | 'recommended' | 'informational';
}

type SectionCategory =
    | 'identity' | 'rules' | 'workflow' | 'tools' | 'standards'
    | 'verification' | 'memory' | 'evolution' | 'environment'
    | 'testing' | 'output' | 'custom';
```

##### R1.2 Platform Adapters (Tiered)

Each adapter implements: `parse()`, `validate()`, `generate()`, `detectFeatures()`, `getDiscoveryPaths()`

| Tier | Platforms | Support Level |
|------|-----------|--------------|
| **Tier 1** (Full) | AGENTS.md, CLAUDE.md, GEMINI.md, Codex | Parse + Generate + Validate (bidirectional) |
| **Tier 2** (Standard) | .cursorrules, .windsurfrules, Zed, OpenCode | Parse + Generate (bidirectional) |
| **Tier 3** (Basic) | Aider, Warp, RooCode, Amp, VS Code | Generate only (one-directional) |
| **Tier 4** (Generic) | All others (23+ per AGENTS.md spec) | AGENTS.md pass-through |

**Canonical format**: AGENTS.md (official standard). All conversions go through UMAM.

##### R1.3 Evaluation Framework (5 Dimensions)

| Dimension | Weight | What It Measures |
|-----------|--------|-----------------|
| **Completeness** | 25% | All necessary sections present and substantive |
| **Specificity** | 20% | Concrete examples, exact commands, version numbers |
| **Verifiability** | 20% | Anti-hallucination protocol, confidence scoring, citations |
| **Safety** | 20% | CRITICAL rules marked, destructive action warnings, permission boundaries |
| **Evolution-Readiness** | 15% | Memory architecture, learning triggers, feedback mechanisms |

**Weight profiles**: standard (default), minimal (simple configs), advanced (self-evolving configs)

**Grading**: A (90-100), B (80-89), C (70-79), D (60-69), F (<60). Pass threshold: 75%

**Tiered validation**: validate passes any valid markdown (per official spec); evaluate applies the quality scoring. Separate structural validity from quality.

##### R1.4 Synthesize with Auto-Detection

The synthesize operation auto-scans the codebase to detect:
- Language/framework (package.json, go.mod, Cargo.toml, pyproject.toml, Makefile)
- Test runner and commands
- CI/CD configuration
- Linting/formatting tools
- Existing agent configs

**6 domain templates** (universal core + platform overlays):
- `dev-agent.md` -- Software development
- `research-agent.md` -- Research/academic
- `content-agent.md` -- Content creation
- `data-agent.md` -- Data science/analysis
- `devops-agent.md` -- DevOps/infrastructure
- `general-agent.md` -- General-purpose

**Composable section library** in `assets/sections/`:
- `anti-hallucination.md`, `tool-priority.md`, `confidence-scoring.md`, `quality-gates.md`, `memory-patterns.md`

##### R1.5 Self-Evolution (L1: Suggested Only)

**Maturity level for v1**: L1 (suggest changes, require human approval). No auto-application.

**Data sources** (universal + optional):
- Git commit history (universal)
- CI/CD results (universal)
- User explicit feedback (universal)
- Claude MEMORY.md (optional plugin, Claude-specific)

**Safety constraints** (non-negotiable):
- NEVER auto-modify sections marked `[CRITICAL]` or containing "never", "always", "must not"
- NEVER remove safety constraints without explicit human approval
- ALWAYS create backup before any modification
- ALWAYS show diff preview before applying
- Auto-rollback on grade regression (>1 letter grade drop)

**Version history**: `.magent-history/` directory with versioned backups and evolution audit trail

##### R1.6 Directory Structure

```
plugins/rd3/skills/cc-magents/
├── SKILL.md
├── package.json
├── tsconfig.json
├── biome.json
├── scripts/
│   ├── synthesize.ts
│   ├── validate.ts
│   ├── evaluate.ts
│   ├── refine.ts
│   ├── evolve.ts
│   ├── adapt.ts
│   ├── types.ts                  # UMAM types
│   ├── utils.ts                  # Shared parsing/generation
│   ├── evaluation.config.ts      # Scoring weights
│   └── adapters/
│       ├── base.ts               # Adapter interface
│       ├── index.ts              # Adapter registry
│       ├── agents-md.ts          # AGENTS.md (canonical)
│       ├── claude-md.ts          # CLAUDE.md
│       ├── gemini-md.ts          # GEMINI.md
│       ├── cursorrules.ts        # .cursorrules
│       ├── windsurfrules.ts      # .windsurfrules
│       ├── codex-config.ts       # Codex
│       ├── opencode-rules.ts     # OpenCode
│       ├── zed-rules.ts          # Zed
│       ├── aider-conventions.ts  # Aider
│       └── generic-agentsmd.ts   # Generic fallback
├── references/
│   ├── agents-md-spec.md
│   ├── platform-features.md
│   ├── evaluation-framework.md
│   ├── evolution-patterns.md
│   ├── safety-protocols.md
│   ├── domain-patterns.md
│   ├── hierarchy-patterns.md
│   ├── scripts-usage.md
│   ├── troubleshooting.md
│   └── workflows.md
├── assets/
│   ├── templates/                # 6 domain templates
│   │   ├── dev-agent.md
│   │   ├── research-agent.md
│   │   ├── content-agent.md
│   │   ├── data-agent.md
│   │   ├── devops-agent.md
│   │   └── general-agent.md
│   └── sections/                 # Composable section blocks
│       ├── anti-hallucination.md
│       ├── tool-priority.md
│       ├── confidence-scoring.md
│       ├── quality-gates.md
│       └── memory-patterns.md
└── tests/
    ├── synthesize.test.ts
    ├── validate.test.ts
    ├── evaluate.test.ts
    ├── refine.test.ts
    ├── evolve.test.ts
    ├── adapt.test.ts
    └── fixtures/
        ├── sample-agents.md
        ├── sample-claude.md
        ├── sample-gemini.md
        └── sample-cursorrules
```

#### R2. Slash Commands (6)

Thin wrappers (~50 lines each) that invoke cc-magents skill scripts.

| # | Command | Description | Maps To | Args |
|---|---------|-------------|---------|------|
| 1 | `/rd3:magent-create` | Generate a new AGENTS.md or platform-specific main agent config | synthesize.ts | `<domain>` `[--platform <platform>]` `[--output <path>]` `[--auto-detect]` |
| 2 | `/rd3:magent-check` | Validate structure + score quality (combined) | validate.ts + evaluate.ts | `<path>` `[--profile <standard\|minimal\|advanced>]` |
| 3 | `/rd3:magent-refine` | Fix issues, apply best practices | refine.ts | `<path>` `[--dry-run]` `[--eval]` |
| 4 | `/rd3:magent-evolve` | Analyze interaction patterns and suggest improvements | evolve.ts | `<path>` `[--history <path>]` `[--memory <path>]` `[--dry-run]` |
| 5 | `/rd3:magent-adapt` | Convert between platform formats | adapt.ts | `<source>` `--to <platform\|all>` `[--output <path>]` |
| 6 | `/rd3:magent-compare` | Diff two main agent configs | diff utility | `<path1>` `<path2>` `[--semantic]` |

#### R3. Subagent Wrapper (1)

Create **one** thin-wrapper subagent: `expert-magent` at `plugins/rd3/agents/expert-magent.md`

**Routing logic**:

| User Intent | Operation |
|-------------|-----------|
| "create", "generate", "new" | synthesize |
| "check", "validate", "score", "evaluate" | validate + evaluate |
| "fix", "improve", "refine" | refine |
| "evolve", "self-improve", "optimize" | evolve |
| "convert", "adapt", "port" | adapt |
| "compare", "diff" | diff |

Color: amber. Skills: [cc-magents]. Tools: [Read, Write, Edit, Bash, Glob, Grep, WebSearch].

#### R4. Acceptance Criteria

- [ ] All 6 operations work end-to-end with AGENTS.md and CLAUDE.md (Tier 1)
- [ ] Tier 2 adapters (Cursor, Windsurf, Zed, OpenCode) parse and generate correctly
- [ ] Synthesize auto-detects tech stack from at least 5 project types (Node, Python, Go, Rust, Java)
- [ ] Evaluate produces consistent scores (same input -> same output) across runs
- [ ] Evolve suggests improvements from git history without auto-applying
- [ ] Adapt converts CLAUDE.md -> AGENTS.md -> GEMINI.md with documented lossy warnings
- [ ] All 6 slash commands invoke the correct scripts with proper argument handling
- [ ] expert-magent subagent routes correctly to all 6 operations
- [ ] Tests pass for all operations with >80% coverage
- [ ] SKILL.md follows rd3 conventions (fat skill, trigger phrases, examples)
- [ ] No circular references between skill/commands/agent

### Q&A

**Q1: Why not extend rd3:cc-agents instead of creating a new skill?**
A1: Main agent configs are fundamentally different from subagents -- flexible markdown vs rigid 8-section anatomy, hierarchical inheritance vs single file, 23+ platforms vs 6, evolution support. The UMAM model is section-based, not frontmatter-based.

**Q2: Why is the evolution level limited to L1 (suggested only)?**
A2: Autonomous modification of the file that governs agent behavior has high safety risk. L1 ensures human review of all changes. L2 (semi-auto) is a v2 target after production experience.

**Q3: Why tiered validation (validate passes any markdown, evaluate scores quality)?**
A3: The official AGENTS.md spec says "standard Markdown, any headings" with no required fields. Rejecting valid AGENTS.md files would conflict with the standard. Quality assessment is separate.

**Q4: Why universal templates with platform overlays instead of platform-specific sets?**
A4: 6 domain templates x 10+ platforms = 60+ templates to maintain. Universal core with small overlay patches gives platform fidelity with manageable maintenance cost.

**Q5: Why AGENTS.md as canonical format for conversions?**
A5: It's the official standard under the Linux Foundation's Agentic AI Foundation. All 23+ agents support it. Using it as the interchange format maximizes compatibility.

### Design

See `docs/reasearch/0234_cc_magents_brainstorm.md` for detailed design including:
- UMAM (Universal Main Agent Model) type definitions
- Adapter interface specification
- 5-dimension evaluation scoring rubric
- Self-evolution architecture and safety constraints
- Platform feature comparison matrix
- Cross-platform conversion fidelity table

### Solution



## Approach

Create `rd3:cc-magents` meta skill for universal main agent configuration management (AGENTS.md, CLAUDE.md, GEMINI.md, .cursorrules, etc.) across 23+ platforms.

### Key Technical Decisions

1. **UMAM (Universal Main Agent Model)** — Section-based internal representation (not frontmatter-based like UAM for subagents). Flexible markdown parsing with heading-based sections.

2. **AGENTS.md as canonical format** — Official Linux Foundation/AAIF standard, all 23+ agents support it. Conversions go through UMAM as intermediate.

3. **Tiered adapter system** — Tier 1 (AGENTS.md, CLAUDE.md, GEMINI.md, Codex) full bidirectional; Tier 2 (Cursor, Windsurf, Zed, OpenCode) parse+generate; Tier 3 (Aider, Warp, etc.) generate-only; Tier 4 generic fallback.

4. **Separate validate vs evaluate** — validate = structural correctness (any valid markdown per spec); evaluate = 5-dimension quality scoring (A-F grading).

5. **L1 evolution only** — Suggest improvements from git history, require human approval before any application. Auto-modification too dangerous for the file governing agent behavior.

### Files to Create (Phase 1)

| File | Purpose |
|------|---------|
| `plugins/rd3/skills/cc-magents/scripts/types.ts` | UMAM types (UniversalMainAgent, MagentSection, SectionCategory, MagentPlatform) |
| `plugins/rd3/skills/cc-magents/scripts/utils.ts` | Shared parsing, section detection, serialization utilities |
| `plugins/rd3/skills/cc-magents/scripts/adapters/base.ts` | Adapter interface (parse, validate, generate, detectFeatures, getDiscoveryPaths) |
| `plugins/rd3/skills/cc-magents/scripts/adapters/agents-md.ts` | AGENTS.md Tier 1 adapter |
| `plugins/rd3/skills/cc-magents/scripts/adapters/claude-md.ts` | CLAUDE.md Tier 1 adapter |
| `plugins/rd3/skills/cc-magents/scripts/adapters/index.ts` | Adapter registry |
| `plugins/rd3/skills/cc-magents/scripts/validate.ts` | Structural validation (markdown, size limits, security scan) |
| `plugins/rd3/skills/cc-magents/SKILL.md` | Skill skeleton with trigger phrases, 6 operations |

### Phase 1 Acceptance Criteria

- [ ] types.ts defines all UMAM interfaces (UniversalMainAgent, MagentSection, MagentPlatform, SectionCategory)
- [ ] utils.ts provides parseMarkdown, extractSections, serializeToMarkdown, detectPlatform functions
- [ ] base.ts defines Adapter interface with all 5 methods
- [ ] agents-md.ts fully implements Tier 1 bidirectional conversion
- [ ] claude-md.ts fully implements Tier 1 bidirectional conversion
- [ ] index.ts exports adapter registry with platform detection
- [ ] validate.ts validates markdown structure, size limits (100KB), no injection patterns
- [ ] SKILL.md follows rd3 conventions (fat skill, trigger phrases, examples for all 6 operations)

### Plan

#### Phase 1: Foundation (Week 1-2) -- P0
- types.ts (UMAM) + utils.ts (parsing, section detection, serialization)
- agents-md adapter + claude-md adapter (Tier 1)
- validate.ts (structural validation)
- SKILL.md skeleton

#### Phase 2: Evaluation (Week 3) -- P0
- evaluation.config.ts (5-dimension weights)
- evaluate.ts (quality scoring)
- evaluation-framework.md reference

#### Phase 3: Creation & Refinement (Week 4-5) -- P0/P1
- 6 domain templates + composable section library
- synthesize.ts (generation with project auto-detection)
- refine.ts (auto-fix + LLM refinement)

#### Phase 4: Adaptation (Week 6) -- P1
- Tier 2 adapters (Cursor, Windsurf, Zed, OpenCode)
- Tier 3 adapters (basic generate-only)
- adapt.ts (cross-platform conversion)

#### Phase 5: Evolution (Week 7-8) -- P1
- evolve.ts (pattern analysis + proposal generation)
- Safety protocols + version history system
- Claude MEMORY.md optional plugin

#### Phase 6: Commands & Agent (Week 9) -- P1/P2
- 6 slash commands
- expert-magent subagent
- Full test suite
- SKILL.md completion

**Total estimated effort**: ~40 person-days (8-9 weeks)

### Vendor Analysis Insights (from 16 platform system prompts)

> Full report: `docs/reasearch/0234_cc_magents_vendor_analysis.md`

**Key design requirements derived from vendor analysis:**

1. **Synthesize operation MUST generate decision trees for tools** -- not just tool lists. All mature platforms (Claude, Cursor, Gemini, Codex) use per-tool When-to-Use/When-NOT-to-Use logic
2. **Synthesize operation MUST include example interactions** -- Claude and Codex use `<example>` blocks to calibrate agent behavior far more effectively than prose rules alone
3. **Evaluate operation MUST check decision tree coverage** -- a tools section with only a list scores lower than one with decision trees (specificity dimension)
4. **Safety rules are tiered across all platforms** -- Critical (destructive guards, secrets), Important (PII, env isolation), Recommended (redaction, sandbox)
5. **Communication anti-patterns are universal** -- ALL 16 platforms forbid flattery, apologies, filler, trailing questions; generated configs MUST include forbidden phrases
6. **Three workflow models exist** -- (A) Understand→Plan→Execute→Verify, (B) Planning Mode→Standard Mode, (C) Spec-Driven. Configs should be consistent within one model, not mix them
7. **Planning quality criteria** (from Codex) -- distinguish high-quality plans (diagnosis + concrete steps + status tracking) from low-quality ones (vague "investigate and fix")
8. **Convention-first mandate** (from Gemini) -- analyze existing code BEFORE any change; this should be a default workflow rule
9. **Checkpoint cadence** (from VSCode) -- "After 3-5 tool calls, pause and assess" should be a workflow option
10. **UMAM SectionCategory should expand to 14 types** -- add `error-handling`, `planning`, `parallel`, `environment` based on >40% coverage in vendor prompts

**Cross-platform conversion warnings to implement:**

| Source → Target | Key Feature Losses |
|-----------------|-------------------|
| Claude → Codex | hooks, skills, memory; different sandbox model |
| Claude → Cursor | XML structure flattened; no progressive complexity |
| Gemini → Claude | save_memory not portable; convention workflow → rules |
| Kiro → Claude | steering files → CLAUDE.md sections; spec gates → workflow |
| Antigravity → Claude | KI system → memory; task boundary → plan mode |

### Artifacts

| Type | Path | Generated By | Date |
| ---- | ---- | ------------ | ---- |
| Brainstorm | docs/reasearch/0234_cc_magents_brainstorm.md | rd2:super-brain | 2026-03-19 |
| Research | docs/reasearch/0001_perfect_AGENTS_research.md | rd2:knowledge-seeker | 2026-03-16 |
| Research | docs/reasearch/0002_AGENTS_support_comparison_report.md | rd2:knowledge-seeker | 2026-03-16 |
| Vendor Analysis | docs/reasearch/0234_cc_magents_vendor_analysis.md | vendor prompt review | 2026-03-19 |

### References

- [AGENTS.md Official Specification](https://agents.md/)
- [Agentic AI Foundation (Linux Foundation)](https://aaif.io)
- [OpenAI Codex AGENTS.md Guide](https://developers.openai.com/codex/guides/agents-md)
- [Gemini CLI GEMINI.md](https://geminicli.com/docs/cli/gemini-md/)
- [OpenCode Rules](https://opencode.ai/docs/rules/)
- [AGENTS.md Template (OpenClaw)](https://docs.openclaw.ai/reference/templates/AGENTS)
- [The Complete Guide to AI Agent Memory Files](https://medium.com/data-science-collective/the-complete-guide-to-ai-agent-memory-files-claude-md-agents-md-and-beyond-49ea0df5c5a9)
- Santos et al. (2025) "Decoding the Configuration of AI Coding Agents" -- 328 CLAUDE.md files analyzed
- Gao et al. (2025) "A Survey of Self-Evolving Agents"
- Liu et al. (2025) "Prompt Injection Attacks on Agentic AI Coding Editors" -- 84% attack success rate
- Internal: `plugins/rd3/skills/cc-agents/SKILL.md` (existing subagent meta skill)
- Internal: `/Users/robin/tcc/repo/docs/research/0001/` (sample prototypes)
