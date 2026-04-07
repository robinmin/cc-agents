---
name: integrate Antigravity backend with config-driven switching
description: integrate Antigravity backend with config-driven switching
status: Done
created_at: 2026-04-07T21:31:08.863Z
updated_at: 2026-04-07T21:31:08.863Z
folder: docs/tasks2
type: task
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0359. integrate Antigravity backend with config-driven switching

### Background

After implementing the agy adapter, need to integrate it with the existing acpx-query.ts infrastructure so downstream consumers can switch backends via config only. The integration should allow: BACKEND=antigravity env var to switch from acpx to agy.

### Requirements

Integration must: (1) Add BACKEND environment variable (values: acpx|antigravity, default: acpx), (2) Implement backend selection logic in queryLlm and runSlashCommand, (3) Maintain backward compatibility - existing acpx behavior unchanged when BACKEND=acpx or unset, (4) Document the switching mechanism in code comments, (5) Ensure no breaking changes to existing callers. Output: Modified acpx-query.ts with integrated backend selection.

### Solution

**Backend selection via BACKEND env var:**

```typescript
// Environment variable for backend selection: 'acpx' or 'antigravity'
const ENV_BACKEND = 'BACKEND';

/** Supported backends */
export type Backend = 'acpx' | 'antigravity';

/**
 * Get the current backend selection.
 * Defaults to 'acpx' if BACKEND env var is not set or invalid.
 */
export function getBackend(): Backend {
    const backend = getEnv(ENV_BACKEND);
    if (backend === 'antigravity' || backend === 'agy') {
        return 'antigravity';
    }
    return 'acpx';
}
```

**Usage:** Downstream consumers simply set `BACKEND=antigravity` to switch from acpx to agy. No code changes required.

**Backward compatibility:** When `BACKEND` is unset or set to any value other than `antigravity`/`agy`, the default `acpx` backend is used — preserving all existing behavior.

### Artifacts

| Type | Path |
| ---- | ---- |
| Modified | `plugins/rd3/scripts/libs/acpx-query.ts` |
