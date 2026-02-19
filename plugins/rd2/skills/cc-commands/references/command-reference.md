# cc-commands: Detailed Reference

## Frontmatter Fields

### Required Fields
- `description` - Brief text for `/help` (~60 chars max)

### Optional Fields
- `allowed-tools` - Restrict tool access
- `model` - Specify model: `haiku`, `sonnet`, `opus`
- `argument-hint` - Document expected arguments
- `disable-model-invocation` - Prevent programmatic invocation

### Invalid Fields (DO NOT USE)
- `skills`, `subagents`, `name`, `version`, `agent`, `context`, `user-invocable`, `triggers`, `examples`

## Dynamic Arguments

```markdown
---
argument-hint: [pr-number] [priority]
---

Review PR #$1 with priority $2.
```

- `$ARGUMENTS` - All arguments as string
- `$1`, `$2`, `$3` - Positional arguments
- `@$1`, `@$2` - File references (auto-read)

## CLAUDE_PLUGIN_ROOT Variable

Available in plugin commands - resolves to plugin directory:

```markdown
---
description: Run plugin script
allowed-tools: Bash(node:*)
---

Template: @${CLAUDE_PLUGIN_ROOT}/templates/report.md
Script: !`node ${CLAUDE_PLUGIN_ROOT}/bin/process.js $1`
```

## Plugin Discovery

Commands in `plugin-name/commands/` are auto-discovered:

```
plugin-name/
└── commands/
    ├── foo.md              # /foo (plugin:plugin-name)
    └── utils/
        └── helper.md       # /helper (plugin:plugin-name:utils)
```

## Naming Conventions

| Component | Pattern | Example |
|-----------|---------|---------|
| Slash Command (simple) | `verb-noun` | `code-review`, `deploy-app` |
| Slash Command (grouped) | `noun-verb` | `agent-add`, `task-create` |
| Skill | `verb-ing-noun` | `reviewing-code` |
| Subagent | `role-agent` | `code-reviewer-agent` |

## Complete Command Template

```markdown
---
description: Your command description here
allowed-tools: Read, Grep, Bash
argument-hint: [argument-name]
model: sonnet
---

Your command instructions here.
Use imperative form. Write FOR Claude, not TO user.

## Examples

$1: example expected input
→ output

## Validation

Validate inputs before processing.
```

## Evaluation Dimensions

| Dimension | Weight | Focus |
|-----------|--------|-------|
| Frontmatter | 20% | Valid YAML, proper fields only |
| Description | 25% | Clear, under 60 chars, specific triggers |
| Content | 25% | Imperative form, clear instructions |
| Structure | 15% | **~150 lines max**, progressive disclosure |
| Validation | 10% | Input checks, error handling |
| Best Practices | 5% | Naming, no circular references |

**Passing Score:** >= 80/100
