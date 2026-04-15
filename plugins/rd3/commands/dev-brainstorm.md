---
description: Brainstorm solutions with trade-offs, confidence scoring,...
argument-hint: "<topic-or-file> [--depth <basic|detailed|comprehensive>] [--options <n>]"
allowed-tools: ["Read", "Glob", "Bash", "Skill"]
---

# Dev Brainstorm

Generate multiple solution options with trade-off analysis, confidence scoring, and recommendations. Delegates to **rd3:brainstorm** skill.

## When to Use

- Explore multiple approaches before committing to a solution
- Evaluate trade-offs between competing options
- Obtain structured decision guidance with confidence scoring

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `topic-or-file` | Yes | Topic description or path to task file |
| `--depth` | No | Analysis depth: `basic` (3), `detailed` (5), `comprehensive` (8+) | `detailed` |
| `--options <n>` | No | Override default number of options | 5 |

## Input Modes

| Input Pattern | Behavior |
|---------------|----------|
| Path ending in `.md` | Extract context from task file |
| Plain text | Use as issue description |

## Workflow

```
Skill(skill="rd3:brainstorm", args="$ARGUMENTS")
```

The skill executes:

1. **Parse Input** — Extract context from file path or use description directly
2. **Clarify** — Ask targeted questions if input is ambiguous
3. **Ideate** — Generate N solution approaches with trade-offs
4. **Output** — Structured markdown with confidence scores and recommendations

## Output

| Section | Content |
|---------|---------|
| **Options** | 3-8 solution approaches |
| **Trade-offs** | Explicit pros/cons |
| **Confidence** | Score 1-5 with reasoning |
| **Recommendation** | Top choice with rationale |

## Examples

<example>
Brainstorm a simple question
```bash
/rd3:dev-brainstorm Should I use Redis or Memcached for session storage?
```
</example>

<example>
Run detailed analysis from a task file
```bash
/rd3:dev-brainstorm docs/tasks2/0274.md --depth detailed
```
</example>

## Platform Notes

### Claude Code (primary)
```bash
/rd3:dev-brainstorm My API design question
Skill(skill="rd3:brainstorm", args="My API design question --depth detailed")
```

### Other Platforms
Read the skill file and follow the workflow manually. The `$ARGUMENTS` syntax is Claude-specific.

## See Also

- **rd3:brainstorm**: Core ideation workflow skill
- **rd3:knowledge-extraction**: Research verification
- **rd3:task-decomposition**: Convert outputs to tasks
