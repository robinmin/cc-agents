---
name: publish-to-infoq
description: This skill should be used when the user asks to "publish to infoq", "create a infoq article", "post article to xie.infoq.cn", or mentions InfoQ publishing. Supports markdown articles with frontmatter metadata via browser automation (Playwright).
version: 2.0.0
---

# Post to InfoQ (xie.infoq.cn)

Post markdown articles to InfoQ contribution platform via browser automation using Playwright.

## Quick Start

```bash
# Post markdown as draft/review (recommended for first use)
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-infoq/scripts/infoq-playwright.ts --markdown article.md

# Submit for immediate review
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-infoq/scripts/infoq-playwright.ts --markdown article.md --submit
```

**Note**: This is the new Playwright-based implementation. The old CDP-based script (`infoq-article.ts`) is still available but deprecated.

## When to Use

Activate this skill when:

- Publishing Stage 6 content to InfoQ (xie.infoq.cn)
- User explicitly mentions "publish to infoq", "infoq article", "infoq contribution"
- Creating InfoQ articles from markdown files
- Submitting technical content for InfoQ editorial review

## Script Directory

All scripts are located in the `scripts/` subdirectory of this skill.

Scripts are invoked using `${CLAUDE_PLUGIN_ROOT}/skills/publish-to-infoq/scripts/<script-name>.ts`

- `CLAUDE_PLUGIN_ROOT` = Claude Code predefined variable pointing to plugin root directory
- Full script path = `${CLAUDE_PLUGIN_ROOT}/skills/publish-to-infoq/scripts/<script-name>.ts`

**Script Reference**:
| Script | Purpose |
|--------|---------|
| `scripts/infoq-playwright.ts` | **NEW**: Post articles to InfoQ via Playwright browser automation (recommended) |
| `scripts/infoq-article.ts` | **DEPRECATED**: Post articles to InfoQ via CDP browser automation (legacy) |
| `scripts/cdp.ts` | Chrome DevTools Protocol utilities (legacy) |
| `scripts/infoq-utils.ts` | InfoQ-specific utilities and configuration |

## Prerequisites

- `bun` runtime
- Playwright (auto-installed on first run)
- First run: log in to xie.infoq.cn manually (session persists in browser profile)
- InfoQ contributor account (register at https://xie.infoq.cn/auth/login)

## Configuration

Optional: Create or update `~/.claude/wt/config.jsonc` for InfoQ settings:

```jsonc
{
  "publish-to-infoq": {
    "profile_dir": "~/.local/share/infoq-browser-profile",
    "auto_publish": false
  }
}
```

Use `--submit` / `--draft` flags to override auto_publish setting per invocation.

## First Run Setup

First time setup (requires manual login):

1. Run any publish command
2. Browser will open with InfoQ login page (using Playwright's bundled Chromium)
3. Log in to your InfoQ account manually
4. Your session will be saved to the browser profile directory
5. Subsequent runs will use the saved session

## Parameters

| Parameter | Description |
|-----------|-------------|
| `--markdown <path>` | Markdown file (recommended, supports frontmatter) |
| `--title <text>` | Article title (auto-extracted from markdown) |
| `--content <text>` | Article content (use with --title) |
| `--category <name>` | Article category (Architecture, AI, Frontend, etc.) |
| `--tags <tag1,tag2>` | Comma-separated tags |
| `--submit` | Submit for review (default: draft/preview) |
| `--draft` | Save as draft (overrides auto_publish config) |
| `--profile <dir>` | Custom browser profile directory |

## Markdown Frontmatter

```markdown
---
title: Article Title
category: Architecture
tags: [microservices, cloud-native, kubernetes]
subtitle: Optional subtitle for the article
---

# Article Content

Your article content here in markdown format...
```

## Supported Categories

InfoQ accepts articles in these categories:

- **Architecture** (架构)
- **Cloud Computing** (云计算)
- **AI / Machine Learning** (人工智能)
- **Frontend** (前端)
- **Operations** (运维)
- **Open Source** (开源)
- **Java** (Java)
- **Algorithms** (算法)
- **Big Data** (大数据)

## Article Requirements

Per InfoQ contribution guidelines:

- **Word Count**: 3000-4000 words recommended for depth articles
- **Content Type**: Technical depth articles preferred
- **Author Profile**: Experience-rich IT engineer authors
- **Review Time**: ~1 week for editorial feedback
- **Copyright**: Multiple options available (InfoQ-owned, Author-owned, Shared)

## Publish Status

| Status | Description |
|--------|-------------|
| `draft` | Saved as draft (not submitted, default) |
| `submit` | Submitted for editorial review (~1 week response time) |

Default: `draft` (safe default for preview before submission)

## Why Browser Automation?

InfoQ has NO official API for content posting. Browser automation via Playwright is the most reliable approach. See **`references/infoq-api-research.md`** for research on internal API endpoints and automation approaches.

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
[infoq-pw] Parsing markdown: article.md
[infoq-pw] Title: Your Article Title
[infoq-pw] Category: Architecture
[infoq-pw] Tags: microservices, kubernetes
[infoq-pw] Status: draft
[infoq-pw] Launching browser (profile: ~/.local/share/infoq-browser-profile)
[infoq-pw] Using Playwright bundled Chromium
[infoq-pw] Navigating to: https://xie.infoq.cn/article/create
[infoq-pw] Checking login status...
[infoq-pw] Already logged in.
[infoq-pw] Waiting for editor to load...
[infoq-pw] Editor ready
[infoq-pw] Filling in title...
[infoq-pw] Title filled
[infoq-pw] Filling in subtitle/summary...
[infoq-pw] Subtitle filled
[infoq-pw] Filling in content...
[infoq-pw] Content filled using ProseMirror approach
[infoq-pw] Setting category...
[infoq-pw] Category set
[infoq-pw] Setting tags...
[infoq-pw] Tags added
[infoq-pw] Saving as draft...
[infoq-pw] Article saved successfully!
[infoq-pw] URL: https://xie.infoq.cn/article/xxxxx
[infoq-pw] Status: draft
[infoq-pw] Browser window remains open for review.
[infoq-pw] Press Ctrl+C to close.
```

## Notes

- **No Official API**: InfoQ has no official API for content publishing
- **Session Persistence**: Login session persists in browser profile directory
- **Review Process**: Submitted articles undergo editorial review (~1 week)
- **Word Count**: 3000-4000 words recommended for acceptance
- **Character Limits**: Title (no documented strict limit), content (markdown supported)
- **Code Blocks**: Syntax highlighting supported via markdown code blocks
- **Cross-platform**: macOS, Linux, Windows (uses bun runtime)
- **Vue.js SPA**: InfoQ editor is JavaScript-rendered (Vue.js 2.6.11)
- **Login Timeout**: Script waits up to 5 minutes for manual login completion
