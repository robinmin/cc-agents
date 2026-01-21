# cc-skills Specification

Technical specification for the cc-skills meta-skill implementation, covering architecture, extension points, and maintenance guidelines.

---

## Architecture Overview

### System Diagram

```
CLI Entry Point (scripts/skills.py)
    |
    +-- init
    +-- validate
    +-- evaluate
    +-- package
         |
Core Functions Layer
    - init_skill()
    - validate_skill()
    - evaluate_skill()
         |
Plugin Architecture
    - discover_evaluators()
    - DimensionEvaluator (Protocol)
         |
    +-- frontmatter (10%)
    +-- content (25%)
    +-- security (20%)
    +-- structure (15%)
    +-- efficiency (10%)
    +-- best_practices (10%)
    +-- code_quality (10%)
         |
Support Systems
    - CacheManager (mtime-based caching)
    - HookManager (event hooks)
    - Formatters (text/json/markdown)
```

### Design Principles

1. Protocol-Based Extensibility: Use Protocol for plugin interfaces
2. AST-Based Security: Parse code, not strings, for security analysis
3. Progressive Disclosure: Three-level content loading
4. Evaluation-First: Test -> Gap Analysis -> Write -> Iterate
5. Plugin Architecture: Discover and load evaluators dynamically

---

## Core Components

### scripts/skills.py

Main entry point, CLI interface, core functions.

**Key Sections:**
- Lines 1-20: Module docstring and usage guide
- Lines 22-46: Imports and dependencies
- Lines 48-350: AST-based security analysis
- Lines 352-450: Frontmatter parsing
- Lines 452-550: Validation functions
- Lines 552-750: Evaluation orchestration
- Lines 752-900: Caching layer
- Lines 902-1000: Hook system
- Lines 1002-1100: Formatters
- Lines 1102-end: CLI interface

### scripts/evaluators/

Plugin modules for quality evaluation.

**Structure:**
```
evaluators/
├── __init__.py          # Public API exports
├── base.py              # Base classes and Protocol
├── frontmatter.py       # FrontmatterEvaluator (10%)
├── content.py           # ContentEvaluator (25%)
├── security.py          # SecurityEvaluator (20%)
├── structure.py         # StructureEvaluator (15%)
├── efficiency.py        # EfficiencyEvaluator (10%)
├── best_practices.py    # BestPracticesEvaluator (10%)
└── code_quality.py      # CodeQualityEvaluator (10%)
```

---

## Plugin System

### DimensionEvaluator Protocol

Location: `scripts/evaluators/base.py`

```python
@runtime_checkable
class DimensionEvaluator(Protocol):
    @property
    def name(self) -> str: ...

    @property
    def weight(self) -> float: ...

    def evaluate(self, skill_path: Path) -> DimensionScore: ...
```

**Key Points:**
- Uses `@runtime_checkable` for `isinstance()` checks
- Properties are not callable (use `hasattr()`, not `callable()`)
- `evaluate()` method must be callable

### Evaluator Discovery Algorithm

Function: `discover_evaluators()` in skills.py

```
1. Get plugins_dir (default: scripts/evaluators/)
2. Add parent to sys.path for package imports
3. Import evaluators package as a module
4. Iterate through dir(evals_module):
   a. Skip private attributes (startswith("_"))
   b. Check if item is a class (isinstance(item, type))
   c. Check __module__ startswith("evaluators.")
   d. Check for name, weight properties
   e. Check for callable evaluate() method
   f. Instantiate and append to list
5. Return evaluators list
```

**Critical Implementation Details:**

```python
# Variable naming to avoid shadowing
import evaluators as evals_module  # NOT: import evaluators

# Module check (not exact match)
if item.__module__.startswith("evaluators."):

# Property checks (not callable)
has_name = hasattr(item, "name")  # NOT: callable(getattr(item, "name"))

# Method check (is callable)
has_evaluate = callable(getattr(item, "evaluate"))
```

---

## Evaluator Modules

### FrontmatterEvaluator (10%)
- Required fields: name, description
- Name validation: max 64 chars, hyphen-case
- Description validation: 20-1024 chars, no angle brackets

### ContentEvaluator (25%)
- Content length: 20-500 lines
- Required sections: Overview, Examples, Workflow
- TODO placeholders

### SecurityEvaluator (20%)
- AST-based analysis of Python code blocks
- Dangerous patterns: eval(), exec(), __import__(), os.system(), pickle.loads()
- Subprocess calls with shell=True
- File system operations: shutil.rmtree(), os.remove(), os.unlink(), fs.rm(), etc.
- Sensitive file access: .env, ~/.ssh/, ~/.aws/, ~/.config/, /etc/passwd
- Pattern types: AST_GREP (function calls), REGEX (string patterns)

### StructureEvaluator (15%)
- Directory structure: SKILL.md, scripts/, references/, assets/
- Progressive disclosure: Quick Start, Overview, Advanced
- Heading hierarchy: Starts with # or ##

### EfficiencyEvaluator (10%)
- Token count estimate (4 chars approx 1 token)
- Duplicate lines (>20 chars, case-insensitive)
- Verbose lines (>30 words average)

### BestPracticesEvaluator (10%)
- Hyphen-case naming
- TODO placeholders
- Description length
- When-to-use guidance

### CodeQualityEvaluator (10%)
- Error handling (try blocks)
- Main guard (if __name__ == "__main__")
- Type hints (coverage %)
- Docstrings

---

## Rules System

### Rule Categories

Location: scripts/skills.py (RuleCategory enum)

Categories include:
- SECURITY: Code injection, command execution, download patterns
- CODE_QUALITY: Code quality issues
- FILE_SYSTEM: File operations and sensitive access
- STYLE: Style violations
- PERFORMANCE: Performance issues
- BEST_PRACTICES: Best practice violations

### Built-in Rules Summary

**SEC001-SEC012**: Security (injection, command execution)
**SEC013-SEC019**: File system removal operations
**SEC020-SEC029**: Sensitive file access patterns
**SEC030-SEC035**: Network downloads (urllib, requests, fetch, etc.)
**SEC036-SEC043**: Download + execute patterns (curl|sh, exec(urlopen()))
**SEC044-SEC048**: Package installation from external URLs
**Q001**: Code quality (bare except)

### Pattern Types

| Type | Usage | Example |
|------|-------|---------|
| AST_GREP | Function call patterns | shutil.rmtree($$$) |
| AST | Python AST traversal | except: |
| REGEX | String literal patterns | ".env" |

---

## Configuration Management

### Config Dataclass

Location: scripts/skills.py

```python
@dataclass
class Config:
    weights: dict[str, float]
    disabled_checks: list[str]
    thresholds: dict[str, int]
    languages: list[str]

    def __post_init__(self) -> None:
        # Validate weights sum to ~1.0
        # Validate disabled_checks is list of strings
        # Validate thresholds is dict with str keys and int values
        # Validate languages is list of strings
```

### Config File (.cc-skills.yaml)

```yaml
weights:
  frontmatter: 0.10
  content: 0.25
  security: 0.20
  structure: 0.15
  efficiency: 0.10
  best_practices: 0.10
  code_quality: 0.10

disabled_checks:
  - "line-length-check"

thresholds:
  max_skill_lines: 500
  max_description_length: 1024

languages:
  - "python"
  - "javascript"
```

---

## Extension Points

### Hook System

Location: scripts/skills.py

**Available Hooks:**
- `pre_validate` / `post_validate`
- `pre_evaluate` / `post_evaluate`
- `pre_package` / `post_package`

```python
from skills import HookManager

hooks = HookManager()

@hooks.register("pre_evaluate")
def log_evaluation_start(skill_path: Path):
    print(f"Starting evaluation: {skill_path}")
```

### Custom Evaluators

Create new file in `scripts/evaluators/`:

```python
from pathlib import Path
from .base import DimensionScore, DIMENSION_WEIGHTS

class CustomEvaluator:
    def __init__(self):
        self._name = "custom"
        self._weight = DIMENSION_WEIGHTS.get("custom", 0.10)

    @property
    def name(self) -> str:
        return self._name

    @property
    def weight(self) -> float:
        return self._weight

    def evaluate(self, skill_path: Path) -> DimensionScore:
        findings = []
        recommendations = []
        score = 10.0

        # Your evaluation logic here

        return DimensionScore(
            name=self.name,
            score=max(0.0, min(10.0, score)),
            weight=self.weight,
            findings=findings,
            recommendations=recommendations,
        )
```

---

## Data Structures

### DimensionScore
```python
@dataclass
class DimensionScore:
    name: str
    score: float  # 0.0-10.0
    weight: float
    findings: list[str]
    recommendations: list[str]

    @property
    def weighted_score(self) -> float:
        return self.score * self.weight
```

### EvaluationResult
```python
@dataclass
class EvaluationResult:
    skill_path: Path
    validation: ValidationResult
    dimensions: dict[str, DimensionScore]
    overall_score: float
    grade: Grade
```

### Grade Enum
```python
class Grade(Enum):
    A = "A - Production ready"  # 9.0-10.0
    B = "B - Minor fixes needed"  # 7.0-8.9
    C = "C - Moderate revision"  # 5.0-6.9
    D = "D - Major revision"  # 3.0-4.9
    F = "F - Rewrite needed"  # 0.0-2.9
```

---

## Maintenance Guidelines

### Adding a New Evaluator

1. Create `scripts/evaluators/my_evaluator.py`
2. Implement evaluator class with name, weight, evaluate()
3. Add default weight to DIMENSION_WEIGHTS in base.py
4. Test with `python3 scripts/skills.py evaluate ./test-skill`

### Updating Security Patterns

Location: scripts/skills.py (line 53-120)

Add to DANGEROUS_CALLS dict:
```python
DANGEROUS_CALLS: dict[str, str] = {
    "eval": "Direct eval() call (code injection risk)",
    "new_pattern": "Description of danger",
}
```

### Modifying Weights

Location: scripts/evaluators/base.py

Update DIMENSION_WEIGHTS and ensure sum equals 1.0:
```python
DIMENSION_WEIGHTS: dict[str, float] = {
    "frontmatter": 0.15,
    "content": 0.20,
    # ...
}
assert abs(sum(DIMENSION_WEIGHTS.values()) - 1.0) < 0.01
```

---

## Performance Considerations

### Caching
- Cache hits: Avoid re-parsing files
- Cache invalidation: mtime-based, automatic
- Cache location: `.cache/skills_cache.json`

### AST Parsing
- Cost: ~5-10ms per file
- Benefit: Accurate security detection
- Optimization: Only parse .py files

### Evaluator Discovery
- Cost: ~50-100ms (one-time)
- Benefit: Dynamic plugin loading
- Optimization: Cache discovered evaluators
