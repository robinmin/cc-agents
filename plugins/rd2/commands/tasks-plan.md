---
description: Lightweight coordinator for task decomposition, planning, and orchestration with scale assessment and specialist delegation
skills:
  - rd2:cc-agents
argument-hint: "<requirements>" [--complexity low|medium|high] [--architect] [--design] [--skip-decomposition] [--orchestrate]
---

# Tasks Plan

Lightweight coordinator for task decomposition, planning, and orchestration. Assesses task scale, delegates to specialists (super-architect, super-designer), coordinates task breakdown via `rd2:tasks decompose`, and orchestrates the implementation workflow. Follows "fat skills, thin wrappers" pattern.

**IMPORTANT**: This is an ORCHESTRATOR command - it coordinates planning and delegation but NEVER implements code directly.

## Quick Start

```bash
# Auto-scale assessment and full planning
/rd2:tasks-plan "Implement OAuth2 authentication with Google and GitHub"

# Force architect involvement for complex architecture
/rd2:tasks-plan --architect "Design microservices event bus architecture"

# Force designer involvement for UI-heavy features
/rd2:tasks-plan --design "Build admin dashboard with user management"

# Specify complexity level
/rd2:tasks-plan --complexity high "Add multi-region deployment support"

# Task decomposition only (no orchestration)
/rd2:tasks-plan "Add user profile and settings feature"

# Full orchestration mode (implements all tasks)
/rd2:tasks-plan --orchestrate "Implement authentication and authorization"
```

## Arguments

| Argument            | Required | Description                                                                 |
| ------------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| `requirements`       | Yes      | High-level description of what needs to be implemented                                                   |
| `--complexity`        | No       | Override auto-complexity: `low`, `medium`, `high`                                                         |
| `--architect`         | No       | Force architecture review involvement                                                                     |
| `--design`            | No       | Force UI/UX design specialist involvement                                                                 |
| `--skip-decomposition` | No       | Skip task decomposition (use existing tasks)                                                              |
| `--orchestrate`       | No       | Enable orchestration loop to delegate tasks to super-coder automatically                                   |

## Scale Assessment

Super-planner automatically assesses task complexity and determines when specialist involvement is needed.

### Scale Indicators

| Scale Indicators         | Complexity | Architect | Designer |
| ------------------------ | ---------- | --------- | -------- |
| Single file/function     | Low        | No        | No       |
| Multi-file feature       | Medium     | Maybe     | Maybe    |
| Cross-system integration | High       | Yes       | No       |
| New architecture pattern | Very High  | Yes       | No       |
| UI-heavy feature         | Medium     | No        | Yes      |
| UX improvements needed   | Medium     | No        | Yes      |
| Design system changes    | High       | No        | Yes      |
| Database schema changes  | Medium     | Yes       | No       |
| API design               | Medium     | Yes       | No       |
| Multi-region deployment  | High       | Yes       | No       |

### Complexity Levels

**Low Complexity:** 1-3 tasks expected
**Medium Complexity:** 3-7 tasks expected
**High Complexity:** 7+ tasks expected

## Workflow

This command delegates to the **super-planner agent** which implements the complete orchestration workflow. The command handles:
- Argument parsing and validation
- Agent invocation with appropriate parameters
- Result presentation to user

**For detailed workflow documentation**, see: `plugins/rd2/agents/super-planner.md`

### Full Planning Workflow

```
1. Receive Requirements
        ↓
2. Scale Assessment
        ↓
3. [IF Complex/Forced] → Super-Architect (Solution Architecture)
        ↓
4. [IF UI-Heavy/Forced] → Super-Designer (UI/UX Design)
        ↓
5. rd2:task-decomposition (Knowledge) + rd2:tasks decompose (Task Breakdown)
        ↓
6. [IF orchestrate] → Orchestration Loop (delegate to super-coder)
        ↓
7. Report Completion
```

### Decomposition-Only Workflow

```
1. Receive Requirements
        ↓
2. Scale Assessment
        ↓
3. [IF Complex] → Super-Architect (Optional)
        ↓
4. [IF UI-Heavy] → Super-Designer (Optional)
        ↓
5. rd2:task-decomposition (Knowledge) + rd2:tasks decompose (Create Task Files)
        ↓
6. Present Tasks & Next Steps
```

## Orchestration Mode

When `--orchestrate` flag is specified, super-planner automatically delegates tasks to `super-coder`:

```
For each task in dependency order:
1. Update task status to Todo
2. Delegate to code-generate (--task <WBS>)
3. Wait for implementation
4. Update task status to Testing
5. Delegate to code-review
6. Update task status to Done
7. Continue to next task
```

## Examples

### Example 1: Simple Feature (Low Complexity)

```bash
/rd2:tasks-plan "Add password reset feature"

# Output:
# → Scale Assessment: Low
# → No architect needed
# → No designer needed
# → Invoking rd2:tasks decompose to create task files...
# ✓ 2 tasks created (0047, 0048)
#
# Tasks:
# 0047: Implement password reset backend
# 0048: Add password reset UI
#
# Next: /rd2:code-generate --task 0047
```

### Example 2: Architecture-Heavy (High Complexity)

```bash
/rd2:tasks-plan "Design microservices architecture for order processing"

# Output:
# → Scale Assessment: High
# → Invoking super-architect for solution architecture...
# ✓ Architecture decisions documented
# → Invoking rd2:tasks decompose to create task files...
# ✓ 8 tasks created (0047-0054)
#
# Tasks:
# 0047: Design order service architecture
# 0048: Implement order service
# ...
#
# Next: /rd2:code-generate --task 0047
```

### Example 3: UI-Heavy Feature

```bash
/rd2:tasks-plan --design "Build admin dashboard with user management"

# Output:
# → Scale Assessment: Medium
# → Invoking super-designer for UI/UX design...
# ✓ Design specifications documented
# → Invoking rd2:tasks decompose to create task files...
# ✓ 6 tasks created (0047-0052)
#
# Next: /rd2:code-generate --task 0047
```

### Example 4: Full Orchestration

```bash
/rd2:tasks-plan --orchestrate "Add user profile and settings"

# Output:
# → Scale Assessment: Medium
# → Invoking rd2:tasks decompose to create task files...
# ✓ 4 tasks created (0047-0050)
# → Orchestration starting...
#
# [0047] Implement user profile model
# → Delegating to code-generate...
# ✓ Complete
#
# [0048] Create profile UI
# → Delegating to code-generate...
# ✓ Complete
#
# [0049] Add settings page
# → Delegating to code-generate...
# ✓ Complete
#
# ✓ All tasks complete
```

## Output Format

Results saved to `.claude/plans/[name].md` with YAML frontmatter:

```yaml
---
type: super-planner-output
complexity: low|medium|high
architect_involved: true|false
designer_involved: true|false
tasks_created: N
wbs_range: XXXX-YYYY
---
```

Followed by: Scale Assessment Report, Specialist Review Results, Task Hierarchy, Next Steps.

## Error Handling

| Error                   | Resolution                                             |
| ---------------------- | ---------------------------------------------------- |
| Requirements unclear    | Ask for clarification                              |
| tasks skill unavailable | Ask for manual task breakdown or retry             |
| Architect unavailable   | Continue without architect, note in output            |
| Designer unavailable    | Continue without designer, note in output             |
| Task creation failed    | Check error, suggest manual task creation              |

## Design Philosophy

**Fat Skills, Thin Wrappers** - This command is a thin wrapper (~100 lines); all planning logic, scale assessment, orchestration workflows, and specialist coordination live in the **super-planner agent** (`plugins/rd2/agents/super-planner.md`). This ensures:
- Single source of truth for orchestration logic
- Easy maintenance (update agent, not command)
- Consistent behavior across all entry points

**Orchestrator Role** - The agent NEVER implements code directly. It coordinates: planning → decomposition → orchestration → review.

## See Also

- **super-planner agent**: `../agents/super-planner.md` - Complete orchestration logic
- `rd2:task-decomposition` - Task decomposition knowledge and patterns (skill)
- `rd2:tasks` - Task file operations and WBS management (skill)
- `super-architect` - Solution architecture agent
- `super-designer` - UI/UX design agent
- `super-coder` - Implementation agent
- `/rd2:code-generate` - Code generation command (Step 7)
- `/rd2:code-review` - Code review command (Step 9-10)
