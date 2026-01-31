---
name: brainstorm-structured-output
description: Implement Phase 3: Structured Output for rd2:brainstorm skill
status: Done
created_at: 2026-01-30
updated_at: 2026-01-30
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
dependencies: [0140, 0141]
tags: [brainstorm, skill, structured-output]
---

## 0142. Brainstorm Structured Output

### Background

Phase 2 generates approaches and ideas. Phase 3 needs to format this into a structured markdown output with clear sections that can be reviewed and then converted to task files in Phase 4.

### Requirements / Objectives

**Functional Requirements:**
- Generate markdown output with standard sections
- Sections should include: Overview, Approaches, Recommendations, Next Steps
- Each approach should have: Description, Trade-offs, Implementation Notes
- Output should be reviewable before task creation
- Support saving output to file

**Non-Functional Requirements:**
- Follow markdown best practices
- Use consistent formatting across sections
- Include clear headers and hierarchy
- Support 200-300 word sections for readability

**Acceptance Criteria:**
- [ ] Output includes Overview section with context
- [ ] Each approach has clear Description, Trade-offs, Implementation Notes
- [ ] Recommended approach is clearly marked
- [ ] Output can be saved to markdown file
- [ ] Output is reviewable before task creation phase

#### Q&A

**Q:** Should we save output to a file automatically?
**A:** No, present the output first for review, then offer to save if user confirms.

### Solutions / Goals

**Technology Stack:**
- Markdown generation
- File I/O for saving results
- Template-based output formatting

**Implementation Approach:**
1. Define output template with standard sections
2. Populate sections with research findings from Phase 2
3. Format approaches with consistent structure
4. Present output for review
5. Support saving to file on confirmation

#### Plan

1. **Output Template Design** - Define standard sections
   - [ ] Create template with Overview, Approaches, Recommendations, Next Steps
   - [ ] Define approach subsection structure
   - [ ] Ensure consistent formatting

2. **Content Generation** - Populate sections from Phase 2
   - [ ] Write Overview with context summary
   - [ ] Format each approach with Description, Trade-offs, Implementation Notes
   - [ ] Mark recommended approach
   - [ ] Add Recommendations section

3. **Output Presentation** - Display for review
   - [ ] Present in 200-300 word sections
   - [ ] Ask for confirmation after each section
   - [ ] Allow revisions if needed

4. **File Saving** - Persist output on confirmation
   - [ ] Save to `docs/plans/YYYY-MM-DD-<topic>-brainstorm.md`
   - [ ] Use filename-safe topic names
   - [ ] Confirm successful save

5. **Context Preparation** - Prepare for Phase 4
   - [ ] Extract task-worthy items from approaches
   - [ ] Organize by logical groupings
   - [ ] Prepare suggestions for task file creation

### References

- Writing clearly skill: `vendors/superpowers/skills/writing-clearly-and-concisely/SKILL.md`
- Original brainstorming skill: `vendors/superpowers/skills/brainstorming/SKILL.md`
- Task file template: `docs/prompts/.template.md`
- Markdown best practices
