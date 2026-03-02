# Batch and Rich Task Creation

Create tasks with pre-filled sections to avoid skeleton files.

## Rich Task Creation

### Inline Content

```bash
# With inline content
tasks create "Feature X" --background "Users need OAuth for SSO" --requirements "Must support Google and GitHub providers"
```

### From JSON

```bash
# From JSON definition
tasks create --from-json task.json

# JSON format:
{
  "name": "descriptive-task-name",
  "background": "Why this task exists",
  "requirements": "What needs to be done"
}
```

### From stdin

```bash
# From stdin
echo '{"name": "Task", "background": "bg"}' | tasks create --from-stdin
```

## Batch Task Creation

Create multiple tasks at once from structured input.

### From JSON Array

```bash
# From JSON array
tasks batch-create --from-json tasks.json

# JSON format:
[
  {"name": "Task 1", "background": "Context 1", "requirements": "Req 1"},
  {"name": "Task 2", "background": "Context 2", "requirements": "Req 2"}
]
```

### From Agent Output

```bash
# From agent output with structured footer
tasks batch-create --from-agent-output analysis.md
# Extracts tasks from <!-- TASKS: [...] --> footer
```

See [structured-output.md](./structured-output.md) for the agent output format.

## Best Practice

**Always provide --background and --requirements when creating tasks.** A skeleton task is worse than no task — it creates a false sense of progress. Validation enforces this.

### Recommended Workflow

```bash
# Rich create with content
tasks create "add-oauth2-authentication" \
  --background "Users need SSO via OAuth2 for enterprise clients" \
  --requirements "Support Google and GitHub providers, handle token refresh"

# Then populate Design before starting work
Write("/tmp/0183_design.md", "## Architecture\n\n...")
tasks update 0183 --section Design --from-file /tmp/0183_design.md
tasks update 0183 wip
```

### Avoid

```bash
# Don't create skeleton tasks
tasks create "add-oauth2-authentication"
# ... move on to other work — validation will block `tasks update 183 wip`
```
