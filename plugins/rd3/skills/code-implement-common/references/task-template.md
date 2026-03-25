---
name: task-template
description: "Standard task file template for code implementation with required sections"
see_also:
  - rd3:code-implement-common
  - rd3:tasks
---

# Task File Template

Standard template for task files used with `rd3:code-implement-common`.

## Required Template

```markdown
---
name: <task-name>
description: <brief one-line description>
status: Todo
priority: high|medium|low
created_from: code-implement-common
---

### Background

Why this task exists and context.

**Business context:**
- What user/business need does this address?
- What problem does it solve?

**Technical context:**
- What existing code does this relate to?
- Are there any architectural constraints?

### Requirements

Functional and non-functional requirements.

**Must have:**
- [ ] Requirement 1
- [ ] Requirement 2

**Should have:**
- [ ] Nice-to-have feature

**Must NOT have:**
- [ ] Out of scope item 1

### Constraints

Technical boundaries and limitations.

| Constraint | Description |
|------------|-------------|
| Technology | Bun, TypeScript |
| Style | Biome linting rules |
| Testing | 80%+ coverage required |
| API Design | RESTful, JSON responses |

### Acceptance Criteria

How to verify implementation is complete.

| Criterion | Verification Method |
|-----------|-------------------|
| Feature works as specified | Manual test |
| Tests pass | `bun test` |
| Coverage met | `bun test --coverage` |
| Linting passes | `biome lint .` |

### Design Notes

Approved approach and design decisions.

```typescript
// Key interfaces
interface User {
  id: string;
  name: string;
  email: string;
}
```

### Dependencies

External dependencies or blockers.

| Dependency | Status | Notes |
|------------|--------|-------|
| auth library | ready | Use `@auth/core` |
| database | ready | PostgreSQL via Prisma |
| API spec | pending | See doc/api.md |

### Artifacts

Links to related files and documents.

| Type | Path | Description |
|------|------|-------------|
| design | docs/design/user-auth.md | Architecture diagram |
| api-spec | docs/api/auth.yaml | OpenAPI specification |
| related-task | 0046_database_migration | Prerequisite |
```

## Minimal Template

For simpler tasks:

```markdown
---
name: add-user-auth
description: Add JWT authentication to API endpoints
status: Todo
---

### Background

Need to secure API endpoints with JWT authentication.

### Requirements

- Add JWT validation middleware
- Protect /api/* endpoints
- Return 401 for invalid tokens

### Constraints

- Use existing auth library
- Follow current API patterns

### Acceptance Criteria

- `bun test` passes
- Protected endpoints return 401 without token
- Protected endpoints accept valid JWT
```

## Task File Checklist

Before passing to implementation:

- [ ] `name` field is descriptive and unique
- [ ] `description` is one line under 100 chars
- [ ] `status` is set to `Todo` or `Backlog`
- [ ] Background explains WHY, not just WHAT
- [ ] Requirements are specific and testable
- [ ] Constraints are clearly stated
- [ ] Acceptance criteria are verifiable
- [ ] Design notes include key interfaces
- [ ] Dependencies are identified

## Common Mistakes

### Missing Background

```markdown
# BAD
### Background
Add user authentication.

# GOOD
### Background
Users cannot securely access protected resources. We need JWT-based
authentication to secure API endpoints and maintain user sessions.
```

### Vague Requirements

```markdown
# BAD
- Add authentication
- Make it secure

# GOOD
- Add JWT validation middleware to all /api/* endpoints
- Return 401 status code with error message for invalid tokens
- Support token refresh with 7-day expiry
```

### Missing Constraints

```markdown
# BAD
### Constraints
None.

# GOOD
### Constraints
| Constraint | Description |
|------------|-------------|
| Auth library | Must use existing @auth/core package |
| Token format | JWT with RS256 signing |
| Error format | JSON with { error: string } |
```

## Using with Code-Implement-Common

When invoking `rd3:code-implement-common`:

```bash
# Standard invocation
implement task:docs/tasks/0047_my-task.md

# The task file path MUST be in the prompt
```

The task file name must appear in the prompt to enable:
- Proper delegation to other channels
- Tracking in the task management system
- Audit trail for implementation decisions

## Task Lifecycle

```bash
# 1. Task is pre-decomposed (done in rd3:task-decomposition)
#    Task file already exists with requirements

# 2. Move to implementation
tasks update 0047 wip

# 3. Implement using this skill
implement task:docs/tasks/0047_my-task.md
#    (task file is UPDATED after each step for progress)

# 4. Move to review (after implementation complete)
tasks update 0047 testing

# 5. After review, mark done
tasks update 0047 done
```

## Task File Requirements Summary

Every task file used with this skill must have:

| Section | Purpose |
|---------|---------|
| `name` | Unique identifier |
| `description` | Brief one-line description |
| `status` | Todo, WIP, or Done |
| `### Background` | Why this task exists |
| `### Requirements` | What must be implemented |
| `### Constraints` | Technical boundaries |
| `### Acceptance Criteria` | How to verify completion |
| `### Implementation Progress` | Track TDD cycle progress |
