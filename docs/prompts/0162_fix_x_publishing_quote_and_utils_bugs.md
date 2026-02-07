---
name: Fix X Publishing - Quote & Utils Bugs
description: |
  Fix bugs in x-quote.ts and x-utils.ts: hardcoded menu item index, variable shadowing, and wrong default skillName.

priority: P0
status: pending
affected_files:
  - plugins/wt/skills/publish-to-x/scripts/x-quote.ts
  - plugins/wt/skills/publish-to-x/scripts/x-utils.ts
estimated_complexity: low
---

# Fix X Publishing - Quote & Utils Bugs

Fix critical bugs in X quote posting and utility functions.

## Issues to Fix

### 1. x-quote.ts - Hardcoded Menu Item Index (Line 137)

Current code uses hardcoded nth-child(2) for quote menu item:

```typescript
// Lines 121 and 137 - Hardcoded menu item index
// Wait for quote option
expression: `!!document.querySelector('[data-testid="Dropdown"] [role="menuitem"]:nth-child(2)')`

// Click quote option (second menu item)
expression: `document.querySelector('[data-testid="Dropdown"] [role="menuitem"]:nth-child(2)')?.click()`
```

The menu structure may vary (retweet vs quote vs other options). The index can change if X adds menu items.

**Fix**: Use a more specific selector for the quote option, such as:
- Look for text content containing "Quote" or "Quote post"
- Use `data-testid` if available
- Or verify the menu structure dynamically

### 2. x-quote.ts - Variable Shadowing (Lines 104-106)

Current code shadows variable name causing confusion:

```typescript
// Lines 103-106 - Variable shadowing
console.log('[x-quote] Waiting for login...');
const loggedIn = await waitForRetweetButton();  // loggedIn shadows earlier declaration
if (!loggedIn) throw new Error('Timed out waiting for tweet...');
```

The variable `loggedIn` is used both for retweet button detection and login state, which can be confusing.

**Fix**: Rename the inner variable to something more descriptive like `retweetButtonVisible` or refactor to clarify the logic.

### 3. x-utils.ts - Wrong Default SkillName (Line 93)

Current code uses wrong default skill name:

```typescript
// Line 93 - Wrong default skillName
export function getDefaultProfileDir(skillName: string = 'x-browser'): string {
```

Should be `publish-to-x` to match the skill namespace.

**Fix**: Change default from `'x-browser'` to `'publish-to-x'`.

## Implementation Steps

1. Read `/Users/robin/projects/cc-agents/plugins/wt/skills/publish-to-x/scripts/x-quote.ts`
2. Fix hardcoded menu item index (lines 121, 137) - use more specific selector
3. Fix variable shadowing (lines 104-106) - rename inner variable
4. Read `/Users/robin/projects/cc-agents/plugins/wt/skills/publish-to-x/scripts/x-utils.ts`
5. Fix default skillName from `'x-browser'` to `'publish-to-x'` (line 93)

## Acceptance Criteria

- [ ] x-quote.ts uses specific selector for quote option (not hardcoded nth-child)
- [ ] x-quote.ts variable shadowing issue resolved
- [ ] x-utils.ts default skillName is `'publish-to-x'`

## Verification

After fixes:
1. Test x-quote.ts quote functionality - should find correct menu item
2. Test x-utils.ts profile directory resolution with default skill name
