---
name: enhance wt-info-seek command
description: Update existing /wt:info-seek command with --aspect parameter and file-based workflow
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
tags: [wt-plugin, slash-command, enhancement, technical-content-workflow]
---

## 0006. Enhance /wt:info-seek Command

### Background

The `/wt:info-seek` command currently extracts and verifies knowledge from files, URLs, or search queries. This task enhances the command to support:
1. `--aspect` parameter for focused extraction (already partially implemented)
2. File-based workflow support for Technical Content Workflow
3. Saving output as materials-extracted.md to 0-materials/

These enhancements integrate info-seek more tightly with the Technical Content Workflow system.

### Requirements

**Functional Requirements:**
- Support `--aspect` parameter for focused extraction
- Save output as materials-extracted.md to 0-materials/
- Add file-based workflow support (accept materials-extracted.md as input)
- Auto-detect topic folder and use correct 0-materials/ path
- Generate materials.json index file

**Non-Functional Requirements:**
- Backward compatible with existing usage
- Output must include proper frontmatter for workflow tracking
- File paths must be resolved relative to topic folder

**Acceptance Criteria:**
- [ ] Existing --aspect parameter works as documented
- [ ] Command saves output to 0-materials/materials-extracted.md
- [ ] Auto-detects topic folder when run from within it
- [ ] materials.json index updated with extraction metadata
- [ ] File-based workflow supports reading from 0-materials/materials-extracted.md
- [ ] Command handles missing 0-materials/ folder gracefully

### Design

**Enhanced Command Interface:**

```bash
/wt:info-seek path/to/document.pdf [--aspect architecture] [--save]
```

**Enhanced Arguments:**

| Argument | Required | Description | Default |
|----------|----------|-------------|---------|
| `<input>` | Yes | File path, URL, or search description | - |
| `--aspect` | No | Aspect filter: architecture, performance, security, examples, API | - |
| `--save` | No | Save output to 0-materials/materials-extracted.md | false |
| `--output` | No | Custom output path | Auto-detected |
| `--help` | No | Show help message | - |

**Enhanced Workflow with --save:**

```
1. Parse command arguments (input, --aspect, --save, --output)
2. Detect topic folder:
   - If 0-materials/ exists in current path → use it
   - If running from topic root → use 0-materials/
   - Otherwise → create or ask user
3. Process input (file/URL/description) with rd2:knowledge-seeker
4. If --aspect provided, filter content accordingly
5. Generate materials-extracted.md with frontmatter:
   - source: original file/URL
   - aspect: --aspect value if provided
   - extracted_at: timestamp
   - topic: detected topic name
6. Update 0-materials/materials.json index
7. Report success with file path
```

**materials.json Index Format:**

```json
{
  "version": "1.0.0",
  "last_updated": "2026-01-28T10:00:00Z",
  "materials": [
    {
      "id": "mat-001",
      "file": "materials-extracted.md",
      "source": "research-paper.pdf",
      "source_type": "file",
      "aspect": "architecture",
      "extracted_at": "2026-01-28T10:00:00Z",
      "word_count": 1500,
      "confidence": "HIGH"
    },
    {
      "id": "mat-002",
      "file": "source-2.md",
      "source": "https://example.com/article",
      "source_type": "url",
      "aspect": null,
      "extracted_at": "2026-01-28T10:30:00Z",
      "word_count": 800,
      "confidence": "MEDIUM"
    }
  ]
}
```

**materials-extracted.md Frontmatter:**

```markdown
---
title: Extracted Materials: [Topic]
source: research-paper.pdf
source_type: file | url | description
aspect: architecture | performance | security | examples | API | null
extracted_at: 2026-01-28T10:00:00Z
topic: topic-name
word_count: 1500
confidence: HIGH | MEDIUM | LOW
---

# Extracted Materials: [Topic]

## Source

- **File**: research-paper.pdf
- **Type**: PDF Document
- **Extracted**: 2026-01-28

## Extracted Content

[Content extracted from source, filtered by --aspect if provided]

## Confidence

**Level**: HIGH
**Reasoning**: Verified from multiple sources

## Sources

- [Source 1](URL) | Verified: 2026-01-28
- [Source 2](URL) | Verified: 2026-01-28
```

### Plan

**Phase 1: Analyze Existing Command**
- [ ] Read existing /wt:info-seek command implementation
- [ ] Identify enhancement points for --save functionality
- [ ] Map existing --aspect behavior to workflow integration

**Phase 2: Add Save Functionality**
- [ ] Implement topic folder detection
- [ ] Implement 0-materials/ path resolution
- [ ] Implement materials.json index updating
- [ ] Implement materials-extracted.md generation with frontmatter

**Phase 3: Add File-Based Workflow**
- [ ] Implement reading from 0-materials/materials-extracted.md
- [ ] Implement aspect-based re-filtering of existing materials
- [ ] Add metadata extraction from frontmatter

**Phase 4: Testing**
- [ ] Test --save functionality in topic folder
- [ ] Test --save in non-topic folder (error handling)
- [ ] Test --aspect with --save combination
- [ ] Test reading existing materials-extracted.md
- [ ] Verify materials.json updates correctly

### Artifacts

| Type | Path | Generated By | Date |
|------|------|--------------|------|
| Enhanced Command | plugins/wt/commands/info-seek.md | This task | 2026-01-28 |

### References

- [Task 0001](/docs/prompts/0001_repository_structure_setup.md) - Folder structure prerequisite
- [Existing /wt:info-seek](/plugins/wt/commands/info-seek.md) - Current implementation
- [Existing /rd2:knowledge-seeker](/plugins/rd2/agents/knowledge-seeker.md) - Knowledge extraction agent
- [Task 0007](/docs/prompts/0007_enhance_wt-info-research_command.md) - Related enhancement
