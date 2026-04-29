# Decomposition Strategy Profiles

Four profiles that scope how features decompose into tasks. Applied as filters during `rd3:task-decomposition`.

Each profile has a **core philosophy** — a single principle that guides every decomposition decision. When in doubt, defer to the philosophy.

---

## Strategy Selection Guide

| Signal | Simplify | MVP | Standard | Mature |
|---|---|---|---|---|
| **Stage** | Intake / low-risk change | Early validation | Iterating on known need | Production-critical |
| **Confidence** | Sufficient for task creation | Low (hypothesis) | Medium (validated need) | High (proven, scaling) |
| **Risk tolerance** | High | High | Medium | Low |
| **Timeline pressure** | Immediate | Extreme | Normal | Low |
| **Compliance** | None | None | Industry standard | Regulatory required |
| **User base** | Internal/local | Internal/beta | Growing | Large/enterprise |

---

## Simplify Profile

**Philosophy: Only the useful core.**

> If a step does not change the task set or prevent obvious failure, skip it. The goal is to turn a clear enough request into a small executable plan without ceremony.

**Core principle:** Preserve just enough product thinking to avoid wrong work. Ask only blocking questions, avoid broad codebase analysis, skip detailed estimation, and create the minimum useful task set.

**Goal:** Convert a straightforward feature request into linked tasks quickly.

### Decision Rules

When decomposing with Simplify, apply these filters in order:

1. **Ask only blocking questions.** If the missing detail does not affect the first task set, defer it.
2. **Keep scope to the stated feature.** Do not expand into adjacent roadmap or architecture analysis.
3. **Use brief requirements.** Capture outcome, core behavior, and acceptance signal.
4. **Skip detailed estimates.** Use rough sizing only when needed to split tasks.
5. **Create the fewest tasks that remain executable.**

### Scope Rules

| Include | Exclude |
|---|---|
| Core behavior | Adjacent nice-to-haves |
| Blocking assumptions | Comprehensive elicitation |
| Brief acceptance signals | Full PRD sections |
| Existing obvious context | Broad reverse engineering |

### Testing Rules

| Include | Exclude |
|---|---|
| Manual smoke check | Coverage targets |
| Existing relevant test command if obvious | New test strategy design |

### Documentation Rules

| Include | Exclude |
|---|---|
| Brief task requirements | PRD/user manual/API docs |
| Key assumption notes | ADRs |

### Decomposition Pattern

```
Feature: <title>
├── Task 1: Implement core change (2-6h)
├── Task 2: Smoke check / minimal verification (1-2h)
└── Total: 1-2 tasks, 3-8h
```

### Exit Criteria

- Core behavior is represented by executable tasks
- Blocking assumptions are stated
- Feature is linked to the created tasks
- No broad analysis was needed

---

## MVP Profile

**Philosophy: Simplicity above all.**

> If it doesn't help us learn, don't build it. Every line of code is a liability until the hypothesis is validated. The fastest path to learning wins.

**Core principle:** Minimize investment, maximize learning speed. Cut every corner that doesn't affect the core hypothesis. Manual is fine. Incomplete is fine. Wrong is fine — as long as we find out fast.

**Goal:** Validate the hypothesis with minimum investment. Ship fast, learn fast.

### Decision Rules

When decomposing an MVP feature, apply these filters in order:

1. **Strip everything that doesn't serve the hypothesis.** If the feature exists to test "users want real-time collaboration", don't build offline sync.
2. **Prefer manual over automated.** If a human can do it in 5 minutes, don't spend 5 hours automating it.
3. **Prefer simple over correct.** In-memory storage is fine. Hardcoded values are fine. Copy-paste is fine.
4. **Prefer fast over complete.** Ship the happy path. Skip edge cases. Defer error recovery.
5. **Prefer observable over polished.** Add basic analytics to track the hypothesis. Skip UI polish.

### Scope Rules

| Include | Exclude |
|---|---|
| Happy path only | Edge cases |
| Core user journey | Secondary personas |
| Basic error handling | Comprehensive error recovery |
| Manual workarounds OK | Automation of all steps |
| In-memory or simple storage | Optimized data layer |
| Console.log-level logging | Structured logging |

### Testing Rules

| Include | Exclude |
|---|---|
| 1-2 critical path unit tests | Full unit coverage |
| Manual smoke test | Integration tests |
| — | E2E tests |
| — | Performance tests |
| — | Accessibility tests |

### Documentation Rules

| Include | Exclude |
|---|---|
| README with setup steps | User documentation |
| Inline code comments for non-obvious logic | API documentation |
| Known limitations list | Architecture decision records |

### Decomposition Pattern

```
Feature: <title>
├── Task 1: Implement core happy path (4-6h)
├── Task 2: Basic error handling (2-4h)
├── Task 3: Manual smoke test + README (2h)
└── Total: 1-3 tasks, 8-12h
```

### Exit Criteria

- Core user journey works end-to-end
- Can demo to stakeholders
- Instrumented for basic usage tracking
- Known limitations documented
- Hypothesis is testable

---

## Standard Profile

**Philosophy: Build it right, ship it steady.**

> Reliability is the baseline, not a luxury. Every feature should work correctly, handle known failures gracefully, and be maintainable by the next developer. Don't over-engineer, but don't cut corners on quality.

**Core principle:** Balance quality with delivery speed. Build it correctly for the known cases. Test it properly. Document it enough that someone else can maintain it. Don't optimize for scale you don't have yet.

**Goal:** Ship a reliable feature with proper testing and documentation. Default for most work.

### Decision Rules

When decomposing a Standard feature, apply these filters in order:

1. **Handle the happy path AND known edge cases.** If you know it can fail, handle it.
2. **Automate repetitive workflows.** If a human does it more than once, automate it.
3. **Use proper data storage.** If it persists, use a database. If it's shared, use a cache.
4. **Test the critical paths.** Unit tests for logic, integration tests for flows, E2E for the user journey.
5. **Document for the next developer.** README for setup, API docs for interfaces, inline comments for non-obvious logic.

### Scope Rules

| Include | Exclude |
|---|---|
| Happy path + known edge cases | Exotic edge cases |
| All identified user personas | Future personas |
| Proper error handling + recovery | Defensive coding for every scenario |
| Automated workflows | Manual processes |
| Proper data layer (DB, cache) | Optimized for extreme scale |
| Structured logging | Full observability stack |

### Testing Rules

| Include | Exclude |
|---|---|
| Unit tests (80%+ coverage target) | 100% coverage |
| Integration tests for key flows | Full integration suite |
| Basic E2E for critical path | Comprehensive E2E |
| — | Performance/load tests |
| — | Chaos engineering |

### Documentation Rules

| Include | Exclude |
|---|---|
| README + setup guide | Comprehensive user guide |
| API documentation (if API) | Formal API spec (OpenAPI) |
| Architecture notes | Full ADR |
| Inline documentation for public APIs | Internal API docs |

### Decomposition Pattern

```
Feature: <title>
├── Task 1: Data model + repository (4-6h)
├── Task 2: Core business logic (6-8h)
├── Task 3: API/interface layer (4-6h)
├── Task 4: Error handling + edge cases (4-6h)
├── Task 5: Unit + integration tests (4-6h)
├── Task 6: Documentation (2-4h)
└── Total: 4-6 tasks, 24-36h
```

### Exit Criteria

- All known edge cases handled
- Unit coverage ≥ 80%
- Integration tests for key flows
- API documented
- No known bugs in critical path
- Code reviewed by 1+ reviewer

---

## Mature Profile

**Philosophy: Stability is the foundation, not a feature.**

> The system must not fail. Every decision prioritizes reliability, observability, and resilience over speed of delivery. If it can break, it will break — plan for it. The cost of a production incident always exceeds the cost of building it right.

**Core principle:** Assume everything will fail. Build for resilience, observability, and recovery. The feature is not done when it works — it's done when it can't break silently, when failures are detected automatically, and when recovery is automated.

**Goal:** Production-grade reliability, observability, and compliance. For features that must not fail.

### Decision Rules

When decomposing a Mature feature, apply these filters in order:

1. **Assume adversarial input.** Validate everything. Sanitize everything. Trust nothing.
2. **Assume dependent services will fail.** Add timeouts, retries, circuit breakers, fallbacks.
3. **Assume the network will partition.** Design for eventual consistency. Add idempotency.
4. **Assume users will find every edge case.** Handle them all. Test them all.
5. **Assume you'll need to debug production.** Add structured logging, metrics, tracing from day one.
6. **Assume someone will need to operate this.** Write runbooks. Automate recovery. Document incidents.

### Scope Rules

| Include | Exclude |
|---|---|
| All edge cases including adversarial | — |
| All user personas + accessibility | — |
| Comprehensive error handling + retry + circuit breaker | — |
| Automated everything | Manual steps |
| Optimized data layer with indexes | Quick-and-dirty storage |
| Full observability (structured logging, metrics, distributed tracing) | Minimal logging |
| Security hardening (input validation, authZ, rate limiting, encryption) | Basic auth only |
| Performance optimization (profiling, caching, query optimization) | Unoptimized queries |
| Graceful degradation | Hard failures |

### Testing Rules

| Include | Exclude |
|---|---|
| Unit tests (90%+ coverage) | — |
| Integration tests (full suite) | — |
| E2E tests (all user journeys) | — |
| Performance/load tests (meets SLA) | — |
| Security tests (OWASP top 10) | — |
| Accessibility tests (WCAG 2.1 AA) | — |
| Chaos/resilience tests | — |
| Disaster recovery tests | — |

### Documentation Rules

| Include | Exclude |
|---|---|
| Comprehensive user guide | — |
| Full API spec (OpenAPI/protobuf) | — |
| Architecture Decision Records | — |
| Runbook for operations | — |
| Incident response playbook | — |
| Disaster recovery plan | — |

### Decomposition Pattern

```
Feature: <title>
├── Task 1: Data model + migration + indexes (6-8h)
├── Task 2: Core business logic + validation (8h)
├── Task 3: API layer + authZ + rate limiting (6-8h)
├── Task 4: Error handling + retry + circuit breaker (6-8h)
├── Task 5: Observability (structured logging, metrics, tracing) (4-6h)
├── Task 6: Unit tests (90%+ coverage) (6-8h)
├── Task 7: Integration tests (full suite) (6-8h)
├── Task 8: E2E tests (all journeys) (6-8h)
├── Task 9: Performance tests + optimization (4-6h)
├── Task 10: Security hardening (4-6h)
├── Task 11: Accessibility audit + fixes (4-6h)
├── Task 12: Documentation (user guide + API spec + runbook + DR plan) (6-8h)
└── Total: 10-12 tasks, 60-80h
```

### Exit Criteria

- All edge cases handled including adversarial
- Unit coverage ≥ 90%
- Integration + E2E tests comprehensive
- Performance meets SLA under expected load
- Security audit passed (OWASP top 10)
- Accessibility audit passed (WCAG 2.1 AA)
- Full documentation published
- Runbook and incident playbook reviewed
- Disaster recovery plan documented and tested
- Code reviewed by 2+ reviewers

---

## Philosophy Comparison

| Dimension | MVP | Standard | Mature |
|---|---|---|---|
| **Core question** | "Does anyone want this?" | "Does it work reliably?" | "Can it survive anything?" |
| **What to cut** | Everything non-essential | Exotic edge cases | Nothing |
| **What to keep** | Just the hypothesis test | Happy path + known failures | Everything |
| **Error handling** | Log and move on | Handle known errors | Handle all errors + retry + fallback |
| **Testing** | 1-2 critical tests | 80% coverage + integration | 90%+ coverage + E2E + perf + security |
| **Documentation** | README only | README + API docs | Full docs + runbook + DR plan |
| **Observability** | Console.log | Structured logging | Full stack (logs + metrics + traces) |
| **Security** | Basic auth | Input validation | Full hardening (OWASP) |
| **Performance** | Works on my machine | Works under normal load | Works under extreme load |
| **Failure mode** | Crash and learn | Fail gracefully | Recover automatically |
| **Review depth** | Self-review | 1 reviewer | 2+ reviewers |

---

## Profile Override Rules

1. **User can override** — If user specifies `--strategy mature` but task is small, apply mature testing but reduce scope proportionally
2. **Compliance trumps** — If regulatory requirement exists, force `mature` regardless of user preference
3. **MVP → Standard upgrade** — If MVP reveals the feature is critical, recommend upgrading to standard before shipping
4. **Strategy is per-feature** — Different features in the same project can use different strategies
5. **Philosophy is the tiebreaker** — When a decomposition decision is ambiguous, defer to the profile's core philosophy
