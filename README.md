# cc-agents

A collection of plugins, skills, and tools for Claude Code to enhance your development workflow.

## What's Included

### Plugins
- **my-first-plugin**: Example plugin demonstrating Claude Code plugin capabilities
- **rd (Rapid Development)**: 10-stage TDD workflow automation with 4 commands

### Skills
- **10-stages-developing**: Systematic test-driven development workflow for building high-quality functions
  - Multi-language support (Python, JavaScript, TypeScript, Java, Go, Rust)
  - Soft contract build tool approach
  - Integration testing capabilities
  - Modern tooling defaults (uv, ruff, pytest, pnpm, Jest, cargo, etc.)

## Usage

### Quick Start

Use the following commands to enable the tools in your Claude Code:

```bash
# Step 1: Add this repository to your marketplace list
/plugin marketplace add robinmin/cc-agents

# Step 2: Verify the marketplace was added
/plugin marketplace list

# Step 3: Install a plugin from the marketplace
/plugin install my-first-plugin@cc-agents/

# Step 4: Trigger the plugin's command
/my-first-plugin:hello

# Then you will see the output like this:
```

> ⏺ Hello! 👋
>
> Great to meet you! I'm Claude Code, ready to help you with your software engineering needs.
>
> What can I help you build, debug, or improve today? Whether it's:
>
> - Writing new features
> - Debugging tricky issues
> - Refactoring code
> - Setting up projects
> - Reviewing architecture
> - Or anything else development-related
>
> I'm here to assist! What would you like to work on?

```bash
# If you don't need the plugin anymore, uninstall it
/plugin uninstall my-first-plugin@cc-agents/
```

### Plugin Management

Common plugin management operations:

```bash
# List all installed plugins
/plugin list

# Update a specific plugin to get latest changes
/plugin update my-first-plugin@cc-agents/

# Update all plugins from a marketplace
/plugin update-all cc-agents/

# View plugin details and available commands
/plugin info my-first-plugin@cc-agents/

# Reinstall a plugin (useful for troubleshooting)
/plugin uninstall my-first-plugin@cc-agents/
/plugin install my-first-plugin@cc-agents/
```

### Example: Using the 10-Stage Development Workflow

This repository includes a comprehensive TDD workflow skill with plugin integration:

```bash
# Install the "rd" (Rapid Development) plugin
/plugin install rd@cc-agents/

# Check if your project is ready for the workflow
/check-10-dev

# Initialize build configuration for your project
/init-10-dev

# Apply 10-stage workflow to implement a function
/apply-10-dev validate_email

# Create integration tests for related functions
/integrate-10-dev get_user_info set_user_info
```

See `skills/10-stages-developing/` for complete documentation.

## Available Commands

### rd (Rapid Development) Plugin

| Command | Description |
|---------|-------------|
| `/check-10-dev` | Verify project preconditions for 10-stage workflow |
| `/apply-10-dev <function-name>` | Execute complete 10-stage workflow for a function |
| `/init-10-dev` | Initialize build tool configuration for your project |
| `/integrate-10-dev <func1> <func2>...` | Create integration tests for related functions |

### my-first-plugin

| Command | Description |
|---------|-------------|
| `/my-first-plugin:hello` | Display a personalized greeting message |

## Reference

## See also

- [Plugins](https://docs.claude.com/en/docs/claude-code/plugins)
- [Plugin marketplaces](https://docs.claude.com/en/docs/claude-code/plugin-marketplaces)
- [Slash commands](https://docs.claude.com/en/docs/claude-code/slash-commands)
- [Sub-agents](https://docs.claude.com/en/docs/claude-code/sub-agents)
- [Agent Skills](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview)
- [Hooks Guide](https://docs.claude.com/en/docs/claude-code/hooks-guide)
- [MCP](https://docs.claude.com/en/docs/claude-code/mcp)
- [Settings](https://docs.claude.com/en/docs/claude-code/settings)
- [davila7/claude-code-templates](https://github.com/davila7/claude-code-templates)
- [wshobson/agents](https://github.com/wshobson/agents)
- [不仅仅是代码助手：用 Plugins 将 Claude Code 打造成你的专属研发终端(1/4)](https://surfing.salty.vip/articles/cn/claude_code_plugins_01/)
- [不仅仅是代码助手：用 Plugins 将 Claude Code 打造成你的专属研发终端(2/4)](https://surfing.salty.vip/articles/cn/claude_code_plugins_02/)
