# GitHub Integration Guide

Complete guide for integrating GitHub with Zenn for automated article deployment.

## Overview

Zenn's GitHub integration allows you to:
- Write articles in Markdown using your preferred editor
- Version control your content with Git
- Automatically deploy articles when you push to GitHub
- Collaborate with others using pull requests

## Setup Process

### Step 1: Create GitHub Repository

```bash
# Create a new repository on GitHub
# Repository name: zenn-articles (or your preferred name)
# Initialize as empty (no README, .gitignore, or license)

# Clone the repository
git clone https://github.com/your-username/zenn-articles.git
cd zenn-articles
```

### Step 2: Connect Zenn to GitHub

1. **Login to Zenn**:
   - Go to https://zenn.dev/login
   - Login with your GitHub account

2. **Connect Repository**:
   - Go to: https://zenn.dev/settings/github
   - Click: "GitHubリポジトリを連携する" (Connect GitHub repository)
   - Select your `zenn-articles` repository
   - Click: "連携する" (Connect)

3. **Authorize Zenn**:
   - GitHub will ask for authorization
   - Grant Zenn access to your repository

### Step 3: Initialize Zenn CLI

```bash
# Install Zenn CLI
npm install zenn-cli

# Initialize Zenn in your repository
npx zenn init
```

This creates:
```
zenn-articles/
├── articles/           # Markdown articles
├── books/              # Books (optional)
├── .gitignore          # Git ignore file
└── package.json        # NPM package file
```

## Workflow

### Creating Articles

```bash
# Create new article
npx zenn new:article --slug my-first-article --title "My First Article" --type tech

# Edit the article
vim articles/my-first-article.md
```

### Publishing Process

```bash
# 1. Stage changes
git add .

# 2. Commit with descriptive message
git commit -m "Add article: My First Article"

# 3. Push to GitHub
git push

# 4. Zenn automatically deploys within 2-3 minutes
```

### Updating Articles

```bash
# 1. Edit article
vim articles/my-first-article.md

# 2. Commit and push
git add articles/my-first-article.md
git commit -m "Update article: Add conclusion section"
git push
```

## Publish Status Control

### Draft Articles

```yaml
---
title: "My Draft Article"
published: false  # Remains as draft
---
```

### Published Articles

```yaml
---
title: "My Published Article"
published: true   # Publicly visible
---
```

**Important**: Set `published: true` only when ready to publish. Changes with `published: true` are immediately visible on Zenn.

## Collaboration Workflow

### Using Pull Requests

```bash
# 1. Create feature branch
git checkout -b add-new-article

# 2. Create and edit article
npx zenn new:article --slug feature-article
vim articles/feature-article.md

# 3. Commit changes
git add .
git commit -m "Add article: Feature Article"

# 4. Push to feature branch
git push origin add-new-article

# 5. Create pull request on GitHub
# 6. Review and merge

# 7. After merge, Zenn deploys automatically
```

### Multiple Authors

Zenn displays the GitHub user who pushed the commit as the author. For collaboration:

1. **Add co-authors** in Zenn Editor after deployment
2. **Or use pull requests** to maintain author attribution

## Directory Structure

### Recommended Structure

```
zenn-articles/
├── articles/
│   ├── getting-started-with-react.md
│   ├── vue3-composition-api.md
│   └── python-async-programming.md
├── books/              # Optional: For book content
├── images/             # Optional: Local images
│   └── article-slug/
│       └── cover.png
├── .gitignore
├── package.json
└── README.md           # Optional repo description
```

### Git Ignore

The `.gitignore` created by Zenn CLI includes:
```
node_modules
.next
.DS_Store
*.log
```

## Automatic Deployment

### How It Works

1. **Push Detection**: Zenn watches your connected repository
2. **Article Parsing**: Zenn parses markdown files in `articles/`
3. **Frontmatter Processing**: Metadata extracted from YAML frontmatter
4. **Deployment**: Articles deployed based on `published` status
5. **URL Generation**: Article URL: `https://zenn.dev/{username}/articles/{slug}`

### Deployment Timing

- **Initial deployment**: 2-3 minutes after first push
- **Updates**: 1-2 minutes after subsequent pushes
- **Draft to Published**: Immediate when `published: true`

## Troubleshooting

### Articles Not Appearing

**Check**:
1. Repository is connected in Zenn Settings
2. `published: true` is set in frontmatter
3. File is in `articles/` directory
4. File has `.md` extension
5. Valid YAML frontmatter format

### Connection Issues

```bash
# Disconnect and reconnect:
# 1. Go to https://zenn.dev/settings/github
# 2. Disconnect repository
# 3. Reconnect and authorize

# Or regenerate GitHub personal access token:
# https://github.com/settings/tokens
```

### Slug Conflicts

If two articles have the same slug:
- The most recently pushed article wins
- Old article becomes inaccessible

**Solution**: Use unique slugs for each article

## Best Practices

### Commit Messages

Use clear, descriptive commit messages:
```bash
git commit -m "Add article: Introduction to React Hooks"
git commit -m "Fix typo in Python async article"
git commit -m "Update Vue composition API examples"
```

### Branch Strategy

```bash
main          # Published articles
feature/*     # Draft articles
draft/*       # Work in progress
```

### Draft Workflow

```bash
# Create draft branch
git checkout -b draft/new-concept

# Work on article
npx zenn new:article --slug new-concept
vim articles/new-concept.md  # published: false

# Commit and push
git add .
git commit -m "Draft: New concept article"
git push origin draft/new-concept

# When ready, merge to main and set published: true
```

## Security Considerations

### Private Repositories

- Zenn supports private GitHub repositories
- Articles remain public on Zenn even if repo is private
- Repository privacy controls source code access only

### Sensitive Information

- **Never** commit API keys or secrets
- Use environment variables for sensitive data
- Add secrets to `.gitignore`

### Access Control

- Only repository collaborators can push
- Use GitHub Teams for team access management
- Review pull requests before merging to main

## Advanced Configuration

### Custom Deploy Branch

By default, Zenn watches the `main` branch. To configure:

1. Go to Zenn Settings
2. Select GitHub repository settings
3. Configure deploy branch

### Multiple Repositories

You can connect multiple repositories to Zenn:
- Different repositories for different topics
- Separate repos for personal and work content

### Webhooks (Optional)

Zenn uses GitHub webhooks for automatic deployment:
- Automatically configured when you connect repo
- No manual configuration needed

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Validate Articles
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install Zenn CLI
        run: npm install zenn-cli
      - name: Validate articles
        run: npx zenn list
```

## See Also

- [Zenn CLI Installation Guide](zenn-cli-guide.md)
- [Zenn Official Documentation](https://zenn.dev/zenn/articles/install-zenn-cli)
- [GitHub Repository Management](https://docs.github.com/repositories)
