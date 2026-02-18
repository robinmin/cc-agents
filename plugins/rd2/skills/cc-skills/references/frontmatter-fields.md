# Frontmatter Fields Reference

**Source**: Official Claude Code `skill-development` and `agent-development` skills
**Last Updated**: 2026-02-17

This document defines the valid YAML frontmatter fields for Claude Code skills and agents.

---

## Skill Frontmatter Fields

Skills are defined in `SKILL.md` files within skill directories.

### Required Fields

| Field | Type | Format | Example |
|-------|------|--------|---------|
| `name` | string | hyphen-case, 3-64 chars | `pdf-processor` |
| `description` | string | third-person, 20-1024 chars | `This skill should be used when...` |

### Optional Fields

| Field | Type | Format | Example |
|-------|------|--------|---------|
| `version` | string | semver | `0.1.0` |

### Invalid Fields for Skills

The following fields are **NOT valid** for skills:
- ❌ `allowed-tools` - Not a skill concept
- ❌ `tools` - Agent-only field
- ❌ `model` - Agent-only field
- ❌ `color` - Agent-only field

---

## Agent Frontmatter Fields

Agents are defined in `.md` files within `agents/` directories.

### Required Fields

| Field | Type | Format | Example |
|-------|------|--------|---------|
| `name` | string | lowercase, hyphens, 3-50 chars | `code-reviewer` |
| `description` | string | third-person with `<example>` blocks | See format below |
| `model` | string | inherit/sonnet/opus/haiku | `inherit` |
| `color` | string | blue/cyan/green/yellow/magenta/red | `blue` |

### Optional Fields

| Field | Type | Format | Example |
|-------|------|--------|---------|
| `tools` | array | List of tool names | `["Read", "Write", "Grep"]` |
| `version` | string | semver | `0.1.0` |

### Description Format for Agents

The `description` field must include `<example>` blocks:

```yaml
description: |
  Use this agent when [triggering conditions]. Examples:

  <example>
  Context: [Situation description]
  user: "[User request]"
  assistant: "[How assistant should respond]"
  <commentary>
  [Why this agent should be triggered]
  </commentary>
  </example>
```

---

## Quick Reference

| Component | Required Fields | Optional Fields |
|-----------|----------------|-----------------|
| **Skill** | `name`, `description` | `version` |
| **Agent** | `name`, `description`, `model`, `color` | `tools`, `version` |

---

## Common Mistakes

### Skills
- ❌ Adding `tools`, `model`, `color`, or `allowed-tools` to skills
- ❌ Using second-person in description ("Use this skill when...")
- ❌ Missing trigger phrases in quotes

### Agents
- ❌ Omitting `<example>` blocks in description
- ❌ Using invalid colors (only: blue, cyan, green, yellow, magenta, red)
- ❌ Using invalid models (only: inherit, sonnet, opus, haiku)

---

## Related

- Official: `skill-development` skill (Claude Code)
- Official: `agent-development` skill (Claude Code)
- Local: `references/anatomy.md` - Skill structure
