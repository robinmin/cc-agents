---
description: {{DESCRIPTION}}
argument-hint: {{ARGUMENT_HINT}}
allowed-tools: ["Read", "Write", "Glob", "Bash", "Task", "Skill"]
---

# {{COMMAND_TITLE}}

Wraps **{{TARGET_SKILL}}** skill.

[Description of what this command does - keep under 60 chars, start with verb]

## When to Use

- [Scenario 1: When this command applies]
- [Scenario 2: Another scenario]

## Expected Results

- [Result 1: What the command produces]
- [Result 2: Another outcome]
- [Result 3: Any additional outputs]

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `{{ARG_NAME}}` | [Description] | [default value] |
| `--{{FLAG_NAME}}` | [Flag description] | [default value] |

## Examples

```bash
# [Example 1]
/{{PLUGIN_NAME}}:{{COMMAND_NAME}} [args]

# [Example 2]
/{{PLUGIN_NAME}}:{{COMMAND_NAME}} [args]
```

## Implementation

Delegates to **{{TARGET_SKILL}}** skill:

```
Skill(skill="{{TARGET_SKILL}}")
```

**Direct script execution:**
```bash
bun plugins/{{PLUGIN_PATH}}/scripts/{{SCRIPT_NAME}}.ts <args>
```

## Platform Notes

- Claude Code: Use `Skill()` for skill delegation
- Other platforms: Run script directly via Bash tool

## See Also

- `/{{PLUGIN_NAME}}:{{RELATED_COMMAND_1}}` - [Description]
- `/{{PLUGIN_NAME}}:{{RELATED_COMMAND_2}}` - [Description]

---

**Template type**: workflow
**Pattern**: Multi-step orchestration with Task()/Skill() pseudocode
