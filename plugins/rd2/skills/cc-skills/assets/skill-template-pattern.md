---
name: {{skill_name}}
description: "This skill should be used when the user asks about '{{skill_name}} pattern', 'when to use {{skill_name}}', or faces [TODO: specific decision/problem type]. Provides mental model for [TODO: category of decisions]."
---

# {{skill_title}}

A way of thinking about [TODO: problem category].

## The Pattern

[TODO: 2-3 sentence explanation of the core insight]

**Key Insight:** [TODO: The fundamental principle in one sentence]

## When to Apply

Use this pattern when:

- [TODO: Specific situation 1]
- [TODO: Specific situation 2]
- [TODO: Symptom or trigger that indicates this pattern applies]

## When NOT to Apply

Avoid this pattern when:

- [TODO: Situation where pattern doesn't fit]
- [TODO: Edge case where alternative is better]
- [TODO: Anti-pattern scenario]

**Alternative for these cases:** [TODO: What to use instead]

## Core Principles

### Principle 1: [Name]

[TODO: Explanation of the principle]

**Example:**
```
[TODO: Concrete example showing principle in action]
```

### Principle 2: [Name]

[TODO: Explanation of the principle]

**Example:**
```
[TODO: Concrete example showing principle in action]
```

### Principle 3: [Name]

[TODO: Explanation of the principle]

## Decision Framework

```
IF [condition 1]:
    → Apply [approach A]
ELIF [condition 2]:
    → Apply [approach B]
ELSE:
    → Consider [alternative pattern]
```

## Trade-offs

| Approach | Pros | Cons | Best For |
|----------|------|------|----------|
| [TODO: Option A] | [TODO] | [TODO] | [TODO] |
| [TODO: Option B] | [TODO] | [TODO] | [TODO] |

## Examples

### Example 1: [Scenario Name]

**Situation:** [TODO: Describe the situation]

**Applying the pattern:**
```
[TODO: How the pattern guides the decision]
```

**Result:** [TODO: Outcome]

### Example 2: [Scenario Name]

**Situation:** [TODO: Describe the situation]

**Applying the pattern:**
```
[TODO: How the pattern guides the decision]
```

**Result:** [TODO: Outcome]

## Anti-Patterns

### Anti-Pattern 1: [Name]

**What it looks like:** [TODO: Description]

**Why it's problematic:** [TODO: Explanation]

**Better approach:** [TODO: Alternative]

## Skill Structure

```
{{skill_name}}/
├── SKILL.md          # This file (the pattern)
└── references/       # Detailed case studies (if needed)
```

---

## Before Publishing

**Validation Checklist:**
- [ ] Core insight is clear in one sentence
- [ ] When/When NOT sections are specific
- [ ] Examples show pattern applied to real scenarios
- [ ] Trade-offs table helps decision-making
- [ ] No unresolved TODO placeholders

**Quality Check:**
```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py validate <skill-path>
python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py evaluate <skill-path>
# Target: Grade A or B
```
