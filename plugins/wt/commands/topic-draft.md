---
description: Apply a saved writing style profile to content generation (Stage 3 of Technical Content Workflow)
argument-hint: <profile_id> [<topic> | --file <path>] [--revise] [--save]
---

# Topic Draft

Apply a saved writing style profile to generate content. This command is Stage 3 of the Technical Content Workflow.

For full documentation, see: `plugins/wt/skills/technical-content-creation/SKILL.md`

## Quick Start

```bash
/wt:topic-draft technical-writer "How to use AI coding tools"           # Generate from topic
/wt:topic-draft technical-writer --file 2-outline/outline-approved.md  # Generate from outline
/wt:topic-draft technical-writer --file 3-draft/draft-article.md --revise  # Revise existing draft
```

## Usage

This command invokes the `technical-content-creation` skill to apply writing styles:

```python
Task(skill="wt:technical-content-creation",
    prompt="Apply style to generate content
            Profile: {profile_id}
            Topic: {topic}
            Source file: {file_path}
            Revision mode: {revise}
            Output folder: 3-draft/")
```

## Modes

| Mode | Command | Output |
|------|---------|--------|
| Topic | `/wt:topic-draft profile "Topic"` | New content |
| Outline | `/wt:topic-draft profile --file 2-outline/outline-approved.md` | Full article |
| Revision | `/wt:topic-draft profile --file 3-draft/draft-article.md --revise` | Improved draft |

## Stages

This is Stage 3 of the 7-stage Technical Content Workflow:

- Stage 0: `/wt:info-seek` - Extract materials
- Stage 1: `/wt:info-research` - Conduct research
- Stage 2: `/wt:topic-outline` - Generate outline (prerequisite)
- **Stage 3: `/wt:topic-draft`** - Write draft (this command)
- Stage 4: `/wt:topic-illustrate` - Generate illustrations
- Stage 5: `/wt:topic-adapt` - Adapt content
- Stage 6: `/wt:topic-publish` - Publish

## Related Commands

- `/wt:topic-outline` - Generate outline (prerequisite)
- `/wt:topic-illustrate` - Add illustrations (next stage)
- `/wt:topic-init` - Initialize topic structure
- `/wt:topic-create` - Full 7-stage workflow

## See Also

- **Full Skill**: `plugins/wt/skills/technical-content-creation/SKILL.md`
