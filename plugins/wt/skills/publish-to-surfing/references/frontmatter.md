# Surfing Frontmatter Format

Surfing platform requires YAML frontmatter for article metadata and categorization.

## Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `title` | string | Article title (max 100 chars) | `Introduction to GraphQL` |
| `published` | boolean | Whether to publish immediately | `true` |

## Recommended Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `tags` | array | Topic tags for categorization (3-5 tags) | `["api", "graphql", "tutorial"]` |
| `date` | string | Publication date (ISO 8601) | `2026-01-28` |
| `description` | string | Short summary for SEO (max 200 chars) | `Learn GraphQL basics` |
| `featured_image` | string | URL to cover image after upload | `https://cdn.surfing.pub/img/xyz.png` |

## Optional Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `canonical_url` | string | Original article URL if cross-posting | `https://blog.example.com/post` |
| `author` | object | Author information | See below |
| `category` | string | Primary category | `Tutorial` |
| `read_time_minutes` | integer | Estimated reading time | `8` |
| `draft` | boolean | Mark as draft (false to publish) | `false` |

### Author Object

```yaml
author:
  name: "Jane Doe"
  url: "https://janedoe.com"
  twitter: "@janedoe"
```

## Complete Example

```yaml
---
title: "Building RESTful APIs with Python and FastAPI"
description: "Learn how to build production-ready RESTful APIs using FastAPI, including authentication, testing, and deployment best practices."
tags: ["python", "fastapi", "api", "tutorial", "backend"]
published: true
date: 2026-01-28
category: "Tutorial"
read_time_minutes: 12
canonical_url: "https://blog.example.com/fastapi-rest-api"
author:
  name: "Jane Developer"
  url: "https://jane.dev"
  twitter: "@janedev"
featured_image: "https://cdn.surfing.pub/images/cover-xyz123.png"
---

# Article content starts here...
```

## Frontmatter Extraction

When publishing, extract frontmatter from article source:

```bash
# Extract frontmatter using sed or awk
sed -n '/^---$/,/^---$/p' article.md > frontmatter.yaml

# Parse YAML with python or yq
yq '.title' frontmatter.yaml
```

## Validation Rules

### Title

- Max length: 100 characters
- Must not be empty
- Should be descriptive and SEO-friendly
- Avoid special characters that break URLs

### Tags

- Min: 1 tag, Max: 5 tags
- Each tag: max 30 characters
- Lowercase, alphanumeric, hyphens only
- Example format: `["web-development", "javascript", "tutorial"]`

### Description

- Max length: 200 characters
- Should summarize article content
- Include relevant keywords for SEO

### Date

- ISO 8601 format: `YYYY-MM-DD`
- Optional: include time: `YYYY-MM-DDTHH:MM:SSZ`
- Defaults to current date if omitted

### Featured Image

- Must be absolute URL after upload
- Recommended dimensions: 2400x1020 (2.35:1)
- Supported formats: PNG, JPEG, WebP
- File size: < 500KB recommended

## Platform-Specific Differences

### Surfing vs Dev.to

| Field | Surfing | Dev.to |
|-------|---------|--------|
| `published` | boolean (default: false) | boolean (default: true) |
| `cover_image` | Not used | Uses `featured_image` instead |
| `series` | Not supported | Supported (article series) |

### Surfing vs Medium

| Field | Surfing | Medium |
|-------|---------|--------|
| `tags` | Array of strings | Comma-separated string |
| `canonical_url` | Supported | Not supported |
| `author` | Object format | Uses platform author only |

## Converting from Technical Content Workflow

When adapting from Stage 5 (5-adaptation/) to Surfing:

```bash
# Stage 5 article-frontmatter might have:
---
title: "Article Title"
tags: [tag1, tag2, tag3]
published: true
---

# Surfing requires same format, but ensure:
# 1. Title is < 100 chars
# 2. Tags are lowercase with hyphens
# 3. Add description field for SEO
# 4. Set date to ISO 8601 format
```

## Testing Frontmatter

Validate frontmatter before publishing:

```bash
# Using yq to validate YAML syntax
yq eval '.' article.md > /dev/null

# Check required fields exist
yq '.title' article.md
yq '.published' article.md

# Verify tag format
yq '.tags[] | select(. | test("^[a-z0-9-]+$"))' article.md
```

## Common Mistakes

### Mistake 1: Missing published field

```yaml
# Bad - article will remain as draft
---
title: "My Article"
tags: ["python"]
---

# Good
---
title: "My Article"
tags: ["python"]
published: true
---
```

### Mistake 2: Invalid date format

```yaml
# Bad - not ISO 8601
date: "January 28, 2026"
date: "2026/01/28"

# Good
date: "2026-01-28"
date: "2026-01-28T10:00:00Z"
```

### Mistake 3: Tags with uppercase or spaces

```yaml
# Bad - won't validate
tags: ["Python", "Web Development", "API"]

# Good
tags: ["python", "web-development", "api"]
```

### Mistake 4: Featured image as relative path

```yaml
# Bad - won't work after upload
featured_image: "../4-illustration/cover.png"

# Good - absolute URL after asset upload
featured_image: "https://cdn.surfing.pub/images/xyz123.png"
```

## Integration with Stage 5 Adaptations

When publishing from `6-publish/article.md` (adapted from `5-adaptation/`):

1. **Extract frontmatter** from source article
2. **Add Surfing-specific fields**:
   - Ensure `published: true` for live publication
   - Add `date` if not present (use current date)
   - Add `description` for SEO (first paragraph or generated summary)
3. **Validate tag format** (lowercase, hyphens, no spaces)
4. **Prepare featured_image URL** (upload cover image first, get URL)
5. **Include canonical_url** if cross-posting from another platform

## Migration from Other Platforms

### From Dev.to

```yaml
# Dev.to frontmatter
---
title: "Article Title"
tags: ["dev", "javascript"]
cover_image: "https://res.cloudinary.com/..."
published: true
---

# Convert to Surfing
---
title: "Article Title"
tags: ["dev", "javascript"]
featured_image: "https://cdn.surfing.pub/..."  # Upload image first
published: true
date: 2026-01-28
---
```

### From Hugo/Jekyll

```yaml
# Hugo/Jekyll frontmatter
---
title: "Article Title"
date: 2026-01-28
tags: ["dev", "javascript"]
draft: false
---

# Convert to Surfing
---
title: "Article Title"
date: 2026-01-28
tags: ["dev", "javascript"]
published: true  # Convert draft: false to published: true
---
```
