# Usage Examples: Substack Publishing

## Basic Examples

### Post markdown as draft

```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-substack/scripts/substack-article.ts --markdown article.md
```

### Publish immediately

```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-substack/scripts/substack-article.ts --markdown article.md --publish
```

### Post with custom tags

```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-substack/scripts/substack-article.ts --markdown article.md --tags "javascript,typescript,api"
```

### Post with subtitle

```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-substack/scripts/substack-article.ts --markdown article.md --subtitle "A deep dive into modern web development"
```

### Post with title and content directly

```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-substack/scripts/substack-article.ts --title "My Title" --content "# Hello World\n\nThis is my article." --draft
```

## Markdown Frontmatter Examples

### Complete frontmatter

```markdown
---
title: Advanced TypeScript Patterns
tags: [typescript, javascript, development]
subtitle: Practical techniques for type-safe applications
---

# Advanced TypeScript Patterns

Your article content here...
```

### Minimal frontmatter

```markdown
---
title: My Article Title
---

# Article Content

Your article content here...
```

### With tags array

```markdown
---
title: Web Development Trends 2024
tags: [web, javascript, frontend, react]
subtitle: What's new in web development
---

# Web Development Trends 2024

Your article content here...
```

## Workflow Examples

### From wt:technical-content-creation Stage 6

```bash
# After completing Stage 6 (Adaptation)
# Publish to Substack as draft for review
cd /path/to/collection/6-publish
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-substack/scripts/substack-article.ts --markdown final-article.md --draft
```

### Batch publishing

```bash
# Publish multiple articles
for file in articles/*.md; do
  npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-substack/scripts/substack-article.ts --markdown "$file" --draft
done
```

### With custom publication

```bash
# Specify publication URL for multi-publication accounts
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-substack/scripts/substack-article.ts \
  --markdown article.md \
  --publication https://substack.com/@yourpublication/note
```

## Output Examples

### Successful draft save

```
[substack] Parsing markdown: article.md
[substack] Title: Your Article Title
[substack] Tags: javascript, technology
[substack] Status: draft
[substack] Launching Chrome (profile: ~/.local/share/substack-browser-profile)
[substack] Navigating to new post page...
[substack] Filling in title...
[substack] Filling in content...
[substack] Setting tags...
[substack] Saving as draft...
[substack] Article saved successfully!
[substack] URL: https://yourpublication.substack.com/p/xxxxx
[substack] Status: draft
```

### Successful publish

```
[substack] Parsing markdown: article.md
[substack] Title: Your Article Title
[substack] Tags: javascript, technology
[substack] Status: publish
[substack] Launching Chrome (profile: ~/.local/share/substack-browser-profile)
[substack] Navigating to new post page...
[substack] Filling in title...
[substack] Filling in content...
[substack] Setting tags...
[substack] Publishing...
[substack] Article published successfully!
[substack] URL: https://yourpublication.substack.com/p/xxxxx
[substack] Status: published
```

## Integration Examples

### With wt:technical-content-creation

```bash
# Complete workflow: Stage 6 → Substack
# 1. Complete adaptation stage
cd /path/to/collection/6-publish

# 2. Publish to Substack as draft
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-substack/scripts/substack-article.ts \
  --markdown final-article.md \
  --draft

# 3. Review draft on Substack
# 4. If approved, publish via Substack UI or re-run with --publish
```

### With git workflow

```bash
# Tag published articles in git
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-substack/scripts/substack-article.ts --markdown article.md --publish
git tag -a "substack-$(date +%Y%m%d)" -m "Published to Substack"
git push origin "substack-$(date +%Y%m%d)"
```

## Tips

- **Always use --draft first** for review before publishing
- **Check tags in Substack UI** after posting to ensure proper categorization
- **Save article URLs** for cross-reference and analytics
- **Use descriptive titles** for better SEO and discoverability
