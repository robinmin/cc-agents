# PRD Templates

Three templates scaled by feature complexity. Choose based on scope and timeline.

**Actual template files:** `templates/prd-standard.md`, `templates/prd-onepage.md`, `templates/prd-feature-brief.md`

---

## Standard PRD

**File:** `templates/prd-standard.md`
**Use when:** Complex features, 6+ week timeline, multiple stakeholders, cross-team coordination.

### Sections (10)

### Sections

#### 1. Executive Summary
- Problem statement (2-3 sentences)
- Proposed solution (2-3 sentences)
- Business impact (3 bullet points)
- Timeline (high-level milestones)
- Resources required (team size, budget)
- Success metrics (3-5 KPIs)

#### 2. Problem Definition
- **Customer Problem:** Who, what, when, where, why, impact of not solving
- **Market Opportunity:** TAM/SAM/SOM, growth rate, competitive gaps, timing
- **Business Case:** Revenue potential, cost savings, strategic value, risk assessment

#### 3. Solution Overview
- **Proposed Solution:** High-level description, key capabilities, user journey, differentiation
- **In Scope:** Feature list with priority (P0/P1/P2)
- **Out of Scope:** Explicit exclusions, future considerations, cross-team dependencies
- **MVP Definition:** Core features, success criteria, timeline, learning goals

#### 4. User Stories & Requirements
- User stories in standard format (As a... I want... So that...)
- Functional requirements table (ID, requirement, priority, notes)
- Non-functional requirements (performance, scalability, security, reliability, usability, compliance)

#### 5. Design & UX
- Design principles
- Wireframes/mockups links
- Information architecture
- Interaction patterns

#### 6. Technical Considerations
- Architecture overview
- Data model
- API contracts
- Integration points
- Security considerations

#### 7. Success Metrics & Measurement
- KPIs with targets
- Measurement methodology
- Instrumentation plan
- Review cadence

#### 8. Timeline & Milestones
- Phase breakdown
- Dependencies
- Risk mitigation
- Launch plan

---

## One-Page PRD

**File:** `templates/prd-onepage.md`
**Use when:** Simple features, 2-4 week timeline, single team, clear scope.

### Sections

#### 1. Problem & Goal
- One-sentence problem statement
- Measurable goal (e.g., "Reduce checkout time by 30%")

#### 2. Proposed Solution
- 2-3 paragraph description of what we're building
- Key capabilities (bullet list)
- What's explicitly out of scope

#### 3. Success Criteria
- 3-5 acceptance criteria (testable, specific)
- Primary KPI with target

#### 4. Implementation Notes
- Technical approach (brief)
- Dependencies
- Timeline estimate
- Risks

---

## Feature Brief

**File:** `templates/prd-feature-brief.md`
**Use when:** Exploration phase, 1-week investigation, validating whether to invest further.

### Sections

#### 1. Hypothesis
- What we believe (e.g., "Users will convert 20% faster with one-click checkout")
- Evidence for/against
- What we need to learn

#### 2. Proposed Experiment
- What we'd build (minimum description)
- How we'd test it
- Success/failure criteria for the experiment

#### 3. Resource Estimate
- Rough effort estimate
- Skills needed
- Timeline for experiment

#### 4. Decision Framework
- If experiment succeeds → next steps
- If experiment fails → pivot or kill
- If inconclusive → extend or shelve

#### 5. Risk Assessment
- What could go wrong
- Mitigation strategies
- Opportunity cost of pursuing this

---

## Template Selection Guide

| Signal | Standard | One-Page | Feature Brief |
|---|---|---|---|
| Timeline | 6+ weeks | 2-4 weeks | 1 week |
| Scope | Multi-module | Single module | Investigation |
| Stakeholders | 3+ teams | 1-2 teams | 1 team |
| Confidence | High (validated) | Medium (assumed) | Low (hypothesis) |
| Output | Full specification | Implementation guide | Go/no-go decision |
