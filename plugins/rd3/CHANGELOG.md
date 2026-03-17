# Changelog

All notable changes to this project will be documented in this file.

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
