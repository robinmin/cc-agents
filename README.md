# cc-agents

A universal agent skills framework for multiple AI coding platforms. Author, validate, and distribute reusable skills and main-agent configs.

**Status**: Active development. Only **rd3** and **wt** plugins are maintained. **rd** and **rd2** are deprecated.

## Supported Platforms

| Platform | Installation | Skill Location |
|----------|-------------|---------------|
| **Claude Code** | User-level plugin | `~/.claude/plugins/` |
| **Codex** | Global shared pool | `~/.agents/skills/` |
| **Gemini CLI** | Global shared pool | `~/.agents/skills/` |
| **Antigravity** | Native global | `~/.gemini/antigravity/skills/` |
| **OpenCode** | Global shared pool | `~/.agents/skills/` |
| **OpenClaw** | Global shared pool | `~/.agents/skills/` |
| **Pi** | Global shared pool | `~/.agents/skills/` |

## Active Plugins

### rd3 — Rapid Development Framework

Meta-agent skills for creating, evaluating, refining, and evolving agent assets.

**10 subagents:**

| Subagent | Purpose |
|----------|---------|
| `jon-snow` | Pipeline orchestration, phase routing, dry-run/plan |
| `super-brain` | Structured ideation, brainstorming, multi-source research |
| `super-coder` | Feature implementation, bug fixes, refactoring |
| `super-reviewer` | Code review, PR review, Phase 7 review |
| `super-tester` | Test execution, coverage, TDD workflow, Phase 6 |
| `expert-agent` | Subagent creation/adaptation |
| `expert-command` | Slash command creation/adaptation |
| `expert-skill` | Skill creation/evaluation/refinement |
| `expert-magent` | Main agent config (AGENTS.md) management |
| `knowledge-seeker` | Systematic literature review, fact-checking |

**36 skills:**

| Category | Skills |
|----------|--------|
| **Core** | `cc-skills`, `cc-commands`, `cc-agents`, `cc-magents` |
| **Orchestration** | `orchestration-v1`, `orchestration-v2`, `verification-chain`, `run-acp` |
| **Planning** | `task-decomposition`, `request-intake`, `brainstorm`, `feature-tree` |
| **Dev Lifecycle** | `sys-developing`, `sys-debugging`, `sys-testing`, `tdd-workflow`, `bdd-workflow` |
| **Code Quality** | `code-review-common`, `code-implement-common`, `anti-hallucination`, `functional-review` |
| **Architecture** | `frontend-architect`, `backend-architect`, `frontend-design`, `backend-design` |
| **Planning Langs** | `pl-typescript`, `pl-python`, `pl-golang`, `pl-javascript` |
| **Content** | `code-docs`, `quick-grep`, `reverse-engineering`, `token-saver`, `cli-for-ai` |

**32 slash commands:**

- `dev-*`: init, plan, run, review, unit, verify, docs, fixall, reverse, changelog, gitmsg
- `skill-*`: add, evaluate, refine, evolve, migrate, package
- `command-*`: scaffold, evaluate, refine, evolve, adapt, add
- `agent-*`: scaffold, evaluate, refine, evolve, adapt, add
- `magent-*`: add, evaluate, refine, evolve, adapt

**Test suite**: 318 test files, full coverage gate on `bun run check`.

### wt — Workplace Tools

Content generation, publishing, and translation utilities.

**4 subagents:**

| Subagent | Purpose |
|----------|---------|
| `tc-writer` | Multi-stage technical content workflow (research → writing → illustration → publishing) |
| `super-researcher` | Systematic literature review, meta-analysis, evidence synthesis |
| `super-publisher` | Multi-platform publishing, platform selection |
| `magent-browser` | Browser automation, document conversion, web scraping |
| `image-generator` | AI image generation with multi-backend fallback |

**16 skills:**

| Category | Skills |
|----------|--------|
| **Publishing** | `technical-content-creation`, `topic-create`, `topic-draft`, `topic-outline`, `topic-init`, `topic-adapt`, `topic-publish`, `topic-illustrate` |
| **Platforms** | `publish-to-medium`, `publish-to-substack`, `publish-to-infoq`, `publish-to-juejin`, `publish-to-qiita`, `publish-to-zenn`, `publish-to-xhs`, `publish-to-x`, `publish-to-wechatmp` |
| **Image** | `image-generate`, `image-cover`, `image-illustrator`, `lead-research-assistant` |
| **Browser** | `markitdown-browser` |
| **Utility** | `style-extractor`, `translate`, `info-seek`, `info-reve`, `info-research` |

## Installation

### Quick Start

```bash
# Install rd3 + wt to all platforms
./scripts/setup-all.sh

# Dry run
./scripts/setup-all.sh --dry-run

# Specific platforms
./scripts/setup-all.sh --targets=claude-code,codex,gemini-cli
```

### Per-Platform

```bash
# Claude Code (marketplace plugin)
./scripts/setup-all.sh --targets=claude-code

# Codex
./scripts/install-skills.sh rd3 codexcli

# Gemini CLI
./scripts/install-skills.sh rd3 geminicli

# OpenCode
./scripts/install-skills.sh rd3 opencode

# OpenClaw
./scripts/install-skills.sh rd3 openclaw --features=skills,commands
```

### Selective Install

```bash
# Install only skills + commands (skip magents/subagents)
./scripts/setup-all.sh --skip-magents --skip-subagents

# rd3 only
./scripts/setup-all.sh --plugins=rd3
```

## Usage

### Claude Code

```bash
claude plugin list

# rd3 meta-agents
/rd3:skill-evaluate <skill-dir>
/rd3:skill-refine <skill-dir>
/rd3:command-scaffold <name>
/rd3:agent-adapt <agent-file> claude codex
/rd3:magent-evaluate <file>

# wt content
/wt:topic-create "Building REST APIs with FastAPI"
/wt:image-generate "A landscape" --backend nano_banana
/wt:publish-to-medium <article>
```

### Other Platforms

Slash commands become skill-style wrappers after install. Usage patterns match the platform conventions.

## Project Structure

```
cc-agents/
├── plugins/
│   ├── rd3/                    # Rapid Development (meta-agents + 36 skills + 32 commands)
│   │   ├── agents/              # 10 subagent definitions
│   │   ├── skills/             # Skill packages (SKILL.md + scripts + tests)
│   │   ├── commands/           # Slash command wrappers
│   │   ├── hooks/             # Claude Code hooks
│   │   └── tests/             # Integration tests
│   └── wt/                     # Workplace Tools (4 agents + 16 skills + 15 commands)
│       ├── agents/             # Subagent definitions
│       ├── skills/            # Skill packages
│       ├── commands/          # Slash command wrappers
│       └── scripts/          # Shared utilities
├── scripts/                    # Platform sync automation
│   ├── setup-all.sh          # Main installer
│   ├── install-skills.sh     # Per-platform skill installer
│   ├── command/              # Targeted installers (magents, skills, subagents, commands)
│   └── lib/                  # Shared shell functions
└── docs/                     # Architecture docs, task specs
```

## Development

```bash
# Pre-commit gate (lint + typecheck + test)
bun run check

# Format
bun run format

# Lint fix
bun run lint:fix

# Typecheck
bun run typecheck

# Test with coverage
bun run test:coverage

# rd3 plugin tests only
bun run test:rd3
```

## Tech Stack

- **Runtime**: Bun.js
- **Language**: TypeScript
- **Code Quality**: Biome (lint + format)
- **Testing**: bun:test with V8 function coverage
- **Sync**: rulesync for cross-platform adaptation

## External Dependencies

| Service | Purpose |
|---------|---------|
| **HuggingFace MCP** | Model/dataset/paper search, Z-Image Turbo |
| **Brave Search MCP** | Web search |
| **Ref MCP** | Documentation search, URL fetch |
| **W&B MCP** | ML experiment tracking, Weave traces |
| **HuggingFace API** | Stable Diffusion XL image generation |
| **Google Gemini API** | Imagen image generation |
| **MarkItDown** | Web-to-markdown conversion |
| **Playwright MCP** | Browser automation |

API keys required (`HUGGINGFACE_API_TOKEN`, `GEMINI_API_KEY`, `GITHUB_TOKEN`, `WANDB_API_KEY`, `BRAVE_API_KEY`) — set in environment or platform config.

## See Also

- [plugins/rd3/README.md](plugins/rd3/README.md) — rd3 meta-agent guide
- [plugins/wt/README.md](plugins/wt/README.md) — wt configuration guide
- [scripts/README.md](scripts/README.md) — Sync scripts documentation
- [scripts/TOOL_NOTES.md](scripts/TOOL_NOTES.md) — Platform-specific notes
