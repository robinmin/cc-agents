# Quality Checklist — Cumulative Documentation Refresh

This checklist defines the quality bar for `rd3:code-docs`.

Documentation refresh fails if it adds noise, duplicates truth across docs, or leaves stale claims in place.

## MUST Pass

| Criterion | Description |
|-----------|-------------|
| Correct audience | Each change is written for the intended document audience |
| Relevant targets only | Only docs affected by the task are updated |
| Existing content read first | Updates are merged into current content, not written blindly |
| No stale contradictions | Old statements that conflict with the new behavior are updated or removed |
| Durable information only | Long-lived knowledge is preserved; transient noise is excluded |
| Concrete wording | Statements describe actual behavior, rules, or lessons |
| Mermaid for diagrams | Any diagram is written as Mermaid in a fenced markdown block |

## MUST Reject

| Criterion | Description | Example |
|-----------|-------------|---------|
| Blind append | Adds a new block without integrating with existing truth | "Task 0274 changed docs" dump at end of file |
| Wrong audience | User manual contains internal maintenance guidance | "Update impl_progress before phase completion" in user doc |
| Duplicate content | Same internal guidance copied into multiple docs without audience change | Same bullet list in architecture and developer spec |
| Task narrative instead of documentation | Reads like a status report, not project documentation | "We fixed this yesterday during review" |
| Transient debug noise | Temporary logs, dead-end experiments, or one-off command output preserved | stack traces, temporary shell snippets |
| Vague experience entry | Lesson lacks symptom, root cause, or prevention value | "Had some issues with planning" |
| Non-Mermaid diagrams | Diagram uses ASCII art, screenshots, or arbitrary formatting | text-box arrows or pasted images for architecture flow |

## SHOULD Warn

| Criterion | Description |
|-----------|-------------|
| Oversized deltas | Large new sections that should probably be integrated into smaller existing sections |
| Missing examples | User-facing or developer-facing changes would benefit from a short example |
| Mixed audiences | A section drifts between architecture, developer, and user concerns |
| Weak lesson framing | `99_EXPERIENCE.md` entry has a fix but no prevention heuristic |

## Audience Guardrails

### `docs/01_ARCHITECTURE_SPEC.md`

Keep:
- system boundaries
- responsibilities
- flows
- invariants

Reject:
- tutorial steps
- per-task history
- bug diary entries

### `docs/02_DEVELOPER_SPEC.md`

Keep:
- developer workflows
- internal conventions
- maintenance instructions
- command/skill behavior

Reject:
- end-user usage prose
- architecture rationale better kept in the architecture spec

### `docs/03_USER_MANUAL.md`

Keep:
- usage steps
- examples
- expected outputs
- caveats users need

Reject:
- implementation details
- internal maintenance steps

### `docs/99_EXPERIENCE.md`

Keep:
- symptom
- root cause
- fix
- prevention heuristic

Reject:
- chronological notes
- vague “learned something” entries
- lessons without reuse value

## Final Check Before Persisting

1. Does each updated file still read like a current source of truth?
2. Did the task’s durable knowledge land in the minimum correct set of docs?
3. Did any stale statement remain untouched?
4. Would a future reader know where to look for this information without consulting the task file?
5. If diagrams were added, are they Mermaid fenced blocks?
