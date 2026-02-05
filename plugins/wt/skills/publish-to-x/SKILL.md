---
name: publish-to-x
description: This skill should be used when the user asks to "publish to X", "post to Twitter", "share on X", "tweet this", or mentions X publishing as part of Stage 6 of the technical content creation process. Handles publishing posts, images, videos, quote tweets, and long-form articles to X via Chrome DevTools Protocol automation.
version: 1.0.0
---

# Post to X (Twitter)

Posts text, images, videos, and long-form articles to X via real Chrome browser (bypasses anti-bot detection).

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

## Script Directory

**Important**: All scripts are located in the `scripts/` subdirectory of this skill.

**Agent Execution Instructions**:

Scripts are invoked using `${CLAUDE_PLUGIN_ROOT}/skills/publish-to-x/scripts/<script-name>.ts`

- `CLAUDE_PLUGIN_ROOT` = Claude Code predefined variable pointing to plugin root directory
- Full script path = `${CLAUDE_PLUGIN_ROOT}/skills/publish-to-x/scripts/<script-name>.ts`

**Script Reference**:
| Script | Purpose |
|--------|---------|
| `scripts/x-browser.ts` | Regular posts (text + images) |
| `scripts/x-video.ts` | Video posts (text + video) |
| `scripts/x-quote.ts` | Quote tweet with comment |
| `scripts/x-article.ts` | Long-form article publishing (Markdown) |
| `scripts/md-to-html.ts` | Markdown → HTML conversion |
| `scripts/copy-to-clipboard.ts` | Copy content to clipboard |
| `scripts/paste-from-clipboard.ts` | Send real paste keystroke |

## Prerequisites

- Google Chrome or Chromium
- `bun` runtime
- First run: log in to X manually (session saved)

## Configuration

Optional: Create `~/.claude/wt/config.jsonc` for custom settings:

```jsonc
{
  "publish-to-x": {
    // Chrome profile directory for X/Twitter authentication
    // Stores login session, cookies, and authentication data
    // Default: ~/.local/share/x-browser-profile
    "profile_dir": "~/.local/share/x-browser-profile",

    // Auto-submit preference (true = skip preview, post immediately)
    // Default: false (always preview before posting for safety)
    "auto_submit": false
  }
}
```

**Note**: Use `--submit` / `--no-submit` flags to override auto_submit setting per invocation.

## Related Skills

- **wt:technical-content-creation** - Full 7-stage workflow (Stage 6 delegates here)
- **wt:publish-to-surfing** - Surfing platform publishing (parallel skill for comparison)

## References

- **Regular Posts**: See `references/regular-posts.md` for manual workflow, troubleshooting, and technical details
- **X Articles**: See `references/articles.md` for long-form article publishing guide

---

## Regular Posts

Text + up to 4 images.

```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-x/scripts/x-browser.ts "Hello!" --image ./photo.png          # Preview
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-x/scripts/x-browser.ts "Hello!" --image ./photo.png --submit  # Post
```

**Parameters**:
| Parameter | Description |
|-----------|-------------|
| `<text>` | Post content (positional) |
| `--image <path>` | Image file (repeatable, max 4) |
| `--submit` | Post (default: preview) |
| `--profile <dir>` | Custom Chrome profile |

---

## Video Posts

Text + video file.

```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-x/scripts/x-video.ts "Check this out!" --video ./clip.mp4          # Preview
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-x/scripts/x-video.ts "Amazing content" --video ./demo.mp4 --submit  # Post
```

**Parameters**:
| Parameter | Description |
|-----------|-------------|
| `<text>` | Post content (positional) |
| `--video <path>` | Video file (MP4, MOV, WebM) |
| `--submit` | Post (default: preview) |
| `--profile <dir>` | Custom Chrome profile |

**Limits**: Regular 140s max, Premium 60min. Processing: 30-60s.

---

## Quote Tweets

Quote an existing tweet with comment.

```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-x/scripts/x-quote.ts https://x.com/user/status/123 "Great insight!"          # Preview
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-x/scripts/x-quote.ts https://x.com/user/status/123 "I agree!" --submit       # Post
```

**Parameters**:
| Parameter | Description |
|-----------|-------------|
| `<tweet-url>` | URL to quote (positional) |
| `<comment>` | Comment text (positional, optional) |
| `--submit` | Post (default: preview) |
| `--profile <dir>` | Custom Chrome profile |

---

## X Articles

Long-form Markdown articles (requires X Premium).

```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-x/scripts/x-article.ts article.md                        # Preview
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-x/scripts/x-article.ts article.md --cover ./cover.jpg    # With cover
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-x/scripts/x-article.ts article.md --submit               # Publish
```

**Parameters**:
| Parameter | Description |
|-----------|-------------|
| `<markdown>` | Markdown file (positional) |
| `--cover <path>` | Cover image |
| `--title <text>` | Override title |
| `--submit` | Publish (default: preview) |

**Frontmatter**: `title`, `cover_image` supported in YAML front matter.

---

## Notes

- First run: manual login required (session persists)
- Always preview before `--submit`
- Cross-platform: macOS, Linux, Windows
