---
description: Analyze a task, design a solution blueprint, and create a detailed implementation plan
argument-hint: <task-file.md> [--dry-run] [--no-interview] [--scope <level>] [--resume] [--verify <cmd>]
---

# task-run

Transform a task file into a structured blueprint with implementation plan.

## Quick Start

```bash
/rd:task-run docs/prompts/0001_feature.md
/rd:task-run docs/prompts/0001_feature.md --resume  # Continue interrupted work
```

## Arguments

| Argument | Description |
|----------|-------------|
| `<task-file.md>` | Path to task file (created via `tasks create <name>`) |
| `--dry-run` | Preview without modifying file |
| `--no-interview` | Skip requirements discovery |
| `--no-refine` | Skip task refinement |
| `--scope` | `minimal` \| `standard` (default) \| `comprehensive` |
| `--resume` | Resume from last checkpoint (reads progress from file) |
| `--verify <cmd>` | Verification command to run after implementation (e.g., `npm test`) |
| `--no-verify` | Skip verification question during interview |

## Workflow

```
Phase 1: Validate → Phase 2: Interview → Phase 3: Refine → Phase 4: Design → Phase 5: Plan → Phase 6: Write
```

## Progress Tracking (Maker-Checker Discipline)

**CRITICAL**: Update progress markers after completing each phase. This enables:
- Resumability after context limits or interruptions
- Clear visibility into implementation progress
- Robust continuation of phased work

### Progress State Management

Progress is tracked in the task file's YAML frontmatter:

```yaml
---
name: Feature Name
status: WIP
current_phase: 3           # Last completed planning phase (1-6)
verify_cmd: npm test       # Verification command (optional, from interview or --verify)
impl_progress:             # Implementation phase tracking
  phase_1: completed       # pending | in_progress | completed | blocked
  phase_2: in_progress
  phase_3: pending
created_at: 2025-01-15 10:30:00
updated_at: 2025-01-15 14:22:00
---
```

### Checkpoint Protocol

After **each phase completion**, you MUST:

1. **Update frontmatter** `current_phase` to reflect completed phase
2. **Update** `updated_at` timestamp
3. **Mark action items** with `[x]` in the plan section
4. **Write to disk** before proceeding to next phase

This creates atomic checkpoints enabling recovery from any interruption.

### Phase 1: Validate

Read and validate task file:
- Check YAML frontmatter (name, status, created_at, updated_at)
- Verify required sections: Background, Requirements / Objectives
- Report validation errors with fix suggestions

**On completion**: Set `current_phase: 1` in frontmatter.

### Phase 2: Interview (unless `--no-interview`)

Use `AskUserQuestion` or equivilent tool to uncover hidden requirements. Ask 1-4 targeted questions per round.

**Question Categories (priority order):**

1. **Jobs-to-be-Done**: What triggered this? What does success look like?
2. **Constraints**: Performance, security, integration requirements?
3. **Scope Boundaries**: What's explicitly out of scope? MVP vs full vision?
4. **Trade-offs**: Speed vs quality? Build vs buy?
5. **Verification** (unless `--no-verify` or `--verify` provided): What command validates the implementation? (e.g., `npm test`, `pytest`, `make check`)

**Verification Question Format:**
```
Do you have a verification command to validate the implementation?

Options:
- "npm test" (runs test suite)
- "npm run build && npm test" (build + test)
- "pytest" (Python test runner)
- Skip verification (no command needed)
- Other: [user provides custom command]
```

**Stop when:** Core job understood, constraints documented, scope defined, verification command captured (or skipped), no critical ambiguities remain.

**On completion**: Set `current_phase: 2` in frontmatter.

### Phase 3: Refine (unless `--no-refine`)

- Clarify vague requirements
- Identify implicit assumptions
- Add missing acceptance criteria
- May update frontmatter `description`

**On completion**: Set `current_phase: 3` in frontmatter.

### Phase 4: Design Solution

Populate `### Solutions / Goals` with:

```markdown
#### Architecture Overview
[High-level design, components, data flow]

#### Core Components
- **Component**: [Purpose, tech choice, interfaces]

#### Data Model
[Entities, relationships, validation]

#### API / Interface Design
[Endpoints, methods, formats]

#### Key Implementation Details
- [Design patterns, algorithms, error handling, security]

#### Edge Cases Handled
- [Edge case]: [Solution approach]
```

**On completion**: Set `current_phase: 4` in frontmatter, write design to file.

### Phase 5: Create Plan

Append implementation plan based on `--scope`:

| Scope | Phases | Focus |
|-------|--------|-------|
| minimal | 2-3 | Core functionality only |
| standard | 4-6 | Includes testing & docs |
| comprehensive | 6+ | Rollout, monitoring, rollback |

**Plan Structure:**
```markdown
##### Phase N: [Name] [Complexity: Low/Medium/High]

**Goal**: [What this achieves]

**Status**: pending | in_progress | completed | blocked

- [ ] [Action item]
- [ ] [Action item]

**Deliverable**: [Tangible outcome]
**Dependencies**: [Prior phases]
```

**On completion**: Set `current_phase: 5` in frontmatter, write plan to file.

### Phase 6: Write Results

- Update YAML `status` to `WIP`
- Update `updated_at` timestamp
- Store `verify_cmd` in frontmatter (if provided via interview or `--verify`)
- Initialize `impl_progress` with all implementation phases as `pending`
- Replace `### Solutions / Goals` content
- Preserve Background, Requirements, References

**On completion**: Set `current_phase: 6` in frontmatter.

## Verification Phase (Post-Implementation)

After all implementation phases are complete, run verification before marking task as Done.

### When Verification Runs

Verification executes automatically when:
1. All `impl_progress` phases are `completed`
2. `verify_cmd` exists in frontmatter (not empty/skipped)

### Verification Workflow

```
1. Check all impl_progress phases are completed
2. Read verify_cmd from frontmatter
3. Execute: /rd:task-fixall [verify_cmd]
4. If passes → Update status to Testing/Done
5. If fails → Keep status as WIP, document failures
```

### Manual Verification

If verification was skipped during planning but needed later:

```bash
# Add verification command and run
/rd:task-fixall npm run build && npm test

# Or update frontmatter first, then run
# verify_cmd: npm test
/rd:task-fixall
```

### Verification Status in Frontmatter

```yaml
---
name: Feature Name
status: Testing              # Moved to Testing after verification passes
verify_cmd: npm test
verify_status: passed        # pending | passed | failed
verify_last_run: 2025-01-15 16:30:00
impl_progress:
  phase_1: completed
  phase_2: completed
  phase_3: completed
---
```

## Task File Format

**Input (from `tasks create`):**
```markdown
---
name: Feature Name
description: Brief description
status: Backlog
created_at: 2025-01-15 10:30:00
updated_at: 2025-01-15 10:30:00
---

## Feature Name

### Background
[Context]

### Requirements / Objectives
[What to accomplish]

### Solutions / Goals
[Empty - populated by task-run]

### References
[Links, docs]
```

**After task-run completes (with progress tracking):**
```markdown
---
name: Feature Name
description: Brief description
status: WIP
current_phase: 6
verify_cmd: npm test         # From interview or --verify flag
impl_progress:
  phase_1: pending
  phase_2: pending
  phase_3: pending
created_at: 2025-01-15 10:30:00
updated_at: 2025-01-15 14:30:00
---

## Feature Name

### Background
[Context]

### Requirements / Objectives
[What to accomplish]

### Solutions / Goals

#### Architecture Overview
[Design content...]

#### Implementation Plan

##### Phase 1: Foundation [Complexity: Medium]

**Goal**: Set up core infrastructure

**Status**: pending

- [ ] Create database schema
- [ ] Set up API routes

**Deliverable**: Working API skeleton
**Dependencies**: None

##### Phase 2: Core Logic [Complexity: High]

**Goal**: Implement business logic

**Status**: pending

- [ ] Implement validation
- [ ] Add error handling

**Deliverable**: Functional core module
**Dependencies**: Phase 1

### References
[Links, docs]
```

## Resuming Interrupted Work

When using `--resume`, the workflow:

1. **Reads** `current_phase` from frontmatter to determine last completed planning phase
2. **Reads** `impl_progress` to determine implementation status
3. **Skips** completed phases automatically
4. **Continues** from the next incomplete phase

### Resume Examples

```bash
# Resume planning (if interrupted during design/plan phases)
/rd:task-run docs/prompts/0001_feature.md --resume

# Check current progress
grep -E "^(current_phase|impl_progress|status):" docs/prompts/0001_feature.md
```

## Implementation Phase Tracking

When executing the implementation plan, update progress after each phase:

### Updating Implementation Progress

After completing each implementation phase:

1. **Mark action items** as done: `- [ ]` → `- [x]`
2. **Update phase status** in frontmatter: `phase_N: completed`
3. **Set next phase** to `in_progress`
4. **Update** `updated_at` timestamp
5. **Write to disk** immediately

### Progress Update Example

```yaml
# Before starting Phase 2
impl_progress:
  phase_1: completed
  phase_2: in_progress    # ← Currently working
  phase_3: pending

# After completing Phase 2
impl_progress:
  phase_1: completed
  phase_2: completed      # ← Just finished
  phase_3: in_progress    # ← Starting next
```

### Handling Blocked Phases

If a phase cannot proceed:

```yaml
impl_progress:
  phase_1: completed
  phase_2: blocked        # ← Cannot proceed
  phase_3: pending

# Add blocker note in the phase section:
##### Phase 2: Integration [Complexity: Medium]
**Status**: blocked
**Blocker**: Waiting for API credentials from external team
```

## Integration with `tasks` Command

```bash
tasks create "Feature Name"     # Create task file
/rd:task-run <file>             # Generate plan
/rd:task-run <file> --resume    # Resume interrupted work
/rd:task-run <file> --verify "npm test"  # Set verification upfront
tasks update 0001 WIP           # Update status
tasks list                      # View kanban
tasks refresh                   # Sync kanban with file statuses

# After implementation complete:
/rd:task-fixall npm test        # Run verification
tasks update 0001 Done          # Mark complete (if verification passes)
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| File not found | Use `tasks create <name>` first |
| Missing frontmatter | Ensure file follows template |
| Generic solution | Add more detail to Background/Requirements |
| Too many steps | Use `--scope minimal` |
| Interrupted workflow | Use `--resume` to continue |
| Progress not tracked | Check `current_phase` and `impl_progress` in frontmatter |
| Phase blocked | Add `**Blocker**:` note and set status to `blocked` |
| Verification skipped | Use `--verify <cmd>` or answer verification question in interview |
| Verification fails | Fix issues, then re-run `/rd:task-fixall <cmd>` |

## Best Practices

### Checkpoint Discipline

1. **Never skip checkpoints** - Always update progress markers after each phase
2. **Atomic writes** - Write changes to disk immediately after completing a phase
3. **Verify before proceeding** - Check that previous phase is marked complete before starting next
4. **Document blockers** - If stuck, mark phase as `blocked` with clear reason

### Verification Discipline

1. **Set verification early** - Provide `--verify` flag or answer during interview
2. **Run before marking Done** - Always execute `/rd:task-fixall` before completing task
3. **Fix and re-verify** - If verification fails, fix issues and run again
4. **Track verification status** - `verify_status` in frontmatter shows pass/fail history

### Context Limit Recovery

When context limits interrupt work:

1. Progress is preserved in task file frontmatter
2. Use `--resume` in new session to continue
3. All completed phases are skipped automatically
4. Work continues from last incomplete phase

### Progress Visibility

The task file serves as single source of truth:
- `status`: Overall task status (Backlog → WIP → Testing → Done)
- `current_phase`: Planning workflow progress (1-6)
- `impl_progress`: Implementation phase completion tracking
- `verify_cmd`: Command to validate implementation
- `verify_status`: Verification result (pending | passed | failed)
- Action item checkboxes: Granular task completion

## Complete Workflow Example

```bash
# 1. Create task
tasks create "Add user authentication"

# 2. Generate plan (with verification command)
/rd:task-run docs/prompts/0001_Add_user_authentication.md --verify "npm test"

# 3. Implement phases (progress tracked automatically)
# ... work on Phase 1 ...
# [frontmatter updated: phase_1: completed]

# ... work on Phase 2 ...
# [frontmatter updated: phase_2: completed]

# 4. After all phases complete, run verification
/rd:task-fixall npm test

# 5. If passes, mark complete
tasks update 0001 Done

# 6. If fails, fix and re-verify
# [fix issues]
/rd:task-fixall npm test
```
