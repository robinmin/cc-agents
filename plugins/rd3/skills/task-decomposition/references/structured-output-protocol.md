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
- `parent_wbs`: Parent task WBS (for subtasks only) — used to embed parent WBS in filename

### Subtask Naming Convention

When decomposing a task into subtasks, the `name` field in JSON output must follow the subtask naming convention so rd3:tasks can construct the correct filename:

**Format:** `{name}` → rd3:tasks produces `{new_wbs}_{parent_wbs}_{name}.md`

**Example — Parent task WBS 0253 decomposed:**
```json
[
  {
    "name": "create-rd3-anti-hallucination-skill",
    "parent_wbs": "0253",
    "background": "...",
    "requirements": "..."
  },
  {
    "name": "convert-ah-guard-to-typescript",
    "parent_wbs": "0253",
    "background": "...",
    "requirements": "..."
  }
]
```

rd3:tasks will produce:
- `0254_0253_create-rd3-anti-hallucination-skill.md`
- `0255_0253_convert-ah-guard-to-typescript.md`

**AVOID** — incorrect subtask names with sequence numbers:
```json
{
  "name": "0253.1:_Create_rd3_anti-hallucination_SKILL.md_with_YAML_frontmatter"
}
```
This produces malformed filenames like `0254_0253.1:_Create_rd3...` — the WBS system already assigns sequential numbers, do NOT embed `.1`, `.2` etc.
