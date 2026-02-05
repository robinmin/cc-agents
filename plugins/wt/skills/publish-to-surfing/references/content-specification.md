# Surfing Content Format Reference

Quick reference for Surfing platform content format and frontmatter requirements.

## Content Types

| Type | Description | Directory | Required Fields |
|------|-------------|-----------|----------------|
| **articles** | AI insights, research, technical content | `contents/articles/{lang}/` | title |
| **showcase** | Project portfolios with demos | `contents/showcase/{lang}/` | title, description, publishDate, image |
| **documents** | HTML content for rich-formatted pieces | `contents/documents/{lang}/` | title |
| **cheatsheets** | AI-generated reference materials | `contents/cheatsheets/{lang}/` | title |

**Languages:** en, cn, jp

## Frontmatter Examples

### Articles

```yaml
---
title: "Article Title"
description: "Article description for SEO"
publishDate: 2026-01-28
tags: [AI, research, insights]
category: "technology"
featured: false
author: "Author Name"
image: "/images/cover.jpg"
---
```

### Showcase Projects

```yaml
---
title: "Project Name"
description: "Brief project description"
publishDate: 2026-01-28
projectUrl: "https://demo.example.com"
githubUrl: "https://github.com/user/repo"
image: "/images/screenshot.jpg"
technologies: [React, TypeScript, Node.js]
featured: true
---
```

### Documents

```yaml
---
title: "Document Title"
description: "Document description"
publishDate: 2026-01-28
tags: [documentation, guide]
contentType: "page"  # page, legacy, template, snippet
customCSS: |
  .custom-class { color: blue; }
customJS: |
  console.log('Document loaded');
---
```

### Cheatsheets

```yaml
---
title: "JavaScript Quick Reference"
description: "Essential JavaScript syntax"
publishDate: 2026-01-28
tags: [javascript, reference]
topic: "JavaScript"
difficulty: "intermediate"  # beginner, intermediate, advanced
format: "markdown"  # html, markdown
pdfUrl: "/downloads/cheatsheet.pdf"
generatedBy: "AI Assistant"
version: "v1.0"
---
```

## Content Organization

```
contents/
├── articles/
│   ├── en/
│   ├── cn/
│   └── jp/
├── showcase/
│   ├── en/
│   ├── cn/
│   └── jp/
├── documents/
│   ├── en/
│   ├── cn/
│   └── jp/
└── cheatsheets/
    ├── en/
    ├── cn/
    └── jp/
```

## Image Paths

- Use absolute paths from `public/images/` or `assets/images/`
- Example: `/images/cover-image.jpg`
- Supported formats: jpg, png, webp, svg

## Common Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | Yes | Content title |
| description | string | Depends | SEO description (showcase: yes) |
| publishDate | date | Depends | Publication date (showcase: yes) |
| tags | array | No | Content tags |
| category | string | No | Content category |
| featured | boolean | No | Feature on homepage (default: false) |
| draft | boolean | No | Hide from public (default: false) |
| author | string | No | Author name |
| image | string | No | Path to cover/featured image |
