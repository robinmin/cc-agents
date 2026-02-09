# Publish-to-XHS Playwright Migration Complete ✓

## Summary

Successfully migrated `publish-to-xhs` from Chrome DevTools Protocol (CDP) to Playwright.

## Changes Made

### 1. New Script
**File**: `plugins/wt/skills/publish-to-xhs/scripts/xhs-playwright.ts`

**Key Changes**:
- Uses `playwright` package instead of CDP
- Uses `@wt/web-automation` common library for:
  - Selector utilities (`@wt/web-automation/selectors`)
  - Playwright utilities (`@wt/web-automation/playwright`)
- Uses Playwright's bundled Chromium (no Chrome lock file issues)
- More robust element selection with `trySelectors()`
- Better error handling with debug screenshots
- Supports CodeMirror editor API detection
- 5-minute login timeout for manual SMS verification

### 2. Updated Documentation
**File**: `plugins/wt/skills/publish-to-xhs/SKILL.md`

- Updated to version 2.0.0
- Changed all references from CDP to Playwright
- Updated usage examples to use `xhs-playwright.ts`
- Added migration notes section
- Updated script reference table with NEW/DEPRECATED labels

### 3. Updated Dependencies
**File**: `plugins/wt/skills/publish-to-xhs/package.json`

- Added `playwright` dependency
- Added `@wt/web-automation` local dependency

## CLI Usage (Same as Before)

```bash
# Post markdown as draft (default)
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-xhs/scripts/xhs-playwright.ts --markdown article.md

# Publish immediately
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-xhs/scripts/xhs-playwright.ts --markdown article.md --publish

# Post with custom category and tags
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-xhs/scripts/xhs-playwright.ts --markdown article.md --category 科技 --tags "编程,react"
```

## Key Features

| Feature | Description |
|---------|-------------|
| **Playwright Bundled Chromium** | No Chrome lock file issues |
| **Persistent Context** | Maintains login sessions across runs |
| **Multi-Selector Fallback** | Tries multiple selectors for robustness |
| **Login Detection** | Auto-detects login state |
| **5-Minute Login Timeout** | Waits for manual SMS verification |
| **CodeMirror Detection** | Automatically detects and uses CodeMirror API |
| **Debug Screenshots** | Saves screenshot on errors |
| **Manual Confirm** | Browser stays open for user verification |

## Configuration (Same)

```jsonc
{
  "publish-to-xhs": {
    "profile_dir": "~/.local/share/xhs-browser-profile",
    "auto_publish": false
  }
}
```

## Supported Categories

XHS accepts articles in these categories:

- 科技 (Technology)
- 教育 (Education)
- 生活 (Lifestyle)
- 娱乐 (Entertainment)
- 运动 (Sports)
- 旅行 (Travel)
- 美食 (Food)
- 时尚 (Fashion)
- 美妆 (Beauty)

## Testing

To test the migrated script:

1. Create a test markdown file:
```markdown
---
title: 测试文章
category: 科技
tags: [test, automation]
subtitle: 这是一个测试摘要
---

# 你好，小红书

这是一篇测试文章。
```

2. Run the script:
```bash
npx -y bun xhs-playwright.ts --markdown test.md
```

3. First run will require manual login with phone + SMS verification
4. Subsequent runs will use the saved session

## Next Steps

The remaining skill to migrate:
- publish-to-zenn

This will follow the same pattern as this migration.
