---
description: Design phase with specialist delegation
argument-hint: <task> [--with-architect] [--with-designer] [--skip-assessment]
---

# Tasks Design

Coordinate design phase by delegating to specialists (super-architect, super-designer). Performs scale assessment and routes to appropriate specialists.

**IMPORTANT**: This is a thin wrapper that delegates to super-planner in design-only mode.

## Quick Start

```bash
# Design with auto-assessment by WBS number
/rd2:tasks-design 0047

# Design by file path
/rd2:tasks-design docs/prompts/0047_feature.md

# Force architect involvement
/rd2:tasks-design 0047 --with-architect

# Force designer involvement
/rd2:tasks-design 0047 --with-designer

# Both specialists
/rd2:tasks-design 0047 --with-architect --with-designer

# Skip assessment, delegate directly
/rd2:tasks-design 0047 --skip-assessment --with-architect
```

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `<task>` | Yes | **Smart positional**: WBS number or file path (see below) |
| `--with-architect` | No | Force architecture review |
| `--with-designer` | No | Force UI/UX design review |
| `--skip-assessment` | No | Skip auto-detection, use flags only |

### Smart Positional Detection

| Input Pattern | Detection | Example |
|---------------|-----------|---------|
| Digits only | WBS number | `0047` |
| Ends with `.md` | File path | `docs/prompts/0047_feature.md` |

## Specialist Auto-Detection

| Pattern in Task | Triggers |
|-----------------|----------|
| database, schema, API, endpoint, integration, microservice | `super-architect` |
| UI, component, form, page, layout, accessibility, responsive | `super-designer` |
| bug fix, typo, refactor, rename, small change | Neither |

## Workflow

This command delegates to **super-planner** in design-only mode:

```python
Task(
  subagent_type="rd2:super-planner",
  prompt="""Design task: {task}

Mode: design-only
Flags: {with-architect}, {with-designer}, {skip-assessment}

Steps:
1. Load task file
2. Scale assessment (unless --skip-assessment):
   - Analyze task name and description
   - Identify specialist needs
3. Delegate to specialists:
   - IF architect needed OR --with-architect → super-architect
   - IF designer needed OR --with-designer → super-designer
4. Update Design section with specialist outputs
5. Update Artifacts table
6. Update impl_progress.design: completed
7. Report specialist contributions
""",
  description="Design phase coordination"
)
```

## Examples

```bash
# Auto-assessment
/rd2:tasks-design --task 0047

# Output:
# → Loading task 0047...
# → Scale assessment: Medium
# → Architect: Yes (database changes)
# → Designer: No
# → Delegating to super-architect...
# ✓ Architecture added to Design section
# ✓ impl_progress.design: completed
```

## Specialist Outputs

Specialists add to the task file:

1. **Design section** - Architecture/UI specs with attribution
2. **Artifacts table** - Generated files tracked
3. **References section** - Links to artifacts

## See Also

- **super-planner agent**: `../agents/super-planner.md`
- **super-architect agent**: `../agents/super-architect.md`
- **super-designer agent**: `../agents/super-designer.md`
- **/rd2:tasks-plan**: Full workflow (includes design)
- **/rd2:tasks-refine**: Refinement before design
