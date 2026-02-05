# InfoQ Browser Automation - Usage Examples

## Basic Usage

### Example 1: Post Markdown as Draft

```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-infoq/scripts/infoq-article.ts \
  --markdown article.md
```

**What happens:**
1. Parses markdown file for title, content, tags
2. Launches Chrome with InfoQ profile
3. Navigates to article creation page
4. Checks login status (prompts if needed)
5. Fills in title, content, tags
6. Saves as draft (doesn't submit for review)

---

### Example 2: Submit for Review

```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-infoq/scripts/infoq-article.ts \
  --markdown article.md \
  --submit
```

**What happens:**
- Same as Example 1, but submits article for editorial review
- Review time: ~1 week
- Article will be visible to editors after submission

---

### Example 3: Post with Custom Title and Content

```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-infoq/scripts/infoq-article.ts \
  --title "Understanding Microservices Architecture" \
  --content "# Introduction

Microservices architecture is an approach to developing
a single application as a suite of small services..." \
  --category "Architecture" \
  --tags "microservices,cloud-native,kubernetes"
```

**When to use:**
- Quick posts without markdown file
- Testing content formatting
- Programmatic content generation

---

## Advanced Usage

### Example 4: Complete Frontmatter Example

Create `article.md`:

```markdown
---
title: Building Scalable Microservices with Kubernetes
subtitle: A practical guide to deploying cloud-native applications
category: Cloud Computing
tags: [kubernetes, microservices, docker, cloud-native, devops]
---

# Introduction

Microservices architecture has become the de facto standard for building
scalable, maintainable applications in the cloud. In this comprehensive guide...

## Prerequisites

Before diving into microservices, you should understand:
- Container basics (Docker)
- Linux fundamentals
- Basic networking concepts

## Getting Started

Let's start with a simple microservice...

(continue with 3000-4000 words of content...)
```

**Post command:**
```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-infoq/scripts/infoq-article.ts \
  --markdown article.md \
  --submit
```

---

### Example 5: Custom Chrome Profile

```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-infoq/scripts/infoq-article.ts \
  --markdown article.md \
  --profile ~/.my-custom-profiles/infoq-work
```

**When to use:**
- Multiple InfoQ accounts (work/personal)
- Isolated testing environments
- Team workflows with shared profiles

---

### Example 6: Override Config Settings

Even if `auto_publish: true` in config, save as draft:

```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-infoq/scripts/infoq-article.ts \
  --markdown article.md \
  --draft
```

Even if `auto_publish: false` in config, submit immediately:

```bash
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-infoq/scripts/infoq-article.ts \
  --markdown article.md \
  --submit
```

---

## Workflows

### Workflow 1: Technical Content Creation Integration

Part of the 7-stage technical content creation workflow:

```bash
# Stage 6: Publish to InfoQ
# After completing stages 0-5 (research, outline, draft, illustration, adaptation)

npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-infoq/scripts/infoq-article.ts \
  --markdown /path/to/tcc/repo/collections/my-topic/6-publish/article.md \
  --submit
```

---

### Workflow 2: Batch Publishing Multiple Articles

Create `publish-all.sh`:

```bash
#!/bin/bash

ARTICLES=(
  "article-1.md"
  "article-2.md"
  "article-3.md"
)

for article in "${ARTICLES[@]}"; do
  echo "Publishing $article..."

  npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-infoq/scripts/infoq-article.ts \
    --markdown "$article" \
    --draft  # Start with drafts, review before final submission

  echo "Waiting 10 seconds before next article..."
  sleep 10
done

echo "All articles posted as drafts. Review and submit from InfoQ editor."
```

---

### Workflow 3: CI/CD Integration

GitHub Actions example:

```yaml
name: Publish to InfoQ
on:
  workflow_dispatch:
    inputs:
      article:
        description: 'Article file path'
        required: true
      submit:
        description: 'Submit for review?'
        type: boolean
        default: false

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Publish to InfoQ
        env:
          ARTICLE: ${{ github.event.inputs.article }}
          SUBMIT_FLAG: ${{ github.event.inputs.submit == 'true' && '--submit' || '--draft' }}
        run: |
          npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-infoq/scripts/infoq-article.ts \
            --markdown "$ARTICLE" \
            $SUBMIT_FLAG
```

---

### Workflow 4: Local Development Loop

Iterative content creation workflow:

```bash
# 1. Create markdown with frontmatter
cat > draft.md << 'EOF'
---
title: Test Article
category: Architecture
tags: [test]
---

# Test Content

This is a test article for development...
EOF

# 2. Post as draft (doesn't submit for review)
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-infoq/scripts/infoq-article.ts \
  --markdown draft.md \
  --draft

# 3. Review in InfoQ editor (Chrome window stays open)
# 4. Make changes in InfoQ editor directly
# 5. When satisfied, submit from InfoQ editor
```

---

## Integrations

### Integration 1: With Obsidian

Obsidian plugin to publish to InfoQ:

```javascript
// Obsidian plugin (conceptual)
async function publishToInfoQ(file) {
  const content = await app.vault.read(file);
  const tempPath = `/tmp/infoq-${file.basename}.md`;

  // Write temp file
  await app.vault.adapter.write(tempPath, content);

  // Call publish script
  const { exec } = require('child_process');
  exec(`npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-infoq/scripts/infoq-article.ts --markdown ${tempPath}`, (error) => {
    if (error) {
      new Notice(`Failed to publish: ${error.message}`);
    } else {
      new Notice('Published successfully!');
    }
  });
}
```

---

### Integration 2: With Hugo/Jekyll Static Sites

Build pipeline to cross-post to InfoQ:

```bash
#!/bin/bash

# Convert Hugo frontmatter to InfoQ frontmatter
# (Requires sed/awk processing)

for post in content/posts/*.md; do
  # Extract Hugo frontmatter
  title=$(grep '^title:' "$post" | cut -d'"' -f2)
  tags=$(grep '^tags:' "$post" | cut -d']' -f1 | cut -d'[' -f2)

  # Create InfoQ-compatible markdown
  cat > /tmp/infoq-post.md << EOF
---
title: $title
tags: [$tags]
category: Architecture
---

$(sed '1,/^---$/d' "$post")
EOF

  # Publish to InfoQ
  npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-infoq/scripts/infoq-article.ts \
    --markdown /tmp/infoq-post.md \
    --draft
done
```

---

### Integration 3: With Notion API

Notion → InfoQ cross-posting:

```typescript
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function notionToInfoQ(pageId: string) {
  // Retrieve Notion page content
  const page = await notion.pages.retrieve({ page_id: pageId });
  const blocks = await notion.blocks.children.list({ block_id: pageId });

  // Convert Notion blocks to Markdown
  const markdown = notionToMarkdown(blocks);

  // Write temp file
  const tempPath = `/tmp/notion-${pageId}.md`;
  await Deno.writeTextFile(tempPath, markdown);

  // Publish to InfoQ
  const proc = Bun.spawn([
    'bun',
    `${CLAUDE_PLUGIN_ROOT}/skills/publish-to-infoq/scripts/infoq-article.ts`,
    '--markdown', tempPath,
    '--draft'
  ]);

  await proc.exited;
}
```

---

## Automation Examples

### Automation 1: Scheduled Publishing (cron)

```bash
# crontab -e
# Publish draft every Monday at 9 AM

0 9 * * 1 cd /path/to/project && \
  npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-infoq/scripts/infoq-article.ts \
    --markdown articles/weekly-$(date +\%Y\%m\%d).md \
    --draft >> logs/infoq-publish.log 2>&1
```

---

### Automation 2: Watch Directory for New Articles (filewatcher)

```bash
#!/bin/bash
# Requires: entr (http://eradman.com/entrproject/)

find articles/ -name '*.md' | \
  entr -r npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-infoq/scripts/infoq-article.ts \
    --markdown /_  # entr replaces /_ with changed file path
```

---

### Automation 3: Slack Bot for Team Publishing

```python
# Slack bot command: /infoq-publish <file>
import os
import subprocess

def handle_infoq_publish(command):
    file_path = command['text']

    result = subprocess.run([
        'bun', 'run',
        f'{CLAUDE_PLUGIN_ROOT}/skills/publish-to-infoq/scripts/infoq-article.ts',
        '--markdown', file_path,
        '--draft'
    ], capture_output=True, text=True)

    if result.returncode == 0:
        return f"✅ Published successfully! {result.stdout}"
    else:
        return f"❌ Failed: {result.stderr}"
```

---

## Tips and Best Practices

### Tip 1: Always Preview Before Submitting

```bash
# Save as draft first
npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-infoq/scripts/infoq-article.ts \
  --markdown article.md \
  --draft

# Review in InfoQ editor
# Make adjustments if needed
# Then submit from InfoQ editor directly
```

### Tip 2: Verify Word Count

```bash
# Check word count before submitting
wc -w article.md

# InfoQ recommends 3000-4000 words
# Below 2000 words may be rejected
```

### Tip 3: Use Descriptive Tags

```yaml
---
tags: [microservices, kubernetes, cloud-native, devops]
# Good: Specific, discoverable tags
---

# Bad: Too generic
tags: [tech, article, post]
```

### Tip 4: Category Selection

Choose the most specific category:

| Article Topic | Best Category |
|---------------|---------------|
| Docker & Kubernetes | Cloud Computing |
| React/Vue tutorials | Frontend |
| CI/CD pipelines | Operations |
| TensorFlow guides | AI |
| Java performance | Java |

### Tip 5: Test with Short Content First

```bash
# Test with minimal content
cat > test.md << 'EOF'
---
title: Test Article
category: Architecture
---

# Test

This is a test article...
EOF

npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-infoq/scripts/infoq-article.ts \
  --markdown test.md \
  --draft

# Verify success before posting real content
```

---

## Error Handling Examples

### Handle Login Timeout

```bash
#!/bin/bash

# Run with timeout
timeout 300 npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-infoq/scripts/infoq-article.ts \
  --markdown article.md || {
  echo "Login timeout or error. Please check:"
  echo "1. Is Chrome installed?"
  echo "2. Did you log in within 5 minutes?"
  echo "3. Is network connection stable?"
  exit 1
}
```

### Retry on Failure

```bash
#!/bin/bash

MAX_RETRIES=3
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if npx -y bun ${CLAUDE_PLUGIN_ROOT}/skills/publish-to-infoq/scripts/infoq-article.ts \
    --markdown article.md; then
    echo "Success!"
    exit 0
  fi

  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "Failed (attempt $RETRY_COUNT/$MAX_RETRIES). Retrying in 10 seconds..."
  sleep 10
done

echo "Failed after $MAX_RETRIES attempts"
exit 1
```
