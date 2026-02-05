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

## Quick Start

```bash
# From Stage 6 directory (6-publish/)
# Ensure article.md exists from Stage 5 adaptation

# Dry run to preview
wt:publish-to-surfing \
  --source article.md \
  --type articles \
  --lang en \
  --dry-run

# Publish live
wt:publish-to-surfing \
  --source article.md \
  --type articles \
  --lang en
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

3. **Publish via postsurfing CLI** - Execute publishing
   - Call `postsurfing` CLI with appropriate parameters
   - CLI handles: frontmatter validation, file placement, build validation, git operations
   - Content is placed in `contents/{type}/{lang}/` directory
   - Site is built and validated
   - Changes are committed and pushed to git

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
| Build validation failed | Check Astro build errors, fix content issues |
| Git operation failed | Check git remote, authentication |
| postsurfing CLI not found | Verify Surfing project is properly set up |

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
2. **Validate frontmatter** - Ensure required fields are present
3. **Check content type** - Use appropriate type for your content
4. **Set language correctly** - Default is en, but specify cn or jp if needed
5. **Handle errors gracefully** - Provide actionable feedback for failures
6. **Update publish log** - Track all publications for audit trail
7. **Verify deployment** - Check that content appears on the site after publishing

## Related Skills

- **wt:technical-content-creation** - Full 7-stage workflow (Stage 6 delegates here)
- **wt:image-cover** - Cover image generation for featured images
- **wt:image-illustrator** - Inline illustration generation

## Common Issues

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
