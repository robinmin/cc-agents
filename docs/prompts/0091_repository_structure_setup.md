---
name: repository structure setup
description: Create folder structure template and configuration files for Technical Content Workflow
status: Done
created_at: 2026-01-28
updated_at: 2026-01-28
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
dependencies: []
tags: [wt-plugin, technical-content-workflow, infrastructure]
---

## 0001. Repository Structure Setup

### Background

The Technical Content Workflow system requires a consistent, organized folder structure for managing technical content from initial research through publication. This task establishes the foundational repository structure including stage folders (0-6), configuration templates, and metadata files that all other workflow commands will rely upon.

This infrastructure task is a prerequisite for all other tasks (0002-0010) in the Technical Content Workflow system.

### Requirements

**Functional Requirements:**
- Create repository root folder structure with collection indexing
- Create stage folders (0-materials/, 1-research/, 2-outline/, 3-draft/, 4-illustration/, 5-adaptation/, 6-publish/)
- Create repository/collections/ folder with template structure
- Create repository/collections.json index template
- Create repository/README.md documentation template
- Create metadata.yaml template for topic-level tracking
- Create publish-log.json template for tracking publication history

**Non-Functional Requirements:**
- Folder structure must be portable across projects
- Templates must use consistent YAML/JSON formatting
- All paths must be relative and configurable
- Templates must include helpful comments for users

**Acceptance Criteria:**
- [ ] repository/collections/ folder exists with template structure
- [ ] repository/collections.json index template created
- [ ] repository/README.md template created
- [ ] Stage folders (0-6) templates created with metadata.yaml
- [ ] metadata.yaml template with all required fields
- [ ] publish-log.json template for tracking publications
- [ ] All templates include documentation comments

### Design

**Folder Structure Template:**

```
repository/
├── collections/              # Collection-level storage
│   ├── collection-1/        # Template collection
│   │   ├── .metadata.yaml  # Collection metadata
│   │   ├── README.md       # Collection documentation
│   │   └── topics/         # Topic-level storage
│   │       └── topic-1/    # Individual topic folder
│   ├── collection-2/
│   └── template/           # Template structure for new collections
│       ├── .metadata.yaml
│       ├── README.md
│       └── topics/
├── collections.json         # Index of all collections
└── README.md               # Repository documentation

topics/                      # Root level topics (optional)
├── topic-name/
│   ├── 0-materials/        # Raw research materials
│   │   ├── materials.json  # Material index
│   │   ├── source-1.pdf
│   │   └── materials-extracted.md
│   ├── 1-research/         # Research outputs
│   │   ├── research-brief.md
│   │   └── sources.json
│   ├── 2-outline/          # Outline drafts
│   │   ├── outline-draft.md
│   │   └── outline-approved.md
│   ├── 3-draft/            # Article drafts
│   │   ├── draft-article.md
│   │   └── draft-revisions/
│   ├── 4-illustration/     # Images and visual aids
│   │   ├── images/
│   │   └── captions.json
│   ├── 5-adaptation/       # Platform adaptations
│   │   ├── article-devto.md
│   │   ├── article-linkedin.md
│   │   └── article-twitter.md
│   ├── 6-publish/          # Published versions
│   │   ├── published/
│   │   ├── article.md      # Final version
│   │   └── assets/
│   ├── metadata.yaml       # Topic metadata
│   └── publish-log.json    # Publication history
```

**metadata.yaml Template:**

```yaml
---
# Topic Metadata Template
name: topic-name
title: Human-Readable Topic Title
description: Brief description of the content topic
collection: collection-id
created_at: 2026-01-28
updated_at: 2026-01-28
status: draft | review | published | archived
author:
  name: Author Name
  email: author@example.com
tags: [tag1, tag2, tag3]
keywords: [keyword1, keyword2, keyword3]
stage: 0 | 1 | 2 | 3 | 4 | 5 | 6
version: 1.0.0
review:
  last_reviewed_at: null
  reviewer: null
  status: pending | approved | changes_requested
links:
  materials: 0-materials/materials-extracted.md
  research: 1-research/research-brief.md
  outline: 2-outline/outline-approved.md
  draft: 3-draft/draft-article.md
  illustration: 4-illustration/
  adaptation: 5-adaptation/
  publish: 6-publish/article.md
---

# Additional Notes
# Use this section for any additional metadata or notes about the topic
```

**publish-log.json Template:**

```json
{
  "version": "1.0.0",
  "last_updated": "2026-01-28T00:00:00Z",
  "publications": [
    {
      "id": "pub-001",
      "platform": "blog",
      "url": "https://example.com/blog/article-slug",
      "published_at": "2026-01-28T00:00:00Z",
      "status": "published",
      "version": "1.0.0",
      "notes": "Initial publication"
    },
    {
      "id": "pub-002",
      "platform": "devto",
      "url": "https://dev.to/user/article-slug",
      "published_at": "2026-01-28T00:00:00Z",
      "status": "published",
      "version": "1.0.0",
      "notes": "Dev.to adaptation"
    }
  ],
  "adaptations": [
    {
      "platform": "twitter",
      "created_at": "2026-01-28T00:00:00Z",
      "file": "5-adaptation/article-twitter.md"
    },
    {
      "platform": "linkedin",
      "created_at": "2026-01-28T00:00:00Z",
      "file": "5-adaptation/article-linkedin.md"
    }
  ],
  "images": [
    {
      "id": "img-001",
      "prompt": "Image generation prompt",
      "file": "4-illustration/images/featured-image.png",
      "created_at": "2026-01-28T00:00:00Z",
      "resolution": "1920x1080"
    }
  ]
}
```

**collections.json Template:**

```json
{
  "version": "1.0.0",
  "last_updated": "2026-01-28T00:00:00Z",
  "collections": [
    {
      "id": "collection-1",
      "name": "Technical Tutorials",
      "description": "Step-by-step technical tutorials for developers",
      "path": "repository/collections/technical-tutorials",
      "created_at": "2026-01-28",
      "updated_at": "2026-01-28",
      "topic_count": 0,
      "published_count": 0,
      "tags": ["tutorial", "technical", "developer"]
    },
    {
      "id": "collection-2",
      "name": "Architecture Guides",
      "description": "System architecture and design pattern guides",
      "path": "repository/collections/architecture-guides",
      "created_at": "2026-01-28",
      "updated_at": "2026-01-28",
      "topic_count": 0,
      "published_count": 0,
      "tags": ["architecture", "design", "patterns"]
    }
  ],
  "templates": [
    {
      "id": "default",
      "name": "Default Template",
      "description": "Standard technical content template",
      "path": "repository/collections/template"
    }
  ]
}
```

### Plan

**Phase 1: Create Repository Root Structure**
- [ ] Create repository/collections/ folder
- [ ] Create repository/collections.json index template
- [ ] Create repository/README.md documentation template
- [ ] Create repository/collections/template/ structure

**Phase 2: Create Stage Folder Templates**
- [ ] Create 0-materials/ folder with metadata.yaml template
- [ ] Create 1-research/ folder with metadata.yaml template
- [ ] Create 2-outline/ folder with metadata.yaml template
- [ ] Create 3-draft/ folder with metadata.yaml template
- [ ] Create 4-illustration/ folder with metadata.yaml template
- [ ] Create 5-adaptation/ folder with metadata.yaml template
- [ ] Create 6-publish/ folder with metadata.yaml template

**Phase 3: Create Metadata and Publish Templates**
- [ ] Create metadata.yaml template for topic-level tracking
- [ ] Create publish-log.json template for publication history
- [ ] Add helper documentation in each stage folder

**Phase 4: Create Example Structure**
- [ ] Create example topic folder structure (repository/example-topic/)
- [ ] Document folder structure in repository/README.md
- [ ] Add .gitkeep files for empty folders (if needed)

### Artifacts

| Type | Path | Generated By | Date |
|------|------|--------------|------|
| Template | repository/collections/ | This task | 2026-01-28 |
| Template | repository/collections.json | This task | 2026-01-28 |
| Template | repository/README.md | This task | 2026-01-28 |
| Template | 0-materials/metadata.yaml | This task | 2026-01-28 |
| Template | 1-research/metadata.yaml | This task | 2026-01-28 |
| Template | 2-outline/metadata.yaml | This task | 2026-01-28 |
| Template | 3-draft/metadata.yaml | This task | 2026-01-28 |
| Template | 4-illustration/metadata.yaml | This task | 2026-01-28 |
| Template | 5-adaptation/metadata.yaml | This task | 2026-01-28 |
| Template | 6-publish/metadata.yaml | This task | 2026-01-28 |
| Template | metadata.yaml (root) | This task | 2026-01-28 |
| Template | publish-log.json | This task | 2026-01-28 |

### References

- [Task 0002](/docs/prompts/0002_create_wt-outline_command.md) - Depends on folder structure
- [Task 0003](/docs/prompts/0003_create_wt-adapt_command.md) - Depends on folder structure
- [Task 0004](/docs/prompts/0004_create_wt-generate-image_command.md) - Depends on folder structure
- [Task 0005](/docs/prompts/0005_create_wt-publish_command.md) - Depends on folder structure
- [Task 0006](/docs/prompts/0006_enhance_wt-info-seek_command.md) - Depends on folder structure
- [Task 0007](/docs/prompts/0007_enhance_wt-info-research_command.md) - Depends on folder structure
- [Task 0008](/docs/prompts/0008_enhance_wt-style-apply_command.md) - Depends on folder structure
- [Task 0009](/docs/prompts/0009_create_topic_init_helper.md) - Uses folder structure templates
- [Task 0010](/docs/prompts/0010_integration_testing.md) - Tests folder structure compliance
