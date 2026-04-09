---
name: Purify executor layer: remove legacy executors, rename inline/subprocess/acp
description: Remove AutoExecutor/AcpExecutor, unify Executor interface, rename local→inline, direct→subprocess, acp-stateless→acp-oneshot, acp-sessioned→acp-session
status: Backlog
created_at: 2026-04-09T19:23:06.895Z
updated_at: 2026-04-09T20:00:00.000Z
folder: docs/tasks2
type: task
preset: "standard"
impl_progress:
  planning: completed
  design: completed
  implementation: pending
  review: pending
  testing: pending
---

## 0368. Purify executor layer: remove legacy executors, rename inline/subprocess/acp

### Background

Task 0363 simplified orchestration-v2 to default to direct execution. However, the executor layer still carries legacy artifacts:

1. **`auto.ts` (AutoExecutor)** — A compatibility shim that delegates to `AcpExecutor` with the default channel. Now that `local` is the default, `auto` is a confusing indirection. The routing policy in `adapter.ts` already handles fallback logic properly.

2. **`acp.ts` (AcpExecutor)** — The legacy ACP executor that `AutoExecutor` delegates to. Superseded by the cleaner `acp-stateless.ts` and `acp-sessioned.ts` adapters introduced in the transport decoupling work (0362).

3. **Naming confusion** — The current executor mode names don't clearly communicate *where* and *how* execution happens:
   - `local` could mean "local machine" — but `direct` also runs locally
   - `direct` is vague — direct to what?
   - `auto` suggests intelligence but just delegates to ACP
   - `acp-stateless` / `acp-sessioned` are implementation jargon, not user-facing clarity

4. **Dual interface split** — Two parallel interfaces (`Executor` in `model.ts` and `PhaseExecutorAdapter` in `adapter.ts`) do the same job. The pool maintains two parallel maps (`executors` + `adapters`) and uses `as unknown as Executor` casts in 3 places to bridge them. `AutoExecutor` even implements both.

5. **Duplicated type** — `ExecutorHealth` is defined in both `model.ts` and `adapter.ts`.

This task purifies the executor layer: remove dead code, unify interfaces, rename for clarity, and ensure the YAML vocabulary matches the mental model.

### Requirements

#### 1. Remove legacy executors

- [ ] Delete `plugins/rd3/skills/orchestration-v2/scripts/executors/auto.ts` and its test
- [ ] Delete `plugins/rd3/skills/orchestration-v2/scripts/executors/acp.ts` and its test
- [ ] Remove all imports/references to `AutoExecutor` and `AcpExecutor` from:
  - `pool.ts` — remove registration of `auto`/`current` aliases via `AutoExecutor`; map `current` → `inline` as deprecated alias
  - `adapter.ts` — no direct references expected, but verify
  - `runner.ts` — verify no direct usage
  - Any other files importing from `./auto` or `./acp`

#### 2. Rename executor modes

| Current name | New name | Class rename | File rename |
|---|---|---|---|
| `local` | `inline` | `LocalExecutor` → `InlineExecutor` | `local.ts` → `inline.ts` |
| `direct` | `subprocess` | `DirectExecutor` → `SubprocessExecutor` | `direct.ts` → `subprocess.ts` |
| `acp-stateless` | `acp-oneshot` | `AcpStatelessExecutor` → `AcpOneshotExecutor` | `acp-stateless.ts` → `acp-oneshot.ts` |
| `acp-sessioned` | `acp-session` | `AcpSessionedExecutor` → `AcpSessionExecutor` | `acp-sessioned.ts` → `acp-session.ts` |

Rationale for `acp-oneshot` / `acp-session` (Option B over Option C):
- Pure new names avoid collision with existing `acp` references in legacy code
- `oneshot` clearly says "fire-and-forget, no context carry-over"
- `session` clearly says "persistent context continuity"
- No ambiguity about whether bare `acp` means the old `AcpExecutor` or the new oneshot

#### 3. Unify `Executor` and `PhaseExecutorAdapter` into one interface

Currently two parallel interfaces exist:
- `Executor` in `model.ts` — has `capabilities: ExecutorCapabilities` (with `parallel`, `streaming`, `structuredOutput`, `channels`, `maxConcurrency`)
- `PhaseExecutorAdapter` in `adapter.ts` — has `executionMode`, `channels`, `name`

**Merge into a single `Executor` interface in `model.ts`:**

```typescript
export interface Executor {
  readonly id: string;
  readonly name: string;
  readonly channels: readonly string[];
  readonly maxConcurrency: number;
  execute(req: ExecutionRequest): Promise<ExecutionResult>;
  healthCheck(): Promise<ExecutorHealth>;
  dispose(): Promise<void>;
}
```

- Drop `ExecutorCapabilities` as a separate object — flatten `channels` and `maxConcurrency` onto `Executor`
- Drop `parallel`, `streaming`, `structuredOutput` — they are unused or always-false across all executors
- Drop `ExecutionMode` (`stateless` | `sessioned`) from the executor interface — this is an ACP-internal concern, not something the pool or runner needs to know about. Each ACP executor class knows its own mode internally
- Remove `PhaseExecutorAdapter` interface from `adapter.ts` — all executors implement the unified `Executor`

This eliminates:
- The dual maps (`executors` + `adapters`) in `ExecutorPool`
- All `as unknown as Executor` type casts (3 occurrences in pool.ts)
- The `useAdapters` toggle and `enableAdapterMode()`/`disableAdapterMode()` methods
- The conceptual split between "executor" and "adapter"

#### 4. Simplify `ExecutorPool` to a single map

Once the interface is unified, simplify `ExecutorPool`:

```typescript
export class ExecutorPool {
  private registry: Map<string, Executor> = new Map();
  private defaultId = 'inline';

  register(executor: Executor): void { ... }
  resolve(id: string): Executor { ... }
  execute(req: ExecutionRequest, executorId?: string): Promise<ExecutionResult> { ... }
  healthCheckAll(): Promise<Map<string, ExecutorHealth>> { ... }
  disposeAll(): Promise<void> { ... }
}
```

Remove: dual `executors` + `adapters` maps, `useAdapters` flag, `enableAdapterMode()`/`disableAdapterMode()`, legacy channel resolution path.

#### 5. Consolidate `ExecutorHealth` to one location

- [ ] Keep `ExecutorHealth` in `model.ts` (the single source of truth file)
- [ ] Remove duplicate `ExecutorHealth` from `adapter.ts`
- [ ] Update all imports to use `model.ts`

#### 6. Update YAML schema and validation

- [ ] `schema.ts` — update executor mode validation to accept `inline`, `subprocess` (reject `local`, `direct`, `auto` or accept with deprecation warning)
- [ ] `parser.ts` — normalize legacy values:
  - `local` → `inline`
  - `direct` → `subprocess`
  - `auto` → `inline`
  - `current` → `inline`
  - `acp-stateless:<x>` → `acp-oneshot:<x>`
  - `acp-sessioned:<x>` → `acp-session:<x>`
- [ ] All example YAML files in `references/examples/*.yaml` — no `executor:` line means default (`inline`); only add `executor: subprocess` where subprocess isolation is explicitly needed
- [ ] `references/pipeline-yaml-guide.md` — update documentation to reflect new vocabulary
- [ ] `references/cli-reference.md` — update if executor modes are mentioned

#### 7. Update pool and routing

- [ ] `pool.ts` — single `registry` map with `InlineExecutor` as default
- [ ] `pool.ts` — register legacy aliases with deprecation log:
  - `local` → `inline`
  - `direct` → `subprocess`
  - `auto` → `inline`
  - `current` → `inline`
  - `acp-stateless:<x>` → `acp-oneshot:<x>`
  - `acp-sessioned:<x>` → `acp-session:<x>`
- [ ] `adapter.ts` — update constants: `ADAPTER_LOCAL` → `ADAPTER_INLINE`, `ADAPTER_DIRECT` → `ADAPTER_SUBPROCESS`, add `ADAPTER_ACP_ONESHOT_PATTERN`, `ADAPTER_ACP_SESSION_PATTERN`
- [ ] `routing/policy.ts` — update default adapter ID references

#### 8. Update runner and model

- [ ] `runner.ts` — update any hardcoded `'local'`/`'direct'` strings
- [ ] `model.ts` — update `PhaseExecutorMode` type: `'auto' | 'local' | 'direct'` → `'inline' | 'subprocess'`
- [ ] `model.ts` — update `PhaseExecutorDefinition.mode` doc comments

#### 9. Update all tests

- [ ] Rename test files:
  - `local.test.ts` → `inline.test.ts`
  - `direct.test.ts` → `subprocess.test.ts`
  - `acp-stateless.test.ts` → `acp-oneshot.test.ts`
  - `acp-sessioned.test.ts` → `acp-session.test.ts`
- [ ] Delete `auto.test.ts` and `acp.test.ts`
- [ ] Update all test assertions referencing old names
- [ ] Update `runner.test.ts`, `adapter.test.ts`, `pool.test.ts` for new names
- [ ] Update `tests/config-parser.test.ts` and `tests/schema.test.ts`
- [ ] Remove tests for `ExecutorCapabilities`, `useAdapters`, `enableAdapterMode()`

#### 10. Update docs and SKILL.md

- [ ] `SKILL.md` line ~134 — update executor vocabulary description
- [ ] Ensure no stale references to old names as executor modes remain in any `.md` file

### Acceptance criteria

1. `bun run check` passes (lint + typecheck + test)
2. Zero references to `AutoExecutor`, `AcpExecutor`, `PhaseExecutorAdapter`, or `ExecutorCapabilities` in source
3. `auto.ts`, `auto.test.ts`, `acp.ts`, `acp.test.ts` deleted
4. Single `Executor` interface in `model.ts` — no parallel interface in `adapter.ts`
5. `ExecutorPool` uses a single `Map<string, Executor>` — no dual maps, no `as unknown` casts
6. `ExecutorHealth` defined only in `model.ts`
7. YAML `executor:` values are `inline`, `subprocess`, `acp-oneshot:<channel>`, or `acp-session:<channel>`
8. Legacy values (`local`, `direct`, `auto`, `current`, `acp-stateless:*`, `acp-sessioned:*`) accepted by parser with normalization + deprecation warning
9. All 713+ existing tests still pass
10. `default.yaml` and other example YAMLs have no `executor:` line (default = `inline`)

### Q&A

**Q: Should we keep backward compatibility for `local`/`direct` in YAML?**
A: Yes, the parser should normalize them with a deprecation warning via logger. Hard removal can happen in a future version.

**Q: Does `auto` need a replacement?**
A: No. `auto` was "use orchestrator default external backend" — but the default is now `inline` (in-process). If someone wants external, they should explicitly name the channel (`acp-oneshot:pi`). The routing policy handles everything `auto` used to do.

**Q: Why `acp-oneshot` / `acp-session` instead of bare `acp` / `acp-session`?**
A: Pure new names avoid collision with existing `acp` references in legacy code (`AcpExecutor`, `acp.ts`, imports from `./acp`). Clean break, no ambiguity.

**Q: Why not keep `ExecutorCapabilities`?**
A: The fields `parallel` (always false except mock), `streaming` (always false for subprocess, always true for local — never checked), `structuredOutput` (always false for subprocess — never checked) are dead weight. `channels` and `maxConcurrency` are the only useful fields — flatten them onto `Executor` directly.

**Q: What about `ExecutionMode` (stateless/sessioned)?**
A: This is ACP-internal. `AcpOneshotExecutor` knows it's stateless; `AcpSessionExecutor` knows it's sessioned. The pool doesn't need to know — it just calls `execute()`. Drop `ExecutionMode` from the shared interface.

**Q: What about `mock.ts`?**
A: Keep it. Update to implement the unified `Executor` interface. It's a test utility.

### Design

#### Final executor vocabulary

```
┌──────────────────────────────────────────────────────────────────┐
│  YAML executor value        →  Executor class       →  What happens  │
├──────────────────────────────────────────────────────────────────┤
│  (omitted / default)        →  InlineExecutor       →  import() in current process   │
│  inline                     →  InlineExecutor       →  import() in current process   │
│  subprocess                 →  SubprocessExecutor   →  Bun.spawn() child process     │
│  acp-oneshot:<agent>        →  AcpOneshotExecutor   →  acpx <agent> exec (one-shot)  │
│  acp-session:<agent>        →  AcpSessionExecutor   →  acpx <agent> prompt --session │
├──────────────────────────────────────────────────────────────────┤
│  DEPRECATED (accepted, normalized):                              │
│  local              → inline                                     │
│  direct             → subprocess                                 │
│  auto               → inline                                     │
│  current            → inline                                     │
│  acp-stateless:<x>  → acp-oneshot:<x>                            │
│  acp-sessioned:<x>  → acp-session:<x>                            │
└──────────────────────────────────────────────────────────────────┘
```

#### Isolation spectrum (mental model)

```
inline (same process) → subprocess (child process) → acp-oneshot/acp-session (external agent)
   no isolation            process isolation              network isolation
```

#### Unified Executor interface

```typescript
// model.ts — single source of truth
export interface Executor {
  readonly id: string;
  readonly name: string;
  readonly channels: readonly string[];
  readonly maxConcurrency: number;
  execute(req: ExecutionRequest): Promise<ExecutionResult>;
  healthCheck(): Promise<ExecutorHealth>;
  dispose(): Promise<void>;
}
```

#### Simplified ExecutorPool

```typescript
// pool.ts — single registry, no dual maps
export class ExecutorPool {
  private registry = new Map<string, Executor>();
  private defaultId = 'inline';

  register(executor: Executor): void;
  resolve(id: string): Executor;
  execute(req: ExecutionRequest, executorId?: string): Promise<ExecutionResult>;
  healthCheckAll(): Promise<Map<string, ExecutorHealth>>;
  disposeAll(): Promise<void>;
}
```

### Solution

Phase 1: Unify `Executor` + `PhaseExecutorAdapter` → single `Executor` interface in `model.ts`. Remove `ExecutorCapabilities`, consolidate `ExecutorHealth`.
Phase 2: Remove `auto.ts` + `acp.ts` and their tests. Update all imports.
Phase 3: Rename `local` → `inline`, `direct` → `subprocess` (files, classes, constants, IDs).
Phase 4: Rename `acp-stateless` → `acp-oneshot`, `acp-sessioned` → `acp-session` (files, classes, constants, IDs).
Phase 5: Simplify `ExecutorPool` to single map. Remove dual maps, `useAdapters`, adapter mode toggle.
Phase 6: Update schema validation, parser normalization with deprecation warnings.
Phase 7: Update runner, routing policy, all hardcoded strings.
Phase 8: Update all tests. Run `bun run check`.
Phase 9: Update documentation (SKILL.md, pipeline-yaml-guide.md, cli-reference.md, YAML examples).

### Plan

| Step | Description | Files | Risk |
|------|-------------|-------|------|
| 1 | Unify `Executor` interface in `model.ts`, remove `ExecutorCapabilities` | `model.ts`, `adapter.ts` | High |
| 2 | Consolidate `ExecutorHealth` to `model.ts` only | `model.ts`, `adapter.ts` | Low |
| 3 | Update all executor classes to implement unified `Executor` | 4 executor files | Medium |
| 4 | Delete `auto.ts`, `auto.test.ts`, `acp.ts`, `acp.test.ts` | 4 files | Low |
| 5 | Rename `local.ts` → `inline.ts`, update class/constants | 2 files | Medium |
| 6 | Rename `direct.ts` → `subprocess.ts`, update class/constants | 2 files | Medium |
| 7 | Rename `acp-stateless.ts` → `acp-oneshot.ts`, update class/constants | 2 files | Medium |
| 8 | Rename `acp-sessioned.ts` → `acp-session.ts`, update class/constants | 2 files | Medium |
| 9 | Simplify `ExecutorPool` to single `registry` map | `pool.ts` | High |
| 10 | Update `adapter.ts` constants and helpers | `adapter.ts` | Medium |
| 11 | Update `schema.ts` validation for new mode names | `schema.ts` | Low |
| 12 | Update `parser.ts` with legacy normalization + deprecation warnings | `parser.ts` | Medium |
| 13 | Update `runner.ts` hardcoded strings | `runner.ts` | Medium |
| 14 | Update `model.ts` type definitions (`PhaseExecutorMode`, etc.) | `model.ts` | Low |
| 15 | Update `routing/policy.ts` default adapter ID references | `policy.ts` | Medium |
| 16 | Update all test files (rename, assertions, remove dead tests) | ~10 test files | High (volume) |
| 17 | Update YAML examples | 8 YAML files | Low |
| 18 | Update documentation (SKILL.md, pipeline-yaml-guide.md, cli-reference.md) | 3 MD files | Low |
| 19 | Run `bun run check`, fix any issues | — | — |

### Review

*(to be filled after implementation)*

### Testing

- All existing 713+ tests must pass after changes
- Parser tests: verify normalization of all legacy values (`local` → `inline`, `direct` → `subprocess`, `auto` → `inline`, `acp-stateless:x` → `acp-oneshot:x`, `acp-sessioned:x` → `acp-session:x`)
- Schema tests: verify `inline` and `subprocess` accepted
- Pool tests: verify single map, legacy alias lookup, no `as unknown` casts
- Pool tests: verify `enableAdapterMode()`/`disableAdapterMode()` removed
- Executor interface tests: verify all 4 executors implement unified `Executor`
- Integration test: verify a pipeline YAML with no `executor:` field defaults to `InlineExecutor`

### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |
| Task spec | `docs/tasks2/0368_*.md` | Lord Robb | 2026-04-09 |

### References

- Task 0362: ACP transport decoupling (architecture skeleton)
- Task 0363: Simplify orchestration-v2 to default to direct execution
- Task 0367: Continue to simplify orchestration-v2
- `plugins/rd3/skills/orchestration-v2/scripts/executors/` — all executor source files
- `plugins/rd3/skills/orchestration-v2/scripts/model.ts` — `Executor`, `ExecutorCapabilities`, `ExecutorHealth`, `PhaseExecutorMode`
- `plugins/rd3/skills/orchestration-v2/scripts/executors/adapter.ts` — `PhaseExecutorAdapter`, duplicate `ExecutorHealth`
- `plugins/rd3/skills/orchestration-v2/scripts/executors/pool.ts` — dual maps, `as unknown` casts
- `plugins/rd3/skills/orchestration-v2/SKILL.md` line ~134 — executor vocabulary docs
