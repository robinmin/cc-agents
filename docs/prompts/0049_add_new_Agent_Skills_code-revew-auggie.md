---
name: add new Agent Skills code-revew-auggie
description: <prompt description>
status: Done
created_at: 2026-01-22 12:13:46
updated_at: 2026-01-22 13:35:05
---

## Implementation Summary

The `code-review-auggie` skill has been successfully implemented with all 5 required commands:

### Implemented Files

1. **`plugins/rd2/skills/code-review-auggie/scripts/code-review-auggie.py`** (~900 lines)
   - `check` - Validate Auggie MCP availability by checking configured MCP servers
   - `run` - Execute short prompts via Claude Code CLI
   - `run-file` - Execute long prompts from a file
   - `review` - Comprehensive code review with structured output
   - `import` - Convert review results to task files using tasks CLI

2. **`plugins/rd2/skills/code-review-auggie/tests/test_code_review_auggie.py`** (~600 lines)
   - Complete unit tests for all commands
   - Tests for result types (CheckResult, RunResult, ReviewIssue)
   - Tests for utility functions
   - Tests for command workflows
   - Integration tests for end-to-end workflows

3. **`plugins/rd2/skills/code-review-auggie/tests/__init__.py`** - Test module initialization

### Key Implementation Details

- Uses `claude mcp list --json` to detect configured Auggie MCP server
- Uses `claude ask` command to interact with Auggie for prompts and reviews
- Compatible with existing prompt templates (review_prompt.md, planning_prompt.md)
- Compatible with existing output template (code-review-result.md)
- Follows the same CLI interface as code-review-gemini for consistency

### Command Usage

```bash
# Validate Auggie MCP availability
python3 plugins/rd2/skills/code-review-auggie/scripts/code-review-auggie.py check

# Run a short prompt
python3 plugins/rd2/skills/code-review-auggie/scripts/code-review-auggie.py run "Explain this function"

# Run a long prompt from file
python3 plugins/rd2/skills/code-review-auggie/scripts/code-review-auggie.py run-file prompt.txt

# Comprehensive code review
python3 plugins/rd2/skills/code-review-auggie/scripts/code-review-auggie.py review src/auth/ --focus security

# Architecture planning
python3 plugins/rd2/skills/code-review-auggie/scripts/code-review-auggie.py review src/ --plan

# Import review results as tasks
python3 plugins/rd2/skills/code-review-auggie/scripts/code-review-auggie.py import docs/plans//review.md
```

## 0049. add new Agent Skills code-revew-auggie

### Background

As we already implemented `code-review-gemini` plugins/rd2/skills/code-review-gemini for plugin rd2 which leverage Gemini CLI to provide a powerful code review tool, we also need to implement `code-review-auggie` plugins/rd2/skills/code-review-auggie for plugin rd2 which leverage Augment Context Engine MCP(mcp auggie-mcp which already installed and enabled in Claude Code) to provide a powerful code review tool.

To ensure we can use both `code-review-gemini` and `code-review-auggie` skills in the same way, we need to provide the same interface for both skills. This will allow users to easily switch between the two skills without having to learn a new set of commands or syntax or having different configurations. Of course, within the skill itself, we will have some slight differences in implementation details.

I already use `/rd2:skill-add rd2 code-review-auggie` to generate the skeleton for skill `code-review-auggie` in @plugins/rd2/skills/code-review-auggie. You need to implement it.

### Requirements / Objectives

#### Implement `plugins/rd2/skills/code-review-auggie/scripts/code-review-auggie.py` with the following 5 commands:

- ✅ check - Validate mcp auggie-mcp already installed and enabled in Claude Code
- ✅ run - Execute short prompts
- ✅ run-file - Execute long prompts
- ✅ review - Comprehensive code review
- ✅ import - Convert reviews to tasks (NEW!)

We need to base on the original implementation of `plugins/rd2/skills/code-review-gemini/scripts/code-review-gemini.py` then to adapt with current solution. For the command line, you can refer to [auggie CLI Flags and Options](https://docs.augmentcode.com/cli/reference) or for [Quickstart - Augment Context Engine MCP with Claude Code](https://docs.augmentcode.com/context-services/mcp/quickstart-claude-code).

And, you also need to add relevant unit tests for each command into `@plugins/rd2/skills/code-review-auggie/tests`

#### Adjust the content of `plugins/rd2/skills/code-review-auggie/SKILL.md`

Based on above implementation and the content of `plugins/rd2/skills/code-review-gemini/SKILL.md`, we need to adjust the content of `plugins/rd2/skills/code-review-auggie/SKILL.md` to provide the same interface for both skills.

#### adjust the plugins/rd2/skills/code-review-auggie/references

based on above implementation and the original source of `plugins/rd2/skills/code-review-gemini/references`

### Solutions / Goals

### References

- [Quickstart - Augment Context Engine MCP with Claude Code](https://docs.augmentcode.com/context-services/mcp/quickstart-claude-code)
- [auggie CLI Flags and Options](https://docs.augmentcode.com/cli/reference)
