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

## Examples

```bash
bun scripts/synthesize.ts general-agent --output AGENTS.md
bun scripts/evaluate.ts AGENTS.md --profile standard
bun scripts/refine.ts AGENTS.md --dry-run
bun scripts/refine.ts AGENTS.md --apply
bun scripts/evolve.ts AGENTS.md --propose
bun scripts/adapt.ts CLAUDE.md --to cursorrules --output .cursorrules

bun plugins/rd3/skills/cc-magents/scripts/validate.ts AGENTS.md --json
bun plugins/rd3/skills/cc-magents/scripts/evaluate.ts AGENTS.md --json
bun plugins/rd3/skills/cc-magents/scripts/refine.ts AGENTS.md --to cursor --json
bun plugins/rd3/skills/cc-magents/scripts/adapt.ts AGENTS.md --to claude-code --output CLAUDE.md
bun plugins/rd3/skills/cc-magents/scripts/adapt.ts AGENTS.md --to openclaw --output ./openclaw-workspace
```

## Source Material

The current platform research source is `docs/main_agents.md`, verified on
2026-04-30. Provisional platforms such as Antigravity and Pi must remain marked
as low confidence until official docs or reproducible product tests exist.
