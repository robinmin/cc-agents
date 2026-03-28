# Question Taxonomy — Requirements Elicitation Templates

This document contains 18 categorized question templates for structured requirements elicitation. LLM selects 3-7 relevant templates per task based on detected gaps, domain hints, and prior answers.

## Category 1: Purpose (2 templates)

### P1: Core Motivation
**Template:** "What problem does this solve, and what happens if we don't solve it?"
**Use when:** Background is missing or vague
**Output:** Motivation statement + risk of inaction

### P2: Expected Outcomes
**Template:** "How will you measure success? What does 'done' look like?"
**Use when:** No acceptance criteria defined
**Output:** Success metrics + done criteria

## Category 2: Scope (4 templates)

### S1: In-Scope Elements
**Template:** "What specific components, features, or behaviors are in scope for this request?"
**Use when:** Scope is undefined
**Output:** Enumerated in-scope items

### S2: Out-of-Scope Boundaries
**Template:** "What is explicitly NOT part of this request? What would be a separate task?"
**Use when:** Scope creep risk or undefined boundaries
**Output:** Explicit exclusions

### S3: Scope Boundaries
**Template:** "Where does this request end? What related capabilities are explicitly separate?"
**Use when:** Unclear boundaries with adjacent systems
**Output:** Boundary definition

### S4: MVP Definition
**Template:** "What is the minimum viable version that delivers value? What can wait for v2?"
**Use when:** Large/complex scope
**Output:** MVP scope + future enhancements

## Category 3: Constraints (3 templates)

### C1: Technical Constraints
**Template:** "Are there specific technologies, frameworks, or architectural patterns we must use (or avoid)?"
**Use when:** Technical environment undefined
**Output:** Technology constraints + rationale

### C2: Resource Constraints
**Template:** "What is the budget, timeline, or team size constraint? Are there hard deadlines?"
**Use when:** Timeline or resources undefined
**Output:** Budget/time/team constraints

### C3: Non-Functional Requirements
**Template:** "Are there specific performance, security, scalability, or reliability requirements?"
**Use when:** NFRs not specified
**Output:** NFR specifications (metrics + thresholds)

## Category 4: Dependencies (2 templates)

### D1: Prerequisites
**Template:** "What must be in place before this can start? What other systems, APIs, or data are required?"
**Use when:** Dependencies not documented
**Output:** Dependency list with blocking/non-blocking classification

### D2: Blockers
**Template:** "Is anything currently blocking this work? Are there pending decisions or external dependencies?"
**Use when:** Risk of blocked work
**Output:** Blocker list with resolution paths

## Category 5: Acceptance Criteria (4 templates)

### A1: Functional Criteria
**Template:** "What specific behaviors must the system exhibit? What inputs produce what outputs?"
**Use when:** Functional requirements missing
**Output:** Scenario-based acceptance criteria

### A2: Verification Method
**Template:** "How will you verify each requirement is met? What test scenarios exist?"
**Use when:** No verification plan
**Output:** Verification method per requirement

### A3: Edge Cases
**Template:** "What are the edge cases, error conditions, or boundary scenarios that must be handled?"
**Use when:** Requirements focus only on happy path
**Output:** Edge case list

### A4: Stakeholder Approval
**Template:** "Who will approve that this is complete? What is their definition of 'done'?"
**Use when:** Stakeholder alignment unclear
**Output:** Approval criteria + approver list

## Category 6: Users (2 templates)

### U1: User Personas
**Template:** "Who are the end users? What are their roles, skill levels, and typical workflows?"
**Use when:** User context missing
**Output:** User persona descriptions

### U2: User Impact
**Template:** "How will this change the daily workflow of end users? What friction does this introduce/remove?"
**Use when:** User impact not analyzed
**Output:** Impact assessment per persona

## Category 7: Timeline (2 templates)

### T1: Deadlines
**Template:** "Are there specific dates, milestones, or deadlines we must hit?"
**Use when:** Timeline undefined
**Output:** Date-bound milestones

### T2: Phase Timeline
**Template:** "Is this part of a larger initiative with phase dependencies?"
**Use when:** Multi-phase project context
**Output:** Phase timeline with dependencies

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
