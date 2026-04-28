# PM Frameworks Reference

## RICE Scoring

**Source:** Intercom's RICE framework for feature prioritization.

### Formula

```
RICE Score = (Reach × Impact × Confidence) / Effort
```

### Scoring Guide

| Component | Description | Scale |
|---|---|---|
| **Reach** | Number of users affected per quarter | Integer (e.g., 500, 1000, 5000) |
| **Impact** | Improvement magnitude | 3 = massive, 2 = high, 1 = medium, 0.5 = low, 0.25 = minimal |
| **Confidence** | Estimate certainty | 100% = high, 80% = medium, 50% = low |
| **Effort** | Person-months to build | Number (e.g., 0.5, 1, 2, 3) |

### Decision Rules

- Score > 100: High priority — consider for immediate roadmap
- Score 50-100: Medium priority — next quarter candidate
- Score < 50: Low priority — backlog or reconsider scope
- Confidence < 50%: Flag for research before prioritizing

### Example

| Feature | Reach | Impact | Confidence | Effort | Score |
|---|---|---|---|---|---|
| OAuth2 login | 2000 | 2 | 100% | 2 | 2000 |
| Dark mode | 5000 | 0.5 | 80% | 1 | 2000 |
| API rate limiting | 100 | 3 | 80% | 3 | 80 |

---

## MoSCoW Prioritization

**Source:** ProductPlan MoSCoW Guide.

### Categories

| Category | Definition | % of Release Capacity |
|---|---|---|
| **Must have** | Release fails without this. Non-negotiable, blocking. | 40-60% |
| **Should have** | Important but not critical. High value, can slip one release. | 20-30% |
| **Could have** | Desirable but not necessary. Nice-to-have if capacity allows. | 10-20% |
| **Won't have** | Explicitly out of scope. Document for future consideration. | 0% |

### Decision Criteria

**Must have** when:
- Legal or regulatory compliance requires it
- Product is unusable without it
- Blocking dependency for other Must-have features
- Core user journey is broken without it

**Should have** when:
- Significant user value but workaround exists
- Important for competitive parity
- High frequency use case but not critical path

**Could have** when:
- Enhances experience but not core value
- Low effort, high delight
- Can be added in a minor release

**Won't have** when:
- Requires significant investment for marginal return
- Better addressed by a different feature
- Strategic direction has shifted

---

## Jobs-to-be-Done (JTBD)

**Source:** Bob Moesta JTBD Playbook, Intercom JTBD Guide.

### Core Concept

People don't buy products — they "hire" them to make progress in specific situations.

### Job Story Format

```
When [situation],
I want to [motivation],
so I can [expected outcome].
```

### Four Forces of Progress

| Force | Direction | Description |
|---|---|---|
| **Push** | Away from current | Frustration with status quo |
| **Pull** | Toward new solution | Attraction of new possibility |
| **Anxiety** | Away from new | Fear of change, complexity |
| **Habit** | Toward current | Comfort with existing behavior |

### Interview Questions

1. "Tell me about the last time you [did the job]..." (situational)
2. "What were you trying to accomplish?" (motivation)
3. "What was frustrating about it?" (push)
4. "What would make it better?" (pull)
5. "What held you back from trying something new?" (anxiety/habit)

### Three Dimensions of Jobs

| Dimension | Example |
|---|---|
| **Functional** | "I need to deploy this code to production" |
| **Emotional** | "I want to feel confident my code won't break things" |
| **Social** | "I want my team to see me as someone who ships fast" |

---

## Kano Model

### Categories

| Category | Description | Effect on Satisfaction |
|---|---|---|
| **Must-be (Basic)** | Expected, taken for granted | Absence causes dissatisfaction; presence is neutral |
| **One-dimensional (Performance)** | More is better | Linear relationship with satisfaction |
| **Attractive (Delighter)** | Unexpected, pleasurable | Presence causes delight; absence is neutral |
| **Indifferent** | Doesn't affect satisfaction | No effect either way |
| **Reverse** | Some users actively dislike | Presence causes dissatisfaction |

### Survey Questions (per feature)

1. **Functional:** "How would you feel if this feature existed?"
   - I'd like it / I expect it / I'm neutral / I can live with it / I dislike it
2. **Dysfunctional:** "How would you feel if this feature did NOT exist?"
   - I'd like it / I expect it / I'm neutral / I can live with it / I dislike it

### Classification Table

| | Dysfunctional: Like | Dysfunctional: Expect | Dysfunctional: Neutral | Dysfunctional: Live with | Dysfunctional: Dislike |
|---|---|---|---|---|---|
| **Functional: Like** | Q | A | A | A | O |
| **Functional: Expect** | R | I | I | I | M |
| **Functional: Neutral** | R | I | I | I | M |
| **Functional: Live with** | R | I | I | I | M |
| **Functional: Dislike** | R | R | R | R | Q |

**Legend:** M=Must-be, O=One-dimensional, A=Attractive, I=Indifferent, R=Reverse, Q=Questionable

---

## User Story Mapping

**Source:** Jeff Patton, User Story Mapping.

### Process

1. **Write the big story** — Describe the user's end-to-end journey as a sequence of activities
2. **Identify steps** — Break each activity into concrete steps the user takes
3. **Layer details** — Under each step, add user stories from most to least essential (top to bottom)
4. **Slice releases** — Draw horizontal lines to define release boundaries:
   - **Walking skeleton (MVP)** — Minimum steps to get end-to-end flow working
   - **Release 1** — Add critical quality/performance stories
   - **Release 2** — Add nice-to-haves and edge cases

### Story Format

```
As a [persona],
I want to [action],
so that [benefit].

Acceptance Criteria:
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3
```

### Story Slicing Rules

- Each story should deliver user-visible value
- Stories in the same row are roughly equivalent in value
- Stories higher in the column are more essential
- A story should be completable in a single sprint
