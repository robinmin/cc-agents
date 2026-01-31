---
name: enhance wt-info-research command
description: Update existing /wt:info-research command with file input support and 1-research/ output
status: Done
created_at: 2026-01-28
updated_at: 2026-01-28
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
dependencies: [0091, 0096]
tags: [wt-plugin, slash-command, enhancement, technical-content-workflow]
---

## 0007. Enhance /wt:info-research Command

### Background

The `/wt:info-research` command currently conducts systematic research on topics. This task enhances the command to:
1. Accept optional input file (materials-extracted.md from 0-materials/)
2. Save research-brief.md to 1-research/ folder
3. Support both topic string and file-based input
4. Auto-detect topic folder and use correct 1-research/ path

These enhancements integrate info-research more tightly with the Technical Content Workflow system.

### Requirements

**Functional Requirements:**
- Accept optional input file (materials-extracted.md) for context
- Accept topic string as input (existing behavior)
- If file provided, extract research topics from it
- Save research-brief.md to 1-research/ folder
- Auto-detect topic folder for 1-research/ path
- Update sources.json index file

**Non-Functional Requirements:**
- Backward compatible with existing usage (topic string only)
- File input must be optional (existing behavior preserved)
- Output must include proper frontmatter for workflow tracking

**Acceptance Criteria:**
- [ ] Command accepts topic string as input (existing behavior)
- [ ] Command accepts --file materials-extracted.md as input
- [ ] File-based input extracts key topics for research
- [ ] Output saved to 1-research/research-brief.md
- [ ] Auto-detects topic folder when run from within it
- [ ] sources.json index updated with research sources
- [ ] Backward compatibility maintained

### Design

**Enhanced Command Interface:**

```bash
/wt:info-research "machine learning interpretability" [--file materials-extracted.md] [--save]
```

**Enhanced Arguments:**

| Argument | Required | Description | Default |
|----------|----------|-------------|---------|
| `<topic>` | Yes* | Research topic or question | - |
| `--file` | Yes* | Input file for context (materials-extracted.md) | - |
| `--type` | No | Research type: systematic, rapid, meta-analysis, fact-check | `systematic` |
| `--years` | No | Time range in years | `5` |
| `--format` | No | Output format: markdown, report, brief | `markdown` |
| `--save` | No | Save output to 1-research/research-brief.md | true (auto) |
| `--help` | No | Show help message | - |

*Either `<topic>` or `--file` must be provided

**Enhanced Workflow:**

```
1. Parse command arguments
2. Detect topic folder for 1-research/ path
3. Input processing:
   IF --file provided:
     - Read materials-extracted.md
     - Extract key topics, keywords, aspects from content
     - Use extracted topics as research focus
   ELSE:
     - Use <topic> string directly
4. Execute research using wt:super-researcher
5. Generate research-brief.md with frontmatter:
   - source_materials: materials-extracted.md (if provided)
   - research_type: --type value
   - time_range: --years value
   - topics: researched topics
6. Update 1-research/sources.json index
7. Report success with file path
```

**sources.json Index Format:**

```json
{
  "version": "1.0.0",
  "last_updated": "2026-01-28T10:00:00Z",
  "sources": [
    {
      "id": "src-001",
      "title": "Research Paper Title",
      "url": "https://example.com/paper",
      "type": "academic | web | documentation",
      "cited_in": "research-brief.md",
      "added_at": "2026-01-28T10:00:00Z"
    }
  ],
  "research_type": "systematic",
  "time_range": "2021-2026",
  "confidence": "HIGH"
}
```

**research-brief.md Frontmatter:**

```markdown
---
title: Research Brief: [Topic]
source_materials: 0-materials/materials-extracted.md
research_type: systematic
time_range: 2021-2026
topics:
  - topic-1
  - topic-2
  - topic-3
created_at: 2026-01-28T10:00:00Z
status: draft | approved
confidence: HIGH | MEDIUM | LOW
sources_count: 25
---

# Research Brief: [Topic]

## Executive Summary

[3-5 key findings with confidence levels]

## Research Parameters

- **Type**: systematic
- **Time Range**: 2021-2026
- **Sources**: 25 sources
- **Confidence**: HIGH

## Key Findings

### Theme 1: [Category]

- Finding 1 [HIGH confidence]
- Finding 2 [MEDIUM confidence]

## Methodology

[Research methodology description]

## Sources

- [Source 1](URL) | Verified: 2026-01-28
- [Source 2](URL) | Verified: 2026-01-28
```

### Plan

**Phase 1: Analyze Existing Command**
- [ ] Read existing /wt:info-research command implementation
- [ ] Identify enhancement points for file input and save functionality
- [ ] Map existing behavior to workflow integration

**Phase 2: Add File Input Support**
- [ ] Implement --file parameter parsing
- [ ] Implement materials-extracted.md reading
- [ ] Implement topic extraction from file content
- [ ] Add priority: --file > <topic> for research focus

**Phase 3: Add Save Functionality**
- [ ] Implement 1-research/ path detection
- [ ] Implement research-brief.md generation with frontmatter
- [ ] Implement sources.json index updating
- [ ] Add automatic save when in topic folder

**Phase 4: Testing**
- [ ] Test with topic string only (existing behavior)
- [ ] Test with --file input
- [ ] Test auto-detection of topic folder
- [ ] Test sources.json updates
- [ ] Verify backward compatibility

### Artifacts

| Type | Path | Generated By | Date |
|------|------|--------------|------|
| Enhanced Command | plugins/wt/commands/info-research.md | This task | 2026-01-28 |

### References

- [Task 0001](/docs/prompts/0001_repository_structure_setup.md) - Folder structure prerequisite
- [Task 0006](/docs/prompts/0006_enhance_wt-info-seek_command.md) - Produces materials-extracted.md
- [Task 0002](/docs/prompts/0002_create_wt-outline_command.md) - Consumes research-brief.md
- [Existing /wt:info-research](/plugins/wt/commands/info-research.md) - Current implementation
- [Existing /wt:super-researcher](/plugins/wt/agents/super-researcher.md) - Research agent
