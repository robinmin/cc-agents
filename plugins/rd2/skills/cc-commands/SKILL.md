---
name: cc-commands
description: "Meta-skill for creating, evaluating, and refining Claude Code slash commands. Use when: building new slash commands, writing command frontmatter, designing command workflows, or packaging commands for plugins. Follows progressive disclosure, evaluation-first development, and plugin-based quality assessment."
---

# cc-commands: Claude Code Slash Commands

## Overview

Create, evaluate, and refine Claude Code slash commands that extend AI capabilities with reusable workflows. Use this skill when building new slash commands, writing command frontmatter, evaluating command quality, or packaging commands for plugins.

## Quick Start

```bash
# Evaluate an existing command (comprehensive quality assessment)
/rd2:command-evaluate .claude/commands/my-command.md

# Create a new command from template
/rd2:command-add rd2 review-code

# Refine an existing command
/rd2:command-refine .claude/commands/deploy.md
```

## Workflows

### Creating a Command

**Task Progress:**

- [ ] **Step 1: Define Purpose** - Identify command scope, arguments, target use case
- [ ] **Step 2: Design Interface** - Choose frontmatter fields, argument pattern
- [ ] **Step 3: Write Command** - Create prompt with clear instructions for Claude
- [ ] **Step 4: Add Validation** - Include input checks, error handling
- [ ] **Step 5: Test** - Verify command works with various inputs
- [ ] **Step 6: Evaluate** - Run quality assessment
- [ ] **Step 7: Iterate** - Address findings until Grade A/B

### Evaluating a Command

**Evaluation Dimensions:**

| Dimension | Weight | What It Measures |
|-----------|--------|------------------|
| Frontmatter | 20% | Valid YAML, required fields, proper usage |
| Description | 25% | Clear, concise, specific trigger phrases |
| Content | 25% | Imperative form, clear instructions, examples |
| Structure | 15% | Progressive disclosure, organization |
| Validation | 10% | Input checks, error handling |
| Best Practices | 5% | Naming conventions, documentation |

**Passing Score:** >= 80/100

### Refining a Command

**Use this workflow:**

1. **Evaluate current quality** - Identify gaps and issues
2. **Review findings** - Check all dimensions, especially low scores
3. **Determine action:**
   - Frontmatter issues? → Fix YAML, add required fields
   - Description weak? → Add specific trigger phrases, improve clarity
   - Content issues? → Use imperative form, add clarity
   - Missing validation? → Add input checks, error handling
4. **Implement fixes** - Edit command file
5. **Re-evaluate** - Run evaluation again
6. **Repeat** - Continue until Grade A/B achieved

## Architecture: Fat Skills, Thin Wrappers

Follow the **Fat Skills, Thin Wrappers** pattern:

- **Skills** contain all core logic, workflows, and domain knowledge
- **Commands** are minimal wrappers (~50 lines) that invoke skills for human users
- **Agents** are minimal wrappers (~100 lines) that invoke skills for AI workflows

### Hybrid Approach for Complex Commands

**Command Layer (.md files)** - Use pseudocode with built-in tools (Task, SlashCommand, AskUserQuestion), explicit workflow sequences, self-documenting specifications

**Agent Layer (.md agents)** - Use flexible natural language with conditional logic, adaptive behavior, error handling and retries

### Built-in Tools for Orchestration

| Tool | Purpose | Example |
|------|---------|---------|
| `Task` | Delegate to subagent | `Task(subagent_type="command-expert", prompt="...")` |
| `SlashCommand` | Call another command | `SlashCommand(skill="rd2:command-refine", args="...")` |
| `AskUserQuestion` | Interactive user input | Ask clarifying questions with options |

## Command Structure

### File Format

Commands are Markdown files with optional YAML frontmatter:

```markdown
---
description: Review code for security issues
allowed-tools: Read, Grep
model: sonnet
argument-hint: [file-path]
---

Review this code for security vulnerabilities including:
- SQL injection
- XSS attacks
- Authentication bypass
```

### Frontmatter Fields

| Field | Type | Purpose | Default |
|-------|------|---------|---------|
| `description` | String | Brief description for `/help` | First line of prompt |
| `allowed-tools` | String/Array | Restrict tool access | Inherit from conversation |
| `model` | String | Model to use (sonnet/opus/haiku) | Inherit from conversation |
| `argument-hint` | String | Document expected arguments | None |
| `disable-model-invocation` | Boolean | Prevent programmatic invocation | false |

### Dynamic Arguments

Capture user input using argument variables:

```markdown
---
argument-hint: [pr-number] [priority]
---

Review PR #$1 with priority $2.
After review, assign to $3.
```

- `$ARGUMENTS` - All arguments as single string
- `$1`, `$2`, `$3` - Positional arguments
- `@$1`, `@$2` - File references (auto-read file)

## Plugin-Specific Features

### CLAUDE_PLUGIN_ROOT Variable

Plugin commands have access to `${CLAUDE_PLUGIN_ROOT}`:

```markdown
---
description: Run plugin script
allowed-tools: Bash(node:*)
---

Example: Use inline bash with node to run plugin scripts.

Template: @${CLAUDE_PLUGIN_ROOT}/templates/report.md
```

**Use when:**
- Execute plugin scripts
- Load plugin configuration
- Access plugin templates
- Reference plugin resources

### Plugin Command Discovery

Commands in `plugin-name/commands/` are auto-discovered:

```
plugin-name/
└── commands/
    ├── foo.md              # /foo (plugin:plugin-name)
    └── utils/
        └── helper.md       # /helper (plugin:plugin-name:utils)
```

## Best Practices

### Naming Conventions (CRITICAL)

1. **ALWAYS use full namespace** for plugin commands: `plugin-name:command-name`
   - When referencing commands in documentation, use full namespace

2. **NEVER reuse names** across components
   - Slash commands, skills, and agents must have UNIQUE names
   - Skills take precedence over commands with same name (blocks user invocation)

| Component | Naming Pattern | Example |
|-----------|---------------|---------|
| Slash Command (simple) | `verb-noun` | `code-review` |
| Slash Command (grouped) | `noun-verb` | `agent-add`, `command-evaluate` |
| Skill | `verb-ing-noun` | `reviewing-code` |
| Subagent | `role-agent` | `code-reviewer-agent` |

**Slash Command Grouping Rule:**
- When multiple slash commands share the same domain, use `noun-verb` format
- This groups related commands together alphabetically: `command-add.md`, `command-evaluate.md`, `command-refine.md`

### Writing Guidelines

- **Use imperative/infinitive form** ("Review this code", not "You should review")
- **Frontmatter description**: Clear, actionable, under 60 characters
- **Body**: Instructions FOR Claude (not messages TO user)
- **Examples**: Add usage examples in comments
- **Validation**: Check inputs, handle errors gracefully

### Common Anti-Patterns

| Anti-Pattern | Issue | Fix |
|--------------|-------|-----|
| Messages to user | Wrong audience | Write instructions FOR Claude |
| Too long description | Clutters `/help` | Keep under 60 characters |
| Second person | Inconsistent style | Use imperative form |
| Missing validation | Poor UX | Add input checks |
| No argument-hint | Bad discoverability | Document arguments |

## Quality Checklist

Before completing a command:

- [ ] Valid YAML frontmatter (if used)
- [ ] Clear description under 60 characters
- [ ] argument-hint matches positional arguments
- [ ] Body uses imperative form
- [ ] Instructions FOR Claude, not TO user
- [ ] Input validation included (if applicable)
- [ ] Error handling documented
- [ ] Usage examples provided
- [ ] Evaluation score >= 80/100

## Progressive Disclosure

Three-level loading system manages context efficiently:

1. **Metadata** (description) - Always loaded (~50 words)
2. **Command body** - When command invoked (<1k words ideal)
3. **Bundled resources** - Plugin templates, scripts (as needed)

**Key pattern:** Keep command body lean. Move detailed examples to plugin documentation.

## References

### Bundled Resources

- **[`references/ClaudeCodeBuilt-inTools.md`](references/ClaudeCodeBuilt-inTools.md)** - Complete built-in tools reference (Task, Bash, SlashCommand, AskUserQuestion)
- **[`references/frontmatter-reference.md`](references/frontmatter-reference.md)** - YAML frontmatter field specifications
- **[`references/plugin-features-reference.md`](references/plugin-features-reference.md)** - Plugin-specific features and patterns

### External References

- [Claude Code Commands Documentation](https://code.claude.com/docs/en/commands)
- [GitHub Issue #14945](https://github.com/anthropics/claude-code/issues/14945) - Slash commands blocked by skill name collision
