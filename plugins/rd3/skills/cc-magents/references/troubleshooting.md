# cc-magents: Troubleshooting Guide

## Error: "Config file not found"
Ensure the path points to a main agent config file (AGENTS.md, CLAUDE.md, GEMINI.md, .cursorrules, etc.).

## Evaluation fails with low score
Run with `--scope full --verbose` to see detailed findings. Common issues:
- Missing identity or role section
- No tech stack guidance
- Missing safety rules or CRITICAL markers
- Too few sections for the config scope

## Adapt/convert loses features
Not all features are portable across platforms. Check [platform-compatibility.md](platform-compatibility.md) for the feature portability matrix. Common losses:
- Claude Code hooks are not portable to .cursorrules or AGENTS.md
- GEMINI.md `save_memory` is Gemini-specific
- MCP server configuration is Claude-specific

## Evolution proposals seem too aggressive
The default safety model is L1 (suggest-only). If proposals modify CRITICAL sections, they are automatically blocked. See [evolution-protocol.md](evolution-protocol.md) for safety levels.

## Common Issues

### UMAM parsing fails
- Check that the config file has valid markdown structure
- Ensure YAML frontmatter (if present) is properly delimited with `---`
- Tier 3 platforms (generate-only) cannot be parsed as source

### Conversion output is empty or incomplete
- Verify the source config has enough content to convert
- Use `--dry-run` to preview the conversion before writing
- Check conversion warnings in the output for dropped features

### Version snapshots not saving
- Ensure `.rd3-evolution/` directory is writable
- Check that the evolution namespace matches: `.rd3-evolution/cc-magents/`
- Verify the workspace root detection is correct (looks for `.git` directory)
