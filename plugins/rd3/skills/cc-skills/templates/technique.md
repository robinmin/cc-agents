---
name: {{skill_name}}
description: [TODO: Complete description of what this skill does and when to use it. Include WHEN to use this skill - specific scenarios, file types, or tasks that trigger it.]
license: Apache-2.0
metadata:
  author: [author]
  version: "1.0"
  platforms: "claude-code,codex,openclaw,opencode,antigravity"
  # Add interaction patterns when runtime behavior matters.
  # Common technique examples:
  # interactions:
  #   - pipeline
  #   - inversion
  openclaw:
    emoji: "🛠️"
---

# {{skill_title}}

[1-2 sentences explaining what this skill enables and what workflows it accompl.]

## When to use

Use this skill when you need to:
- [Scenario 1: Description of when this applies]
- [Scenario 2: Another scenario]
- [Scenario 3: Another scenario]

## Workflow

Follow these steps to complete the workflow:

### Step 1: [First step]

[Description of what to do in the step]

```bash
# Example command
{{command}}
```

### Step 2: [second step]

[Description of what to do in this step]

### Step 3: [third step]

[Description of what to do in this step]

## Behavior

[Describe the runtime behavior of this skill. If relevant, note whether it acts as a pipeline, generator, inversion interview, reviewer, or combination.]

**Interaction patterns (if used):**
- [Primary behavior]
- [Secondary behavior, if any]

## Code Examples

### Basic Usage

```bash
# Example command showing basic usage
{{basic_example}}
```

### Advanced Usage

```bash
# Example command showing advanced usage
{{advanced_example}}
```

## Gotchas

<!-- This is the HIGHEST-SIGNAL section of your skill. Start with 2-3 items, -->
<!-- then grow it as you observe Claude failing in real usage. Each gotcha -->
<!-- should describe a specific failure mode and how to avoid it. -->

1. **[Gotcha 1]**: [What goes wrong and how to prevent it]
2. **[Gotcha 2]**: [What goes wrong and how to prevent it]
3. **[Gotcha 3]**: [What goes wrong and how to prevent it]

## Resources (optional)

Create only the resource directories this skill actually needs.

### scripts/

Executable code (TypeScript/Bash/etc.) for tasks that require deterministic reliability.

### references/

Documentation intended to be loaded into context as needed.

### assets/

Files used in output (templates, icons, fonts, etc.).

## Platform Notes

### Claude Code
Use `!`cmd`` for live data injection. Use `$ARGUMENTS` for command arguments.

### Codex / OpenClaw / OpenCode / Antigravity
Run commands via Bash tool. Arguments provided in chat.

---

**Template type**: technique
**Purpose**: Step-by-step workflows with concrete instructions
