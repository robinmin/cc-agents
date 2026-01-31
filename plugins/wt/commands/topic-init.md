---
description: Initialize new topic folder with all stage folders and templates
subagents: []
model: sonnet
argument-hint: <topic-name> [--collection <name>] [--force]
allowed-tools: [Read, Write, Edit]
arguments:
  collection:
    description: Collection name to create topic in (default: current folder name)
    required: false
    type: string
  force:
    description: Overwrite existing folders (dangerous)
    required: false
    type: boolean
  template:
    description: Template to use - default, minimal, comprehensive
    required: false
    type: string
---

# Topic Init

Initialize new topic folders with the complete Technical Content Workflow structure. Creates all stage folders and templates with a single command.

## Quick Start

```bash
/wt:topic-init "my-new-topic"                           # Basic initialization
/wt:topic-init "ai-guide" --collection "Tech Tutorials" # With collection
/wt:topic-init "update-guide" --force                   # Overwrite existing
/wt:topic-init "minimal-topic" --template minimal       # Minimal template
```

## When to Use

Use this command when:

- **Starting new content** - Create complete topic structure
- **Consistent setup** - Ensure all topics follow workflow
- **Template-based creation** - Quick setup with defaults
- **Collection organization** - Organize topics by collection

**Not for:**
- Single file creation -> Create file directly
- Modifying existing topics -> Use individual commands
- Research workflows -> Use `/wt:info-research`

## Arguments

| Argument | Required | Description | Default |
|----------|----------|-------------|---------|
| `<topic_name>` | Yes | Name of new topic (kebab-case recommended) | - |
| `--collection` | No | Collection name for topic | Current folder |
| `--force` | No | Overwrite existing folders | `false` |
| `--template` | No | Template: default, minimal, comprehensive | `default` |
| `--help` | No | Show help message | - |

## Generated Folder Structure

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

## Template Options

### Default Template

Creates all stage folders with empty placeholder files and basic metadata.

**Use for:** Standard content projects

### Minimal Template

Creates only essential folders and files (metadata.yaml, publish-log.json, materials.json, sources.json).

**Use for:** Quick prototyping, simple topics

### Comprehensive Template

Creates all folders with example content and detailed templates.

**Use for:** Learning workflow, complex topics

## metadata.yaml Generated

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

## publish-log.json Generated

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

## materials.json Generated

```json
{
  "version": "1.0.0",
  "last_updated": "2026-01-28T10:00:00Z",
  "topic": "topic-name",
  "materials": []
}
```

## sources.json Generated

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

## Output Example

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
3. /wt:topic-outline research-brief.md    # Generate outline
4. /wt:topic-draft <profile> --file 2-outline/outline-approved.md  # Write draft
```

## Implementation

This command implements topic initialization:

```python
# Topic initialization pseudocode
TEMPLATES = ["default", "minimal", "comprehensive"]

def init_topic(topic_name, collection=None, force=False, template="default"):
    # 1. Validate inputs
    if not topic_name or topic_name.strip() == "":
        raise ValueError("Topic name cannot be empty")

    if template not in TEMPLATES:
        raise ValueError(f"Invalid template: {template}. Use: {TEMPLATES}")

    # 2. Check for existing folder
    if os.path.exists(topic_name) and not force:
        raise ValueError(f"Topic folder '{topic_name}' already exists. Use --force to overwrite.")

    # 3. Determine collection name
    collection_name = collection or get_current_folder_name()

    # 4. Create folder structure
    folders = [
        "0-materials",
        "1-research",
        "2-outline",
        "3-draft",
        "4-illustration/images",
        "5-adaptation",
        "6-publish/published",
        "6-publish/assets",
        "3-draft/draft-revisions"
    ]

    for folder in folders:
        folder_path = os.path.join(topic_name, folder)
        os.makedirs(folder_path, exist_ok=True)

    # 5. Generate metadata.yaml
    generate_metadata(topic_name, collection_name)

    # 6. Generate publish-log.json
    generate_publish_log(topic_name)

    # 7. Generate stage-specific files
    if template in ["default", "comprehensive"]:
        generate_materials_json(topic_name)
        generate_sources_json(topic_name)
        generate_placeholder_files(topic_name, template)

    # 8. Print summary
    print_summary(topic_name, collection_name, folders)

    return topic_name
```

## Error Handling

### Common Issues

**1. Empty topic name**
```
Error: Topic name cannot be empty

Please provide a name for the new topic.
```

**2. Topic already exists**
```
Error: Topic folder 'my-topic' already exists

Use --force to overwrite or choose a different name.
```

**3. Invalid template**
```
Error: Invalid template 'custom'. Use: default, minimal, comprehensive
```

**4. Invalid folder name**
```
Error: Invalid topic name 'My Topic'

Use kebab-case (e.g., 'my-topic', 'ai-coding-guide')
```

## Validation

Before initialization:

- [ ] Topic name is valid (kebab-case recommended)
- [ ] Template is valid
- [ ] If folder exists, --force is provided
- [ ] Write access to current directory

## Best Practices

### DO

- [ ] Use kebab-case for topic names
- [ ] Use --collection for organization
- [ ] Review generated metadata.yaml
- [ ] Follow the "Next steps" suggestions

### DON'T

- [ ] Use spaces or special characters in topic names
- [ ] Overwrite existing topics without --force
- [ ] Skip metadata review
- [ ] Create topics outside collections

## Examples

**Example 1: Basic initialization**

```bash
/wt:topic-init "microservices-guide"
```

Creates complete topic structure with default template

**Example 2: With collection**

```bash
/wt:topic-init "react-hooks" --collection "Frontend Development"
```

Creates topic in "Frontend Development" collection

**Example 3: Minimal template**

```bash
/wt:topic-init "quick-note" --template minimal
```

Creates essential files only

**Example 4: Force overwrite**

```bash
/wt:topic-init "update-guide" --force
```

Overwrites existing topic folder (careful!)

## Integration with Workflow

**Typical workflow:**

1. `/wt:topic-init "new-topic"` - Create topic structure
2. `/wt:info-seek <sources> --save` - Add research materials
3. `/wt:info-research "topic"` - Conduct research
4. `/wt:topic-outline research-brief.md` - Generate outline
5. `/wt:topic-draft <profile> --file outline-approved.md` - Write draft
6. `/wt:topic-illustrate "diagram"` - Add illustrations
7. `/wt:topic-adapt --platform twitter` - Adapt for social
8. `/wt:topic-publish --platform blog` - Publish

## Related Commands

- `/wt:info-seek` - Add research materials
- `/wt:info-research` - Conduct research
- `/wt:topic-outline` - Generate outline
- `/wt:topic-draft` - Write draft
- `/wt:topic-create` - Full 7-stage workflow

---

**Remember**: Topics are organized by collection. Use --collection for better organization.
