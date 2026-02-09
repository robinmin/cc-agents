# Publish-to-* Skills Refactoring Analysis

## Current State Overview

### Common Library Location
- **Path**: `plugins/wt/scripts/web-automation/`
- **Modules**:
  - `cdp.ts` - CDP utilities (shared)
  - `playwright.ts` - Playwright utilities (shared)
  - `browser.ts` - Browser utilities
  - `clipboard.ts` - Clipboard utilities
  - `paste.ts` - Paste utilities
  - `table-code-converter.ts` - Table code converter

### Skills Implementation Matrix

| Skill | Current Approach | Status | Migration Priority |
|-------|------------------|--------|-------------------|
| `publish-to-wechatmp` | ✅ Playwright (migrated) | **Done** | N/A |
| `publish-to-qiita` | CLI-based (Qiita CLI) | No migration needed | N/A |
| `publish-to-medium` | API-based (Medium API) | No migration needed | N/A |
| `publish-to-infoq` | ❌ CDP (standalone cdp.ts) | Needs migration | High |
| `publish-to-substack` | ❌ CDP (standalone cdp.ts) | Needs migration | High |
| `publish-to-xhs` | ❌ CDP (standalone cdp.ts) | Needs migration | High |
| `publish-to-juejin` | ❌ CDP (standalone cdp.ts) | Needs migration | High |
| `publish-to-zenn` | ❌ CDP (standalone cdp.ts) | Needs migration | High |

## Common Patterns Identified

### 1. CDP-based Skills (InfoQ, Substack, XHS, Juejin, Zenn)

All CDP-based skills share these patterns:

#### Common Imports
```typescript
import { launchChrome, getPageSession, clickElement, evaluate, sleep, getDefaultProfileDir } from './cdp.js';
import { type ChromeSession } from './cdp.js';
```

#### Common Selectors Pattern
```typescript
const SELECTORS = {
  titleInput: [...],
  subtitleInput: [...],
  contentEditor: [...],
  tagsInput: [...],
  publishButton: [...],
  draftButton: [...],
} as const;
```

#### Common Utilities
- `getWtProfileDir()` - Get profile directory
- `getAutoPublishPreference()` - Get auto-publish setting
- `parseMarkdownFile()` - Parse markdown frontmatter
- `sanitizeForJavaScript()` - Sanitize strings for JS injection

### 2. Playwright Migration Pattern (from wechatmp)

The successful Playwright migration pattern:

1. **Use Playwright bundled Chromium** - Avoids Chrome lock file issues
2. **Launch with persistent context** - Maintains login sessions
3. **Use page.locator()** - More reliable than CDP element selection
4. **Explicit wait strategies** - `waitForSelector()`, `waitForTimeout()`
5. **Config parsing with trailing comma support** - JSONC handling

## Refactoring Strategy

### Phase 1: Enhance Web-Automation Library

Add missing utilities to `@wt/web-automation`:

1. **Config parsing**
   - JSONC support (trailing commas, comments)
   - Environment variable fallback

2. **Selector utilities**
   - Multi-selector fallback (try multiple selectors)
   - Element visibility checks
   - Click with retry

3. **Form utilities**
   - Fill input with validation
   - Select dropdown options
   - Checkbox/radio handling

4. **Content insertion**
   - HTML content insertion via clipboard
   - Image upload handling

### Phase 2: Migrate Skills (Priority Order)

1. **publish-to-substack** - Simplest (English UI, well-documented)
2. **publish-to-juejin** - Chinese UI (similar to wechatmp)
3. **publish-to-infoq** - Chinese UI
4. **publish-to-zenn** - Japanese UI
5. **publish-to-xhs** - Chinese UI

### Phase 3: Testing

Each migrated skill should be tested for:
- Login flow
- Article creation
- Content insertion
- Publishing/Saving draft

## File Structure After Migration

```
plugins/wt/
├── scripts/web-automation/
│   ├── src/
│   │   ├── cdp.ts              # Existing CDP utils
│   │   ├── playwright.ts       # Enhanced Playwright utils
│   │   ├── config.ts           # NEW: Config parsing
│   │   ├── selectors.ts        # NEW: Selector utilities
│   │   ├── forms.ts            # NEW: Form utilities
│   │   └── content.ts          # NEW: Content insertion
│   └── package.json
│
└── skills/publish-to-*/
    ├── SKILL.md
    ├── package.json
    ├── references/
    └── scripts/
        ├── {platform}-playwright.ts   # NEW: Playwright-based
        └── {platform}-utils.ts        # Existing utils (updated)
```

## Key Learnings from wechatmp Migration

### What Worked
1. **Playwright bundled Chromium** - More stable than system Chrome
2. **Persistent context** - Maintains login sessions across runs
3. **Explicit selector arrays** - Fallback selectors for robustness
4. **Manual confirm for critical dialogs** - Let user handle complex confirmations
5. **Debug screenshots** - Help troubleshoot UI issues

### What to Avoid
1. **System Chrome** - Lock file issues
2. **Single selector** - Brittle, breaks on UI changes
3. **Auto-confirm all dialogs** - Some dialogs need user attention
4. **Complex verify loops** - Simple timeout is more reliable

## Next Steps

1. ✅ Accept `publish-to-wechatmp` as-is (done)
2. ⏳ Enhance `@wt/web-automation` library
3. ⏳ Migrate remaining skills one-by-one
4. ⏳ Test each migrated skill
5. ⏳ Update documentation
