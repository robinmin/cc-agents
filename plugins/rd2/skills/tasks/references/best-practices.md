# Best Practices

Guidelines for effective task management.

## Task Lifecycle Quality

**ALWAYS populate Background, Requirements, and Design before moving to WIP.** A skeleton task is worse than no task — it creates a false sense of progress. Validation enforces this.

### Recommended: Rich create + section updates

```bash
tasks create "add-oauth2-authentication" \
  --background "Users need SSO via OAuth2 for enterprise clients" \
  --requirements "Support Google and GitHub providers, handle token refresh"

# Then populate Design before starting work
Write("/tmp/0183_design.md", "## Architecture\n\n...")
tasks update 0183 --section Design --from-file /tmp/0183_design.md
tasks update 0183 wip
```

### Avoid: Skeleton tasks

```bash
tasks create "add-oauth2-authentication"
# ... move on to other work — validation will block `tasks update 183 wip`
```

## Task Naming

**Good:** "add-user-authentication", "fix-memory-leak-in-parser"
**Avoid:** "stuff", "fix-bug", "task1"

## Multi-Folder Organization

- Use `base_counter` to give each folder a WBS range floor (e.g., Phase 2 starts at 200)
- Set meaningful labels for folder identification in `tasks config`
- Keep the `active_folder` set to your current working phase

## When to Use Task Files

**Use task files for:**
- Persistent project tasks
- Cross-session work tracking
- Multi-phase projects
- Kanban board integration
- Team visibility

**Don't use for:**
- Simple ephemeral todos (use Claude Code's built-in Task tools)
- Non-project task management
- Tasks that don't need cross-session persistence

## Task Tools Awareness

This skill is the **persistent source of truth** for task management. Claude Code's built-in Task tools (TaskCreate, TaskList, TaskGet, TaskUpdate) serve as **session UI** — use them to track progress within a session, but always create and manage persistent tasks via `tasks` CLI.
