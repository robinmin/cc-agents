# Repository Documentation

This repository contains technical content organized using the Technical Content Workflow system.

## Folder Structure

### Collections (`repository/collections/`)

Collections are logical groupings of related topics. Each collection has:
- `.topic.md` - Collection metadata
- `README.md` - Collection documentation
- `topics/` - Individual topic folders

### Stages (`0-materials/` through `6-publish/`)

Content progresses through these stages:

| Stage | Folder | Purpose |
|-------|--------|---------|
| 0 | `0-materials/` | Raw research materials and sources |
| 1 | `1-research/` | Research outputs and analysis |
| 2 | `2-outline/` | Content outlines and structure |
| 3 | `3-draft/` | Article drafts and revisions |
| 4 | `4-illustration/` | Images, diagrams, visual aids |
| 5 | `5-adaptation/` | Platform-specific adaptations |
| 6 | `6-publish/` | Final published versions |

## Metadata Files

Each topic folder contains:
- `topic.md` - Topic metadata and tracking
- `publish-log.json` - Publication history

## Collections

Collections are indexed in `repository/collections.json` and provide:
- Logical grouping of related topics
- Shared tags and categorization
- Collection-level statistics

## Usage

### Creating a New Topic

1. Initialize using the Topic Init Helper: `/rd2:topic-init`
2. Select or create a collection
3. Follow the stage progression workflow

### Tracking Progress

- Update `topic.md` with current stage
- Record publications in `publish-log.json`
- Update collection counts in `collections.json`

## Best Practices

- Keep each topic focused on a single subject
- Use consistent naming conventions
- Track all sources and references
- Review content before advancing stages
- Maintain publication history
