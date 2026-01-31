---
name: brainstorm-research-ideation
description: Implement Phase 2: Research & Ideation for rd2:brainstorm skill
status: Done
created_at: 2026-01-30
updated_at: 2026-01-30
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
dependencies: [0140]
tags: [brainstorm, skill, research, ideation]
---

## 0141. Brainstorm Research & Ideation

### Background

Phase 1 provides the input context (issue description or task file). Phase 2 needs to research and generate ideas using various tools:
- WebSearch for recent information
- MCP ref for documentation
- wt:super-researcher for deeper research

This phase generates 2-3 different approaches with trade-offs, similar to the original superpowers:brainstorming skill.

### Requirements / Objectives

**Functional Requirements:**
- Use WebSearch to find recent information (< 6 months)
- Use MCP ref to verify documentation and APIs
- Use wt:super-researcher for literature review and cross-referencing
- Generate 2-3 different approaches to solve the problem
- Include trade-offs and recommendations for each approach
- Ask questions one at a time to refine understanding

**Non-Functional Requirements:**
- Follow anti-hallucination protocol (verify before generating)
- Use tools in the right priority order (ref first, then WebSearch)
- Cite all sources with dates
- Assign confidence levels to all claims

**Acceptance Criteria:**
- [ ] WebSearch used for recent facts and announcements
- [ ] MCP ref used for API/library documentation
- [ ] wt:super-researcher used when deep research needed
- [ ] 2-3 approaches generated with clear trade-offs
- [ ] All claims include citations and confidence levels
- [ ] Recommended approach is clearly marked

#### Q&A

**Q:** When should we use wt:super-researcher vs WebSearch?
**A:** Use wt:super-researcher for literature review, meta-analysis, and cross-referencing. Use WebSearch for recent facts and announcements.

### Solutions / Goals

**Technology Stack:**
- WebSearch tool for recent information
- ref (MCP) for documentation verification
- wt:super-researcher subagent for deep research
- rd2:anti-hallucination skill for verification protocol

**Implementation Approach:**
1. Detect research needs based on input context
2. Apply anti-hallucination protocol to verify claims
3. Use appropriate tools in priority order
4. Generate and document multiple approaches
5. Ask clarifying questions as needed

#### Plan

1. **Research Need Detection** - Determine what research is needed
   - [ ] Analyze input context for technical terms
   - [ ] Identify external APIs/libraries/frameworks mentioned
   - [ ] Determine if recent changes (< 6 months) matter

2. **Tool Selection & Execution** - Use right tools in right order
   - [ ] Use ref_search_documentation for API/library docs
   - [ ] Use WebSearch for recent facts and announcements
   - [ ] Use wt:super-researcher for literature review
   - [ ] Follow anti-hallucination fallback protocol

3. **Approach Generation** - Create multiple solution options
   - [ ] Generate 2-3 different approaches
   - [ ] Document trade-offs for each approach
   - [ ] Mark recommended approach with reasoning
   - [ ] Include implementation considerations

4. **Clarification & Refinement** - Ask questions to refine ideas
   - [ ] Ask one question at a time
   - [ ] Prefer multiple choice when possible
   - [ ] Focus on understanding: purpose, constraints, success criteria

5. **Documentation** - Capture research findings
   - [ ] Cite all sources with dates
   - [ ] Assign confidence levels (HIGH/MEDIUM/LOW)
   - [ ] Document reasoning for approach selection

### References

- Anti-hallucination skill: `plugins/rd2/skills/anti-hallucination/SKILL.md`
- super-researcher agent: `plugins/rd2/agents/super-researcher.md`
- Tool selection: `plugins/rd2/skills/tool-selection/SKILL.md`
- Original brainstorming skill: `vendors/superpowers/skills/brainstorming/SKILL.md`
