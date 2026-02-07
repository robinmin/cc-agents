---
name: publish-to-x
description: This skill should be used when the user asks to "publish to X", "post to Twitter", "share on X", "tweet this", or mentions X publishing as part of Stage 6 of the technical content creation process. Handles publishing posts, images, videos, quote tweets, and long-form articles to X via browser automation (Playwright or Chrome CDP).
version: 2.0.0
---

# Post to X (Twitter)

Posts text, images, videos, and long-form articles to X via real Chrome/Chromium browser automation (bypasses anti-bot detection).

## Integration Points

- **wt:technical-content-creation** - Stage 6 (Publish) delegates to this skill for X platform publishing
- **5-adaptation/** - Uses adapted content (thread format, X Articles) as source for X posts
- **4-illustration/** - Provides cover images and inline illustrations for X posts

## When to Use

Activate this skill when:

- Publishing Stage 6 content to X platform
- User explicitly mentions "publish to X", "post to Twitter", "tweet this"
- Creating X threads from adapted content
- Publishing X Articles (long-form Markdown)

## Architecture

### Script Locations

All scripts are in the `scripts/` subdirectory. Use full paths from plugin root:

```
${PLUGIN_ROOT}/skills/publish-to-x/scripts/<script-name>.ts
```

Where `${PLUGIN_ROOT}` = `/Users/robin/projects/cc-agents/plugins/wt` (or equivalent path)

### Script Reference

| Script | Engine | Status | Purpose | Notes |
|--------|--------|--------|---------|-------|
| `x-playwright.ts` | Playwright | **Recommended** | Regular posts | Fast, reliable, uses persistent context |
| `x-article-playwright.ts` | Playwright | **Recommended** | Long-form articles | Full article publishing |
| `x-browser.ts` | CDP | Legacy | Regular posts | Chrome CDP fallback |
| `x-quote.ts` | CDP | Stable | Quote tweets | Comment + quote existing tweet |
| `x-video.ts` | CDP | Stable | Video posts | Video upload with processing wait |
| `x-utils.ts` | Shared | **Required** | Utilities | Config, clipboard, paste operations |
| `md-to-html.ts` | Standalone | Utility | Markdown conversion | MD → HTML for articles |
| `x-article.ts` | CDP | **Deprecated** | Long-form articles | Being retired, use x-article-playwright.ts |

### Core Utilities (`x-utils.ts`)

The `x-utils.ts` module provides shared functionality:

```typescript
import {
  readWtConfig,           // Read ~/.claude/wt/config.jsonc
  getAutoSubmitPreference, // Get auto_submit from config
  getDefaultProfileDir,    // Get profile directory
  copyImageToClipboard,    // Copy image for paste
  paste,                   // Cross-platform paste
  findChromeExecutable,    // Find Chrome binary
} from './x-utils.js';
```

## Prerequisites

- **Google Chrome** or **Chromium** installed
- **Bun** runtime (`npx -y bun` works without global install)
- First run: log in to X manually (session saved to profile directory)
- Profile directory: `~/.local/share/x-browser-profile-v2` (configurable)

## Configuration

Create or edit `~/.claude/wt/config.jsonc`:

```jsonc
{
  "publish-to-x": {
    // Chrome profile directory for X/Twitter authentication
    // Stores login session, cookies, and authentication data
    // Default: ~/.local/share/x-browser-profile-v2
    "profile_dir": "~/.local/share/x-browser-profile-v2",

    // Auto-submit preference (true = skip preview, post immediately)
    // Default: false (always preview before posting for safety)
    "auto_submit": false
  }
}
```

**Override flags**: Use `--submit` / `--no-submit` to override config per invocation.

## Regular Posts

Text + up to 4 images. Use `x-playwright.ts` for best performance.

```bash
# Preview mode (default - browser stays open for review)
npx -y bun ${PLUGIN_ROOT}/skills/publish-to-x/scripts/x-playwright.ts "Hello World!" --image ./photo.png

# Post immediately
npx -y bun ${PLUGIN_ROOT}/skills/publish-to-x/scripts/x-playwright.ts "Hello!" --image ./photo.png --submit

# Multiple images
npx -y bun ${PLUGIN_ROOT}/skills/publish-to-x/scripts/x-playwright.ts "Check this out!" --image a.png --image b.png --image c.png --submit
```

**Parameters**:
| Parameter | Description |
|-----------|-------------|
| `<text>` | Post content (positional, required) |
| `--image <path>` | Image file (repeatable, max 4) |
| `--submit` | Post immediately (default: preview) |
| `--no-submit` | Preview only (overrides auto_submit) |
| `--profile <dir>` | Custom Chrome profile directory |
| `--headless` | Run in headless mode |

## Video Posts

Text + video file. Videos are uploaded first, then text is added.

```bash
# Preview
npx -y bun ${PLUGIN_ROOT}/skills/publish-to-x/scripts/x-video.ts "Check this video!" --video ./clip.mp4

# Post
npx -y bun ${PLUGIN_ROOT}/skills/publish-to-x/scripts/x-video.ts "Amazing content" --video ./demo.mp4 --submit
```

**Parameters**:
| Parameter | Description |
|-----------|-------------|
| `<text>` | Post content (positional, optional) |
| `--video <path>` | Video file (required, MP4/MOV/WebM) |
| `--submit` | Post immediately (default: preview) |
| `--profile <dir>` | Custom Chrome profile directory |

**Limits**: Regular: 140s max, Premium: 60min. Processing: 30-60s.

## Quote Tweets

Quote an existing tweet with a comment.

```bash
# Preview
npx -y bun ${PLUGIN_ROOT}/skills/publish-to-x/scripts/x-quote.ts https://x.com/user/status/123 "Great insight!"

# Post with comment
npx -y bun ${PLUGIN_ROOT}/skills/publish-to-x/scripts/x-quote.ts https://x.com/user/status/123 "I agree!" --submit
```

**Parameters**:
| Parameter | Description |
|-----------|-------------|
| `<tweet-url>` | URL to quote (positional, required) |
| `<comment>` | Comment text (positional, optional) |
| `--submit` | Post immediately (default: preview) |
| `--profile <dir>` | Custom Chrome profile directory |

## X Articles

Long-form Markdown articles (requires X Premium subscription).

```bash
# Preview
npx -y bun ${PLUGIN_ROOT}/skills/publish-to-x/scripts/x-article-playwright.ts article.md

# With cover image
npx -y bun ${PLUGIN_ROOT}/skills/publish-to-x/scripts/x-article-playwright.ts article.md --cover ./cover.jpg

# Post immediately
npx -y bun ${PLUGIN_ROOT}/skills/publish-to-x/scripts/x-article-playwright.ts article.md --submit
```

**Parameters**:
| Parameter | Description |
|-----------|-------------|
| `<markdown>` | Markdown file (positional, required) |
| `--cover <path>` | Cover image file |
| `--title <text>` | Override article title |
| `--submit` | Publish immediately (default: preview) |
| `--profile <dir>` | Custom Chrome profile directory |

**Frontmatter Support**:
```yaml
---
title: My Article Title
cover_image: ./path/to/cover.png
---
```

## Markdown to HTML Conversion

Convert Markdown to HTML for X Articles.

```bash
# Output as JSON (includes metadata)
npx -y bun ${PLUGIN_ROOT}/skills/publish-to-x/scripts/md-to-html.ts article.md --output json

# Output as HTML only
npx -y bun ${PLUGIN_ROOT}/skills/publish-to-x/scripts/md-to-html.ts article.md --html-only

# Save to file
npx -y bun ${PLUGIN_ROOT}/skills/publish-to-x/scripts/md-to-html.ts article.md --save-html /tmp/article.html
```

## Related Skills

- **wt:technical-content-creation** - Full 7-stage workflow (Stage 6 delegates here)
- **wt:publish-to-surfing** - Surfing platform publishing (parallel skill for comparison)

## Troubleshooting

### Login Not Persisting

1. Check profile directory permissions: `ls -la ~/.local/share/x-browser-profile-v2/`
2. Ensure Chrome/Chromium is not running: `pkill -f "Chrome|Chromium"`
3. Delete profile and re-login manually

### Images Not Uploading

1. Verify file exists and is readable
2. Supported formats: PNG, JPEG, GIF, WebP
3. Max 4 images per post
4. Check clipboard permissions

### Video Processing Timeout

Large videos may take longer. Script polls for button enabled state up to 180s.
Try smaller videos or check network connectivity.

### Publish Button Disabled

Common causes:
- Character limit exceeded (280 chars for posts)
- Missing alt text on images
- Video still processing
- Content violates X rules

## References

- `references/regular-posts.md` - Regular posts guide
- `references/articles.md` - X Articles publishing guide

---

## Notes

- First run requires manual login (session persists automatically)
- Always preview before `--submit` in production
- Cross-platform: macOS, Linux, Windows
- Uses persistent context for session management
