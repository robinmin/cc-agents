---
description: Publish content to blogs and social platforms (Stage 6 of Technical Content Workflow)
argument-hint: <file-path> --platform <platform> [--dry-run]
---

# Topic Publish

Publish content to various platforms. This command is Stage 6 of the Technical Content Workflow.

For full documentation, see: `plugins/wt/skills/technical-content-creation/SKILL.md`

## Quick Start

```bash
/wt:topic-publish path/to/article.md --platform blog                        # Blog (git push)
/wt:topic-publish path/to/article.md --platform twitter                     # Twitter (clipboard)
/wt:topic-publish path/to/article.md --platform linkedin                    # LinkedIn (clipboard)
/wt:topic-publish path/to/article.md --platform all                         # All platforms
/wt:topic-publish path/to/article.md --platform blog --dry-run             # Preview git workflow
```

## Usage

This command invokes the `technical-content-creation` skill to publish content:

```python
Task(skill="wt:technical-content-creation",
    prompt="Publish content to platform
            Source: {file_path}
            Platform: {platform}
            Dry run: {dry_run}
            Custom message: {message}
            Output folder: 6-publish/")
```

## Platform Behaviors

| Platform | Action | Output |
|----------|--------|--------|
| `blog` | Git add -> commit -> push | Blog repository updated |
| `twitter` | Convert to HTML -> clipboard | Ready for manual tweet |
| `linkedin` | Convert to HTML -> clipboard | Ready for manual post |
| `devto` | Convert to HTML -> clipboard | Ready for manual import |
| `medium` | Convert to HTML -> clipboard | Ready for manual import |
| `all` | Execute all above | Multi-platform ready |

## Stages

This is Stage 6 of the 7-stage Technical Content Workflow:

- Stage 0: `/wt:info-seek` - Extract materials
- Stage 1: `/wt:info-research` - Conduct research
- Stage 2: `/wt:topic-outline` - Generate outline
- Stage 3: `/wt:topic-draft` - Write draft
- Stage 4: `/wt:topic-illustrate` - Generate illustrations
- Stage 5: `/wt:topic-adapt` - Adapt content
- **Stage 6: `/wt:topic-publish`** - Publish (this command)

## Related Commands

- `/wt:topic-adapt` - Adapt for platforms (prerequisite)
- `/wt:topic-init` - Initialize topic structure
- `/wt:topic-create` - Full 7-stage workflow

## See Also

- **Full Skill**: `plugins/wt/skills/technical-content-creation/SKILL.md`
- **Subagent**: `wt:it-writer` for full workflow orchestration
