---
name: publish-to-qiita
description: This skill should be used when the user asks to "publish to qiita", "create a qiita article", "post article to qiita.com", "qiita投稿", or mentions Qiita publishing. Supports markdown articles with YAML frontmatter via Qiita CLI (official) or Qiita API v2.
version: 1.0.0
---

# Post to Qiita (qiita.com)

Post markdown articles to Qiita platform using Qiita CLI (primary) or Qiita API v2 (fallback).

## Quick Start

```bash
# Using Qiita CLI (recommended - official method)
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-qiita/scripts/qiita-article.ts --markdown article.md

# Using Qiita API (fallback - requires access token)
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-qiita/scripts/qiita-api.ts --markdown article.md
```

## Publishing Methods

### Method 1: Qiita CLI (Recommended)

**Pros:**
- Official Qiita CLI tool
- Local preview with Qiita-styled rendering
- Version control friendly
- GitHub Actions integration
- Automatic sync between local and remote

**Requirements:**
- Node.js 20+ (Qiita CLI requires Node.js 20)
- npm or bun package manager
- Qiita account with access token

**Workflow:**
1. Generate access token at https://qiita.com/settings/tokens/new
2. Initialize Qiita CLI: `npx qiita init`
3. Login: `npx qiita login`
4. Create article: `npx qiita new <article-name>`
5. Edit article in `public/<article-name>.md`
6. Preview locally: `npx qiita preview`
7. Publish: `npx qiita publish <article-name>`

### Method 2: Qiita API v2 (Fallback)

**Pros:**
- Language-agnostic (any HTTP client)
- More control over publishing flow
- No local file management required
- Direct API integration

**Requirements:**
- Qiita access token
- HTTP client (fetch, curl, etc.)

**Workflow:**
1. Set `QIITA_TOKEN` environment variable
2. Prepare markdown with YAML frontmatter
3. POST to `https://qiita.com/api/v2/items`
4. Receive published article URL

## Script Directory

All scripts are located in the `scripts/` subdirectory of this skill.

Scripts are invoked using `${CLAUDE_PLUGIN_ROOT}/skills/publish-to-qiita/scripts/<script-name>.ts`

**Script Reference**:
| Script | Purpose | Method |
|--------|---------|--------|
| `scripts/qiita-article.ts` | Post articles via Qiita CLI | CLI |
| `scripts/qiita-api.ts` | Post articles via Qiita API v2 | API |

## Prerequisites

### For Qiita CLI Method:
- Node.js 20+ (required by Qiita CLI)
- npm or bun package manager
- Qiita account with access token

### For Qiita API Method:
- Qiita access token
- HTTP client capability

## Configuration

### Access Token Setup (Recommended)

Add `QIITA_TOKEN` to the `env` property in `~/.claude/wt/config.jsonc`:

```jsonc
{
  "env": {
    "QIITA_TOKEN": "your_qiita_access_token_here"
  },
  "publish-to-qiita": {
    "method": "cli", // or "api"
    "default_private": false,
    "default_slide": false
  }
}
```

The script automatically loads environment variables from the `env` property.

### Alternative: Direct Configuration

For backward compatibility, you can also use the deprecated `access_token` field:

```jsonc
{
  "publish-to-qiita": {
    "method": "cli",
    "access_token": "", // Deprecated: Use env.QIITA_TOKEN instead
    "default_private": false,
    "default_slide": false
  }
}
```

**Security Note**: Ensure config.jsonc has restricted permissions (chmod 600) and is excluded from version control. The `env` property is the recommended approach as it follows the WT plugin pattern for environment variable injection.

## Qiita CLI Setup

### Generate Access Token

1. Go to: https://qiita.com/settings/tokens/new
2. Check boxes for:
   - `read_qiita` (読み取り)
   - `write_qiita` (書き込み)
3. Click "発行する" (Generate/Issue)
4. Copy the token

### Initialize Qiita CLI

```bash
# Navigate to your project directory
cd /path/to/your/project

# Install Qiita CLI
npm install @qiita/qiita-cli --save-dev

# Initialize Qiita CLI
npx qiita init

# Login with your token
npx qiita login
```

This creates:
```
your-project/
├── public/
│   └── articles/
├── qiita.config.json
└── .github/
    └── workflows/
        └── publish.yml
```

## Parameters

| Parameter | Description | CLI | API |
|-----------|-------------|-----|-----|
| `--markdown <path>` | Markdown file (supports YAML frontmatter) | ✅ | ✅ |
| `--title <text>` | Article title | ✅ | ✅ |
| `--content <text>` | Article content | ✅ | ✅ |
| `--tags <tags>` | Comma-separated tags | ✅ | ✅ |
| `--private` | Limited-sharing article | ✅ | ✅ |
| `--public` | Public article | ✅ | ✅ |
| `--slide` | Enable slide mode | ✅ | ✅ |
| `--organization <org>` | Organization URL name | ✅ | ✅ |
| `--token <token>` | Qiita access token | - | ✅ |
| `--method <method>` | Force method: cli or api | - | - |

## Markdown Frontmatter

Qiita CLI uses YAML frontmatter for article metadata:

```yaml
---
title: "記事のタイトル"
tags:
  - "JavaScript"
  - "React"
private: false  # true: 限定共有, false: 公開
updated_at: ""
id: null
organization_url_name: null  # 組織
slide: false  # スライドモード
ignorePublish: false
---

# Article content

Article content in markdown format...
```

### Frontmatter Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Article title |
| `tags` | array | Yes | Tag names in block style format |
| `private` | boolean | No | `true`: limited-sharing, `false`: public |
| `slide` | boolean | No | Enable slide mode |
| `organization_url_name` | string | No | Organization association |
| `updated_at` | string | Auto | Auto-managed timestamp |
| `id` | string | Auto | Auto-filled UUID after publishing |
| `ignorePublish` | boolean | No | Skip during bulk publish |

## Publishing Workflow

### CLI Method (Recommended)

```bash
# 1. Initialize Qiita CLI
npx qiita init
npx qiita login

# 2. Create article
npx qiita new my-article

# 3. Edit article
vim public/my-article.md

# 4. Preview locally
npx qiita preview

# 5. Publish
npx qiita publish my-article

# 6. Update existing article (after making local changes)
npx qiita publish my-article --force

# 7. Sync remote changes to local
npx qiita pull
```

### API Method

```bash
# Set access token
export QIITA_TOKEN="your_access_token_here"

# Publish via API
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-qiita/scripts/qiita-api.ts \
  --markdown article.md --tags "javascript,react"
```

## Output

### CLI Method Success

```
[qiita] Initializing Qiita CLI...
[qiita] Logging in to Qiita...
[qiita] Creating article: my-article
[qiita] Article created: public/my-article.md
[qiita] Preview available at: http://localhost:8888
[qiita] Publishing article...
[qiita] Article published successfully!
[qiita] URL: https://qiita.com/username/items/abc123def456
```

### API Method Success

```
[qiita] Publishing via API v2...
[qiita] Title: Your Article Title
[qiita] Tags: javascript, react
[qiita] Private: false
[qiita] Article published successfully!
[qiita] URL: https://qiita.com/username/items/abc123def456
```

## Notes

- **Node.js 20+ Required**: Qiita CLI requires Node.js 20.0.0 or higher
- **Access Token**: Generate at https://qiita.com/settings/tokens/new with `read_qiita` and `write_qiita` scopes
- **Article Visibility**: `private: false` (public) or `private: true` (limited-sharing)
- **Tag Format**: Use block style YAML array: `tags: ["JavaScript", "React"]`
- **Slide Mode**: Enable for presentation-style articles
- **GitHub Actions**: Qiita CLI generates CI/CD workflow for automatic publishing
- **API Rate Limits**: 1000 requests/hour (authenticated), 60 requests/hour (unauthenticated)

## Additional References

### CLI Documentation
- **`references/qiita-cli-guide.md`** - Complete Qiita CLI usage guide
- **`references/api-v2-guide.md`** - API v2 documentation and examples

### API Documentation
- **`references/token-setup.md`** - Access token generation guide
- **`references/troubleshooting.md`** - Common issues and solutions

### Sources
- [Qiita CLI GitHub Repository](https://github.com/increments/qiita-cli)
- [Qiita API v2 Documentation](https://qiita.com/api/v2/docs)
- [npm package: @qiita/qiita-cli](https://www.npmjs.com/package/@qiita/qiita-cli)
