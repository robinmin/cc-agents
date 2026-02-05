---
name: publish-to-surfing
description: This skill should be used when the user asks to "publish to Surfing", "publish article to Surfing", "deploy content to Surfing", or mentions Surfing publishing workflow as part of Stage 6 of the technical content creation process. Handles publishing articles and associated content to the Surfing static site via the postsurfing CLI.
version: 1.0.0
---

# Publishing to Surfing

Publish technical articles to the Surfing platform as part of Stage 6 of the technical content workflow.

## Overview

The Surfing platform is an Astro-based static site deployed to Cloudflare Pages. Content is published via the `postsurfing` CLI which handles content placement, validation, building, and git operations.

**Key Point:** Surfing uses a file-based publishing workflow (NOT API-based). Content files are placed in the `contents/{type}/{lang}/` directory, then the site is built and deployed.

## Script Directory

**Important**: All scripts are located in the `scripts/` subdirectory of this skill.

**Agent Execution Instructions**:

The publish script is a bash script that wraps the postsurfing CLI. Execute it using:

```bash
bash ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-surfing/scripts/publish.sh <source-file> [OPTIONS]
```

- `CLAUDE_PLUGIN_ROOT` = Claude Code predefined variable pointing to plugin root directory
- Full script path = `${CLAUDE_PLUGIN_ROOT}/skills/publish-to-surfing/scripts/publish.sh`

**Script Reference**:
| Script | Purpose |
|--------|---------|
| `scripts/publish.sh` | Wrapper that copies content and triggers postsurfing CLI |

## Quick Start

```bash
# Dry run to preview
bash ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-surfing/scripts/publish.sh article_en.md --type articles --lang en --dry-run

# Publish live (English)
bash ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-surfing/scripts/publish.sh article_en.md --type articles --lang en

# Publish live (Chinese)
bash ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-surfing/scripts/publish.sh article_cn.md --type articles --lang cn

# Publish with translations (multi-language article)
bash ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-surfing/scripts/publish.sh article_en.md --type articles --lang en --translations en,zh,ja

# Publish without build validation (faster, manual build later)
bash ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-surfing/scripts/publish.sh article_en.md --type articles --lang en --no-build

# Publish without git operations (commit manually later)
bash ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-surfing/scripts/publish.sh article_en.md --type articles --lang en --no-build --no-commit
```

## When to Use

Activate this skill when:

- Publishing Stage 6 content to Surfing platform
- User explicitly mentions "publish to Surfing" or "deploy to Surfing"
- Completing the technical content workflow (Stage 6)
- Cross-posting content to Surfing from other platforms

**Integration Points:**

- **wt:technical-content-creation** - Stage 6 (Publish) delegates to this skill
- **5-adaptation/** - Uses adapted content as source for publishing
- **4-illustration/** - Includes cover images and inline illustrations

## Workflows

### Publishing an Article

**Workflow:**

1. **Validate prerequisites** - Check content and configuration
   - Verify source file exists (article.md from 5-adaptation/)
   - Check Surfing project is accessible at `~/projects/surfing`
   - Validate frontmatter format

2. **Prepare content** - Determine publishing parameters
   - Content type: articles (default), showcase, documents, cheatsheets
   - Language: en (default), cn, jp
   - Review content for publishing

3. **Publish via postsurfing CLI** - Execute publishing [CRITICAL]
   - **Execute the publish script:**
     ```bash
     bash ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-surfing/scripts/publish.sh <source-file> --type <type> --lang <lang>
     ```
   - The script handles: frontmatter validation, file placement, build validation, git operations
   - Content is placed in `contents/{type}/{lang}/` directory
   - Site is built and validated
   - Changes are committed and pushed to git
   - **For dry-run, add `--dry-run` flag**

4. **Verify publication** - Confirm success
   - Check postsurfing CLI output for success message
   - Verify file was placed in correct location
   - Update publish-log.json

**Feedback Loop:**
```
validate → prepare → publish → verify → log
```

### Content Types

| Type | Description | Directory |
|------|-------------|-----------|
| **articles** | AI insights, research, technical content | `contents/articles/{lang}/` |
| **showcase** | Project portfolios with demos | `contents/showcase/{lang}/` |
| **documents** | HTML content for rich-formatted pieces | `contents/documents/{lang}/` |
| **cheatsheets** | AI-generated reference materials | `contents/cheatsheets/{lang}/` |

### Language Support

| Language | Code | Directory |
|----------|------|-----------|
| English | en | `contents/{type}/en/` |
| Chinese (Simplified) | cn | `contents/{type}/cn/` |
| Japanese | jp | `contents/{type}/jp/` |

### Error Recovery

| Error Type | Recovery Action |
|------------|-----------------|
| Missing source file | Check 5-adaptation/ directory, re-run adaptation |
| Surfing project not found | Verify `~/projects/surfing` exists |
| Invalid frontmatter | Fix frontmatter fields in source file |
| Build validation failed | Use `--no-build` flag or fix content issues |
| Git operation blocked by hooks | Use `--no-commit` flag, then commit manually |
| Cover image not found | Warning only - publishing continues without image |
| postsurfing CLI not found | Verify Surfing project is properly set up |

### Advanced Options

| Option | Purpose | When to Use |
|--------|---------|-------------|
| `--no-build` | Skip build validation | Build takes long, you'll validate manually |
| `--no-commit` | Skip git commit/push | Hooks block operations, want manual control |
| `--translations <langs>` | Add translations array | Publishing multi-language articles |
| `--dry-run` | Preview without changes | Testing before live publication |

**Example workflow with manual git operations:**
```bash
# Publish without git operations
bash ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-surfing/scripts/publish.sh article.md --type articles --lang en --no-build --no-commit

# Then manually commit and push
cd ~/projects/surfing
git add -A
git commit -m "Add article: Title"
git push
```

### Dry Run Mode

Always use dry-run first for preview:

```bash
# Preview publication without going live
wt:publish-to-surfing --source article.md --type articles --dry-run

# Review: content preview, output path, metadata
# Confirm before live publishing
```

## Surfing Platform Integration

### Project Location

Surfing project is located at: `~/projects/surfing`

The `postsurfing` CLI is at: `scripts/postsurfing/postsurfing.mjs`

### Content Format

Surfing expects articles with:

1. **Frontmatter** (YAML):
   ```yaml
   ---
   title: "Article Title"
   description: "Article description for SEO"
   publishDate: 2026-01-28
   tags: [tag1, tag2, tag3]
   image: "/images/cover-image.jpg"
   ---
   ```

2. **Markdown body** - Standard GitHub Flavored Markdown
3. **Image references** - Absolute paths from `public/images/` or `assets/images/`

### Deployment Process

The `postsurfing` CLI handles:

1. **Content Processing**: Validates and processes the content file
2. **HTML Conversion**: Converts HTML to Markdown (if needed)
3. **Frontmatter Management**: Validates and auto-completes frontmatter fields
4. **File Placement**: Places content in `contents/{type}/{lang}/`
5. **Build Validation**: Runs `npm run build` to ensure site builds successfully
6. **Git Operations**: Commits changes with smart commit messages and pushes to remote
7. **Deployment**: Cloudflare Pages auto-deploys on push

## Publish Log Format

Update `publish-log.json` after publication:

```json
{
  "version": "1.0.0",
  "last_updated": "2026-01-28T10:00:00Z",
  "publications": [
    {
      "id": "pub-001",
      "platform": "surfing",
      "url": "https://surfing.salty.vip/articles/article-slug",
      "content_type": "articles",
      "language": "en",
      "published_at": "2026-01-28T10:00:00Z",
      "status": "published",
      "notes": "Published via postsurfing CLI"
    }
  ]
}
```

## Skill Structure

```
publish-to-surfing/
├── SKILL.md          # This file
├── scripts/          # Helper scripts
│   └── publish.sh    # Shell script wrapper for postsurfing CLI
└── references/       # Platform-specific documentation
    ├── content-specification.md  # Surfing content format guide
    └── postsurfing-cli.md        # CLI documentation
```

## References

- **Surfing Project**: `~/projects/surfing`
- **Surfing Website**: https://surfing.salty.vip/
- **PostSurfing CLI**: `~/projects/surfing/scripts/postsurfing/postsurfing.mjs`
- **Content Specification**: `~/projects/surfing/docs/content-specification.md`

## Best Practices

1. **Always dry-run first** - Preview content before live publication
2. **Use --no-build for faster iteration** - Build validation can be slow, skip it when iterating
3. **Use --no-commit when hooks block operations** - Then manually commit and push
4. **Validate frontmatter** - Ensure required fields are present (title, topic, description)
5. **Check content type** - Use appropriate type for your content
6. **Set language correctly** - Default is en, but specify cn or jp if needed
7. **Handle errors gracefully** - Provide actionable feedback for failures
8. **Update publish log** - Track all publications for audit trail
9. **Verify deployment** - Check that content appears on the site after publishing
10. **Specify translations for multi-language content** - Use `--translations en,zh,ja` for articles available in multiple languages

## Recent Fixes

**Version 1.1.0** - Fixed script exit issues and added advanced options:

1. **Removed `set -u` flag** - Changed from `set -euo pipefail` to `set -eo pipefail` to prevent exits from unbound variables in optional operations

2. **Fixed `process_cover_image` function** - Now handles all cases safely:
   - Returns empty string (not error) when no cover image found
   - Validates file exists before processing
   - Handles missing topic field gracefully
   - Always exits with 0 for safe use with `set -e`

3. **Fixed `extract_field` function** - Now handles missing fields gracefully:
   - Returns empty string instead of causing errors
   - Redirects stderr to suppress grep warnings

4. **Added `--no-build` option** - Skip build validation (useful for faster iteration)

5. **Added `--no-commit` option** - Skip git operations (useful when hooks block operations)

6. **Improved error messages** - Better feedback and actionable suggestions when publish fails

## Related Skills

- **wt:technical-content-creation** - Full 7-stage workflow (Stage 6 delegates here)
- **wt:image-cover** - Cover image generation for featured images
- **wt:image-illustrator** - Inline illustration generation

## Common Issues

### Issue: Script exits with code 1 but content appears to publish

**Symptoms:** Script reports error but files are copied successfully.

**Root Cause:** Build validation fails or git hooks block operations.

**Solution:** Use `--no-build` and `--no-commit` flags:
```bash
bash ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-surfing/scripts/publish.sh article.md --type articles --lang en --no-build --no-commit
```

### Issue: "Copied cover image:" shows empty values

**Symptoms:** Output shows "Copied cover image:" followed by "->" with no paths.

**Root Cause:** Cover image path extraction fails (field missing or invalid path).

**Solution:**
- Verify `cover_image` or `image` field exists in frontmatter
- Check image path is relative (e.g., `../4-illustration/cover.webp`) or URL
- Script continues without image if not found

### Issue: postsurfing CLI not found

**Solution:** Verify Surfing project exists and CLI is accessible:
```bash
ls -la ~/projects/surfing/scripts/postsurfing/postsurfing.mjs
```

### Issue: Build validation fails

**Solution:** Check Astro build errors:
```bash
cd ~/projects/surfing
npm run build
```

### Issue: Git operation fails

**Solution:** Check git configuration:
```bash
cd ~/projects/surfing
git status
git remote -v
```

### Issue: Content not appearing on site

**Solution:**
1. Verify file was placed in correct directory
2. Check Cloudflare Pages deployment status
3. Wait for deployment to complete (usually < 2 minutes)

## Before Publishing

**Validation Checklist:**
- [ ] Source article.md exists in 6-publish/ directory
- [ ] Frontmatter has required fields (title, description, publishDate)
- [ ] Cover image exists (if needed)
- [ ] Content type is correct (articles, showcase, documents, cheatsheets)
- [ ] Language is set correctly (en, cn, jp)
- [ ] Dry-run completed successfully
- [ ] User confirmed live publication

---

**Publishing Flow Summary:**

1. Take article from Stage 5 (Adaptation)
2. Run postsurfing CLI with appropriate parameters
3. CLI validates content, places file in `contents/{type}/{lang}/`
4. CLI runs build validation to ensure site builds
5. CLI commits and pushes to git
6. Cloudflare Pages auto-deploys
7. Content is live at https://surfing.salty.vip/
