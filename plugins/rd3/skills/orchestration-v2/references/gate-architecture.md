# Gate Architecture for orchestration-v2

Implementation-ready design for the three-gate model: `command`, `auto`, `human`.

## 1. Gate Semantics Matrix

| Property | `command` | `auto` | `human` |
|----------|-----------|--------|---------|
| **Determinism** | Deterministic | Non-deterministic | Human judgment |
| **Evaluation** | Shell command, exit code 0 = pass | verification-chain `llm` checker | Explicit approve/reject |
| **Evidence consumed** | None (self-contained) | Phase execution evidence bundle | Phase execution evidence + gate evidence |
| **Blocking** | Always blocking | Configurable (blocking or advisory) | Always blocking (pause) |
| **Rework** | Supported | Supported | Supported (manual) |
| **Cost** | Near-zero | LLM tokens per checklist | Human time |
| **Failure default** | Fail phase | Fail phase (blocking) or log (advisory) | Pause pipeline |

### Gate Ownership Boundaries

- **orchestration-v2 owns**: gate scheduling, evidence capture, rework/escalation, FSM transitions, result persistence, reporting
- **verification-chain owns**: checklist evaluation, LLM invocation, PASS/FAIL parsing, checker evidence
- **Pipeline YAML owns**: gate type selection, command string, checklist, rework config, policy

orchestration-v2 is an orchestrator. It never evaluates checklist items itself — it delegates non-deterministic verification to verification-chain.

## 2. Gate Configuration Model

### Unified YAML Schema

```yaml
phases:
  <phase-name>:
    skill: string
    gate:
      # ─── Shared fields ──────────────────────
      type: command | auto | human           # Required
      rework:                                # Optional
        max_iterations: number               # Default: 0
        escalation: pause | fail             # Default: pause

      # ─── command-specific ───────────────────
      command: string                        # Required for type: command

      # ─── auto-specific ─────────────────────
      checklist:                             # Required for type: auto (unless inherited)
        - "description text to evaluate"     # Each item must PASS for gate pass
      prompt_template: string                # Optional, overrides default prompt
      severity: blocking | advisory          # Default: blocking

      # ─── human-specific ─────────────────────
      prompt: string                         # Optional description shown at pause
    timeout: string
    after: [string]
    payload: { ... }
```

### Shared vs Gate-Specific Fields

| Field | `command` | `auto` | `human` |
|-------|-----------|--------|---------|
| `type` | required | required | required |
| `command` | required | forbidden | forbidden |
| `checklist` | forbidden | required* | forbidden |
| `prompt_template` | forbidden | optional | forbidden |
| `severity` | forbidden | optional | forbidden |
| `prompt` | forbidden | forbidden | optional |
| `rework` | optional | optional | optional |

\* `checklist` is required unless inherited from skill defaults (see Section 4).

### Validation Rules

- `command` type requires non-empty `command` string, must not have `checklist`, `prompt_template`, `severity`, or `prompt`
- `auto` type requires `checklist` (at least 1 item) unless skill provides defaults, must not have `command` or `prompt`
- `human` type must not have `command`, `checklist`, `prompt_template`, or `severity`
- `severity` only valid for `auto`, default is `blocking`
- `rework.max_iterations` >= 0, default 0
- `rework.escalation` is `pause` or `fail`, default `pause`

### Rework and Escalation Interaction

```
Phase execution succeeds → Gate check
  ├─ Gate passes → Phase completed
  ├─ Gate fails + rework available → Re-execute phase with feedback, re-check gate
  │   └─ Rework exhausted → Escalation
  │       ├─ pause → Pipeline PAUSED, human intervention
  │       └─ fail → Pipeline FAILED
  └─ Gate fails + no rework → Escalation (same as above)
```

For `auto` gates with `severity: advisory`:
- Gate failure logs a warning but does NOT trigger rework or escalation
- Gate result is recorded as `advisory_fail` (not `fail`) in state
- Phase completes regardless

## 3. Evidence Contract

### Phase Execution Evidence Bundle

After a phase skill executes, orchestration-v2 captures this evidence:

```typescript
interface PhaseEvidence {
  /** Phase execution result */
  success: boolean;
  exitCode: number;

  /** Captured outputs (capped) */
  stdout?: string;           // Capped at 4KB
  stderr?: string;           // Capped at 4KB
  structured?: Record<string, unknown>;  // Structured output from executor

  /** Resource metrics */
  duration_ms: number;
  resources?: ResourceMetrics[];

  /** File changes detected by git diff */
  files_changed: string[];
  files_added: string[];

  /** Task context */
  task_ref: string;
  phase_name: string;
  run_id: string;

  /** Rework context */
  rework_iteration: number;
  rework_feedback?: string;
}
```

### Evidence Availability per Gate Type

| Evidence | `command` | `auto` | `human` |
|----------|-----------|--------|---------|
| Phase stdout/stderr | Not used | Fed into LLM prompt | Available via `inspect` |
| Gate command output | Captured in gate result | N/A | N/A |
| Gate command exit code | Captured in gate result | N/A | N/A |
| Files changed | Not used | Fed into LLM prompt | Available via `inspect` |
| Checklist results | N/A | Captured in gate result | N/A |
| LLM raw output | N/A | Captured in gate result | N/A |

### Evidence Size Limits

| Source | Cap | Rationale |
|--------|-----|-----------|
| Phase stdout | 4 KB | Prevent token blowout in LLM prompts |
| Phase stderr | 4 KB | Same |
| Structured output | Full | Usually compact JSON |
| Files changed list | 100 entries | Most phases touch <50 files |
| LLM response per item | 500 chars | Checklist items are concise |
| Total evidence in gate result | 16 KB | SQLite row size sanity |

### Evidence Persistence

- Gate results are stored in the `gate_results` table (existing `GateResult` model)
- `PhaseEvidence` is stored as JSON in the `phase_records` table alongside existing fields
- `inspect --evidence` CLI command retrieves full evidence for debugging
- Evidence is included in `report` output

## 4. Source-of-Truth Precedence

Checklist and prompt configuration for `auto` gates is resolved in this order (highest priority first):

```
1. Pipeline YAML          — explicit `checklist` and `prompt_template` in gate config
2. Skill-level defaults   — skill manifest declares `default_checklist` and `default_prompt_template`
3. Engine defaults        — built-in generic checklist if neither YAML nor skill provides one
```

### Skill-Level Defaults

Skills can declare default gate configuration in their SKILL.md frontmatter:

```yaml
metadata:
  gate_defaults:
    auto:
      checklist:
        - "Phase output is complete and addresses task requirements"
        - "No obvious errors or inconsistencies in the output"
      prompt_template: null  # Uses engine default prompt
```

### Engine Defaults (Fallback)

If neither YAML nor skill provides a checklist, the engine uses:

```yaml
checklist:
  - "Phase completed successfully without errors"
  - "Output is consistent with task requirements"
```

This ensures `auto` gates always have a meaningful checklist, even for skills that don't declare one.

### Resolution Algorithm

```typescript
function resolveAutoChecklist(
  yamlConfig: GateConfig,
  skillDefaults: GateDefaults | undefined,
): string[] {
  if (yamlConfig.checklist && yamlConfig.checklist.length > 0) {
    return yamlConfig.checklist;
  }
  if (skillDefaults?.auto?.checklist && skillDefaults.auto.checklist.length > 0) {
    return skillDefaults.auto.checklist;
  }
  return ENGINE_DEFAULT_CHECKLIST;
}
```

### Verification Manifests

verification-chain manifests are **generated at runtime** by orchestration-v2 — they are never authored directly by pipeline users. The manifest is constructed from the resolved checklist, prompt template, and evidence bundle.

## 5. Policy Model

### Blocking vs Advisory

| Policy | `command` | `auto` | `human` |
|--------|-----------|--------|---------|
| **blocking** | Always (implicit) | Default | Always (implicit) |
| **advisory** | Not applicable | Optional via `severity: advisory` | Not applicable |

### Advisory Behavior

When an `auto` gate has `severity: advisory`:
- Gate runs the LLM evaluation as normal
- If the gate fails:
  - A warning event is emitted (`gate.advisory_fail`)
  - Gate result is stored with `status: 'advisory_fail'`
  - Phase completes (not paused or failed)
  - `report` shows the advisory failure separately from hard failures
- Rework is NOT triggered for advisory failures
- Advisory failures do NOT block downstream phases

### Strict vs Best-Effort Evaluation

- `command` gates are always strict: exit code 0 = pass, else fail
- `auto` gates are strict by default: all checklist items must pass
- `human` gates are always explicit: approve or reject

### Failure Semantics and Resumability

| Failure Type | FSM State | Resume Action | Recovery |
|-------------|-----------|---------------|----------|
| `command` fail | FAILED (or PAUSED if escalation=pause) | Resume with `--approve` (if paused) or `undo` + re-run | Fix code, re-run |
| `auto` fail (blocking) | FAILED (or PAUSED if escalation=pause) | Same as command | Fix output, re-run |
| `auto` fail (advisory) | RUNNING continues | N/A (no interruption) | Review advisory report |
| `human` reject | FAILED | `undo` + re-run | Address feedback |
| Phase execution fail | FAILED | `undo` + re-run | Fix executor issue |
| Rework exhausted (pause) | PAUSED | `--approve` | Manual fix + resume |

## 6. Observability Model

### Gate Result Payload

```typescript
interface GateResult {
  run_id: string;
  phase_name: string;
  step_name: string;              // 'command-gate' | 'auto-gate' | 'human-gate'
  checker_method: string;         // 'command' | 'llm' | 'human'
  passed: boolean;
  advisory?: boolean;             // true if severity=advisory and failed
  evidence: Record<string, unknown>;
  duration_ms: number;
  created_at: Date;
}
```

### Evidence by Gate Type

**Command gate evidence:**
```json
{
  "command": "bun test --coverage",
  "exitCode": 1,
  "stdout": "...",
  "stderr": "..."
}
```

**Auto gate evidence:**
```json
{
  "checklist": [
    { "item": "...", "passed": true, "reason": "..." },
    { "item": "...", "passed": false, "reason": "..." }
  ],
  "llm_raw_output": "...",
  "severity": "blocking",
  "source": "yaml | skill | engine"
}
```

**Human gate evidence:**
```json
{
  "prompt": "Review the implementation for task 0316",
  "response": "approve | reject",
  "files_changed": ["..."]
}
```

### State Persistence

- Gate results stored in SQLite `gate_results` table (already exists)
- Phase evidence stored in SQLite `phase_evidence` table (new, added by 0319)
- Advisory failures stored with `advisory: true` flag — queryable separately

### CLI Inspect/Report/Status

```bash
# Show gate result for a phase
orchestrator inspect <task> --phase <name>

# Show gate result with full evidence
orchestrator inspect <task> --phase <name> --evidence

# Show pipeline status with gate summary
orchestrator status <task>

# Generate report with gate details
orchestrator report <task> --format markdown

# Show advisory failures separately
orchestrator report <task> --format json | jq '.gates[] | select(.advisory==true)'
```

### Event Types for Gates

| Event | Payload | Trigger |
|-------|---------|---------|
| `gate.evaluated` | `{ phase, gate_type, passed, duration_ms }` | Every gate check |
| `gate.advisory_fail` | `{ phase, checklist_failures }` | Advisory auto-gate fail |
| `gate.rework` | `{ phase, iteration, max_iterations }` | Rework triggered |
| `gate.escalation` | `{ phase, escalation_type }` | Rework exhausted |

## 7. Migration Plan

### Phase 1: Schema and Model (0318 — this task)

**No runtime changes.** Update documentation to define the target model:
- [x] Gate semantics matrix (Section 1)
- [x] YAML schema (Section 2)
- [x] Evidence contract (Section 3)
- [x] Precedence model (Section 4)
- [x] Policy model (Section 5)
- [x] Observability model (Section 6)

### Phase 2: Example Pipeline Updates (0318 — this task)

Update example YAML files to annotate placeholder `auto` gates:
- `default.yaml` — add comment that `auto` is placeholder, will use verification-chain
- `security-first.yaml` — same
- `quick-fix.yaml`, `unit.yaml` — already use `command` only, no change needed

### Phase 3: Runtime Implementation (0319)

Changes to runtime code:
1. Extend `GateConfig` model with `checklist`, `prompt_template`, `severity`, `prompt` fields
2. Add `PhaseEvidence` capture in runner after phase execution
3. Replace placeholder `auto` path with verification-chain `llm` checker integration
4. Add advisory gate logic (warn but don't block)
5. Update CoV driver to delegate to verification-chain interpreter instead of reimplementing checks
6. Add `phase_evidence` table to state manager
7. Update `inspect` CLI to show evidence

### Phase 4: Validation Updates

1. Extend schema validation for new `auto` fields
2. Add validation for `severity` (only on `auto`)
3. Add validation for `checklist` (at least 1 item when present)
4. Add validation for `prompt` (only on `human`)

### Compatibility Guarantees

- `command` gates: **zero changes** to behavior
- `human` gates: **zero changes** to behavior, optional `prompt` field added
- `auto` gates: current placeholder **becomes real** — pipelines that relied on auto always passing will now get real evaluation
  - This is intentional: the placeholder was never production behavior
  - Migration note: pipelines that used `auto` as a no-op should switch to no gate or `command` with a trivial check

### Example Migration

**Before (placeholder auto):**
```yaml
intake:
  skill: rd3:request-intake
  gate: { type: auto }
```

**After (real auto with explicit checklist):**
```yaml
intake:
  skill: rd3:request-intake
  gate:
    type: auto
    checklist:
      - "Task requirements are clearly captured"
      - "Scope and boundaries are defined"
```

**Alternative (no gate, if no verification needed):**
```yaml
intake:
  skill: rd3:request-intake
  # No gate — phase completes on success
```

## 8. Rejected Alternatives

### A. Separate `llm` gate type instead of `auto`

Rejected because:
- Pipeline authors should express intent ("automatic verification"), not mechanism ("LLM")
- The mechanism should be pluggable — future checkers could use different approaches
- `auto` communicates the right semantics: "verify without human intervention"

### B. Multiple checkers per gate

Rejected because:
- verification-chain's `compound` checker already handles AND/OR/quorum composition
- Multiple gate-level checkers would create a parallel composition layer in orchestration-v2
- Single checklist keeps YAML simple; complex composition goes in verification-chain manifests

### C. Evidence streaming (pass outputs incrementally)

Rejected because:
- orchestration-v2 phases are discrete execution units
- Phase execution completes before gate evaluation starts
- Streaming would require fundamental changes to the execution model
- Can be revisited if needed for long-running phases

### D. Gate inheritance from presets

Rejected because:
- Presets already provide `defaults` for `payload` values
- Gate configuration is phase-specific; inheriting gates from presets would create confusion
- Checklist resolution via skill defaults (Section 4) covers the right use case

## 9. 0319 Implementation Contract

When 0319 begins implementation, it should find:

1. **No ambiguity in gate semantics** — each gate type has exactly one evaluation path
2. **Clear YAML schema** — new fields (`checklist`, `prompt_template`, `severity`, `prompt`) are defined
3. **Evidence model** — `PhaseEvidence` interface specifies what to capture and how to cap it
4. **Precedence algorithm** — checklist resolution is deterministic (YAML > skill > engine)
5. **Advisory behavior** — specified exactly: warn, don't block, record separately
6. **CoV integration point** — `auto` gate builds a verification-chain manifest with `llm` checker
7. **No overlapping systems** — orchestration-v2 delegates to verification-chain, doesn't reimplement
8. **Migration path** — known that placeholder `auto` users need to add checklists or remove gates

0319 should NOT:
- Redesign the evidence contract
- Change `command` gate behavior
- Change `human` gate behavior
- Introduce new gate types
- Create a second LLM evaluation system inside orchestration-v2
