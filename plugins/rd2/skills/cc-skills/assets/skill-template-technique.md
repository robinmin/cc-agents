---
name: {{skill_name}}
description: "This skill should be used when the user asks to 'apply {{skill_name}}', 'use {{skill_name}} technique', or mentions [TODO: specific scenarios]. Provides step-by-step methodology for [TODO: concrete outcome]."
---

# {{skill_title}}

Concrete method with repeatable steps for [TODO: specific outcome].

## When to Use

- [TODO: Specific trigger scenario 1]
- [TODO: Specific trigger scenario 2]
- [TODO: Error message or symptom that triggers this]

## When NOT to Use

- [TODO: Scenario where this technique doesn't apply]
- [TODO: Alternative approach for edge cases]

## Quick Start

```bash
# [TODO: Minimal command or code example]
```

## The Technique

### Step 1: [Action Name]

[TODO: Clear, imperative instruction]

```bash
# [TODO: Code example]
```

**Checkpoint:** [TODO: How to verify this step succeeded]

### Step 2: [Action Name]

[TODO: Clear, imperative instruction]

```bash
# [TODO: Code example]
```

**Checkpoint:** [TODO: How to verify this step succeeded]

### Step 3: [Action Name]

[TODO: Clear, imperative instruction]

**Checkpoint:** [TODO: How to verify this step succeeded]

## Feedback Loop

```
execute step → verify checkpoint → if failed, diagnose → retry step → proceed
```

## Common Mistakes

### Mistake 1: [Name]

❌ **Wrong:**
```
[TODO: What people do wrong]
```

✅ **Correct:**
```
[TODO: What to do instead]
```

### Mistake 2: [Name]

❌ **Wrong:**
```
[TODO: What people do wrong]
```

✅ **Correct:**
```
[TODO: What to do instead]
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| [TODO: Error/symptom] | [TODO: Root cause] | [TODO: Solution] |
| [TODO: Error/symptom] | [TODO: Root cause] | [TODO: Solution] |

## Skill Structure

```
{{skill_name}}/
├── SKILL.md          # This file (the technique)
├── scripts/          # Automation scripts (if needed)
└── references/       # Detailed explanations (if needed)
```

---

## Before Publishing

**Validation Checklist:**
- [ ] Steps are numbered and have checkpoints
- [ ] Common mistakes section has real examples
- [ ] Troubleshooting table covers likely failures
- [ ] All code examples are tested and working
- [ ] No unresolved TODO placeholders

**Quality Check:**
```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py validate <skill-path>
python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py evaluate <skill-path>
# Target: Grade A or B
```
