---
name: cc-commands
description: "Meta-skill for creating, evaluating, and refining Claude Code slash commands. Use when: building new slash commands, writing command frontmatter, designing command workflows, or packaging commands for plugins. Follows progressive disclosure, evaluation-first development, and plugin-based quality assessment."
---

# cc-commands: Claude Code Slash Commands

## Overview

Create, evaluate, and refine Claude Code slash commands that extend AI capabilities with reusable workflows.

## Quick Start

```bash
# 1. Create command from template
cp ${CLAUDE_PLUGIN_ROOT}/skills/cc-commands/assets/command-template.md \
   your-plugin/commands/your-command.md

# 2. Key quality checks:
# - Frontmatter: Valid YAML, proper fields only
# - Description: Clear, under 60 characters
# - Content: Imperative form, clear instructions
# - Structure: Keep under ~150 lines (thin wrapper!)

# 3. For detailed reference, see:
# - references/frontmatter-reference.md
# - references/ClaudeCodeBuilt-inTools.md
# - references/plugin-features-reference.md
```

## Workflows

### Creating a Command

Follow these steps:

1. **Define Purpose** - Identify command scope, arguments, target use case
2. **Design Interface** - Choose frontmatter fields, argument pattern (see `references/frontmatter-reference.md`)
3. **Write Command** - Create prompt with clear instructions for Claude
4. **Add Validation** - Include input checks, error handling
5. **Test** - Verify command works with various inputs
6. **Evaluate** - Run quality assessment
7. **Iterate** - Address findings until Grade A/B

### Evaluating a Command

**Evaluation Dimensions:**

| Dimension | Weight | Focus |
|-----------|--------|-------|
| Frontmatter | 20% | Valid YAML, proper fields only |
| Description | 25% | Clear, under 60 chars, specific triggers |
| Content | 25% | Imperative form, clear instructions |
| Structure | 15% | **~150 lines max**, progressive disclosure |
| Validation | 10% | Input checks, error handling |
| Best Practices | 5% | Naming, no circular references |

**Passing Score:** >= 80/100

### Refining a Command

1. **Evaluate** - Identify gaps and issues
2. **Review** - Check all dimensions, especially low scores
3. **Fix** based on findings:
   - Frontmatter issues? → Fix YAML, use valid fields only
   - Description weak? → Add specific trigger phrases
   - Content issues? → Use imperative form, add clarity
   - Too long? → Move details to skill/references
   - Missing validation? → Add input checks
4. **Re-evaluate** - Run evaluation again
5. **Repeat** - Until Grade A/B achieved

## Architecture: Fat Skills, Thin Wrappers

Follow **Fat Skills, Thin Wrappers**:

- **Skills** = Core logic, workflows, domain knowledge (1,500-2,000 words)
- **Commands** = Minimal wrappers (~150 lines) for human users
- **Agents** = Minimal wrappers (~100-150 lines) for AI workflows

**For detailed patterns**, see `references/ClaudeCodeBuilt-inTools.md`

### Key Rule

**Commands MUST NOT exceed ~150 lines**. If longer:
1. Move detailed workflows to `references/`
2. Delegate complex logic to skills
3. Use templates for reusable patterns

## Command Structure

### File Format

Markdown files with optional YAML frontmatter:

```markdown
---
description: Review code for security issues
allowed-tools: Read, Grep
argument-hint: [file-path]
---

Review this code for security vulnerabilities.
```

**For complete frontmatter reference**, see `references/frontmatter-reference.md`

### Valid Fields (Quick Reference)

| Field | Purpose |
|-------|---------|
| `description` | Brief text for `/help` (~60 chars) |
| `allowed-tools` | Restrict tool access |
| `model` | Specify model: `haiku`, `sonnet`, `opus` |
| `argument-hint` | Document expected arguments |
| `disable-model-invocation` | Prevent programmatic invocation |

**Invalid fields** (DO NOT USE): `skills`, `subagents`, `name`, `version`, `agent`, `context`, `user-invocable`, `triggers`, `examples`

### Dynamic Arguments

```markdown
---
argument-hint: [pr-number] [priority]
---

Review PR #$1 with priority $2.
```

- `$ARGUMENTS` - All arguments as string
- `$1`, `$2`, `$3` - Positional arguments
- `@$1`, `@$2` - File references (auto-read)

## Plugin-Specific Features

**For complete plugin patterns**, see `references/plugin-features-reference.md`

### CLAUDE_PLUGIN_ROOT Variable

Available in plugin commands - resolves to plugin directory:

```markdown
---
description: Run plugin script
allowed-tools: Bash(node:*)
---

Template: @${CLAUDE_PLUGIN_ROOT}/templates/report.md
Script: !`node ${CLAUDE_PLUGIN_ROOT}/bin/process.js $1`
```

**Use for:** Plugin scripts, templates, configuration, resources

### Plugin Discovery

Commands in `plugin-name/commands/` are auto-discovered:

```
plugin-name/
└── commands/
    ├── foo.md              # /foo (plugin:plugin-name)
    └── utils/
        └── helper.md       # /helper (plugin:plugin-name:utils)
```

## Best Practices

### Naming Conventions

1. **ALWAYS use full namespace**: `plugin-name:command-name`
2. **NEVER reuse names** across commands/skills/agents

| Component | Pattern | Example |
|-----------|---------|---------|
| Slash Command (simple) | `verb-noun` | `code-review`, `deploy-app` |
| Slash Command (grouped) | `noun-verb` | `agent-add`, `task-create` |
| Skill | `verb-ing-noun` | `reviewing-code` |
| Subagent | `role-agent` | `code-reviewer-agent` |

### Command Length (CRITICAL)

**Commands are thin wrappers (~150 lines maximum)**

| Component | Size | Purpose |
|-----------|------|---------|
| Command | ~150 lines | Frontmatter + instructions |
| Skill | 1,500-2,000 words | Core knowledge, workflows |
| Agent | ~100-150 lines | Orchestration, delegates to skill |

**If command >150 lines:**
1. Move detailed workflows to `references/`
2. Delegate complex logic to skills
3. Use templates for reusable patterns

**Example - Too Long (❌):**
```markdown
---
description: Complex deployment workflow
---
[200 lines of detailed instructions...]
```

**Example - Lean (✅):**
```markdown
---
description: Deploy with validation
allowed-tools: Bash(*), Read
---

Deploy to $1:
1. Validate: !`bash ${CLAUDE_PLUGIN_ROOT}/scripts/validate.sh $1`
2. Deploy: !`bash ${CLAUDE_PLUGIN_ROOT}/scripts/deploy.sh $1`

See `deployment-workflow` skill for patterns.
```

### Writing Guidelines

- Use imperative form: "Review code" not "You should review"
- Description: Clear, actionable, under 60 characters
- Body: Instructions FOR Claude, not messages TO user
- Add usage examples in comments
- Validate inputs, handle errors gracefully

## Quality Checklist

**Frontmatter:**
- [ ] Valid YAML (if used)
- [ ] Description under 60 characters
- [ ] Only valid fields (no skills, subagents, etc.)

**Command Length (CRITICAL):**
- [ ] Under ~150 lines total
- [ ] Detailed content in references/
- [ ] Complex workflows delegated to skills

**Content:**
- [ ] argument-hint matches positional args
- [ ] Imperative form throughout
- [ ] Instructions FOR Claude, not TO user
- [ ] Input validation included
- [ ] Usage examples provided

**Quality:**
- [ ] Score >= 80/100
- [ ] No circular references
- [ ] Follows naming conventions

## Progressive Disclosure

Three-level loading:

1. **Metadata** (description) - Always loaded (~50 words)
2. **Command body** - When invoked (<1k words ideal)
3. **Resources** - Templates, scripts, references (as needed)

**Key pattern:** Keep command lean, move details to references/.

## Evaluation Principles

**Design Principles:**

1. Commands are Code - Quality standards apply
2. Instructions FOR Claude - Not messages TO user
3. Progressive Disclosure - Lean commands, detailed references
4. Validation First - Check inputs before processing
5. Consistent Patterns - Follow conventions
6. Plugin Awareness - Use `${CLAUDE_PLUGIN_ROOT}`
7. Quality Focus - Target >= 80/100

## Red Flags (Stop and Investigate)

- Missing frontmatter when command needs arguments
- Description uses second person ("You should...")
- Command body addresses user instead of Claude
- No argument-hint when using $1, $2
- Destructive operations without disable-model-invocation
- Commands too long (>200 lines signals problem)
- Missing validation for user arguments

## Anti-Patterns

| Anti-Pattern | Fix |
|--------------|-----|
| Messages to user | Write instructions FOR Claude |
| Too long description | Keep under 60 characters |
| Second person | Use imperative form |
| No argument-hint | Document arguments |
| Command too long | Move details to skill |
| Missing validation | Add input checks |
| Generic names | Use specific names |

## DO and DON'T

**DO:**
- Use imperative form: "Review code" not "You should review"
- Write FOR Claude, not TO user
- Keep descriptions under 60 characters
- Include argument-hint for arguments
- Add validation for inputs
- Keep commands lean (~150 lines max)
- Delegate to skills for complex workflows

**DON'T:**
- Use second person ("You should...")
- Write messages to user in command body
- Exceed 60 chars in description
- Omit argument-hint when using $1, $2
- Skip validation for user arguments
- Include detailed explanations (move to skill)
- Reference commands/skills that use this (circular)

## References

**Detailed guidance in bundled resources:**

- **`references/frontmatter-reference.md`** - Complete frontmatter field specifications
- **`references/ClaudeCodeBuilt-inTools.md`** - Built-in tools (Task, Bash, SlashCommand, AskUserQuestion)
- **`references/plugin-features-reference.md`** - Plugin-specific features and patterns

**External:**
- [Claude Code Commands Docs](https://code.claude.com/docs/en/commands)
- [GitHub #14945](https://github.com/anthropics/claude-code/issues/14945) - Name collision issues
