# Design Document: Common Validation Tools for rd2 Plugin Skills

## 1. Architecture Overview

### Current State Analysis

| Component | cc-skills | cc-agents |
|-----------|-----------|-----------|
| Structure Validation | `scripts/evaluators/` (13 evaluators) | `scripts/validate_agent.py` |
| Frontmatter Validation | `evaluators/frontmatter.py` | Built into validate_agent.py |
| Behavioral Testing | `tests/scenarios.yaml` | `tests/scenarios.yaml` |
| Scoring Framework | `base.py` (RubricScorer, Grade, DimensionScore) | Partial (line count, competency count) |
| Section Patterns | `evaluators/structure.py` | Hardcoded SECTION_PATTERNS |

### Problem Statement

- **Duplication**: Both skills implement similar frontmatter/section validation logic
- **Inconsistency**: Different scoring approaches between skills
- **Non-extensible**: Adding new skill types requires copying validation logic
- **No common driver**: Each skill has its own test runner for scenarios.yaml

### Solution: Unified Validation Framework

```
plugins/rd2/scripts/
├── __init__.py                    # Package exports
├── validate_skill.py             # Unified CLI (auto-detects skill type)
├── schema/
│   ├── __init__.py
│   ├── base.py                   # Shared data classes
│   ├── frontmatter.py            # Common frontmatter validation
│   ├── sections.py               # Section pattern definitions
│   └── scenarios.py              # Scenario YAML schema
├── scoring/
│   ├── __init__.py
│   ├── weights.py                # Shared weight definitions
│   ├── grader.py                 # Grading logic
│   └── rubric.py                 # RubricScorer (adapted from cc-skills)
├── drivers/
│   ├── __init__.py
│   ├── structural.py             # Structure validation driver
│   ├── behavioral.py             # Behavioral test driver
│   └── runner.py                 # Unified test runner
└── plugins/
    ├── __init__.py
    ├── skill.py                  # cc-skills specific validation
    └── agent.py                  # cc-agents specific validation
```

---

## 2. File Structure Details

### 2.1 Schema Layer (`schema/`)

#### `schema/base.py` - Shared Data Classes

```python
"""Common data classes for all skill validations."""

from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any

@dataclass
class ValidationIssue:
    """A single validation issue (error or warning)."""
    severity: str  # "error" or "warning"
    category: str   # "frontmatter", "section", "content", "naming"
    message: str
    line: int | None = None
    field: str | None = None

@dataclass
class ValidationResult:
    """Complete validation result for a skill/agent."""
    path: Path
    valid: bool
    issues: list[ValidationIssue] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def errors(self) -> list[ValidationIssue]:
        return [i for i in self.issues if i.severity == "error"]

    @property
    def warnings(self) -> list[ValidationIssue]:
        return [i for i in self.issues if i.severity == "warning"]

class SkillType(Enum):
    """Supported skill types in rd2 plugin."""
    SKILL = "skill"
    AGENT = "agent"
    COMMAND = "command"
    HOOK = "hook"
```

#### `schema/frontmatter.py` - Common Frontmatter Validation

```python
"""Common frontmatter validation rules."""

from typing import Any

# Common field validators
def validate_name(name: Any, context: str) -> list[ValidationIssue]:
    """Validate name field (common rules for all types)."""
    issues = []
    if name is None:
        issues.append(ValidationIssue("error", "frontmatter", "name required", field="name"))
        return issues

    if not isinstance(name, str):
        issues.append(ValidationIssue("error", "frontmatter", "name must be string", field="name"))
        return issues

    # Length: 3-50 chars
    if len(name) < 3:
        issues.append(ValidationIssue("error", "frontmatter", f"name '{name}' too short", field="name"))
    if len(name) > 50:
        issues.append(ValidationIssue("error", "frontmatter", f"name '{name}' too long", field="name"))

    # Pattern: lowercase, numbers, hyphens only
    import re
    if not re.match(r"^[a-z0-9][a-z0-9-]*[a-z0-9]$", name):
        issues.append(ValidationIssue("warning", "frontmatter", f"name '{name}' should be lowercase with hyphens", field="name"))

    return issues

# Type-specific frontmatter schemas
FRONTMATTER_SCHEMAS = {
    SkillType.AGENT: {
        "required": ["name", "description", "model", "color"],
        "optional": ["tools"],
        "validators": {...}
    },
    SkillType.SKILL: {
        "required": ["name", "description"],
        "optional": ["triggers", "tools"],
        "validators": {...}
    },
    # ...
}
```

#### `schema/sections.py` - Section Pattern Definitions

```python
"""Common section patterns for all skill types."""

from dataclasses import dataclass

@dataclass
class SectionDefinition:
    """Definition of a required/optional section."""
    name: str
    required: bool
    patterns: list[str]  # Regex patterns to detect section
    min_items: int = 0  # For list-based sections

# Common sections across all types
COMMON_SECTIONS = [
    SectionDefinition(
        name="METADATA",
        required=True,
        patterns=[r"^#\s+", r"name:", r"description:"]
    ),
]

# Type-specific sections
SECTION_SCHEMAS = {
    "agent": [
        # 8-section agent anatomy
        "METADATA", "PERSONA", "PHILOSOPHY", "VERIFICATION",
        "COMPETENCIES", "PROCESS", "RULES", "OUTPUT"
    ],
    "skill": [
        # Skill anatomy
        "Description", "Triggers", "Workflow", "Sections",
        "Examples", "Rules", "Output"
    ],
}
```

#### `schema/scenarios.yaml` - Common Scenario Schema

```yaml
# plugins/rd2/scripts/schema/scenarios-schema.yaml
# Common schema for behavioral scenarios across all rd2 skills

version: "1.0"

trigger_tests:
  should_trigger:
    - query: string
      confidence: float  # 0.0-1.0
      notes?: string
  should_not_trigger:
    - query: string
      reason: string
  pass_criteria:
    min_trigger_rate: float
    max_false_positive_rate: float

scenarios:
  - name: string
    description?: string
    input: string
    expected_behaviors: string[]
    anti_behaviors: string[]
    context?:
      domain: string
      complexity: "low" | "medium" | "high"
      difficulty?: "beginner" | "intermediate" | "advanced"
    tags?: string[]
    validation?:
      method: "file_exists" | "output_contains" | "regex_match"
      expected: string

performance_tests:
  - name: string
    description: string
    baseline_without_skill:
      estimated_minutes: float
      common_errors: string[]
    with_skill:
      estimated_minutes: float
      improvements: string[]
```

---

### 2.2 Scoring Layer (`scoring/`)

#### `scoring/weights.py` - Shared Weight Definitions

```python
"""Default scoring weights for rd2 skills."""

from dataclasses import dataclass

@dataclass
class DimensionWeights:
    """Weights for different quality dimensions."""
    name: str
    weight: float
    description: str

# Default weights (can be overridden by specific skill types)
DEFAULT_WEIGHTS = [
    DimensionWeights("structure", 0.20, "File structure and organization"),
    DimensionWeights("frontmatter", 0.15, "YAML frontmatter completeness"),
    DimensionWeights("content", 0.20, "Content quality and depth"),
    DimensionWeights("clarity", 0.15, "Instruction clarity"),
    DimensionWeights("examples", 0.10, "Example quality"),
    DimensionWeights("security", 0.10, "Security best practices"),
    DimensionWeights("efficiency", 0.10, "Performance considerations"),
]

# Agent-specific weights (higher weight on competencies)
AGENT_WEIGHTS = [
    *DEFAULT_WEIGHTS,
    DimensionWeights("competencies", 0.25, "Competency count and quality"),
]

# Skill-specific weights (higher weight on triggers)
SKILL_WEIGHTS = [
    *DEFAULT_WEIGHTS,
    DimensionWeights("triggers", 0.25, "Trigger phrase coverage"),
]
```

#### `scoring/grader.py` - Grading Logic

```python
"""Common grading logic adapted from cc-skills."""

from enum import Enum

class Grade(Enum):
    """Letter grade with score ranges."""
    A = ("A", 90.0, 100.0, "Production ready")
    B = ("B", 70.0, 89.9, "Minor fixes needed")
    C = ("C", 50.0, 69.9, "Moderate revision")
    D = ("D", 30.0, 49.9, "Major revision")
    F = ("F", 0.0, 29.9, "Rewrite needed")

    @classmethod
    def from_score(cls, score: float) -> "Grade":
        if score >= 100.0:
            return cls.A
        for grade in cls:
            if grade.min_score <= score < grade.max_score:
                return grade
        return cls.F

@dataclass
class ScoreBreakdown:
    """Detailed score breakdown by dimension."""
    total_score: float
    grade: Grade
    dimension_scores: dict[str, float]
    findings: list[str]
    recommendations: list[str]
```

---

### 2.3 Drivers Layer (`drivers/`)

#### `drivers/structural.py` - Structure Validation Driver

```python
"""Structural validation driver."""

from pathlib import Path
from schema.base import ValidationResult, SkillType
from schema.frontmatter import validate_frontmatter
from schema.sections import SECTION_SCHEMAS

def validate_structure(
    path: Path,
    skill_type: SkillType,
    custom_sections: dict | None = None
) -> ValidationResult:
    """Validate file structure.

    Args:
        path: Path to skill/agent .md file
        skill_type: Type of skill (auto-detected or specified)
        custom_sections: Optional custom section definitions

    Returns:
        ValidationResult with all issues found
    """
    issues = []
    metadata = {}

    # 1. Check file exists and is readable
    if not path.exists():
        return ValidationResult(path, False, [
            ValidationIssue("error", "general", f"File not found: {path}")
        ])

    content = path.read_text()
    lines = content.split("\n")

    # 2. Parse and validate frontmatter
    fm, body = parse_frontmatter(content)
    metadata["frontmatter"] = fm
    issues.extend(validate_frontmatter(fm, skill_type))

    # 3. Validate sections
    sections = custom_sections or SECTION_SCHEMAS.get(skill_type.value, {})
    issues.extend(validate_sections(lines, sections))

    # 4. Validate naming conventions
    issues.extend(validate_naming(path, skill_type))

    valid = not any(i.severity == "error" for i in issues)
    return ValidationResult(path, valid, issues, metadata)
```

#### `drivers/behavioral.py` - Behavioral Test Driver

```python
"""Behavioral test driver - runs scenarios.yaml tests."""

import yaml
from pathlib import Path
from typing import Any

def load_scenarios(scenarios_path: Path) -> dict[str, Any]:
    """Load scenarios.yaml and validate against schema."""
    content = scenarios_path.read_text()
    # Validate against common schema
    return yaml.safe_load(content)

def run_trigger_tests(
    skill_module,
    scenarios: dict
) -> dict[str, Any]:
    """Run trigger detection tests.

    Args:
        skill_module: The skill module to test
        scenarios: Loaded scenarios.yaml content

    Returns:
        Dict with test results
    """
    should_trigger = scenarios.get("trigger_tests", {}).get("should_trigger", [])
    should_not_trigger = scenarios.get("trigger_tests", {}).get("should_not_trigger", [])

    results = {
        "triggered": [],
        "not_triggered": [],
        "false_positives": [],
        "false_negatives": []
    }

    # Test should_trigger cases
    for case in should_trigger:
        query = case["query"]
        expected = case.get("confidence", 0.8)
        # Call skill's trigger detection
        score = skill_module.detect_trigger(query)
        if score >= expected:
            results["triggered"].append(query)
        else:
            results["false_negatives"].append({"query": query, "score": score})

    # Test should_not_trigger cases
    for case in should_not_trigger:
        query = case["query"]
        score = skill_module.detect_trigger(query)
        if score > 0.3:  # Threshold for "would trigger"
            results["false_positives"].append({"query": query, "score": score})
        else:
            results["not_triggered"].append(query)

    # Calculate pass/fail
    criteria = scenarios.get("trigger_tests", {}).get("pass_criteria", {})
    trigger_rate = len(results["triggered"]) / len(should_trigger) if should_trigger else 0
    fp_rate = len(results["false_positives"]) / len(should_not_trigger) if should_not_trigger else 0

    results["passed"] = (
        trigger_rate >= criteria.get("min_trigger_rate", 0.85) and
        fp_rate <= criteria.get("max_false_positive_rate", 0.15)
    )

    return results

def run_scenario_tests(
    skill_module,
    scenarios: dict,
    validation_method: str = "output_contains"
) -> dict[str, Any]:
    """Run scenario-based behavioral tests."""
    results = []

    for scenario in scenarios.get("scenarios", []):
        # Execute scenario input
        output = skill_module.execute(scenario["input"])

        # Validate against expected behaviors
        passed = True
        for expected in scenario.get("expected_behaviors", []):
            if not validate_behavior(output, expected, validation_method):
                passed = False
                break

        # Check for anti-behaviors
        for anti in scenario.get("anti_behaviors", []):
            if validate_behavior(output, anti, validation_method):
                passed = False
                break

        results.append({
            "name": scenario["name"],
            "passed": passed,
            "input": scenario["input"]
        })

    return {"scenarios": results, "all_passed": all(r["passed"] for r in results)}
```

---

### 2.4 Unified CLI (`validate_skill.py`)

```python
#!/usr/bin/env python3
"""Unified validation CLI for rd2 plugin skills.

Auto-detects skill type and runs appropriate validation.
"""

import argparse
import sys
from pathlib import Path

def detect_skill_type(path: Path) -> SkillType:
    """Auto-detect skill type from file content and location."""
    content = path.read_text()

    # Check location
    if "/agents/" in str(path):
        return SkillType.AGENT
    if "/commands/" in str(path):
        return SkillType.COMMAND

    # Check frontmatter
    if "model:" in content and "color:" in content:
        return SkillType.AGENT
    if "triggers:" in content:
        return SkillType.SKILL

    # Default to skill
    return SkillType.SKILL

def main():
    parser = argparse.ArgumentParser(description="Validate rd2 skill/agent")
    parser.add_argument("path", help="Path to skill/agent .md file")
    parser.add_argument("--type", choices=["skill", "agent", "command"], help="Force skill type")
    parser.add_argument("--strict", action="store_true", help="Treat warnings as errors")
    parser.add_argument("--scenarios", help="Path to scenarios.yaml for behavioral tests")
    parser.add_argument("--output", choices=["text", "json"], default="text")
    args = parser.parse_args()

    path = Path(args.path)

    # Detect or use specified type
    skill_type = SkillType(args.type) if args.type else detect_skill_type(path)

    # Run structural validation
    result = validate_structure(path, skill_type)

    # Run behavioral tests if scenarios provided
    if args.scenarios:
        scenarios = load_scenarios(Path(args.scenarios))
        behavioral = run_behavioral_tests(path, skill_type, scenarios)
        result.metadata["behavioral"] = behavioral

    # Output results
    if args.output == "json":
        print(json.dumps(result.to_dict(), indent=2))
    else:
        print_results(result)

    # Exit code
    if not result.valid or (args.strict and result.warnings):
        return 1
    return 0

if __name__ == "__main__":
    sys.exit(main())
```

---

## 3. Common Validation Functions

### 3.1 Core Functions to Create

| Function | Purpose | Location |
|----------|---------|----------|
| `parse_frontmatter()` | Parse YAML frontmatter from markdown | `schema/frontmatter.py` |
| `validate_frontmatter()` | Validate frontmatter against schema | `schema/frontmatter.py` |
| `validate_sections()` | Check required sections exist | `schema/sections.py` |
| `validate_naming()` | Validate file/directory naming | `schema/base.py` |
| `load_scenarios()` | Load and validate scenarios.yaml | `drivers/behavioral.py` |
| `run_trigger_tests()` | Execute trigger detection tests | `drivers/behavioral.py` |
| `run_scenario_tests()` | Execute behavioral scenario tests | `drivers/behavioral.py` |
| `calculate_score()` | Calculate weighted score from dimensions | `scoring/grader.py` |
| `get_grade()` | Convert score to letter grade | `scoring/grader.py` |

### 3.2 Extension Points

```python
# Custom validators can be registered
VALIDATOR_REGISTRY: dict[str, callable] = {}

def register_validator(skill_type: SkillType, validator: callable):
    """Register custom validator for a skill type."""
    VALIDATOR_REGISTRY[skill_type.value] = validator

# Custom weights can be merged
def merge_weights(base: list[DimensionWeights], custom: list[DimensionWeights]) -> list[DimensionWeights]:
    """Merge custom weights with base weights."""
    # ...
```

---

## 4. Integration Guide

### 4.1 cc-skills Integration

```python
# In cc-skills/scripts/validate_skill.py (replaces existing logic)
from rd2.scripts.schema import SkillType, ValidationResult
from rd2.scripts.drivers import validate_structure
from rd2.scripts.scoring import calculate_score, Grade

def validate_skill(skill_path: Path) -> ValidationResult:
    # Use common validation
    result = validate_structure(skill_path, SkillType.SKILL)

    # Add cc-skills specific evaluators
    from evaluators import (
        SecurityEvaluator,
        TriggerDesignEvaluator,
        InstructionClarityEvaluator,
    )

    for evaluator in [SecurityEvaluator(), TriggerDesignEvaluator()]:
        result.issues.extend(evaluator.evaluate(skill_path))

    # Calculate score
    result.metadata["score"] = calculate_score(result.issues)
    return result
```

### 4.2 cc-agents Integration

```python
# In cc-agents/scripts/validate_agent.py (simplified)
from rd2.scripts.schema import SkillType, ValidationResult
from rd2.scripts.drivers import validate_structure
from rd2.scripts.scoring import calculate_score, Grade

# Remove duplicated validation logic, use common driver
result = validate_structure(agent_path, SkillType.AGENT)

# Add agent-specific checks (line count, competencies)
result.issues.extend(validate_agent_specific(path))

# Use common scoring
result.metadata["score"] = calculate_score(result.issues)
```

### 4.3 Adding New Skill Types

```python
# For new skill type (e.g., commands)
from rd2.scripts.schema import SkillType, SectionDefinition
from rd2.scripts.drivers import validate_structure

# Define command sections
COMMAND_SECTIONS = [
    SectionDefinition("Description", required=True, patterns=[r"##\s+Description"]),
    SectionDefinition("Usage", required=True, patterns=[r"##\s+Usage"]),
    SectionDefinition("Arguments", required=False, patterns=[r"##\s+Arguments"]),
    # ...
]

# Register and validate
result = validate_structure(cmd_path, SkillType.COMMAND, COMMAND_SECTIONS)
```

---

## 5. Example Usage

### 5.1 CLI Usage

```bash
# Auto-detect and validate
python validate_skill.py plugins/rd2/skills/my-skill/SKILL.md

# Specify type explicitly
python validate_skill.py plugins/rd2/agents/my-agent.md --type agent

# Strict mode (warnings = errors)
python validate_skill.py path/to/file.md --strict

# With behavioral tests
python validate_skill.py path/to/file.md --scenarios tests/scenarios.yaml

# JSON output for CI/CD
python validate_skill.py path/to/file.md --output json
```

### 5.2 Programmatic Usage

```python
from rd2.scripts import validate_structure, SkillType
from rd2.scripts.scoring import calculate_score, Grade

# Simple validation
result = validate_structure(Path("skills/my-skill/SKILL.md"), SkillType.SKILL)
print(f"Valid: {result.valid}")
print(f"Errors: {len(result.errors)}")

# With scoring
score = calculate_score(result.issues)
grade = Grade.from_score(score)
print(f"Score: {score}, Grade: {grade.letter}")
```

### 5.3 CI/CD Integration

```yaml
# .github/workflows/validate-skills.yml
- name: Validate Skills
  run: |
    for skill in plugins/rd2/skills/*/; do
      python scripts/validate_skill.py "$skill/SKILL.md" --strict --output json
    done
```

---

## 6. Migration Path

### Phase 1: Create Common Library
1. Create `plugins/rd2/scripts/schema/` with base classes
2. Implement common frontmatter/section validation
3. Adapt RubricScorer from cc-skills

### Phase 2: Update Existing Skills
1. Update cc-agents to use common validation
2. Update cc-skills to use common scoring
3. Create unified CLI

### Phase 3: Extend to New Types
1. Add command validation
2. Add hook validation
3. Document extension patterns

---

## 7. Summary

This design provides:

1. **Unified validation** - Single CLI for all skill types with auto-detection
2. **Shared schema** - Common frontmatter, section, and scenario definitions
3. **Extensible scoring** - Configurable weights per skill type
4. **Behavioral testing** - Common driver for scenarios.yaml
5. **Clean separation** - Schema/Scoring/Drivers layers
6. **Migration path** - Phased approach to adoption
