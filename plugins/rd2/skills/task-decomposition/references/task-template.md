# Task File Structure

This document provides detailed guidance on the structure and content of task files created by the `rd2:tasks` system.

## Table of Contents

- [Task File Template](#task-file-template)
- [Section Breakdowns](#section-breakdowns)
- [Reference Gathering Strategy](#reference-gathering-strategy)
- [Best Practices](#best-practices)

---

## Task File Template

### Complete YAML Frontmatter

When `rd2:tasks` creates task files, they follow this structure:

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
- Related code: `path/to/code/file.py`
- Documentation: `path/to/docs.md`
- Dependencies: `0002`, `0003`
```

### Frontmatter Fields

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

### Status Flow

```
Backlog → Todo → WIP → Testing → Done
    ↑                        ↓
    └────────────────────────┘
        (can reopen if needed)
```

---

## Section Breakdowns

### Background Section

**Purpose:** Provide context for why this task exists

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

**Problem:** Users currently cannot reset forgotten passwords, requiring manual admin intervention. This creates support burden and poor user experience.

**Context:** Part of authentication enhancement initiative. Integration with existing email service required.

**Why Now:** High support ticket volume (50+ weekly) related to password issues.
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
- [ ] Email contains valid reset link
- [ ] Email includes security notice
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

#### 5. Non-Functional Requirements

```markdown
**Non-Functional Requirements:**
- Security: Tokens must be cryptographically secure
- Privacy: Reset attempts logged but not token values
- Reliability: 99.9% email delivery rate
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

#### 5. Risk Mitigation

```markdown
**Risk Mitigation:**

| Risk | Mitigation |
|------|------------|
| Token brute force | Rate limiting, 32-byte tokens |
| Token leakage | HTTPS only, short expiry |
| Email interception | Email best practices, security notice |
| Replay attacks | Single-use tokens |
```

---

### References Section

**Purpose:** Link task to relevant codebase files and dependencies

**Types of References:**

| Type | Format | Example |
|------|--------|---------|
| Source files | `- Code: \`path/to/file.py\`` | `- Code: \`src/auth/reset.py\`` |
| Documentation | `- Docs: \`path/to/docs.md\`` | `- Docs: \`docs/api/auth.md\`` |
| Tests | `- Tests: \`path/to/test.py\`` | `- Tests: \`tests/test_reset.py\`` |
| Configuration | `- Config: \`path/to/config.yaml\`` | `- Config: \`config/auth.yaml\`` |
| Dependencies | `- Depends on: \`WBS_ID\`` | `- Depends on: \`0001\`` |
| External | `- External: \`https://...\`` | `- External: \`https://owasp.org\`` |

**Example References Section:**

```markdown
### References

**Code Files:**
- Code: `/src/auth/tokens.py` (token generation)
- Code: `/src/models/user.py` (user model)
- Code: `/src/api/endpoints/auth.py` (API endpoints)
- Code: `/src/services/email.py` (email service)

**Tests:**
- Tests: `/tests/auth/test_tokens.py`
- Tests: `/tests/api/test_reset_endpoint.py`

**Documentation:**
- Docs: `/docs/api/authentication.md`
- Docs: `/docs/security/token-storage.md`

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

### Tools to Use

| Tool | Purpose | Example |
|------|---------|---------|
| **Grep** | Find related code files | `grep -r "password_reset" src/` |
| **Glob** | Discover test files | `glob "**/*test*.py"` |
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

**Naming conventions:**
- Use WBS with leading zeros (4 digits)
- Use lowercase with underscores
- Be descriptive but concise
- Avoid special characters

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
