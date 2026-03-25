---
name: structured-output-protocol
description: "Extracted section: Structured Output Protocol"
see_also:
  - rd3:task-decomposition
---

# Structured Output Protocol

### Batch-Creation-Compatible JSON

When generating task decompositions, output tasks in structured JSON for consumption by task management systems:

#### Option 1: JSON Array (for file-based batch creation)

```json
[
  {
    "name": "descriptive-task-name",
    "background": "Why this task exists - provide substantive context (min 50 chars)",
    "requirements": "What needs to be done - measurable criteria (min 50 chars)",
    "solution": "Technical approach and implementation strategy",
    "priority": "high|medium|low",
    "estimated_hours": 4,
    "dependencies": ["0001", "0002"],
    "tags": ["authentication", "security"]
  }
]
```

#### Option 2: Markdown Footer (for inline output)

Append to analysis output:

```markdown
<!-- TASKS:
[
  {
    "name": "implement-oauth2-google-provider",
    "background": "Users need to authenticate via Google OAuth2 for enterprise SSO integration. Current system only supports email/password authentication.",
    "requirements": "Must support Google OAuth2 flow, handle token refresh, store provider-specific user data. Success criteria: User can login with Google, tokens auto-refresh, profile syncs.",
    "solution": "Use OAuth2 library, implement callback endpoint, store tokens in database with encryption, add middleware for token validation.",
    "priority": "high",
    "estimated_hours": 6
  }
]
-->
```

### Structured Output Requirements

**Every task MUST include:**
- `name`: kebab-case, descriptive, action-oriented
- `background`: Substantive context (min 50 chars, ideally 100+)
- `requirements`: Measurable criteria (min 50 chars, ideally 100+)

**Optional but recommended:**
- `solution`: Technical approach (preserves Solution section content)
- `priority`: high | medium | low
- `estimated_hours`: Numeric estimate
- `dependencies`: Array of WBS IDs or task names
- `tags`: Array of category tags
