---
wbs: "0011"
phase: 2
title: Add Caching for AST Parsing Results
status: Done
priority: Medium
dependencies: ["0006", "0007", "0008"]
---

# Task 0011: Add Caching for AST Parsing Results

## Background

Currently, the same files may be parsed multiple times during evaluation:
1. Once for security analysis
2. Once for code quality analysis
3. Once for best practices analysis

Caching AST results would improve performance significantly.

## Requirements

### Functional Requirements
1. Cache parsed AST trees by file path
2. Invalidate cache when file changes (mtime check)
3. Limit cache size to prevent memory issues
4. Thread-safe cache access
5. Clear cache method for testing

### Success Criteria
- [ ] AST parsed only once per file per evaluation
- [ ] Cache invalidates on file modification
- [ ] Memory-bounded (max 100 files)
- [ ] 50%+ reduction in file reads
- [ ] Performance: < 2s for full evaluation

## Solution

### LRU Cache Implementation

```python
from functools import lru_cache
from pathlib import Path
import ast

# Cache key includes mtime for invalidation
def _get_cache_key(path: Path) -> tuple[str, float]:
    return (str(path), path.stat().st_mtime)

@lru_cache(maxsize=100)
def _parse_python_cached(cache_key: tuple[str, float]) -> ast.AST | None:
    """Parse Python file with caching based on path and mtime."""
    path = Path(cache_key[0])
    try:
        return ast.parse(path.read_text())
    except (SyntaxError, OSError):
        return None

def get_ast(path: Path) -> ast.AST | None:
    """Get cached AST for Python file."""
    try:
        key = _get_cache_key(path)
        return _parse_python_cached(key)
    except OSError:
        return None

def clear_ast_cache():
    """Clear the AST cache (for testing)."""
    _parse_python_cached.cache_clear()
```

### File Read Caching

```python
@lru_cache(maxsize=100)
def _read_file_cached(cache_key: tuple[str, float]) -> str | None:
    """Read file with caching based on path and mtime."""
    path = Path(cache_key[0])
    try:
        return path.read_text()
    except OSError:
        return None

def get_file_content(path: Path) -> str | None:
    """Get cached file content."""
    try:
        key = _get_cache_key(path)
        return _read_file_cached(key)
    except OSError:
        return None
```

### Integration

Update all functions that parse files to use the cache:
- `find_dangerous_calls_ast()` -> use `get_ast()`
- `analyze_type_hints()` -> use `get_ast()`
- `analyze_exception_handlers()` -> use `get_ast()`
- `evaluate_content()` -> use `get_file_content()`

## References

- **File to modify:** `plugins/rd2/skills/cc-skills/scripts/skills.py`

## Testing

1. Run evaluation twice, measure time difference
2. Verify cache hits on second run
3. Modify file, verify cache invalidates
4. Test with > 100 files (cache eviction)

## Deliverables

- [ ] `get_ast()` cached function
- [ ] `get_file_content()` cached function
- [ ] `clear_ast_cache()` for testing
- [ ] All AST functions updated to use cache
- [ ] Performance benchmark showing improvement
