# RD2 Plugin Sync Scripts

Unified scripts to sync rd2 plugins (rules, commands, subagents, skills) to all vibe coding tools.

## Quick Start

```bash
# Sync all tools
./scripts/setup-all.sh

# Sync specific tools
./scripts/setup-all.sh --tools=claude,antigravity,gemini-cli

# Preview without changes
./scripts/setup-all.sh --dry-run
```

## Supported Tools

| Tool | Description | Sync Method |
|------|-------------|-------------|
| **Claude Code** | Anthropic's official Claude Code CLI | Direct plugin install |
| **Antigravity** | Google Gemini Code Assist CLI | rulesync |
| **Gemini CLI** | Google Gemini CLI | rulesync |
| **Auggie** | Augment Code (semantic understanding) | rulesync |
| **OpenCode** | Multi-model code generation CLI | rulesync |

## Usage

```bash
./scripts/setup-all.sh [OPTIONS]

Options:
  --tools=LIST      Comma-separated tools (default: all)
  --features=LIST   Comma-separated features (default: all)
  --dry-run         Preview changes without executing
  --verbose         Enable detailed output
  --help, -h        Show help message
```

### Examples

```bash
# Sync Claude Code only
./scripts/setup-all.sh --tools=claude

# Sync Claude + Antigravity
./scripts/setup-all.sh --tools=claude,antigravity

# Sync all tools
./scripts/setup-all.sh

# Dry run preview
./scripts/setup-all.sh --tools=gemini-cli --dry-run

# Sync specific features only
./scripts/setup-all.sh --features=rules,commands
```

## Tool Details

### Claude Code

**Installation Method:** Direct plugin installation (no rulesync)

```bash
# Sync Claude Code plugins
./scripts/setup-all.sh --tools=claude
```

**What it does:**
- Removes plugin cache
- Pulls latest from marketplace
- Reinstalls `wt@cc-agents` and `rd2@cc-agents` plugins

**Plugins installed:**
- `wt@cc-agents` - Web browsing, document conversion
- `rd2@cc-agents` - RD2 workflow management

**Output location:** `~/.claude/plugins/`

**Requirements:** `claude` CLI installed

### Google Antigravity

**Installation Method:** rulesync

```bash
# Sync to Antigravity
./scripts/setup-all.sh --tools=antigravity
```

**Features:** rules, commands, skills

**Output location:** `.agent/`

**Requirements:** `rulesync` CLI (or `npx rulesync`)

### Gemini CLI

**Installation Method:** rulesync

```bash
# Sync to Gemini CLI
./scripts/setup-all.sh --tools=gemini-cli
```

**Features:** rules, ignore, mcp, commands, skills

**Output location:** `.gemini/`

**Requirements:** `rulesync` CLI (or `npx rulesync`)

### Auggie (Augment Code)

**Installation Method:** rulesync

```bash
# Sync to Auggie
./scripts/setup-all.sh --tools=auggie
```

**Features:** rules, ignore only (skills/commands not supported)

**Output location:** `.augment/`, `.augmentignore`

**Limitations:** Auggie's rulesync target only supports rules & ignore

**Requirements:** `rulesync` CLI (or `npx rulesync`)

### OpenCode

**Installation Method:** rulesync

```bash
# Sync to OpenCode
./scripts/setup-all.sh --tools=opencode
```

**Features:** rules, mcp, commands, subagents, skills

**Output location:** `opencode.json`, `opencode.md`, `opencode.*`

**Requirements:** `rulesync` CLI (or `npx rulesync`)

## Features

| Feature | Description |
|---------|-------------|
| `rules` | AI coding rules and guidelines |
| `ignore` | Ignore patterns (.gitignore-style) |
| `mcp` | Model Context Protocol configurations |
| `commands` | Slash commands for AI tools |
| `subagents` | Sub-agent definitions |
| `skills` | Agent skill definitions |

## Architecture

```
scripts/
├── setup-all.sh              # Main orchestrator
├── lib/                      # Shared functions
│   ├── validation.sh         # Input validation
│   └── rulesync-wrapper.sh   # Rulesync CLI wrapper
├── tools/                    # Tool-specific modules
│   ├── claude.sh             # Claude Code (direct install)
│   ├── antigravity.sh        # Antigravity
│   ├── gemini-cli.sh         # Gemini CLI
│   ├── auggie.sh             # Auggie
│   └── opencode.sh           # OpenCode
├── README.md                 # This file
└── TOOL_NOTES.md             # Tool-specific reference
```

## Troubleshooting

### "rulesync not found"

```bash
# Install rulesync globally
npm install -g rulesync

# OR use npx (no installation needed)
# The script will automatically fall back to npx
```

### "claude CLI not found" (Claude Code only)

```bash
# Install Claude Code from:
# https://code.claude.com
```

### ".rulesync directory not found"

```bash
# Initialize rulesync
npx rulesync init

# Then run the sync script again
./scripts/setup-all.sh
```

### "Invalid tool: xyz"

```bash
# Check available tools
./scripts/setup-all.sh --help

# Valid tools: claude, antigravity, gemini-cli, auggie, opencode
```

### Permission denied

```bash
# Make scripts executable
chmod +x scripts/setup-all.sh
chmod +x scripts/lib/*.sh
chmod +x scripts/tools/*.sh
```

## CI/CD Integration

```yaml
# Example: GitHub Actions
- name: Setup Node.js
  uses: actions/setup-node@v3
  with:
    node-version: '18'

- name: Install rulesync
  run: npm install -g rulesync

- name: Sync plugins to vibe tools
  run: ./scripts/setup-all.sh --tools=antigravity,gemini-cli,opencode
```

## See Also

- [TOOL_NOTES.md](TOOL_NOTES.md) - Detailed tool-specific notes
- [rulesync Documentation](https://github.com/dyoshikawa/rulesync)
- [Task 0089: Customize rulesync](../docs/prompts/0089_customize_rulesync_to_sync_plugins_to_all_vibe_coding_tools.md)
