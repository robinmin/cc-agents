---
name: rubric-model
description: "Deterministic decomposition rubric that classifies tasks into skip/should/must decompose bands"
see_also:
  - rd3:task-decomposition
  - decomposition-decision-rules
---

# Decomposition Rubric Model

A deterministic scoring model that produces one of three decomposition decisions: `skip`, `should decompose`, or `must decompose`.

## Signal Definitions

Five primary signals, ordered by decision weight. A sixth (estimated line count) is a weak tie-breaker only.

| Signal | Abbreviation | Type | Description |
|--------|-------------|------|-------------|
| Estimated effort | E | hours | Total person-hours to complete the work |
| Deliverables | D | count | Number of independently reviewable deliverables (features, APIs, modules shipped) |
| Layers | L | count | Number of architectural layers or distinct modules touched |
| Coordination | C | ordinal | Dependency/coordination complexity: `none`, `moderate`, `high` |
| Risk class | R | ordinal | Need for separate review gates: `low`, `medium`, `high` |
| Line count | LOC | lines | Estimated lines changed (tie-breaker only, never primary trigger) |

### Signal Scoring

#### Estimated Effort (E)

| Hours | Score |
|-------|-------|
| ≤ 4 | 0 |
| > 4 and ≤ 8 | 1 |
| > 8 and ≤ 16 | 2 |
| > 16 | 3 |

#### Deliverables (D)

| Count | Score |
|-------|-------|
| 1 | 0 |
| 2 | 1 |
| 3+ | 2 |

#### Layers (L)

| Count | Score |
|-------|-------|
| 1 | 0 |
| 2 | 1 |
| 3+ | 2 |

#### Coordination (C)

| Level | Score | Examples |
|-------|-------|----------|
| none | 0 | Single module, no external dependencies |
| moderate | 1 | 2-3 internal dependencies, one external API |
| high | 2 | Multiple external services, shared state, migration coordination |

#### Risk Class (R)

| Level | Score | Examples |
|-------|-------|----------|
| low | 0 | New feature in isolated module, no security/safety impact |
| medium | 1 | Changes to shared utilities, API contract changes, data migration |
| high | 2 | Security-critical, financial logic, breaking API changes, data loss risk |

## Composite Score

```
score = E + D + L + C + R
```

Maximum possible: 3 + 2 + 2 + 2 + 2 = **11**

## Decision Bands

| Score | Decision | Label |
|-------|----------|-------|
| 0–2 | **skip** | Keep as one task. Write skip justification in Solution section. |
| 3–4 | **should decompose** | Recommended. Agent may keep as one task with written rationale, or decompose. |
| 5+ | **must decompose** | Mandatory decomposition. Create subtask files via `tasks create`. |

### Override Rules

Apply overrides in the following precedence order:

| Precedence | Override | Trigger | Result |
|------------|----------|---------|--------|
| 1 | **Force must** | Risk = `high` regardless of score | `must decompose` |
| 2 | **Force must** | E > 16 regardless of other signals | `must decompose` |
| 3 | **Force skip** | No force-must rule applied, score is 3-4, and all work stays in one file/module with one deliverable, one layer, zero coordination, and one review/rollback boundary | `skip` (with justification noting the override) |

**Precedence rule:** `force-must` always wins over `force-skip`. A localized security fix is still `must decompose`.

## Application Protocol

1. **Gather signals** — Estimate each signal before scoring. Record assumptions.
2. **Compute score** — Sum the five signal scores.
3. **Apply overrides** — Check override rules in precedence order.
4. **Read decision** — Map final score to decision band.
5. **Document** — Write the rubric assessment to the task's Solution section.

### Output Template

```markdown
### Decomposition Assessment

**Signals:**
| Signal | Value | Score |
|--------|-------|-------|
| Effort (E) | 6h | 1 |
| Deliverables (D) | 2 | 1 |
| Layers (L) | 2 | 1 |
| Coordination (C) | moderate | 1 |
| Risk (R) | low | 0 |
| **Total** | | **4** |

**Decision:** should decompose
**Override:** None applied
**Action:** Decompose into 2 subtasks by deliverable boundary.
```

### Skip Justification Template

When decision is `skip`:

```markdown
### Decomposition Assessment

**Signals:**
| Signal | Value | Score |
|--------|-------|-------|
| Effort (E) | 3h | 0 |
| Deliverables (D) | 1 | 0 |
| Layers (L) | 1 | 0 |
| Coordination (C) | none | 0 |
| Risk (R) | low | 0 |
| **Total** | | **0** |

**Decision:** skip
**Justification:** Single-file refactor, ~3h effort, no cross-module impact. Implementation plan goes in the Plan section below.
```

## Line Count Guidance (Tie-Breaker Only)

Estimated line count must NOT be used as a primary decomposition trigger. It may inform effort estimation (E signal) but should never independently force a decomposition decision.

| LOC | Guidance |
|-----|----------|
| < 100 | Generally supports `skip` — confirm with other signals |
| 100–500 | Neutral — neither supports nor opposes decomposition |
| > 500 | May indicate higher E — reassess effort estimate |

## Anti-Patterns (Rubric Violations)

| Violation | Detection | Correction |
|-----------|-----------|------------|
| Using LOC as primary trigger | Any decomposition rationale that leads with "N lines of code" | Reassess using E, D, L, C, R signals |
| Scoring after deciding | Rubric filled in after decomposition is already done | Apply rubric first, then decompose |
| Cherry-picking signals | Only counting high signals, ignoring low ones | All five signals must be assessed |
| Overriding without justification | Force-skip or force-must applied without recording the override | Document override reason in assessment |
