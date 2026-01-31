---
name: create topic init helper
description: Create utility to initialize new topic folder with all stage folders and templates
status: Done
created_at: 2026-01-28
updated_at: 2026-01-28
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
dependencies: [0091]
tags: [wt-plugin, utility, technical-content-workflow, initialization]
---

## 0009. Create Topic Init Helper

### Background

The Topic Init Helper is a utility for quickly initializing new topic folders with the complete Technical Content Workflow structure. Instead of manually creating all stage folders and templates, users can run a single command to set up a new topic with all necessary folders and metadata files.

This utility reduces setup friction and ensures consistent topic structure across all content projects.

### Requirements

**Functional Requirements:**
- Accept collection name and topic name as input
- Create all stage folders (0-6) automatically
- Add metadata.yaml template to topic root
- Add publish-log.json template to topic root
- Create empty materials.json in 0-materials/
- Create empty sources.json in 1-research/

**Non-Functional Requirements:**
- Must not overwrite existing folders (safe initialization)
- Must be callable from anywhere in the project
- Must provide helpful output on completion
- Templates must be pre-populated with topic metadata

**Acceptance Criteria:**
- [ ] Command accepts collection name and topic name
- [ ] Command creates all 7 stage folders (0-materials/ through 6-publish/)
- [ ] metadata.yaml created with topic name and collection
- [ ] publish-log.json created with empty publications array
- [ ] materials.json created in 0-materials/
- [ ] sources.json created in 1-research/
- [ ] Command safe: does not overwrite existing folders
- [ ] Command reports created folders on completion

### Design

**Command Interface:**

```bash
# Within a collection folder
/wt:topic-init "My New Topic"

# With explicit collection name
/wt:topic-init --collection "Technical Tutorials" "AI Coding Guide"

# Help
/wt:topic-init --help
```

**Arguments:**

| Argument | Required | Description | Default |
|----------|----------|-------------|---------|
| `<topic_name>` | Yes | Name of the new topic (kebab-case recommended) | - |
| `--collection` | No | Collection name to create topic in | Current folder name |
| `--force` | No | Overwrite existing folders (dangerous) | false |
| `--template` | No | Template to use: default, minimal, comprehensive | `default` |
| `--help` | No | Show help message | - |

**Generated Folder Structure:**

```
[topic-name]/
├── 0-materials/
│   ├── materials.json
│   ├── source-1.md
│   └── materials-extracted.md
├── 1-research/
│   ├── sources.json
│   └── research-brief.md
├── 2-outline/
│   ├── outline-draft.md
│   └── outline-approved.md
├── 3-draft/
│   ├── draft-article.md
│   └── draft-revisions/
├── 4-illustration/
│   ├── images/
│   └── captions.json
├── 5-adaptation/
│   ├── article-twitter.md
│   ├── article-linkedin.md
│   ├── article-devto.md
│   └── article-medium.md
├── 6-publish/
│   ├── published/
│   ├── article.md
│   └── assets/
├── metadata.yaml
└── publish-log.json
```

**metadata.yaml Generated:**

```yaml
---
# Topic Metadata
name: topic-name
title: Human-Readable Topic Title
description: Brief description of the content topic
collection: collection-name
created_at: 2026-01-28
updated_at: 2026-01-28
status: draft
author:
  name: [User Name]
  email: [user@example.com]
tags: []
keywords: []
stage: 0
version: 1.0.0
review:
  last_reviewed_at: null
  reviewer: null
  status: pending
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

**publish-log.json Generated:**

```json
{
  "version": "1.0.0",
  "last_updated": "2026-01-28T10:00:00Z",
  "topic": "topic-name",
  "publications": [],
  "adaptations": [],
  "images": []
}
```

**materials.json Generated:**

```json
{
  "version": "1.0.0",
  "last_updated": "2026-01-28T10:00:00Z",
  "topic": "topic-name",
  "materials": []
}
```

**sources.json Generated:**

```json
{
  "version": "1.0.0",
  "last_updated": "2026-01-28T10:00:00Z",
  "topic": "topic-name",
  "sources": [],
  "research_type": null,
  "time_range": null,
  "confidence": null
}
```

**Output Example:**

```
Topic initialized: AI Coding Guide

Collection: Technical Tutorials
Created: 2026-01-28

Folders created:
- 0-materials/
- 1-research/
- 2-outline/
- 3-draft/
- 4-illustration/
- 5-adaptation/
- 6-publish/

Files created:
- metadata.yaml
- publish-log.json
- 0-materials/materials.json
- 1-research/sources.json

Next steps:
1. /wt:info-seek <source> --save    # Add research materials
2. /wt:info-research "topic"        # Conduct research
3. /wt:outline research-brief.md    # Generate outline
4. /wt:style-apply <profile> --file 2-outline/outline-approved.md  # Write draft
```

### Plan

**Phase 1: Command Structure**
- [ ] Create plugins/wt/commands/topic-init.md file
- [ ] Define command frontmatter with parameters
- [ ] Implement comprehensive command documentation

**Phase 2: Folder Creation Logic**
- [ ] Implement topic name validation
- [ ] Implement folder creation for stages 0-6
- [ ] Implement safe mode (no overwrite)
- [ ] Implement --force option for overwriting

**Phase 3: Template Generation**
- [ ] Implement metadata.yaml generation with placeholders
- [ ] Implement publish-log.json generation
- [ ] Implement materials.json generation
- [ ] Implement sources.json generation
- [ ] Support --template option (default, minimal, comprehensive)

**Phase 4: Output and UX**
- [ ] Implement progress output during creation
- [ ] Implement summary output on completion
- [ ] Implement "Next steps" suggestions
- [ ] Add helpful error messages

**Phase 5: Testing**
- [ ] Test with valid topic name
- [ ] Test with existing folder (safe mode)
- [ ] Test with --force option
- [ ] Test --template variations
- [ ] Verify all files created correctly

### Artifacts

| Type | Path | Generated By | Date |
|------|------|--------------|------|
| Command | plugins/wt/commands/topic-init.md | This task | 2026-01-28 |

### References

- [Task 0001](/docs/prompts/0001_repository_structure_setup.md) - Folder structure prerequisite
- [Task 0002](/docs/prompts/0002_create_wt-outline_command.md) - Uses stage folders
- [Task 0003](/docs/prompts/0003_create_wt-adapt_command.md) - Uses stage folders
- [Task 0006](/docs/prompts/0006_enhance_wt-info-seek_command.md) - Uses 0-materials/
- [Task 0007](/docs/prompts/0007_enhance_wt-info-research_command.md) - Uses 1-research/
