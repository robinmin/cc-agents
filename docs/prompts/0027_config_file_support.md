---
wbs: "0015"
phase: 3
title: Add Configuration File Support
status: Done
priority: Medium
dependencies: ["0013"]
---

# Task 0015: Add Configuration File Support

## Background

Currently all settings are hardcoded. Configuration file support would enable:
1. Per-skill custom weights
2. Disable specific checks
3. Custom thresholds
4. Project-wide settings

## Requirements

### Functional Requirements
1. Define configuration schema
2. Support YAML configuration files
3. Look for .cc-skills2.yaml in skill directory
4. Merge with defaults
5. CLI override support

### Success Criteria
- [ ] Configuration schema defined
- [ ] YAML loading works
- [ ] Per-skill config overrides defaults
- [ ] CLI flags override config file
- [ ] Documented configuration options

## Solution

### Configuration Schema

```yaml
# .cc-skills2.yaml
version: 1

# Dimension weights (must sum to 1.0)
weights:
  frontmatter: 0.10
  content: 0.25
  security: 0.20
  structure: 0.15
  efficiency: 0.10
  best_practices: 0.10
  code_quality: 0.10

# Disable specific checks
disabled_checks:
  - SEC001  # Allow specific pattern

# Thresholds
thresholds:
  max_lines: 500
  max_tokens: 3000

# Languages to analyze
languages:
  - python
  - typescript
```

### Configuration Loading

```python
from dataclasses import dataclass, field

@dataclass
class Config:
    weights: dict[str, float] = field(default_factory=lambda: DIMENSION_WEIGHTS.copy())
    disabled_checks: list[str] = field(default_factory=list)
    thresholds: dict[str, int] = field(default_factory=dict)
    languages: list[str] = field(default_factory=lambda: ["python"])

def load_config(skill_path: Path) -> Config:
    """Load configuration from skill directory."""
    config_file = skill_path / ".cc-skills2.yaml"
    if config_file.exists():
        # Load and merge with defaults
        ...
    return Config()
```

## References

- **File to modify:** `/Users/robin/projects/cc-agents/plugins/rd2/skills/cc-skills2/scripts/skills.py`

## Deliverables

- [ ] Config dataclass
- [ ] `load_config()` function
- [ ] Integration with evaluation
- [ ] Documentation of config options
- [ ] Example .cc-skills2.yaml
