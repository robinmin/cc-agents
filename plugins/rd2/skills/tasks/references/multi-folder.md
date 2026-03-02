# Multi-Folder Task Storage

Tasks support multiple folders for organizing tasks by project phase or category.

## Global WBS Uniqueness

WBS numbers are globally unique across ALL configured folders. The algorithm:

1. Scan all folders to find the global max WBS
2. Apply `base_counter` as a floor for the target folder
3. Return `max(global_max, base_counter) + 1`

This guarantees no WBS collisions without artificial ceilings.

## Cross-Folder Operations

All commands automatically search across folders:

| Command | Behavior |
|---------|----------|
| `tasks update 47 wip` | Finds task 0047 in ANY configured folder |
| `tasks update 47 --section Design --from-file ...` | Same cross-folder lookup |
| `tasks open 47` | Opens task from whichever folder contains it |
| `tasks check 47` | Validates task from any folder |
| `tasks refresh` | Aggregates tasks from ALL folders into one kanban |
| `tasks create` | Creates in the active folder (or `--folder` override) |

## Adding a New Folder

```bash
# Add a second task folder with base_counter floor
tasks config add-folder docs/next-phase --base-counter 200 --label "Phase 2"

# Switch to it
tasks config set-active docs/next-phase

# Create tasks in the new folder
tasks create "New phase task"  # Gets WBS >= 201
```

## Folder Configuration

In `docs/.tasks/config.jsonc`:

```jsonc
{
  "$schema_version": 1,
  "active_folder": "docs/prompts",
  "folders": {
    "docs/prompts": { "base_counter": 0, "label": "Phase 1" },
    "docs/next-phase": { "base_counter": 200, "label": "Phase 2" }
  }
}
```

## Base Counter Usage

- Use `base_counter` to give each folder a WBS range floor (e.g., Phase 2 starts at 200)
- Set meaningful labels for folder identification in `tasks config`
- Keep the `active_folder` set to your current working phase
