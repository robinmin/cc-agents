---
name: create wt-adapt command
description: Create slash command for adapting content to different platforms (twitter, linkedin, devto, medium)
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
tags: [wt-plugin, slash-command, technical-content-workflow, adaptation]
---

## 0093. Create /wt:doc-adapt Command

### Background

The `/wt:doc-adapt` command adapts final article Markdown content for different publishing platforms. Each platform has unique requirements for length, tone, formatting, and structure. This command transforms a single source article into platform-specific adaptations, enabling efficient multi-platform publishing.

Platform adaptations are critical for maximizing content reach while respecting each platform's conventions and audience expectations.

### Requirements

**Functional Requirements:**
- Accept final article Markdown as input
- Support `--platform` parameter: `twitter` | `linkedin` | `devto` | `medium`
- Adapt content length, tone, and formatting for target platform
- Output adapted article as article-[platform].md
- Save output to 5-adaptation/ folder

**Non-Functional Requirements:**
- Adaptations must maintain core message integrity
- Platform-specific conventions must be respected
- Output must be ready for direct publishing

**Acceptance Criteria:**
- [ ] Command accepts article Markdown file path as input
- [ ] --platform twitter generates tweet-thread format (max 280 chars/tweet)
- [ ] --platform linkedin generates professional post format (3000 chars)
- [ ] --platform devto generates dev community article format
- [ ] --platform medium generates medium-style article format
- [ ] Output saved to 5-adaptation/article-[platform].md
- [ ] Adaptations preserve source attribution
- [ ] Platform character/format limits are respected

### Design

**Command Interface:**

```bash
/wt:adapt path/to/article.md --platform <platform>
```

**Arguments:**

| Argument | Required | Description | Default |
|----------|----------|-------------|---------|
| `<article>` | Yes | Path to final article Markdown file | - |
| `--platform` | Yes | Target platform: twitter, linkedin, devto, medium | - |
| `--help` | No | Show help message | - |

**Platform Specifications:**

| Platform | Max Length | Tone | Format | Notes |
|----------|------------|------|--------|-------|
| **Twitter** | 280 chars/tweet | Conversational | Thread (5-10 tweets) | Thread numbering, hashtags |
| **LinkedIn** | 3000 chars | Professional | Single post | Professional hook, call-to-action |
| **Dev.to** | No limit | Technical | Article with code blocks | Tags, canonical URL support |
| **Medium** | No limit | Narrative | Article | Header images, highlights support |

**Adaptation Strategies:**

**Twitter Thread Adaptation:**
```
- Extract 5-10 key points from article
- Each tweet: Hook + Key Point + Brief Example
- Thread starter: Engaging hook
- Number tweets (1/X, 2/X, etc.)
- Add relevant hashtags at end
- Include link to full article
```

**LinkedIn Post Adaptation:**
```
- Professional hook (first 2-3 lines)
- Key insights in bullet points
- Personal experience angle
- Clear call-to-action
- Relevant hashtags (3-5)
```

**Dev.to Article Adaptation:**
```
- Preserve code blocks and syntax highlighting
- Add Dev.to specific frontmatter
- Include tags for discoverability
- Add canonical URL field
- Optimize for developer audience
```

**Medium Article Adaptation:**
```
- Preserve narrative flow
- Add section headers
- Support for bold/italic emphasis
- Include inline links
- Header image recommendation

```

**Output File Format:**

```markdown
---
title: [Original Title] - [Platform] Adaptation
source: ../article.md
platform: twitter | linkedin | devto | medium
created_at: 2026-01-28
original_length: X words
adapted_length: Y characters
---

# [Platform] Adaptation: [Title]

## Metadata
- **Original Source**: article.md
- **Platform**: [Platform]
- **Created**: 2026-01-28
- **Word Count**: XXX

## Adapted Content

[Platform-specific adapted content]

## Source Attribution

This adaptation is based on: [Original Article Title]
```

### Plan

**Phase 1: Command Structure**
- [ ] Create plugins/wt/commands/adapt.md file
- [ ] Define command frontmatter with platform options
- [ ] Implement comprehensive command documentation

**Phase 2: Platform Logic**
- [ ] Implement Twitter thread adaptation logic
- [ ] Implement LinkedIn post adaptation logic
- [ ] Implement Dev.to article adaptation logic
- [ ] Implement Medium article adaptation logic

**Phase 3: Content Processing**
- [ ] Parse source article structure
- [ ] Extract key points for each platform
- [ ] Apply platform-specific formatting rules
- [ ] Respect character/format limits

**Phase 4: Output Handling**
- [ ] Resolve 5-adaptation/ folder path
- [ ] Write article-[platform].md with metadata
- [ ] Add source attribution to output

**Phase 5: Testing**
- [ ] Test each platform adaptation
- [ ] Verify character count limits
- [ ] Validate format conventions
- [ ] Test with various article lengths

### Artifacts

| Type | Path | Generated By | Date |
|------|------|--------------|------|
| Command | plugins/wt/commands/adapt.md | This task | 2026-01-28 |

### References

- [Task 0001](/docs/prompts/0001_repository_structure_setup.md) - Folder structure prerequisite
- [Task 0008](/docs/prompts/0008_enhance_wt-style-apply_command.md) - Produces final article
- [Task 0005](/docs/prompts/0005_create_wt-publish_command.md) - Uses adaptations for publishing
- [Existing /wt:style-apply](/plugins/wt/commands/style-apply.md) - Style application reference
- [Existing /wt:translate](/plugins/wt/commands/translate.md) - Content transformation reference
