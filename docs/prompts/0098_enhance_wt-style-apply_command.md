---
name: enhance wt-style-apply command
description: Update existing /wt:style-apply command with --file parameter and 3-draft/ output
status: Done
created_at: 2026-01-28
updated_at: 2026-01-28
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
dependencies: [0091, 0092]
tags: [wt-plugin, slash-command, enhancement, technical-content-workflow]
---

## 0098. Enhance /wt:doc-style Command

### Background

The `/wt:doc-style` command currently applies saved writing style profiles to content generation. This task enhances the command to:
1. Support `--file` parameter for outline input
2. Save draft-article.md to 3-draft/ folder
3. Support reading from 2-outline/outline-approved.md
4. Auto-detect topic folder for 3-draft/ path

These enhancements integrate style-apply with the Technical Content Workflow system, enabling outline-to-draft conversion with style preservation.

### Requirements

**Functional Requirements:**
- Support `--file` parameter for outline input (outline-approved.md)
- Support `--file` parameter for draft revision (existing draft-article.md)
- Save draft-article.md to 3-draft/ folder
- Support reading from 2-outline/outline-approved.md
- Auto-detect topic folder for 3-draft/ path
- Update draft-revisions/ for iterative improvements

**Non-Functional Requirements:**
- Backward compatible with existing usage (profile_id + topic string)
- Output must include proper frontmatter for workflow tracking
- Style profile must be preserved during draft generation

**Acceptance Criteria:**
- [ ] Command accepts profile_id + topic string (existing behavior)
- [ ] Command accepts profile_id + --file outline-approved.md
- [ ] Command accepts profile_id + --file draft-article.md (for revision)
- [ ] Output saved to 3-draft/draft-article.md
- [ ] Auto-detects topic folder when run from within it
- [ ] draft-revisions/ created for version tracking
- [ ] Backward compatibility maintained

### Design

**Enhanced Command Interface:**

```bash
/wt:style-apply technical-writer "How to use AI coding tools" [--save]
/wt:style-apply technical-writer --file 2-outline/outline-approved.md [--save]
/wt:style-apply technical-writer --file 3-draft/draft-article.md --revise [--save]
```

**Enhanced Arguments:**

| Argument | Required | Description | Default |
|----------|----------|-------------|---------|
| `<profile_id>` | Yes | Style profile identifier | - |
| `<topic>` | Yes* | Content topic to write about | - |
| `--file` | Yes* | Input file: outline or existing draft | Auto-detect |
| `--revise` | No | Flag for revision mode (with --file on draft) | false |
| `--save` | No | Save output to 3-draft/draft-article.md | true (auto) |
| `--output` | No | Custom output path | Auto-detected |
| `--help` | No | Show help message | - |

*Either `<topic>` or `--file` must be provided

**Enhanced Workflow:**

```
1. Parse command arguments (profile_id, topic, --file, --revise, --save)
2. Detect topic folder for 3-draft/ path
3. Load style profile (existing behavior)
4. Input processing:
   IF --file provided:
     IF file is outline (2-outline/outline-approved.md):
       - Read outline structure
       - Use sections as content guide
       - Generate draft from outline
     IF file is draft (3-draft/draft-article.md):
       IF --revise:
         - Apply style to improve existing draft
         - Save to draft-revisions/
       ELSE:
         - Warn: use --revise for draft revision
   ELSE:
     - Use <topic> string directly (existing behavior)
5. Generate draft-article.md with frontmatter:
   - style_profile: profile_id
   - source_outline: 2-outline/outline-approved.md (if applicable)
   - topic: content topic
   - version: draft number
6. Update 3-draft/ folder structure
7. Report success with file path
```

**3-draft/ Folder Structure:**

```
3-draft/
├── draft-article.md         # Current draft
├── draft-article_v1.md      # Previous versions
├── draft-article_v2.md
└── draft-revisions/
    ├── revision-001.md      # Minor revisions
    ├── revision-002.md
    └── style-notes.md        # Style application notes
```

**draft-article.md Frontmatter:**

```markdown
---
title: Draft: [Article Title]
style_profile: technical-writer
source_outline: 2-outline/outline-approved.md
topic: How to use AI coding tools
version: 1
created_at: 2026-01-28T10:00:00Z
updated_at: 2026-01-28T10:30:00Z
status: draft | review | approved
style_notes:
  - tone: formal
  - vocabulary: technical
  - structure: hierarchical
---

# Draft: [Article Title]

[Generated content following style profile]

## Style Application Notes

- **Tone**: Formal and professional
- **Vocabulary**: Technical terminology appropriate for developers
- **Structure**: Hierarchical with clear sections

---
*Generated with style profile: technical-writer*
*From outline: 2-outline/outline-approved.md*
```

### Plan

**Phase 1: Analyze Existing Command**
- [ ] Read existing /wt:style-apply command implementation
- [ ] Identify enhancement points for --file and save functionality
- [ ] Map existing behavior to workflow integration

**Phase 2: Add File Input Support**
- [ ] Implement --file parameter parsing
- [ ] Implement outline file detection and parsing
- [ ] Implement draft file detection and revision mode
- [ ] Add outline-to-draft generation logic

**Phase 3: Add Save Functionality**
- [ ] Implement 3-draft/ path detection
- [ ] Implement draft-article.md generation with frontmatter
- [ ] Implement draft-revisions/ folder management
- [ ] Add version tracking for drafts

**Phase 4: Testing**
- [ ] Test with topic string only (existing behavior)
- [ ] Test with --file outline-approved.md
- [ ] Test with --file draft-article.md --revise
- [ ] Test auto-detection of topic folder
- [ ] Verify version tracking works correctly
- [ ] Verify backward compatibility

### Artifacts

| Type | Path | Generated By | Date |
|------|------|--------------|------|
| Enhanced Command | plugins/wt/commands/style-apply.md | This task | 2026-01-28 |

### References

- [Task 0001](/docs/prompts/0001_repository_structure_setup.md) - Folder structure prerequisite
- [Task 0002](/docs/prompts/0002_create_wt-outline_command.md) - Produces outline-approved.md
- [Task 0005](/docs/prompts/0005_create_wt-publish_command.md) - Consumes draft-article.md
- [Existing /wt:style-apply](/plugins/wt/commands/style-apply.md) - Current implementation
- [Existing /wt:style-extractor](/plugins/wt/commands/style-extractor.md) - Style extraction reference
