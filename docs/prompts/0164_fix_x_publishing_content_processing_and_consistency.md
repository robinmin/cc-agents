---
name: Fix X Publishing - Content Processing & Consistency
description: |
  Fix content processing and consistency issues: md-to-html.ts escapeHtml single quotes, image regex inline dimensions, table-code-converter.ts duplicate interface and logic error, x-quote.ts cleanup pattern, x-browser.ts pageTarget check, x-playwright.ts missing selectors, x-utils.ts import paths, playwright.ts version sorting.

priority: P2
status: Done
affected_files:
  - plugins/wt/skills/publish-to-x/scripts/md-to-html.ts
  - plugins/wt/scripts/web-automation/src/table-code-converter.ts
  - plugins/wt/skills/publish-to-x/scripts/x-quote.ts
  - plugins/wt/skills/publish-to-x/scripts/x-browser.ts
  - plugins/wt/skills/publish-to-x/scripts/x-playwright.ts
  - plugins/wt/skills/publish-to-x/scripts/x-utils.ts
  - plugins/wt/scripts/web-automation/src/playwright.ts
estimated_complexity: medium
---

# Fix X Publishing - Content Processing & Consistency

Fix content processing bugs and improve code consistency across X publishing tools.

## Issues to Fix

### 1. md-to-html.ts - escapeHtml Missing Single Quotes (Line 127-132)

Current escapeHtml doesn't escape single quotes:

```typescript
// Line 127-132 - Missing single quote escaping
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  // Missing: .replace(/'/g, '&#39;')
}
```

**Fix**: Add single quote escaping.

### 2. md-to-html.ts - Image Regex for Inline Dimensions (Line 297)

Current image regex doesn't handle inline dimensions:

```typescript
// Line 297 - Basic image regex
const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
// Doesn't handle: ![alt](image.png "title" width=100 height=200)
```

**Fix**: Update regex to handle title attributes and inline dimensions.

### 3. table-code-converter.ts - Duplicate CdpConnection Interface

There may be duplicate CdpConnection interface/type definitions.

**Fix**: Remove duplicate interface definition if it exists.

### 4. table-code-converter.ts - Logic Error in imagePath.endsWith Check

There may be a logic error in image file extension checking.

**Fix**: Review and fix any logic error in image path validation.

### 5. x-quote.ts - Cleanup Pattern Inconsistency (Lines 189-203)

x-quote.ts cleanup pattern differs from x-browser.ts and x-video.ts.

**Fix**: Standardize cleanup pattern across all X publishing scripts.

### 6. x-browser.ts - Check pageTarget Before Use (Lines 67-72)

Current code may use pageTarget before proper null check:

```typescript
// Lines 67-72 - Potential null/undefined issue
let pageTarget = targets.targetInfos.find(
  (t) => t.type === "page" && t.url.includes("x.com"),
);

if (!pageTarget) {
  const { targetId } = await cdp.send<{ targetId: string }>(
    "Target.createTarget",
    { url: X_COMPOSE_URL },
  );
  pageTarget = { targetId, url: X_COMPOSE_URL, type: "page" };
}
// pageTarget should be checked after the if block
```

**Fix**: Ensure pageTarget is properly validated before subsequent use.

### 7. x-playwright.ts - Add Missing Selectors

May be missing fallback selectors for different X UI states.

**Fix**: Add alternative selectors for robustness.

### 8. x-utils.ts - Fix Import Paths (Lines 121-138)

Import paths may need adjustment for the new directory structure.

**Fix**: Verify and correct import paths in x-utils.ts.

### 9. playwright.ts - Simplify Version Sorting (Lines 302-312)

Current version sorting logic is overly complex:

```typescript
// Lines 302-312 - Complex version sorting
versions.sort((a, b) => {
  const parseV = (v: string) => v.split(".").map(Number);
  const va = parseV(a);
  const vb = parseV(b);
  for (let i = 0; i < Math.max(va.length, vb.length); i++) {
    const da = va[i] ?? 0;
    const db = vb[i] ?? 0;
    if (da !== db) return db - da;
  }
  return 0;
});
```

**Fix**: Simplify using a more readable approach or semver library.

## Implementation Steps

1. Read `/Users/robin/projects/cc-agents/plugins/wt/skills/publish-to-x/scripts/md-to-html.ts`
2. Fix escapeHtml to escape single quotes (add `.replace(/'/g, '&#39;')`)
3. Fix image regex to handle inline dimensions (line 297)
4. Read `/Users/robin/projects/cc-agents/plugins/wt/scripts/web-automation/src/table-code-converter.ts`
5. Remove duplicate CdpConnection interface if exists
6. Fix logic error in imagePath.endsWith check
7. Read other affected files and apply consistency fixes

## Acceptance Criteria

- [ ] md-to-html.ts escapes single quotes properly
- [ ] md-to-html.ts image regex handles inline dimensions
- [ ] table-code-converter.ts has no duplicate interfaces
- [ ] table-code-converter.ts image path validation logic is correct
- [ ] All X publishing scripts use consistent cleanup pattern
- [ ] x-browser.ts properly validates pageTarget
- [ ] x-playwright.ts has robust selectors
- [ ] x-utils.ts import paths are correct
- [ ] playwright.ts version sorting is simplified

## Verification

After fixes:

1. Test md-to-html.ts with various markdown content including single quotes
2. Test image handling with different formats
3. Test all X publishing scripts for consistent behavior
