---
name: code-improvement
description: "Surface architectural friction and propose deepening opportunities — refactors that turn shallow, tightly-coupled modules into deep, testable, AI-navigable ones. Trigger when user wants to improve architecture, find refactoring opportunities, consolidate pass-through modules, reduce coupling, or improve testability. Uses CONTEXT.md domain vocabulary and docs/adr/ decisions when present; proceeds without them if absent."
license: Apache-2.0
version: 1.1.0
created_at: "2026-04-26"
updated_at: "2026-04-26"
platform: rd3
type: technique
tags: [architecture, refactoring, testability, deep-modules, code-quality, ai-navigable]
trigger_keywords:
  - improve architecture
  - refactor
  - tightly coupled
  - shallow module
  - untestable
  - AI-navigable
  - deepening
  - consolidate modules
  - reduce coupling
  - improve testability
  - architectural friction
  - hard to test
  - pass-through module
metadata:
  author: cc-agents
  platforms: "claude-code,codex,openclaw,opencode,antigravity"
  category: code-quality
  interactions:
    - pipeline
    - reviewer
  openclaw:
    emoji: "🏗️"
  severity_levels:
    blocker: Architectural friction so severe that further feature work compounds debt — recommend immediate refactor
    major: Shallow module or tight coupling causing recurring friction in tests or change cost — schedule near-term
    minor: Suboptimal seam placement with localized impact — backlog
    advisory: Stylistic or naming drift from CONTEXT.md vocabulary — fix opportunistically
  pipeline_steps:
    - name: Explore
      description: Read CONTEXT.md and docs/adr/ if present, then walk the codebase noting friction points and shallow modules
    - name: Present candidates
      description: List numbered deepening opportunities with Files / Problem / Solution / Benefits — no interfaces yet
    - name: Grilling loop
      description: User picks a candidate; walk the design tree together, updating CONTEXT.md or recording ADRs inline
see_also:
  - rd3:code-review-common
  - rd3:code-implement-common
  - rd3:code-verification
---

# rd3:code-improvement — Architectural Deepening

## Overview

Surface architectural friction in an existing codebase and propose **deepening opportunities** — refactors that turn shallow modules into deep ones. The aim is testability and AI-navigability.

Most refactor suggestions optimize the wrong thing: they extract small units for "cleanliness" while leaving complexity scattered across callers. This skill optimizes for **locality** (where complexity lives) and **leverage** (how much behaviour sits behind each interface). It treats the codebase's domain language as primary and resists generic terms like "service," "component," or "boundary."

Output is a numbered list of candidate refactors followed by an interactive design conversation — never silent code changes.

## Quick Start

```text
User: This auth code is a mess — half a dozen tiny modules, none of them
testable in isolation. Can you find ways to clean it up?

Skill activates → reads CONTEXT.md (if present) and docs/adr/ → uses
Agent(subagent_type=Explore) to map auth/ → presents 3-5 deepening
candidates with Files / Problem / Solution / Benefits → asks which to
explore → enters grilling loop on the chosen one.
```

Three trigger phrasings that should activate this skill:

1. *"Find refactoring opportunities in `src/billing/`"*
2. *"This module is too tightly coupled — how would you redesign it?"*
3. *"Help me make the order pipeline more testable."*

## Workflows

### Workflow 1: Full deepening pass

```
1. Read CONTEXT.md + docs/adr/ (skip silently if absent)
2. Agent(subagent_type=Explore) maps the target area
3. Apply deletion test to each suspected shallow module
4. Present 3-7 numbered candidates → ask which to explore
5. Grill the chosen candidate → propose deepened module shape
6. Side effects (inline): update CONTEXT.md vocabulary, record rejection ADRs
7. Optional: spawn parallel sub-agents for interface alternatives (see INTERFACE-DESIGN.md)
```

### Workflow 2: Targeted single-module deepening

```
1. User names a specific module they suspect is shallow
2. Run deletion test → confirm or refute
3. If confirmed shallow: skip candidate listing, go straight to grilling loop
4. If not shallow: explain why, then either close out or expand scope
```

### Workflow 3: Pre-implementation seam scouting

```
1. User has a feature in mind, wants to know where to put the seam
2. Read CONTEXT.md to anchor domain vocabulary
3. Identify existing modules adjacent to the new behaviour
4. Propose 2-3 seam placements, each with leverage/locality trade-off
5. Hand off to rd3:code-implement-common once seam is chosen
```

## Examples

### Example 1: Consolidating pass-through modules

```text
Candidate 2 — Order intake consolidation

Files:
  src/order/handlers/orderRouter.ts
  src/order/handlers/orderValidator.ts
  src/order/handlers/orderEnricher.ts
  src/order/handlers/orderDispatcher.ts

Problem:
  Each handler is ~30 lines and exists only to call the next one. Four
  files, four test setups, four sets of mocks — but the only real
  behaviour (validation rules, enrichment lookups) is buried.
  Deletion test: collapsing all four into one OrderIntake module would
  concentrate complexity in one place, not spread it. → shallow.

Solution:
  One OrderIntake module exposing `intake(rawOrder) → ValidatedOrder`.
  Validation rules and enrichment lookups become its private helpers.
  The seam moves up to OrderIntake itself.

Benefits:
  - Locality: order intake bugs localize to one file
  - Leverage: callers get one verb (`intake`) instead of four
  - Tests: one test file exercises the real behaviour through the real
    interface; no mock OrderRouter passing dummy data to mock OrderValidator.
```

### Example 2: Recording a rejection as an ADR

```text
User: We can't merge the OrderIntake — the validator runs in a Lambda
on a different schedule. Has to stay separate.

Skill: That's load-bearing. Want me to record this as ADR so future
architecture reviews don't re-suggest the merge?

→ Drafts: docs/adr/0042-keep-order-validator-separate.md
  Title: Keep OrderValidator as a standalone module
  Status: Accepted
  Context: OrderValidator runs in a separate Lambda on a 5-minute cron,
    independent of the OrderIntake request path.
  Decision: Validator stays as its own module with its own deployment unit.
  Consequences: OrderIntake retains a thin pass-through validator call;
    accepted as the cost of independent deployment.
```

### Example 3: Updating CONTEXT.md mid-conversation

```text
Skill (during grilling loop): The deepened module needs a name. Right now
it owns the lifecycle from "raw HTTP payload" to "persisted order with
enrichment." That's broader than what CONTEXT.md calls "Order" — closer
to "Order intake."

User: Yes, "Order intake" works.

Skill: Adding "Order intake" to CONTEXT.md:

  ### Order intake
  The lifecycle from inbound HTTP payload through validation and
  enrichment, ending with a persisted Order. Distinct from Order
  fulfilment, which begins post-persistence.

→ Continues design conversation with the new term locked in.
```

## When to Use

Activate this skill when the user:
- Asks to "improve the architecture" or "refactor" a codebase
- Describes modules as "tightly coupled," "hard to test," or "a mess"
- Wants to make a codebase more AI-navigable or maintainable
- Asks about consolidating shallow pass-through modules
- Wants to identify the best seam placements before implementing

Do not use for code review of individual PRs (use `rd3:code-review-common`) or for writing new features (use `rd3:code-implement-common`).

## Glossary

Use these terms exactly in every suggestion. Consistent language is the point — don't drift into "component," "service," "API," or "boundary." Full definitions in [LANGUAGE.md](LANGUAGE.md).

- **Module** — anything with an interface and an implementation (function, class, package, slice).
- **Interface** — everything a caller must know to use the module: types, invariants, error modes, ordering, config. Not just the type signature.
- **Implementation** — the code inside.
- **Depth** — leverage at the interface: a lot of behaviour behind a small interface. **Deep** = high leverage. **Shallow** = interface nearly as complex as the implementation.
- **Seam** — where an interface lives; a place behaviour can be altered without editing in place. (Use this, not "boundary.")
- **Adapter** — a concrete thing satisfying an interface at a seam.
- **Leverage** — what callers get from depth.
- **Locality** — what maintainers get from depth: change, bugs, knowledge concentrated in one place.

Key principles (see [LANGUAGE.md](LANGUAGE.md) for the full list):

- **Deletion test**: imagine deleting the module. If complexity vanishes, it was a pass-through. If complexity reappears across N callers, it was earning its keep.
- **The interface is the test surface.**
- **One adapter = hypothetical seam. Two adapters = real seam.**

This skill is _informed_ by the project's domain model when present — `CONTEXT.md` and any `docs/adr/`. The domain language gives names to good seams; ADRs record decisions the skill should not re-litigate. If `CONTEXT.md` exists, read it first and use its vocabulary throughout. If `docs/adr/` exists, scan it for decisions that constrain candidate proposals. Proceed silently if neither is present.

## Process

### Step 1: Explore

Read existing documentation first:

- `CONTEXT.md` (or `CONTEXT-MAP.md` + each `CONTEXT.md` in a multi-context repo) — if present
- Relevant ADRs in `docs/adr/` (and any context-scoped `docs/adr/` directories) — if present

If any of these files don't exist, proceed silently — don't flag their absence or suggest creating them upfront.

Then use the Agent tool with `subagent_type=Explore` to walk the codebase. Don't follow rigid heuristics — explore organically and note where you experience friction:

- Where does understanding one concept require bouncing between many small modules?
- Where are modules **shallow** — interface nearly as complex as the implementation?
- Where have pure functions been extracted just for testability, but the real bugs hide in how they're called (no **locality**)?
- Where do tightly-coupled modules leak across their seams?
- Which parts of the codebase are untested, or hard to test through their current interface?

Apply the **deletion test** to anything you suspect is shallow: would deleting it concentrate complexity, or just move it? A "yes, concentrates" is the signal you want.

### Step 2: Present candidates

Present a numbered list of deepening opportunities. For each candidate:

- **Files** — which files/modules are involved
- **Problem** — why the current architecture is causing friction
- **Solution** — plain English description of what would change
- **Benefits** — explained in terms of locality and leverage, and also in how tests would improve

**Use CONTEXT.md vocabulary for the domain (if present), and [LANGUAGE.md](LANGUAGE.md) vocabulary for the architecture.** If `CONTEXT.md` defines "Order," talk about "the Order intake module" — not "the FooBarHandler," and not "the Order service."

**ADR conflicts**: if a candidate contradicts an existing ADR, only surface it when the friction is real enough to warrant revisiting the ADR. Mark it clearly (e.g. _"contradicts ADR-0007 — but worth reopening because…"_). Don't list every theoretical refactor an ADR forbids.

Do NOT propose interfaces yet. Ask the user: "Which of these would you like to explore?"

### Step 3: Grilling loop

Once the user picks a candidate, drop into a grilling conversation. Walk the design tree with them — constraints, dependencies, the shape of the deepened module, what sits behind the seam, what tests survive.

Side effects happen inline as decisions crystallize:

- **Naming a deepened module after a concept not in `CONTEXT.md`?** Add the term to `CONTEXT.md` with the same discipline as a domain-model skill would (term, definition, relationships). Create the file lazily if it doesn't exist.
- **Sharpening a fuzzy term during the conversation?** Update `CONTEXT.md` right there.
- **User rejects the candidate with a load-bearing reason?** Offer an ADR, framed as: _"Want me to record this as an ADR so future architecture reviews don't re-suggest it?"_ Only offer when the reason would actually be needed by a future explorer to avoid re-suggesting the same thing — skip ephemeral reasons ("not worth it right now") and self-evident ones. A minimal ADR is: title, status (Rejected), context (1–3 sentences), decision (1 sentence), consequences (1–2 sentences).
- **Want to explore alternative interfaces for the deepened module?** See [INTERFACE-DESIGN.md](INTERFACE-DESIGN.md).

## Severity Taxonomy

Use these levels when ranking deepening candidates:

| Level | When to Apply |
|-------|---------------|
| **blocker** | Friction so severe further feature work compounds debt — recommend immediate refactor |
| **major** | Shallow module or tight coupling causing recurring test/change-cost friction — schedule near-term |
| **minor** | Suboptimal seam placement with localized impact — backlog |
| **advisory** | Naming drift from CONTEXT.md vocabulary — fix opportunistically |

## Reference Docs

- [LANGUAGE.md](LANGUAGE.md) — Full shared vocabulary for all architectural suggestions
- [DEEPENING.md](DEEPENING.md) — Dependency categories and testing strategy for deepening candidates
- [INTERFACE-DESIGN.md](INTERFACE-DESIGN.md) — Parallel sub-agent pattern for exploring alternative interfaces

## Additional Resources

- [LANGUAGE.md](LANGUAGE.md) — Full glossary including all 40+ architecture terms
- [DEEPENING.md](DEEPENING.md) — How to categorize dependencies and choose what to test
- [INTERFACE-DESIGN.md](INTERFACE-DESIGN.md) — Spawning parallel sub-agents to explore interface alternatives
- Sibling skills:
  - `rd3:code-review-common` — PR-level review with SECU framework
  - `rd3:code-implement-common` — Feature implementation with TDD
  - `rd3:code-verification` — Post-implementation verification

## Platform Notes

### Claude Code
- Spawn exploration with `Agent(subagent_type=Explore, ...)` for codebase walks
- Use parallel `Agent` calls when exploring multiple interface alternatives (see INTERFACE-DESIGN.md)
- Edit CONTEXT.md and ADRs inline using the `Edit` / `Write` tools during the grilling loop

### Codex / OpenClaw / OpenCode / Antigravity
- Use the platform's native exploration agent (or run `rg` / `sg` directly via Bash) in place of `Agent(subagent_type=Explore)`
- File edits to CONTEXT.md and ADRs use the platform's standard write tooling
- The skill body is platform-neutral — only the codebase-walk mechanism differs
