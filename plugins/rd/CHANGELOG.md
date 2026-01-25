# CHANGELOG

## [1.5.8] - 2026-01-25

### Summary

**Plugin Hooks Skill & Subagents**

Added comprehensive `rd2:cc-hooks` Agent Skill with complementary subagents for creating and evaluating Claude Code plugin hooks, following the methodology of `rd2:cc-skills` and `rd2:cc-agents`.

### Added

- **New Skill: `rd2:cc-hooks` (`plugins/rd2/skills/cc-hooks/`)**:
  - Meta-skill for creating Claude Code plugin hooks (PreToolUse/PostToolUse/Stop/SubagentStop)
  - Progressive disclosure structure: SKILL.md (1,900 words), references/, examples/, scripts/
  - **references/patterns.md**: 10+ common hook patterns (validation, context loading, blocking)
  - **references/advanced.md**: Advanced use cases and techniques
  - **references/migration.md**: Migration guidance for hook evolution
  - **examples/**: Working hook scripts (validate-write.sh, validate-bash.sh, load-context.sh)
  - **scripts/**: Utility tools (validate-hook-schema.sh, test-hook.sh, hook-linter.sh)

- **New Subagents (`plugins/rd2/agents/`)**:
  - **`hook-expert.md`**: Hook creation specialist following 8-section anatomy
  - **`hook-doctor.md`**: Hook quality evaluator with comprehensive scoring framework

### Agent Validation Results

**cc-hooks Skill Quality Assessment (skill-doctor):**
- Overall Score: 93.2/100 (Grade A)
- Status: ✓ Production Ready
- Frontmatter: 95/100, Content: 90/100, Security: 95/100, Structure: 95/100
- Perfect progressive disclosure, comprehensive security practices

**hook-expert & hook-doctor Quality:** Pending validation

### References

- Source: `vendors/claude-code/plugins/plugin-dev/skills/hook-development`
- [Claude Code Hooks Documentation](https://docs.anthropic.com/en/docs/claude-code/hooks)

## [1.5.5] - 2026-01-17

### Summary

**Orchestrator Workflow Enhancement & Task Runner Refactoring**

Enhanced the task orchestration workflow by elevating `rd:orchestrator-expert` as the central coordinator for all subagents, including the previously missing `rd:test-expert` integration for systematic test generation and execution. Also refactored the `/rd:task-runner` slash command to delegate through the orchestrator.

### Added

- **New Task: `0011_enhance_orchestrator_testing`** (`docs/prompts/0011_enhance_orchestrator_testing.md`):
  - Enhanced orchestrator workflow to coordinate `rd:test-expert` for systematic testing
  - Complete code→test→fix cycle integration with max 3 fix iterations
  - Test status flow: WIP (coding) → Testing (validation) → Done
  - Test failure escalation after max iterations

- **Enhanced Orchestrator Test Coordination** (`plugins/rd/agents/orchestrator-expert.md`):
  - New Section 5.2: "Test Coordination Integration" with 42 competency items
  - Enhanced workflow: planning → execution → **testing** → completion
  - Test-expert delegation protocol with clear handoffs
  - Test status mapping: track pass rate, fix iterations, flaky detection
  - Code→Test→Fix cycle: implement → generate tests → run → validate (iterate if fail)
  - New output formats: Test Cycle Progress, Test Failure Escalation
  - Enhanced examples demonstrating full test coordination workflow

### Changed

- **Refactored `/rd:task-runner` Command** (`plugins/rd/commands/task-runner.md`):
  - Now delegates to `rd:orchestrator-expert` instead of directly invoking subagents
  - Orchestrator manages all subagent coordination based on task state
  - Preserved all arguments: `--dry-run`, `--no-interview`, `--scope`, `--resume`, `--verify`, `--execute`
  - Updated workflow diagram showing orchestrator as meta-coordinator
  - Benefits: unified coordination, flexible delegation, improved error recovery

- **Optimized `orchestrator-expert` File Size**:
  - Reduced from 1,145 lines to 615 lines (46% reduction)
  - Condensed frontmatter description from 90 lines to ~10 lines
  - Abbreviated output format templates from ~360 lines to ~80 lines
  - Maintained all 8 sections and test coordination integration
  - Within 400-600 line target for optimal maintainability

### Technical Details

**New Orchestrator Workflow:**
```
User Request
    ↓
rd:orchestrator-expert (Meta-Coordinator)
    ├─→ rd:task-decomposition-expert (planning)
    ├─→ rd:task-runner (execution)
    ├─→ rd:test-expert (testing) ← NEW INTEGRATION
    └─→ Domain experts (as needed)

Code→Test→Fix Cycle:
1. Implement code (rd:task-runner or domain expert)
2. Generate tests (rd:test-expert)
3. Run tests (orchestrator-coordinated)
4. If fail: Fix iteration (max 3) → re-run tests
5. If pass: Mark Done → Next task
```

**Test Status Flow:**
```
Backlog → Todo → WIP (coding) → Testing (validation) → Done
                                ↓
                          If fail (max 3x)
                                ↓
                          Escalate to user
```

**Optimization Summary:**
| Component | Before | After | Reduction |
|------------|--------|-------|-----------|
| orchestrator-expert.md | 1,145 lines | 615 lines | 46% |
| Frontmatter description | 90 lines | ~10 lines | 89% |
| Output format templates | ~360 lines | ~80 lines | 78% |

### Agent Validation Results

**orchestrator-expert Quality Assessment (agent-doctor):**
- Overall Score: 94/100 (EXCELLENT)
- Status: ✓ APPROVED FOR PRODUCTION
- Structure: 18/20, Verification: 25/25, Competencies: 20/20, Rules: 15/15
- Competency Items: 178 items (256% of 50+ minimum)
- DO Rules: 20, DON'T Rules: 18
- Test Integration: Complete with code→test→fix cycle

### References

- [Claude Code Subagents](https://code.claude.com/docs/en/sub-agents)
- [Task Tool Documentation](https://docs.anthropic.com/en/docs/claude-code/sub-agents)

## [1.5.4] - 2026-01-16

### Summary

**Software Engineering Protocol & Code Review Agent Expansion**

Added comprehensive software engineering methodology skill (`super-coder`) and specialized code review agent (`reviewer-expert`). This release enhances the plugin's development discipline and quality assurance capabilities with systematic approaches to building reliable software and conducting thorough code reviews.

### Added

- **New Skill: `super-coder` (`plugins/rd/skills/super-coder/`)**:
  - Complete software engineering protocol based on industry best practices
  - **Decision Priority Framework**: Correctness → Simplicity → Testability → Maintainability → Performance
  - **Working Loop**: Clarify → Map impact → Plan minimal diff → Implement → Validate → Refactor → Report
  - **Two Hats Rule**: Never add features and refactor simultaneously
  - **Stop & Ask Criteria**: When requirements ambiguous, API changes, cross-module ripples, security risks
  - **Change Rules**: Minimal diff, domain language, one abstraction level, explicit failures
  - **Interface Design**: Deep modules, information hiding, dependency inversion
  - **Verification Guardrail**: When tests required/optional, legacy code protocol
  - **Anti-Patterns**: Complexity anti-patterns, coupling anti-patterns, error handling anti-patterns
  - **Output Format**: What changed, how to verify, risks, residual risk
  - Includes REFERENCE.md with principles from classic texts (Code Complete, Refactoring, Clean Code, etc.)

- **New Agent: `reviewer-expert` (`plugins/rd/agents/reviewer-expert.md`)**:
  - Senior Code Review Architect & Quality Assurance Specialist
  - Comprehensive implementation review across multiple dimensions
  - **10-Section Review Framework**:
    1. Plan Alignment Verification
    2. Code Quality Assessment
    3. Architecture Review
    4. Security Validation
    5. Performance Analysis
    6. Testing Review
    7. Documentation Review
    8. Standards Compliance
    9. Maintainability Assessment
    10. Integration Review
  - **Triggering Examples**: Major feature completion, API endpoint completion, quality gate before phase transition
  - **Tools**: Read, Write, Edit, Grep, Glob, WebSearch, WebFetch
  - **Skills**: agent-browser for web content verification

### Changed

- **Updated `super-coder` Agent** (`plugins/rd/agents/super-coder.md`):
  - Enhanced with 8-section anatomy structure
  - Improved competency definitions and examples
  - Streamlined verification protocols

- **Refactored Expert Agents**:
  - Applied consistent formatting and structure across multiple agents
  - Improved clarity and reduced redundancy

### Technical Details

**super-coder Skill Philosophy:**
- Based on "A Philosophy of Software Design" - complexity is the enemy
- From "The Pragmatic Programmer" - ETC (Easier To Change) is the guiding value
- From "Refactoring" - mixing features and refactoring risks breaking behavior
- From "Code Complete" - when complexity exceeds mental capacity, defects are inevitable
- From "Working Effectively with Legacy Code" - characterization tests ensure refactoring safety

**reviewer-expert Activation Triggers:**
- Major feature implementation completion
- API endpoint or service completion
- Quality gates before phase transitions
- Architecture review requests
- Security validation needs

### References

- [A Philosophy of Software Design](https://www.oreilly.com/library/view/a-philosophy-of/9781732102212/)
- [The Pragmatic Programmer](https://pragprog.com/titles/tpp20/)
- [Refactoring](https://refactoring.com/)
- [Code Complete](https://www.oreilly.com/library/view/code-complete-second/9780735636976/)
- [Working Effectively with Legacy Code](https://www.oreilly.com/library/view/working-effectively-with/0131177052/)
- [Clean Code](https://www.oreilly.com/library/view/clean-code-a/9780136083238/)

## [1.5.2] - 2026-01-15

### Summary

**Plugin Hooks Bug Fix**

Fixed JSON validation error in Stop hook by correcting the prompt-based hook output format to match Claude Code specification.

### Fixed

- **Stop Hook JSON Validation Error** (`plugins/rd/hooks/hooks.json`):
  - Root cause: Prompt was requesting incorrect JSON output format (`{"ok": true}` instead of `{"decision": "approve"}`)
  - Updated Stop hook prompt to use correct decision format:
    - `{"decision": "approve", "reason": "..."}` to allow stopping
    - `{"decision": "block", "reason": "...", "systemMessage": "..."}` to continue working
  - Changed field names: `ok` → `decision`, boolean `true/false` → string `"approve"/"block"`
  - Added `systemMessage` field for block case (optional but recommended)

### References

- [Claude Code Hooks Documentation - Stop Event](https://github.com/anthropics/claude-code/blob/main/plugins/plugin-dev/skills/hook-development/SKILL.md#stop)
- Stop hook output specification: `{"decision": "approve|block", "reason": "...", "systemMessage": "..."}`

## [1.5.1] - 2026-01-14

### Summary

**Expert Agent Optimization & Global CLAUDE.md Enhancement**

Token efficiency update reducing 10 expert agent definitions by 74% (5,977 → 1,553 lines) while preserving production quality. Expanded agent routing table from 7 to 19 agents.

### Changed

- **Expert Agent Optimization (`plugins/rd/agents/`)**:
  - Applied consistent 8-section anatomy with condensed format
  - Converted verbose competency tables to comma-separated lists
  - Compressed frontmatter examples from 3 to 1 per agent
  - Merged philosophy/rules sections into single-line entries

  | Agent | Before | After | Reduction |
  |-------|--------|-------|-----------|
  | `super-researcher.md` | 781 | 160 | 79% |
  | `backend-architect.md` | 698 | 154 | 78% |
  | `ml-expert.md` | 682 | 157 | 77% |
  | `golang-expert.md` | 674 | 174 | 74% |
  | `frontend-expert.md` | 601 | 147 | 76% |
  | `ios-expert.md` | 595 | 150 | 75% |
  | `uiux-expert.md` | 561 | 149 | 73% |
  | `prompt-expert.md` | 541 | 156 | 71% |
  | `seo-expert.md` | 426 | 151 | 65% |
  | `mobile-expert.md` | 418 | 155 | 63% |
  | **Total** | 5,977 | 1,553 | **74%** |

- **Global CLAUDE.md Agent Routing**:
  - Expanded routing table from 7 to 19 agents
  - Added 12 new `rd:` prefixed agents with trigger keywords
  - Fixed markdown escaping for `mcp__grep__searchGitHub` tool references

### Added

- **New Agent Routing Entries**:
  - `rd:golang-expert` — go, golang, goroutines, channels, concurrency
  - `rd:task-runner` — execute task, run phase, checkpoint
  - `rd:backend-architect` — API design, microservices, distributed systems
  - `rd:frontend-expert` — React, Next.js, Server Components, Tailwind
  - `rd:ios-expert` — iOS, Swift, SwiftUI, UIKit, Xcode
  - `rd:mobile-expert` — React Native, Flutter, Expo, cross-platform
  - `rd:ml-expert` — ML, PyTorch, TensorFlow, MLOps
  - `rd:prompt-expert` — prompt engineering, system prompt, few-shot
  - `rd:seo-expert` — SEO, keyword research, Core Web Vitals
  - `rd:super-researcher` — literature review, meta-analysis, evidence synthesis
  - `rd:uiux-expert` — UI design, UX research, accessibility, WCAG

## [1.5.0] - 2026-01-13

### Summary

**Task Orchestration Architecture Overhaul**

Major release introducing a complete task orchestration system with two specialized subagents working in tandem: `task-decomposition-expert` for planning and `task-runner` for execution. This release establishes checkpoint discipline, TodoWrite synchronization, and expert delegation patterns.

### Added

- **New Subagent: `task-runner` (`plugins/rd/agents/task-runner.md`)**:
  - Senior Task Execution Specialist with checkpoint discipline
  - Sequential phase execution with atomic checkpoint writes
  - Status state machine: `pending` → `in_progress` → `completed` | `blocked`
  - Expert Agent Delegation Protocol (Section 5.5) — signals delegation needs to parent context
  - Resume capability via `--resume` flag for interrupted work
  - TodoWrite synchronization after every status change

- **Expert Agent Delegation Protocol**:
  - Clear separation: subagents signal needs, parent context (Claude Code) invokes experts
  - Decision tree for delegation routing (Python → python-expert, TypeScript → typescript-expert, etc.)
  - Structured delegation signal format with recommended expert and prompt

- **Batch Execution Pattern**:
  - 3-7 implementation phases for task-runner consumption
  - Phase independence with verifiable deliverables
  - Checkpoint discipline: write to disk after each phase

### Changed

- **Renamed Command: `/rd:task-run` → `/rd:task-runner`**:
  - Aligns with subagent naming convention
  - Updated all references in `task-fixall.md`, `tasks.md`, `agent-meta.md`

- **Refactored `/rd:task-runner` Command (`plugins/rd/commands/task-runner.md`)**:
  - Lean orchestration format delegating to specialized subagents
  - 66% reduction: 534 → 180 lines
  - Two-phase workflow: Planning (task-decomposition-expert) → Execution (task-runner)
  - Expert Delegation table for action pattern routing

- **Enhanced `task-decomposition-expert` (`plugins/rd/agents/task-decomposition-expert.md`)**:
  - 37% reduction: 592 → 370 lines (removed redundancy while preserving key content)
  - Added TodoWrite Synchronization Protocol to Section 4
  - Added Batch Execution Pattern to Section 5.1
  - Added Agent Invocation Format with Task tool examples
  - Updated Expert Agent Capabilities table (8 agents)
  - Consolidated decomposition patterns from 16 to 7 key patterns

- **Optimized `task-runner` Subagent (`plugins/rd/agents/task-runner.md`)**:
  - 54% reduction from initial draft: 789 → 366 lines
  - Merged redundant sections (5.3+5.6 → 5.3, 5.2+5.5 → 5.2)
  - Reduced output templates from 7 to 4
  - Preserved all critical protocols and verification steps

### Technical Details

**Task Tool Invocation Format:**
```python
Task(
  subagent_type="rd:task-decomposition-expert",
  prompt="Analyze and decompose task file: {task_file}",
  description="Decompose task into phases"
)
```

**TodoWrite Synchronization:**
- Task file `impl_progress` is source of truth
- TodoWrite mirrors for user visibility
- Sync immediately after every checkpoint

**Optimization Summary:**
| File | Before | After | Reduction |
|------|--------|-------|-----------|
| `task-runner.md` (agent) | 789 | 366 | 54% |
| `task-decomposition-expert.md` | 592 | 370 | 37% |
| `task-runner.md` (command) | 534 | 180 | 66% |
| **Total** | 1,915 | 916 | **52%** |

### References

- [Claude Code Subagents](https://code.claude.com/docs/en/sub-agents)
- [Task Tool Documentation](https://docs.anthropic.com/en/docs/claude-code/sub-agents)

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
