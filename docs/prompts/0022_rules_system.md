---
wbs: "0010"
phase: 2
title: Implement Pattern-based Rules System
status: Done
priority: Medium
dependencies: ["0006"]
---

# Task 0010: Implement Pattern-based Rules System

## Background

Currently, security and code quality patterns are hardcoded. A rules system would enable easy addition of new patterns, user-customizable rules, and rule categories.

## Requirements

### Functional Requirements
1. Define rule schema (pattern, message, severity, language)
2. Load rules from Python code initially
3. Support rule categories
4. Support severity levels (error, warning, info)
5. Extensible for future YAML/JSON rule files

### Success Criteria
- [ ] Rule dataclass defined
- [ ] Built-in rules migrated to new system
- [ ] Rules filterable by category
- [ ] Rules filterable by severity
- [ ] Easy to add new rules

## Solution

Create Rule dataclass with fields:
- id: Unique identifier (e.g., "SEC001")
- pattern: AST pattern or regex
- message: Human-readable description
- category: security, code_quality, style, performance
- severity: error, warning, info
- languages: List of applicable languages
- pattern_type: ast, regex, or ast-grep

Create rule engine that evaluates rules against scripts and returns findings.

## References

- **File to modify:** `/Users/robin/projects/cc-agents/plugins/rd2/skills/cc-skills2/scripts/skills.py`

## Deliverables

- [ ] Rule dataclass and enums
- [ ] BUILTIN_RULES list with migrated patterns
- [ ] `evaluate_rules()` function
- [ ] Integration with evaluation dimensions
