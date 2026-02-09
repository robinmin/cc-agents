---
name: publish-to-juejin
description: This skill should be used when the user asks to "publish to juejin", "create a juejin article", "post article to juejin.cn", or mentions Juejin (稀土掘金) publishing. Supports markdown articles with frontmatter metadata via browser automation (Playwright).
version: 2.0.0
---

# Post to Juejin (稀土掘金)

Post markdown articles to Juejin contribution platform via browser automation using Playwright.

## Quick Start

```bash
# Post markdown as draft (recommended for first use)
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-juejin/scripts/juejin-playwright.ts --markdown article.md

# Publish immediately
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-juejin/scripts/juejin-playwright.ts --markdown article.md --publish
```

**Note**: This is the new Playwright-based implementation. The old CDP-based script (`juejin-article.ts`) is still available but deprecated.

## When to Use

Activate this skill when:

- Publishing Stage 6 content to Juejin (juejin.cn)
- User explicitly mentions "publish to juejin", "juejin article", "掘金投稿"
- Creating Juejin articles from markdown files
- Submitting technical content to Juejin community

## Script Directory

All scripts are located in the `scripts/` subdirectory of this skill.

Scripts are invoked using `${CLAUDE_PLUGIN_ROOT}/skills/publish-to-juejin/scripts/<script-name>.ts`

- `CLAUDE_PLUGIN_ROOT` = Claude Code predefined variable pointing to plugin root directory
- Full script path = `${CLAUDE_PLUGIN_ROOT}/skills/publish-to-juejin/scripts/<script-name>.ts`

**Script Reference**:
| Script | Purpose |
|--------|---------|
| `scripts/juejin-playwright.ts` | **NEW**: Post articles to Juejin via Playwright browser automation (recommended) |
| `scripts/juejin-article.ts` | **DEPRECATED**: Post articles to Juejin via CDP browser automation (legacy) |
| `scripts/cdp.ts` | Chrome DevTools Protocol utilities (legacy) |
| `scripts/juejin-utils.ts` | Juejin-specific utilities and configuration |

## Prerequisites

- `bun` runtime
- Playwright (auto-installed on first run)
- First run: log in to juejin.cn manually (phone + SMS verification)
- Juejin account (register at https://juejin.cn)

## Configuration

Optional: Create or update `~/.claude/wt/config.jsonc` for Juejin settings:

```jsonc
{
  "publish-to-juejin": {
    "profile_dir": "~/.local/share/juejin-browser-profile",
    "auto_publish": false
  }
}
```

Use `--publish` / `--draft` flags to override auto_publish setting per invocation.

## First Run Setup

First time setup (requires manual login):

1. Run any publish command
2. Browser will open with Juejin login page (using Playwright's bundled Chromium)
3. Log in with your phone number and SMS verification code
4. Your session will be saved to the browser profile directory
5. Subsequent runs will use the saved session

## Parameters

| Parameter | Description |
|-----------|-------------|
| `--markdown <path>` | Markdown file (recommended, supports frontmatter) |
| `--title <text>` | Article title (auto-extracted from markdown) |
| `--content <text>` | Article content (use with --title) |
| `--category <name>` | Article category (后端, 前端, Android, iOS, 人工智能, etc.) |
| `--tags <tag1,tag2>` | Comma-separated tags |
| `--publish` | Publish immediately (default: draft) |
| `--draft` | Save as draft (overrides auto_publish config) |
| `--profile <dir>` | Custom browser profile directory |

## Markdown Frontmatter

```markdown
---
title: Article Title
category: 前端
tags: [vue, react, javascript]
subtitle: Optional subtitle for the article
cover: https://example.com/cover-image.png
---

# Article Content

Your article content here in markdown format...
```

## Supported Categories

Juejin accepts articles in these categories:

- **后端** (Backend)
- **前端** (Frontend)
- **Android**
- **iOS**
- **人工智能** (AI)
- **开发工具** (Development Tools)
- **代码人生** (Code Life)
- **阅读** (Reading)

## Article Requirements

Per Juejin contribution guidelines:

- **Content Type**: Original technical articles preferred
- **Quality**: Well-structured, code examples encouraged
- **Language**: Chinese (Simplified) primarily
- **Review Process**: Articles may undergo editorial review
- **Copyright**: Original content required

## Publish Status

| Status | Description |
|--------|-------------|
| `draft` | Saved as draft (not published, default) |
| `publish` | Published immediately (visible to all) |

Default: `draft` (safe default for preview before publishing)

## Why Browser Automation?

Juejin has NO official public API for content posting. Browser automation via Playwright is the most reliable approach. See **`references/juejin-api-research.md`** for research on internal API endpoints and automation approaches.

## Additional References

### Technical Details

For implementation details including DOM selectors, Playwright usage, and platform support, see **`references/technical-details.md`**.

### Troubleshooting

For common issues and solutions, see **`references/troubleshooting.md`**. Covers:
- Playwright Chromium not found
- Page navigation errors
- DOM selector issues
- Login session persistence

### Usage Examples

For comprehensive examples including workflows, batch operations, and integrations, see **`references/usage-examples.md`**.

## Related Skills

- **wt:technical-content-creation** - Full 7-stage workflow (Stage 6 delegates here)
- **wt:publish-to-wechatmp** - WeChat Official Account publishing (similar Playwright approach)
- **wt:publish-to-substack** - Substack platform publishing (similar Playwright approach)

## Migration Notes

This skill was migrated from Chrome DevTools Protocol (CDP) to Playwright in version 2.0.0. Key improvements:
- Uses Playwright's bundled Chromium (no Chrome lock file issues)
- More reliable element selection with Playwright's locator API
- Better error handling and retry mechanisms
- Uses shared `@wt/web-automation` library for common utilities

## Output

After successful posting, the script outputs:

```
[juejin-pw] Parsing markdown: article.md
[juejin-pw] Title: Your Article Title
[juejin-pw] Category: 前端
[juejin-pw] Tags: vue, react
[juejin-pw] Status: draft
[juejin-pw] Launching browser (profile: ~/.local/share/juejin-browser-profile)
[juejin-pw] Using Playwright bundled Chromium
[juejin-pw] Navigating to: https://juejin.cn/editor
[juejin-pw] Checking login status...
[juejin-pw] Already logged in.
[juejin-pw] Waiting for editor to load...
[juejin-pw] Editor ready
[juejin-pw] Filling in title...
[juejin-pw] Title filled
[juejin-pw] Filling in content...
[juejin-pw] Content filled using CodeMirror API
[juejin-pw] Setting category...
[juejin-pw] Category set
[juejin-pw] Setting tags...
[juejin-pw] Tags added
[juejin-pw] Saving as draft...
[juejin-pw] Article saved successfully!
[juejin-pw] URL: https://juejin.cn/post/xxxxx
[juejin-pw] Status: draft
[juejin-pw] Browser window remains open for review.
[juejin-pw] Press Ctrl+C to close.
```

## Notes

- **No Official API**: Juejin has no official public API for content publishing
- **Session Persistence**: Login session persists in browser profile directory
- **SMS Verification**: First login requires phone number + SMS verification code
- **Content Language**: Chinese (Simplified) is the primary language
- **Code Blocks**: Syntax highlighting supported via markdown code blocks
- **Cross-platform**: macOS, Linux, Windows (uses bun runtime)
- **Rich Text Editor**: Juejin uses a rich text editor (CodeMirror-based)
- **Login Timeout**: Script waits up to 5 minutes for manual login completion

## Sources

- [Juejin API Research (GitHub)](https://github.com/chenzijia12300/juejin-api)
- [掘金自动发布文章的实现](https://juejin.cn/post/6980305681689640991)
- [Puppeteer实战：教你如何自动在掘金上发布文章](https://juejin.cn/post/6844903961271468045)
- [一键自动化博客发布工具(掘金篇)](https://developer.aliyun.com/article/1510701)
