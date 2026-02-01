# Brainstorm: Enhance cc-skills with Other References

**Date:** 2026-01-31
**Task:** 0145_enhance_cc-skills_with_other_reference.md
**Status:** Brainstorm Complete

## Overview

Task 0145 requests enhancing the `rd2:cc-skills` meta-skill by incorporating best practices from two authoritative sources:
1. **Anthropic Official skill-creator** (vendors/skills/skills/skill-creator)
2. **Superpowers writing-skills** (vendors/superpowers/skills/writing-skills)

After comprehensive analysis, **12 enhancement opportunities** identified that would significantly improve skill creation quality without duplicating existing content.

## Gap Analysis

| Feature | Current cc-skills | Anthropic Official | Superpowers | Action |
|---------|------------------|-------------------|-------------|--------|
| 6-step creation process | ✅ | ✅ | ✅ | Keep |
| Progressive disclosure | ✅ | ✅ | ✅ | Keep |
| Evaluation scripts | ✅ | ❌ | ❌ | Keep (unique) |
| Fat Skills, Thin Wrappers | ✅ | ❌ | ❌ | Keep (unique) |
| Degrees of Freedom | ❌ | ✅ | ❌ | **ADD** |
| TDD for Skills | ❌ | ❌ | ✅ | **ADD** |
| Claude Search Optimization | Partial | ❌ | ✅ | **ENHANCE** |
| Skill Types (Technique/Pattern/Reference) | ❌ | ❌ | ✅ | **ADD** |
| What NOT to Include | ❌ | ✅ | ❌ | **ADD** |
| Token Efficiency Targets | ❌ | ❌ | ✅ | **ADD** |
| Bulletproofing/Rationalization Tables | ❌ | ❌ | ✅ | **ADD** |
| Discovery Workflow | ❌ | ❌ | ✅ | **ADD** |
| Anti-patterns Section | Partial | ❌ | ✅ | **ENHANCE** |
| Flowchart Usage Guidance | ❌ | ❌ | ✅ | **ADD** |

## Recommended Approach: Comprehensive Enhancement

### Priority 1: Claude Search Optimization (CSO) - Task 0140
**Source:** Superpowers writing-skills
**Confidence:** HIGH

Add CSO section addressing skill discoverability:
- "Description = When to Use, NOT What the Skill Does" principle
- Keyword coverage guidance
- Token efficiency targets (<150 words for frequently-loaded, <500 for others)

### Priority 2: Degrees of Freedom Concept - Task 0141
**Source:** Anthropic Official skill-creator
**Confidence:** HIGH

Add explicit guidance on matching specificity to task fragility:
- High freedom (text instructions): Multiple valid approaches
- Medium freedom (pseudocode): Preferred pattern exists
- Low freedom (scripts): Fragile operations, consistency critical

### Priority 3: Skill Types Categorization - Task 0142
**Source:** Superpowers writing-skills
**Confidence:** MEDIUM

Add categorization to help skill creators choose appropriate structure:
- **Technique**: Concrete method with steps (condition-based-waiting)
- **Pattern**: Way of thinking about problems (flatten-with-flags)
- **Reference**: API docs, syntax guides (office-docs)

### Priority 4: What NOT to Include - Task 0143
**Source:** Anthropic Official skill-creator
**Confidence:** HIGH

Explicit list of files to avoid:
- README.md, INSTALLATION_GUIDE.md, QUICK_REFERENCE.md, CHANGELOG.md
- Auxiliary context about creation process
- User-facing documentation

### Priority 5: TDD for Skills - Task 0144
**Source:** Superpowers writing-skills
**Confidence:** MEDIUM

Optional advanced methodology in references/:
- RED-GREEN-REFACTOR cycle for documentation
- Baseline testing (run scenarios WITHOUT skill)
- Pressure scenarios for discipline-enforcing skills
- Rationalization tables

## Implementation Notes

### Constraint: Cannot Use rd2:skill-expert or rd2:skill-doctor
As stated in requirements, these agents are built on cc-skills and cannot be used to evaluate/refine themselves. Manual implementation and review required.

### Constraint: No References to vendors/ Folder
All content must be extracted and internalized. Do not reference vendors/ paths in final implementation.

## Sources

- Anthropic Official skill-creator documentation (analyzed during brainstorm phase)
- Superpowers writing-skills methodology (analyzed during brainstorm phase)
- [Claude Code Official Docs](https://github.com/anthropics/claude-code/blob/main/plugins/plugin-dev/skills/skill-development/SKILL.md)

## Created Subtasks

| WBS | Name | Priority |
|-----|------|----------|
| 0140 | enhance cc-skills with CSO | P1 |
| 0141 | add Degrees of Freedom to cc-skills | P2 |
| 0142 | add Skill Types categorization to cc-skills | P3 |
| 0143 | add What NOT to Include section to cc-skills | P4 |
| 0144 | add TDD for Skills reference to cc-skills | P5 |
