---
wbs: "0008"
phase: 2
title: Replace String-based Bare Except Detection
status: Done
priority: Medium
dependencies: ["0006"]
---

# Task 0008: Replace String-based Bare Except Detection

## Background

The current `evaluate_code_quality()` function uses string matching:

```python
if "except:" in script_content or "except :" in script_content:
    findings.append(f"{script_file.name}: Has bare except (anti-pattern)")
```

This is problematic because:
1. False positives on "except:" in strings or comments
2. Doesn't distinguish `except:` from `except Exception:`
3. No line number for findings

## Requirements

### Functional Requirements
1. Use AST to detect actual bare except handlers
2. Distinguish bare except from typed except
3. Return line numbers for findings
4. Detect other exception anti-patterns (too broad catches)

### Success Criteria
- [ ] Detects actual bare except handlers only
- [ ] No false positives on strings/comments
- [ ] Returns line numbers
- [ ] Optionally detects `except Exception:` (very broad)

## Solution

### AST-based Exception Handler Analysis

```python
import ast

def analyze_exception_handlers(script_path: Path) -> list[tuple[str, int, str]]:
    """
    Analyze exception handlers for anti-patterns.

    Returns:
        List of (issue_type, line_number, description) tuples
    """
    issues = []

    try:
        tree = ast.parse(script_path.read_text())
    except SyntaxError:
        return []

    for node in ast.walk(tree):
        if isinstance(node, ast.ExceptHandler):
            if node.type is None:
                # Bare except: (catches everything including SystemExit)
                issues.append((
                    "bare_except",
                    node.lineno,
                    "Bare except catches all exceptions including SystemExit"
                ))
            elif isinstance(node.type, ast.Name) and node.type.id == "Exception":
                # except Exception: (very broad, but acceptable in some cases)
                issues.append((
                    "broad_except",
                    node.lineno,
                    "Broad 'except Exception' - consider more specific types"
                ))

    return issues
```

## References

- **File to modify:** `/Users/robin/projects/cc-agents/plugins/rd2/skills/cc-skills2/scripts/skills.py`
- **Lines to replace:** 1088-1091 in `evaluate_code_quality()`

## Deliverables

- [ ] `analyze_exception_handlers()` function implemented
- [ ] Integration with `evaluate_code_quality()`
- [ ] Line numbers in findings
- [ ] Unit tests for exception handler detection
