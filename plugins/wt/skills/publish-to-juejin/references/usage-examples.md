# Usage Examples: publish-to-juejin

## Basic Usage

### Post Markdown as Draft

```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-juejin/scripts/juejin-article.ts \
  --markdown article.md
```

**Article Frontmatter** (`article.md`):
```markdown
---
title: Vue 3 Composition API 最佳实践
category: 前端
tags: [vue, composition-api, typescript]
subtitle: 探索 Vue 3 组合式 API 的设计模式与实战技巧
cover: https://example.com/vue3-cover.png
---

# Vue 3 Composition API 最佳实践

Vue 3 引入了 Composition API...
```

### Publish Immediately

```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-juejin/scripts/juejin-article.ts \
  --markdown article.md \
  --publish
```

---

## Advanced Usage

### With Custom Category

```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-juejin/scripts/juejin-article.ts \
  --markdown article.md \
  --category "人工智能"
```

**Supported Categories**:
- `后端` (Backend)
- `前端` (Frontend)
- `Android`
- `iOS`
- `人工智能` (AI)
- `开发工具` (DevTools)
- `代码人生` (Code Life)
- `阅读` (Reading)

### With Custom Tags

```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-juejin/scripts/juejin-article.ts \
  --markdown article.md \
  --tags "typescript,vue,react,frontend"
```

### With All Options

```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-juejin/scripts/juejin-article.ts \
  --markdown article.md \
  --category "后端" \
  --tags "golang,microservice,api" \
  --draft \
  --profile ~/.custom-profile
```

---

## Direct Content (Without File)

### Using --title and --content

```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-juejin/scripts/juejin-article.ts \
  --title "快速上手 TypeScript" \
  --content "# 快速上手 TypeScript

TypeScript 是 JavaScript 的超集...

## 类型注解

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`
" \
  --category "前端" \
  --tags "typescript"
```

---

## Workflow Integration

### With Technical Content Workflow (Stage 6)

```bash
# After completing article draft (Stage 3)
cd /path/to/collection/macos/overview-of-macos-process-automation-methods

# Publish to Juejin
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-juejin/scripts/juejin-article.ts \
  --markdown 3-draft/draft-article.md \
  --category "前端" \
  --publish
```

### Multi-Platform Publishing

```bash
# Publish to multiple platforms from same article
ARTICLE="3-draft/draft-article.md"

# Juejin
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-juejin/scripts/juejin-article.ts \
  --markdown "$ARTICLE" --category "后端" --publish

# InfoQ
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-infoq/scripts/infoq-article.ts \
  --markdown "$ARTICLE" --category "Architecture" --submit

# Substack
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-substack/scripts/substack-article.ts \
  --markdown "$ARTICLE" --publish
```

---

## Batch Publishing

### Publish Multiple Articles

```bash
#!/bin/bash
# publish-all-juejin.sh

ARTICLES=(
  "article1.md"
  "article2.md"
  "article3.md"
)

for article in "${ARTICLES[@]}"; do
  echo "Publishing: $article"
  npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-juejin/scripts/juejin-article.ts \
    --markdown "$article" \
    --category "前端" \
    --draft

  # Wait between articles to avoid rate limiting
  sleep 30
done
```

### With Category Auto-Detection

```bash
#!/bin/bash
# Auto-detect category from directory name

ARTICLE="$1"
DIR=$(dirname "$ARTICLE")
CATEGORY=""

case "$DIR" in
  *frontend*|*前端*) CATEGORY="前端" ;;
  *backend*|*后端*) CATEGORY="后端" ;;
  *ai*|*人工智能*) CATEGORY="人工智能" ;;
  *) CATEGORY="前端" ;; # Default
esac

npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-juejin/scripts/juejin-article.ts \
  --markdown "$ARTICLE" \
  --category "$CATEGORY" \
  --publish
```

---

## Error Handling

### Retry on Failure

```bash
#!/bin/bash
# publish-with-retry.sh

MAX_RETRIES=3
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-juejin/scripts/juejin-article.ts \
    --markdown article.md --publish && break

  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "Retry $RETRY_COUNT/$MAX_RETRIES..."
  sleep 10
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "Failed after $MAX_RETRIES attempts"
  exit 1
fi
```

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Publish to Juejin

on:
  push:
    branches: [main]
    paths:
      - 'articles/*.md'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Publish to Juejin
        env:
          CLAUDE_PLUGIN_ROOT: ${{ github.workspace }}/plugins/wt
        run: |
          for article in articles/*.md; do
            npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-juejin/scripts/juejin-article.ts \
              --markdown "$article" \
              --category "前端" \
              --draft
          done
```

---

## Session Management

### First Time Setup

```bash
# First run - will open Chrome for manual login
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-juejin/scripts/juejin-article.ts \
  --markdown test-article.md \
  --draft

# Chrome will open. Follow these steps:
# 1. Click "登录 / 注册" button
# 2. Enter phone number
# 3. Click "获取验证码" (Get SMS code)
# 4. Enter verification code from SMS
# 5. Click "登录 / 注册" (Login)
# Script will continue automatically after login
```

### Subsequent Runs

```bash
# Session is saved, no need to login again
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-juejin/scripts/juejin-article.ts \
  --markdown article.md \
  --publish
```

### Reset Session

```bash
# If session expires or you need to use different account
rm -rf ~/.local/share/juejin-browser-profile

# Run again - will prompt for login
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-juejin/scripts/juejin-article.ts \
  --markdown article.md
```

---

## Troubleshooting Examples

### Debug Selector Issues

```bash
# Enable verbose output
DEBUG=1 npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-juejin/scripts/juejin-article.ts \
  --markdown article.md
```

### Test Without Publishing

```bash
# Test login and navigation only
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-juejin/scripts/juejin-article.ts \
  --markdown article.md \
  --draft

# Check if draft was created successfully
# If yes, then use --publish for actual publishing
```

---

## Configuration Examples

### Global Config (`~/.claude/wt/config.jsonc`)

```jsonc
{
  "publish-to-juejin": {
    // Chrome profile directory for session persistence
    "profile_dir": "~/.local/share/juejin-browser-profile",

    // Auto-publish: true = publish immediately, false = save as draft
    "auto_publish": false
  }
}
```

### Project-Specific Config

```jsonc
{
  "publish-to-juejin": {
    "profile_dir": "./.juejin-profile",
    "auto_publish": true,
    "default_category": "前端",
    "default_tags": ["javascript", "typescript"]
  }
}
```

---

## Tips and Best Practices

### 1. Use Draft First

Always save as draft first, review on Juejin, then publish manually:

```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-juejin/scripts/juejin-article.ts \
  --markdown article.md --draft

# Then log into Juejin, review article, and publish manually
```

### 2. Wait Between Articles

Avoid rate limiting by waiting between consecutive publishes:

```bash
for article in article*.md; do
  npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-juejin/scripts/juejin-article.ts \
    --markdown "$article" --publish
  sleep 60  # Wait 1 minute
done
```

### 3. Use Markdown Frontmatter

Put all metadata in frontmatter for cleaner command line:

```markdown
---
title: 文章标题
category: 后端
tags: [golang, microservice, grpc]
subtitle: 副标题
cover: https://example.com/cover.png
---

# Content here
```

Then simply:

```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-juejin/scripts/juejin-article.ts \
  --markdown article.md --publish
```

### 4. Verify Article After Publishing

After publishing, verify the article at the returned URL:

```bash
OUTPUT=$(npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-juejin/scripts/juejin-article.ts \
  --markdown article.md --publish)

echo "Article URL: $OUTPUT"

# Optionally open in browser
open "$OUTPUT"  # macOS
xdg-open "$OUTPUT"  # Linux
start "$OUTPUT"  # Windows
```
