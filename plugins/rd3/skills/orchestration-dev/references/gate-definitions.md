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

```typescript
const AUTO_GATES: Record<PhaseNumber, GateChecker> = {
    5: (result) => result.artifacts.length > 0,
    6: (result) =>
        result.failed_tests === 0 &&
        Object.values(result.coverage.per_file ?? {}).every((value) => value >= getCoverageThreshold(profile, input.coverage)),
    7: (result) => result.issues.filter(i => i.severity === 'error').length === 0,
    8: (result) => result.verdict !== 'fail',
    9: (result) => result.artifacts.length > 0,
};

function getCoverageThreshold(profile: Profile, override?: number): number {
    if (override !== undefined) return override; // --coverage flag wins
    if (profile === 'unit') return 90;          // /dev-unit stricter default
    return PROFILE_DEFAULT_COVERAGE_THRESHOLD;  // 60% for simple/research, 80% otherwise
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

**Downstream evidence contracts:** orchestration normalizes verification-aware outputs through shared envelopes for `rd3:request-intake`, `rd3:bdd-workflow`, and `rd3:functional-review`.
