# Changelog

All notable changes to this project will be documented in this file.

## [0.4.5] - 2026-04-04

### New Features

- **rd3:orchestration-v2**: Complete rewrite of the 9-phase orchestration pipeline
  - New engine architecture with improved phase orchestration
  - Enhanced gate architecture with better error discrimination
  - Profile-driven execution (simple, standard, complex, research)
  - Phase profiles for single-phase execution (refine, plan, unit, review, docs)
  - Worker phases (5-7) routed to execution channels; direct-skill phases (1-4, 8-9) pinned to current channel
  - Dry-run preview, resume from any phase, `--undo` rollback via git-based sandbox
  - Automated rework loops with configurable retry limits

- **rd3:tasks Web UI**: New browser-based interface for the tasks server
  - Real-time task visualization and management
  - Terminal output streaming
  - Task tree browser
  - SSE-based live updates

- **rd3:tasks Server Commands**: New CLI commands for task management
  - `server` subcommand for launching the tasks HTTP server
  - `write` subcommand for creating/updating tasks
  - `open` subcommand for opening task files in editor
  - `put` subcommand for batch updates
  - `refresh` subcommand for reloading tasks from disk

- **rd3:dev-verify**: New slash command for task verification
  - Profile-driven verification execution
  - Integration with orchestration-v2 pipeline

- **rd3:task-decomposition Enhancements**: Improved requirements elicitation
  - Better WBS generation
  - Enhanced domain routing

### Improvements

- **Task Status**: Added `Canceled` status for tasks
- **Description Handling**: Fixed issues with long task descriptions
- **Setup Scripts**: Fixed `scripts/setup-all.sh` compatibility

### Bug Fixes

- Fixed numerous issues with orchestration-v2 Gate Architecture
- Fixed web UI issues with rd3:tasks (description handling, status updates)
- Fixed setup script compatibility issues

### Test Coverage

- 15 new test files for rd3:tasks skill (open, put, refresh, router, server-cmd, integration, routeHandlers, writeLock, show, terminal, tree, update, writeGuard)
- 2,409+ new tests across the skills
- New best-practice-fixes test suite
- Phase worker documentation tests

### Internal Changes

- 211 files changed, 33,666 insertions, 563 deletions
- 256 commits since v0.4.4
- Complete migration from `rd3:orchestration-dev` to `rd3:orchestration-v2`

## [0.4.4] - 2026-03-31

### Improvements

- **Orchestration-Dev Defensive Hardening (Task 0294)**: Production stability fixes for the 9-phase pipeline
  - **Schema Versioning**: Added `schema_version` field to `OrchestrationState`; rejects future schema versions on load with descriptive error message
  - **Run Lock**: PID-based `.run.lock` files prevent concurrent orchestration for the same task; auto-released via try/finally even on failure
  - **Rollback Safety**: `checkDirtyFiles()` detects both staged and unstaged changes (`git diff HEAD`); `force` parameter bypass for emergency rollback
  - **Phase Timeouts**: Per-phase timeout defaults via `PHASE_TIMEOUT_MS` map (replaces single global timeout)
  - **Error Discrimination**: `executePhaseOnce` now distinguishes timeouts from thrown errors (`kind: 'timeout'` vs `kind: 'failure'`); actionable messages via `formatPhaseError()`
  - **Domain Routing**: `resolveDomain()` in contracts routes Phase 2/3 to specialist skills based on task domain

- **CLI-for-AI Skill**: New `rd3:cli-for-ai` agent skill for designing CLI tools that work well with AI agents

- **Installation Scripts**: Refactored all installation scripts for cleaner cross-platform support

- **Main Agent Configs**: Enhanced main agent configurations for improved token efficiency

### Documentation

- **Comprehensive Review**: 1,143-line architecture review of orchestration-dev (scoring B+ / 78/100)
- **SOTA Research**: 827-line research brief on agent orchestration state-of-the-art (2026)
- Both documents serve as the spec for Track 2 next-generation pipeline rebuild

### Fixes

- Fixed state file race conditions with timestamp-based sorting in `state-paths.ts`
- Fixed `.gitignore` defensive patterns for test artifacts
- Fixed permission issues in project scripts

### Test Coverage

- 2335 tests passing (+10 from baseline 2325), 5594 expect() calls
- New tests for schema validation (3), error type discrimination (2), run lock lifecycle (3), rollback dirty files (2)
- 100% function coverage achieved on `state-paths.ts` and `rollback.ts`

## [0.4.3] - 2026-03-30

### New Features

- **rd3:orchestration-dev Pipeline v2**: 9-phase orchestration pipeline with profile-driven execution, CoV-backed gate manifests, and automated rollback
  - Profile system (simple, standard, complex, research) determines which phases run
  - Phase profiles (refine, plan, unit, review, docs) for single-phase execution
  - Worker phases (5-7) routed to execution channels; direct-skill phases (1-4, 8-9) pinned to current
  - Dry-run preview, resume from any phase, `--undo` rollback via git-based sandbox
  - Automated rework loops with configurable retry limits
  - 11 scripts: model, contracts, init, plan, pilot, runtime, gates, executors, rollback, direct-skill-runner, state-paths
  - Full test suite: pilot (27 tests), runtime (27 tests), init, plan, rollback, gates, executors, state-paths, direct-skill-runner

- **21 New Skills**: Expanded specialist capabilities
  - `orchestration-dev` - 9-phase pipeline orchestrator (capstone)
  - `deep-research` - Enterprise-grade systematic research
  - `reverse-engineering` - Codebase reverse engineering and HLD generation
  - `verification-chain` - Chain-of-Verification orchestration
  - `advanced-testing` - Mutation testing, property-based testing, accessibility testing
  - `code-implement-common` - Unified code implementation
  - `code-review-common` - Unified code review coordination
  - `code-docs` - Cumulative project documentation refresh
  - `backend-design` / `frontend-design` - Implementation pattern skills
  - `bdd-workflow` / `functional-review` - BDD and requirements traceability
  - `request-intake` - Requirements elicitation from vague inputs
  - `brainstorm` - Structured ideation workflow
  - `cc-hooks` - Claude Code plugin hooks management
  - `cli-for-ai` - CLI-for-AI skill
  - `pl-golang` / `pl-javascript` / `pl-python` / `pl-typescript` - Language-specific planning
  - `token-saver` / `ui-ux-design` - Utility and design skills

- **5 New Subagents**: Expanded agent ecosystem
  - `jon-snow` - Pipeline routing agent (full runs, resumes, dry-runs, phase profiles)
  - `knowledge-seeker` - Research specialist and knowledge synthesis
  - `super-coder` - Full-stack code implementation with cross-channel support
  - `super-tester` - Test writing, coverage measurement, TDD workflows
  - `super-reviewer` - Comprehensive code review coordination

- **12 New Slash Commands**: Developer productivity shortcuts
  - `dev-run` - Profile-driven pipeline execution
  - `dev-plan` - Architecture and design planning
  - `dev-unit` - Unit test generation
  - `dev-review` - Comprehensive code review
  - `dev-docs` - Documentation refresh
  - `dev-fixall` - Fix lint, type, and test issues
  - `dev-gitmsg` - Conventional commit message generation
  - `dev-changelog` - Changelog generation from git history
  - `dev-init` - Project initialization and validation
  - `dev-refine` - Requirements refinement
  - `dev-reverse` - HLD generation from codebase
  - `skill-migrate` - Migrate and merge skills from rd2 to rd3

- **4 New Shared Libraries**: Reusable script infrastructure
  - `acpx-query` - ACP agent query utilities
  - `cli-args` - CLI argument parsing
  - `research-patterns` - Research methodology patterns
  - `validation-runner` - Validation execution framework

### Improvements

- **Delegation Map**: Complete phase-to-skill delegation reference for all 9 pipeline phases
- **Phase Matrix**: Profile-based phase selection with gate definitions
- **Verification Profiles**: Per-profile gate configuration with CoV integration
- **Enhanced Agents**: Updated expert-skill agent for pipeline v2 coordination
- **Test Infrastructure**: Added shared test helpers with centralized test data directory

### Fixes

- Fixed test artifact pollution from missing TEST_DIR initialization in 4 describe blocks
- Removed dead code (unused imports, evaluateCoVGate, buildPhaseEvidence) from gates module
- Fixed direct-skill limitation documentation for pipeline v2
- Wired `--undo` flag execution into runtime for rollback support
- Fixed best-practice-fixes script for pipeline v2 compatibility

### Internal Changes

- 448 files changed, 85,804 insertions across 50 commits
- 8 new shared test files with 1,329 lines of test infrastructure
- 29 files in orchestration-dev skill (8,949 lines including tests)
- Removed empty frontmatter lines from 11 command files

## [0.3.5] - 2026-03-24

### 🔧 Improvements

- **Meta-Agent Skills Refactoring**: Replaced "LLM Checklist" pattern with "LLM Content Improvements" across all meta-agent skills for clearer, more actionable feedback

### 📝 Internal Changes

- 395 files changed, 104,066 insertions — internal quality improvements only, no user-facing API or behavior changes

## [0.3.0] - 2026-03-22

### ✨ New Features

- **rd3:quick-grep Skill**: Strategic code search and rewrite agent skill
  - AST-based structural code search
  - Find function patterns across codebase

- **rd3:cc-magents Skill**: Meta agent configuration management
  - `add` - Create new main agent configs (AGENTS.md, CLAUDE.md, GEMINI.md)
  - `evaluate` - Score config quality across 5 dimensions
  - `refine` - Auto-fix issues with dry-run preview
  - `evolve` - Self-improvement proposals from interaction patterns
  - `adapt` - Convert between platform formats

- **15+ New Agent Skills**: Expanded specialist capabilities
  - `advanced-testing` - Mutation testing and property-based testing
  - `ast-grep` - Structural code pattern analysis
  - `code-review-common` - Unified code review coordinator
  - `coder-auggie` - Auggie-powered code generation
  - `coder-claude` - Claude-native code generation
  - `coder-gemini` - Gemini CLI code generation
  - `coder-opencode` - OpenCode CLI code generation
  - `knowledge-seeker` - Research and knowledge synthesis
  - `lead-research-assistant` - Lead generation research
  - `pl-python` - Python project planning
  - `task-decomposition` - Domain-specific task breakdown
  - `tdd-workflow` - Test-driven development orchestration
  - `test-coverage` - Coverage measurement and targets
  - `anti-hallucination` - Verification-first development
  - `frontend-design` / `ui-ux-design` - UI/UX design capabilities

- **12+ New Subagents**: Expanded agent ecosystem
  - `super-reve` - High-level design and codebase analysis
  - `super-designer` - Senior UI/UX design specialist
  - `super-brain` - Brainstorming and ideation specialist
  - `super-publisher` - Multi-platform publishing orchestration
  - `super-architect` - Solution architecture for backend/frontend/cloud
  - `super-coder` - Full-stack code implementation (with dynamic language support)
  - `super-planner` - Workflow orchestration and task breakdown
  - `super-code-reviewer` - Comprehensive code review coordinator
  - `wt:image-generator` / `wt:image-cover` / `wt:image-illustrator` - Image generation
  - `agen-browser` - Browser automation specialist
  - `orchestrator-expert` - Multi-agent workflow coordination
  - `tc-writer` / `it-writer` - Technical content orchestration
  - `magent-browser` - Browser-based document conversion

- **14+ New Slash Commands**: Enhanced developer productivity
  - `tasks-unit` - Generate unit tests
  - `tasks-plan` - Workflow-aware task planning
  - `tasks` - Task management (create, list, update, refresh)
  - `agent-meta` / `task-review` / `translate` - Meta operations
  - `cleanup` / `fixall` / `gitmsg` / `livingspec` - Development utilities
  - `info-research` / `info-reve` - Research and documentation
  - `code-generate` - Code generation workflow
  - `open` - Task file opening

- **New Platform Plugins**: Extended ecosystem support
  - `rd3` - Primary rd3 plugin (main development focus)
  - `rd2` - Legacy plugin (superseded by rd3)
  - `appwrite` - Appwrite integration
  - `dokploy` - Dokploy deployment integration
  - `wt` - Technical writing workflow plugin
  - `openclaw` - OpenClaw subagent support

- **ADK Behavior Support**: Added to cc-skills for Gemini integration

- **Installation Enhancement**: Use rulesync for installation to selected vibe coding tools

### 🔧 Improvements

- **Dynamic Programming Language Support**: super-coder now auto-detects and uses appropriate coder skill
- **sys-debugging & sys-developing**: Added to super-coder for enhanced problem-solving
- **Google Stitch AI Integration**: Added to super-designer for AI-powered UI generation
- **Task Management**: Enhanced with WBS numbering, multi-folder support, kanban board sync
- **Multi-Platform Publishing**: Enhanced publish-to-* skills with advanced options

### 🐛 Fixes

- Fixed sed cross-platform compatibility issue
- Fixed various naming convention issues across agents and commands
- Fixed permission issues with hook execution and slash commands
- Fixed installation issues (Makefile, mke setup-cc)
- Fixed hook errors on Stop event
- Fixed frontmatter issues in agents and subagents
- Fixed test and lint issues in skill scripts
- Fixed publication script exit issues
- Fixed super-planner stability issues

### 🔒 Security

- Removed `notebooklm-skill-master` and `playwright-skill` skills for security reasons

## [0.2.2] - 2026-03-20

### ✨ New Features

- **cc-magents Skill**: Complete meta-skill for managing main agent configuration files
  - `add` - Create new AGENTS.md, CLAUDE.md, GEMINI.md from templates
  - `evaluate` - Score config quality across 5 dimensions (A-F grade)
  - `refine` - Auto-fix issues with dry-run preview
  - `evolve` - Self-improvement proposals from interaction patterns
  - `adapt` - Convert between platform formats

- **23+ Platform Adapters**: Universal Main Agent Model (UMAM) support
  - Claude Code (CLAUDE.md, AGENTS.md)
  - Cursor (.cursorrules)
  - Windsurf (.windsurfrules)
  - Zed (zed-rules)
  - OpenCode (opencode-rules)
  - Aider, Warp, RooCode, Amp, VSCode instructions
  - Junie, Augment, Cline, and more

- **6 Main Agent Templates**: Ready-to-use configurations
  - `dev-agent` - Development-focused agent
  - `devops-agent` - DevOps/infrastructure agent
  - `research-agent` - Research and analysis agent
  - `data-agent` - Data science agent
  - `content-agent` - Content creation agent
  - `general-agent` - General-purpose agent

- **Evolution Capability**: Added to cc-skills
  - `evolve` operation for self-improvement proposals
  - Pattern-based improvement suggestions

- **Slash Commands for Main Agents**: Five new wrapper commands
  - `/rd3:magent-add` - Create new main agent config
  - `/rd3:magent-evaluate` - Score config quality
  - `/rd3:magent-refine` - Fix config issues
  - `/rd3:magent-evolve` - Generate improvement proposals
  - `/rd3:magent-adapt` - Cross-platform conversion

### 🔧 Improvements

- **5-Dimension Evaluation Framework**: Main agent quality scoring
  - Structural Integrity (20%)
  - Content Quality (25%)
  - Platform Compatibility (20%)
  - Behavioral Clarity (20%)
  - Maintainability (15%)

- **Comprehensive Test Coverage**: Full test suites for cc-magents
  - Unit tests for all operations
  - Adapter tests for all platforms
  - Integration tests with fixtures

### 📝 Documentation

- Updated README.md with four meta-skill architecture guide
- Skill selection decision matrix
- Recommended workflows for all four skills

## [0.2.0] - 2026-03-19

### ✨ New Features

- **cc-agents Skill**: Complete meta-skill for creating and managing Claude Code subagents
  - `scaffold` - Create new agent directories from templates (minimal, standard, specialist)
  - `validate` - Validate agent structure and frontmatter
  - `evaluate` - Score agent quality across 8-section anatomy
  - `refine` - Auto-fix agent issues with script + checklist pattern
  - `adapt` - Convert agents for cross-platform compatibility

- **cc-commands Skill**: Comprehensive skill for Claude Code slash command management
  - `scaffold` - Create new command files from templates (simple, workflow, plugin)
  - `validate` - Validate command structure and frontmatter
  - `evaluate` - Score command quality across 6 dimensions
  - `refine` - Auto-fix command issues and generate platform companions
  - `adapt` - Adapt commands for different AI platforms

- **cc-skills Skill**: Full skill development lifecycle management
  - `scaffold` - Create new skill directories from templates (technique, pattern, reference)
  - `validate` - Validate skill structure and frontmatter
  - `evaluate` - Score skill quality across 12 dimensions
  - `refine` - Auto-fix skill issues and apply best practices
  - `adapt` - Audit and adapt skills for cross-platform compatibility
  - `package` - Package skills for distribution with companions

- **Expert Agents**: Three specialized expert agents for development guidance
  - `expert-agent` - Agent creation and refinement expert
  - `expert-command` - Command development expert
  - `expert-skill` - Skill development expert

- **Platform Adapters**: Unified multi-platform support across all skills
  - Claude Code (native AGENTS.md/SKILL.md formats)
  - Codex (agents/openai.yaml)
  - Gemini Antigravity (agents/openai.yaml)
  - OpenClaw (metadata.openclaw)
  - OpenCode (agents/openai.yaml)

- **Shared Best-Practice Fixes**: Common automated correction module
  - TODO marker normalization
  - Second-person voice removal
  - Windows path detection
  - Circular reference prevention

- **Comprehensive Test Suites**: Full test coverage for all skills
  - Unit tests for evaluation logic and adapters
  - Integration tests with fixtures
  - Platform-specific adapter tests

### 🔧 Improvements

- **10-Dimension MECE Evaluation**: Unified evaluation framework
  - Split Delegation Architecture from Cross-Platform Portability
  - Removed dead-weight Operational Readiness dimension
  - Proper dimension weights summing to 100%

- **Script + Checklist Pattern**: Deterministic vs fuzzy issue handling
  - Scripts handle deterministic fixes (regex, markers, paths)
  - LLMs handle fuzzy quality issues with checklists
  - Applied consistently across cc-agents, cc-skills, cc-commands

- **Evaluation Framework Enhancements**:
  - Frontmatter quality scoring (15-18 pts)
  - Description effectiveness analysis
  - Security gatekeeper with immediate reject patterns
  - Blacklist/greylist content scanning

- **Platform Adapter Architecture**: Refactored base adapter pattern
  - Consistent interface across all platform adapters
  - Feature detection and capability mapping
  - Bidirectional conversion support

### 🐛 Fixes

- Fixed MECE compliance issues in evaluation dimensions
- Fixed type mismatches in adapter functions
- Fixed evaluation dimension weights to properly sum to 100%
- Fixed TODO marker bugs in refine scripts
- Fixed lint errors (useLiteralKeys rule compliance)

### 📝 Documentation

- Comprehensive SKILL.md files for all three meta skills
- Reference guides: agent anatomy, architecture, workflows, troubleshooting
- Evaluation framework documentation for all skill types
- Frontmatter field references for agents, commands, and skills
- Platform compatibility guides

## [0.1.5] - 2026-03-18

### ✨ New Features

- **cc-agents Skill**: New meta-skill for creating and managing Claude Code subagents
  - `scaffold` - Create new agent directories from templates (minimal, standard, specialist)
  - `validate` - Validate agent structure and frontmatter
  - `evaluate` - Score agent quality across 10 MECE dimensions
  - `refine` - Auto-fix agent issues and apply best practices
  - `adapt` - Convert agents for cross-platform compatibility

- **Agent Templates**: Three-tier template system for agent creation
  - Minimal (8 sections, ~400 lines)
  - Standard (8 sections + extended sections)
  - Specialist (8 sections + full competency matrix)

- **Platform Adapters for Agents**: Multi-platform support
  - Claude Code (AGENTS.md native format)
  - Codex (agents/openai.yaml)
  - Gemini Antigravity (agents/openai.yaml)
  - OpenClaw (metadata.openclaw)
  - OpenCode (agents/openai.yaml)

- **Slash Commands for Agents**: Four new wrapper commands
  - `/rd3:agent-add` - Create new agents with scaffolding
  - `/rd3:agent-evaluate` - Check agent quality score
  - `/rd3:agent-refine` - Evaluate and fix agent issues
  - `/rd3:agent-adapt` - Cross-platform agent conversion

- **Shared Best-Practice Fixes**: New shared module for automated corrections
  - TODO marker normalization
  - Second-person voice removal
  - Windows path detection
  - Circular reference prevention

- **Red Flags Checklists**: 10-category security checklists for all meta skills
  - cc-agents: Credential handling, command execution, destructive operations
  - cc-skills: Trigger design, progressive disclosure
  - cc-commands: Delegation patterns, argument design

### 🔧 Improvements

- **10-Dimension MECE Evaluation**: Unified evaluation framework across all skills
  - Categories: Metadata, Content, Architecture, Security, Platform
  - Split Delegation Architecture from Cross-Platform Portability
  - Removed dead-weight Operational Readiness dimension

- **Evaluation Framework Enhancements**:
  - Frontmatter quality (15/18 pts)
  - Description effectiveness (15/18 pts)
  - Content quality with blacklist/greylist scanning
  - Security gatekeeper with immediate reject patterns

- **Script + Checklist Pattern**: Removed LLM refine from cc-agents
  - Deterministic fixes handled by scripts
  - Fuzzy quality issues handled by invoking LLM with checklist
  - Applied same pattern to cc-skills

### 🐛 Fixes

- Fixed MECE compliance issues in evaluation dimensions
- Fixed TODO marker bug in cc-skills refine.ts
- Fixed type mismatches in adapter functions
- Fixed evaluation dimension weights to properly sum to 100%

### 📝 Documentation

- Comprehensive SKILL.md files for all three meta skills
- Evaluation framework references
- Agent anatomy and architecture guides
- Hybrid command/agent patterns documentation
- Troubleshooting guides for each skill

## [0.1.2] - 2026-03-17

### ✨ New Features

- **cc-skills Skill**: New skill for managing Agent skills
  - `scaffold` - Create new skill directories from templates
  - `validate` - Validate skill structure and frontmatter
  - `evaluate` - Score skill quality across multiple dimensions
  - `refine` - Auto-fix skill issues, apply best practices, and generate platform companions
  - `adapt` - Audit and adapt skills for cross-platform compatibility

- **Three Template Types**: Technique, Pattern, and Reference templates for different skill purposes

- **Resource Directories**: Support for scripts, references, assets, and agents directories

- **Code Review Improvements**: Fixed evaluation dimension weights to follow MECE principle
  - Added circularReference dimension to prevent double-counting
  - Weights now properly sum to 100%

- **Common Library Integration**: Refactored all skills to use shared logger and utilities
  - Uses `plugins/rd3/scripts/logger.ts` for consistent logging
  - Uses `plugins/rd3/scripts/utils.ts` for common utilities

- **Cross-Platform Support**: Platform-specific companions generated for:
  - Claude Code (native SKILL.md format)
  - Codex (agents/openai.yaml)
  - OpenClaw (metadata.openclaw in frontmatter)
  - OpenCode (agents/openai.yaml)
  - Antigravity (agents/openai.yaml)

### 🔧 Improvements

- **Evaluation Framework**: Enhanced skill quality scoring
  - 11 dimensions in full scope (was 10)
  - Better coverage of behavioral, structural, and security aspects
  - Proper blacklist/greylist patterns for input validation

- **Refinement Tools**: Automated quality improvements
  - Best practice auto-fixes (TODO markers, second-person voice, Windows paths)
  - LLM-based refinement for fuzzy issues (imperative form, clarity)
  - Platform companion generation

- **Testing**: Comprehensive test coverage
  - Unit tests for evaluation logic
  - Dimension validation tests

### 🐛 Fixes

- Refactored slash commands to be thin wrappers (~50 lines each)
  - skill-add.md, skill-evaluate.md, skill-package.md, skill-refine.md
  - All now delegate to rd3:cc-skills skill
  - Removed redundant implementation details

- Fixed regex patterns for backtick command validation
- Fixed TypeScript type mismatches in adapter functions
- Fixed evaluation dimension count (7 for basic, 11 for full scope)
- Fixed lint errors (useLiteralKeys rule compliance)
- Fixed resource type validation in scaffold script

## [0.1.1] - 2026-03-16

### ✨ New Features

- **cc-commands Skill**: New skill for managing Claude Code slash commands
  - `scaffold` - Create new command files from templates
  - `validate` - Validate command structure and frontmatter
  - `evaluate` - Score command quality across multiple dimensions
  - `refine` - Auto-fix command issues and generate platform companions
  - `adapt` - Adapt commands for different AI platforms

- **Platform Adapters**: Multi-platform support for command generation
  - Claude Code adapter
  - Codex adapter
  - Gemini (Antigravity) adapter
  - OpenClaw adapter
  - OpenCode adapter

- **Command Templates**: Three template types for command scaffolding
  - Simple template for basic commands
  - Workflow template for complex workflows
  - Plugin template for plugin-specific commands

### 🔧 Improvements

- **Evaluation Framework**: Comprehensive command quality scoring
  - Frontmatter quality checks
  - Description effectiveness analysis
  - Argument design validation
  - Structure and brevity scoring
  - Content quality assessment

- **CLI Tools**: Full command-line interface for all operations
  - `--scope` for basic/full evaluation
  - `--platform` for target platform selection
  - `--json` for machine-readable output
  - `--verbose` for detailed reporting

### 🐛 Fixes

- TypeScript type fixes for adapter return types
- Lint rule enforcement (no explicit any)
- Proper error handling in CLI tools

### 📝 Documentation

- SKILL.md with comprehensive usage guide
- Evaluation framework reference
- Frontmatter field reference
- Platform compatibility guide

## [0.1.0] - 2026-02-09

### ✨ New Features

- Initial release of rd3 plugin
- Base logging utility
- Common utilities for plugin development
