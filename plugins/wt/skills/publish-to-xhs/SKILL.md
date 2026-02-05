---
name: publish-to-xhs
description: This skill should be used when the user asks to "publish to xhs", "create a xiaohongshu article", "post article to xiaohongshu.com", "小红书投稿", or mentions XHS (Xiaohongshu/Little Red Book) publishing. Supports markdown articles with frontmatter metadata via browser automation (Chrome CDP).
version: 1.0.0
---

# Post to XHS (Xiaohongshu / Little Red Book)

Post markdown articles to XHS (Xiaohongshu/Little Red Book) contribution platform via browser automation using Chrome DevTools Protocol (CDP).

## Quick Start

```bash
# Post markdown as draft (recommended for first use)
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-xhs/scripts/xhs-article.ts --markdown article.md

# Publish immediately
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-xhs/scripts/xhs-article.ts --markdown article.md --publish
```

## Script Directory

Scripts are invoked using `${CLAUDE_PLUGIN_ROOT}/skills/publish-to-xhs/scripts/<script-name>.ts`

| Script | Purpose |
|--------|---------|
| `xhs-article.ts` | Post articles to XHS via CDP browser automation |
| `cdp.ts` | Chrome DevTools Protocol utilities |
| `xhs-utils.ts` | XHS-specific utilities and configuration |

## Prerequisites

- Google Chrome or Chromium browser
- `bun` runtime
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
2. Chrome will open with XHS login page (https://xiaohongshu.com)
3. Log in with phone number and SMS verification code
4. Session will be saved to the Chrome profile directory
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
| `--profile <dir>` | Custom Chrome profile directory |

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

XHS has NO official public API for content posting. Browser automation via Chrome CDP is the most reliable approach. See **`references/technical-details.md`** for research on internal API endpoints and automation approaches.

## Additional References

### Technical Details

For implementation details including DOM selectors, CDP protocol usage, and platform support, see **`references/technical-details.md`**.

### Troubleshooting

For common issues and solutions, see **`references/troubleshooting.md`**. Covers:
- Chrome not found
- Page navigation errors
- DOM selector issues
- CDP connection timeout
- Login session persistence

### Usage Examples

For comprehensive examples including workflows, batch operations, and integrations, see **`references/usage-examples.md`**.

## Output

After successful posting, the script outputs:

```
[xhs] Parsing markdown: article.md
[xhs] Title: Your Article Title
[xhs] Category: Technology
[xhs] Tags: programming, react
[xhs] Status: draft
[xhs] Launching Chrome (profile: ~/.local/share/xhs-browser-profile)
[xhs] Navigating to article creation page...
[xhs] Checking login status...
[xhs] Waiting for editor to load...
[xhs] Filling in title...
[xhs] Filling in content...
[xhs] Setting category...
[xhs] Setting tags...
[xhs] Saving article...
[xhs] Article saved successfully!
[xhs] URL: https://xiaohongshu.com/explore/xxxxx
[xhs] Status: draft
```

## Notes

- **No Official API**: Browser automation via Chrome CDP required
- **Session Persistence**: Login saved in Chrome profile directory
- **SMS Verification**: First login requires phone + SMS verification
- **Language**: Chinese (Simplified) primary, markdown code blocks supported
- **Cross-platform**: macOS, Linux, Windows via bun runtime

## Sources

- [XHS Platform Guide](https://xiaohongshu.com)
- [XHS Creator Center](https://xiaohongshu.com/creator)
- [小红书创作指南](https://help.xiaohongshu.com)
