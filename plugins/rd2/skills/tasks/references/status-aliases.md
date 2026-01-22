# Task Status Aliases

All supported aliases for task status values.

## Canonical Statuses

The tasks CLI uses five canonical status values:

1. **Backlog** - New tasks, not yet prioritized
2. **Todo** - Ready to work, prioritized
3. **WIP** - Work in progress
4. **Testing** - Under testing/review
5. **Done** - Complete

## Alias Mapping

| Alias | Maps To |
|-------|---------|
| backlog | Backlog |
| todo, to-do | Todo |
| wip, in-progress, working | WIP |
| testing, test, review, inreview | Testing |
| done, completed, finished, closed | Done |

## Usage Examples

All of these are equivalent:

```bash
# Set to WIP (all equivalent)
python3 scripts/tasks.py update 47 wip
python3 scripts/tasks.py update 47 in-progress
python3 scripts/tasks.py update 47 working

# Set to Testing (all equivalent)
python3 scripts/tasks.py update 47 testing
python3 scripts/tasks.py update 47 test
python3 scripts/tasks.py update 47 review

# Set to Done (all equivalent)
python3 scripts/tasks.py update 47 done
python3 scripts/tasks.py update 47 completed
python3 scripts/tasks.py update 47 finished
```

## List Filter Aliases

The `list` command also accepts aliases:

```bash
# All equivalent
python3 scripts/tasks.py list wip
python3 scripts/tasks.py list in-progress
python3 scripts/tasks.py list working
```

## Implementation

The `TaskStatus` enum provides the alias mapping:

```python
class TaskStatus(Enum):
    BACKLOG = "Backlog"
    TODO = "Todo"
    WIP = "WIP"
    TESTING = "Testing"
    DONE = "Done"

    @classmethod
    def from_alias(cls, alias: str) -> "TaskStatus | None":
        """Map alias string to canonical TaskStatus."""
        aliases = {
            "backlog": cls.BACKLOG,
            "todo": cls.TODO,
            "to-do": cls.TODO,
            "wip": cls.WIP,
            "in-progress": cls.WIP,
            "working": cls.WIP,
            "testing": cls.TESTING,
            "test": cls.TESTING,
            "review": cls.TESTING,
            "inreview": cls.TESTING,
            "done": cls.DONE,
            "completed": cls.DONE,
            "finished": cls.DONE,
            "closed": cls.DONE,
        }
        return aliases.get(alias.lower().replace("_", "-"))
```

## Adding New Aliases

To add a new alias, modify the `aliases` dictionary in `TaskStatus.from_alias()`:

```python
aliases = {
    # ... existing aliases ...
    "new-alias": cls.TARGET_STATUS,
}
```
