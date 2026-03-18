---
name: rd3-cc-agents-phase1-foundation-types-utils-adapters
description: { { DESCRIPTION } }
status: Done
created_at: 2026-03-17 17:02:33
updated_at: 2026-03-17 17:12:54
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0221. rd3-cc-agents-phase1-foundation-types-utils-adapters

### Background

Phase 1 of rd3:cc-agents skill creation. Establishes the Universal Agent Model (UAM) type system, shared utilities, base adapter abstract class, and Claude Code adapter. This is the foundation layer that all subsequent phases depend on. Must follow the same architecture patterns established in rd3:cc-skills (plugins/rd3/skills/cc-skills/) and rd3:cc-commands (plugins/rd3/skills/cc-commands/), adapting them for the subagent domain. The UAM is the superset internal representation that captures all 6 platform formats. Parent task: 0220.

### Requirements

Create plugins/rd3/skills/cc-agents/ directory structure. Implement types.ts with UAM interface (all fields from 6 platforms as superset), platform-specific interfaces (ClaudeAgent, GeminiAgent, OpenCodeAgent, CodexAgent, OpenClawAgent, AntigravityAgent), adapter interfaces (AgentAdapter with parse/generate/validate), template types, and evaluation types. Implement utils.ts with shared helpers (frontmatter parsing, section extraction, markdown generation, validation helpers). Implement adapters/base.ts as abstract BaseAgentAdapter class. Implement adapters/claude.ts for Claude Code .md format with 8-section anatomy parsing and generation. All TypeScript with proper exports. Success criteria: types compile cleanly, claude adapter can round-trip a Claude agent .md file, utils provide all shared functions needed by later phases.

### Q&A

[Clarifications added during planning phase]

### Design


## Architecture

Follow rd3:cc-skills architecture exactly, adapted for agent domain:

```
plugins/rd3/skills/cc-agents/
├── types.ts              # UAM + platform interfaces + adapter interfaces
├── utils.ts              # Shared helpers (frontmatter, markdown, validation)
├── adapters/
│   ├── base.ts           # Abstract BaseAgentAdapter
│   ├── claude.ts         # Claude Code .md adapter
│   └── index.ts          # Barrel export
```

## UAM Core Fields (superset of all 6 platforms)

- **Identity**: name, description, version, role
- **Persona**: persona text, philosophy, approach
- **Capabilities**: competencies[], skills[], tools[], model constraints
- **Behavior**: process/workflow, rules (always[]/never[]), verification protocol
- **Output**: output format, examples[]
- **Metadata**: platform-specific extensions map

## Adapter Pattern

BaseAgentAdapter (abstract):
- `parse(input: string): UAM` — Parse platform-specific format to UAM
- `generate(uam: UAM): string` — Generate platform-specific format from UAM
- `validate(input: string): ValidationReport` — Validate platform-specific format

Claude adapter maps 8 markdown sections to/from UAM fields.

### Solution


## Approach

Create the foundation layer for rd3:cc-agents in `plugins/rd3/skills/cc-agents/` following the exact architecture patterns established by rd3:cc-skills and rd3:cc-commands. This phase establishes the Universal Agent Model (UAM) type system, shared utilities, abstract base adapter, and Claude Code adapter.

## Key Technical Decisions

1. **UAM as superset type**: The Universal Agent Model captures ALL fields from all 6 platform agent formats. Platform-specific adapters map to/from UAM, with optional fields for platform-specific capabilities.
2. **Zod for runtime validation**: Use Zod schemas alongside TypeScript interfaces for runtime type checking during parse/generate operations.
3. **Template Method pattern for adapters**: BaseAgentAdapter defines abstract parse()/generate()/validate() methods; platform adapters implement them.
4. **Claude adapter first**: Claude Code's 8-section anatomy (.md format) is the most complex format and serves as the reference implementation.
5. **Follow rd3:cc-skills structure exactly**: Match the directory layout, naming conventions, export patterns, and utility function signatures.

## Files to Create

- `plugins/rd3/skills/cc-agents/types.ts` — UAM interface, platform interfaces, adapter interfaces, template types, evaluation types
- `plugins/rd3/skills/cc-agents/utils.ts` — Shared helpers: frontmatter parsing, section extraction, markdown generation, validation helpers
- `plugins/rd3/skills/cc-agents/adapters/base.ts` — Abstract BaseAgentAdapter class with template method pattern
- `plugins/rd3/skills/cc-agents/adapters/claude.ts` — Claude Code adapter: parse/generate 8-section .md agent files
- `plugins/rd3/skills/cc-agents/adapters/index.ts` — Barrel export (initially just claude)

## Reference Implementations to Follow

- `plugins/rd3/skills/cc-skills/types.ts` — Type system pattern
- `plugins/rd3/skills/cc-skills/utils.ts` — Utility function pattern
- `plugins/rd3/skills/cc-skills/adapters/base.ts` — Base adapter pattern
- `plugins/rd3/skills/cc-skills/adapters/claude.ts` — Claude adapter pattern
- `plugins/rd2/skills/cc-agents/` — Old agent skill (domain knowledge, not architecture)

## Acceptance Criteria

- All TypeScript files compile without errors
- UAM interface covers all fields from 6 platform formats
- Claude adapter can round-trip a Claude agent .md file (parse -> UAM -> generate produces equivalent output)
- Utils provide all shared functions needed by phases 2-5
- Exports are clean and well-organized

### Plan


## Implementation Steps

1. Study rd3:cc-skills types.ts, utils.ts, adapters/base.ts, adapters/claude.ts to understand patterns
2. Study rd2:cc-agents SKILL.md and references for agent domain knowledge (8-section anatomy, competency structure, etc.)
3. Create directory structure: plugins/rd3/skills/cc-agents/ and plugins/rd3/skills/cc-agents/adapters/
4. Implement types.ts: UAM interface, platform interfaces, adapter interfaces
5. Implement utils.ts: frontmatter parsing, section extraction, markdown generation
6. Implement adapters/base.ts: abstract BaseAgentAdapter
7. Implement adapters/claude.ts: Claude Code format adapter
8. Implement adapters/index.ts: barrel export
9. Verify TypeScript compilation
10. Test Claude adapter round-trip with a sample agent file

### Artifacts

| Type | Path | Generated By | Date |
| ---- | ---- | ------------ | ---- |

### References

[Links to docs, related tasks, external resources]
