---
name: brainstorm-input-processing
description: Implement Phase 1: Input Processing for rd2:brainstorm skill
status: Done
created_at: 2026-01-30
updated_at: 2026-01-30
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
dependencies: []
tags: [brainstorm, skill, input-processing]
---

## 0140. Brainstorm Input Processing

### Background

The rd2:brainstorm skill needs to accept two types of input:
1. **Issue description** - A direct text description of a problem or idea
2. **Task file path** - A path to an existing task file to brainstorm solutions for

This is Phase 1 of the 4-phase implementation of the rd2:brainstorm skill with task-based workflow integration.

### Requirements / Objectives

**Functional Requirements:**
- Parse input to determine if it's a file path or issue description
- If file path: Read the task file and extract context
- If issue description: Use the text directly as the brainstorming topic
- Validate input is non-empty and meaningful
- Extract relevant context from task files (Background, Requirements, Solutions)

**Non-Functional Requirements:**
- Input validation must fail gracefully with clear error messages
- File reading must handle missing files gracefully
- Support both relative and absolute file paths
- Parse task file frontmatter and content sections

**Acceptance Criteria:**
- [ ] File path detection works for both relative and absolute paths
- [ ] Task file reading extracts Background, Requirements, and Solutions sections
- [ ] Issue description is used directly when provided
- [ ] Empty/invalid input produces clear error message
- [ ] Context is properly formatted for the next phase

#### Q&A

**Q:** Should we support reading from stdin?
**A:** No, keep it simple - only support file path or direct text input.

### Solutions / Goals

**Technology Stack:**
- Python (for tasks CLI integration)
- Markdown file parsing (frontmatter + content)
- Path handling for cross-platform compatibility

**Implementation Approach:**
1. Create input parsing function in brainstorm skill
2. Add file path validation and resolution
3. Add task file content extraction
4. Add input type detection (file vs description)

#### Plan

1. **Input Type Detection** - Determine if input is file path or description
   - [ ] Check if input contains path separators (/ or \)
   - [ ] Check if input ends with .md extension
   - [ ] Resolve relative paths to absolute paths

2. **File Reading** - Extract content from task files
   - [ ] Read task file if path provided
   - [ ] Parse YAML frontmatter
   - [ ] Extract Background, Requirements, Solutions sections

3. **Validation** - Ensure input is valid
   - [ ] Check input is not empty
   - [ ] Verify file exists if path provided
   - [ ] Provide clear error messages

4. **Context Preparation** - Format output for next phase
   - [ ] Structure extracted context for Research & Ideation phase
   - [ ] Include metadata (WBS, name, description)

### References

- Task file template: `docs/prompts/.template.md`
- Existing brainstorming skill: `vendors/superpowers/skills/brainstorming/SKILL.md`
- Tasks skill: `plugins/rd2/skills/tasks/SKILL.md`
- Task workflow: `plugins/rd2/skills/task-workflow/SKILL.md`
