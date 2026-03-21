---
description: Synthesize a new main agent configuration
argument-hint: <template> [--platform <platform>] [--output <path>]
triggers:
  - "create agent config"
  - "generate AGENTS.md"
  - "scaffold main agent"
  - "new CLAUDE.md"
  - "start agent project"
examples:
  - "magent-add dev-agent"
  - "magent-add --platform claude-md"
  - "magent-add research-agent --output GEMINI.md"
---

# magent-add

Generate a new main agent configuration file from templates with automatic project detection.

## When to Use

- Starting a new project and need a main agent config
- Creating an AGENTS.md, CLAUDE.md, or other platform config
- Scaffolding a main agent for a new codebase
- Converting between template-based and custom agent configs

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `template` | Domain template (dev-agent, research-agent, content-agent, data-agent, devops-agent, general-agent) | auto-detect |
| `--platform` | Target platform format | agents-md |
| `--output` | Output file path | AGENTS.md (or based on platform) |

## Available Templates

| Template | Purpose |
|----------|---------|
| `dev-agent` | Software development with coding standards |
| `research-agent` | Research and analysis workflows |
| `content-agent` | Content creation and documentation |
| `data-agent` | Data science and ML workflows |
| `devops-agent` | DevOps and infrastructure |
| `general-agent` | General purpose assistant |

## Workflow

1. Detect project type from files (package.json, go.mod, etc.)
2. Select appropriate template or use provided template
3. Process template with project-specific variables
4. Generate platform-specific output
5. Write to target file

## Workflow

See [Add Workflow](references/workflows.md#add-workflow) for detailed step-by-step flow, branching logic, and retry policy.

## Implementation

Delegates to synthesize.ts script:

```bash
bun plugins/rd3/skills/cc-magents/scripts/synthesize.ts $ARGUMENTS
```

## Examples

```bash
# Create AGENTS.md for a Node.js project (auto-detects template)
/rd3:magent-add

# Create CLAUDE.md with dev-agent template
/rd3:magent-add dev-agent --platform claude-md --output CLAUDE.md

# Create from specific template
/rd3:magent-add data-agent --platform agents-md
```
