# Stage Frontmatter Templates

## Stage 0: Materials Extraction

### materials.json
```json
{
  "version": "1.0.0",
  "last_updated": "ISO-8601",
  "materials": [
    {
      "id": "mat-001",
      "file": "materials-extracted.md",
      "source": "source-1.md",
      "source_type": "file | url | description",
      "extracted_at": "ISO-8601",
      "word_count": 0,
      "confidence": "HIGH | MEDIUM | LOW"
    }
  ]
}
```

### materials-extracted.md
```yaml
---
title: Extracted Materials: [Topic]
source: [filename or URL]
source_type: file | url | description
aspect: architecture | performance | security | examples | API | null
extracted_at: YYYY-MM-DD
topic: topic-name
word_count: 0
confidence: HIGH | MEDIUM | LOW
---
```

## Stage 1: Research

### sources.json
```json
{
  "version": "1.0.0",
  "last_updated": "ISO-8601",
  "sources": [...],
  "research_type": "systematic | rapid | meta-analysis | fact-check",
  "time_range": "YYYY-YYYY",
  "confidence": "HIGH | MEDIUM | LOW"
}
```

### research-brief.md frontmatter
```yaml
---
title: Research Brief: [Topic]
source_materials: 0-materials/materials-extracted.md
research_type: systematic | rapid | meta-analysis | fact-check
time_range: YYYY-YYYY
topics: [tag1, tag2]
created_at: YYYY-MM-DD
status: draft | approved
confidence: HIGH | MEDIUM | LOW
sources_count: 0
---
```

## Stage 2: Outline

### outline-option-*.md frontmatter (for each generated option)
```yaml
---
title: Outline Option [X] - [Style Description]
source_research: 1-research/research-brief.md
option: a | b | c
style: traditional-structured | narrative-story-driven | technical-deep-dive
created_at: YYYY-MM-DD
status: draft
confidence: HIGH | MEDIUM | LOW
---
```

### outline-approved.md frontmatter (user-selected option)
```yaml
---
title: Outline Approved: [Topic]
source_research: 1-research/research-brief.md
selected_option: a | b | c
selected_style: traditional-structured | narrative-story-driven | technical-deep-dive
approved_at: YYYY-MM-DD
approved_by: [user]
status: approved
confidence: HIGH | MEDIUM | LOW
---
```

### materials/generation-params.json (generation parameters)
```json
{
  "version": "1.0.0",
  "generated_at": "ISO-8601",
  "research_brief": "1-research/research-brief.md",
  "length": "short | long",
  "options_requested": 2,
  "styles": [
    {"option": "a", "style": "traditional-structured", "description": "Hierarchical, logical progression"},
    {"option": "b", "style": "narrative-story-driven", "description": "Storytelling, engaging flow"},
    {"option": "c", "style": "technical-deep-dive", "description": "Comprehensive, detail-oriented"}
  ]
}
```

## Stage 3: Draft

### draft-article.md frontmatter
```yaml
---
title: Draft: [Article Title]
style_profile: profile-id
source_outline: 2-outline/outline-approved.md
topic: [topic]
version: 1
created_at: YYYY-MM-DD
updated_at: YYYY-MM-DD
status: draft | review | approved
style_notes:
  - tone: formal | conversational
  - vocabulary: technical | accessible
  - structure: hierarchical | narrative
---
```

## Stage 4: Illustration

### captions.json
```json
{
  "version": "1.0.0",
  "last_updated": "ISO-8601",
  "captions": [
    {
      "id": "img-001",
      "image": "images/[filename].png",
      "prompt": "[original prompt]",
      "caption": "[description]",
      "alt_text": "[accessibility]",
      "resolution": "WIDTHxHEIGHT",
      "created_at": "ISO-8601",
      "article_context": "3-draft/draft-article.md"
    }
  ]
}
```

## Stage 5: Adaptation

### Platform frontmatter
```yaml
---
title: [Title] - [Platform] Adaptation
source: ../draft-article.md
platform: twitter | linkedin | devto | medium
created_at: YYYY-MM-DD
original_length: 0
adapted_length: 0
---
```

## Stage 6: Publish

### publish-log.json
```json
{
  "version": "1.0.0",
  "last_updated": "ISO-8601",
  "topic": "topic-name",
  "publications": [...],
  "adaptations": [...]
}
```

### article.md frontmatter
```yaml
---
title: [Article Title]
source: 3-draft/draft-article.md
published:
  blog:
    commit: [sha]
    url: [url]
    date: YYYY-MM-DD
  platforms: {...}
---
```
