---
wbs: "0002"
phase: 1
title: Create Context-Aware Analyzer for SKILL.md Content
status: Done
priority: Critical
dependencies: ["0001"]
---

# Task 0002: Create Context-Aware Analyzer for SKILL.md Content

## Background

The current security scanner scans SKILL.md content with naive string matching, producing false positives when SKILL.md contains documentation explaining security patterns.

**Key Insight:** SKILL.md is markdown, not Python. We need to:
1. Only scan code blocks (fenced sections)
2. Only scan Python code blocks specifically
3. Apply AST analysis to extracted Python code
4. Skip prose text entirely

## Requirements

### Functional Requirements
1. Parse markdown to extract fenced code blocks
2. Identify Python code blocks (python or py language tag)
3. Apply AST analysis only to Python code blocks
4. Skip prose text, headings, lists, etc.
5. Return findings with approximate line numbers

### Success Criteria
- [ ] Extracts all fenced code blocks from markdown
- [ ] Correctly identifies Python vs other languages
- [ ] Applies AST analysis to Python blocks only
- [ ] Returns zero false positives for documentation text
- [ ] cc-skills SKILL.md produces 0 false positives

## Solution

Create two functions:

1. `extract_python_code_blocks(markdown_content)` - Parse markdown and extract Python code blocks with their starting line numbers

2. `analyze_markdown_security(skill_md_path)` - Analyze SKILL.md by extracting Python code blocks and applying AST analysis to each

### Why This Eliminates False Positives

Prose mentions of dangerous patterns are completely ignored because:
1. Parser identifies only fenced code blocks
2. AST analysis only runs on valid Python code
3. Documentation text is never analyzed

## References

- **File to modify:** `plugins/rd2/skills/cc-skills/scripts/skills.py`
- **Depends on:** Task 0001 (AST analyzer concepts)
- **Lines to replace:** 744-760 (SKILL.md content scanning)

## Testing

1. Create test SKILL.md with prose mentioning dangerous patterns (should NOT trigger)
2. Create test SKILL.md with Python code block containing dangerous call (SHOULD trigger)
3. Create test SKILL.md with Bash code block (should NOT trigger Python analyzer)

## Deliverables

- [ ] `extract_python_code_blocks()` function implemented
- [ ] `analyze_markdown_security()` function implemented
- [ ] Unit tests for markdown parsing
- [ ] Integration tests with sample SKILL.md files
