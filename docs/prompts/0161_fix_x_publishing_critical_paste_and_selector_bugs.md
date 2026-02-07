---
name: Fix X Publishing Critical - Paste & Selector Bugs
description: |
  Fix critical bugs in X publishing tools: paste.ts ydotool keycode format and early return issues, x-browser.ts missing await and error handling, and x-playwright.ts wrong selector.

priority: P0
status: Done
affected_files:
  - plugins/wt/scripts/web-automation/src/paste.ts
  - plugins/wt/skills/publish-to-x/scripts/x-browser.ts
  - plugins/wt/skills/publish-to-x/scripts/x-playwright.ts
estimated_complexity: low
---

# Fix Critical X Publishing Bugs - Paste & Selectors

Fix critical bugs in X publishing tools that prevent proper content pasting and button clicking.

## Issues to Fix

### 1. paste.ts - ydotool Keycode Format (Line 118-119)

Current code uses hardcoded keycodes for ydotool that may be incorrect:

```typescript
// Line 115 - Current (incorrect format)
{ cmd: 'ydotool', args: ['key', '29:1', '47:1', '47:0', '29:0'] }, // Ctrl down, V down, V up, Ctrl up
```

The ydotool keycode format may be wrong. Standard Linux keycodes:

- 29 = Left Ctrl
- 47 = v (or 46 = v depending on setup)

**Fix**: Verify and correct the ydotool keycode sequence for Ctrl+V paste on Linux/Wayland.

### 2. paste.ts - Early Return Bug (Line 135-136)

Current code has a logic error where ydotool is skipped entirely:

```typescript
// Lines 132-136 - Early return skips remaining tools
for (const tool of tools) {
  // ... xdotool tries and fails
  return false; // BUG: This returns immediately after xdotool fails, never trying ydotool
}

console.error("[paste] No supported tool found..."); // This line is unreachable
```

**Fix**: Remove the early return at line 132 or restructure the loop so all tools are attempted.

### 3. x-browser.ts - Missing Await (Line 142)

Current code doesn't await the paste() result:

```typescript
// Line 142 - Missing await
const pasteSuccess = paste({
  targetApp: "Google Chrome",
  retries: 5,
  delayMs: 500,
});
```

**Fix**: Add `await` before the paste() call.

### 4. x-browser.ts - Missing Error Handling (Lines 62-64)

Current code doesn't handle Chrome launch failures:

```typescript
// Lines 50-58 - Chrome spawn with no error handling
const chrome = spawn(chromePath, [...], { stdio: 'ignore' });

// Lines 62-64 - No try-catch around waitForChromeDebugPort
const wsUrl = await waitForChromeDebugPort(port, 30_000, { includeLastError: true });
```

**Fix**: Add try-catch around the Chrome launch and connection logic.

### 5. x-playwright.ts - Wrong Selector (Line 128)

Current code clicks wrong element:

```typescript
// Line 128 - Wrong selector
await page
  .click('[data-testid="tweetText"]', { timeout: 10000 })
  .catch(() => {});
// Should be:
await page
  .click('[data-testid="tweetButton"]', { timeout: 10000 })
  .catch(() => {});
```

**Fix**: Change selector from `tweetText` to `tweetButton`.

## Implementation Steps

1. Read `/Users/robin/projects/cc-agents/plugins/wt/scripts/web-automation/src/paste.ts`
2. Fix ydotool keycode format for Ctrl+V (line 115)
3. Fix early return bug (line 132)
4. Read `/Users/robin/projects/cc-agents/plugins/wt/skills/publish-to-x/scripts/x-browser.ts`
5. Add missing `await` on paste() call (line 142)
6. Add try-catch around Chrome launch and CDP connection (lines 50-70)
7. Read `/Users/robin/projects/cc-agents/plugins/wt/skills/publish-to-x/scripts/x-playwright.ts`
8. Fix selector from `tweetText` to `tweetButton` (line 128)

## Acceptance Criteria

- [ ] paste.ts ydotool keycode format corrected
- [ ] paste.ts early return bug fixed (both xdotool and ydotool are attempted)
- [ ] x-browser.ts paste() call is properly awaited
- [ ] x-browser.ts has error handling for Chrome launch failures
- [ ] x-playwright.ts uses correct `tweetButton` selector

## Verification

After fixes:

1. Test paste functionality on Linux (ydotool/xdotool)
2. Test x-browser.ts content pasting with images
3. Test x-playwright.ts post submission button
