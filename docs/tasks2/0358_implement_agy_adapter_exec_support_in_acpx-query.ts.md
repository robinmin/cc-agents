---
name: implement agy adapter exec support in acpx-query.ts
description: implement agy adapter exec support in acpx-query.ts
status: Done
created_at: 2026-04-07T21:31:04.349Z
updated_at: 2026-04-07T21:31:04.349Z
folder: docs/tasks2
type: task
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0358. implement agy adapter exec support in acpx-query.ts

### Background

Core implementation of the Antigravity adapter. Based on investigation and design, implement the agy adapter that wraps the agy CLI binary. The adapter must support: (1) exec command for one-shot LLM queries, (2) graceful fallback for unsupported features, (3) interface compatibility with existing acpx-query.ts.

### Requirements

Implementation must: (1) Add AGY_BIN environment variable support, (2) Implement queryLlmAgy function that wraps agy exec, (3) Return { ok: false, stderr: 'Not supported by agy' } for unsupported features, (4) Conform to AcpxQueryOptions/AcpxQueryResult interfaces, (5) Pass existing tests and bun run check. Output: Modified acpx-query.ts with Antigravity adapter.

### Solution

**Files modified:** `plugins/rd3/scripts/libs/acpx-query.ts` (+344 lines)

**Key functions implemented:**

```typescript
// Environment variable for agy binary path
const ENV_AGY_BIN = 'AGY_BIN';
const DEFAULT_AGY_BIN = 'agy';

function getAgyBin(options?: AcpxQueryOptions): string

function buildAgyChatArgs(prompt: string, options?: AcpxQueryOptions): string[]

export function execAgyChat(command: string[], timeoutMs?: number): AcpxQueryResult

export function queryLlmAgy(prompt: string, options?: AcpxQueryOptions): AcpxQueryResult

export function queryLlmFromFileAgy(filePath: string, options?: AcpxQueryOptions): AcpxQueryResult

export function runSlashCommandAgy(_slashCommand: string, _options?: RunSlashCommandOptions): AcpxQueryResult

export function transformSlashCommandAgy(_slashCommand: string): string

export function checkAgyHealth(agyBin?: string): { healthy: boolean; version?: string; error?: string }
```

**Agent-to-mode mapping:**
```typescript
const modeMap: Record<string, string> = {
    'pi': 'agent',
    'codex': 'agent',
    'openclaw': 'agent',
    'opencode': 'agent',
    'gemini': 'agent',
    'kilocode': 'agent',
};
```

### Testing

All tests in `plugins/rd3/tests/acpx-query.test.ts` pass. `bun run check` passes.
