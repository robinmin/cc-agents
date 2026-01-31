---
name: update-existing-sections
description: Update existing sections in IT Writer agent to reflect orchestration layer design
status: Done
created_at: 2026-01-30
updated_at: 2026-01-30
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
dependencies: [0107, 0108]
tags: [wt, it-writer, documentation, orchestration, updates]
---

## 0109. Update Existing Sections

### Background

The IT Writer agent redesign requires updates to 6 existing sections to align them with the new orchestration layer philosophy. These sections need to be revised to emphasize the agent's role as an intelligent coordinator rather than a content generator.

**Design Source:** `/Users/robin/projects/cc-agents/docs/plans/2026-01-30-it-writer-agent-redesign.md`

**Target File:** `/Users/robin/projects/cc-agents/plugins/wt/agents/it-writer.md`

**Dependencies:** Tasks 0107 and 0108 must be completed first

### Requirements / Objectives

**Functional Requirements:**
- Update **Overview** section to emphasize orchestration layer concept
- Update **When to Use** section with interactive/adaptive scenarios
- Update **Example Invocations** section with new capabilities
- Update **Coordination Pattern** section with subagent usage
- Update **Best Practices** section with orchestration-specific tips
- Update **Related Resources** section (verify all links)

**Section Update Requirements:**

**1. Overview**
- Add "Orchestration Layer" concept
- Emphasize "Fat in orchestration, thin in implementation" principle
- Mention workflow coordination, not content creation
- Reference `wt:technical-content-creation` skill

**2. When to Use**
- Add scenario: "Full workflow orchestration"
- Add scenario: "Interactive content creation"
- Add scenario: "Context-aware execution"
- Add note about when to use commands directly (single-stage tasks)
- List all 8 stage-specific commands as alternatives

**3. Example Invocations**
- Update "Full Workflow with Stage Gates" example
- Add "Quick Blog Post (Skip Illustrations)" example
- Add "Stage-Specific: Draft from Outline" example
- Add "Research-Heavy Article" example

**4. Coordination Pattern**
- Update subagent table with purpose and when invoked
- List: wt:super-researcher, rd2:knowledge-seeker, wt:magent-browser
- Add "When Invoked" column for each subagent

**5. Best Practices**
- Add tip: "Be specific in your request"
- Add tip: "Specify stage gate preferences"
- Add tip: "Use dry-run for publishing"
- Add tip: "Review intermediate outputs"
- Add tip: "Leverage context awareness"

**6. Related Resources**
- Verify all 8 command links are current
- Verify all 6 skill links are current
- Verify all 4 script links are current
- Add note about core skill: `wt:technical-content-creation`

**Acceptance Criteria:**
- [ ] Overview mentions "orchestration layer" and "wt:technical-content-creation"
- [ ] When to Use has 5+ scenarios including command alternatives
- [ ] Example Invocations has 4 new examples matching design
- [ ] Coordination Pattern has 3 subagents with when-invoked column
- [ ] Best Practices has 6+ tips specific to orchestration
- [ ] Related Resources lists all commands, skills, and scripts
- [ ] All sections emphasize coordination over implementation
- [ ] "Fat in orchestration, thin in implementation" principle stated

#### Q&A

**Q:** Should old content be replaced or appended to?
**A:** Replace old content to align with orchestration philosophy. Don't keep contradictory "thin wrapper" language.

**Q:** Are there formatting requirements for examples?
**A:** Use Task() pseudocode format with proper indentation for all examples.

### Solutions / Goals

**Technology Stack:**
- Markdown documentation
- File: `/Users/robin/projects/cc-agents/plugins/wt/agents/it-writer.md`

**Implementation Approach:**
1. For each section, replace content with design-specified updates
2. Maintain consistent formatting and tone
3. Ensure all code blocks use Task() pseudocode format
4. Verify tables have consistent column structures
5. Add orchestration philosophy emphasis throughout
6. Update task file with completion status

#### Plan

1. **Update Overview**
   - [ ] Add orchestration layer concept
   - [ ] State "Fat in orchestration, thin in implementation" principle
   - [ ] Reference wt:technical-content-creation skill

2. **Update When to Use**
   - [ ] Add 5+ scenarios
   - [ ] List 8 stage-specific commands as alternatives
   - [ ] Clarify when to use agent vs commands

3. **Update Example Invocations**
   - [ ] Replace with 4 new examples from design
   - [ ] Ensure Task() format for all examples
   - [ ] Include stage gate and skip options

4. **Update Coordination Pattern**
   - [ ] Add "When Invoked" column to subagent table
   - [ ] Update descriptions for each subagent

5. **Update Best Practices**
   - [ ] Add 6+ orchestration-specific tips
   - [ ] Emphasize context awareness and stage gates

6. **Update Related Resources**
   - [ ] Verify all 8 command links
   - [ ] Verify all 6 skill links
   - [ ] Verify all 4 script links

### References

- Design document: `/Users/robin/projects/cc-agents/docs/plans/2026-01-30-it-writer-agent-redesign.md`
- Agent file: `/Users/robin/projects/cc-agents/plugins/wt/agents/it-writer.md`
- Dependencies: Tasks 0107 (frontmatter), 0108 (new sections)
- Related task: 0110 (validation)
