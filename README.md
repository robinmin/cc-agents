# cc-agents (Claude Code & Antigravity Agents)

A collection of high-quality agents, skills, and workflows for **Claude Code** and **Google Antigravity / Gemini Code Assist**.

## One Toolkit, Two Platforms

This repository provides a unified development automation toolkit that officially supports:

- **Claude Code**: Advanced terminal-based AI coding assistant.
- **Google Antigravity**: Next-generation AI-powered IDE and agentic workflow platform.

## What's Included

### rd (Rapid Development)

Production-ready automation for systematic test-driven development (TDD) and server management.

- **10-Stage TDD Workflow**: A disciplined approach to building high-quality functions in any language (Python, JS/TS, Go, Rust, Java).
- **Cloud Management**: Workflows for Dokploy and server orchestration.
- **Skill Management**: Tools for creating, evaluating, and refining AI agent skills.

### wt (Workplace Tools)

Content generation and translation utilities.

- **Style Extractor/Applier**: Maintain consistent writing styles across projects.
- **Professional Translation**: High-quality multi-lingual translation (EN, ZH, JA).

---

## Installation

### For Google Antigravity (Recommended)

Antigravity provides a rich, integrated experience for workflows and rules. You can install tools locally (for a specific project) or globally (for all projects).

**Global Installation (All projects):**

```bash
# 1. Clone this repository
git clone https://github.com/robinmin/cc-agents.git
cd cc-agents

# 2. Run the migration tool with the --global flag
./antigravity-install.sh --global

# Workflows will be installed to ~/.gemini/antigravity/global_workflows
```

**Local Installation (Current project):**

```bash
# 1. Clone this repository into your project root
# 2. Run the migration tool
./antigravity-install.sh

# Workflows will be installed to .agent/workflows
```

**Using Workflows:** start using slash commands directly:

- `/rd_dev-apply function_name`

### For Claude Code

Claude Code uses a marketplace-based plugin system.

> [!IMPORTANT]
> The `/plugin install` command format has been updated. Please follow the steps below.

```bash
# Step 1: Add this repository to your marketplace list
/plugin marketplace add robinmin/cc-agents

# Step 2: Verify the marketplace was added
/plugin marketplace list

# Step 3: Install the "rd" or "wt" plugin directly
/plugin install rd
/plugin install rd2
/plugin install wt

/plugin enable rd
/plugin enable rd2
/plugin enable wt

# Step 4: Verify installed commands
/rd:help
```

Or in terminal with:

```bash
claude plugin update rd@cc-agents &&  claude plugin update wt@cc-agents
claude plugin list
```

---

## Usage Examples

### 10-Stage Development Workflow

The flagship feature of this toolkit. It guides you from specification to implementation with strict quality checks.

Use the `rd:10-stages-developing` skill for systematic TDD workflow:

```
Implement a validate_email function using the 10-stage TDD methodology
```

---

## Project Structure

- `plugins/`: Core logic and documentation for all tools.
  - `rd/`: Rapid Development plugin.
  - `wt/`: Workplace Tools plugin.
- `.agent/`: (Generated) Antigravity-specific workflows and rules.
- `antigravity-install.sh`: The migration engine that keeps both platforms in sync.

## Contributing

Contributions are welcome! If you add a new command or skill, simply run `./antigravity-install.sh` to ensure it's available for Antigravity users.

## References

- [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official)
