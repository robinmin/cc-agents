# Publish-to-Zenn Playwright Migration Complete ✓

## Summary

Successfully migrated `publish-to-zenn` browser automation method from Chrome DevTools Protocol (CDP) to Playwright.

**Important Note**: Zenn has TWO methods:
- **CLI method (primary)**: Uses Zenn CLI (`npx zenn`) - does NOT use CDP, did NOT need migration
- **Browser method (fallback)**: Uses CDP - NEEDED migration to Playwright (this is what was completed)

## Changes Made

### 1. New Script
**File**: `plugins/wt/skills/publish-to-zenn/scripts/zenn-playwright.ts`

**Key Changes**:
- Uses `playwright` package instead of CDP
- Uses `@wt/web-automation` common library for:
  - Selector utilities (`@wt/web-automation/selectors`)
  - Playwright utilities (`@wt/web-automation/playwright`)
  - Config utilities (`@wt/web-automation/config`)
- Uses Playwright's bundled Chromium (no Chrome lock file issues)
- More robust element selection with `trySelectors()`
- Better error handling with debug screenshots
- Supports CodeMirror editor API detection
- 5-minute login timeout for manual intervention

### 2. Updated Main Script
**File**: `plugins/wt/skills/publish-to-zenn/scripts/zenn-article.ts`

**Changes**:
- Updated browser method import from `zenn-browser.js` to `zenn-playwright.js`
- CLI method unchanged (no migration needed)

### 3. Updated Documentation
**File**: `plugins/wt/skills/publish-to-zenn/SKILL.md`

- Updated to version 2.0.0
- Changed all references from CDP to Playwright
- Updated usage examples to use `--method browser` flag
- Added migration notes section
- Updated script reference table with NEW/DEPRECATED labels

### 4. Updated Dependencies
**File**: `plugins/wt/skills/publish-to-zenn/package.json`

- Added `playwright` dependency
- Added `@wt/web-automation` local dependency

## CLI Usage (Same as Before)

```bash
# Using Zenn CLI (primary method - unchanged)
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-zenn/scripts/zenn-article.ts --markdown article.md

# Using browser automation with Playwright (new implementation)
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-zenn/scripts/zenn-article.ts --method browser --markdown article.md

# Publish immediately via browser
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-zenn/scripts/zenn-article.ts --method browser --markdown article.md --published
```

## Key Features

| Feature | Description |
|---------|-------------|
| **Playwright Bundled Chromium** | No Chrome lock file issues |
| **Persistent Context** | Maintains login sessions across runs |
| **Multi-Selector Fallback** | Tries multiple selectors for robustness |
| **Login Detection** | Auto-detects login state |
| **5-Minute Login Timeout** | Waits for manual login if needed |
| **CodeMirror Detection** | Automatically detects and uses CodeMirror API |
| **Debug Screenshots** | Saves screenshot on errors |
| **Manual Confirm** | Browser stays open for user verification |

## Configuration (Same)

```jsonc
{
  "publish-to-zenn": {
    "method": "cli",
    "github_repo": "~/repos/zenn-articles",
    "auto_publish": false,
    "profile_dir": "~/.local/share/zenn-browser-profile"
  }
}
```

## Zenn-Specific Notes

### Article Types
- **tech**: Technical articles with code examples
- **idea**: Idea/opinion articles

### Topics (Tags)
Common Zenn topics:
- `zenn` - Zenn platform
- `javascript` - JavaScript
- `typescript` - TypeScript
- `react` - React
- `vue` - Vue.js
- `nextjs` - Next.js
- `python` - Python
- `go` - Go language
- `aws` - Amazon Web Services
- `docker` - Docker
- `git` - Git

### Slug Constraints
- Must be lowercase letters, numbers, hyphens, underscores
- Minimum 12 characters
- Auto-generated from title if not provided

## Testing

To test the migrated browser automation script:

1. Create a test markdown file:
```markdown
---
title: テスト記事
emoji: "📝"
type: "tech"
topics: ["zenn", "test"]
published: false
slug: "test-article-playwright"
---

# テスト記事

これはPlaywright移行のテスト記事です。
```

2. Run the script:
```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-zenn/scripts/zenn-article.ts --method browser --markdown test.md
```

3. First run will require manual login
4. Subsequent runs will use the saved session

## Comparison with Other Migrations

| Skill | Primary Method | Secondary Method | Migration Status |
|-------|---------------|------------------|------------------|
| publish-to-zenn | **CLI** (Zenn CLI) | Browser (Playwright) | ✅ Complete (browser only) |
| publish-to-substack | Browser (Playwright) | None | ✅ Complete |
| publish-to-juejin | Browser (Playwright) | None | ✅ Complete |
| publish-to-infoq | Browser (Playwright) | None | ✅ Complete |
| publish-to-xhs | Browser (Playwright) | None | ✅ Complete |

## Next Steps

The remaining skills to verify:
- publish-to-qiita - May use CLI/API instead of CDP (verify needed)
- publish-to-medium - May use API instead of CDP (verify needed)

These may not need migration if they don't use CDP-based browser automation.

## Output Example

```
[zenn-pw] Parsing markdown: article.md
[zenn-pw] Title: Your Article Title
[zenn-pw] Type: tech
[zenn-pw] Topics: javascript, vue
[zenn-pw] Slug: test-article-playwright
[zenn-pw] Status: draft
[zenn-pw] Launching browser (profile: ~/.local/share/zenn-browser-profile)
[zenn-pw] Using Playwright bundled Chromium
[zenn-pw] Navigating to: https://zenn.dev/articles/new
[zenn-pw] Checking login status...
[zenn-pw] Already logged in.
[zenn-pw] Waiting for editor to load...
[zenn-pw] Editor ready
[zenn-pw] Filling in title...
[zenn-pw] Title filled
[zenn-pw] Filling in content...
[zenn-pw] Content filled using CodeMirror API
[zenn-pw] Setting article type: tech...
[zenn-pw] Type set
[zenn-pw] Setting topics: javascript, vue...
[zenn-pw] Topics added
[zenn-pw] Saving as draft...
[zenn-pw] Article saved successfully!
[zenn-pw] URL: https://zenn.dev/articles/xxxxx
[zenn-pw] Status: draft
[zenn-pw] Browser window remains open for review.
[zenn-pw] Press Ctrl+C to close.
```
