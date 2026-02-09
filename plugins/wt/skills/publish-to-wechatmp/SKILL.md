---
name: publish-to-wechatmp
description: |
  This skill should be used when the user asks to "publish to WeChat", "post to WeChat MP", "发布公众号", or mentions WeChat Official Account publishing as part of Stage 6 of the technical content creation process. Handles publishing image-text posts and long-form articles to WeChat Official Account Platform via Playwright browser automation with shared common library.
version: 3.0.0
---

# Post to WeChat MP (Official Account Platform)

Posts image-text posts and long-form articles to WeChat Official Account Platform via Playwright browser automation with bundled Chromium (uses @wt/web-automation common library).

## Integration Points

- **wt:technical-content-creation** - Stage 6 (Publish) delegates to this skill for WeChat MP platform
- **5-adaptation/** - Uses adapted content as source for WeChat posts
- **4-illustration/** - Provides cover images and inline illustrations for WeChat posts

## When to Use

Activate this skill when:

- Publishing Stage 6 content to WeChat Official Account
- User explicitly mentions "publish to WeChat", "发布公众号", "微信公众号"
- Creating WeChat image-text posts (图文) from adapted content
- Publishing long-form articles with themes

## Architecture

### Script Locations

All scripts are in the `scripts/` subdirectory. Use full paths from plugin root:

```
${PLUGIN_ROOT}/skills/publish-to-wechatmp/scripts/<script-name>.ts
```

Where `${PLUGIN_ROOT}` = `/Users/robin/projects/cc-agents/plugins/wt` (or equivalent path)

### Script Reference

| Script | Engine | Status | Purpose | Notes |
|--------|--------|--------|---------|-------|
| `wechat-playwright.ts` | Playwright | **Recommended** | Image-text posts | Fast, reliable, uses persistent context |
| `wechat-article-playwright.ts` | Playwright | **Recommended** | Long-form articles | Full article publishing with themes |
| `md-to-wechat.ts` | Standalone | **Required** | Markdown conversion | MD → WeChat HTML with syntax highlighting |

## Prerequisites

- **Bun** runtime (`npx -y bun` works without global install)
- **Playwright** (auto-installed on first run)
- First run: log in to WeChat MP manually (session saved to profile directory)
- Profile directory: `~/.local/share/wechat-browser-profile` (configurable)

## Configuration

Create or edit `~/.claude/wt/config.jsonc`:

```jsonc
{
  "publish-to-wechatmp": {
    // Chrome profile directory for WeChat authentication
    // Stores login session, cookies, and authentication data
    // Default: ~/.local/share/wechat-browser-profile
    "profile_dir": "~/.local/share/wechat-browser-profile",

    // Auto-submit preference (true = skip preview, save as draft immediately)
    // Default: false (always preview before posting for safety)
    "auto_submit": false,

    // Default theme for markdown articles
    // Options: default, grace, simple
    // Default: default
    "default_theme": "default",

    // Default author name for articles
    // Appears in the author field of published articles
    // Example: "冰原奔狼"
    "author": "",

    // Collection to add article to
    // Articles can be grouped into collections
    // Example: "macOS教程"
    "collection": "",

    // Mark articles as original content
    // Default: false
    // When true, marks article as original (requires confirmation)
    "enable_original": false,

    // Enable article rewards (打赏)
    // Default: false
    // When true, enables reader rewards feature
    "enable_reward": false
  }
}
```

**Override flags**: Use `--submit` / `--no-submit` to override config per invocation.

## Image-Text Posts (图文)

Text + up to 9 images. Use `wechat-playwright.ts` for best performance.

```bash
# Preview mode (default - browser stays open for review)
npx -y bun ${PLUGIN_ROOT}/skills/publish-to-wechatmp/scripts/wechat-playwright.ts --markdown article.md --images ./photos/

# Post immediately (save as draft)
npx -y bun ${PLUGIN_ROOT}/skills/publish-to-wechatmp/scripts/wechat-playwright.ts --title "标题" --content "内容" --image ./cover.png --submit

# Multiple images
npx -y bun ${PLUGIN_ROOT}/skills/publish-to-wechatmp/scripts/wechat-playwright.ts --markdown article.md --images ./photos/ --submit
```

**Parameters**:
| Parameter | Description |
|-----------|-------------|
| `<text>` | Post content (positional, required for simple posts) |
| `--markdown <path>` | Markdown file for title/content extraction |
| `--images <dir>` | Directory containing images (PNG/JPG) |
| `--title <text>` | Article title (max 20 chars, auto-compressed) |
| `--content <text>` | Article content (max 1000 chars, auto-compressed) |
| `--image <path>` | Add image (repeatable, max 9) |
| `--submit` | Save as draft (default: preview) |
| `--no-submit` | Preview only (overrides auto_submit) |
| `--profile <dir>` | Custom Chrome profile directory |
| `--headless` | Run in headless mode |

## Long-Form Articles (文章)

Long-form Markdown articles with full feature support including author, original marking, rewards, and collections.

```bash
# Preview mode (default)
npx -y bun ${PLUGIN_ROOT}/skills/publish-to-wechatmp/scripts/wechat-article-playwright.ts --markdown article.md

# With theme (grace, simple)
npx -y bun ${PLUGIN_ROOT}/skills/publish-to-wechatmp/scripts/wechat-article-playwright.ts --markdown article.md --theme grace --submit

# With cover image
npx -y bun ${PLUGIN_ROOT}/skills/publish-to-wechatmp/scripts/wechat-article-playwright.ts --markdown article.md --cover ./cover.jpg --submit

# Full featured publish
npx -y bun ${PLUGIN_ROOT}/skills/publish-to-wechatmp/scripts/wechat-article-playwright.ts \
  --markdown article.md \
  --author "冰原奔狼" \
  --cover ./cover.webp \
  --original \
  --collection "macOS教程" \
  --submit
```

**Parameters**:
| Parameter | Description |
|-----------|-------------|
| `--markdown <path>` | Markdown file (recommended) |
| `--html <path>` | HTML file to paste |
| `--title <text>` | Article title (max 64 chars) |
| `--content <text>` | Article content (use with --image) |
| `--author <name>` | Author name (overrides config) |
| `--summary <text>` | Article summary/description |
| `--cover <path>` | Cover image path |
| `--image <path>` | Content image (repeatable) |
| `--theme <name>` | Theme: default, grace, simple |
| `--collection <name>` | Collection name to add article to |
| `--original` | Mark article as original content |
| `--reward` | Enable article rewards (打赏) |
| `--submit` | Save as draft and publish |
| `--no-submit` | Preview only |
| `--profile <dir>` | Custom Chrome profile directory |
| `--headless` | Run in headless mode |

**Frontmatter Support**:
```yaml
---
title: My Article Title
author: Author Name
description: Article summary
cover_image: ./path/to/cover.png
---
```

## Themes

| Theme | Description |
|-------|-------------|
| `default` | 经典主题 - Traditional style, centered titles with colored bottom borders |
| `grace` | 优雅主题 - Graceful theme with text shadows, rounded cards (by @brzhang) |
| `simple` | 简洁主题 - Modern minimalist, asymmetric rounded corners (by @okooo5km) |

## Code Block Syntax Highlighting

WeChat MP articles support syntax highlighting for code blocks using highlight.js:

````markdown
```typescript
function hello(): void {
  console.log('Hello, WeChat!');
}
```
````

**Supported languages**: TypeScript, JavaScript, Python, Bash, JSON, HTML, CSS, SQL, Go, Rust, and 50+ more.

**Features**:
- Automatic language detection
- Line numbers (optional)
- Copy button for code snippets
- Multiple themes for different code styles

## Enhanced Publishing Features

### Author

Articles can display a custom author name:

```bash
# Via command line
npx -y bun scripts/wechat-article-playwright.ts --markdown article.md --author "冰原奔狼"

# Via frontmatter
---
title: My Article
author: 冰原奔狼
---

# Via config (~/.claude/wt/config.jsonc)
{
  "publish-to-wechatmp": {
    "author": "冰原奔狼"
  }
}
```

### Original Content Marking

Mark articles as original content for copyright protection:

```bash
# Via command line
npx -y bun scripts/wechat-article-playwright.ts --markdown article.md --original --submit

# Via config
{
  "publish-to-wechatmp": {
    "enable_original": true
  }
}
```

When enabled, the script clicks the "原创" checkbox and confirms in the dialog.

### Article Rewards (打赏)

Enable reader rewards for supporting the creator:

```bash
# Via command line
npx -y bun scripts/wechat-article-playwright.ts --markdown article.md --reward --submit

# Via config
{
  "publish-to-wechatmp": {
    "enable_reward": true
  }
}
```

### Collections (合集)

Group related articles into collections:

```bash
# Via command line
npx -y bun scripts/wechat-article-playwright.ts --markdown article.md --collection "macOS教程" --submit

# Via config
{
  "publish-to-wechatmp": {
    "collection": "macOS教程"
  }
}
```

The script clicks "未添加" button, enters the collection name, and confirms.

### Publish Workflow

The `--submit` flag triggers a two-step publishing process:

1. **Save as Draft** - First saves the article as draft
2. **Publish** - Then clicks "发表" button

When publishing, WeChat may require QR code authentication for security. The browser remains open after publishing for verification.

```bash
# Preview (no publish)
npx -y bun scripts/wechat-article-playwright.ts --markdown article.md

# Publish with all features
npx -y bun scripts/wechat-article-playwright.ts \
  --markdown article.md \
  --author "冰原奔狼" \
  --cover ./cover.webp \
  --original \
  --collection "合集名" \
  --submit
```

## Cover Image Support

Cover images are automatically extracted from frontmatter `cover_image` field:

```yaml
---
title: My Article Title
author: Author Name
cover_image: ../4-illustration/cover.webp
---
```

Or specify via command line:
```bash
npx -y bun scripts/wechat-article-playwright.ts --markdown article.md --cover ./cover.webp
```

**Supported formats**: PNG, JPEG, GIF, WebP
**Recommended size**: 900 x 383 pixels (2.35:1 ratio)

## Related Skills

- **wt:technical-content-creation** - Full 7-stage workflow (Stage 6 delegates here)
- **wt:publish-to-x** - X/Twitter platform publishing (parallel skill for comparison)

## Troubleshooting

### Login Not Persisting

1. Check profile directory permissions: `ls -la ~/.local/share/wechat-browser-profile/`
2. Ensure Chrome/Chromium is not running: `pkill -f "Chrome|Chromium"`
3. Delete profile and re-login manually

### Images Not Uploading

1. Verify file exists and is readable
2. Supported formats: PNG, JPEG, GIF, WebP
3. Max 9 images per image-text post
4. Image auto-compression: title (20 chars), content (1000 chars)

### Editor Not Loading

1. Check if menu click was successful
2. Verify page URL includes `mp.weixin.qq.com`
3. Try refreshing the page manually

### Submit Button Disabled

- Title/content too long
- Missing required fields
- Content violates WeChat rules

## References

- `references/image-text-posting.md` - Image-text posting guide
- `references/article-posting.md` - Article publishing guide

---

## Notes

- First run requires manual login (session persists automatically)
- Always preview before `--submit` in production
- Cross-platform: macOS, Linux, Windows
- Uses persistent context for session management
- Title auto-compression for Chinese titles (20 chars max)
- Content auto-compression (1000 chars max) for image-text posts
- Content images (inline) require manual copy-paste (copy-to-clipboard.ts not available)
- Browser remains open after publishing for verification (Ctrl+C to close)

## Migration Notes

This skill was enhanced in version 3.0.0 to use the shared `@wt/web-automation` common library:

**Key Improvements:**
- **Playwright Bundled Chromium**: No longer requires system Chrome installation
- **Shared Common Library**: Uses `@wt/web-automation` for config, selectors, and Playwright utilities
- **Multi-Selector Fallback**: More robust element selection using `trySelectors()`
- **Better Error Handling**: Improved element finding with timeout and visibility checks
- **Code Deduplication**: Removed duplicated config parsing and Chrome finding code

**Breaking Changes**: None. The CLI interface and behavior remain the same.

**Previous Versions:**
- v2.1.0: Used Playwright with system Chrome detection
- v2.0.0: Initial Playwright implementation
