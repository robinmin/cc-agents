---
name: publish-to-zenn
description: This skill should be used when the user asks to "publish to zenn", "create a zenn article", "post article to zenn.dev", "zenn.dev投稿", or mentions Zenn publishing. Supports markdown with frontmatter via Zenn CLI (GitHub integration) or browser automation.
version: 1.0.0
---

# Post to Zenn (zenn.dev)

Post markdown articles to Zenn platform using Zenn CLI with GitHub integration (primary) or browser automation (fallback).

## Quick Start

```bash
# Using Zenn CLI (recommended - requires GitHub setup)
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-zenn/scripts/zenn-article.ts --markdown article.md

# Using browser automation (fallback - no GitHub required)
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-zenn/scripts/zenn-browser.ts --markdown article.md
```

## Publishing Methods

### Method 1: Zenn CLI (Recommended)

**Pros:**
- Official Zenn workflow
- Reliable auto-deployment from GitHub
- Version control with git
- Markdown preview locally

**Requirements:**
- Node.js 14+
- GitHub account
- Zenn account (connected to GitHub)

**Workflow:**
1. Connect GitHub repository to Zenn
2. Create article with zenn-cli
3. Commit and push to GitHub
4. Zenn auto-deploys your article

### Method 2: Browser Automation (Fallback)

**Pros:**
- No GitHub required
- Direct posting to Zenn
- Similar to other publishing skills

**Requirements:**
- Chrome/Chromium browser
- Zenn login credentials
- Manual login first run

## Script Directory

All scripts are located in the `scripts/` subdirectory of this skill.

Scripts are invoked using `${CLAUDE_PLUGIN_ROOT}/skills/publish-to-zenn/scripts/<script-name>.ts`

**Script Reference**:
| Script | Purpose | Method |
|--------|---------|--------|
| `scripts/zenn-article.ts` | Post articles via Zenn CLI + Git | CLI |
| `scripts/zenn-browser.ts` | Post articles via browser automation | Browser |

## Prerequisites

### For Zenn CLI Method:
- Node.js 14+
- npm or bun package manager
- GitHub account
- Zenn account (connect to GitHub at https://zenn.dev/login)

### For Browser Automation Method:
- Google Chrome or Chromium browser
- `bun` runtime
- Zenn account (first run: manual login)

## Configuration

Optional: Create or update `~/.claude/wt/config.jsonc` for Zenn settings:

```jsonc
{
  "publish-to-zenn": {
    "method": "cli", // or "browser"
    "github_repo": "your-username/zenn-articles",
    "auto_publish": false,
    "profile_dir": "~/.local/share/zenn-browser-profile"
  }
}
```

## Zenn CLI Setup

### Initial Setup (One-time)

1. **Create Zenn repository on GitHub**:
   ```bash
   # Create new repository on GitHub
   # Name it something like "zenn-articles"
   # Initialize as empty repository
   ```

2. **Connect repository to Zenn**:
   - Go to: https://zenn.dev/login
   - Click: "GitHubリポジトリを連携する" (Connect GitHub repository)
   - Select your repository
   - Authorize Zenn access

3. **Install Zenn CLI**:
   ```bash
   cd /path/to/your/repository
   npm init --yes
   npm install zenn-cli
   npx zenn init
   ```

### Directory Structure

```
your-zenn-repository/
├── articles/           # Markdown articles
│   └── your-article.md
├── books/              # Books (optional)
└── package.json
```

## Parameters

| Parameter | Description | CLI Only |
|-----------|-------------|----------|
| `--markdown <path>` | Markdown file (recommended, supports frontmatter) | - |
| `--title <text>` | Article title (auto-extracted from markdown) | - |
| `--content <text>` | Article content (use with --title) | - |
| `--slug <text>` | Article slug (URL identifier) | ✅ |
| `--type <type>` | Article type: tech, idea | ✅ |
| `--emoji <emoji>` | Article emoji (default: 📝) | ✅ |
| `--topics <tags>` | Comma-separated topics | ✅ |
| `--published` | Publish immediately (default: draft) | ✅ |
| `--repo <path>` | GitHub repository path | - |
| `--method <method>` | Force method: cli or browser | - |
| `--profile <dir>` | Chrome profile directory (browser only) | - |

## Markdown Frontmatter

```yaml
---
title: "記事のタイトル"
emoji: "📝"
type: "tech" # or "idea"
topics: ["zenn", "javascript", "vue"]
published: false # Change to true to publish
slug: "your-article-slug" # Optional: auto-generated from title
---

# Article Content

Your article content in markdown format...
```

## Article Types

| Type | Description | Use Case |
|------|-------------|----------|
| `tech` | Technical articles with code examples | Programming tutorials, technical guides |
| `idea` | Idea/opinion articles | Opinions, thoughts, essays |

## Topics (Tags)

Common Zenn topics include:
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

## Publishing Workflow

### CLI Method (Recommended)

1. Create article:
   ```bash
   npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-zenn/scripts/zenn-article.ts \
     --markdown article.md \
     --slug my-article \
     --type tech \
     --topics "javascript,vue"
   ```

2. Edit article in `articles/my-article.md`

3. Set `published: true` in frontmatter

4. Commit and push:
   ```bash
   git add .
   git commit -m "Add new article"
   git push
   ```

5. Zenn auto-deploys from GitHub

### Browser Automation Method

```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-zenn/scripts/zenn-browser.ts \
  --markdown article.md \
  --publish
```

## Output

After successful operation:

```
[zenn] Parsing markdown: article.md
[zenn] Title: Your Article Title
[zenn] Type: tech
[zenn] Topics: javascript, vue
[zenn] Slug: my-article
[zenn] Method: cli
[zenn] Repository: /path/to/zenn-repo
[zenn] Article created: articles/my-article.md
[zenn] Next steps:
  1. Edit articles/my-article.md
  2. Set published: true in frontmatter
  3. git add . && git commit -m "Add article"
  4. git push to deploy
```

## Notes

- **GitHub Integration**: Zenn CLI uses GitHub repository for article management and auto-deployment
- **Version Control**: All article changes tracked via git
- **Auto-Deployment**: Zenn automatically deploys when you push to GitHub
- **Local Preview**: Use `npx zenn preview` for local preview before publishing
- **Slug Constraints**: Must be lowercase letters, numbers, hyphens, underscores (min 12 chars)
- **Published Status**: Articles with `published: false` remain as drafts
- **Image Support**: Local images in `images/slug/` directory or Zenn Editor upload
- **Language**: Zenn supports Japanese and English content
- **Cross-Platform**: macOS, Linux, Windows (uses bun/npm runtime)

## Additional References

### CLI Documentation
- **`references/zenn-cli-guide.md`** - Complete Zenn CLI usage guide
- **`references/github-integration.md`** - GitHub setup and Zenn connection

### Browser Automation
- **`references/zenn-browser.md`** - Browser automation implementation details
- **`references/troubleshooting.md`** - Common issues and solutions

### Sources
- [Zenn CLI Installation Guide](https://zenn.dev/zenn/articles/install-zenn-cli)
- [zenn-dev/zenn-editor (GitHub)](https://github.com/zenn-dev/zenn-editor)
- [ZennとGitHubを連携して記事を投稿してみた](https://zenn.dev/kuuki/articles/20240609_github_to_zenn_first)
- [Zenn cliの導入と、過去記事をGitHub連携した話](https://zenn.dev/htsulfuric/articles/zenn-cli-start)
- [VS Codeによる Zenn 記事の執筆環境構築方法](https://zenn.dev/fluxrozin/articles/vscode-zenn-writing-setup)
