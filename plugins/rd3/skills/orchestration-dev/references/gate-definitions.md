---
name: gate-definitions
description: "Extracted section: Gate Definitions"
see_also:
  - rd3:orchestration-dev
---

# Gate Definitions

### Gate Types

| Gate | Type | Trigger | Resolution |
|------|------|---------|------------|
| Solution Gate | Auto | Solution section populated | Pass/Fail |
| Design Gate | Human | Design section reviewed | Approve/Reject/Rework |
| Test Gate | Auto | Coverage target met and 100% tests pass | Pass/Fail |
| Review Gate | Human | Code review completed | Approve/Reject |
| Functional Gate | Auto/Human | BDD + functional review | Pass/Partial/Fail |
| Documentation Gate | Auto | Docs generated | Pass/Fail |

### Auto Gates

Gate evaluation in the v1 pilot differs by phase:

- **Phase 5 (Implementation):** Worker envelope validation — checks `status`, `artifacts`, and `evidence_summary` are present and non-contradictory.
- **Phase 6 (Testing):** CoV-backed `rd3:verification-chain` — runs typecheck, lint, and test steps with real checkers. The coverage threshold is set per-profile (simple/research: 60%, standard/complex: 80%, unit: 90%) and can be overridden with `--coverage`.
- **Phase 7 (Review):** Worker envelope validation — checks `status`, `findings`, and `evidence_summary`. Pauses for human approval unless `--auto` is set.
- **Phase 8 (Functional):** Not yet in pilot (direct-skill phase).
- **Phase 9 (Documentation):** Not yet in pilot (direct-skill phase).

Coverage threshold resolution (from `contracts.ts`):

```typescript
function getCoverageThreshold(profile: Profile, override?: number): number {
    if (override !== undefined) return override;  // --coverage flag wins
    if (isTaskProfile(profile)) return PROFILE_COVERAGE_THRESHOLDS[profile]; // simple: 60, standard: 80, complex: 80, research: 60
    return PHASE_PROFILE_COVERAGE_THRESHOLDS[profile] ?? 80; // unit: 90, others: 80
}
```

### Human Gates

For phases with human gates (Design, Review):

**Normal mode** — pauses for human approval:
```typescript
const humanGateResult = await askUserQuestion({
    type: 'approval',
    prompt: `Phase ${phase.number} (${phase.name}) completed. Review output and approve or request rework.`,
    choices: ['approve', 'reject', 'rework'],
});
```

**Auto mode** (`--auto` flag) — auto-approves all human gates without pausing:
```typescript
if (input.auto) {
    // Auto-approve: log and continue without pausing
    logger.info(`Phase ${phase.number} (${phase.name}): auto-approved (human gate bypassed)`);
    gateResult = { status: 'approved' };
} else {
    // Normal: pause for human review
    gateResult = await askUserQuestion({ ... });
}
```

When `--auto` is set, human gates (Design Gate, Review Gate, Functional Gate) are auto-approved. This enables end-to-end execution for commands like `dev-run` that need continuous flow.

**Skip phase safety:** `--skip-phases` is intentionally limited to trailing phases only. Skipping an interior phase would leave later phases without the inputs they require.

**Start phase safety:** `start_phase` selects a suffix of the selected profile's phase sequence. It is not an arbitrary jump; the chosen phase must already belong to the selected profile.

**Downstream evidence contracts:** orchestration normalizes verification-aware outputs through shared envelopes for `rd3:request-intake`, `rd3:bdd-workflow`, `rd3:functional-review`, `rd3:super-coder`, `rd3:super-tester`, and `rd3:super-reviewer`. Worker phase envelopes (5/6/7) must not include contradictory fields (e.g., `failed_stage` when `status=completed`).
