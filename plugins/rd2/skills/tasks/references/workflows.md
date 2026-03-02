# Workflows

Common task management workflows.

## Multi-Agent Workflow

```
User Request
     |
     v
Planning Phase
     |  tasks create "Implement feature" --background "..." --requirements "..."
     |  Creates: docs/prompts/0048_implement_feature.md
     v
Design Phase (REQUIRED before WIP)
     |  tasks update 48 --section Design --from-file /tmp/0048_design.md
     |  tasks update 48 --section Plan --from-file /tmp/0048_plan.md        (optional for WIP)
     |  tasks update 48 --section "Q&A" --from-file /tmp/0048_qa.md        (optional)
     v
Execution Phase
     |  tasks update 48 wip       (validates: Background + Requirements + Design)
     |  [Implementation work happens here]
     |  tasks update 48 --section Artifacts --append-row "code|src/auth.py|super-coder|2026-02-10"
     v
Review Phase
     |  tasks update 48 testing   (validates: + Plan)
     |  [Testing and review happens here]
     v
Completion
     |  tasks update 48 done
     |  tasks list
```

## Typical Multi-Phase Project

1. Run `tasks init` to create `docs/.tasks/` structure
2. Create tasks in the default folder: `tasks create "Feature X" --background "..." --requirements "..."`
3. Populate Design via `tasks update <WBS> --section Design --from-file ...`
4. When a new project phase starts: `tasks config add-folder docs/v2 --base-counter 200 --label "V2"`
5. Switch active folder: `tasks config set-active docs/v2`
6. New tasks get WBS >= 201; old tasks remain findable via cross-folder search
7. `tasks refresh` aggregates all folders into one kanban board

## Bulk Operations

```bash
# Move multiple tasks
for wbs in 47 48 49; do
    tasks update $wbs todo
done
```
