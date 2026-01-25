---
wbs: "0009"
phase: 2
title: Add Multi-Language Support
status: Done
priority: Medium
dependencies: ["0006"]
---

# Task 0009: Add Multi-Language Support

## Background

Currently the skill evaluator only analyzes Python scripts. Many skills include TypeScript, Go, and Bash files that should also be analyzed.

## Requirements

### Functional Requirements
1. Detect script languages by file extension
2. Apply language-appropriate analysis
3. Support Python, TypeScript, Go, Bash
4. Use ast-grep for TypeScript and Go
5. Use shellcheck for Bash (if available)

### Success Criteria
- [ ] Detects .py, .ts, .js, .go, .sh files
- [ ] Applies correct analyzer per language
- [ ] TypeScript security patterns detected
- [ ] Go security patterns detected
- [ ] Graceful handling of unsupported languages

## Solution

Create language detection and routing:

1. `LANGUAGE_EXTENSIONS` mapping file extensions to language names
2. `get_script_language()` function to detect language
3. `analyze_script()` function to route to appropriate analyzer
4. Language-specific pattern definitions

## References

- **File to modify:** `plugins/rd2/skills/cc-skills/scripts/skills.py`

## Deliverables

- [ ] Language detection function
- [ ] TypeScript analyzer
- [ ] Go analyzer
- [ ] Bash analyzer (optional)
- [ ] Integration with `evaluate_code_quality()`
