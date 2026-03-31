---
name: gate-definitions
description: "Extracted section: Gate Definitions"
see_also:
  - rd3:orchestration-dev
---

# Gate Definitions

## Gate Model

All orchestration phases now execute through Chain-of-Verification manifests.

Each phase gate has two layers:

1. A deterministic validation node
2. An optional human approval node for phases whose gate type is `human` or `auto/human`

The deterministic node validates persisted phase-step evidence with CoV checker methods such as:

- `file-exists`
- `content-match`
- `compound`
- `cli` for stack-profile verification commands in Phase 6

## Phase Coverage

| Phase | Validation Surface | Human Node |
|------|---------------------|-----------|
| 1 Request Intake | Persisted step evidence + task-file profile/background/requirements/constraints checks when a task file is available | No |
| 2 Architecture | Persisted step evidence + non-empty direct-skill output | No |
| 3 Design | Persisted step evidence + non-empty direct-skill output | Yes |
| 4 Task Decomposition | Persisted step evidence + non-empty direct-skill output | No |
| 5 Implementation | Validated worker envelope evidence (`artifacts`, `next_step_recommendation`) | No |
| 6 Unit Testing | Stack-profile verification manifest (`cli`, `file-exists`) | No |
| 7 Code Review | Validated worker envelope evidence (`findings`, `next_step_recommendation`) | Yes |
| 8 Functional Review | Persisted step evidence + non-empty direct-skill output | `auto/human` on complex/research |
| 9 Documentation | Persisted step evidence + non-empty direct-skill output | No |

## Human Gates

Human-gated phases use the CoV `human` checker.

Normal mode:

- The deterministic validation node must pass first.
- The subsequent `human-approval` node pauses the chain.
- Orchestration state pauses at the phase with status `paused`.

Auto mode (`--auto`):

- The human node is omitted from the manifest.
- The phase completes immediately after deterministic validation succeeds.

Resume behavior:

- Resuming a paused orchestration implicitly approves the paused CoV human gate and continues from the saved chain state.

## Channel Routing

- Worker phases 5-7 execute on the requested orchestration channel (`current` or ACP agent).
- Direct-skill phases 1-4 and 8-9 are always pinned to `current`.
- CoV validation runs in the project workspace regardless of where the maker executed.

## Rework Interaction

- Rework retries operate at the phase level in `runtime.ts`.
- If a phase gate fails, the rejection reason is fed back into the next phase attempt.
- The public CLI defaults to `max_iterations: 2` and `escalation_state: 'paused'`.
- `--rework-max-iterations N` overrides the retry count for CLI runs.

## Notes

- Generic gate profiles are defined in `scripts/gates.ts`; there are no external JSON gate-profile files.
- Direct-skill phases no longer use synthetic success placeholders; they execute prompt-backed work and persist normalized gate evidence for CoV.
