---
name: publish-to-medium
description: This skill should be used when the user asks to "publish to medium", "create a medium post", "post article to medium.com", or mentions Medium publishing. Supports markdown and HTML articles with frontmatter metadata via Medium API.
version: 1.0.0
---

# Post to Medium.com

Post markdown or HTML articles to Medium.com via Medium's REST API.

## When to Use

Activate this skill when:

- Publishing Stage 6 content to Medium.com
- User explicitly mentions "publish to medium", "medium post", "medium article"
- Creating Medium articles from markdown or HTML files
- Cross-posting content to Medium platform

## Script Directory

**Important**: All scripts are located in the `scripts/` subdirectory of this skill.

**Agent Execution Instructions**:

Scripts are invoked using `${CLAUDE_PLUGIN_ROOT}/skills/publish-to-medium/scripts/<script-name>.ts`

- `CLAUDE_PLUGIN_ROOT` = Claude Code predefined variable pointing to plugin root directory
- Full script path = `${CLAUDE_PLUGIN_ROOT}/skills/publish-to-medium/scripts/publish-to-medium.ts`

**Script Reference**:
| Script | Purpose |
|--------|---------|
| `scripts/publish-to-medium.ts` | Post articles to Medium via API |

## Prerequisites

- `bun` runtime
- Medium integration token (get at https://medium.com/me/settings)

## Configuration

Required: Create or update `~/.claude/wt/config.jsonc` for Medium settings:

```jsonc
{
  "publish-to-medium": {
    // Medium integration token (self-issued at https://medium.com/me/settings)
    // Required: Get your token at: https://medium.com/me/settings
    "integration_token": "your_integration_token_here",

    // Default publish status
    // Options: public, draft, unlisted
    // Default: draft (recommended for preview before publishing)
    "default_publish_status": "draft"
  }
}
```

**Environment Variable**: Alternatively, set `MEDIUM_INTEGRATION_TOKEN` environment variable.

## Medium API Status

**Note**: Medium's official API was archived in March 2023, but self-issued integration tokens still work for posting articles. This skill uses the REST API endpoints which remain functional for basic article publishing.

**Sources**:
- [Medium API Documentation (GitHub)](https://github.com/Medium/medium-api-docs)
- [Navigating Medium API with JavaScript in 2024](https://medium.com/@ritviknag/medium-api-with-javascript-in-2024-2e73440c7fa0)

---

## Getting Integration Token

1. Go to: https://medium.com/me/settings
2. Scroll to "Integration tokens"
3. Click "Get integration token"
4. Provide a description (e.g., "Claude Code Publisher")
5. Copy the token (format: `your_user_id_token_string`)
6. Add to `~/.claude/wt/config.jsonc` or set `MEDIUM_INTEGRATION_TOKEN` environment variable

---

## Usage

### Markdown Articles

```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-medium/scripts/publish-to-medium.ts --markdown article.md
```

**Markdown Frontmatter Support**:
```markdown
---
title: Article Title
tags: [javascript, typescript, api]
canonicalUrl: https://original-url.com
author: Author Name
---

# Article Content

Your article content here...
```

### HTML Articles

```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-medium/scripts/publish-to-medium.ts --html article.html
```

**HTML Requirements**:
- `<title>` tag for article title
- Optional: `<meta name="author" content="...">`
- Optional: `<link rel="canonical" href="...">`

### Direct Content

```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-medium/scripts/publish-to-medium.ts --title "My Title" --content "# Hello World\n\nThis is my article."
```

---

## Parameters

| Parameter | Description |
|-----------|-------------|
| `--markdown <path>` | Markdown file (recommended, supports frontmatter) |
| `--html <path>` | HTML file |
| `--title <text>` | Article title (auto-extracted from files) |
| `--content <text>` | Article content (use with --title) |
| `--tags <tag1,tag2>` | Comma-separated tags (max 5) |
| `--status <status>` | Publish status: `public`, `draft`, `unlisted` |
| `--canonical-url <url>` | Canonical URL for original content |
| `--license <license>` | License: `all-rights-reserved`, `cc-40-by`, etc. |
| `--notify-followers` | Notify followers (default: false) |
| `--token <token>` | Override integration token from config |

---

## Publish Status

| Status | Description |
|--------|-------------|
| `draft` | Saved as draft (not published, default) |
| `public` | Published publicly (visible to all) |
| `unlisted` | Published but unlisted (only accessible via direct link) |

**Default**: `draft` (safe default for preview before publishing)

---

## Tags

- Maximum: 5 tags per article
- Format: Comma-separated string (e.g., `javascript,typescript,api`)
- Tags can be specified in frontmatter or via `--tags` flag
- CLI tags are merged with file tags (up to 5 total)

---

## Examples

### Post markdown as draft

```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-medium/scripts/publish-to-medium.ts --markdown article.md
```

### Post as public

```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-medium/scripts/publish-to-medium.ts --markdown article.md --status public
```

### Post with custom tags

```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-medium/scripts/publish-to-medium.ts --markdown article.md --tags "javascript,typescript,api"
```

### Post HTML file

```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-medium/scripts/publish-to-medium.ts --html article.html --status public
```

### Post with canonical URL (SEO)

```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-medium/scripts/publish-to-medium.ts --markdown article.md --canonical-url "https://myblog.com/original-post"
```

### Post with license

```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-medium/scripts/publish-to-medium.ts --markdown article.md --license "cc-40-by"
```

---

## Output

After successful posting, the script outputs:

```
[medium] Title: Your Article Title
[medium] Tags: javascript, api
[medium] Status: draft
[medium] Authenticated as: Your Name (@username)
[medium] Post created successfully!
[medium] Post ID: <post_id>
[medium] URL: https://medium.com/@username/post-id
[medium] Status: draft
[medium] Draft saved. Publish it at: https://medium.com/@username/post-id/edit
```

---

## Notes

- **API Status**: Medium's official API is archived but still functional with self-issued tokens
- **Rate Limits**: Medium may have unpublished rate limits for API requests
- **Character Limits**: Title (max 100 chars), content (no documented limit)
- **Image Support**: Images in markdown are converted to Medium-hosted images automatically
- **Code Blocks**: Syntax highlighting supported via markdown code blocks
- **Cross-platform**: macOS, Linux, Windows (uses bun runtime)

---

## Troubleshooting

### "Integration token not found"

**Problem**: No token configured
**Solution**: Add `integration_token` to `~/.claude/wt/config.jsonc` or set `MEDIUM_INTEGRATION_TOKEN` environment variable

### "Medium API error: 401 Unauthorized"

**Problem**: Invalid or expired token
**Solution**: Get a new token at https://medium.com/me/settings

### "Medium API error: 429 Too Many Requests"

**Problem**: Rate limit exceeded
**Solution**: Wait before posting again

### "Title is required"

**Problem**: No title found in file or via --title flag
**Solution**: Add `title: Your Title` to frontmatter or use `--title "Your Title"`

---

## References

- [Medium API Documentation](https://github.com/Medium/medium-api-docs)
- [Medium Settings (Integration Tokens)](https://medium.com/me/settings)
- [Publishing a Post using the Medium API](https://github.com/Medium/medium-api-docs#33-publishing-a-post-using-the-medium-api)
