---
name: publish-to-wechatmp
description: Post content to WeChat Official Account (微信公众号) via Chrome CDP automation. Supports article posting (文章) with full markdown formatting and image-text posting (图文) with multiple images. Use when user mentions "发布公众号", "post to wechat", "微信公众号", or "图文/文章".
version: 1.0.0
---

# Post to WeChat Official Account (微信公众号)

Post text, images, and markdown articles to WeChat Official Account via real Chrome browser (bypasses anti-bot detection).

## When to Use

Activate this skill when:

- Publishing Stage 6 content to WeChat Official Account
- User explicitly mentions "publish to wechat", "发布公众号", "微信公众号"
- Creating WeChat articles from markdown
- Posting image-text content (图文)

## Script Directory

**Important**: All scripts are located in the `scripts/` subdirectory of this skill.

**Agent Execution Instructions**:

Scripts are invoked using `${CLAUDE_PLUGIN_ROOT}/skills/publish-to-wechatmp/scripts/<script-name>.ts`

- `CLAUDE_PLUGIN_ROOT` = Claude Code predefined variable pointing to plugin root directory
- Full script path = `${CLAUDE_PLUGIN_ROOT}/skills/publish-to-wechatmp/scripts/<script-name>.ts`

**Script Reference**:
| Script | Purpose |
|--------|---------|
| `scripts/wechat-browser.ts` | Image-text posts (图文) |
| `scripts/wechat-article.ts` | Article posting (文章) |
| `scripts/md-to-wechat.ts` | Markdown → WeChat HTML |
| `scripts/cdp.ts` | Chrome DevTools Protocol utilities |
| `scripts/copy-to-clipboard.ts` | Copy content to clipboard |
| `scripts/paste-from-clipboard.ts` | Send real paste keystroke |

## Prerequisites

- Google Chrome or Chromium
- `bun` runtime
- First run: log in to WeChat Official Account manually (session saved)

## Configuration

Optional: Create `~/.claude/wt/config.jsonc` for custom settings:

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
    "default_theme": "default"
  }
}
```

**Note**: Use `--submit` / `--no-submit` flags to override auto_submit setting per invocation.

## Related Skills

- **wt:technical-content-creation** - Full 7-stage workflow (Stage 6 delegates here)
- **wt:publish-to-x** - X/Twitter platform publishing (parallel skill for comparison)

## References

- **Image-Text Posts**: See `references/image-text-posting.md` for manual workflow and troubleshooting
- **Article Posts**: See `references/article-posting.md` for long-form article publishing guide

---

## Image-Text Posts (图文)

Text + up to 9 images.

```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-wechatmp/scripts/wechat-browser.ts --markdown article.md --images ./images/          # Preview
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-wechatmp/scripts/wechat-browser.ts --markdown article.md --images ./images/ --submit  # Post
```

**Parameters**:
| Parameter | Description |
|-----------|-------------|
| `--markdown <path>` | Markdown file for title/content extraction |
| `--images <dir>` | Directory containing images (PNG/JPG) |
| `--title <text>` | Article title (max 20 chars, auto-compressed) |
| `--content <text>` | Article content (max 1000 chars, auto-compressed) |
| `--image <path>` | Add image (repeatable, max 9) |
| `--submit` | Save as draft (default: preview only) |
| `--profile <dir>` | Custom Chrome profile |

---

## Article Posts (文章)

Long-form Markdown articles with themes.

```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-wechatmp/scripts/wechat-article.ts --markdown article.md                        # Preview
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-wechatmp/scripts/wechat-article.ts --markdown article.md --theme grace --submit  # Post
```

**Parameters**:
| Parameter | Description |
|-----------|-------------|
| `--markdown <path>` | Markdown file (recommended) |
| `--html <path>` | HTML file to paste |
| `--title <text>` | Article title (max 64 chars) |
| `--content <text>` | Article content (use with --image) |
| `--author <name>` | Author name |
| `--summary <text>` | Article summary |
| `--image <path>` | Content image (repeatable) |
| `--theme <name>` | Theme name (default, grace, simple) |
| `--submit` | Save as draft (default: preview only) |
| `--profile <dir>` | Custom Chrome profile |

**Frontmatter**: `title`, `author`, `description`/`summary` supported in YAML front matter.

---

## Themes

| Theme | Description |
|-------|-------------|
| `default` | 经典主题 - Traditional style, centered titles with colored bottom borders |
| `grace` | 优雅主题 - Graceful theme with text shadows, rounded cards, elegant quote blocks (by @brzhang) |
| `simple` | 简洁主题 - Modern minimalist, asymmetric rounded corners, clean whitespace (by @okooo5km) |

---

## Notes

- First run: manual login required (session persists in profile directory)
- Always preview before `--submit`
- Cross-platform: macOS, Linux, Windows
- Image auto-compression for 图文 posts (title: 20 chars, content: 1000 chars)

