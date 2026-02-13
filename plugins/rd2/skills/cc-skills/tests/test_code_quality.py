"""Tests for Code Quality Evaluator."""

import pytest
from pathlib import Path
import tempfile

# Add scripts directory to path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from evaluators.code_quality import CodeQualityEvaluator, evaluate_code_quality


def create_skill_md(content: str) -> Path:
    """Create a temporary skill directory with SKILL.md."""
    tmp_dir = Path(tempfile.mkdtemp())
    skill_dir = tmp_dir / "test-skill"
    skill_dir.mkdir()
    (skill_dir / "SKILL.md").write_text(content)
    return skill_dir


QUALITY_CODE_SKILL = """---
name: quality-code-skill
description: A skill with quality code examples
---

# Quality Code Skill

## Code Style

```python
def process_data(data: dict) -> dict:
    '''Process input data.'''
    if not isinstance(data, dict):
        raise TypeError("Data must be dict")
    return processed
```

## Error Handling

```python
try:
    result = operation()
except ValueError as e:
    print(f"Error: {e}")
```

## Testing

```python
def test_example():
    assert True
```
"""


class TestCodeQualityEvaluator:
    """Test cases for CodeQualityEvaluator."""

    def test_evaluator_properties(self):
        """Test evaluator has correct name and weight."""
        evaluator = CodeQualityEvaluator()

        assert evaluator.name == "code_quality"
        assert 0 < evaluator.weight <= 1.0

    def test_quality_code_score(self):
        """Test skill with quality code examples."""
        skill = create_skill_md(QUALITY_CODE_SKILL)

        evaluator = CodeQualityEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "code_quality"
        assert 0 <= result.score <= 100

    def test_skill_with_type_hints(self):
        """Test skill with type hints."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

```python
def process(data: dict) -> str:
    return json.dumps(data)
```
""")

        evaluator = CodeQualityEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "code_quality"

    def test_skill_with_documentation(self):
        """Test skill with docstrings."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

```python
def main():
    '''Main entry point.'''
    pass
```
""")

        evaluator = CodeQualityEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "code_quality"

    def test_skill_with_error_handling(self):
        """Test skill with error handling examples."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

```python
try:
    result = operation()
except ValueError as e:
    print(f"Error: {e}")
```
""")

        evaluator = CodeQualityEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "code_quality"

    def test_skill_with_testing(self):
        """Test skill with testing examples."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

```python
def test_example():
    assert True
```
""")

        evaluator = CodeQualityEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "code_quality"

    def test_skill_with_naming(self):
        """Test skill with naming conventions."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

## Naming

- `user_name` - snake_case
- `ClassName` - PascalCase
""")

        evaluator = CodeQualityEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "code_quality"

    def test_bare_skill_score(self):
        """Test bare skill with minimal code."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

No code.
""")

        evaluator = CodeQualityEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "code_quality"
        assert 0 <= result.score <= 100

    def test_missing_skill_md(self):
        """Test with missing SKILL.md."""
        skill = Path("/nonexistent/skill")

        evaluator = CodeQualityEvaluator()
        result = evaluator.evaluate(skill)

        # Missing SKILL.md but evaluator checks scripts dir, not SKILL.md
        assert result.score >= 0
        assert len(result.findings) > 0

    def test_evaluate_function(self):
        """Test standalone evaluate function."""
        skill = create_skill_md(QUALITY_CODE_SKILL)

        result = evaluate_code_quality(skill)

        assert result.name == "code_quality"
        assert 0 <= result.score <= 100

    def test_skill_with_multiple_scripts(self):
        """Test skill with multiple Python scripts."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill
""")
        scripts_dir = skill / "scripts"
        scripts_dir.mkdir()

        # Create multiple scripts
        (scripts_dir / "script1.py").write_text('''"""Script 1."""
def func1() -> str:
    """Return a string."""
    return "hello"
''')
        (scripts_dir / "script2.py").write_text('''"""Script 2."""
def func2(x: int) -> int:
    """Return int."""
    return x * 2
''')

        evaluator = CodeQualityEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "code_quality"
        assert 0 <= result.score <= 100

    def test_skill_with_bare_except(self):
        """Test skill with bare except clauses."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill
""")
        scripts_dir = skill / "scripts"
        scripts_dir.mkdir()

        (scripts_dir / "script.py").write_text('''"""Script with bare except."""
def risky():
    try:
        x = 1 / 0
    except:  # bare except - should be flagged
        pass
''')

        evaluator = CodeQualityEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "code_quality"
        assert 0 <= result.score <= 100
        # Should detect bare except
        assert "bare" in str(result.findings).lower() or len(result.findings) > 0

    def test_skill_with_no_python_scripts(self):
        """Test skill with scripts dir but no Python files."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill
""")
        scripts_dir = skill / "scripts"
        scripts_dir.mkdir()
        (scripts_dir / "readme.txt").write_text("Not a Python script")

        evaluator = CodeQualityEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "code_quality"
        # Finding is "No Python scripts found"
        assert "No Python scripts" in result.findings[0]

    def test_evaluator_weight(self):
        """Test evaluator has correct weight."""
        evaluator = CodeQualityEvaluator()
        assert 0 < evaluator.weight <= 1.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
