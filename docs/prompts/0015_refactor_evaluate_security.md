---
wbs: "0003"
phase: 1
title: Refactor evaluate_security() Function
status: Done
priority: Critical
dependencies: ["0001", "0002"]
---

# Task 0003: Refactor evaluate_security() Function

## Background

The `evaluate_security()` function (lines 728-797) needs complete refactoring to:
1. Use AST-based analysis for Python scripts (Task 0001)
2. Use markdown-aware analysis for SKILL.md (Task 0002)
3. Eliminate all false positives
4. Provide accurate line numbers for findings

## Current Problem

The function uses string matching on lowercased content, which triggers on:
- Documentation text explaining what NOT to do
- Pattern definitions in the scanner itself
- Comments and docstrings

## Requirements

### Functional Requirements
1. Replace SKILL.md string matching with `analyze_markdown_security()`
2. Replace scripts/ string matching with `find_dangerous_calls_ast()`
3. Include line numbers in all security findings
4. Maintain backward compatibility with scoring system
5. Keep positive findings (e.g., "Mentions security considerations")

### Success Criteria
- [ ] Zero false positives when evaluating cc-skills itself
- [ ] Security score >= 9.0/10 for cc-skills
- [ ] All findings include file path and line number
- [ ] Existing true positives still detected

## Solution

Refactor the function to:

1. For SKILL.md: Call `analyze_markdown_security()` instead of string matching
2. For scripts/: Call `find_dangerous_calls_ast()` instead of string matching
3. Format findings with file:line_number format
4. Preserve security keyword detection for positive signals
5. Keep same scoring weights (-1.5 for SKILL.md issues, -1.0 for script issues)

### Key Changes

- SKILL.md analysis uses markdown-aware parser
- Scripts analysis uses Python AST
- All findings include location context
- Positive signals (security discussion, references dir) preserved

## References

- **File to modify:** `/Users/robin/projects/cc-agents/plugins/rd2/skills/cc-skills/scripts/skills.py`
- **Lines to replace:** 728-797
- **Depends on:** Tasks 0001 and 0002

## Testing

1. Run evaluation on cc-skills itself
2. Verify security score >= 9.0
3. Verify no false positives in findings
4. Test against skill with actual security issues (should still detect)

## Deliverables

- [ ] Refactored `evaluate_security()` function
- [ ] Integration of `find_dangerous_calls_ast()`
- [ ] Integration of `analyze_markdown_security()`
- [ ] All findings include line numbers
