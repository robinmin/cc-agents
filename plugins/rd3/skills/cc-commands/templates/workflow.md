---
description: {{DESCRIPTION}}
argument-hint: {{ARGUMENT_HINT}}
---

# {{COMMAND_TITLE}}

<!-- Workflow command: multi-step orchestration with pseudocode -->

## When to Use

- [Scenario 1: When this command applies]
- [Scenario 2: Another scenario]

## Workflow

This command delegates to specialist skills and agents:

### Step 1: Analyze Input

Read and analyze the provided input:
- Parse arguments from $ARGUMENTS
- Identify scope and requirements

### Step 2: Delegate to Specialist

Invoke the appropriate skill:

```
Skill(skill="{{PLUGIN_NAME}}:{{SKILL_NAME}}", args="$ARGUMENTS")
```

Or delegate to a specialist agent:

```
Task(subagent_type="{{AGENT_NAME}}",
     prompt="[Task description with context from Step 1]")
```

### Step 3: Present Results

Format the output:
- Summarize key findings
- Present actionable recommendations
- Save results if --output flag specified

## Error Handling

- If input is invalid, explain expected format
- If specialist fails, report error and suggest alternatives
- Use AskUserQuestion for ambiguous decisions

---

**Template type**: workflow
**Pattern**: Multi-step orchestration with Task()/Skill() pseudocode
