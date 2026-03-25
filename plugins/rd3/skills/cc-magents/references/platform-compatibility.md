# Cross-Platform Main Agent Compatibility

How main agent configurations map across platforms.

## Platform Tiers

| Tier | Capability | Platforms |
|------|-----------|-----------|
| **Tier 1** | Full (Parse + Generate + Validate) | agents-md, claude-md, gemini-md, codex |
| **Tier 2** | Standard (Parse + Generate) | cursorrules, windsurfrules, zed-rules, opencode-rules |
| **Tier 3** | Basic (Generate Only) | junie, augment, cline, aider, warp, roocode, amp, vscode-instructions |

## Feature Portability Matrix

| Feature | AGENTS.md | CLAUDE.md | GEMINI.md | .cursorrules | OpenCode |
|---------|-----------|-----------|-----------|-------------|----------|
| Identity section | Y | Y | Y | Y | Y |
| Tech stack | Y | Y | Y | Y | Y |
| Coding style | Y | Y | Y | Y | Y |
| Hooks/automation | N | Y | N | N | N |
| Memory patterns | N | Y | N | N | N |
| save_memory | N | N | Y | N | N |
| Tool priority | Y | Y | N | Y | Y |
| Safety rules | Y | Y | Y | Y | Y |
| MCP config | N | Y | N | N | N |

## Conversion Warnings

| Source | Target | Feature Lost |
|--------|--------|-------------|
| CLAUDE.md | Codex | Memory patterns |
| CLAUDE.md | .cursorrules | Hooks not portable |
| GEMINI.md | Any except GEMINI | save_memory not portable |
| Any | Tier 3 targets | Validation not available |

## UMAM Portability

The Universal Main Agent Model (UMAM) preserves all sections during parsing. On generation, sections with platform-specific features are either:

- **Mapped**: Translated to equivalent target platform syntax
- **Dropped**: Removed with a warning when no equivalent exists
- **Annotated**: Preserved as comments in the output for manual review
