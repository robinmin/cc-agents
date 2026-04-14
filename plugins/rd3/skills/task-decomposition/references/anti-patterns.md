---
name: anti-patterns
description: "Documented anti-patterns in task decomposition with real-world examples"
see_also:
  - rd3:task-decomposition
  - patterns
  - decomposition-decision-rules
---

# Anti-Patterns in Task Decomposition

This document catalogs real-world anti-patterns with concrete examples of what NOT to do.

## Table of Contents

- [Implementation Phase Decomposition](#implementation-phase-decomposition)
- [Skeleton Task Anti-Pattern](#skeleton-task-anti-pattern)
- [Over-Decomposition](#over-decomposition)
- [Under-Decomposition](#under-decomposition)

---

## Implementation Phase Decomposition

### The Problem

Decomposing a feature into implementation phases (investigation → design → implement → test) instead of feature complexity. This fragments implementation and creates artificial boundaries.

### Real Example (0352)

**Parent Task:** "use agy CLI to simulate acp support for antigravity"

**Bad Decomposition (what happened):**
```markdown
### Solution

#### Subtasks

- [ ] [0356 - investigate agy CLI and acpx source for Antigravity adapter](0356_...)
- [ ] [0357 - design Antigravity adapter abstraction layer](0357_...)
- [ ] [0358 - implement agy adapter exec support in acpx-query.ts](0358_...)
- [ ] [0359 - integrate Antigravity backend with config-driven switching](0359_...)
- [ ] [0360 - add unit tests for Antigravity adapter](0360_...)
```

**Why it's wrong:**
| Subtask | Issue |
|---------|-------|
| 0356 (investigate) | Investigation is a phase, not a deliverable |
| 0357 (design) | Design should be in the main task's Design section |
| 0358 (implement) | Only part of the feature |
| 0359 (integrate) | Should be part of 0358 |
| 0360 (testing) | Testing is part of implementation, not separate |

**Consequences:**
1. Task 0356 was marked "Done" after investigation, but actual implementation was in 0358
2. 5 separate task files to manage vs 1 self-contained feature
3. Pipeline had to run on 5 separate tasks instead of 1
4. Review fragmentation — 5 PRs or 1 bloated PR

### Correct Approach

**Option A: Don't decompose at all**
```markdown
### Solution

#### Subtasks

(No decomposition — single task is sufficient for this scope)

### Plan

1. Research: Run `agy --help`, understand capabilities
2. Design: Document adapter interface in task Design section
3. Implement: Add functions to acpx-query.ts
   - buildAgyChatArgs()
   - execAgyChat()
   - queryLlmAgy()
   - checkAgyHealth()
4. Integrate: Add BACKEND env var support
5. Test: Add unit tests
6. Verify: `bun run check`
```

**Option B: Decompose by deliverable complexity**
```markdown
### Solution

#### Subtasks

- [ ] [0356 - Implement Antigravity adapter core functions](0356_antigravity_adapter_core.md)
- [ ] [0357 - Add backend selection and health checks](0357_backend_selection.md)

**Dependency order:** 0356 → 0357
**Estimated total effort:** 4-6 hours
```

### How to Detect This Anti-Pattern

If your subtask names contain:
- "investigation", "research", "explore"
- "design", "architecture"
- "implementation" (as a standalone word)
- "testing" (as a standalone word)
- Pipeline phase names (implement, test, review)

Then you're decomposing by phase, not by feature.

### Prevention Rule

> **A subtask should be describable as a deliverable, not a phase.**
>
> - ✅ "Implement Antigravity adapter" — deliverable
> - ❌ "Investigate agy CLI" — activity/phase
> - ✅ "Add WBS validation to tasks CLI" — deliverable
> - ❌ "Add validation logic" — implementation detail, not a task

---

## Skeleton Task Anti-Pattern

### The Problem

Creating task files with minimal/placeholder content (empty Background, Requirements) that require reading the parent task to understand anything.

### Example

```markdown
## 0356. investigate agy CLI and acpx source for Antigravity adapter

### Background

> TBD

### Requirements

> TBD

### Solution

...
```

### Why it's wrong

- Task files should be **self-contained** for documentation and review
- Empty sections defeat the purpose of task files as feature descriptions
- Downstream reviewers must read the parent task anyway

### Prevention Rule

> **Every task file must have substantive Background and Requirements (min 50 chars).**
>
> If you can't write a meaningful Background/Requirements without referring to the parent task, either:
> 1. Merge the subtask back into the parent, or
> 2. Write it as a Plan step, not a separate task

---

## Over-Decomposition

### The Problem

Creating too many small tasks that fragment implementation unnecessarily.

### Example

```markdown
Task 0352: Add events CLI command
  ├── 0353: Add EventsOptions interface
  ├── 0354: Add to VALID_COMMANDS
  ├── 0355: Implement handler
  ├── 0356: Wire in router
  └── 0357: Add tests
```

### Why it's wrong

- Each task is < 30 minutes of work
- Tasks 0353-0356 are all part of the same PR
- Creates 5x more tracking overhead than value

### Prevention Rule

> **Minimum task size: 2 hours.**
>
> If a task is smaller than 2 hours, merge it with the adjacent deliverable or keep it as a Plan step.

### Correct Approach

```markdown
Task 0352: Add events CLI command
  |-- Implement events command handler
  |-- Add to VALID_COMMANDS
  |-- Wire in router
  |-- Add tests
  |-- Verify: bun run check
```

One task. No decomposition needed.

---

## Under-Decomposition

### The Problem

Keeping a large, complex task as a monolith when it should be split.

### Signs

- Task has 10+ file references in different modules
- Task mentions 5+ different layers (DB, API, frontend, etc.)
- Estimated effort exceeds 16 hours
- Task name contains "and" multiple times

### Example

```markdown
## 0400. Add full OAuth2 authentication

### Requirements

- Implement Google OAuth2
- Implement GitHub OAuth2
- Add session management
- Update user model
- Add frontend login flow
- Add logout functionality
- Implement token refresh
- Add security hardening
```

### Why it's wrong

- This is multiple weeks of work
- Cannot be completed in one focus session
- Risk: task stays in "In Progress" forever
- No intermediate checkpoints

### Prevention Rule

> **Target task size: 2-8 hours.**
>
> If a task lands in the 8-16 hour caution band, re-run the rubric. Keep it whole only when the work is still one deliverable and you record the rationale. If it exceeds 16 hours, decompose.

### Correct Approach

```markdown
## 0400. OAuth2 Authentication

### Solution

#### Subtasks

- [ ] [0402 - Implement OAuth2 service layer with provider abstraction](0402_oauth2_service.md)
- [ ] [0403 - Add Google OAuth2 provider](0403_google_oauth.md)
- [ ] [0404 - Add GitHub OAuth2 provider](0404_github_oauth.md)
- [ ] [0405 - Implement session management and token refresh](0405_session_management.md)
- [ ] [0406 - Add frontend OAuth2 login flow](0406_frontend_oauth.md)

**Dependency order:** 0402 → (0403 || 0404) → 0405 → 0406
**Estimated total effort:** 40-60 hours
```

---

## Summary Table

| Anti-Pattern | Symptom | Prevention |
|--------------|---------|------------|
| Phase Decomposition | Subtask names = pipeline phases | Decompose by deliverable, not phase |
| Skeleton Tasks | Empty Background/Requirements | Min 50 chars, self-contained |
| Over-Decomposition | 30-min subtasks | Min 2 hours per task |
| Under-Decomposition | 80-hour monolithic tasks | Re-score at 8h, must decompose above 16h |
