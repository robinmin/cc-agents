# Question Taxonomy — Requirements Elicitation Templates

This document contains 18 categorized question templates for structured requirements elicitation. LLM selects 3-7 relevant templates per task based on detected gaps, domain hints, and prior answers.

## Recommended Answer Format

**Key Enhancement**: Each question now includes recommended options to accelerate user response:

```
**Question:** [Open-ended question]
**Options:**
  1. **Yes** — [when this is recommended]
  2. **No** — [when this is not recommended]
  3. **[Custom]** — [alternative approach]

**Recommended:** [Option 1/2/3] with brief rationale
```

### Option Patterns

| Pattern Type | When to Use | Example |
|--------------|-------------|---------|
| **Yes/No** | Binary decision | "Should this be visible to all users?" |
| **Multi-choice (A/B/C)** | Multiple options | "What scope? A) This feature only B) Include tests C) Full integration" |
| **Scale** | Gradient choice | "Priority: High/Medium/Low" |
| **Pattern** | Recommended approach | "Use existing API / Create new endpoint" |

### Best Practices

- **Default to sensible defaults** — Most users prefer picking from options
- **Include 'Other' option** — Always allow custom input
- **Lead with recommended** — User can quickly confirm instead of typing
- **Keep options concise** — Max 4 options per question

## Category 1: Purpose (2 templates)

### P1: Core Motivation
**Template:** "What problem does this solve, and what happens if we don't solve it?"
**Use when:** Background is missing or vague
**Output:** Motivation statement + risk of inaction
**Options:**
  1. **User-facing feature** — Direct value to end users
  2. **Developer productivity** — Tooling, automation, or infrastructure improvement
  3. **Technical debt** — Refactoring, cleanup, or modernization
  4. **[Other]** — Describe the problem
**Recommended:** Option 1 or 2, depending on task context

### P2: Expected Outcomes
**Template:** "How will you measure success? What does 'done' look like?"
**Use when:** No acceptance criteria defined
**Output:** Success metrics + done criteria
**Options:**
  1. **Functional pass** — Feature works as specified
  2. **Code quality** — Tests pass, lint clean, typecheck passes
  3. **Both** — Full functionality + quality bar
  4. **[Custom criteria]** — Describe success metrics
**Recommended:** Option 3 (comprehensive)

## Category 2: Scope (4 templates)

### S1: In-Scope Elements
**Template:** "What specific components, features, or behaviors are in scope for this request?"
**Use when:** Scope is undefined
**Output:** Enumerated in-scope items
**Options:**
  1. **Minimal** — Core feature only
  2. **Standard** — Feature + unit tests
  3. **Complete** — Feature + tests + documentation
  4. **[Custom scope]** — List specific items
**Recommended:** Option 2 (standard)

### S2: Out-of-Scope Boundaries
**Template:** "What is explicitly NOT part of this request? What would be a separate task?"
**Use when:** Scope creep risk or undefined boundaries
**Output:** Explicit exclusions
**Options:**
  1. **None yet** — Scope is already well-defined
  2. **Known exclusions** — List specific out-of-scope items
  3. **[Will define later]** — May add exclusions during implementation
**Recommended:** Option 1 if task already has clear scope

### S3: Scope Boundaries
**Template:** "Where does this request end? What related capabilities are explicitly separate?"
**Use when:** Unclear boundaries with adjacent systems
**Output:** Boundary definition
**Options:**
  1. **Standalone** — No integration with other systems
  2. **API integration** — Integrates via existing APIs
  3. **UI integration** — Integrated into existing UI
  4. **[Custom boundaries]** — Describe specific limits
**Recommended:** Option 1 or 2 based on task context

### S4: MVP Definition
**Template:** "What is the minimum viable version that delivers value? What can wait for v2?"
**Use when:** Large/complex scope
**Output:** MVP scope + future enhancements
**Options:**
  1. **Ship all now** — Full scope, no v2
  2. **MVP first** — Core functionality now, enhancements later
  3. **Phased delivery** — Define specific phases
  4. **[Your preference]** — Describe the split
**Recommended:** Option 2 if scope is large

## Category 3: Constraints (3 templates)

### C1: Technical Constraints
**Template:** "Are there specific technologies, frameworks, or architectural patterns we must use (or avoid)?"
**Use when:** Technical environment undefined
**Output:** Technology constraints + rationale
**Options:**
  1. **No constraints** — Use best judgment
  2. **Use existing** — Must use existing patterns/libraries
  3. **Specific tech** — Must use [specify which]
  4. **[Custom constraints]** — Describe requirements
**Recommended:** Option 1 or 2 for most projects

### C2: Resource Constraints
**Template:** "What is the budget, timeline, or team size constraint? Are there hard deadlines?"
**Use when:** Timeline or resources undefined
**Output:** Budget/time/team constraints
**Options:**
  1. **No deadline** — Best effort delivery
  2. **Soft deadline** — Target date, flexible
  3. **Hard deadline** — Must deliver by [date]
  4. **[Describe constraints]**
**Recommended:** Option 1 unless deadline is known

### C3: Non-Functional Requirements
**Template:** "Are there specific performance, security, scalability, or reliability requirements?"
**Use when:** NFRs not specified
**Output:** NFR specifications (metrics + thresholds)
**Options:**
  1. **Standard quality** — Follow project defaults
  2. **Performance-critical** — Optimize for speed/memory
  3. **Security-critical** — Enhanced security requirements
  4. **[Specific NFRs]** — Describe requirements
**Recommended:** Option 1 unless specific NFRs are known

## Category 4: Dependencies (2 templates)

### D1: Prerequisites
**Template:** "What must be in place before this can start? What other systems, APIs, or data are required?"
**Use when:** Dependencies not documented
**Output:** Dependency list with blocking/non-blocking classification
**Options:**
  1. **No dependencies** — Can start immediately
  2. **Existing APIs** — Will use existing endpoints
  3. **Pending work** — Depends on [specify what]
  4. **[Describe dependencies]**
**Recommended:** Option 1 or 2 for most cases

### D2: Blockers
**Template:** "Is anything currently blocking this work? Are there pending decisions or external dependencies?"
**Use when:** Risk of blocked work
**Output:** Blocker list with resolution paths
**Options:**
  1. **No blockers** — Ready to start
  2. **Decision pending** — Awaiting [specify]
  3. **External dependency** — Waiting on [specify]
  4. **[Describe blocker]**
**Recommended:** Option 1 if task is ready to implement

## Category 5: Acceptance Criteria (4 templates)

### A1: Functional Criteria
**Template:** "What specific behaviors must the system exhibit? What inputs produce what outputs?"
**Use when:** Functional requirements missing
**Output:** Scenario-based acceptance criteria
**Options:**
  1. **Already defined** — Task has clear requirements
  2. **Need to define** — Will work through specifics
  3. **Example-based** — Provide concrete examples
  4. **[Your approach]** — Describe preference
**Recommended:** Option 1 if task file is well-formed

### A2: Verification Method
**Template:** "How will you verify each requirement is met? What test scenarios exist?"
**Use when:** No verification plan
**Output:** Verification method per requirement
**Options:**
  1. **Unit tests** — Test individual functions
  2. **Integration tests** — Test API/integration points
  3. **Manual verification** — User testing
  4. **[Verification approach]**
**Recommended:** Option 1 or 2 for most implementations

### A3: Edge Cases
**Template:** "What are the edge cases, error conditions, or boundary scenarios that must be handled?"
**Use when:** Requirements focus only on happy path
**Output:** Edge case list
**Options:**
  1. **Handle common errors** — Null, empty, invalid input
  2. **Standard edge cases** — Boundary values, race conditions
  3. **Comprehensive** — All error paths
  4. **[Specific cases]** — Describe edge cases
**Recommended:** Option 1 or 2 based on criticality

### A4: Stakeholder Approval
**Template:** "Who will approve that this is complete? What is their definition of 'done'?"
**Use when:** Stakeholder alignment unclear
**Output:** Approval criteria + approver list
**Options:**
  1. **Self-approval** — I am the stakeholder
  2. **CI/CD gate** — Automated checks pass
  3. **Manual review** — Human reviews and approves
  4. **[Approval process]**
**Recommended:** Option 1 for developer tasks, Option 2 for most features

## Category 6: Users (2 templates)

### U1: User Personas
**Template:** "Who are the end users? What are their roles, skill levels, and typical workflows?"
**Use when:** User context missing
**Output:** User persona descriptions
**Options:**
  1. **Internal developers** — Technical users, CLI/API focus
  2. **End users** — Non-technical, UI-focused
  3. **Both** — Internal and external users
  4. **[Describe users]**
**Recommended:** Option 1 for infrastructure/tools, Option 2 for consumer apps

### U2: User Impact
**Template:** "How will this change the daily workflow of end users? What friction does this introduce/remove?"
**Use when:** User impact not analyzed
**Output:** Impact assessment per persona
**Options:**
  1. **Reduces friction** — Makes something easier
  2. **Adds capability** — New functionality
  3. **Neutral impact** — Behind-the-scenes change
  4. **[Describe impact]**
**Recommended:** Option 1 or 2 depending on the change

## Category 7: Timeline (2 templates)

### T1: Deadlines
**Template:** "Are there specific dates, milestones, or deadlines we must hit?"
**Use when:** Timeline undefined
**Output:** Date-bound milestones
**Options:**
  1. **No deadline** — Deliver when ready
  2. **Soft target** — Target date [optional]
  3. **Hard deadline** — Must deliver by [required]
  4. **[Specify dates]**
**Recommended:** Option 1 unless deadline is explicit

### T2: Phase Timeline
**Template:** "Is this part of a larger initiative with phase dependencies?"
**Use when:** Multi-phase project context
**Output:** Phase timeline with dependencies
**Options:**
  1. **Standalone task** — No phase dependencies
  2. **Part of larger effort** — Will coordinate with [phase]
  3. **Phase 1 of N** — This is phase [N], future phases [list]
  4. **[Describe phases]**
**Recommended:** Option 1 for independent tasks

---

## Selection Heuristics

### Minimum Set (always ask if gap detected)
- If Background missing: P1, P2
- If Requirements missing: A1, A4

### Adaptive Selection
| Gap Detected | Recommended Templates |
|--------------|----------------------|
| No scope defined | S1, S2 |
| Large scope | S4 |
| No constraints | C1, C2 |
| No NFRs | C3 |
| No dependencies | D1, D2 |
| Happy-path only | A3 |
| No user context | U1, U2 |
| No timeline | T1, T2 |

### Domain Hints Mapping
| Domain Hint | Recommended Templates |
|-------------|----------------------|
| frontend | S1, U1, U2 |
| backend | S1, C1, D1 |
| api | S1, S2, C1 |
| database | C1, D1, A3 |
| security | C1, C3, A3 |
| performance | C3, A3, T1 |
| mobile | S1, U1, U2 |
| integration | D1, D2, S2 |

---

## Question Quality Checklist

For each selected template, verify:
- [ ] Open-ended (not yes/no)
- [ ] Provides context for WHY this matters
- [ ] Includes example response format
- [ ] Non-leading (doesn't suggest preferred answer)
- [ ] Actionable (user can provide concrete answer)
