---
name: publish-to-substack
description: This skill should be used when the user asks to "publish to substack", "create a substack post", "post article to substack.com", or mentions Substack publishing. Supports markdown articles with frontmatter metadata via browser automation (Playwright).
version: 2.0.0
---

# Post to Substack.com

Post markdown articles to Substack.com via browser automation using Playwright.

## Quick Start

```bash
# Post markdown as draft (recommended for first use)
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-substack/scripts/substack-playwright.ts --markdown article.md

# Publish immediately
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-substack/scripts/substack-playwright.ts --markdown article.md --publish
```

**Note**: This is the new Playwright-based implementation. The old CDP-based script (`substack-article.ts`) is still available but deprecated.

## When to Use

Activate this skill when:

- Publishing Stage 6 content to Substack.com
- User explicitly mentions "publish to substack", "substack post", "substack article"
- Creating Substack articles from markdown files
- Cross-posting content to Substack platform

## Script Directory

All scripts are located in the `scripts/` subdirectory of this skill.

Scripts are invoked using `${CLAUDE_PLUGIN_ROOT}/skills/publish-to-substack/scripts/<script-name>.ts`

- `CLAUDE_PLUGIN_ROOT` = Claude Code predefined variable pointing to plugin root directory
- Full script path = `${CLAUDE_PLUGIN_ROOT}/skills/publish-to-substack/scripts/<script-name>.ts`

**Script Reference**:
| Script | Purpose |
|--------|---------|
| `scripts/substack-playwright.ts` | **NEW**: Post articles to Substack via Playwright browser automation (recommended) |
| `scripts/substack-article.ts` | **DEPRECATED**: Post articles to Substack via CDP browser automation (legacy) |
| `scripts/cdp.ts` | Chrome DevTools Protocol utilities (legacy) |
| `scripts/substack-utils.ts` | Substack-specific utilities and configuration |

## Prerequisites

- `bun` runtime
- Playwright (auto-installed on first run)
- First run: log in to Substack manually (session persists in browser profile)

## Configuration

Optional: Create or update `~/.claude/wt/config.jsonc` for Substack settings:

```jsonc
{
  "publish-to-substack": {
    "profile_dir": "~/.local/share/substack-browser-profile",
    "auto_publish": false
  }
}
```

Use `--publish` / `--draft` flags to override auto_publish setting per invocation.

## First Run Setup

First time setup (requires manual login):

1. Run any publish command
2. Browser will open with Substack login page (using Playwright's bundled Chromium)
3. Log in to your Substack account manually
4. Your session will be saved to the browser profile directory
5. Subsequent runs will use the saved session

## Parameters

| Parameter | Description |
|-----------|-------------|
| `--markdown <path>` | Markdown file (recommended, supports frontmatter) |
| `--title <text>` | Article title (auto-extracted from markdown) |
| `--content <text>` | Article content (use with --title) |
| `--tags <tag1,tag2>` | Comma-separated tags |
| `--subtitle <text>` | Article subtitle |
| `--publish` | Publish as public (default: draft) |
| `--draft` | Save as draft (overrides auto_publish config) |
| `--profile <dir>` | Custom Chrome profile directory |
| `--publication <url>` | Substack publication URL (for multi-publication accounts) |

## Markdown Frontmatter

```markdown
---
title: Article Title
tags: [javascript, typescript, technology]
subtitle: Optional subtitle for the article
---

# Article Content

Your article content here in markdown format...
```

## Publish Status

| Status | Description |
|--------|-------------|
| `draft` | Saved as draft (not published, default) |
| `publish` | Published publicly (visible to all subscribers) |

Default: `draft` (safe default for preview before publishing)

## Tags

- Substack supports unlimited tags per article
- Format: Comma-separated string (e.g., `javascript,typescript,technology`)
- Tags can be specified in frontmatter or via `--tags` flag
- Tags help readers discover your content

## Additional References

### Why Browser Automation?

Substack has NO official API. Browser automation via Chrome CDP is the most reliable approach. See **`references/substack-api-research.md`** for research on unofficial libraries and their limitations.

### Technical Details

For implementation details including DOM selectors, CDP protocol usage, and platform support, see **`references/technical-details.md`**.

### Troubleshooting

For common issues and solutions, see **`references/troubleshooting.md`**. Covers:
- Chrome not found
- Page navigation errors
- DOM selector issues
- CDP connection timeout
- Missing title errors

### Usage Examples

For comprehensive examples including workflows, batch operations, and integrations, see **`references/usage-examples.md`**.

## Related Skills

- **wt:technical-content-creation** - Full 7-stage workflow (Stage 6 delegates here)
- **wt:publish-to-wechatmp** - WeChat Official Account publishing (similar Playwright approach)
- **wt:publish-to-medium** - Medium platform publishing (API-based, for comparison)

## Migration Notes

This skill was migrated from Chrome DevTools Protocol (CDP) to Playwright in version 2.0.0. Key improvements:
- Uses Playwright's bundled Chromium (no Chrome lock file issues)
- More reliable element selection with Playwright's locator API
- Better error handling and retry mechanisms
- Uses shared `@wt/web-automation` library for common utilities

## Output

After successful posting, the script outputs:

```
[substack-pw] Parsing markdown: article.md
[substack-pw] Title: Your Article Title
[substack-pw] Tags: javascript, technology
[substack-pw] Status: draft
[substack-pw] Launching browser (profile: ~/.local/share/substack-browser-profile)
[substack-pw] Using Playwright bundled Chromium
[substack-pw] Navigating to: https://substack.com/new
[substack-pw] Already logged in
[substack-pw] Waiting for editor to load...
[substack-pw] Editor ready
[substack-pw] Filling in title...
[substack-pw] Title filled
[substack-pw] Filling in content...
[substack-pw] Content filled
[substack-pw] Setting tags: javascript, technology...
[substack-pw] Tags added
[substack-pw] Saving as draft...
[substack-pw] Article saved successfully!
[substack-pw] URL: https://yourpublication.substack.com/p/xxxxx
[substack-pw] Status: draft
[substack-pw] Browser window remains open for review.
[substack-pw] Press Ctrl+C to close.
```

## Notes

- **No Official API**: Substack has no official API for content publishing
- **Session Persistence**: Login session persists in Chrome profile directory
- **Rate Limits**: Substack may have unpublished rate limits for posting
- **Character Limits**: Title (no documented limit), content (no documented limit)
- **Image Support**: Images in markdown are uploaded to Substack's CDN
- **Code Blocks**: Syntax highlighting supported via markdown code blocks
- **Cross-platform**: macOS, Linux, Windows (uses bun runtime)
