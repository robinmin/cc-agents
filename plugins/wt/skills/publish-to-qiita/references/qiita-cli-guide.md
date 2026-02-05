# Qiita CLI Guide

Complete guide for using Qiita CLI (Command Line Interface) for article publishing.

## Installation

### Prerequisites

- Node.js 20.0.0 or higher (required by Qiita CLI)
- npm or bun package manager
- Qiita account
- Qiita access token

### Install Qiita CLI

```bash
# Navigate to your project directory
cd /path/to/your/project

# Install Qiita CLI
npm install @qiita/qiita-cli --save-dev

# Or use npx without installation
npx qiita <command>
```

### Generate Access Token

1. Go to: https://qiita.com/settings/tokens/new
2. Check the boxes for:
   - `read_qiita` (読み取り) - Read access
   - `write_qiita` (書き込み) - Write access
3. Click "発行する" (Generate)
4. Copy the generated token

### Initialize Qiita CLI

```bash
# Initialize Qiita CLI
npx qiita init
```

This creates:
```
your-project/
├── public/
│   └── articles/
├── qiita.config.json
├── .gitignore
└── .github/
    └── workflows/
        └── publish.yml
```

### Login

```bash
# Login with your access token
npx qiita login

# Enter your token when prompted
```

Token is stored in: `$XDG_CONFIG_HOME/qiita-cli` or `$HOME/.config/qiita-cli`

## Article Workflow

### Create New Article

```bash
# Create new article
npx qiita new my-first-article

# Article created at: public/my-first-article.md
```

### Article Files

Articles are created in `public/` directory with the format:
```
public/{article-name}.md
```

### Article Frontmatter (YAML)

Qiita CLI uses YAML frontmatter for article metadata:

```yaml
---
title: "記事のタイトル"
tags:
  - "JavaScript"
  - "React"
private: false
updated_at: ""
id: null
organization_url_name: null
slide: false
ignorePublish: false
---
```

### Frontmatter Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Article title |
| `tags` | array | Yes | Tag names in block style format |
| `private` | boolean | No | `false`: public, `true`: limited-sharing |
| `slide` | boolean | No | Enable slide mode (presentation view) |
| `organization_url_name` | string | No | Organization association |
| `updated_at` | string | Auto | Auto-managed timestamp |
| `id` | string | Auto | Auto-filled UUID after publishing |
| `ignorePublish` | boolean | No | Skip during bulk publish |

### Tag Format

Tags use YAML block style array:

```yaml
tags:
  - "JavaScript"
  - "React"
  - "Node.js"
```

## Publishing Workflow

### Local Preview

```bash
# Start preview server
npx qiita preview

# Open http://localhost:8888 in your browser
```

The preview server shows how your article will appear on Qiita with proper styling.

### Publish Article

```bash
# Publish article
npx qiita publish my-article

# Force publish (overwrite remote)
npx qiita publish my-article --force
```

### Publish Status

After publishing:
- Article appears on your Qiita profile
- URL format: `https://qiita.com/{username}/items/{uuid}`
- `id` field is auto-filled with the article UUID

## Common Commands

```bash
# Create new article
npx qiita new <article-name>

# Preview locally
npx qiita preview

# Publish article
npx qiita publish <article-name>

# Force publish (overwrite)
npx qiita publish <article-name> --force

# Pull/sync from Qiita (update local files)
npx qiita pull

# Force pull (overwrite local)
npx qiita pull --force

# Show version
npx qiita version

# Login
npx qiita login
```

## Article Visibility

### Public Articles

```yaml
---
private: false
---
```

- Visible to everyone
- Appears in search results
- Can be stocked by other users

### Limited-Sharing (Private) Articles

```yaml
---
private: true
---
```

- Only accessible via direct URL
- Does not appear in search results
- Cannot be stocked by other users
- Share URL with specific users

## Slide Mode

Enable slide mode for presentation-style articles:

```yaml
---
slide: true
---
```

Slide mode changes the article display to be more suitable for presentations.

## Organization Articles

Associate article with an organization:

```yaml
---
organization_url_name: "your-org-name"
---
```

The organization must exist and you must be a member.

## Tags (Topics)

Common Qiita tags:
- `JavaScript` - JavaScript
- `Python` - Python
- `TypeScript` - TypeScript
- `React` - React
- `Vue.js` - Vue.js
- `Node.js` - Node.js
- `Ruby` - Ruby
- `PHP` - PHP
- `Go` - Go language
- `AWS` - Amazon Web Services
- `Docker` - Docker
- `Git` - Git
- `Linux` - Linux
- `macOS` - macOS

Tags help categorize your content and make it discoverable.

## GitHub Actions Integration

Qiita CLI generates a GitHub Actions workflow for automatic publishing:

### Setup

1. Push your Qiita CLI initialized directory to GitHub
2. Add `QIITA_TOKEN` secret in repository settings
3. Push to main/master branch
4. Articles are automatically published

### Workflow File

Generated at `.github/workflows/publish.yml`:

```yaml
name: publish qiita items
on:
  push:
    branches:
      - main
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm install
      - name: Publish Qiita items
        env:
          QIITA_TOKEN: ${{ secrets.QIITA_TOKEN }}
        run: npx qiita publish
```

## Troubleshooting

### Node.js Version Error

**Error**: `Node.js version 20 or higher is required`

**Solution**:
```bash
# Check Node.js version
node --version

# Install Node.js 20+ using nvm
nvm install 20
nvm use 20
```

### Login Error

**Error**: `Failed to login`

**Solutions**:
1. Verify token has correct scopes (`read_qiita`, `write_qiita`)
2. Regenerate token at https://qiita.com/settings/tokens/new
3. Check network connection

### Publish Error

**Error**: `Failed to publish`

**Common causes**:
- Missing required fields (title, tags)
- Invalid tag format
- Network connection issues

**Solution**:
```bash
# Check article frontmatter
head -20 public/my-article.md

# Verify tags are in block style format
# Correct: tags:\n  - "JavaScript"
# Wrong: tags: ["JavaScript", "React"]
```

### Preview Not Working

**Error**: Preview server not starting

**Solution**:
```bash
# Check port 8888 availability
lsof -i :8888

# Kill process using port
kill -9 <PID>

# Restart preview
npx qiita preview
```

### Article Not Appearing

**Symptoms**: Article published but not visible on profile

**Solutions**:
1. Check `private` status - limited-sharing articles won't appear publicly
2. Wait a few minutes for propagation
3. Check your Qiita profile directly
4. Verify you're logged in to the correct account

## Advanced Usage

### Bulk Publish

```bash
# Publish all articles in public/
for article in public/*.md; do
  name=$(basename "$article" .md)
  npx qiita publish "$name"
done
```

### Skip Articles

Use `ignorePublish: true` to exclude articles from bulk publish:

```yaml
---
title: "Draft Article"
ignorePublish: true
---
```

### Update Existing Articles

1. Make local changes
2. Run `npx qiita publish <article-name> --force`
3. Remote article is updated

## Best Practices

1. **Always preview before publishing**
   ```bash
   npx qiita preview
   ```

2. **Use descriptive article names**
   - Good: `react-hooks-introduction`
   - Bad: `article1`

3. **Use relevant tags**
   - 3-5 tags is optimal
   - Use existing popular tags when possible

4. **Set appropriate visibility**
   - `private: false` for most content
   - `private: true` for sensitive or internal content

5. **Use version control**
   ```bash
   git init
   git add .
   git commit -m "Add first article"
   ```

## See Also

- [Qiita API v2 Documentation](api-v2-guide.md)
- [Token Setup Guide](token-setup.md)
- [GitHub Repository: increments/qiita-cli](https://github.com/increments/qiita-cli)
- [Qiita Official Documentation](https://qiita.com)
