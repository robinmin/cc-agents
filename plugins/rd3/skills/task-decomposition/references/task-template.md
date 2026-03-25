---
name: task-template
description: "Task file structure, frontmatter fields, section content guidance, and reference gathering strategy for rd3:tasks-compatible task files."
see_also:
  - rd3:task-decomposition
  - rd3:tasks
  - patterns
  - estimation
---

# Task File Structure

This document provides detailed guidance on the structure and content of task files created by the `rd3:tasks` system.

## Prerequisites

Task files capture the implementation-level details for work that has already been:
- **Analyzed** at the business level (requirements, success criteria, constraints)
- **Designed** at the system level (architecture decisions, component boundaries, integration points)

If any of these inputs are missing, they should be recorded as **prerequisites** or **open questions** in the task file, not invented during task decomposition.

## Table of Contents

- [Task File Template](#task-file-template)
- [Frontmatter Fields](#frontmatter-fields)
- [Section Breakdowns](#section-breakdowns)
- [Reference Gathering Strategy](#reference-gathering-strategy)
- [Best Practices](#best-practices)

---

## Task File Template

### Complete YAML Frontmatter

When `rd3:tasks` creates task files, they follow this structure:

```yaml
---
name: WBS_Task_Name
status: Backlog
created_at: 2026-01-15 10:30:00
updated_at: 2026-01-15 10:30:00
---

## WBS: Task Name

### Background
{Context from user request, why this task exists}

### Requirements / Objectives
{Success criteria, acceptance criteria, measurable outcomes}

### Solutions / Goals
{Technical approach, implementation strategy}

### References
- Related code: `path/to/code/file.ts`
- Documentation: `path/to/docs.md`
- Dependencies: `0002`, `0003`
```

### Status Flow

```
Backlog → Todo → WIP → Testing → Done
    ↑                        ↓
    └────────────────────────┘
        (can reopen if needed)
```

---

## Frontmatter Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Task name with WBS prefix (e.g., "0001_Authentication") |
| `status` | string | Yes | One of: Backlog, Todo, WIP, Testing, Done |
| `created_at` | datetime | Yes | ISO 8601 format timestamp |
| `updated_at` | datetime | Yes | ISO 8601 format timestamp |
| `assigned_to` | string | No | Agent or person assigned |
| `priority` | string | No | One of: Critical, High, Medium, Low |
| `estimated_hours` | number | No | Estimated effort in hours |
| `tags` | array | No | List of category tags |

---

## Section Breakdowns

### Background Section

**Purpose:** Provide context for why this task exists (not how to implement it)

**What to include:**
- Original user request or requirement
- Problem statement
- Business context
- Related project context
- Why this task matters

**Example:**

```markdown
### Background

**User Request:** "Add password reset feature"

**Problem:** Users currently cannot reset forgotten passwords, requiring manual admin intervention.

**Context:** Part of authentication enhancement initiative. Integration with existing email service required.

**Why Now:** High support ticket volume (50+ weekly) related to password issues.

**Prerequisites:**
- Business analysis: Requirements finalized (see: BA-2024-03-15)
- System analysis: Architecture decisions documented (see: SYS-2024-03-18)
```

**What to avoid:**
- Implementation details (go in Solutions)
- Success criteria (go in Requirements)
- References (go in References section)

---

### Requirements / Objectives Section

**Purpose:** Define clear, measurable success criteria

**What to include:**

#### 1. Success Criteria (Measurable)

**Good examples:**
- "User receives password reset email within 30 seconds"
- "Reset link expires after 1 hour"
- "Password successfully updated after valid reset"

**Bad examples:**
- "Password reset works" (too vague)
- "Good user experience" (not measurable)
- "Secure implementation" (subjective)

#### 2. Acceptance Criteria

Define what "done" looks like:

```markdown
**Acceptance Criteria:**
- [ ] Request reset with valid email sends email
- [ ] Request reset with invalid email returns error
- [ ] Reset link with valid token allows password change
- [ ] Reset link with expired token shows error
- [ ] Reset link with used token shows error
```

#### 3. Performance Requirements

```markdown
**Performance Requirements:**
- Reset email sent within 30 seconds
- Password update completes within 2 seconds
- Support 100 concurrent reset requests
```

#### 4. Constraints

```markdown
**Constraints:**
- Must use existing email service (SendGrid)
- Tokens must expire in 1 hour
- Single-use tokens only
- No changes to existing user table schema
```

---

### Solutions / Goals Section

**Purpose:** Document technical approach and implementation strategy

**What to include:**

#### 1. Technical Approach

```markdown
**Technical Approach:**
- Token-based reset mechanism using JWT
- Tokens stored in database with expiry
- Email delivery via existing SendGrid integration
- Stateless API endpoints
```

#### 2. Implementation Strategy

```markdown
**Implementation Strategy:**
1. Generate cryptographically secure random token
2. Store token with user_id and expires_at timestamp
3. Send email with reset link containing token
4. On reset: validate token, update password, invalidate token
5. Return success response
```

#### 3. Architecture Considerations

```markdown
**Architecture:**
```
POST /api/auth/reset-request
  │
  ├─ Validate email exists
  ├─ Generate token (32-byte random)
  ├─ Store token (user_id, token, expires_at)
  └─ Send email

POST /api/auth/reset
  │
  ├─ Validate token (exists, not expired, not used)
  ├─ Hash new password
  ├─ Update user.password
  ├─ Mark token as used
  └─ Return success
```
```

#### 4. Alternatives Considered

```markdown
**Alternatives Considered:**

**Option A: Token-based (CHOSEN)**
- Pros: Secure, stateless, no user data in email
- Cons: Requires database storage
- Decision: Chosen for security

**Option B: Password reset code**
- Pros: Simple to implement
- Cons: Less secure, predictable
- Decision: Rejected

**Option C: Email-based magic link**
- Pros: No password storage needed
- Cons: Changes authentication model
- Decision: Out of scope
```

---

### References Section

**Purpose:** Link task to relevant codebase files and dependencies

**Types of References:**

| Type | Format | Example |
|------|--------|---------|
| Source files | `- Code: \`path/to/file.ts\`` | `- Code: \`src/auth/reset.ts\` [example]` |
| Documentation | `- Docs: \`path/to/docs.md\`` | `- Docs: \`docs/api/auth.md\` [example]` |
| Tests | `- Tests: \`path/to/test.ts\`` | `- Tests: \`tests/auth/test_reset.ts\` [example]` |
| Configuration | `- Config: \`path/to/config.yaml\`` | `- Config: \`config/auth.yaml\` [example]` |
| Dependencies | `- Depends on: \`WBS_ID\`` | `- Depends on: \`0001\` [example]` |
| External | `- External: \`https://...\`` | `- External: \`https://owasp.org\` [example]` |

**Example References Section:**

```markdown
### References

**Code Files:**
- Code: `src/auth/tokens.ts` [example] (token generation)
- Code: `src/models/user.ts` [example] (user model)
- Code: `src/api/endpoints/auth.ts` [example] (API endpoints)
- Code: `src/services/email.ts` [example] (email service)

**Tests:**
- Tests: `tests/auth/test_tokens.ts` [example]
- Tests: `tests/api/test_reset_endpoint.ts` [example]

**Documentation:**
- Docs: `docs/api/authentication.md` [example]

**Configuration:**
- Config: `/config/auth.yaml`
- Config: `/config/email-providers.yaml`

**Task Dependencies:**
- Depends on: `0001_design_auth_flow.md`
- Depends on: `0002_user_model_update.md`

**External Resources:**
- External: `https://owasp.org/www-community/attacks/Brute_force_attack`
```

---

## Reference Gathering Strategy

### Prerequisites Before Gathering

Reference gathering assumes:
- Business analysis has identified relevant requirements
- System analysis has defined component boundaries and integration points
- Task scope is understood and documented

If these inputs are missing, **do not attempt to gather references** until they are provided.

### Tools to Use

| Tool | Purpose | Example |
|------|---------|---------|
| **Grep** | Find related code files | `grep -r "password_reset" src/` |
| **Glob** | Discover test files | `glob "**/*test*.ts"` |
| **Read** | Verify file contents | Read relevant files to confirm |
| **Grep** | Find usage patterns | `grep -r "User" src/models/` |

### Gathering Process

```
1. IDENTIFY KEYWORDS
   └─ From task name and requirements

2. SEARCH CODEBASE
   ├─ Use Grep for keyword matches
   ├─ Use Glob for pattern discovery
   └─ Use Read to verify relevance

3. ORGANIZE REFERENCES
   ├─ Group by type (code, tests, docs, config)
   ├─ Use absolute paths
   └─ Add context in comments

4. LINK DEPENDENCIES
   ├─ Identify related tasks
   ├─ Use WBS IDs for task references
   └─ Document relationship type
```

### Reference Gathering Checklist

- [ ] Search for main keyword in code files
- [ ] Search for related model/class names
- [ ] Find test files for related functionality
- [ ] Locate relevant documentation
- [ ] Identify configuration files
- [ ] Find dependent tasks by WBS ID
- [ ] Add external authoritative sources if applicable
- [ ] Verify all referenced files exist
- [ ] Use absolute paths only (no relative paths)

### Reference Quality

**Good references:**
- Specific files with clear relevance
- Absolute paths (no `../` or `./`)
- Include context in comments
- Grouped logically by type
- Verified to exist

**Bad references:**
- Vague "check the auth folder"
- Relative paths
- Files that don't exist
- No context or grouping
- Outdated file locations

---

## Best Practices

### File Naming

**Task File Format:**
```
{WBS}_{descriptive_name}.md

Examples:
- 0001_user_authentication.md
- 0002_database_setup.md
- 0047_oauth_google_provider.md
```

**Subtask Naming (Parent WBS Embedding):**
When a task is decomposed into subtasks, embed the parent's WBS in the subtask filename for traceability. The format is:

```
{new_wbs}_{parent_wbs}_{task_name}.md
```

**Correct subtask naming:**
```
# Parent task: 0253_migrate_anti-hallucination.md
# Subtasks (new WBS assigned by rd3:tasks):
- 0254_0253_create_rd3_anti-hallucination_skill.md
- 0255_0253_convert_ah_guard_to_typescript.md
- 0256_0253_create_ah_guard_unit_tests.md
```

**Incorrect subtask naming (AVOID):**
```
# DO NOT use sequence numbers after parent WBS (.1, .2, etc.)
- 0254_0253.1:_Create_rd3_anti-hallucination_SKILL.md_with_YAML_frontmatter.md
- 0255_0253.2:_Convert_ah_guard.py_to_ah_guard.ts_TypeScript.md
```

The WBS system already assigns sequential numbers — do NOT append `.1`, `.2` etc. after the parent WBS.

**Naming conventions:**
- Use WBS with leading zeros (4 digits)
- Use lowercase with underscores
- Be descriptive but concise
- Avoid special characters
- For subtasks: embed parent WBS as second segment

### Open Questions and Prerequisites

When business analysis or system analysis inputs are missing, record them:

```markdown
### Open Questions

1. [ ] What is the maximum acceptable password reset latency? (Business Analysis)
2. [ ] Should we use JWT or opaque tokens for reset tokens? (System Analysis)
3. [ ] Is there an existing email service to integrate with? (System Analysis)

### Prerequisites

- [ ] Requires: BA-2024-03-15 (Requirements finalization)
- [ ] Requires: SYS-2024-03-18 (Architecture decisions)
```

### Section Completeness

**Before considering a task file complete:**

- [ ] Background provides clear context
- [ ] Requirements are measurable
- [ ] Success criteria are specific
- [ ] Technical approach is documented
- [ ] Alternatives were considered
- [ ] Risks are identified
- [ ] References are complete and accurate
- [ ] Dependencies are linked by WBS ID
- [ ] All paths are absolute
- [ ] File is properly named with WBS
- [ ] Open questions from BA/SysAn are captured as prerequisites

### Common Mistakes to Avoid

| Mistake | Why Bad | Correct Approach |
|---------|--------|------------------|
| Empty sections | Provides no value | Populate with meaningful content |
| Vague requirements | Cannot verify completion | Use measurable criteria |
| Missing dependencies | Breaks workflow | Link all dependent tasks |
| Relative paths | Fragile, breaks on move | Always use absolute paths |
| No references | Hard to implement | Link relevant codebase files |
| Implementation in Background | Wrong section | Put technical details in Solutions |
| Missing acceptance criteria | Doneness unclear | Add checklist of criteria |
| Inventing BA/SysAn details | Scope creep | Record as open questions/prerequisites |

### File Maintenance

**When to update:**
- Status changes (update `status` and `updated_at`)
- New dependencies discovered (add to References)
- Requirements clarified (update Requirements section)
- Implementation changes (update Solutions section)
- Files moved/renamed (update References paths)

**Update discipline:**
- Always update `updated_at` timestamp
- Document reason for changes in commit message
- Keep WBS ID stable (don't rename files)
- Archive old versions if needed (don't delete history)
