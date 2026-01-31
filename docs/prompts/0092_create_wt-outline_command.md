---
name: create wt-outline command
description: Create slash command for generating structured outlines from research briefs
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
tags: [wt-plugin, slash-command, technical-content-workflow, outline]
---

## 0092. Create /wt:doc-outline Command

### Background

The `/wt:doc-outline` command generates structured content outlines from research briefs. It bridges the gap between research (stage 1) and drafting (stage 3) by transforming raw research findings into organized article structures. This command is a core component of the Technical Content Workflow system.

The command takes research-brief.md as input and outputs outline-draft.md, supporting both short-form and long-form content with appropriate human review requirements.

### Requirements

**Functional Requirements:**
- Accept research-brief.md as input (from 1-research/ folder)
- Support `--length` parameter with values: `short` | `long`
- Generate structured outline based on research findings
- For long-form outlines, emphasize human review requirement
- Output outline-draft.md to 2-outline/ folder
- Follow consistent outline structure and formatting

**Non-Functional Requirements:**
- Output must be machine-parseable for downstream processing
- Outline structure must accommodate various content types
- Error messages must be actionable and helpful

**Acceptance Criteria:**
- [ ] Command accepts research-brief.md path as input
- [ ] --length short generates concise outline (3-5 sections)
- [ ] --length long generates detailed outline (8+ sections with subsections)
- [ ] Long-form output includes prominent human review requirement notice
- [ ] Output saved to 2-outline/outline-draft.md
- [ ] Command handles missing input files gracefully
- [ ] Command validates research-brief.md format

### Design

**Command Interface:**

```bash
/wt:doc-outline path/to/research-brief.md [--length short|long]
```

**Arguments:**

| Argument | Required | Description | Default |
|----------|----------|-------------|---------|
| `<research-brief>` | Yes | Path to research-brief.md file | - |
| `--length` | No | Outline length: short (3-5 sections) or long (8+ sections with subsections) | `short` |
| `--help` | No | Show help message | - |

**Input File Format (research-brief.md):**

```markdown
# Research: [Topic]

## Executive Summary

[3-5 key findings]

## Key Findings

### Theme 1: [Category]

- Finding 1
- Finding 2

## Confidence

**Level**: HIGH/MEDIUM/LOW
**Sources**: N sources
```

**Output File Format (outline-draft.md):**

```markdown
---
title: Outline: [Topic]
source: research-brief.md
created_at: 2026-01-28
length: short | long
status: draft | approved
---

# Outline: [Topic]

## I. Introduction
- A. Hook/Opening
- B. Context Setting
- C. Thesis Statement
- D. Article Overview

## II. Main Section 1
- A. Key Point 1
  - Supporting Evidence
  - Example
- B. Key Point 2

## III. Main Section 2
[...]

## IV. Conclusion
- A. Summary
- B. Call to Action
- C. Next Steps

## Notes

[Additional notes for the writer]

---
**Human Review Required**: Yes (for long-form outlines)
**Generated**: 2026-01-28
```

**Outline Structure by Length:**

**Short Form (3-5 sections):**
```
1. Introduction
2. Main Content (2-3 sections)
3. Conclusion
```

**Long Form (8+ sections with subsections):**
```
1. Introduction
   1.1 Hook
   1.2 Context
   1.3 Thesis
2. Background
   2.1 Historical Context
   2.2 Current State
3. Core Topic 1
   3.1 Concept
   3.2 Implementation
   3.3 Examples
4. Core Topic 2
   4.1 Concept
   4.2 Implementation
   4.3 Examples
5. Core Topic 3
6. Best Practices
7. Common Pitfalls
8. Conclusion
   8.1 Summary
   8.2 Future Outlook
```

**Workflow:**

```
1. Validate input file exists and is readable
2. Read research-brief.md content
3. Extract key findings, structure, and themes
4. Generate outline based on --length parameter
5. If --length long: Add human review requirement note
6. Write outline-draft.md to 2-outline/ folder
7. Report success with file path and summary
```

### Plan

**Phase 1: Command Structure**
- [ ] Create plugins/wt/commands/outline.md file
- [ ] Define command frontmatter with description, arguments
- [ ] Implement command documentation

**Phase 2: Input Processing**
- [ ] Implement research-brief.md validation
- [ ] Extract key findings and structure from research
- [ ] Handle missing or malformed input files

**Phase 3: Outline Generation**
- [ ] Implement short-form outline generation (3-5 sections)
- [ ] Implement long-form outline generation (8+ sections with subsections)
- [ ] Add human review requirement for long-form

**Phase 4: Output Handling**
- [ ] Implement 2-outline/ folder path resolution
- [ ] Write outline-draft.md with proper formatting
- [ ] Add metadata frontmatter to output

**Phase 5: Testing**
- [ ] Test with sample research-brief.md
- [ ] Test --length short vs --length long
- [ ] Test error handling for missing files
- [ ] Validate output format consistency

### Artifacts

| Type | Path | Generated By | Date |
|------|------|--------------|------|
| Command | plugins/wt/commands/outline.md | This task | 2026-01-28 |

### References

- [Task 0001](/docs/prompts/0001_repository_structure_setup.md) - Folder structure prerequisite
- [Task 0007](/docs/prompts/0007_enhance_wt-info-research_command.md) - Produces research-brief.md
- [Task 0008](/docs/prompts/0008_enhance_wt-style-apply_command.md) - Consumes outline-approved.md
- [Existing /wt:info-research](/plugins/wt/commands/info-research.md) - Research workflow reference
- [Command Format Reference](/plugins/wt/commands/style-apply.md) - Command structure pattern
