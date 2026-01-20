---
wbs: "0022"
phase: 4
title: Sync best_practices.md with Scanner
status: Done
priority: Medium
dependencies: ["0019"]
---

# Task 0022: Sync best_practices.md with Scanner

## Background

The `references/best_practices.md` should align with what the scanner actually checks.

## Requirements

### Functional Requirements
1. Review all scanner checks
2. Document each check in best_practices.md
3. Explain rationale for each check
4. Provide examples of passing vs failing
5. Remove outdated guidance

### Success Criteria
- [ ] All scanner checks documented
- [ ] Rationale for each check
- [ ] Examples provided
- [ ] No contradictions with scanner behavior
- [ ] Actionable guidance

## Solution

### Alignment Checklist

For each evaluator dimension, ensure best_practices.md covers:

1. **Frontmatter**:
   - Required fields (name, description)
   - Naming conventions
   - Description quality

2. **Content**:
   - Minimum content length
   - Required sections
   - Code examples

3. **Security**:
   - Safe coding patterns
   - When dangerous patterns are acceptable
   - Documentation requirements

4. **Structure**:
   - Directory organization
   - Progressive disclosure
   - Heading hierarchy

5. **Efficiency**:
   - Token budgets
   - Avoiding redundancy
   - Concise writing

6. **Code Quality**:
   - Error handling
   - Type hints
   - Docstrings
   - Main guard

## References

- **File to update:** `/Users/robin/projects/cc-agents/plugins/rd2/skills/cc-skills2/references/best_practices.md`

## Deliverables

- [ ] All scanner checks documented
- [ ] Examples for each check
- [ ] Rationale explained
- [ ] No contradictions
