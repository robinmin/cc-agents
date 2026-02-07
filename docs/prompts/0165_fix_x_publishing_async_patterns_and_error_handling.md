---
name: Fix X Publishing - Async Patterns & Error Handling
description: |
  Fix async patterns and error handling: paste.ts synchronous sleep and activateApp fallback, playwright.ts try-catch for chromium.launchPersistentContext, and other async improvements.

priority: P1
status: Done
affected_files:
  - plugins/wt/scripts/web-automation/src/paste.ts
  - plugins/wt/scripts/web-automation/src/playwright.ts
estimated_complexity: medium
---

# Fix X Publishing - Async Patterns & Error Handling

Fix async/await patterns, synchronous blocking issues, and improve error handling in X publishing tools.

## Issues to Fix

### 1. paste.ts - Synchronous Sleep That Can Hang (Lines 34-36)

Current synchronous sleep uses Atomics.wait which can block indefinitely:

```typescript
// Lines 34-36 - Synchronous sleep that can hang
function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
```

This can hang if the SharedArrayBuffer is not properly initialized or if there are race conditions.

**Fix Options**:

1. Replace with `const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));` and use async throughout
2. Add timeout and error handling to Atomics.wait
3. Document why synchronous sleep is needed and add safety checks

### 2. paste.ts - Improve activateApp Fallback Logic (Lines 51-70)

Current activateApp has limited fallback logic:

```typescript
// Lines 51-70 - Basic activateApp
export function activateApp(appName: string): boolean {
  if (getPlatform() !== "darwin") return false;

  const script = `...`;
  const result = spawnSync("osascript", ["-e", script], { stdio: "pipe" });
  return result.status === 0;
}
```

**Improvements**:

- Add fallback to `osascript` alternative methods
- Add retry logic with delay
- Better error reporting
- Handle edge cases (app not found, permissions issues)

### 3. playwright.ts - Try-Catch for chromium.launchPersistentContext

Generated script lacks error handling for browser launch:

```typescript
// Generated script around line 375 - No try-catch
const context = await chromium.launchPersistentContext(PROFILE_DIR, {
  headless: HEADLESS,
  slowMo: SLOW_MO,
  // ...
});
```

**Fix**: Add try-catch around browser launch to handle:

- Profile directory issues
- Browser executable not found
- Permission errors
- Port already in use

## Implementation Steps

1. Read `/Users/robin/projects/cc-agents/plugins/wt/scripts/web-automation/src/paste.ts`
2. Assess synchronous sleep implementation (lines 34-36):
   - Determine if async refactor is feasible
   - Or add safety checks and timeouts
3. Improve activateApp fallback logic (lines 51-70):
   - Add retry with exponential backoff
   - Add better error messages
   - Consider fallback methods
4. Read `/Users/robin/projects/cc-agents/plugins/wt/scripts/web-automation/src/playwright.ts`
5. Add try-catch around browser launch in generated script template

## Acceptance Criteria

- [ ] paste.ts synchronous sleep is safe (either async or with safety checks)
- [ ] paste.ts activateApp has robust fallback and retry logic
- [ ] playwright.ts generated script handles browser launch errors gracefully

## Verification

After fixes:

1. Test paste.ts on all platforms
2. Test activateApp with various application names
3. Test playwright.ts browser launch with invalid profile directories
