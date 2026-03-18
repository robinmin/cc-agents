---
name: upgrade cc-agents for plugin rd3
description: Design and implement rd3:cc-agents skill with cross-platform agent definition support, Universal Agent Model, tiered templates, 8-dimension evaluation, and bidirectional adapters for 6 platforms
status: Done
created_at: 2026-03-17 15:25:18
updated_at: 2026-03-18 12:55:04
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0220. upgrade cc-agents for plugin rd3

### Terminology Clarification

> **CRITICAL: "agent" in this requirement means "subagent" (secondary/child agent), NOT the main/primary agent.**
>
> We retain the name `cc-agents` for historical continuity with `rd2:cc-agents`, but the scope of this skill is strictly **subagent definition files** — the specialized secondary agents that a primary agent spawns to handle focused subtasks. The main/primary agent configuration (system prompt, orchestration logic, top-level routing) will be covered by a separate, dedicated skill in the future.
>
> Throughout this document:
> - **"agent"** / **"agent definition"** = subagent definition file (e.g., `.claude/agents/code-reviewer.md`)
> - **"main agent"** / **"primary agent"** = the top-level agent that delegates to subagents
> - **"UAM"** (Universal Agent Model) = internal model for **subagent** definitions only

### Background

According to the research result in `docs/reasearch/how_to_write_skills_en.md`, subagents are the implicit interfaces called by the main agent. Due to the principle of "Fat Skills, Thin Wrappers", we need to treat these subagents also as simple wrappers of the core Agent skill. They are like slash commands that wrap agent skills. The only difference is that slash commands are designed for humans, but subagents are designed for the main agent / LLM.

We already have the old cc-agents in `plugins/rd2/skills/cc-agents` for plugin rd2.

**Key findings from the research (Section 10):**

- **agentskills.io does NOT cover agents** — there is no `AGENT.md` convention in the open standard (Section 10.6)
- **Each platform has its own agent definition system**, with no cross-platform portability:
  - Claude Code: Markdown + YAML frontmatter in `agents/` directories
  - Codex: TOML `[agents]` section in `config.toml` OR SDK `Agent()` class
  - Gemini CLI: Markdown + YAML frontmatter in `.gemini/agents/`
  - OpenCode: Dual — JSON `agent:` section in `opencode.jsonc` OR Markdown `.md` files
  - OpenClaw: Config-based (`openclaw.json` `agents.list`); no Markdown agent files
  - Antigravity: No formal definition format (policy + natural language dispatch)
  - pi-mono: Single-agent design, no subagent system (excluded)

**Known issues with rd2:cc-agents:**

1. Only targets Claude Code (no cross-platform support)
2. The 8-section anatomy is overly prescriptive (400-600 lines is excessive for simple agents)
3. The evaluation system is tightly coupled and hard to maintain
4. The agent template assumes the codebase's local convention, not platform standards
5. No adapter system for cross-platform generation (unlike rd3:cc-skills and rd3:cc-commands)

### Requirements

Design and implement `rd3:cc-agents` in `plugins/rd3/skills/cc-agents/`. The skill must:

1. **Follow the same pipeline architecture** as rd3:cc-skills and rd3:cc-commands: `scaffold -> validate -> evaluate -> refine -> adapt`
2. **Define a Universal Agent Model (UAM)** as the internal representation that captures the superset of all platform fields
3. **Support bidirectional adaptation** — parse FROM any platform format into UAM, and generate TO any platform format from UAM
4. **Support all 6 platforms** with full adapter implementations (Claude Code, Gemini CLI, OpenCode, Codex, OpenClaw, Antigravity)
5. **Provide 3 tiered templates** (minimal, standard, specialist) instead of mandating the 8-section anatomy
6. **Implement 8-dimension quality evaluation** with configurable weight profiles
7. **Prioritize the research results** over rd2:cc-agents conventions where they conflict

### Q&A

**Q1: Which platforms should rd3:cc-agents support?**

All 6 platforms with formal or semi-formal agent definition systems. pi-mono is excluded (no subagent system).

| Platform | Agent Definition Format | Adapter Support |
|----------|------------------------|-----------------|
| Claude Code | Markdown + YAML frontmatter in `agents/` | Full (parse + validate + generate) |
| Gemini CLI | Markdown + YAML frontmatter in `.gemini/agents/` | Full (parse + validate + generate) |
| OpenCode | JSON in `opencode.jsonc` OR Markdown in `.opencode/agents/` | Full (dual format, parse + validate + generate) |
| Codex | TOML `[agents]` section in `config.toml` | Full (parse TOML + validate + generate TOML) |
| OpenClaw | JSON `agents.list` in `openclaw.json` config | Full (parse JSON + validate + generate JSON) |
| Antigravity | No formal format — policy + natural language dispatch | Generate advisory documentation only |

**Q2: Should the 8-section anatomy be mandatory?**

**No.** The 8-section anatomy (METADATA, PERSONA, PHILOSOPHY, VERIFICATION, COMPETENCIES, PROCESS, RULES, OUTPUT) is a local convention, not a platform requirement. Instead, 3 tiered templates:

| Template | Target Use Case | Body Structure | Approx Lines |
|----------|----------------|----------------|-------------|
| **minimal** | Simple, focused agents (read-only explorer, linter) | Description + rules only | 20-50 |
| **standard** | Most production agents (code reviewer, designer) | Persona + Process + Rules + Output | 80-200 |
| **specialist** | Complex domain experts (planner, architect) | Full 8-section anatomy (optional) | 200-500 |

The 8-section anatomy becomes the `specialist` template — available but not mandatory.

**Q3: What is the universal "base" agent format?**

The intersection of Claude Code, Gemini CLI, and OpenCode yields:

| Field | Claude Code | Gemini CLI | OpenCode | Codex | OpenClaw | Universal Base |
|-------|-------------|------------|----------|-------|----------|---------------|
| `name` | Required | Required | Required | Section name | Config key | **Required** |
| `description` | Required | Required | Required | Required | Agent purpose | **Required** |
| `tools` | Optional (list) | Optional (array) | Optional (map) | N/A (sandbox) | Config-based | **Optional** |
| `model` | Optional | Optional | Optional | Optional | Optional | **Optional** |
| Body = system prompt | Yes | Yes | Yes | `developer_instructions` | N/A | **Yes** |

**Q4: How should evaluation work?**

8 dimensions with 2 weight profiles (`thin-wrapper` and `specialist`):

| # | Dimension | What It Checks | Thin-Wrapper Weight | Specialist Weight |
|---|-----------|----------------|-------------------|-----------------|
| 1 | Frontmatter Quality | Valid YAML, required fields, no invalid fields per platform | 15% | 10% |
| 2 | Description Effectiveness | Clear delegation trigger, keywords, "Use PROACTIVELY for" pattern | 20% | 15% |
| 3 | Body Quality | Imperative form, concise prompt, appropriate length for tier | 15% | 20% |
| 4 | Tool Restriction | Explicit allowlist/denylist, principle of least privilege | 10% | 10% |
| 5 | Thin Wrapper Compliance | Delegates to skills, doesn't reimplement logic, appropriate body size | 20% | 5% |
| 6 | Platform Compatibility | Fields map to target platforms, platform-specific features documented | 10% | 15% |
| 7 | Naming Convention | lowercase-hyphens, matches directory/filename, plugin namespace correct | 5% | 5% |
| 8 | Operational Readiness | Error handling, fallback behavior, clear output expectations | 5% | 20% |

Grade scale: A (90-100), B (80-89), C (70-79), D (60-69), F (<60). Passing: >= 75/100.

**Q5: Should rd3:cc-agents share code with rd3:cc-skills and rd3:cc-commands?**

Partial sharing. Same pipeline architecture shape but different type systems and evaluation criteria:

- **Share**: Adapter base class pattern, utility functions (YAML parsing, file I/O, report formatting), evaluation framework structure
- **Don't share**: Type definitions, evaluation dimensions, platform adapter implementations

Each skill maintains its own `types.ts`, `evaluate.ts`, and adapter implementations.

### Design

#### Architecture Overview

rd3:cc-agents follows the same pipeline architecture as rd3:cc-skills and rd3:cc-commands:

```
scaffold.ts -> validate.ts -> evaluate.ts -> refine.ts -> adapt.ts
```

Each script is independently executable from CLI or slash commands.

#### Universal Agent Model (UAM)

The skill defines a **Universal Agent Model** as the internal representation. All platform-specific formats are parsed into UAM and generated from UAM:

```
Claude Code .md ──┐
Gemini CLI .md ───┤
OpenCode .md ─────┤                                ┌──> Claude Code .md
OpenCode .jsonc ──┤──> Universal Agent Model ──────>├──> Gemini CLI .md
Codex .toml ──────┤       (internal)               ├──> OpenCode .md / .jsonc
OpenClaw .json ───┤                                ├──> Codex config.toml snippet
Antigravity ──────┘                                ├──> OpenClaw config snippet
  (advisory only)                                  └──> Antigravity advisory doc
```

#### UAM Field Table (superset of all platforms)

| UAM Field | Type | Required | Source Platforms |
|-----------|------|----------|-----------------|
| `name` | string | Yes | All |
| `description` | string | Yes | All |
| `tools` | string[] | No | Claude Code, Gemini CLI, OpenCode, Codex (derived) |
| `disallowedTools` | string[] | No | Claude Code only |
| `model` | string | No | All |
| `maxTurns` | number | No | Claude Code (`maxTurns`), Gemini CLI (`max_turns`), OpenCode (`steps`) |
| `timeout` | number | No | Gemini CLI (`timeout_mins`), Codex (`job_max_runtime_seconds`) |
| `temperature` | number | No | Gemini CLI, OpenCode |
| `permissionMode` | string | No | Claude Code only |
| `skills` | string[] | No | Claude Code only |
| `mcpServers` | string[] | No | Claude Code only |
| `hooks` | object | No | Claude Code only |
| `memory` | string | No | Claude Code only |
| `background` | boolean | No | Claude Code only |
| `isolation` | string | No | Claude Code only |
| `color` | string | No | Claude Code, OpenCode |
| `kind` | string | No | Gemini CLI (`local`/`remote`) only |
| `hidden` | boolean | No | OpenCode only |
| `permissions` | object | No | OpenCode only |
| `sandboxMode` | string | No | Codex only |
| `reasoningEffort` | string | No | Codex only |
| `body` | string | Yes | All (system prompt content) |

#### Adapter Pattern

Each platform adapter implements `IAgentPlatformAdapter`:

```typescript
interface IAgentPlatformAdapter {
    readonly platform: AgentPlatform;
    readonly displayName: string;

    // Parse platform-native format into UAM
    parse(input: string, filePath: string): Promise<AgentParseResult>;

    // Validate agent for this platform
    validate(agent: UniversalAgent): Promise<AgentAdapterResult>;

    // Generate platform-native output from UAM
    generate(agent: UniversalAgent, context: AgentAdapterContext): Promise<AgentAdapterResult>;

    // Detect platform-specific features used
    detectFeatures(agent: UniversalAgent): string[];
}
```

Key difference from cc-skills and cc-commands adapters: agent adapters have a `parse()` method because agents can be imported FROM any platform format, not just exported TO them.

#### Field Mapping Table

| UAM Field | Claude Code | Gemini CLI | OpenCode | Codex | OpenClaw |
|-----------|-------------|------------|----------|-------|----------|
| `name` | `name:` | `name:` | config key / filename | section name `[agents.X]` | config key in `agents.list` |
| `description` | `description:` | `description:` | `description:` | `description:` | Agent purpose in config |
| `tools` | `tools:` (list) | `tools:` (array) | `tools:` (map, boolean) | N/A (sandbox level) | `tools.subagents.tools` |
| `disallowedTools` | `disallowedTools:` | N/A | `tools: { X: false }` | N/A | `tools.allow/deny` |
| `model` | `model:` | `model:` | `model:` (provider/id) | `model:` | Per-agent config |
| `maxTurns` | `maxTurns:` | `max_turns:` | `steps:` | N/A | N/A |
| `temperature` | N/A | `temperature:` | `temperature:` | N/A | N/A |
| `timeout` | N/A | `timeout_mins:` | N/A | `job_max_runtime_seconds` | `runTimeoutSeconds` |
| `body` | Markdown body | Markdown body | Markdown body or `prompt:` | `developer_instructions:` | N/A (task-scoped) |

#### Evaluation Architecture

**Tier 1 — Structural Validation** (deterministic, via `validate.ts`):
- YAML frontmatter parseable
- Required fields present (`name`, `description`)
- No invalid fields for target platform
- Name follows `[a-z0-9-]+` pattern
- Body is non-empty
- File location is correct for platform

**Tier 2 — Quality Evaluation** (weighted scoring, via `evaluate.ts`):
- 8 dimensions with configurable weights
- Auto-detect weight profile based on body length and section count
- Grade scale: A/B/C/D/F, passing >= 75/100
- Detailed report with per-dimension findings

#### Template System

3 tiered templates with increasing complexity:

**minimal.md** (20-50 lines) — Simple focused agents:
```yaml
---
name: {{AGENT_NAME}}
description: "{{DESCRIPTION}}"
tools: [{{TOOLS}}]
model: inherit
---

{{SYSTEM_PROMPT}}
```

**standard.md** (80-200 lines) — Most production agents:
```yaml
---
name: {{AGENT_NAME}}
description: "{{DESCRIPTION}}"
tools: [{{TOOLS}}]
model: inherit
color: {{COLOR}}
---

# {{DISPLAY_NAME}}

## Role
{{PERSONA}}

## Process
{{WORKFLOW_STEPS}}

## Rules

### Do
{{DO_RULES}}

### Don't
{{DONT_RULES}}

## Output Format
{{OUTPUT_TEMPLATE}}
```

**specialist.md** (200-500 lines) — Full 8-section anatomy for complex domain experts.

### Solution

#### File Structure

```
plugins/rd3/skills/cc-agents/
├── SKILL.md                          # Main skill definition
├── agents/
│   └── openai.yaml                   # Codex UI metadata
├── metadata.openclaw                  # OpenClaw metadata
├── references/
│   ├── evaluation-framework.md        # 8-dimension scoring details
│   ├── frontmatter-reference.md       # Per-platform frontmatter fields
│   ├── platform-compatibility.md      # Cross-platform agent feature matrix
│   ├── agent-anatomy.md               # Body structure guidance (tiered)
│   └── troubleshooting.md             # Common issues and fixes
├── scripts/
│   ├── types.ts                       # UAM types, platform types, evaluation types
│   ├── utils.ts                       # YAML parsing, file I/O, shared helpers
│   ├── scaffold.ts                    # Create new agent from template
│   ├── validate.ts                    # Structural validation (Tier 1)
│   ├── evaluate.ts                    # Quality scoring (Tier 2, 8 dimensions)
│   ├── evaluation.config.ts           # Dimension weights, grade thresholds
│   ├── refine.ts                      # Fix issues based on evaluation
│   ├── adapt.ts                       # Cross-platform generation
│   └── adapters/
│       ├── base.ts                    # BaseAgentAdapter abstract class
│       ├── index.ts                   # Adapter registry and factory
│       ├── claude.ts                  # Claude Code adapter (parse + validate + generate)
│       ├── gemini.ts                  # Gemini CLI adapter (Markdown, different frontmatter)
│       ├── opencode.ts                # OpenCode adapter (dual: Markdown or JSON config)
│       ├── codex.ts                   # Codex adapter (TOML parse + generate)
│       ├── openclaw.ts                # OpenClaw adapter (JSON config parse + generate)
│       └── antigravity.ts             # Antigravity adapter (advisory doc generation)
├── templates/
│   ├── minimal.md                     # Simple focused agent template
│   ├── standard.md                    # Most agents, balanced structure
│   └── specialist.md                  # Complex domain expert template
└── tests/
    ├── evaluate.test.ts               # Evaluation dimension tests
    ├── utils.test.ts                  # Utility function tests
    ├── adapters.test.ts               # Per-platform adapter tests
    └── fixtures/
        ├── minimal-agent.md           # Test fixture: minimal valid agent
        ├── standard-agent.md          # Test fixture: standard agent
        ├── specialist-agent.md        # Test fixture: specialist agent
        ├── invalid-frontmatter.md     # Test fixture: bad frontmatter
        ├── claude-only-features.md    # Test fixture: Claude-specific fields
        └── codex-agent.toml           # Test fixture: Codex TOML format
```

#### Platform Adapter Summary

| Adapter | Parse From | Generate To | Key Mapping Notes |
|---------|-----------|-------------|-------------------|
| **claude.ts** | `.md` with YAML frontmatter | `.md` with full Claude frontmatter | Native format, all UAM fields supported |
| **gemini.ts** | `.md` with Gemini YAML frontmatter | `.md` with Gemini frontmatter | Map `maxTurns` → `max_turns`, drop Claude-only fields, add `kind`, `temperature`, `timeout_mins` |
| **opencode.ts** | `.md` or JSON `agent:` config | `.md` file AND JSON config snippet | Dual format; map `tools` list → boolean map, `maxTurns` → `steps` |
| **codex.ts** | TOML `[agents.NAME]` section | TOML section snippet | Body → `developer_instructions`, `tools` → `sandbox_mode` heuristic |
| **openclaw.ts** | JSON from `openclaw.json` | JSON config snippet | No Markdown agent files; map concurrency/spawn depth fields |
| **antigravity.ts** | N/A (no formal format) | Advisory documentation | Generate policy recommendations and natural language dispatch guidance |

### Plan

#### Phase 1: Foundation (types + utils + base adapter + Claude adapter)

**Deliverables:**
- `scripts/types.ts` — UAM type definitions, platform types, all interfaces
- `scripts/utils.ts` — YAML parsing, file I/O, name normalization, shared helpers
- `scripts/adapters/base.ts` — Abstract `BaseAgentAdapter` class
- `scripts/adapters/index.ts` — Adapter registry and factory function
- `scripts/adapters/claude.ts` — Claude Code adapter (parse, validate, generate)

**Exit criteria:**
- All types compile with zero errors
- Claude adapter round-trips a Claude Code agent `.md` file (parse → UAM → generate → identical output)
- Unit tests for types and utils pass

#### Phase 2: Scaffold + Validate + Templates

**Deliverables:**
- `templates/minimal.md`, `templates/standard.md`, `templates/specialist.md`
- `scripts/scaffold.ts` — Create agent from template with placeholder replacement
- `scripts/validate.ts` — Tier 1 structural validation
- `tests/fixtures/` — All test fixture files
- `tests/utils.test.ts` — Utility function tests

**Exit criteria:**
- `scaffold.ts` creates valid agent files from all 3 templates
- `validate.ts` correctly identifies valid and invalid agent files
- All fixtures parse and validate as expected

#### Phase 3: Evaluate + Refine

**Deliverables:**
- `scripts/evaluation.config.ts` — Dimension weights, grade thresholds, two weight profiles
- `scripts/evaluate.ts` — 8-dimension quality scoring with auto-detect weight profile
- `scripts/refine.ts` — Deterministic + LLM-assisted fixing, `--migrate` flag for rd2→rd3
- `tests/evaluate.test.ts` — Evaluation dimension tests

**Exit criteria:**
- Evaluation produces correct scores for all test fixtures
- Weight profile auto-detection works (body length + section count heuristic)
- Refine applies deterministic fixes and reports LLM-fixable issues
- Grade boundaries match A/B/C/D/F thresholds

#### Phase 4: Platform Adapters (remaining 5 platforms)

**Deliverables:**
- `scripts/adapters/gemini.ts` — Gemini CLI adapter
- `scripts/adapters/opencode.ts` — OpenCode adapter (dual format)
- `scripts/adapters/codex.ts` — Codex adapter (TOML parse + generate)
- `scripts/adapters/openclaw.ts` — OpenClaw adapter (JSON parse + generate)
- `scripts/adapters/antigravity.ts` — Antigravity adapter (advisory)
- `scripts/adapt.ts` — Cross-platform adaptation orchestrator
- `tests/adapters.test.ts` — Per-platform adapter tests

**Exit criteria:**
- Each adapter correctly maps UAM fields to/from platform-native format
- All Markdown-based adapters (Gemini, OpenCode) can round-trip their native formats
- Codex adapter generates valid TOML and parses TOML input
- OpenClaw adapter generates/parses valid JSON config
- Antigravity adapter generates informational documentation
- `adapt.ts` orchestrates all adapters with `--platform all` flag

#### Phase 5: SKILL.md + References + Integration

**Deliverables:**
- `SKILL.md` — Main skill definition (following rd3:cc-skills and rd3:cc-commands pattern)
- `agents/openai.yaml` — Codex UI metadata
- `metadata.openclaw` — OpenClaw metadata
- `references/evaluation-framework.md` — Detailed scoring criteria
- `references/frontmatter-reference.md` — Per-platform field reference
- `references/platform-compatibility.md` — Cross-platform feature matrix
- `references/agent-anatomy.md` — Body structure guidance (tiered templates)
- `references/troubleshooting.md` — Common issues and fixes

**Exit criteria:**
- SKILL.md follows the same structure as rd3:cc-skills and rd3:cc-commands
- All references are complete and cross-referenced
- Full pipeline works end-to-end: scaffold → validate → evaluate → refine → adapt
- Self-evaluation: run `rd3:skill-evaluate` on the new skill and achieve grade B or higher

#### Dependencies

- Phase 2 depends on Phase 1 (types, utils, Claude adapter)
- Phase 3 depends on Phase 2 (validate used in evaluate)
- Phase 4 depends on Phase 1 (base adapter, types)
- Phase 5 depends on all prior phases
- Phases 2 and 4 are partially parallelizable after Phase 1 completes

### Artifacts

| Type | Path | Generated By | Date |
| ---- | ---- | ------------ | ---- |

### References

- Research report: `docs/reasearch/how_to_write_skills_en.md` — Section 10 "Subagent / Agent Definition Comparison" (2026-03-12)
- Existing rd2 skill: `plugins/rd2/skills/cc-agents/SKILL.md` — 8-section anatomy, evaluation criteria
- Existing rd3 skill (commands): `plugins/rd3/skills/cc-commands/` — Adapter pattern, types, evaluation reference
- Existing rd3 skill (skills): `plugins/rd3/skills/cc-skills/` — Pipeline architecture reference
- Claude Code subagent docs: `code.claude.com/docs/en/sub-agents` (2026-03-12, HIGH confidence)
- agentskills.io spec: `agentskills.io/specification` (2026-03-12, HIGH confidence — confirms no agent standard)
