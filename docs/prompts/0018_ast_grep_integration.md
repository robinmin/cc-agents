---
wbs: "0006"
phase: 2
title: Integrate ast-grep Tool
status: Done
priority: High
dependencies: ["0005"]
---

# Task 0006: Integrate ast-grep Tool

## Background

Phase 2 modernizes code analysis by leveraging ast-grep, a structural code search tool already available in the codebase stack. This provides faster, more accurate pattern matching than regex or string-based approaches.

## Requirements

### Functional Requirements
1. Create wrapper function for ast-grep CLI invocation
2. Support Python, TypeScript, and Go languages
3. Parse ast-grep JSON output into structured findings
4. Cache ast-grep results for repeated queries
5. Graceful fallback if ast-grep unavailable

### Success Criteria
- [ ] ast-grep wrapper function implemented
- [ ] Supports at least Python language
- [ ] Returns structured findings with file, line, matched text
- [ ] Performance: < 500ms for typical skill evaluation
- [ ] Fallback to Python AST if ast-grep unavailable

## Solution

Create a wrapper function `run_ast_grep()` that:
1. Invokes ast-grep CLI with --json flag
2. Parses JSON output into list of match dictionaries
3. Handles timeouts and missing binary gracefully
4. Returns empty list on errors

Define pattern library for each supported language with security-relevant patterns.

## References

- **ast-grep docs:** https://ast-grep.github.io/
- **File to modify:** `/Users/robin/projects/cc-agents/plugins/rd2/skills/cc-skills/scripts/skills.py`

## Deliverables

- [ ] `run_ast_grep()` wrapper function
- [ ] Pattern library for security scanning
- [ ] Integration with security evaluation
- [ ] Fallback mechanism to Python AST
