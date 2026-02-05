---
description: Brief description of what this command does (under 60 chars)
argument-hint: [required-arg] [optional-arg]
# allowed-tools: Read, Write, Edit, Bash
# model: sonnet
# disable-model-invocation: false
---

# Command Title

<!-- Brief overview of what this command does -->

## Quick Start

```bash
# Example usage
/plugin-name:command-name arg1 arg2
```

## Arguments

| Argument | Type | Description | Required |
|----------|------|-------------|----------|
| `arg1` | string | Description of arg1 | Yes |
| `arg2` | string | Description of arg2 | No |

## What It Does

<!-- Describe what the command does -->

## Implementation

<!-- For simple commands: Direct instructions -->
<!-- For complex commands: Pseudocode with built-in tools -->

### Example: Simple Command (Direct Instructions)

```markdown
<!-- Your imperative instructions for Claude go here -->

Review the code at $1 for:
1. Security issues
2. Performance problems
3. Best practices violations
```

### Example: Complex Command (Pseudocode)

```markdown
<!-- Workflow with explicit steps -->

Step 1: Read and analyze input
- Read file at $1 if provided
- Identify scope and requirements

Step 2: Delegate to specialist
- If complex architecture decision → Task(subagent_type="super-architect", ...)
- If code review → Task(subagent_type="super-code-reviewer", ...)

Step 3: Present results
- Format output for user
- Save to file if --output specified
```

### Example: Plugin Command

```markdown
<!-- Plugin commands use CLAUDE_PLUGIN_ROOT variable -->

<!-- Step 1: Run plugin script -->
!`python3 ${CLAUDE_PLUGIN_ROOT}/scripts/my-script.py $1`

<!-- Step 2: Process results -->
Read the output from the script above and:
1. Validate the format
2. Present to user
3. Save to specified location if needed
```

## Notes

<!-- Additional notes, edge cases, or warnings -->

## See Also

- Related command: `/related-command`
- Related skill: `plugin:related-skill`
