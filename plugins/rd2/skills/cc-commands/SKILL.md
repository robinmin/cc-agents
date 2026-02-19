---
name: cc-commands
description: "This skill should be used when the user mentions creating slash commands, evaluating command quality, fixing command issues, or designing command workflows. Use when: 'creates slash commands', 'writes command frontmatter', 'evaluates command quality', 'fixes command issues'. Common errors: invalid YAML, missing description, command not discovered in plugins."
---

# cc-commands: Claude Code Slash Commands

## Overview

Create, evaluate, and refine Claude Code slash commands that extend AI capabilities with reusable workflows.

## When to Use

Create a new slash command → Invoke command creation
Build a command that does Y → Invoke command creation
Evaluate if a command is production-ready → Invoke quality assessment
Fix command `/xyz` that isn't working → Invoke debugging

Test skill invocation:
Create command → Invoke command creation workflow
Evaluate command → Invoke quality assessment
Fix command → Invoke debugging workflow
Don't trigger on "fix bug" for creation workflows
Don't trigger on "delete command" for evaluation

Use examples:
Create new command: `cp assets/command-template.md plugins/my-plugin/commands/my-command.md`
Evaluate existing command: `rd2:command-evaluate plugins/my-plugin/commands/my-command`
Validate YAML: Check frontmatter syntax

## Quick Start

Create command from template
Apply key quality checks
Consult detailed references

Validate frontmatter - Use valid YAML, proper fields only
Write description - Keep clear, under 60 characters
Format content - Use imperative form, clear instructions
Limit structure - Keep under ~150 lines (thin wrapper!)
Add argument-hint - Document expected arguments

Read `references/frontmatter-reference.md` for field specs
Read `references/ClaudeCodeBuilt-inTools.md` for tools

## Workflows

### Creating a Command

Define Purpose - Identify command scope, arguments, target use case
Design Interface - Choose frontmatter fields, argument pattern
Write Command - Create prompt with clear instructions for Claude
Add Validation - Include input checks, error handling
Test - Verify command works with various inputs
Evaluate - Run quality assessment
Iterate - Address findings until Grade A/B

### Evaluating a Command

Validate Frontmatter - Verify YAML syntax, check valid fields
Check Description - Confirm clear, under 60 chars, specific triggers
Review Content - Ensure imperative form, clear instructions
Measure Structure - Confirm ~150 lines max, progressive disclosure

Apply passing score: >= 80/100

### Refining a Command

Evaluate - Identify gaps and issues
Review - Check all dimensions, especially low scores
Fix Frontmatter issues - Fix YAML, use valid fields only
Fix Description weak - Add specific trigger phrases
Fix Content issues - Use imperative form, add clarity
Re-evaluate - Run evaluation again
Repeat - Continue until Grade A/B achieved

## Architecture: Fat Skills, Thin Wrappers

Apply Fat Skills, Thin Wrappers principle:
Design skills as core logic, workflows, domain knowledge (1,500-2,000 words)
Keep commands as minimal wrappers (~150 lines)
Use agents as minimal orchestrators (~100-150 lines)

If command >150 lines:
Move detailed workflows to `references/`
Delegate complex logic to skills

## Command Structure

Structure commands using this format:
```markdown
---
description: Review code for security issues
allowed-tools: Read, Grep
argument-hint: [file-path]
---

Review this code for security vulnerabilities.
```

Validate frontmatter fields
Use dynamic arguments ($1, $2, @$1)
Apply CLAUDE_PLUGIN_ROOT variable

## Best Practices

Apply naming conventions:
Use full namespace: `plugin-name:command-name`
Never reuse names across commands/skills/agents

Follow component patterns:
Slash Command (simple): verb-noun → `code-review`
Slash Command (grouped): noun-verb → `agent-add`

## Common Issues

Detect and fix issues:
Detect missing frontmatter - Add required frontmatter
Detect second person - Rewrite using imperative form
Detect missing argument-hint - Add argument-hint for $1, $2
Detect commands too long - Move details to references/

Apply fixes:
Fix messages to user - Write FOR Claude
Fix too long description - Keep under 60 chars
Fix second person - Use imperative form
Fix missing validation - Add input checks

Handle edge cases:
Handle empty args - Provide graceful fallback
Handle long args - Validate input length

Handle errors:
Handle invalid YAML - Validate frontmatter syntax
Handle missing fields - Always include description
Handle not discovered - Place in commands/ directory
Handle args not parsed - Use $1, $2 with argument-hint

## DO and DON'T

DO:
Use imperative form
Write FOR Claude
Keep descriptions under 60 chars
Include argument-hint
Add validation
Keep commands lean
Delegate to skills

DON'T:
Use second person
Write messages to user
Exceed 60 chars
Omit argument-hint
Skip validation
Create circular references
Use invalid frontmatter fields
