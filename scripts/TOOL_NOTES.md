# Tool-Specific Notes

This document contains tool-specific notes and considerations for syncing rd2 plugins to vibe coding tools.

## Google Antigravity

### Overview

Google Antigravity is the CLI for Gemini Code Assist, providing advanced code generation and refactoring capabilities.

### Configuration

- **Target Name**: `antigravity`
- **Supported Features**: rules, commands, skills
- **Config Location**: `.agent/` directory

### Output Structure

```
.agent/
├── ANTIGRAVITY.md          # Main rules file
├── workflows/              # Slash commands converted to workflows
│   ├── rd2_tasks-cli.md
│   ├── rd2_task_run.md
│   └── ...
└── rules/                  # Skills converted to rules
    ├── rd2_tdd_workflow.md
    ├── rd2_coder_gemini.md
    └── ...
```

### Special Considerations

1. **Workflows vs Commands**: Antigravity uses "workflows" instead of "commands"
   - Slash commands are automatically converted to workflows
   - Workflow naming: `{plugin}_{command}.md`

2. **Skills as Rules**: Agent skills are converted to Antigravity rules
   - Skills maintain their context via `_context/` subdirectories
   - Frontmatter `description:` is replaced with `antigravity_discovery:`

3. **Global Mode**: Antigravity supports global mode
   - Global configs: `$HOME/.gemini/antigravity/`
   - Project configs: `.agent/`

### Verification

After sync, verify:

```bash
# Check workflows exist
ls -la .agent/workflows/*.md

# Check rules exist
ls -la .agent/rules/*.md

# Check main rules file
cat .agent/ANTIGRAVITY.md
```

### Troubleshooting

**Issue**: Workflows not appearing in Antigravity

**Solution**:

1. Ensure `.agent/workflows/` directory exists
2. Check file permissions
3. Restart Antigravity CLI

**Issue**: Rules not being applied

**Solution**:

1. Verify `.agent/ANTIGRAVITY.md` exists
2. Check for YAML syntax errors in frontmatter
3. Ensure `antigravity_discovery:` field is present

---

## Gemini CLI

### Overview

Google Gemini CLI is a command-line interface for Google's Gemini AI model, supporting code generation and natural language processing.

### Configuration

- **Target Name**: `geminicli`
- **Supported Features**: rules, ignore, mcp, commands, skills
- **Config Location**: `.gemini/` directory

### Output Structure

```
.gemini/
├── settings.json          # Main settings file
├── rules.md               # AI coding rules
├── ignore.md              # Ignore patterns
├── mcp.json               # MCP server configuration
└── skills/                # Agent skills
    ├── tdd-workflow/
    │   └── SKILL.md
    ├── coder-gemini/
    │   └── SKILL.md
    └── ...
```

### Special Considerations

1. **Settings File**: `settings.json` is the main configuration
   - Contains model settings, API keys, and preferences
   - Auto-generated from rulesync configuration

2. **MCP Integration**: Gemini CLI supports Model Context Protocol
   - MCP servers defined in `.gemini/mcp.json`
   - Enables external tool integration

3. **Ignore Patterns**: Separate ignore file for `.geminiignore`
   - Similar to `.gitignore` but for Gemini CLI
   - Controls which files are sent to the AI

### Verification

After sync, verify:

```bash
# Check settings file
cat .gemini/settings.json

# Check rules
cat .gemini/rules.md

# Check MCP config
cat .gemini/mcp.json

# List skills
find .gemini/skills -name "SKILL.md"
```

### Troubleshooting

**Issue**: Settings not being loaded

**Solution**:

1. Verify `.gemini/settings.json` is valid JSON
2. Check for syntax errors with `jq . < .gemini/settings.json`
3. Restart Gemini CLI

**Issue**: MCP servers not connecting

**Solution**:

1. Verify `.gemini/mcp.json` configuration
2. Check MCP server is running
3. Review MCP server logs

---

## Auggie (Augment Code)

### Overview

Auggie is Augment Code's CLI tool - a context-aware AI coding agent with semantic code understanding and the Augment Context Engine.

### Configuration

- **Target Name**: `augmentcode` (this IS the correct target for Auggie)
- **Supported Features**: rules, ignore ⚠️ **skills/commands/subagents NOT supported**
- **Output Location**: `.augment/` directory

### ⚠️ Important Limitations

**rulesync's `augmentcode` target has limited support:**

| Feature   | Supported  | Notes                                                             |
| --------- | ---------- | ----------------------------------------------------------------- |
| rules     | ✅ Partial | Only non-root rules (`root: false`); root rules are NOT generated |
| ignore    | ✅ Yes     | Generates `.augmentignore`                                        |
| skills    | ❌ No      | Not implemented in rulesync                                       |
| commands  | ❌ No      | Not implemented in rulesync                                       |
| subagents | ❌ No      | Not implemented in rulesync                                       |
| mcp       | ❌ No      | Not implemented in rulesync                                       |

### Output Structure

```
.augment/
├── rules/                 # Non-root AI coding rules (if any)
│   └── *.md
└── .augmentignore         # Ignore patterns
```

**Note**: Most rulesync source files use `root: true`, which augmentcode doesn't support. To generate rules for augmentcode, create rules with `root: false` in `.rulesync/rules/`.

### Special Considerations

1. **Target Name**: Use `augmentcode` in rulesync
   - This is the official target for Auggie/Augment Code
   - NOT `codexcli` (that's OpenAI's Codex CLI - a different tool!)

2. **User-Facing Name**: Users specify `auggie` in CLI arguments
   - Script maps `auggie` → `augmentcode` target internally
   - More intuitive for users

3. **Limited Feature Support**: augmentcode only supports rules & ignore
   - Skills, commands, subagents, and MCP are NOT implemented in rulesync
   - Consider using other targets (antigravity, gemini-cli, opencode) for full plugin sync

4. **Root Rules Not Supported**: Rules with `root: true` are not generated
   - Create non-root rules (`root: false`) in `.rulesync/rules/` for augmentcode
   - Most rulesync default rules use `root: true`, so they won't sync to augmentcode

5. **MCP Server**: Auggie can run as an MCP server (configured separately)
   - Not managed by rulesync
   - Start with: `auggie --mcp`

### Verification

After sync, verify:

```bash
# Check output directory exists
ls -la .augment/

# Check ignore file (always generated)
cat .augmentignore

# List rules (if non-root rules exist)
find .augment/rules -name "*.md" 2>/dev/null || echo "No rules generated"
```

### Troubleshooting

**Issue**: No rules generated, only `.augmentignore`

**Cause**: Most rulesync rules use `root: true`, which augmentcode doesn't support.

**Solution**: Create non-root rules in `.rulesync/rules/`:

```markdown
---
root: false
targets: ["augmentcode"]
description: "My custom rule"
globs: ["src/**/*"]
---

# Rule content here
```

**Issue**: Skills/commands not syncing

**Cause**: augmentcode doesn't support skills/commands/subagents in rulesync.

**Solution**: Use a different target (antigravity, gemini-cli) for full plugin sync, or configure Auggie separately.

**Issue**: Auggie not finding synced content

**Solution**:

1. Re-index the codebase: `auggie reindex`
2. Verify `.augmentignore` exists
3. Check that non-root rules exist in `.augment/rules/`

---

## OpenCode

### Overview

OpenCode is a multi-model code generation CLI that supports multiple AI providers (OpenAI, Anthropic, local models).

### Configuration

- **Target Name**: `opencode`
- **Supported Features**: rules, mcp, commands, subagents, skills
- **Config Location**: Project root (`opencode.json`)

### Output Structure

```
opencode.json                 # Main configuration file
opencode.md                   # AI coding rules
opencode.mcp.json             # MCP server configuration
opencode.subagents/           # Sub-agent definitions
├── super-coder.md
├── super-planner.md
└── ...
opencode.skills/              # Agent skills
├── tdd-workflow/
│   └── SKILL.md
├── coder-opencode/
│   └── SKILL.md
└── ...
```

### Special Considerations

1. **Root-Level Config**: OpenCode uses `opencode.json` in project root
   - Not in a hidden directory like other tools
   - Contains model settings, API keys, preferences

2. **Subagents Support**: OpenCode has native subagent support
   - Subagents defined in `opencode.subagents/`
   - Each subagent is a separate markdown file

3. **Multi-Model**: Supports multiple AI providers
   - OpenAI: GPT-4, GPT-3.5
   - Anthropic: Claude Opus, Claude Sonnet
   - Local: CodeLlama, Mistral

### Verification

After sync, verify:

```bash
# Check main config
cat opencode.json

# Check rules
cat opencode.md

# Check MCP config
cat opencode.mcp.json

# List subagents
ls opencode.subagents/

# List skills
find opencode.skills -name "SKILL.md"
```

### Troubleshooting

**Issue**: OpenCode not loading config

**Solution**:

1. Verify `opencode.json` is in project root
2. Check JSON syntax: `jq . < opencode.json`
3. Restart OpenCode CLI

**Issue**: Subagents not available

**Solution**:

1. Verify `opencode.subagents/` directory exists
2. Check subagent files have proper frontmatter
3. Review OpenCode documentation for subagent format

**Issue**: Skills not being recognized

**Solution**:

1. Ensure `opencode.skills/` directory structure is correct
2. Verify each skill has `SKILL.md` file
3. Check skill frontmatter is valid

---

## Codex MCP Server

### Overview

Codex is an MCP (Model Context Protocol) server that provides AI coding capabilities through the MCP protocol. Unlike other vibe coding tools, Codex operates as an MCP server rather than a traditional CLI with configuration files.

### Configuration

- **Target Name**: N/A (MCP server, not a rulesync target)
- **Supported Features**: MCP tools only
- **Protocol**: Model Context Protocol (MCP)
- **Access**: Via MCP tools (e.g., `mcp__codex__codex`)

### Important Differences

Codex does **NOT** work like other vibe coding tools:

| Feature | Codex | Other Tools |
| ------- | ------- | ------------ |
| Config files | ❌ None | ✅ JSON/MD configs |
| rulesync support | ❌ No | ✅ Yes |
| CLI interface | ❌ No (MCP only) | ✅ Yes |
| MCP protocol | ✅ Native | ⚠️ Varies |

### Available MCP Tools

| Tool | Description |
| ---- | ----------- |
| `mcp__codex__codex` | Run Codex sessions with custom configuration |

### Usage

**Starting Codex MCP server:**

```bash
# Via mcp-server-name
mcp-server-name start codex

# Or use directly via MCP tools
Skill(skill="mcp__codex__codex", args="...")
```

**Example Codex session:**

```python
# Python code execution with Codex
mcp__codex__codex(
    prompt="Implement a binary search tree",
    cwd="/path/to/project",
    sandbox="read-only"
)
```

### Special Considerations

1. **No Configuration Files**: Codex doesn't generate config files
   - No `.codex/` directory
   - No `codex.json` or similar
   - Configuration via MCP protocol only

2. **Not a rulesync Target**: Codex cannot be used with rulesync
   - It's an MCP server, not a CLI tool
   - setup-all.sh marks it as special-cased like Claude

3. **Direct Plugin Access**: Plugins available via MCP tools
   - No sync process needed
   - Direct access through MCP protocol

4. **MCP Server Architecture**:
   - Runs as separate process
   - Exposes tools via MCP protocol
   - Clients connect to use Codex features

### Verification

After "sync" (no-op for Codex), verify:

```bash
# Check MCP server is available
mcp-server-name list | grep codex

# Test Codex MCP tool
# (Depends on your MCP client setup)
```

### Troubleshooting

**Issue**: Codex not available in MCP tools list

**Solution**:

1. Verify MCP server is running: `mcp-server-name list`
2. Check Codex is installed/configured properly
3. Restart MCP server if needed

**Issue**: Can't find generated configs

**Cause**: Codex doesn't generate config files (this is expected)

**Solution**: Codex works via MCP protocol only, no config files needed

---

## Common Issues Across All Tools

### File Permissions

**Issue**: Generated files not readable by tools

**Solution**:

```bash
# Fix permissions
chmod -R 755 .agent/
chmod -R 755 .gemini/
chmod -R 755 .augment/
chmod 644 opencode.json
```

### Path Issues

**Issue**: Tools cannot find generated files

**Solution**:

1. Ensure you're in the project root directory
2. Verify paths are relative to project root
3. Use absolute paths if needed

### Sync Failures

**Issue**: rulesync fails to generate files

**Solution**:

1. Check `.rulesync/` directory exists
2. Verify source files exist in `.rulesync/rules/`, `.rulesync/commands/`, etc.
3. Run with `--verbose` for detailed output
4. Check rulesync version: `rulesync --version`

### Conflicting Configurations

**Issue**: Manual edits overwritten by sync

**Solution**:

1. Edit source files in `.rulesync/` directory
2. Re-run sync to propagate changes
3. Use version control to track manual changes

---

## Best Practices

1. **Version Control**: Commit generated configs to git

   ```bash
   git add .agent/ .gemini/ .augment/ opencode.json
   git commit -m "Sync cc-agents plugins to vibe tools"
   ```

2. **Regular Syncs**: Sync after plugin changes

   ```bash
   # Add to post-commit hook
   ./scripts/setup-all.sh
   ```

3. **Dry Run First**: Preview changes before applying

   ```bash
   ./scripts/setup-all.sh --dry-run
   ```

4. **Tool-Specific Testing**: Test each tool after sync
   - Antigravity: Run `agy chat` and test workflows
   - Gemini CLI: Run `gemini generate` and test skills
   - Auggie: Run `auggie query` and test semantic search
   - OpenCode: Run `opencode generate` and test subagents

5. **Documentation**: Keep tool-specific notes updated
   - Document any custom configurations
   - Note any tool-specific quirks or issues
   - Share knowledge with team

---

## Additional Resources

- [rulesync Documentation](https://github.com/dyoshikawa/rulesync)
- [Antigravity Documentation](https://antigravity.google)
- [Gemini CLI Documentation](https://github.com/google-gemini/gemini-cli)
- [Auggie Documentation](https://augmentcode.dev)
- [OpenCode Documentation](https://opencode.dev)
- [RD2 Plugin Documentation](../plugins/rd2/README.md)
