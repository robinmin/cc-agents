---
description: Adapt article content for different publishing platforms (Stage 5 of Technical Content Workflow)
argument-hint: <article-path> --platform <platform>
---

# Topic Adapt

Adapt article content for different publishing platforms. This command is Stage 5 of the Technical Content Workflow.

For full documentation, see: `plugins/wt/skills/technical-content-creation/SKILL.md`

## Quick Start

```bash
/wt:topic-adapt path/to/article.md --platform twitter      # Twitter thread
/wt:topic-adapt path/to/article.md --platform linkedin     # LinkedIn post
/wt:topic-adapt path/to/article.md --platform devto        # Dev.to article
/wt:topic-adapt path/to/article.md --platform medium       # Medium article
```

## Usage

This command invokes the `technical-content-creation` skill to adapt content:

```python
Task(skill="wt:technical-content-creation",
    prompt="Adapt content for platform
            Source: {article_path}
            Platform: {platform}
            Output folder: 5-adaptation/")
```

## Platform Specifications

| Platform | Max Length | Tone | Format |
|----------|------------|------|--------|
| `twitter` | 280 chars/tweet | Conversational | Thread (5-10 tweets) |
| `linkedin` | 3000 chars | Professional | Single post |
| `devto` | No limit | Technical | Article with code blocks |
| `medium` | No limit | Narrative | Article |

## Stages

This is Stage 5 of the 7-stage Technical Content Workflow:

- Stage 0: `/wt:info-seek` - Extract materials
- Stage 1: `/wt:info-research` - Conduct research
- Stage 2: `/wt:topic-outline` - Generate outline
- Stage 3: `/wt:topic-draft` - Write draft
- Stage 4: `/wt:topic-illustrate` - Generate illustrations
- **Stage 5: `/wt:topic-adapt`** - Adapt content (this command)
- Stage 6: `/wt:topic-publish` - Publish

## Related Commands

- `/wt:topic-draft` - Write draft (prerequisite)
- `/wt:topic-publish` - Publish adaptations (next stage)
- `/wt:topic-init` - Initialize topic structure
- `/wt:topic-create` - Full 7-stage workflow

## See Also

- **Full Skill**: `plugins/wt/skills/technical-content-creation/SKILL.md`
- **Subagent**: `wt:tc-writer` for full workflow orchestration
