---
name: Fix X Publishing - Browser Launch & Cleanup
description: |
  Fix browser launch issues in playwright.ts, browser.ts, and x-video.ts: URL check logic error, missing await on require, cdp.close() await, and Chrome cleanup in preview mode.

priority: P1
status: Done
affected_files:
  - plugins/wt/scripts/web-automation/src/playwright.ts
  - plugins/wt/scripts/web-automation/src/browser.ts
  - plugins/wt/skills/publish-to-x/scripts/x-video.ts
estimated_complexity: medium
---

# Fix X Publishing - Browser Launch & Cleanup

Fix browser launch, URL checking, and cleanup issues in X publishing tools.

## Issues to Fix

### 1. playwright.ts - URL Check Logic Error (Line 516)

Current code has incorrect URL check in script template:

```typescript
// Line 516 - Logic error in URL check
if (targetUrl && !page.url().includes(targetBase)) {
  // targetBase is extracted from targetUrl, so this check is redundant
  // Also: `!page.url().includes(targetBase) || ''` - the `|| ''` is suspicious
}
```

**Fix**: Simplify the URL check logic to properly check if navigation is needed.

### 2. browser.ts - Missing Await on Require (Line 57-58)

Current code uses require() without await in getFreePort:

```typescript
// Lines 55-73 - getFreePort function
export async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = require("node:net").createServer(); // require works but inconsistent
    server.unref();
    server.on("error", reject);
    // ...
  });
}
```

While `require()` is synchronous and works, it's inconsistent with the async nature. Consider using dynamic import or refactoring.

**Fix**: Either:

- Keep as-is since require() is synchronous (document why it's acceptable)
- Or use `import('node:net')` with dynamic import for consistency

### 3. x-video.ts - Missing Await on cdp.close() (Lines 196-197)

Current code doesn't await cdp.close():

```typescript
// Lines 196-198 - Missing await
if (cdp) {
  cdp.close(); // Should be awaited
}
```

**Fix**: Add `await` before `cdp.close()`.

### 4. x-video.ts - Chrome Cleanup in Preview Mode (Lines 199-209)

Current code only cleans up Chrome when `submit` is true:

```typescript
// Lines 199-209 - Chrome cleanup only in submit mode
if (submit) {
  setTimeout(() => {
    if (!chrome.killed) try { chrome.kill('SIGKILL'); } catch (error) { ... }
  }, 2_000).unref?.();
  try { chrome.kill('SIGTERM'); } catch (error) { ... }
}
// BUG: In preview mode (!submit), Chrome is never cleaned up
```

**Fix**: Ensure Chrome cleanup happens in both submit and preview modes, with different behaviors:

- Submit mode: aggressive cleanup after submission
- Preview mode: graceful cleanup (SIGTERM first, then SIGKILL after timeout)

## Implementation Steps

1. Read `/Users/robin/projects/cc-agents/plugins/wt/scripts/web-automation/src/playwright.ts`
2. Fix URL check logic error (line 516) in the generated login detection script
3. Read `/Users/robin/projects/cc-agents/plugins/wt/scripts/web-automation/src/browser.ts`
4. Document or fix the require() usage pattern in getFreePort
5. Read `/Users/robin/projects/cc-agents/plugins/wt/skills/publish-to-x/scripts/x-video.ts`
6. Add `await` before `cdp.close()` (lines 196-198)
7. Fix Chrome cleanup to work in preview mode too (lines 199-209)

## Acceptance Criteria

- [ ] playwright.ts URL check logic is correct and clean
- [ ] browser.ts require() pattern is documented or fixed
- [ ] x-video.ts cdp.close() is properly awaited
- [ ] x-video.ts Chrome cleanup works in both submit and preview modes

## Verification

After fixes:

1. Test playwright.ts URL navigation with login detection
2. Test browser.ts getFreePort functionality
3. Test x-video.ts in both submit and preview modes - browser should clean up properly
