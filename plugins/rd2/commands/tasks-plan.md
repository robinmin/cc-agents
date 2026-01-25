---
description: Lightweight coordinator for task decomposition, planning, and orchestration with scale assessment and specialist delegation
skills:
  - rd2:cc-agents
  - rd2:task-decomposition
  - rd2:tasks
  - rd2:anti-hallucination
argument-hint: "<requirements|task-file.md>" [--complexity low|medium|high] [--architect] [--design] [--skip-refinement] [--skip-decomposition] [--skip-implementation] [--task <WBS|path>]
---

# Tasks Plan

Lightweight coordinator for task decomposition, planning, and orchestration. Assesses task scale, delegates to specialists (super-architect, super-designer), coordinates task breakdown via `rd2:tasks decompose`, and orchestrates the implementation workflow. Follows "fat skills, thin wrappers" pattern.

**IMPORTANT**: This is an ORCHESTRATOR command - it coordinates planning and delegation but NEVER implements code directly.

## Quick Start

```bash
# Plan from description (full workflow: refine → design → decompose → orchestrate)
/rd2:tasks-plan "Implement OAuth2 authentication with Google and GitHub"

# Orchestrate existing task file (full workflow)
/rd2:tasks-plan docs/prompts/0047_oauth_feature.md
/rd2:tasks-plan --task 0047

# Skip refinement if task is already clear
/rd2:tasks-plan --task 0047 --skip-refinement

# Plan and orchestrate in one command
/rd2:tasks-plan "Add user profile and settings feature"

# Force architect involvement for complex architecture
/rd2:tasks-plan --architect "Design microservices event bus architecture"

# Force designer involvement for UI-heavy features
/rd2:tasks-plan --design "Build admin dashboard with user management"

# Specify complexity level
/rd2:tasks-plan --complexity high "Add multi-region deployment support"

# Decomposition only (no implementation, no refinement)
/rd2:tasks-plan --skip-implementation --skip-refinement "Break down migration strategy"

# Standalone refinement only
/rd2:tasks-refine docs/prompts/0047_feature.md

# Standalone design phase only
/rd2:tasks-design --task 0047
```

## Arguments

| Argument                | Required | Description                                                                                   |
| ----------------------- | -------- | --------------------------------------------------------------------------------------------- |
| `requirements`          | No\*     | High-level description of what needs to be implemented (creates task file automatically)      |
| `--task`                | No       | Orchestrate existing task by WBS (e.g., `0047`) or file path (e.g., `docs/prompts/0047_*.md`) |
| `--complexity`          | No       | Override auto-complexity: `low`, `medium`, `high`                                             |
| `--architect`           | No       | Force architecture review involvement                                                         |
| `--design`              | No       | Force UI/UX design specialist involvement                                                     |
| `--skip-refinement`     | No       | Skip task refinement step (assumes task is already refined)                                   |
| `--skip-decomposition`  | No       | Skip task decomposition (use existing tasks)                                                  |
| `--skip-implementation` | No       | Skip implementation phase (decomposition only, implementation is enabled by default)          |

**Note:** Either `requirements` or `--task` must be provided. If `requirements` is provided, a task file is created automatically via `rd2:tasks create`.

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

This command delegates to the **super-planner** agent using the Task tool and uses **SlashCommand chaining** to coordinate the complete planning workflow.

```python
Task(
  subagent_type="super-planner",
  prompt="""Plan and orchestrate: {requirements_or_task}

Mode: orchestration-only
Flags: {complexity}, {architect}, {design}, {skip_refinement}, {skip_decomposition}, {skip_implementation}

Steps:
1. Load or create task file
   - IF requirements provided → Create via rd2:tasks create
   - IF --task provided → Load existing task file
2. Scale assessment (unless --complexity specified):
   - Analyze task name and description
   - Determine complexity level (Low/Medium/High)
   - Identify specialist needs (architect/designer)
3. Refinement phase (unless --skip-refinement):
   - Quality check for red flags
   - Generate refinement suggestions if needed
   - Apply user-approved changes
4. Design phase (scale assessment → specialist delegation):
   - IF architect needed OR --architect → Delegate to super-architect
   - IF designer needed OR --design → Delegate to super-designer
   - Update Solutions section with outputs
5. Decomposition phase (unless --skip-decomposition):
   - Break down into subtasks via rd2:tasks decompose
   - Generate WBS-numbered task files
6. Orchestration phase (unless --skip-implementation):
   - For each task in dependency order:
     - Update status to Todo
     - Delegate to /rd2:code-generate
     - Update status to Testing
     - Delegate to /rd2:code-review
     - Update status to Done
7. Report completion with summary
""",
  description="Plan and orchestrate workflow"
)
```

**For detailed workflow documentation**, see: `plugins/rd2/agents/super-planner.md`

### Full Planning Workflow (SlashCommand Chain)

```
1. [INPUT] Load or create task file
        ↓
2. [REFINE] SlashCommand → /rd2:tasks-refine
   (unless --skip-refinement OR task already refined)
        ↓
3. [DESIGN] SlashCommand → /rd2:tasks-design
   (scale assessment → architect/designer delegation)
        ↓
4. [DECOMPOSE] rd2:tasks decompose
   (break down into subtasks with WBS numbers)
        ↓
5. [ORCHESTRATE] Default unless --skip-implementation
   (delegates to /rd2:code-generate for implementation)
        ↓
6. Report Completion
```

### Standalone Command Usage

Each phase can also be used independently:

```bash
# Refinement only
/rd2:tasks-refine docs/prompts/0047.md

# Design only
/rd2:tasks-design --task 0047

# Decomposition only (via tasks skill)
rd2:tasks decompose "Feature description"

# Orchestration only (via code-generate)
/rd2:code-generate --task 0047
```

### Task File Workflow (Existing Task)

```
1. Load task file from docs/prompts/{WBS}_*.md
        ↓
2. Check task status and dependencies
        ↓
3. [OPTIONAL] /rd2:tasks-refine
        ↓
4. [OPTIONAL] /rd2:tasks-design
        ↓
5. [IF needed] rd2:tasks decompose
        ↓
6. Orchestrate implementation (via super-coder)
        ↓
7. Update task status via rd2:tasks update
        ↓
8. Report Completion
```

### Decomposition-Only Workflow

```
1. Receive Requirements
        ↓
2. [OPTIONAL] /rd2:tasks-refine
        ↓
3. [OPTIONAL] /rd2:tasks-design
        ↓
4. rd2:task-decomposition (Knowledge) + rd2:tasks decompose (Create Task Files)
        ↓
5. Present Tasks & Next Steps
```

### Task File Workflow (Existing Task)

```
1. Load task file from docs/prompts/{WBS}_*.md
        ↓
2. Check task status and dependencies
        ↓
3. [IF needs breakdown] → rd2:tasks decompose
        ↓
4. Orchestrate implementation (default)
        ↓
5. Update task status via rd2:tasks update
        ↓
6. Report Completion
```

## Orchestration Mode (Default)

**Implementation is enabled by default.** Use `--skip-implementation` for decomposition-only mode.

When orchestration is enabled, super-planner automatically delegates tasks to `super-coder`:

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

### Example 1: Simple Feature from Description

```bash
/rd2:tasks-plan "Add password reset feature"

# Output:
# → Creating task file via rd2:tasks create...
# ✓ Task 0047 created: docs/prompts/0047_add_password_reset_feature.md
# → Invoking /rd2:tasks-refine...
# ✓ Task quality check passed (no red flags)
# → Invoking /rd2:tasks-design...
# → Scale Assessment: Low
# → No architect needed
# → No designer needed
# → Invoking rd2:tasks decompose...
# ✓ 2 subtasks created (0048, 0049)
# → Orchestration starting...
#
# [0048] Implement password reset backend
# → Delegating to /rd2:code-generate...
# ✓ Complete
#
# [0049] Add password reset UI
# → Delegating to /rd2:code-generate...
# ✓ Complete
#
# ✓ All tasks complete
```

### Example 2: Architecture-Heavy (High Complexity)

```bash
/rd2:tasks-plan --complexity high "Design microservices architecture for order processing"

# Output:
# → Task 0047 created via rd2:tasks create
# → Invoking /rd2:tasks-refine...
# ✓ Task refined (added acceptance criteria)
# → Invoking /rd2:tasks-design...
# → Scale Assessment: High
# → Delegating to super-architect...
# ✓ Architecture decisions added to task file
# → Invoking rd2:tasks decompose...
# ✓ 8 subtasks created (0048-0055)
# → Orchestration starting...
# (proceeds with implementation)
```

### Example 3: Orchestrate Existing Task File

```bash
/rd2:tasks-plan --task 0047
# OR
/rd2:tasks-plan docs/prompts/0047_feature.md

# Output:
# → Loading task 0047...
# ✓ Task status: Todo, Dependencies: None
# → Invoking /rd2:tasks-refine (--skip-refinement if already refined)
# → Invoking /rd2:tasks-design...
# → Scale Assessment: Medium
# → Orchestration starting...
# (proceeds with implementation)
```

### Example 4: Decomposition Only (No Orchestration)

```bash
/rd2:tasks-plan --skip-implementation "Break down authentication system"

# Output:
# → Task 0047 created via rd2:tasks create
# → Invoking /rd2:tasks-refine...
# ✓ Task refined
# → Invoking /rd2:tasks-design...
# → Scale Assessment: High
# → Delegating to super-architect...
# ✓ Architecture documented
# → Invoking rd2:tasks decompose...
# ✓ 5 subtasks created (0048-0052)
#
# → Implementation skipped (--skip-implementation)
# → Review tasks: tasks list
# → Start implementation: /rd2:code-generate --task 0048
```

### Example 5: Skip Refinement for Already-Clear Tasks

```bash
/rd2:tasks-plan --skip-refinement --task 0047

# Output:
# → Loading task 0047...
# → Skipping refinement (--skip-refinement)
# → Invoking /rd2:tasks-design...
# → Scale Assessment: Medium
# → Orchestration starting...
```

### Example 6: Standalone Phase Usage

```bash
# Refinement only
/rd2:tasks-refine docs/prompts/0047_unclear_task.md

# Design only (with forced architect)
/rd2:tasks-design --architect --task 0047

# Orchestration only (task already refined and designed)
/rd2:code-generate --task 0048
```

## Output Format

**Task File Management:** All outputs are managed through task files in `docs/prompts/` via the `rd2:tasks` skill.

When providing a description:

- A task file is created automatically via `rd2:tasks create`
- All specialist work (architecture, design) is linked in the task file's Solutions section
- Subtasks are created via `rd2:tasks decompose` with proper WBS numbering

When providing an existing task file:

- Task status is tracked in the frontmatter
- Specialist outputs are appended to the Solutions section
- Progress is managed via `rd2:tasks update`

**Task Status Flow:** Backlog → Todo → WIP → Testing → Done

**No custom output format** - All output goes to task files managed by `rd2:tasks`.

## Error Handling

| Error                   | Resolution                                 |
| ----------------------- | ------------------------------------------ |
| Requirements unclear    | Ask for clarification                      |
| tasks skill unavailable | Ask for manual task breakdown or retry     |
| Architect unavailable   | Continue without architect, note in output |
| Designer unavailable    | Continue without designer, note in output  |
| Task creation failed    | Check error, suggest manual task creation  |

## Design Philosophy

**Fat Skills, Thin Wrappers** - This command is a thin wrapper (~100 lines) that uses **SlashCommand chaining** to delegate to specialized commands. Each phase is handled by a separate command:

- `/rd2:tasks-refine` - Task refinement and quality improvement
- `/rd2:tasks-design` - Architecture and design phase with specialist delegation
- `rd2:tasks decompose` - Task breakdown into subtasks
- `/rd2:code-generate` - Implementation orchestration

This architecture ensures:

- Single source of truth for each phase
- Easy maintenance (update individual commands/agents)
- Consistent behavior across all entry points
- Reusable standalone commands

**Task File Centric** - The command follows "Task file in, Task file out" principle:

- Accepts both task files and descriptions as input
- Creates task files automatically from descriptions via `rd2:tasks create`
- All specialist work links back to task files
- No custom output formats - everything in task files

**Orchestrator Role** - This command NEVER implements code directly. It coordinates: refinement → design → decomposition → orchestration. Orchestration is enabled by default.

**Anti-Hallucination Integration** - The super-planner agent automatically uses `rd2:anti-hallucination` when tasks involve external technologies:

- **Triggered by**: API/library mentions, framework decisions, integration patterns
- **Automatic verification**: Documentation is checked via ref_search_documentation before recommendations
- **Source citations**: All external technology claims include verified sources with dates
- **Confidence scoring**: Each claim is scored HIGH/MEDIUM/LOW based on verification quality

This ensures planning decisions are grounded in current, verified documentation rather than LLM memory.

## See Also

- **super-planner agent**: `../agents/super-planner.md` - Complete orchestration logic
- **/rd2:tasks-refine**: `tasks-refine.md` - Task refinement command (Step 2)
- **/rd2:tasks-design**: `tasks-design.md` - Architecture and design command (Step 3)
- **rd:task-runner**: `../../rd/commands/task-runner.md` - Reference task orchestration command (old rd plugin)
- `rd2:task-decomposition` - Task decomposition knowledge and patterns (skill)
- `rd2:tasks` - Task file operations and WBS management (skill)
- `super-architect` - Solution architecture agent
- `super-designer` - UI/UX design agent
- `super-coder` - Implementation agent
- `/rd2:code-generate` - Code generation command (Step 5)
- `/rd2:code-review` - Code review command
