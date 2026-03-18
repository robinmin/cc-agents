---
description: Adapt a Claude Code agent for other AI coding platforms
argument-hint: "<source-file> <source-platform> [target-platform] [--output <dir>] [--dry-run] [--verbose]"
allowed-tools: ["Read", "Write", "Glob", "Bash"]
---

# Agent Adapt

Wraps **rd3:cc-agents** skill.

Convert a Claude Code agent to work with other AI coding platforms (Codex, OpenClaw, OpenCode, Antigravity).

## When to Use

- Port Claude Code agents to other platforms
- Generate platform-specific agent configurations
- Test cross-platform compatibility

## Expected Results

- Adapted agent files for target platforms
- Platform-specific field mappings applied
- Configuration snippets for each target platform

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `source-file` | Path to agent source .md file | (required) |
| `source-platform` | Source platform: claude, codex, openclaw, opencode, antigravity | (required) |
| `target-platform` | Target platform (or "all") | all |
| `--output` | Output directory | same as source |
| `--dry-run` | Preview without writing files | false |
| `--verbose` | Show detailed output | false |

## Platform Mappings

| Platform | Format | Notes |
|----------|--------|-------|
| claude | AGENTS.md | Claude Code native format |
| codex | agents/openai.yaml | OpenAI Codex configuration |
| openclaw | metadata.openclaw | OpenClaw metadata fields |
| opencode | config-level hints | OpenCode permission config |
| antigravity | Gemini CLI | Google Gemini CLI format |

## Examples

```bash
# Adapt Claude agent to all other platforms
/rd3:agent-adapt ./agents/my-agent.md claude all

# Adapt Claude agent to Gemini only
/rd3:agent-adapt ./agents/my-agent.md claude antigravity

# Adapt to specific platform with custom output
/rd3:agent-adapt ./agents/my-agent.md claude codex --output ./adapted/

# Preview what would be generated
/rd3:agent-adapt ./agents/my-agent.md claude all --dry-run
```

## Output Example

```
Source: my-agent.md (Claude Code)
Targets: Codex, OpenClaw, OpenCode, Antigravity
Output: ./adapted/

--- Generated Files ---
✓ my-agent.codex.yaml
✓ my-agent.openclaw.md
✓ my-agent.opencode.md
✓ my-agent.antigravity.md
```

## Implementation

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-agents/scripts/adapt.ts <source-file> <source-platform> [target-platform] [options]
```

## Platform Notes

- Claude Code: Use `Skill()` for skill delegation
- Other platforms: Run script directly via Bash tool

## See Also

- `/rd3:agent-evaluate` - Validate agent quality
- `/rd3:agent-refine` - Improve agent after evaluation
- `/rd3:command-adapt` - Adapt commands (similar tool)
