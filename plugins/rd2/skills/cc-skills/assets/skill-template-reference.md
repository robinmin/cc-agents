---
name: {{skill_name}}
description: "This skill should be used when the user asks about '[TODO: API/tool name]', needs to look up '[TODO: syntax/commands]', or mentions [TODO: specific terms]. Provides reference documentation for [TODO: domain]."
---

# {{skill_title}}

Reference documentation for [TODO: API/tool/domain].

## Quick Reference

| Command/Method | Description | Example |
|----------------|-------------|---------|
| [TODO] | [TODO] | `[TODO]` |
| [TODO] | [TODO] | `[TODO]` |
| [TODO] | [TODO] | `[TODO]` |

## Installation / Setup

```bash
# [TODO: Installation command]
```

**Prerequisites:**
- [TODO: Requirement 1]
- [TODO: Requirement 2]

## Core API

### [Category 1]

#### `[method/command name]`

[TODO: Brief description]

**Syntax:**
```
[TODO: Syntax with placeholders]
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| [TODO] | [TODO] | Yes/No | [TODO] |
| [TODO] | [TODO] | Yes/No | [TODO] |

**Returns:** [TODO: Return type and description]

**Example:**
```
[TODO: Working example]
```

#### `[method/command name]`

[TODO: Brief description]

**Syntax:**
```
[TODO: Syntax with placeholders]
```

**Example:**
```
[TODO: Working example]
```

### [Category 2]

#### `[method/command name]`

[TODO: Brief description]

**Example:**
```
[TODO: Working example]
```

## Configuration

```yaml
# [TODO: Configuration file example]
option1: value1
option2: value2
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| [TODO] | [TODO] | [TODO] | [TODO] |
| [TODO] | [TODO] | [TODO] | [TODO] |

## Common Patterns

### Pattern 1: [Name]

```
[TODO: Code example for common use case]
```

### Pattern 2: [Name]

```
[TODO: Code example for common use case]
```

## Error Reference

| Error | Cause | Solution |
|-------|-------|----------|
| [TODO: Error message] | [TODO] | [TODO] |
| [TODO: Error message] | [TODO] | [TODO] |

## Skill Structure

```
{{skill_name}}/
├── SKILL.md          # This file (quick reference)
└── references/       # Detailed API docs (if extensive)
    ├── methods.md    # Full method reference
    └── examples.md   # Extended examples
```

## See Also

- [TODO: Official documentation URL]
- [TODO: Related tool/API]

---

## Before Publishing

**Validation Checklist:**
- [ ] Quick reference table at top for fast lookup
- [ ] All methods/commands have syntax and examples
- [ ] Parameter tables are complete
- [ ] Error reference covers common issues
- [ ] No unresolved TODO placeholders

**Quality Check:**
```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py validate <skill-path>
python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py evaluate <skill-path>
# Target: Grade A or B
```
