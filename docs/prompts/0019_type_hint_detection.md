---
wbs: "0007"
phase: 2
title: Replace Regex-based Type Hint Detection
status: Done
priority: Medium
dependencies: ["0006"]
---

# Task 0007: Replace Regex-based Type Hint Detection

## Background

The current `evaluate_code_quality()` function uses regex to detect type hints:

```python
has_type_hints = bool(
    re.search(r":\s*(str|int|float|bool|list|dict|Path|None)", script_content)
)
```

This is inaccurate because:
1. Misses complex types (Optional, Union, generics)
2. False positives on string content containing these words
3. Doesn't verify actual type annotation syntax

## Requirements

### Functional Requirements
1. Use AST to detect actual type annotations
2. Detect function parameter annotations
3. Detect function return type annotations
4. Detect variable annotations
5. Count annotation coverage percentage

### Success Criteria
- [ ] Detects all standard type annotations
- [ ] Detects complex types (Optional, Union, list[str])
- [ ] No false positives on string content
- [ ] Reports annotation coverage percentage
- [ ] Works with Python 3.9+ annotation syntax

## Solution

### AST-based Type Hint Detection

```python
import ast

def analyze_type_hints(script_path: Path) -> dict:
    """
    Analyze type hint coverage using AST.

    Returns:
        dict with keys: has_hints, coverage_pct, annotated_count, total_count
    """
    try:
        tree = ast.parse(script_path.read_text())
    except SyntaxError:
        return {"has_hints": False, "coverage_pct": 0, "annotated_count": 0, "total_count": 0}

    annotated = 0
    total = 0

    for node in ast.walk(tree):
        # Function definitions
        if isinstance(node, ast.FunctionDef):
            total += 1
            has_return_annotation = node.returns is not None
            has_param_annotations = any(arg.annotation for arg in node.args.args)
            if has_return_annotation or has_param_annotations:
                annotated += 1

        # Variable annotations
        if isinstance(node, ast.AnnAssign):
            annotated += 1
            total += 1

    coverage = (annotated / total * 100) if total > 0 else 0

    return {
        "has_hints": annotated > 0,
        "coverage_pct": round(coverage, 1),
        "annotated_count": annotated,
        "total_count": total
    }
```

## References

- **File to modify:** `/Users/robin/projects/cc-agents/plugins/rd2/skills/cc-skills2/scripts/skills.py`
- **Lines to replace:** 1072-1079 in `evaluate_code_quality()`

## Deliverables

- [ ] `analyze_type_hints()` function implemented
- [ ] Integration with `evaluate_code_quality()`
- [ ] Coverage percentage in findings
- [ ] Unit tests for type hint detection
