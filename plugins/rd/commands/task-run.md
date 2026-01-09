---
description: Analyze a task, design a solution blueprint, and create a detailed implementation plan
argument-hint: <task-file.md> [--dry-run] [--no-interview] [--scope <level>]
---

# task-run

Transform a task file into a structured blueprint with implementation plan.

## Quick Start

```bash
/rd:task-run docs/prompts/0001_feature.md
```

## Arguments

| Argument | Description |
|----------|-------------|
| `<task-file.md>` | Path to task file (created via `tasks create <name>`) |
| `--dry-run` | Preview without modifying file |
| `--no-interview` | Skip requirements discovery |
| `--no-refine` | Skip task refinement |
| `--scope` | `minimal` \| `standard` (default) \| `comprehensive` |

## Workflow

```
Phase 1: Validate → Phase 2: Interview → Phase 3: Refine → Phase 4: Design → Phase 5: Plan → Phase 6: Write
```

### Phase 1: Validate

Read and validate task file:
- Check YAML frontmatter (name, status, created_at, updated_at)
- Verify required sections: Background, Requirements / Objectives
- Report validation errors with fix suggestions

### Phase 2: Interview (unless `--no-interview`)

Use `AskUserQuestion` to uncover hidden requirements. Ask 1-4 targeted questions per round.

**Question Categories (priority order):**

1. **Jobs-to-be-Done**: What triggered this? What does success look like?
2. **Constraints**: Performance, security, integration requirements?
3. **Scope Boundaries**: What's explicitly out of scope? MVP vs full vision?
4. **Trade-offs**: Speed vs quality? Build vs buy?

**Stop when:** Core job understood, constraints documented, scope defined, no critical ambiguities remain.

### Phase 3: Refine (unless `--no-refine`)

- Clarify vague requirements
- Identify implicit assumptions
- Add missing acceptance criteria
- May update frontmatter `description`

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

- [ ] [Action item]
- [ ] [Action item]

**Deliverable**: [Tangible outcome]
**Dependencies**: [Prior phases]
```

### Phase 6: Write Results

- Update YAML `status` to `WIP`
- Update `updated_at` timestamp
- Replace `### Solutions / Goals` content
- Preserve Background, Requirements, References

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

## Integration with `tasks` Command

```bash
tasks create "Feature Name"     # Create task file
/rd:task-run <file>             # Generate plan
tasks update 0001 WIP           # Update status
tasks list                      # View kanban
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| File not found | Use `tasks create <name>` first |
| Missing frontmatter | Ensure file follows template |
| Generic solution | Add more detail to Background/Requirements |
| Too many steps | Use `--scope minimal` |
