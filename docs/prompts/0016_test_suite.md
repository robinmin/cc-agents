---
wbs: "0004"
phase: 1
title: Create Self-Evaluation Test Suite
status: Done
priority: Critical
dependencies: ["0003"]
---

# Task 0004: Create Self-Evaluation Test Suite

## Background

cc-skills has no test suite. We need comprehensive tests to:
1. Verify the AST-based security scanner works correctly
2. Prevent regression of false positive issues
3. Enable confident future refactoring
4. Validate Phase 1 success criteria

## Requirements

### Functional Requirements
1. Test AST analyzer against known patterns
2. Test markdown analyzer against mixed content
3. Self-evaluation test: cc-skills evaluating itself
4. False positive regression tests
5. True positive detection tests

### Success Criteria
- [ ] Test suite runs with `pytest tests/`
- [ ] Self-evaluation produces 0 false positives
- [ ] Security score >= 9.0 for cc-skills
- [ ] Overall grade == A for cc-skills
- [ ] All tests pass

## Solution

### Test Directory Structure

```
tests/
├── __init__.py
├── conftest.py                    # Pytest fixtures
├── test_ast_analyzer.py           # Task 0001 tests
├── test_markdown_analyzer.py      # Task 0002 tests
├── test_evaluate_security.py      # Task 0003 tests
├── test_self_evaluation.py        # Meta-test: cc-skills evaluates itself
└── fixtures/
    ├── dangerous_code.py          # Has actual dangerous calls
    ├── safe_code.py               # Mentions patterns in comments only
    ├── skill_with_issues/         # Skill with real security issues
    │   └── SKILL.md
    └── skill_clean/               # Clean skill
        └── SKILL.md
```

### Key Test Cases

#### test_ast_analyzer.py
- Detects actual dangerous function calls
- Ignores patterns in strings
- Ignores patterns in comments
- Handles syntax errors gracefully
- Returns accurate line numbers

#### test_markdown_analyzer.py
- Extracts Python code blocks correctly
- Ignores non-Python code blocks
- Ignores prose text
- Returns findings with line numbers

#### test_self_evaluation.py
- Security scanner finds 0 issues in cc-skills
- Security score >= 9.0
- Overall grade == A
- All findings have context (file, line)

## References

- **Test directory:** `plugins/rd2/skills/cc-skills/tests/`
- **Depends on:** Tasks 0001, 0002, 0003

## Testing

Run tests with:
```bash
cd plugins/rd2/skills/cc-skills
pytest tests/ -v
```

## Deliverables

- [ ] `tests/` directory created
- [ ] `test_ast_analyzer.py` with 8+ test cases
- [ ] `test_markdown_analyzer.py` with 5+ test cases
- [ ] `test_evaluate_security.py` with integration tests
- [ ] `test_self_evaluation.py` with meta-tests
- [ ] All tests passing
- [ ] Self-evaluation: 0 false positives, grade A
