# Usage Examples: XHS Publishing

## Table of Contents

- [Basic Usage](#basic-usage)
  - [Publish from Markdown File (Draft)](#publish-from-markdown-file-draft)
  - [Publish Immediately](#publish-immediately)
- [Markdown Frontmatter](#markdown-frontmatter)
  - [Complete Example](#complete-example)
  - [Minimal Example](#minimal-example)
- [CLI Options](#cli-options)
  - [Using --title and --content](#using---title-and---content)
  - [Specifying Category](#specifying-category)
  - [Custom Profile Directory](#custom-profile-directory)
- [Configuration File](#configuration-file)
  - [~/.claude/wt/config.jsonc](#claudewtconfigjsonc)
  - [Enable Auto-Publish](#enable-auto-publish)
- [Batch Publishing](#batch-publishing)
  - [Publish Multiple Articles](#publish-multiple-articles)
  - [Draft Mode for Review](#draft-mode-for-review)
- [Integration with Other Tools](#integration-with-other-tools)
  - [With Git](#with-git)
  - [With Watch Scripts](#with-watch-scripts)
  - [With Makefile](#with-makefile)
- [Advanced Workflows](#advanced-workflows)
  - [Multi-Platform Publishing](#multi-platform-publishing)
  - [Conditional Publishing](#conditional-publishing)
  - [Scheduled Publishing](#scheduled-publishing)
- [Troubleshooting Examples](#troubleshooting-examples)
  - [Test Run (Dry Run)](#test-run-dry-run)
  - [Verbose Mode](#verbose-mode)
  - [Keep Chrome Open](#keep-chrome-open)
- [Tips and Best Practices](#tips-and-best-practices)
  - [1. Use Draft Mode First](#1-use-draft-mode-first)
  - [2. Verify Markdown Syntax](#2-verify-markdown-syntax)
  - [3. Add Frontmatter](#3-add-frontmatter)
  - [4. Use Relative Paths](#4-use-relative-paths)
  - [5. Test Login Session](#5-test-login-session)
- [Common Patterns](#common-patterns)
  - [Publishing from Different Directories](#publishing-from-different-directories)
  - [Publishing with Tags](#publishing-with-tags)
  - [Overriding Frontmatter](#overriding-frontmatter)

---

## Basic Usage

### Publish from Markdown File (Draft)

```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-xhs/scripts/xhs-article.ts \
  --markdown article.md
```

This is the safest option - saves as draft for review before publishing.

### Publish Immediately

```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-xhs/scripts/xhs-article.ts \
  --markdown article.md \
  --publish
```

## Markdown Frontmatter

### Complete Example

```markdown
---
title: "深入理解 JavaScript 异步编程"
subtitle: "从回调函数到 Async/Await 的演进历程"
category: 科技
tags: [javascript, async, programming, frontend]
cover: https://example.com/covers/js-async.png
---

# 深入理解 JavaScript 异步编程

JavaScript 的异步编程是前端开发的核心概念之一...

## 回调函数

最早的异步处理方式...

## Promise

ES6 引入的 Promise 对象...

## Async/Await

ES2017 引入的语法糖...
```

### Minimal Example

```markdown
---
title: "My Article Title"
tags: [tag1, tag2]
---

# Article Content

Your article content here...
```

## CLI Options

### Using --title and --content

```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-xhs/scripts/xhs-article.ts \
  --title "Article Title" \
  --content "# Introduction\n\nContent here..." \
  --tags "javascript,react"
```

### Specifying Category

```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-xhs/scripts/xhs-article.ts \
  --markdown article.md \
  --category 科技
```

Supported categories:
- 科技 (Technology)
- 教育 (Education)
- 生活 (Lifestyle)
- 娱乐 (Entertainment)
- 运动 (Sports)
- 旅行 (Travel)
- 美食 (Food)
- 时尚 (Fashion)
- 美妆 (Beauty)

### Custom Profile Directory

```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-xhs/scripts/xhs-article.ts \
  --markdown article.md \
  --profile ~/my-xhs-profile
```

## Configuration File

### ~/.claude/wt/config.jsonc

```jsonc
{
  "publish-to-xhs": {
    "profile_dir": "~/.local/share/xhs-browser-profile",
    "auto_publish": false
  }
}
```

### Enable Auto-Publish

Set `auto_publish: true` to publish immediately by default (skips draft mode):

```jsonc
{
  "publish-to-xhs": {
    "auto_publish": true
  }
}
```

Omit `--publish` flag for automatic publishing:
```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-xhs/scripts/xhs-article.ts \
  --markdown article.md
# Automatically publishes (no draft mode)
```

## Batch Publishing

### Publish Multiple Articles

```bash
#!/bin/bash

for file in articles/*.md; do
  echo "Publishing: $file"
  npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-xhs/scripts/xhs-article.ts \
    --markdown "$file" \
    --publish
  sleep 10  # Wait between posts to avoid rate limiting
done
```

### Draft Mode for Review

```bash
#!/bin/bash

for file in articles/*.md; do
  echo "Saving draft: $file"
  npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-xhs/scripts/xhs-article.ts \
    --markdown "$file" \
    --draft
done
```

Then manually review and publish each draft in the browser.

## Integration with Other Tools

### With Git

```bash
# Commit and publish
git add article.md
git commit -m "Add new article"
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-xhs/scripts/xhs-article.ts \
  --markdown article.md \
  --publish
```

### With Watch Scripts

```bash
#!/bin/bash
# watch-and-publish.sh

while true; do
  inotifywait -e modify articles/*.md | while read file; do
    echo "Change detected in $file"
    sleep 2  # Wait for file to be fully written
    npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-xhs/scripts/xhs-article.ts \
      --markdown "$file" \
      --draft
  done
done
```

### With Makefile

```makefile
# Makefile

PUBLISH_SCRIPT = ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-xhs/scripts/xhs-article.ts

publish:
	npx -y bun $(PUBLISH_SCRIPT) --markdown article.md --publish

draft:
	npx -y bun $(PUBLISH_SCRIPT) --markdown article.md --draft

publish-all:
	for file in articles/*.md; do \
		npx -y bun $(PUBLISH_SCRIPT) --markdown "$$file" --publish; \
		sleep 10; \
	done
```

Usage:
```bash
make publish
make draft
make publish-all
```

## Advanced Workflows

### Multi-Platform Publishing

Publish to multiple platforms from a single markdown file:

```bash
#!/bin/bash

FILE="article.md"

echo "Publishing to XHS..."
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-xhs/scripts/xhs-article.ts \
  --markdown "$FILE" --publish

echo "Publishing to Juejin..."
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-juejin/scripts/juejin-article.ts \
  --markdown "$FILE" --publish

echo "Publishing to Qiita..."
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-qiita/scripts/qiita-article.ts \
  --markdown "$FILE" --private

echo "All done!"
```

### Conditional Publishing

Publish only if certain conditions are met:

```bash
#!/bin/bash

FILE="article.md"

# Check if file contains "ready-to-publish" tag
if grep -q "ready-to-publish" "$FILE"; then
  echo "Publishing..."
  npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-xhs/scripts/xhs-article.ts \
    --markdown "$FILE" --publish
else
  echo "Saving as draft..."
  npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-xhs/scripts/xhs-article.ts \
    --markdown "$FILE" --draft
fi
```

### Scheduled Publishing

```bash
#!/bin/bash
# scheduled-publish.sh

# Publish at specific time
TARGET_TIME="2024-01-15 09:00:00"
CURRENT_TIME=$(date +%s)
TARGET_SECONDS=$(date -d "$TARGET_TIME" +%s)
DELAY_SECONDS=$((TARGET_SECONDS - CURRENT_TIME))

if [ $DELAY_SECONDS -gt 0 ]; then
  echo "Waiting until $TARGET_TIME..."
  sleep $DELAY_SECONDS
fi

npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-xhs/scripts/xhs-article.ts \
  --markdown article.md \
  --publish
```

## Troubleshooting Examples

### Test Run (Dry Run)

```bash
# Test parsing without publishing
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-xhs/scripts/xhs-article.ts \
  --markdown article.md \
  --draft
```

Then manually click publish in the browser.

### Verbose Mode

```bash
DEBUG=xhs:* npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-xhs/scripts/xhs-article.ts \
  --markdown article.md
```

### Keep Chrome Open

The script automatically closes Chrome after completion. To keep it open for debugging:

1. Comment out the cleanup code in xhs-article.ts:
   ```typescript
   // finally {
   //   cdp.close();
   //   chrome.kill();
   // }
   ```

2. Or use a separate Chrome instance for manual inspection.

## Tips and Best Practices

### 1. Use Draft Mode First

Always save as draft before publishing:
```bash
# First run: save as draft
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-xhs/scripts/xhs-article.ts \
  --markdown article.md --draft

# Review in browser, then publish manually
```

### 2. Verify Markdown Syntax

Check for markdown errors before publishing:
```bash
# Use a markdown linter
npm install -g markdownlint
markdownlint article.md
```

### 3. Add Frontmatter

Always include frontmatter with title and tags:
```markdown
---
title: "Required Title"
tags: [required, for, organization]
---
```

### 4. Use Relative Paths

For images and other assets, use absolute URLs:
```markdown
<!-- Good -->
![Image](https://example.com/images/photo.png)

<!-- Avoid -->
![Image](./images/photo.png)
```

### 5. Test Login Session

Verify login session persists:
```bash
# First run: login required
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-xhs/scripts/xhs-article.ts --markdown test.md --draft

# Second run: should use saved session
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-xhs/scripts/xhs-article.ts --markdown test.md --draft
```

## Common Patterns

### Publishing from Different Directories

```bash
# Absolute path
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-xhs/scripts/xhs-article.ts \
  --markdown /full/path/to/article.md

# Relative path (from current directory)
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-xhs/scripts/xhs-article.ts \
  --markdown ./articles/article.md
```

### Publishing with Tags

```bash
# Single tag
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-xhs/scripts/xhs-article.ts \
  --markdown article.md --tags "javascript"

# Multiple tags (comma-separated)
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-xhs/scripts/xhs-article.ts \
  --markdown article.md --tags "javascript,react,vue"
```

### Overriding Frontmatter

CLI options override frontmatter values:
```bash
# Frontmatter has title="Old Title"
# CLI flag overrides to "New Title"
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-xhs/scripts/xhs-article.ts \
  --markdown article.md \
  --title "New Title"
```
