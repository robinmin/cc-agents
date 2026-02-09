---
name: publish-to-xhs
description: This skill should be used when the user asks to "publish to xhs", "create a xiaohongshu article", "post article to xiaohongshu.com", "小红书投稿", or mentions XHS (Xiaohongshu/Little Red Book) publishing. Supports markdown articles with frontmatter metadata via browser automation (Playwright).
version: 2.0.0
---

# Post to XHS (Xiaohongshu / Little Red Book)

Post markdown articles to XHS (Xiaohongshu/Little Red Book) contribution platform via browser automation using Playwright.

## Quick Start

```bash
# Post markdown as draft (recommended for first use)
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-xhs/scripts/xhs-playwright.ts --markdown article.md

# Publish immediately
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-xhs/scripts/xhs-playwright.ts --markdown article.md --publish
```

**Note**: This is the new Playwright-based implementation. The old CDP-based script (`xhs-article.ts`) is still available but deprecated.

## Script Directory

Scripts are invoked using `${CLAUDE_PLUGIN_ROOT}/skills/publish-to-xhs/scripts/<script-name>.ts`

| Script | Purpose |
|--------|---------|
| `xhs-playwright.ts` | **NEW**: Post articles to XHS via Playwright browser automation (recommended) |
| `xhs-article.ts` | **DEPRECATED**: Post articles to XHS via CDP browser automation (legacy) |
| `cdp.ts` | Chrome DevTools Protocol utilities (legacy) |
| `xhs-utils.ts` | XHS-specific utilities and configuration |

## Prerequisites

- `bun` runtime
- Playwright (auto-installed on first run)
- First run: log in to xiaohongshu.com manually (phone + SMS verification)
- XHS account (register at https://xiaohongshu.com)

## Configuration

Optional config in `~/.claude/wt/config.jsonc`:

```jsonc
{
  "publish-to-xhs": {
    "profile_dir": "~/.local/share/xhs-browser-profile",
    "auto_publish": false
  }
}
```

Override with `--publish` / `--draft` flags per invocation.

## First Run Setup

First time setup (requires manual login):

1. Run any publish command
2. Browser will open with XHS login page (using Playwright's bundled Chromium)
3. Log in with phone number and SMS verification code
4. Session will be saved to the browser profile directory
5. Subsequent runs will use the saved session

## Parameters

| Parameter | Description |
|-----------|-------------|
| `--markdown <path>` | Markdown file (recommended, supports frontmatter) |
| `--title <text>` | Article title (auto-extracted from markdown) |
| `--content <text>` | Article content (use with --title) |
| `--category <name>` | Article category |
| `--tags <tag1,tag2>` | Comma-separated tags |
| `--publish` | Publish immediately (default: draft) |
| `--draft` | Save as draft (overrides auto_publish config) |
| `--profile <dir>` | Custom browser profile directory |

## Markdown Frontmatter

```markdown
---
title: Article Title
category: Technology
tags: [programming, javascript, react]
subtitle: Optional subtitle for the article
cover: https://example.com/cover-image.png
---

# Article Content

Your article content here in markdown format...
```

## Categories & Requirements

**Supported Categories**: Technology (科技), Education (教育), Lifestyle (生活), Entertainment (娱乐), Sports (运动), Travel (旅行), Food (美食), Fashion (时尚), Beauty (美妆)

**Requirements**: Original content, well-structured, Chinese (Simplified) primarily, images encouraged.

## Publish Status

| Status | Description |
|--------|-------------|
| `draft` | Saved as draft (not published, default) |
| `publish` | Published immediately (visible to all) |

Default: `draft` (safe default for preview before publishing)

## Why Browser Automation?

XHS has NO official public API for content posting. Browser automation via Playwright is the most reliable approach. See **`references/technical-details.md`** for research on internal API endpoints and automation approaches.

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
- **wt:publish-to-juejin** - Juejin platform publishing (similar Playwright approach)

## Migration Notes

This skill was migrated from Chrome DevTools Protocol (CDP) to Playwright in version 2.0.0. Key improvements:
- Uses Playwright's bundled Chromium (no Chrome lock file issues)
- More reliable element selection with Playwright's locator API
- Better error handling and retry mechanisms
- Uses shared `@wt/web-automation` library for common utilities

## Output

After successful posting, the script outputs:

```
[xhs-pw] Parsing markdown: article.md
[xhs-pw] Title: Your Article Title
[xhs-pw] Category: Technology
[xhs-pw] Tags: programming, react
[xhs-pw] Status: draft
[xhs-pw] Launching browser (profile: ~/.local/share/xhs-browser-profile)
[xhs-pw] Using Playwright bundled Chromium
[xhs-pw] Navigating to: https://xiaohongshu.com/article/create
[xhs-pw] Checking login status...
[xhs-pw] Already logged in.
[xhs-pw] Waiting for editor to load...
[xhs-pw] Editor ready
[xhs-pw] Filling in title...
[xhs-pw] Title filled
[xhs-pw] Filling in subtitle...
[xhs-pw] Subtitle filled
[xhs-pw] Filling in content...
[xhs-pw] Content filled using CodeMirror API
[xhs-pw] Setting category...
[xhs-pw] Category set
[xhs-pw] Setting tags...
[xhs-pw] Tags added
[xhs-pw] Saving as draft...
[xhs-pw] Article saved successfully!
[xhs-pw] URL: https://xiaohongshu.com/explore/xxxxx
[xhs-pw] Status: draft
[xhs-pw] Browser window remains open for review.
[xhs-pw] Press Ctrl+C to close.
```

## Notes

- **No Official API**: Browser automation via Playwright required
- **Session Persistence**: Login saved in browser profile directory
- **SMS Verification**: First login requires phone + SMS verification
- **Language**: Chinese (Simplified) primary, markdown code blocks supported
- **Cross-platform**: macOS, Linux, Windows via bun runtime
- **Login Timeout**: Script waits up to 5 minutes for manual login completion

## Sources

- [XHS Platform Guide](https://xiaohongshu.com)
- [XHS Creator Center](https://xiaohongshu.com/creator)
- [小红书创作指南](https://help.xiaohongshu.com)
