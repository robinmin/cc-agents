---
description: Convert between platform formats
argument-hint: <source-path> --to <platform|all> [--output <path>]
triggers:
  - "convert to cursorrules"
  - "adapt for Cursor"
  - "convert CLAUDE.md to AGENTS.md"
  - "migrate to .cursorrules"
  - "cross-platform conversion"
examples:
  - "magent-adapt CLAUDE.md --to agents-md"
  - "magent-adapt AGENTS.md --to cursorrules"
  - "magent-adapt CLAUDE.md --to all --output ./converted/"
---

# magent-adapt

Convert main agent configurations between different platform formats.

## When to Use

- Migrating from one AI coding platform to another
- Creating configs for multiple platforms from a single source
- Testing how a config translates to different formats
- Generating platform-specific configs from universal source

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `source-path` | Path to source config | (required) |
| `--to` | Target platform (or 'all') | (required) |
| `--output` | Output directory or file | same directory |

## Supported Platforms

### Tier 1 (Full Support)
- `agents-md`: AGENTS.md (Universal Standard)
- `claude-md`: CLAUDE.md (Claude Code)
- `gemini-md`: GEMINI.md (Gemini CLI)
- `codex`: Codex (OpenAI)

### Tier 2 (Standard Support)
- `cursorrules`: .cursorrules (Cursor)
- `windsurfrules`: .windsurfrules (Windsurf)
- `zed-rules`: .zed/rules (Zed)
- `opencode-rules`: opencode.md (OpenCode)

### Tier 3 (Basic - Generate Only)
- `junie`, `augment`, `cline`, `aider`, `warp`, `roocode`, `amp`, `vscode-instructions`

## Conversion Flow

```
Source -> Parse -> UMAM -> Generate -> Target
```

All conversions use the Universal Main Agent Model (UMAM) as an intermediate format, ensuring lossless conversion through the canonical AGENTS.md format.

## Conversion Warnings

Some features may be lost or degraded when converting between platforms:

| Source | Target | Warning Type |
|--------|--------|--------------|
| CLAUDE.md | Codex | Memory patterns lost |
| Claude hooks | .cursorrules | Not portable |
| Gemini save_memory | Any except Gemini | Not portable |

## Workflow

See [Adapt Workflow](references/workflows.md#adapt-workflow) for detailed step-by-step flow, platform tiers, and conversion warnings.

## Implementation

Delegates to adapt.ts script:

```bash
bun plugins/rd3/skills/cc-magents/scripts/adapt.ts $ARGUMENTS
```

## Examples

```bash
# Convert CLAUDE.md to AGENTS.md
/rd3:magent-adapt CLAUDE.md --to agents-md

# Convert to .cursorrules format
/rd3:magent-adapt AGENTS.md --to cursorrules

# Convert to all supported platforms
/rd3:magent-adapt CLAUDE.md --to all --output ./converted/
```
