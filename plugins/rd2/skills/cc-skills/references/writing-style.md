# Writing Style Guide for Claude Code Skills

This reference provides detailed guidance on writing effective skills for Claude Code plugins.

## Overview

Skills are written for another instance of Claude to use. The writing style should be clear, directive, and optimized for AI consumption.

## Core Principles

### 1. Imperative/Infinitive Form

Write using verb-first instructions, not second person. This maintains clarity and directness for AI consumption.

**Correct (imperative):**
```
To create a hook, define the event type.
Configure the MCP server with authentication.
Validate settings before use.
Parse the frontmatter using sed.
Extract fields with grep.
```

**Incorrect (second person):**
```
You should create a hook by defining the event type.
You need to configure the MCP server.
You must validate settings before use.
You can parse the frontmatter...
Claude should extract fields...
```

### 2. Third-Person in Description

The frontmatter description must use third person format. This is critical for skill triggering.

**Correct:**
```yaml
---
name: hook-development
description: This skill should be used when the user asks to "create a hook", "add a PreToolUse hook", "validate tool use", "implement prompt-based hooks", or mentions hook events (PreToolUse, PostToolUse, Stop).
---
```

**Incorrect:**
```yaml
---
description: Use this skill when you want to create hooks...
description: Load when user needs hook help...
description: Provides hook guidance.  # Too vague
---
```

### 3. Objective, Instructional Language

Focus on what to do, not who should do it. Use neutral, objective language.

**Correct:**
```
Parse the frontmatter using sed.
Extract fields with grep.
Validate values before use.
```

**Incorrect:**
```
You can parse the frontmatter...
Claude should extract fields...
The user might validate values...
```

## SKILL.md Structure

### Frontmatter

The frontmatter is the primary trigger mechanism. Make it specific and actionable.

**Required fields:**
- `name`: Short, descriptive name (hyphen-case)
- `description`: When to use this skill (third person, specific phrases)

**Optional fields:**
- `version`: Skill version (semver)

### Body Structure

1. **Overview/Quick Start** - Essential for understanding
2. **Workflows** - Step-by-step procedures
3. **Reference pointers** - Links to detailed docs
4. **Examples** - Concrete usage patterns

## Description Best Practices

### Include Specific Trigger Phrases

The description should contain exact phrases users would say that should trigger the skill.

**Good example:**
```yaml
description: This skill should be used when the user asks to "create a hook", "add a PreToolUse hook", "validate tool use", "implement prompt-based hooks", or mentions hook events (PreToolUse, PostToolUse, Stop).
```

**Why good:**
- Third person format
- Specific trigger phrases
- Concrete scenarios
- Covers variations

### Bad Descriptions and Fixes

❌ **Bad:**
```yaml
description: Use this skill when working with hooks.
```
**Issues:** Second person, vague, no trigger phrases

✅ **Fix:**
```yaml
description: This skill should be used when the user asks to "create a hook", "add a PreToolUse hook", or mentions hook events.
```

❌ **Bad:**
```yaml
description: Provides hook guidance.
```
**Issues:** No trigger phrases, too vague

✅ **Fix:**
```yaml
description: This skill should be used when the user needs hook development guidance, asks to "implement a hook", or mentions PreToolUse/PostToolUse events.
```

## Progressive Disclosure in Writing

### SKILL.md (Always Loaded)

Keep SKILL.md focused on essential information:
- Core concepts (briefly)
- Essential workflows
- Quick reference tables
- Pointers to detailed resources

**Target:** 1,500-2,000 words ideal, <5,000 words maximum

### references/ (Loaded as Needed)

Move detailed content to references/:
- Comprehensive patterns → `references/patterns.md`
- Advanced techniques → `references/advanced.md`
- API documentation → `references/api-reference.md`
- Migration guides → `references/migration.md`
- Edge cases → `references/troubleshooting.md`

## Examples in Skills

### Good Example Format

```markdown
### Example: Creating a Hook

**Context:** User wants to add a PreToolUse hook
**Query:** "Add a hook to validate tool use"

**Workflow:**
1. Create `.claude/hooks/pre-tool-use.json`
2. Define the hook script
3. Test with `./scripts/test-hook.sh`

**Result:** Hook validates before tool execution
```

### Bad Example Format

```markdown
Example:
(too verbose, unclear structure)
```

## Common Writing Patterns

### Procedures and Workflows

Use numbered lists for sequential steps:
```markdown
1. Validate input
2. Process data
3. Return result
```

### Options and Choices

Use bullet lists for choices:
```markdown
- **Option 1**: Use scripts for repeated code
- **Option 2**: Use references for documentation
- **Option 3**: Use assets for templates
```

### Code Examples

Use fenced code blocks with language:
````markdown
```python
def validate_hook(hook_data):
    # validation logic
    return result
```
````

### Warnings and Important Notes

Use callout boxes:
```markdown
> **IMPORTANT:** Always validate hooks before deployment.
>
> Failure to validate may cause unexpected behavior.
```

## Checklist

Before finalizing SKILL.md:

**Writing Style:**
- [ ] Uses imperative/infinitive form throughout
- [ ] Description uses third person
- [ ] Description includes specific trigger phrases
- [ ] No "you should", "you can", "you must" anywhere
- [ ] Objective, instructional language

**Structure:**
- [ ] Frontmatter has name and description
- [ ] Body has clear sections with headings
- [ ] Examples are formatted consistently
- [ ] Code blocks have language specified

**Content:**
- [ ] Focused on essential information
- [ ] Detailed content moved to references/
- [ ] References are properly linked
- [ ] Examples are concrete and complete

**Progressive Disclosure:**
- [ ] SKILL.md is lean (<5k words)
- [ ] Detailed docs in references/
- [ ] References are properly linked from SKILL.md
- [ ] No duplication between SKILL.md and references/

## Quick Reference

| Writing Aspect | Correct Pattern | Incorrect Pattern |
|---------------|----------------|------------------|
| **Description** | "This skill should be used when..." | "Use this skill when..." |
| **Instructions** | "Create X by doing Y" | "You should create X..." |
| **Triggers** | Specific phrases | Generic descriptions |
| **Tone** | Objective, instructional | Conversational |
| **Length** | Lean, focused | Verbose, repetitive |

For more comprehensive guidance, see the main SKILL.md file.
