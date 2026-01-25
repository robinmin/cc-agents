---
wbs: "0017"
phase: 3
title: Extract Dimension Scorers into Modules
status: Done
priority: Medium
dependencies: ["0013"]
---

# Task 0017: Extract Dimension Scorers into Modules

## Background

All 7 dimension evaluators are in a single 1,371-line file. Extracting them into separate modules improves:
1. Code organization
2. Independent testing
3. Easier maintenance
4. Plugin architecture support

## Requirements

### Functional Requirements
1. Create evaluators/ package
2. Move each evaluate_* function to its own module
3. Maintain import compatibility
4. Update main script to import from modules
5. Add __init__.py for public API

### Success Criteria
- [ ] Each dimension in separate file
- [ ] Main script imports from evaluators/
- [ ] All existing tests pass
- [ ] Public API unchanged
- [ ] Code coverage maintained

## Solution

### Directory Structure

```
scripts/
├── skills.py (main CLI, slimmed down)
└── evaluators/
    ├── __init__.py         # Public exports
    ├── base.py             # DimensionScore, shared utilities
    ├── frontmatter.py      # evaluate_frontmatter()
    ├── content.py          # evaluate_content()
    ├── security.py         # evaluate_security()
    ├── structure.py        # evaluate_structure()
    ├── efficiency.py       # evaluate_efficiency()
    ├── best_practices.py   # evaluate_best_practices()
    └── code_quality.py     # evaluate_code_quality()
```

### Public API

```python
# evaluators/__init__.py
from .base import DimensionScore, DIMENSION_WEIGHTS
from .frontmatter import evaluate_frontmatter
from .content import evaluate_content
from .security import evaluate_security
from .structure import evaluate_structure
from .efficiency import evaluate_efficiency
from .best_practices import evaluate_best_practices
from .code_quality import evaluate_code_quality

__all__ = [
    "DimensionScore",
    "DIMENSION_WEIGHTS",
    "evaluate_frontmatter",
    "evaluate_content",
    "evaluate_security",
    "evaluate_structure",
    "evaluate_efficiency",
    "evaluate_best_practices",
    "evaluate_code_quality",
]
```

## References

- **Files to create:** `plugins/rd2/skills/cc-skills/scripts/evaluators/`
- **File to modify:** `plugins/rd2/skills/cc-skills/scripts/skills.py`

## Deliverables

- [ ] evaluators/ package created
- [ ] 7 dimension modules
- [ ] skills.py updated to import from evaluators/
- [ ] All tests passing
- [ ] Public API documented
