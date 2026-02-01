---
description: Generate structured content outlines from research briefs (Stage 2 of Technical Content Workflow)
argument-hint: <research-brief-path> [--length short|long]
---

# Topic Outline

Generate structured content outlines from research briefs. This command is Stage 2 of the Technical Content Workflow.

For full documentation, see: `plugins/wt/skills/technical-content-creation/SKILL.md`

## Quick Start

```bash
/wt:topic-outline path/to/research-brief.md                           # Short outline (default)
/wt:topic-outline path/to/research-brief.md --length long            # Detailed outline
```

## Usage

This command invokes the `technical-content-creation` skill to generate outlines:

```python
Task(skill="wt:technical-content-creation",
    prompt="Generate outline from research brief
            Input: {research_brief_path}
            Length: {short|long}
            Output folder: 2-outline/")
```

## Stages

This is Stage 2 of the 7-stage Technical Content Workflow:

- Stage 0: `/wt:info-seek` - Extract materials
- Stage 1: `/wt:info-research` - Conduct research
- **Stage 2: `/wt:topic-outline`** - Generate outline (this command)
- Stage 3: `/wt:topic-draft` - Write draft
- Stage 4: `/wt:topic-illustrate` - Generate illustrations
- Stage 5: `/wt:topic-adapt` - Adapt content
- Stage 6: `/wt:topic-publish` - Publish

## Related Commands

- `/wt:info-research` - Generate research brief (prerequisite)
- `/wt:topic-draft` - Write draft from outline (next stage)
- `/wt:topic-init` - Initialize topic structure
- `/wt:topic-create` - Full 7-stage workflow

## See Also

- **Full Skill**: `plugins/wt/skills/technical-content-creation/SKILL.md`
