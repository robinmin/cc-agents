---
wbs: "0001"
phase: 1
title: Create AST-based Security Analyzer for Python Scripts
status: Done
priority: Critical
dependencies: []
---

# Task 0001: Create AST-based Security Analyzer for Python Scripts

## Background

The current security scanner in `scripts/skills.py` (lines 728-797) uses naive string matching to detect dangerous patterns. This causes false positives when documentation mentions security patterns.

**Root Cause:** String matching cannot distinguish between actual code execution and documentation text.

## Requirements

### Functional Requirements
1. Parse Python scripts using the `ast` module
2. Detect actual dangerous function calls (not string mentions)
3. Detect dangerous keyword arguments in subprocess calls
4. Return line numbers for all findings
5. Skip comments and docstrings (AST naturally handles this)
6. Handle syntax errors gracefully

### Success Criteria
- [ ] Parses all `.py` files in `scripts/` directory
- [ ] Detects only actual dangerous function calls
- [ ] Returns tuple of (function_name, line_number) for each finding
- [ ] Zero false positives when run against cc-skills itself
- [ ] Handles malformed Python files without crashing

## Solution

Create a new function `find_dangerous_calls_ast()` that uses Python's `ast` module to:

1. Parse the Python source into an AST
2. Walk the tree looking for `ast.Call` nodes
3. Check if the call target matches dangerous patterns
4. For subprocess calls, check for shell=True keyword argument
5. Return findings with line numbers

Key dangerous patterns to detect:
- Direct calls to code execution functions
- OS command execution functions
- Unsafe deserialization
- Dynamic import functions
- Subprocess with shell injection risk

### Integration Point

This function will be called from `evaluate_security()` to replace the current string-matching approach for Python scripts.

## References

- **File to modify:** `plugins/rd2/skills/cc-skills/scripts/skills.py`
- **Lines to replace:** 778-786 (script scanning section)
- **Python AST docs:** https://docs.python.org/3/library/ast.html

## Testing

1. Create test file with actual dangerous calls
2. Create test file with string mentions of dangerous patterns
3. Verify AST analyzer detects (1) but not (2)
4. Run against cc-skills itself - should find 0 issues

## Deliverables

- [ ] `find_dangerous_calls_ast()` function implemented
- [ ] Unit tests for the function
- [ ] Integration with `evaluate_security()` for scripts/ scanning
