---
name: cc-magents
description: "Create, validate, evaluate, refine, evolve, and adapt main agent customization files across coding-agent platforms using a capability-aware model."
license: Apache-2.0
metadata:
  author: cc-agents
  version: "5.0.0"
  platforms: "agents-md,codex,claude-code,gemini-cli,opencode,cursor,copilot,windsurf,cline,zed,amp,aider,openclaw,antigravity,pi"
---

# cc-magents

`cc-magents` manages **main agent customization**, not subagents. It handles
files such as `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.cursor/rules/*.mdc`,
`.github/copilot-instructions.md`, `.windsurf/rules/*.md`,
`.clinerules/*.md`, `.rules`, `.aider.conf.yml`, `opencode.json`, and
OpenClaw workspace files.

## When to Use

Use this skill when the task involves main-agent configuration files:

- Trigger phrases: "create AGENTS.md", "add CLAUDE.md", "evaluate this agent config",
  "refine AGENTS.md", "adapt CLAUDE.md to Cursor", "convert agent rules to Windsurf",
  "validate .cursor/rules", "score my main agent file"
- File patterns: `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.cursorrules`,
  `.cursor/rules/*.mdc`, `.github/copilot-instructions.md`, `.windsurf/rules/*.md`,
  `.clinerules/*.md`, `.rules`, `.aider.conf.yml`, `opencode.json`
- Operations: synthesize, validate, evaluate, refine, evolve, or adapt main-agent
  configurations across coding-agent platforms

Do NOT use for subagent definitions (use `rd3:cc-agents`), slash commands
(`rd3:cc-commands`), skills (`rd3:cc-skills`), or hooks (`rd3:cc-hooks`).

## Core Principle

Main-agent support is capability-based. Each platform declares:

- native files and locations
- discovery and precedence
- import/modularity support
- rule activation and scoping
- known limits
- supported operations
- source confidence and verification evidence

## Operations

| Operation | Script | Purpose |
| --- | --- | --- |
| add / synthesize | `scripts/synthesize.ts` | Create new platform-native config from a template |
| validate | `scripts/validate.ts` | Validate document and registry structure |
| evaluate | `scripts/evaluate.ts` | Score quality across capability-aware dimensions |
| refine | `scripts/refine.ts` | Recommend native splits, scoping, safety, and evidence improvements |
| evolve | `scripts/evolve.ts` | Propose registry and fixture improvements |
| adapt | `scripts/adapt.ts` | Convert between platforms with loss reporting |

## Quick Start

```bash
# Create a new platform-native config from a template
bun scripts/synthesize.ts general-agent --output AGENTS.md

# Score quality with the standard profile
bun scripts/evaluate.ts AGENTS.md --profile standard

# Preview refinements, then apply them
bun scripts/refine.ts AGENTS.md --dry-run
bun scripts/refine.ts AGENTS.md --apply

# Propose registry/fixture improvements
bun scripts/evolve.ts AGENTS.md --propose

# Convert between platforms
bun scripts/adapt.ts CLAUDE.md --to cursorrules --output .cursorrules
bun scripts/adapt.ts AGENTS.md --to claude-code --output CLAUDE.md
bun scripts/adapt.ts AGENTS.md --to openclaw --output ./openclaw-workspace
```

JSON output is supported on every script via `--json` for automation.

## Workflows

| Workflow | Steps | Handler |
| --- | --- | --- |
| **Add** | template selection -> synthesize -> validate -> evaluate | `synthesize.ts` -> `validate.ts` -> `evaluate.ts` |
| **Validate** | parse -> registry check -> structural lint | `validate.ts` |
| **Evaluate** | capability-aware scoring across dimensions | `evaluate.ts` |
| **Refine** | dry-run diff -> review -> apply | `refine.ts --dry-run` -> `refine.ts --apply` |
| **Evolve** | longitudinal analysis -> proposal -> apply | `evolve.ts --propose` -> `evolve.ts --apply` |
| **Adapt** | source parse -> target capability map -> emit + loss report | `adapt.ts --to <platform>` |

Branching:
- IF validate fails -> stop and surface registry/parse errors
- IF evaluate score below threshold -> route to `refine`
- IF adapt reports lossy capabilities -> log and require explicit user acknowledgement

See [references/workflows.md](references/workflows.md) for full step tables and
[references/platform-compatibility.md](references/platform-compatibility.md) for the platform capability matrix.

## Source Material

The current platform research source is `docs/main_agents.md`, verified on
2026-04-30. Provisional platforms such as Antigravity and Pi must remain marked
as low confidence until official docs or reproducible product tests exist.

## Additional Resources

- [references/workflows.md](references/workflows.md) - Detailed operation workflows
- [references/platform-compatibility.md](references/platform-compatibility.md) - Per-platform capability matrix
- `templates/` - Synthesis templates (general-agent, dev-agent, review-agent, etc.)
- `scripts/` - Executable operations (`synthesize.ts`, `validate.ts`, `evaluate.ts`, `refine.ts`, `evolve.ts`, `adapt.ts`)
- `tests/` - Test fixtures and validation suites
