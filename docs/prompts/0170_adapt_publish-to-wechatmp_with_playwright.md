---
name: Adapt publish-to-wechatmp with Playwright
description: |
  Adapt publish-to-wechatmp skill to use Playwright browser automation with shared web-automation utilities, following the same pattern as publish-to-x improvements.

priority: P1
status: completed
affected_files:
  - plugins/wt/skills/publish-to-wechatmp/scripts/wechat-playwright.ts (new)
  - plugins/wt/skills/publish-to-wechatmp/scripts/wechat-article-playwright.ts (new)
  - plugins/wt/skills/publish-to-wechatmp/scripts/wechat-article.ts (legacy)
  - plugins/wt/skills/publish-to-wechatmp/scripts/wechat-browser.ts (legacy)
  - plugins/wt/skills/publish-to-wechatmp/SKILL.md
estimated_complexity: medium
---

# Adapt publish-to-wechatmp with Playwright

Adapt publish-to-wechatmp skill to use Playwright browser automation, following the successful pattern from publish-to-x improvements.

## Goals

1. Create Playwright-based wechat-playwright.ts for image-text posts
2. Create Playwright-based wechat-article-playwright.ts for article posting
3. Update SKILL.md with proper documentation and script table

## Implementation Steps

### Step 1: Create wechat-playwright.ts

Create a new Playwright-based script for WeChat MP image-text posts, following the pattern from x-playwright.ts:

```typescript
// Location: plugins/wt/skills/publish-to-wechatmp/scripts/wechat-playwright.ts

// Core features needed:
// 1. Load config from ~/.claude/wt/config.jsonc (readWtConfig)
// 2. Launch Chrome with persistent context (playwright.ts)
// 3. Navigate to WeChat MP editor (https://mp.weixin.qq.com)
// 4. Handle login via existing session (profile_dir)
// 5. Fill article title and content
// 6. Upload cover image via clipboard (copyImageToClipboard + paste)
// 7. Submit or save as draft based on auto_submit
// 8. Return result with article URL or error
```

Key differences from X:
- WeChat MP uses different selectors (not data-testid)
- Content editor is rich text (requires different handling)
- Cover image upload may differ
- Submit flow is different (publish vs save as draft)

Note: Utilities are embedded in scripts (following existing wechat-browser.ts pattern) rather than importing from web-automation to avoid module resolution issues.

### Step 2: Create wechat-article-playwright.ts

Create Playwright-based article publishing script:

```typescript
// Location: plugins/wt/skills/publish-to-wechatmp/scripts/wechat-article-playwright.ts

// Features:
// 1. Parse markdown with frontmatter (title, cover_image)
// 2. Convert MD to HTML (md-to-html.ts)
// 3. Open WeChat MP article editor
// 4. Paste HTML content into rich text editor
// 5. Upload cover image
// 6. Set article title
// 7. Submit based on auto_submit
```

### Step 3: Update SKILL.md

Update SKILL.md with version 2.0.0:

```markdown
---
name: publish-to-wechatmp
description: This skill should be used when the user asks to "publish to WeChat", "post to WeChat MP", or "publish WeChat article". Handles publishing image-text posts and long-form articles to WeChat Official Account Platform via browser automation.
version: 2.0.0
---

# Post to WeChat MP (Official Account Platform)

Posts image-text posts and long-form articles to WeChat Official Account Platform via real Chrome/Chromium browser automation.

## Script Reference

| Script | Engine | Status | Purpose |
|--------|--------|--------|---------|
| `wechat-playwright.ts` | Playwright | Recommended | Image-text posts |
| `wechat-article-playwright.ts` | Playwright | Recommended | Long-form articles |
| `wechat-browser.ts` | CDP | Legacy | Image-text posts (deprecated) |
| `wechat-article.ts` | CDP | Legacy | Articles (deprecated) |
| `wechat-utils.ts` | Shared | Required | Utilities |

## Usage

```bash
# Image-text post (preview)
npx -y bun ${PLUGIN_ROOT}/skills/publish-to-wechatmp/scripts/wechat-playwright.ts --title "My Post" --content "Hello World" --cover ./cover.jpg

# Article post (preview)
npx -y bun ${PLUGIN_ROOT}/skills/publish-to-wechatmp/scripts/wechat-article-playwright.ts article.md

# Publish immediately
npx -y bun ${PLUGIN_ROOT}/skills/publish-to-wechatmp/scripts/wechat-playwright.ts --title "Post" --content "Content" --submit
```

## Configuration

Create or edit `~/.claude/wt/config.jsonc`:

```jsonc
{
  "publish-to-wechatmp": {
    "profile_dir": "~/.local/share/wechat-browser-profile",
    "auto_submit": false
  }
}
```
```

## Acceptance Criteria

- [x] wechat-playwright.ts created with Playwright-based automation
- [x] wechat-article-playwright.ts created for article publishing
- [x] SKILL.md updated to version 2.0.0 with proper documentation
- [x] Scripts use config-based auto_submit preference
- [x] Existing CDP scripts marked as legacy

## Verification

After implementation:

1. [x] Test wechat-article-playwright.ts with sample article - SUCCESS
   - Article: "macOS 进程自动化方法概览" (4200 words)
   - Markdown converted to HTML successfully
   - Cover image uploaded
   - Content inserted into editor
   - Article submitted to WeChat MP

2. Test wechat-playwright.ts with preview mode - Pending
3. [x] Profile directory created: ~/.local/share/wechat-browser-profile
4. [x] Login via QR code - Works
5. [x] Editor detection after menu click - Works
6. [x] New tab/window handling for editor - Works

## Summary

Completed the adaptation of publish-to-wechatmp skill to use Playwright browser automation:

**Created Files:**
- `plugins/wt/skills/publish-to-wechatmp/scripts/wechat-playwright.ts` - Playwright-based image-text posting (513 lines)
- `plugins/wt/skills/publish-to-wechatmp/scripts/wechat-article-playwright.ts` - Playwright-based article publishing (657 lines)

**Updated Files:**
- `plugins/wt/skills/publish-to-wechatmp/SKILL.md` - Updated to version 2.0.0 with script table

**Key Features:**
- Persistent Chrome profile for session management
- Config-based auto_submit preference (~/.claude/wt/config.jsonc)
- Support for WeChat MP selectors and rich text editor
- Markdown parsing with frontmatter support
- Cover image upload via clipboard
- Theme support (default, grace, simple)
- Login status detection and timeout handling

**TypeScript Errors Fixed:**
- Fixed page.evaluate() callback signature (pass object instead of multiple args)
- Fixed createTreeWalker NodeFilter arguments
- Changed `let node: Text | null` to `let node: Node | null` for compatibility

**Dependencies Installed (bun add):**
- front-matter@4.0.2 - Markdown frontmatter parsing
- highlight.js@11.11.1 - Code syntax highlighting
- marked@17.0.1 - Markdown rendering
- reading-time@1.5.0 - Reading time estimation
- fflate@0.8.2 - PlantUML compression

**Fixes Applied:**
1. Cover image support - Now extracts `cover_image` from frontmatter automatically
2. Code blocks - Syntax highlighting via highlight.js (already supported in render.ts)
3. TypeScript errors - Fixed page.evaluate(), createTreeWalker, const assignment

**Known Issues:**
- Content image replacement requires copy-to-clipboard.ts (was removed during cleanup)
- For inline images, use cover image only or upload manually
