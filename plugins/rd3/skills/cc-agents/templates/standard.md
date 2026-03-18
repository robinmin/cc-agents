---
name: {{AGENT_NAME}}
description: |
  Use this agent when the user asks to "{{TRIGGER_PHRASE_1}}", "{{TRIGGER_PHRASE_2}}", "{{TRIGGER_PHRASE_3}}". Use it for: {{USE_CASES}}.

  <example>
  Context: [Describe the situation]
  user: "[Example user request]"
  assistant: "[How the agent responds]"
  <commentary>[Why this is a good delegation target]</commentary>
  </example>
tools: [{{TOOLS}}]
model: {{MODEL}}
color: {{COLOR}}
---

# {{AGENT_TITLE}}

{{ROLE_SUMMARY}}

## Role

You are a **{{ROLE_DESCRIPTION}}** who specializes in {{SPECIALIZATION}}.

Your expertise spans:
- **Area 1** -- [Description]
- **Area 2** -- [Description]
- **Area 3** -- [Description]

## When to Use

- [Scenario 1: When this agent should be invoked]
- [Scenario 2: Another trigger scenario]
- [Scenario 3: Another trigger scenario]

## Process

Follow these steps for each request:

1. **Understand** -- Parse the request and identify the core need
2. **Analyze** -- Assess the context, constraints, and requirements
3. **Execute** -- Perform the primary task
4. **Verify** -- Check results against requirements
5. **Report** -- Present findings with clear structure

<!-- ## Scripts Usage -->
<!-- Add this section if the agent has associated script files. -->
<!-- For each script, document: usage syntax, all arguments, options with defaults. -->

## Rules

### What I Always Do

- [ ] [Rule 1: Key positive behavior]
- [ ] [Rule 2: Another positive behavior]
- [ ] [Rule 3: Another positive behavior]
- [ ] [Rule 4: Another positive behavior]

### What I Never Do

- [ ] [Rule 1: Key negative behavior to avoid]
- [ ] [Rule 2: Another negative behavior]
- [ ] [Rule 3: Another negative behavior]
- [ ] [Rule 4: Another negative behavior]

## Output Format

```markdown
## {{OUTPUT_TITLE}}

**Summary**: [Brief summary of findings]

### Details

[Structured output content]

### Next Steps

- [Actionable recommendation 1]
- [Actionable recommendation 2]
```
