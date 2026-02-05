# Zenn CLI Guide

Complete guide for using Zenn CLI (Command Line Interface) for article publishing.

## Installation

### Prerequisites

- Node.js 14+ installed
- npm or bun package manager
- GitHub account
- Zenn account (connected to GitHub)

### Install Zenn CLI

```bash
# Navigate to your project directory
cd /path/to/your/zenn-repository

# Initialize npm project (if not already initialized)
npm init --yes

# Install Zenn CLI
npm install zenn-cli

# Initialize Zenn in your project
npx zenn init
```

This creates the following structure:
```
your-repository/
├── articles/           # Markdown articles
├── books/              # Books (optional)
└── package.json
```

## GitHub Integration

### Step 1: Create GitHub Repository

1. Create a new repository on GitHub
2. Name it something like `zenn-articles`
3. Initialize as empty repository (no README, license, etc.)

### Step 2: Connect Repository to Zenn

1. Go to: https://zenn.dev/login
2. Click: "GitHubリポジトリを連携する" (Connect GitHub repository)
3. Select your newly created repository
4. Authorize Zenn to access your repository

### Step 3: Clone and Initialize

```bash
# Clone your repository
git clone https://github.com/your-username/zenn-articles.git
cd zenn-articles

# Initialize Zenn CLI
npx zenn init
```

## Article Workflow

### Create New Article

```bash
# Create article with all options
npx zenn new:article --slug your-article-slug --title "Your Article Title" --type tech --emoji 📝

# Or with minimal options (slug auto-generated)
npx zenn new:article --title "Your Article Title"
```

### Article Files

Articles are created in `articles/` directory with the format:
```
articles/{slug}.md
```

### Article Frontmatter

```yaml
---
title: "記事のタイトル"
emoji: "📝"
type: "tech" # or "idea"
topics: ["zenn", "javascript", "vue"]
published: false # Change to true to publish
slug: "your-article-slug" # Optional: auto-generated from title
---
```

### Frontmatter Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Article title |
| `emoji` | string | Yes | Cover emoji (default: 📝) |
| `type` | string | Yes | Article type: `tech` or `idea` |
| `topics` | array | No | Array of topic tags |
| `published` | boolean | No | Publish status (default: false) |
| `slug` | string | No | URL identifier (auto-generated if omitted) |

## Publishing Workflow

### Local Preview

```bash
# Start local preview server
npx zenn preview

# Open http://localhost:8000 in your browser
```

### Publish to GitHub

```bash
# Stage changes
git add .

# Commit changes
git commit -m "Add new article: Your Article Title"

# Push to GitHub
git push
```

Zenn automatically detects changes and deploys your article within a few minutes.

### Publish Status

- `published: false` - Saved as draft (visible only to you)
- `published: true` - Published publicly on Zenn

## Common Commands

```bash
# Create new article
npx zenn new:article

# Create new book chapter
npx zenn new:book

# Preview locally
npx zenn preview

# List all articles
ls articles/

# Check publish status
grep "published:" articles/*.md
```

## Slug Guidelines

Zenn slugs must:
- Be at least 12 characters long
- Contain only lowercase letters, numbers, hyphens, underscores
- Be unique within your repository

Auto-generated slugs include:
- URL-friendly version of title
- Timestamp suffix if needed for minimum length

Example:
```
Title: "Introduction to React"
Auto-generated slug: "introduction-to-react-{timestamp}"
```

## Topics (Tags)

Common Zenn topics:
- `zenn` - Zenn platform
- `javascript` - JavaScript
- `typescript` - TypeScript
- `react` - React
- `vue` - Vue.js
- `nextjs` - Next.js
- `python` - Python
- `go` - Go language
- `aws` - Amazon Web Services
- `docker` - Docker
- `git` - Git

Topics help categorize your content and make it discoverable.

## Article Types

| Type | Description | Use Case |
|------|-------------|----------|
| `tech` | Technical articles with code examples | Programming tutorials, technical guides |
| `idea` | Idea/opinion articles | Opinions, thoughts, essays |

## Troubleshooting

### Article Not Appearing After Push

1. Check if `published: true` is set in frontmatter
2. Wait 2-3 minutes for Zenn to process
3. Check Zenn settings → GitHub for connection status

### Slug Too Short Error

If you see an error about slug being too short:
- Add more words to your title, or
- Manually specify a longer slug

### Preview Not Working

```bash
# Stop preview with Ctrl+C
# Clear cache
rm -rf .next
# Restart preview
npx zenn preview
```

## Advanced Usage

### Custom Domain

You can use a custom domain for your Zenn articles:
1. Go to Zenn Settings
2. Configure custom domain
3. Update DNS records

### Multiple Authors

Zenn supports co-authors:
- Add co-authors in Zenn Editor
- Both authors appear on the article

## See Also

- [Zenn CLI GitHub Repository](https://github.com/zenn-dev/zenn-editor)
- [Zenn Official Documentation](https://zenn.dev/zenn)
- [GitHub Integration Guide](github-integration.md)
