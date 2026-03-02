# Structured Output Protocol

Agents (super-brain, super-code-reviewer, super-architect) can output machine-readable task suggestions using this protocol.

## Output Format

```markdown
<!-- TASKS:
[
  {
    "name": "descriptive-task-name",
    "background": "Why this task exists",
    "requirements": "What needs to be done",
    "priority": "high|medium|low"
  }
]
-->
```

## Consuming Agent Output

After an agent produces structured output, create tasks from it:

```bash
# From agent output with structured footer
tasks batch-create --from-agent-output analysis.md
# Extracts tasks from <!-- TASKS: [...] --> footer
```

## Use Cases

- Planning agents suggest task breakdowns
- Code reviewers propose refactoring tasks
- Architects recommend implementation tasks
- Any agent can suggest follow-up work

## Example

Agent produces:

```markdown
## Analysis

After reviewing the codebase, I identified several areas needing improvement.

<!-- TASKS:
[
  {
    "name": "add-authentication-middleware",
    "background": "Current API lacks authentication layer",
    "requirements": "Implement JWT-based auth, support refresh tokens",
    "priority": "high"
  },
  {
    "name": "add-rate-limiting",
    "background": "API is vulnerable to abuse",
    "requirements": "Implement per-user rate limits",
    "priority": "medium"
  }
]
-->
```

Then consume with:

```bash
tasks batch-create --from-agent-output analysis.md
```
