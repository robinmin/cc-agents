# Adaptive Requirements Elicitation

Patterns for interviewing users about feature requirements, calibrated to their expertise level.

**Source:** Adapted from maestro PM agent (expertise-adaptive interviewing) and bmad-method PM agent (WHY-driven discovery).

---

## Expertise Level Detection

Assess from the user's initial feature description:

| Level | Signals | Question Strategy |
|---|---|---|
| **Beginner** | Feature name only, no problem statement, no metrics | Foundational questions: who, what, why, how-measure |
| **Intermediate** | Problem statement exists, rough scope defined | Boundary questions: scope, success criteria, constraints |
| **Expert** | Problem + personas + metrics + trade-off awareness | Strategic questions: opportunity cost, sequencing, risk |

### Detection Rules

```
IF description has NO problem statement → Beginner
IF description has problem statement but NO success criteria → Intermediate
IF description has problem + criteria + personas → Expert
```

When uncertain, default to **Intermediate** — it's the least presumptuous.

---

## Question Taxonomy

### Purpose (2 questions)

1. **Why now?** — What changed that makes this the right time?
   - Beginner: "What problem are you trying to solve?"
   - Intermediate: "What triggered this request? New customer, competitor move, internal feedback?"
   - Expert: "What's the opportunity cost of NOT doing this now?"

2. **Expected outcome** — What does success look like?
   - Beginner: "How will you know this is working?"
   - Intermediate: "What metric should improve, and by how much?"
   - Expert: "What's the north star metric, and what leading indicators tell us we're on track?"

### Scope (4 questions)

3. **Boundaries** — What's in and what's out?
   - "What's explicitly included in this feature?"
   - "What's explicitly excluded? What are we NOT building?"

4. **Dependencies** — What must be in place first?
   - "Does this depend on other features, teams, or systems?"
   - "Are there blockers that must be resolved first?"

5. **Existing solutions** — What exists today?
   - "How do users solve this problem today?"
   - "What's wrong with the current approach?"

6. **Constraints** — What limits exist?
   - "Any technical constraints (platform, API, performance)?"
   - "Any business constraints (budget, timeline, compliance)?"

### Users (2 questions)

7. **Personas** — Who benefits?
   - "Who is the primary user? Describe a typical user."
   - "Are there secondary users or stakeholders?"

8. **Frequency** — How often?
   - "How often will users interact with this?"
   - "Is this a daily workflow or occasional task?"

### Success (4 questions)

9. **Acceptance criteria** — How to verify?
   - "What must be true for this to be 'done'?"
   - "Give me 3 specific acceptance criteria."

10. **Metrics** — How to measure?
    - "What KPI should this improve?"
    - "What's the current baseline and target?"

11. **Quality bar** — How good is good enough?
    - "What's the minimum quality bar for MVP?"
    - "What would make this 'excellent' vs 'acceptable'?"

12. **Validation** — How to confirm value?
    - "How will we know users actually want this?"
    - "What's the feedback mechanism after launch?"

### Constraints (3 questions)

13. **Timeline** — When?
    - "When does this need to ship?"
    - "Is there a hard deadline or event driving this?"

14. **Resources** — With what?
    - "How many engineers/designers can work on this?"
    - "Any budget constraints?"

15. **Technical** — How?
    - "Any specific technology requirements?"
    - "Performance, security, or compliance requirements?"

---

## Adaptive Depth Rules

| Level | Total Questions | Focus Areas | Skip Areas |
|---|---|---|---|
| **Beginner** | 5-7 | Purpose, Users, Success | Constraints (assume defaults) |
| **Intermediate** | 3-5 | Scope, Success, Constraints | Purpose (already known) |
| **Expert** | 2-3 | Constraints, Trade-offs | Purpose, Users (already defined) |

### Batching Rules

- Ask 3-5 questions per batch (never one-at-a-time)
- Group related questions together (all Scope questions, then all Success questions)
- In auto-mode: select questions based on gaps in the existing description, skip sections already covered

---

## Synthesis Pattern

After collecting answers:

1. **Problem statement** ← Purpose answers
2. **Scope definition** ← Scope answers
3. **User personas** ← Users answers
4. **Acceptance criteria** ← Success answers
5. **Constraints list** ← Constraints answers
6. **Feature metadata JSON** ← Combine all into structured metadata for ftree

```json
{
  "problem": "...",
  "personas": ["..."],
  "success_criteria": ["..."],
  "scope_in": ["..."],
  "scope_out": ["..."],
  "constraints": ["..."],
  "priority_hint": "..."
}
```
