# Changelog

All notable changes to this project will be documented in this file.

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
