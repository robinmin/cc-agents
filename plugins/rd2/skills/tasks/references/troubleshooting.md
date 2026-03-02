# Troubleshooting

Common issues and solutions.

## Common Errors

| Error | Solution |
|-------|----------|
| "Not in a git repository" | Run from a git-tracked directory |
| "Kanban file not found" | Run `tasks init` first |
| "No task found with WBS" | Use `tasks list` to find available tasks |
| "Invalid WBS number" | Use 1-4 digits: `47` or `0047` |
| "Section empty" | Use `--section --from-file` to populate |
| "Section not found" | Check template matches `### Heading` exactly |

## Write Tool Blocked

If you see a Write tool blocked error for task files:

- This is intentional — task files must be created via `tasks create`
- Use `tasks create` with `--background` and `--requirements` flags
- Use `tasks update --section --from-file` to update content

## Validation Errors

If status update is blocked:

1. Run `tasks check <WBS>` to see validation errors
2. Populate missing required sections
3. Use `--force` to bypass if needed (not recommended)

## Kanban Not Updating

Run `tasks refresh` to regenerate the kanban board from all folders.

## Task Not Found

- Use `tasks list` to see all tasks
- Tasks can be in any configured folder
- Cross-folder search should find it automatically
- Check if folder is configured in `docs/.tasks/config.jsonc`

## First Time Setup

```bash
# Before tasks init has run
python3 ${CLAUDE_PLUGIN_ROOT}/skills/tasks/scripts/tasks.py init

# After initialization, use the tasks command
tasks init
```
