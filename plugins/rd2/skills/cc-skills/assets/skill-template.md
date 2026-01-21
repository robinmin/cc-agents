---
name: {{skill_name}}
description: [TODO: Clear description of what this skill does AND when to use it. Include specific scenarios, file types, or triggers. This is Claude's primary mechanism for knowing when to use your skill.]
---

# {{skill_title}}

## Overview

[TODO: 1-2 sentences explaining what this skill enables]

## Quick Start

[TODO: Add minimal working example or command]

## Workflows

### Creating [Output Type]

[TODO: For complex skills, add workflow steps. For simple tools (single action like convert/extract/resize), you may omit this section.]

**Workflow:**

1. **[Step 1]** - [Brief description]
   - [Action or command]
   - [Validation if needed]

2. **[Step 2]** - [Brief description]
   - [Action or command]

**Feedback Loop:**
```
validate → fix issues → re-validate → proceed
```

[TODO: For complex multi-step tasks, use this pattern. For simple single-action tools, remove this section.]

### Refining Existing [Output Type]

[TODO: If applicable, add iteration workflow]

1. **Evaluate** - Check current quality/state
2. **Identify issues** - Note what needs improvement
3. **Implement fixes** - Make specific changes
4. **Re-validate** - Verify improvements

[TODO: Remove if not applicable]

## Architecture (Optional)

[TODO: For complex skills with multiple components, explain the "Fat Skills, Thin Wrappers" pattern as needed]

## Core Principles (Optional)

[TODO: Add key principles specific to this skill]

### Concise is Key

The context window is a public good. Only add what Claude doesn't already know.

### Progressive Disclosure

Keep SKILL.md lean. Move detailed reference material to `references/` files.

## Skill Structure

```
{{skill_name}}/
├── SKILL.md          # This file
├── scripts/          # Executable code (delete if not needed)
├── references/       # Documentation loaded as needed (delete if not needed)
└── assets/           # Files used in output (delete if not needed)
```

## Bundled Resources

### scripts/ (Optional)

Executable code for fragile/repeated tasks.
Delete this directory if not needed.

### references/ (Optional)

Documentation loaded as needed during work.
Delete this directory if not needed.

### assets/ (Optional)

Files used in output (templates, images, fonts).
Delete this directory if not needed.

## Configuration (Optional)

[TODO: Add configuration options if applicable]

```yaml
# Example: .{{skill_name}}.yaml
option: value
```

## Best Practices

<!-- TODO: Add skill-specific best practices here -->

---

## Before Publishing

**Validation Checklist:**
- [ ] Description clearly states what skill does AND when to use it
- [ ] Workflow section present (if complex skill) OR removed (if simple tool)
- [ ] Workflows are IN this file, not just external links
- [ ] No unresolved TODO placeholders
- [ ] Examples or code blocks included
- [ ] SKILL.md under 500 lines
- [ ] All scripts tested and working

**Quality Check:**
```bash
# Validate structure
scripts/skills.py validate <skill-path>

# Evaluate quality
scripts/skills.py evaluate <skill-path>

# Target: Grade A or B (9.0+ or 7.0+)
```

**For help:**
- Comprehensive guide: See [Skill Creation Workflow](https://github.com/anthropics/claude-code/blob/main/docs/skill-creation.md)
- Best practices: See [Agent Skills Best Practices](https://github.com/anthropics/claude-code/blob/main/docs/agent-skills-best-practices.md)
