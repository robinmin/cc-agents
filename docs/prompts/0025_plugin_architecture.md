---
wbs: "0013"
phase: 3
title: Design Plugin Architecture
status: Done
priority: High
dependencies: ["0012"]
---

# Task 0013: Design Plugin Architecture

## Background

Currently all evaluation dimensions are hardcoded in skills.py. A plugin architecture would enable:
1. Adding new dimensions without modifying core code
2. Third-party evaluation plugins
3. Per-skill custom evaluators
4. Easier testing of individual dimensions

## Requirements

### Functional Requirements
1. Define evaluator interface/protocol
2. Plugin discovery mechanism
3. Plugin registration and loading
4. Plugin configuration support
5. Backward compatibility with existing code

### Success Criteria
- [ ] Evaluator protocol defined
- [ ] At least one dimension converted to plugin
- [ ] Plugin discovery works
- [ ] New plugins can be added without core changes
- [ ] Existing evaluation still works

## Solution

### Evaluator Protocol

```python
from typing import Protocol
from pathlib import Path

class DimensionEvaluator(Protocol):
    """Protocol for evaluation dimension plugins."""

    @property
    def name(self) -> str:
        """Dimension name (e.g., 'security', 'code_quality')."""
        ...

    @property
    def weight(self) -> float:
        """Weight in overall score (0.0-1.0)."""
        ...

    def evaluate(self, skill_path: Path) -> DimensionScore:
        """Evaluate the skill and return a score."""
        ...
```

### Plugin Discovery

```python
# plugins/ directory structure
# plugins/
#   __init__.py
#   security.py      # SecurityEvaluator class
#   code_quality.py  # CodeQualityEvaluator class

def discover_evaluators(plugins_dir: Path) -> list[DimensionEvaluator]:
    """Discover and load evaluator plugins."""
    evaluators = []
    for plugin_file in plugins_dir.glob("*.py"):
        if plugin_file.name.startswith("_"):
            continue
        # Import and find evaluator classes
        ...
    return evaluators
```

## References

- **File to modify:** `/Users/robin/projects/cc-agents/plugins/rd2/skills/cc-skills/scripts/skills.py`
- **New directory:** `/Users/robin/projects/cc-agents/plugins/rd2/skills/cc-skills/scripts/evaluators/`

## Deliverables

- [ ] DimensionEvaluator protocol defined
- [ ] Plugin discovery mechanism
- [ ] At least 2 dimensions converted to plugins
- [ ] Documentation for creating new plugins
