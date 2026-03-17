# Changelog

All notable changes to this project will be documented in this file.

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
