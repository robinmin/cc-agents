# Meta-Agent Workflow Schema

Shared workflow schema for the rd3 meta-agent skills:

- `cc-agents`
- `cc-commands`
- `cc-magents`
- `cc-skills`

This schema defines the common workflow framework. Each meta-skill adapts the content to its artifact family, but the structural concepts should remain aligned.

---

## Core Principles

1. Use the same concept-level operation set across all meta-agent skills.
2. Separate deterministic script work from invoking-agent judgment.
3. Use one shared decision vocabulary in documentation.
4. Model evolution as a closed-loop improvement workflow, not a thin wrapper around `refine`.
5. Keep artifact-specific rules local unless they are truly reusable.

---

## Standard Operation Set

All meta-agent workflow docs should use this concept-level operation set:

- `Create`
- `Validate`
- `Evaluate`
- `Refine`
- `Evolve`
- `Adapt`
- `Package` only where genuinely applicable

`Package` is currently exclusive to `cc-skills`, which has a clear distribution model (bundled skill directories). The other three meta-skills (`cc-commands`, `cc-agents`, `cc-magents`) model equivalent output bundling as part of `Adapt`. A broader packaging concept should only be introduced if multiple artifact families genuinely need it.

Script names do not need to match these concept names immediately.

---

## Decision Vocabulary

Workflow docs should use the same decision vocabulary:

- `BLOCK` = critical structural failure, cannot proceed safely
- `WARN` = valid enough to continue, but improvement is still needed
- `PASS` = acceptable

This vocabulary is documentation-first in Phase 1. Runtime script output may remain unchanged until a later alignment pass.

---

## Required Operation Structure

Each operation should be documented with the same section order where practical:

1. Operation summary
2. Workflow diagram
3. Step table
4. Step details
5. Deterministic handler responsibilities
6. Invoking-agent responsibilities
7. Decision states
8. Retry and rollback rules
9. Output artifacts

Not every operation requires the same depth, but all workflow docs should follow this structure closely enough that users can move between meta-skills without re-learning the format.

---

## Responsibility Split

Each workflow should explicitly distinguish:

- **Deterministic handlers**
  Scripts and adapters that perform parsing, validation, generation, or other repeatable logic.
- **Invoking-agent responsibilities**
  Review, prioritization, content improvement, and other judgment-heavy tasks.

This split is especially important in:

- `Validate`
- `Evaluate`
- `Refine`
- `Evolve`
- `Adapt`

---

## Evolve Closed Loop

Every `Evolve` workflow should model the same closed-loop lifecycle:

1. **Observe** relevant signals
2. **Analyze** patterns and gaps
3. **Propose** bounded improvements
4. **Apply** approved changes
5. **Verify** the resulting behavior
6. **Snapshot** history before or during apply
7. **Rollback** if verification fails or quality degrades
8. **Learn** by recording proposal and outcome history

Meta-skills may emphasize different signals or safety policies, but they should keep the same lifecycle model.

---

## Safety Expectations

Workflow docs should reflect these shared safety rules:

- risky changes require explicit confirmation
- deletion-heavy or wide-scope changes are not auto-applied by default
- behavior-changing proposals require matching verification
- rollback must be available for applied evolution proposals
- storage and audit history should use one shared convention

---

## Evolution Storage Convention

All four meta-agent skills use one shared history convention for evolution proposals, version snapshots, and rollback backups.

### Storage Root

```
<git-root>/.rd3-evolution/
```

This directory is git-ignored by default (runtime history artifacts).

### Namespace Layout

Each meta-skill stores its evolution data under a dedicated namespace:

```
.rd3-evolution/
├── cc-agents/
│   ├── proposals/      # Generated proposal sets (JSON)
│   ├── versions/       # Version snapshots before/after apply
│   └── backups/        # Pre-apply backups for rollback
├── cc-commands/
│   ├── proposals/
│   ├── versions/
│   └── backups/
├── cc-magents/
│   ├── proposals/
│   ├── versions/
│   └── backups/
└── cc-skills/
    ├── proposals/
    ├── versions/
    └── backups/
```

### Standardized Shapes

The following are consistent across all namespaces:

- **Proposal file**: JSON with id, target, evidence, confidence, risk, apply strategy
- **Version snapshot**: Full artifact content at a point in time with version id
- **Backup**: Pre-apply copy for rollback
- **History index**: Ordered list of applied versions with timestamps
- **Version id**: Monotonically increasing integer (`v1`, `v2`, ...)

### Git-Ignore Policy

The `.rd3-evolution/` directory is listed in `.gitignore`. Runtime history artifacts are not committed by default. Test fixtures for evolution behavior should be placed in skill-level `tests/fixtures/` directories instead.

---

## Output Expectations

Workflow docs should make outputs explicit:

- generated or updated artifact(s)
- validation or evaluation report(s)
- proposal set(s) for evolve
- snapshot and history artifacts when evolution changes are applied

This keeps the workflows usable as operational references rather than abstract prose.
