---
wbs: "0021"
phase: 4
title: Update security.md with AST Guidance
status: Done
priority: Medium
dependencies: ["0019"]
---

# Task 0021: Update security.md with AST Guidance

## Background

The `references/security.md` file should document the new AST-based security analysis approach.

## Requirements

### Functional Requirements
1. Document AST-based detection methodology
2. Explain why AST eliminates false positives
3. List detected security patterns
4. Provide guidance for skill authors
5. Include examples of good vs bad patterns

### Success Criteria
- [ ] AST methodology explained
- [ ] All detected patterns listed
- [ ] False positive elimination explained
- [ ] Guidance for avoiding issues
- [ ] Examples provided

## Solution

### Content Structure

1. **Overview**: Brief explanation of security evaluation
2. **Detection Methodology**:
   - Python AST for scripts
   - Markdown parsing for SKILL.md
   - Only code blocks analyzed
3. **Detected Patterns**:
   - Code execution functions
   - OS command functions
   - Unsafe deserialization
   - Dynamic imports
   - Shell injection risks
4. **Why AST?**:
   - Distinguishes code from documentation
   - No false positives on string mentions
   - Accurate line numbers
5. **Guidance for Authors**:
   - If pattern is in documentation, explain it's safe
   - If pattern is in code, provide justification
   - How to document intentional use

## References

- **File to update:** `plugins/rd2/skills/cc-skills/references/security.md`

## Deliverables

- [ ] security.md updated with AST methodology
- [ ] Pattern list complete
- [ ] Author guidance included
- [ ] Examples provided
