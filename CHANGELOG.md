# CHANGELOG

## [1.4.1] - 2026-01-12

### Summary

**Plugin Hooks Architecture & Browser Automation Agent**

This release introduces proper plugin-scoped hooks configuration, browser automation capabilities, and the `/tasks` slash command for task management from Claude's input field.

### Added

- **Browser Automation Agent (`plugins/rd/agnts/agent-browser.md`)**:
  - Ref-based browser automation expert using snapshot-first workflow
  - 66 competency items across 12 categories (navigation, snapshots, clicks, text input, screenshots, waits, semantic locators, sessions, debugging, workflows, pitfalls)
  - Core workflow: `open` → `snapshot -i` → interact with `@refs` → re-snapshot
  - 12 DO rules and 12 DON'T rules for reliable automation
  - Scored 92/100 on quality validation

- **Plugin Hooks Configuration (`plugins/rd/hooks/hooks.json`)**:
  - Moved plugin-specific hooks from global `~/.claude/settings.json` to plugin context
  - Proper wrapper format with `description` and `hooks` fields
  - Hook events: `SessionStart`, `PreToolUse`, `Stop`, `SessionEnd`, `Notification`
  - Uses `${CLAUDE_PLUGIN_ROOT}` which is only available in plugin context

- **New Scripts (`plugins/rd/scripts/`)**:
  - **`session-end.sh`**: SessionEnd cleanup with session logging, duration calculation, temp file cleanup, and state preservation to `.claude/last-session.json`
  - **`notification.sh`**: Notification handler with logging to `.claude/logs/notifications.log`, optional macOS notifications, and optional webhook integration

- **New Slash Command (`plugins/rd/commands/tasks.md`)**:
  - `/rd:tasks` command for task management from Claude input field
  - Wraps `tasks.sh` with all subcommands: `init`, `create`, `list`, `update`, `open`, `refresh`, `help`
  - Added `allowed-tools: Bash` for proper tool permissions

### Changed

- **Global Settings (`~/.claude/settings.json`)**:
  - Removed plugin-specific hooks (SessionStart, PreToolUse, Stop) that incorrectly used `${CLAUDE_PLUGIN_ROOT}`
  - Retained PostToolUse formatters (biome, ruff, rustfmt, etc.) which use `$CLAUDE_FILE_PATH` and work in global context

### Fixed

- **PreToolUse:Bash hook error**: Fixed by moving hooks from global settings to plugin's `hooks/hooks.json` where `${CLAUDE_PLUGIN_ROOT}` is properly set by Claude Code

### References

- [Claude Code Hooks Documentation](https://docs.anthropic.com/en/docs/claude-code/hooks)
- [Claude Code Plugin Discovery](https://code.claude.com/docs/en/discover-plugins)

## [1.4.0] - 2026-01-12

### Summary

**Expert-Based Subagent Architecture & Quality Assurance Skills**

Major release introducing a comprehensive expert-based subagent system for specialized task handling, along with new skills focused on code quality, debugging methodology, and hallucination prevention. This update establishes a robust multi-agent orchestration framework.

### Added

- **Expert-Based Subagents (`plugins/rd/agnts/`)**:
  - **`agent-doctor`**: Quality specialist for evaluating expert agents against 8-section anatomy framework, with scoring and improvement recommendations
  - **`agent-expert`**: General-purpose expert agent for complex development tasks
  - **`task-decomposition-expert`**: Workflow architect for task breakdown, dependency mapping, and multi-agent orchestration
  - **`python-expert`**: Python development specialist with verification protocols
  - **`typescript-expert`**: TypeScript/JavaScript specialist with framework-specific competencies
  - **`mcp-expert`**: Model Context Protocol specialist for MCP server development and integration

- **New Skills**:
  - **`anti-hallucination`**: Systematic protocol to prevent hallucination when working with APIs, libraries, and external services. Enforces "verify before generating" principle
  - **`code-patterns`**: Curated collection of production-ready patterns for API design, testing, Docker, and database work
    - `api-patterns.md`: REST, GraphQL, error handling, pagination
    - `testing-patterns.md`: Unit, integration, E2E, mocking strategies
    - `docker-patterns.md`: Multi-stage builds, security, compose
    - `database-patterns.md`: Migrations, queries, indexing, ORM patterns
  - **`sys-debugging`**: Four-phase debugging methodology emphasizing root cause analysis before fixes

- **New Scripts (`plugins/rd/scripts/`)**:
  - **`install.sh`**: Comprehensive plugin installation script
  - **`session-init.sh`**: Session initialization for agent context setup
  - **`validate-bash.sh`**: Bash command validation for security
  - **`validate-write.sh`**: Write operation validation

### Changed

- **Plugin Configuration**: Updated `plugins/rd/plugin.json` to v1.4.0 with refined agent directory structure (`./agnts`)
- **Slash Commands**:
  - Enhanced `task-fixall.md` with improved error detection and fixing workflows
  - Enhanced `task-run.md` with better task execution patterns

### References

- [Claude Code Subagents](https://code.claude.com/docs/en/sub-agents)
- [Expert-Based Agent Architecture](docs/prompts/0004_expert_based_agent_architecture.md)

## [1.3.2] - 2026-01-09

### Summary

**Google Antigravity Support & Migration Tooling**

Official support for Google Antigravity / Gemini Code Assist workflows and rules. This update introduces a sophisticated migration engine to keep Claude Code plugins and Antigravity workflows in perfect sync, alongside a major repository-wide documentation overhaul.

### Added

- **Antigravity Migration Engine (`antigravity-install.sh`)**:
    - **Dual Platform Sync**: Automatically converts Claude Code Slash Commands to Antigravity Workflows (`.agent/workflows`) and Agent Skills to Antigravity Rules (`.agent/rules`).
    - **Global & Local Installation**: Added `--global` flag support to install tools to `~/.gemini/antigravity/` for cross-project availability.
    - **Context Awareness**: Preserves skill context (docs, templates) during migration by intelligently mapping directory structures.
    - **Manager Agent Rule**: Auto-generates a master orchestration rule for Antigravity discovered capabilities.

### Changed

- **Unified Repository Branding & Documentation**:
    - **README Overhaul**: Completely rewritten to officially support both Claude Code and Google Antigravity.
    - **Installation Modernization**: Updated Claude Code plugin installation guides to reflect latest `/plugin` command syntax.
    - **Antigravity Quick Start**: Added comprehensive guides for both global and local Antigravity setups.

## [1.3.0] - 2026-01-08

### Summary

**Claude Code 2026 Plugin Modernization & Prompt Engineering Optimization**

Major update aligning the project with Claude Code 2026 plugin specifications and applying industry best practices for prompt engineering. All slash commands refined for conciseness and effectiveness.

### Added

- **Agent `super-reve`**: Enhanced with triggering examples, severity definitions, edge case handling
  - Added required `color: cyan` field
  - Added 3 `<example>` blocks for proper agent triggering
  - Added explicit severity criteria table (🔴 High, 🟡 Medium, 🟢 Low)
  - Added edge case handling section

- **Frontmatter `argument-hint`**: Added to all slash commands lacking it
  - `10-dev-apply.md`: `<function-spec>`
  - `10-dev-check.md`: `[project-path]`
  - `10-dev-init.md`: `[language]`
  - `10-dev-integrate.md`: `<function1> <function2> [function3...]`
  - `dokploy-new.md`: `<service-name> [--env test|prod]`
  - `dokploy-refine.md`: `[service-name] [--migrate]`
  - `translate.md`: `<file_path> <target_language>`

### Changed

- **Project Structure Cleanup**
  - Removed deprecated `plugins/hello/` sample plugin
  - Renamed `plugins/rd/scripts/prompts.sh` → `plugins/rd/scripts/tasks.sh` (aligns with `tasks` alias)

- **Plugin Configuration (2026 Format)**
  - `plugins/rd/plugin.json`: Updated to v1.2.0 with auto-discovery paths (`commands`, `skills`, `agents`)
  - `plugins/wt/plugin.json`: Updated to v1.1.0 with auto-discovery paths
  - `.claude-plugin/marketplace.json`: Simplified structure, removed `hello` plugin

- **Slash Commands - Prompt Engineering Optimization**
  All 7 key commands refined following "concise is key" principle:

  | Command | Before | After | Reduction |
  |---------|--------|-------|-----------|
  | `task-run.md` | 908 lines | 157 lines | 83% |
  | `task-fixall.md` | 225 lines | 147 lines | 35% |
  | `task-spec.md` | 429 lines | 232 lines | 46% |
  | `agent-meta.md` | 471 lines | 223 lines | 53% |
  | `skill-add.md` | 208 lines | 89 lines | 57% |
  | `skill-evaluate.md` | 801 lines | 152 lines | 81% |
  | `skill-refine.md` | 416 lines | 144 lines | 65% |

  Key improvements across all commands:
  - Quick Start sections at top
  - Tables over prose for scannability
  - Consistent structure (Arguments, Workflow, Output, See Also)
  - Removed redundant examples and explanations
  - Progressive disclosure pattern

### References

- [Claude Code Plugin Discovery](https://code.claude.com/docs/en/discover-plugins)
- [Claude Code Subagents](https://code.claude.com/docs/en/sub-agents)
- [Claude Code Agent Skills](https://code.claude.com/docs/en/skills)
- [Anthropic: Equipping Agents with Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [Skill Authoring Best Practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

## [1.1.5] - 2026-01-02

### Summary

**Slash Command Refinements - Industry Best Practices Update**

Comprehensive refinement of 5 slash commands to follow 2025 industry best practices, making them project-agnostic and more effective for any codebase.

### Changed

- **`/rd:task-run`**: Added structured Requirements Discovery Interview framework
  - 6 prioritized question categories: JTBD, Constraints, Scope, UX, Data, Trade-offs
  - Interview best practices (ask "how/what" not "why", completion criteria)
  - New `--no-interview` flag to skip for well-defined tasks
  - Structured interview summary output format

- **`/rd:gitmsg`**: Upgraded to full Conventional Commits 1.0.0 specification
  - Complete commit type table with SemVer mapping (feat→MINOR, fix→PATCH, etc.)
  - Message guidelines: imperative mood, 50-char subject, 72-char body wrap
  - Breaking change syntax (`!` suffix and `BREAKING CHANGE:` footer)
  - Anti-patterns table with corrections
  - New `--amend` and `--breaking` arguments

- **`/rd:fixall`**: Enhanced with language-specific patterns and auto-detection
  - Auto-detection heuristics for project types (Biome, ESLint, Ruff, Cargo, Go)
  - Language-specific fix patterns for TypeScript, Python, Rust, Go
  - "Suppress vs Fix" decision matrix
  - Circular dependency and unfixable issue handling
  - Structured completion summary format

- **`/rd:cleanup`**: Improved dead code detection with Meta's SCARF approach
  - Dead code categories with risk levels and detection methods
  - Common false positives table (dynamic imports, plugins, feature flags)
  - Streamlined tool detection tables
  - Enhanced MANIFEST.md format with restore commands
  - New `--dry-run` and `--scope` arguments

- **`/rd:livingspec`**: Updated for modern Docs-as-Code practices
  - Industry statistics on documentation ROI (30-45% faster onboarding)
  - "What to Document" guidance (APIs, business rules, not implementation details)
  - SemVer for documentation versioning
  - Completion report format
  - New `--full`, `--diff`, `--section` arguments

### References

- [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)
- [Meta: Automating Dead Code Cleanup](https://engineering.fb.com/2023/10/24/data-infrastructure/automating-dead-code-cleanup/)
- [Docs-as-Code (Write the Docs)](https://www.writethedocs.org/guide/docs-as-code/)
- [JTBD Interview Techniques](https://www.lyssna.com/blog/jtbd-interviews/)

## [1.1.4] - 2025-12-26

### Summary

**Tasks Management Tool - Complete Implementation**

The Tasks Management Tool (`prompts.sh` script, accessed via `tasks` command) provides a complete task prompt management system with Kanban board integration. This release encompasses the initial implementation (v1.1.2) and the command rename (v1.1.3) into a single, cohesive feature release.

### Added

- **Tasks Management Tool**: Complete task prompt management system (`plugins/rd/scripts/prompts.sh`)
  - `tasks init`: Initialize tasks directory, Kanban board, template, and create symlink at `/opt/homebrew/bin/tasks`
  - `tasks create <name>`: Create new tasks from template with automatic WBS numbering (4-digit sequence)
  - `tasks list [stage]`: List tasks by stage (`Backlog`, `Todo`, `WIP`, `Testing`, `Done`) or view entire board
  - `tasks update <WBS> <stage>`: Update task status and automatically refresh Kanban board
  - `tasks refresh`: Sync Kanban board with task files (extracts `status` from each task file)
  - `tasks help`: Show usage information
  - Dynamic template support with placeholders: `{{PROMPT_NAME}}`, `{{CREATED_AT}}`, `{{UPDATED_AT}}`
  - Obsidian Kanban plugin integration with `docs/prompts/.kanban.md`
  - Requires `glow` for terminal markdown rendering

### Changed

- **Command Name**: Unified all references to use `tasks` command (previously `prompts`) for clarity
  - Symlink location: `/opt/homebrew/bin/tasks` (previously `/usr/local/bin/prompts`)
  - Script location remains at `plugins/rd/scripts/prompts.sh` for backward compatibility
  - Updated all documentation files with new command references

### Documentation

- **New Guide**: `docs/about_tasks.md` - Comprehensive usage guide with command reference
- **Updated**: `docs/prompt.md` - Design documentation with tool overview
- **Updated**: `plugins/rd/commands/task-run.md` - Integration examples using `tasks` command
- **Template**: `docs/prompts/.template.md` - Task file template with frontmatter structure

## [1.1.2] - 2025-11-25

> **Note**: See v1.1.4 for complete Tasks Management Tool documentation. This version entry is preserved for historical reference.

### Added

- **Tasks Management Tool**: Initial implementation of task prompt management system
- **Documentation**: Initial guide (later replaced by `docs/about_tasks.md`)

## [1.1.0] - 2025-10-26

### Added

- **Meta-skill system for skill management:** `cc-skills` skill with comprehensive best practices
  - SKILL.md: Core domain knowledge for Claude Code Agent Skills
  - BEST_PRACTICES.md: Detailed guidelines and examples
  - EXAMPLES.md: Complete skill examples (code review, API docs, test automation, data processing)
  - TEMPLATES.md: Starter templates (basic, complete, workflow, analysis)
- **Skill creation automation:** `/rd:add-skill` command
  - Creates skill with proper structure and frontmatter
  - Supports 4 templates: basic, complete, workflow, analysis
  - Validates skill name and generates README with next steps
  - Bash script (`addskill.sh`) for file generation
- **Skill refinement:** `/rd:refine-skill` command
  - Analyzes skills against best practices
  - Identifies issues and generates improvement plan
  - Applies refinements with user approval
- **Skill evaluation:** `/rd:evaluate-skill` command
  - Read-only comprehensive quality assessment
  - Evaluates 6 categories: frontmatter, content, structure, efficiency, best practices, code
  - Generates detailed report with scoring and recommendations
  - Prioritized improvement suggestions

### Changed

- **Reorganized commands by prefix for better grouping:**
  - Skill management commands now grouped with `skill-*` prefix:
    - `add-skill` → `skill-add`
    - `evaluate-skill` → `skill-evaluate`
    - `refine-skill` → `skill-refine`
  - 10-stage workflow commands now grouped with `10-dev-*` prefix:
    - `apply-10-dev` → `10-dev-apply`
    - `check-10-dev` → `10-dev-check`
    - `init-10-dev` → `10-dev-init`
    - `integrate-10-dev` → `10-dev-integrate`

## [1.0.0] - 2025-10-26

### Added

- Production-ready `rd` plugin (v1.0.0) for 10-stage TDD workflow
- Multi-plugin architecture with separate directories (`plugins/hello/`, `plugins/rd/`)
- Flattened command structure: `/rd:apply-10-dev` instead of `/rd:10-stages-developing:apply-10-dev`

### Changed

- Streamlined command documentation (36% reduction: 1,521 → 979 lines)
- Restructured project to support multiple plugins cleanly
- Updated all documentation to use `/rd:` command prefix

### Fixed

- Plugin namespace conflicts resolved through separate source directories
- Command reference consistency across all documentation files

## [0.0.1] - 2025-10-25

### Added

- Initial project structure
- Example plugin (my-first-plugin)
- 10-stage development workflow skill
