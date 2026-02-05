---
name: publish-to-infoq
description: This skill should be used when the user asks to "publish to infoq", "create a infoq article", "post article to xie.infoq.cn", or mentions InfoQ publishing. Supports markdown articles with frontmatter metadata via browser automation (Chrome CDP).
version: 1.0.0
---

# Post to InfoQ (xie.infoq.cn)

Post markdown articles to InfoQ contribution platform via browser automation using Chrome DevTools Protocol (CDP).

## Quick Start

```bash
# Post markdown as draft/review (recommended for first use)
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-infoq/scripts/infoq-article.ts --markdown article.md

# Submit for immediate review
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-infoq/scripts/infoq-article.ts --markdown article.md --submit
```

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
| `scripts/infoq-article.ts` | Post articles to InfoQ via CDP browser automation |
| `scripts/cdp.ts` | Chrome DevTools Protocol utilities |
| `scripts/infoq-utils.ts` | InfoQ-specific utilities and configuration |

## Prerequisites

- Google Chrome or Chromium browser
- `bun` runtime
- First run: log in to xie.infoq.cn manually (session persists in Chrome profile)
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
2. Chrome will open with InfoQ login page (https://xie.infoq.cn/auth/login)
3. Log in to your InfoQ account manually
4. Your session will be saved to the Chrome profile directory
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
| `--profile <dir>` | Custom Chrome profile directory |

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

InfoQ has NO official API for content posting. Browser automation via Chrome CDP is the most reliable approach. See **`references/infoq-api-research.md`** for research on internal API endpoints and automation approaches.

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
[infoq] Parsing markdown: article.md
[infoq] Title: Your Article Title
[infoq] Category: Architecture
[infoq] Tags: microservices, kubernetes
[infoq] Status: draft
[infoq] Launching Chrome (profile: ~/.local/share/infoq-browser-profile)
[infoq] Navigating to new article page...
[infoq] Waiting for editor to load...
[infoq] Filling in title...
[infoq] Filling in content...
[infoq] Setting category...
[infoq] Setting tags...
[infoq] Saving as draft...
[infoq] Article saved successfully!
[infoq] URL: https://xie.infoq.cn/article/xxxxx
[infoq] Status: draft
```

## Notes

- **No Official API**: InfoQ has no official API for content publishing
- **Session Persistence**: Login session persists in Chrome profile directory
- **Review Process**: Submitted articles undergo editorial review (~1 week)
- **Word Count**: 3000-4000 words recommended for acceptance
- **Character Limits**: Title (no documented strict limit), content (markdown supported)
- **Code Blocks**: Syntax highlighting supported via markdown code blocks
- **Cross-platform**: macOS, Linux, Windows (uses bun runtime)
- **Vue.js SPA**: InfoQ editor is JavaScript-rendered (Vue.js 2.6.11)
