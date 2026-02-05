# Test Fixtures for Markdown Parsing

## Sample 1: Complete Frontmatter

```markdown
---
title: "Complete Article with All Fields"
subtitle: "This is a test subtitle"
category: technology
tags: [programming, typescript, testing]
cover: https://example.com/cover.png
---

# Article Title

This is the article content with multiple paragraphs.

## Subsection

More content here.
```

## Sample 2: Minimal Frontmatter

```markdown
---
title: "Minimal Article"
---

# Simple Content

Just the basics.
```

## Sample 3: No Frontmatter

```markdown
# Article Without Frontmatter

This article has no frontmatter, only content.
```

## Sample 4: Chinese Category

```markdown
---
title: "中文文章"
category: 科技
tags: [编程, 测试]
---

# 中文内容

这是一篇中文测试文章。
```

## Sample 5: Array Tags

```markdown
---
title: "Array Tags Test"
tags: [tag1, tag2, tag3, tag4, tag5]
---

Content here.
```

## Sample 6: Empty Tags Array

```markdown
---
title: "Empty Tags"
tags: []
---

Content.
```

## Sample 7: Boolean and Number Values

```markdown
---
title: "Types Test"
published: true
priority: 1
count: 42
ratio: 3.14
---

Content.
```

## Sample 8: Multiline Content

```markdown
---
title: "Multiline Content"
---

# First Section

Paragraph 1 with some text.

Paragraph 2 with more text.

## Second Section

List item 1
List item 2
List item 3

Code block example:

```javascript
function test() {
  return true;
}
```

Final paragraph.
```
