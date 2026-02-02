# cc-agents (Vibe Coding Tools Agents)

A collection of high-quality agents, skills, and workflows for multiple AI coding platforms.

## Supported Platforms

This repository provides a unified development automation toolkit that supports:

| Tool | Description | Installation Scope |
|------|-------------|-------------------|
| **Claude Code** | Anthropic's official terminal-based AI coding assistant | User-level (`~/.claude/plugins/`) |
| **Google Antigravity** | Google Gemini Code Assist CLI | Project-level (`.agent/`) or Global (`~/.gemini/antigravity/`) |
| **Gemini CLI** | Google Gemini CLI | Project-level (`.gemini/`) |
| **Auggie** | Augment Code (semantic understanding via MCP) | Project-level (`.augment/`) |
| **OpenCode** | Multi-model code generation CLI | Project-level (`opencode.json`) |

### Installation Locations

| Tool | Location | Scope | Notes |
|------|----------|-------|-------|
| **Claude Code** | `~/.claude/plugins/marketplaces/cc-agents/` | User-level | Marketplace-based plugins, shared across all projects |
| **Antigravity** | `.agent/` | Project-level | Per-project workflows and rules |
| **Antigravity** | `~/.gemini/antigravity/` | Global | Available in all projects (use `--global` flag) |
| **Gemini CLI** | `.gemini/` | Project-level | Settings, commands, skills per project |
| **Auggie** | `.augment/`, `.augmentignore` | Project-level | Rules and ignore patterns per project |
| **OpenCode** | `opencode.json`, `opencode.*` | Project-level | Config in project root |

## What's Included

### rd2 (Rapid Development)

Production-ready automation for systematic test-driven development (TDD) and workflow management.

- **10-Stage TDD Workflow**: A disciplined approach to building high-quality functions in any language
- **Task Management**: External task tracking with WBS numbers and kanban board sync
- **Skill Management**: Tools for creating, evaluating, and refining AI agent skills
- **Code Review**: Automated code review with multiple tool support

### wt (Workplace Tools)

Content generation and translation utilities.

- **Style Extractor/Applier**: Maintain consistent writing styles across projects
- **Professional Translation**: High-quality multi-lingual translation (EN, ZH, JA)
- **Document Conversion**: Browser automation and markdown conversion

---

## External Dependencies

### Overview

The `cc-agents` plugins integrate with various external services and tools through MCP (Model Context Protocol) servers, CLI tools, and APIs. Below is a comprehensive list of all external dependencies.

### MCP (Model Context Protocol) Servers

| MCP Server | Package | Purpose |
|------------|---------|---------|
| **HuggingFace** | `@modelcontextprotocol/server-huggingface` | AI/ML model search, dataset search, paper search, image generation (Z-Image Turbo), documentation |
| **Brave Search** | `@modelcontextprotocol/server-brave` | Web search and local business search |
| **GitHub** | `@modelcontextprotocol/server-github` | GitHub code search (`mcp__grep__searchGitHub`) |
| **Auggie** | `@modelcontextprotocol/server-auggie` | Semantic codebase search and understanding |
| **Ref** | `@modelcontextprotocol/server-ref` | Documentation search and URL content fetching |
| **Stitch** | `@modelcontextprotocol/server-stitch` | AI-powered UI generation from text prompts |
| **W&B (Weights & Biases)** | `@modelcontextprotocol/server-wandb` | ML experiment tracking, Weave traces, reports |
| **4.5V** | `@modelcontextprotocol/server-4.5v` | Image analysis with advanced vision models |
| **Web Reader** | `@modelcontextprotocol/server-web-reader` | Web content fetching and markdown conversion |

### AI/ML APIs

| Service | Purpose | Authentication |
|---------|---------|----------------|
| **HuggingFace API** | Model inference, Stable Diffusion XL | API Token |
| **Google Gemini API** | Imagen image generation (3.0, 4.0) | API Key |
| **Anthropic Claude API** | Claude model access | API Key |
| **OpenAI API** | GPT model access (code review) | API Key |

### Development Tools

#### Version Control & Hosting
- **Git** - Version control system
- **GitHub CLI (gh)** - GitHub command line interface
- **GitHub/GitLab/Bitbucket** - Code hosting platforms

#### JavaScript/TypeScript
- **Node.js** - JavaScript runtime
- **TypeScript** - Type-safe JavaScript
- **npm/pnpm/yarn** - Package managers
- **Webpack** - Module bundler
- **ESLint** - Linting
- **Prettier** - Code formatting
- **Jest** - Testing framework
- **Babel** - JavaScript transpiler

#### Python
- **Python 3.8+** - Runtime
- **uv** - Fast Python package manager
- **jsoncomment** - JSON with Comments parsing
- **requests** - HTTP library
- **Pillow** - Image processing
- **google-genai** - Google Generative AI SDK

#### Other Languages
- **Go** - Programming language
- **Rust** - Systems programming language
- **Cargo** - Rust package manager
- **Maven/Gradle** - Java build tools
- **Composer** - PHP package manager
- **Bundle/Gem** - Ruby package managers

### Browser Automation & Web Scraping

| Tool | Purpose |
|------|---------|
| **MarkItDown** | Microsoft's web-to-markdown converter |
| **browser-use** | Browser automation framework |
| **Playwright** | Browser automation and testing |
| **Puppeteer** | Headless Chrome control |
| **Selenium** | Web browser automation |
| **ChromeDriver** | Chrome WebDriver for Selenium |
| **Cypress** | End-to-end testing framework |

### Cloud & Deployment Platforms

| Platform | Purpose |
|----------|---------|
| **Cloudflare** | CDN, Workers, and edge computing |
| **Vercel** | Frontend deployment |
| **Netlify** - Static site hosting |
| **Dokploy** | API-driven deployment platform |
| **AWS/Azure/GCP** | Cloud services |

### Monitoring & Analytics

| Service | Purpose |
|---------|---------|
| **Weights & Biases (W&B)** | ML experiment tracking, Weave traces |
| **Auggie** | Codebase semantic search |

### Database & Storage

- **PostgreSQL** - Relational database (via MCP)

### MCP Development Tools

- **MCP Inspector** - `@modelcontextprotocol/inspector` - MCP server debugging

### Authentication Setup

The following API keys/tokens are required for full functionality:

```bash
# HuggingFace (for models, datasets, papers)
export HUGGINGFACE_API_TOKEN="your_token_here"

# Google Gemini (for Imagen image generation)
export GEMINI_API_KEY="your_key_here"

# GitHub (for code search)
export GITHUB_TOKEN="your_token_here"

# Weights & Biases (for ML tracking)
export WANDB_API_KEY="your_key_here"

# Brave Search (for web search)
export BRAVE_API_KEY="your_key_here"
```

### Optional Dependencies

Some features have optional dependencies:

| Feature | Optional Tool |
|---------|--------------|
| Fast diagram generation | [Diagrams](https://diagrams.mingrammer.com/) |
| Advanced AST search | [ast-grep](https://ast-grep.github.io/) |
| Agent browser automation | `rd:agent-browser` skill |

---

## Installation

### Quick Start

The `scripts/setup-all.sh` script syncs rd2 and wt plugins to all installed vibe coding tools:

```bash
# Clone this repository
git clone https://github.com/robinmin/cc-agents.git
cd cc-agents

# Sync to all tools
./scripts/setup-all.sh

# Or sync specific tools only
./scripts/setup-all.sh --tools=claude,antigravity,gemini-cli
```

### Installation by Platform

#### Claude Code (Direct Plugin Install)

```bash
# Sync Claude Code plugins
./scripts/setup-all.sh --tools=claude

# This installs:
#   - wt@cc-agents (Web browsing, document conversion)
#   - rd2@cc-agents (RD2 workflow management)
```

**Location:** `~/.claude/plugins/`

**Verify installation:**
```bash
claude plugin list
```

#### Google Antigravity

```bash
# Sync to Antigravity
./scripts/setup-all.sh --tools=antigravity

# Features: rules, commands, skills
# Location: .agent/
```

**Verify:**
```bash
# Check workflows
ls -la .agent/workflows/*.md

# Check rules
ls -la .agent/rules/*.md
```

#### Gemini CLI

```bash
# Sync to Gemini CLI
./scripts/setup-all.sh --tools=gemini-cli

# Features: rules, ignore, mcp, commands, skills
# Location: .gemini/
```

**Verify:**
```bash
# Check settings
cat .gemini/settings.json

# List commands
ls -la .gemini/commands/*.md
```

#### Auggie (Augment Code)

```bash
# Sync to Auggie
./scripts/setup-all.sh --tools=auggie

# Features: rules, ignore only (skills/commands not supported)
# Location: .augment/, .augmentignore
```

**Note:** Auggie's rulesync target has limited support (rules & ignore only).

#### OpenCode

```bash
# Sync to OpenCode
./scripts/setup-all.sh --tools=opencode

# Features: rules, mcp, commands, subagents, skills
# Location: opencode.json, opencode.*
```

**Verify:**
```bash
# Check config
cat opencode.json

# List commands
ls -la .opencode/command/*.md
```

---

## Usage Examples

### Claude Code

```bash
# View available commands
claude plugin list

# Use rd2 commands
/rd2:tasks-cli                    # Task management
/rd2:task-gitmsg                  # Generate commit messages
/rd2:task-changelog              # Generate changelogs
```

### Antigravity / Gemini CLI

```bash
# Use workflows directly
/rd2:tasks-cli
/rd2:task-gitmsg
/rd2:task-changelog
```

---

## Project Structure

```
cc-agents/
├── plugins/                     # Core plugin logic
│   ├── rd2/                    # Rapid Development plugin
│   └── wt/                     # Workplace Tools plugin
├── scripts/                     # Sync automation
│   ├── setup-all.sh            # Main orchestrator
│   ├── lib/                    # Shared functions
│   ├── tools/                  # Tool-specific modules
│   ├── README.md               # Scripts documentation
│   └── TOOL_NOTES.md           # Tool-specific reference
├── .rulesync/                   # Source files for rulesync
│   ├── commands/               # Slash commands
│   ├── skills/                 # Agent skills
│   ├── subagents/              # Subagent definitions
│   └── rules/                  # AI coding rules
├── .agent/                      # (Generated) Antigravity output
├── .gemini/                     # (Generated) Gemini CLI output
├── .augment/                    # (Generated) Auggie output
└── opencode.json                # (Generated) OpenCode output
```

---

## Advanced Usage

### Dry Run (Preview Changes)

```bash
# Preview what would be synced
./scripts/setup-all.sh --dry-run

# Preview specific tools
./scripts/setup-all.sh --tools=claude,antigravity --dry-run
```

### Sync Specific Features

```bash
# Sync only rules and commands
./scripts/setup-all.sh --features=rules,commands

# Sync only MCP and skills
./scripts/setup-all.sh --features=mcp,skills
```

### Verbose Output

```bash
# Enable detailed output for debugging
./scripts/setup-all.sh --verbose
```

---

## Command Reference

### Available Commands

| Command | Description |
|---------|-------------|
| `/rd2:tasks-cli` | Task management CLI with WBS numbers |
| `/rd2:task-gitmsg` | Generate conventional commit messages |
| `/rd2:task-changelog` | Generate changelogs from git history |
| `/rd2:tasks-plan` | Full workflow orchestration with planning |
| `/rd2:tasks-run` | Implement single task |
| `/rd2:tasks-review` | Code review for single task |

For a complete list of commands, see [plugins/rd2/commands/](plugins/rd2/commands/).

---

## Troubleshooting

### "rulesync not found"

```bash
# Install rulesync
npm install -g rulesync

# Or use npx (no installation needed)
./scripts/setup-all.sh  # Will auto-fallback to npx
```

### "claude CLI not found"

```bash
# Install Claude Code from:
# https://code.claude.com
```

### ".rulesync directory not found"

```bash
# Initialize rulesync
npx rulesync init

# Then run sync again
./scripts/setup-all.sh
```

For more troubleshooting, see [scripts/README.md](scripts/README.md).

---

## Contributing

Contributions are welcome! The workflow:

1. Add new commands/skills to `plugins/rd2/` or `plugins/wt/`
2. Update `.rulesync/` source files if needed
3. Run `./scripts/setup-all.sh` to sync to all tools
4. Test on your target platforms

For detailed documentation, see:
- [scripts/README.md](scripts/README.md) - Sync scripts documentation
- [scripts/TOOL_NOTES.md](scripts/TOOL_NOTES.md) - Tool-specific notes
- [Task 0089](docs/prompts/0089_customize_rulesync_to_sync_plugins_to_all_vibe_coding_tools.md) - Implementation details

---

## References

- [rulesync Documentation](https://github.com/dyoshikawa/rulesync)
- [Claude Code Plugins](https://code.claude.com)
- [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official)
