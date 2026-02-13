"""Tests for Best Practices Evaluator."""

import pytest
from pathlib import Path
import tempfile

# Add scripts directory to path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from evaluators.best_practices import BestPracticesEvaluator, evaluate_best_practices


def create_skill_md(content: str) -> Path:
    """Create a temporary skill directory with SKILL.md."""
    tmp_dir = Path(tempfile.mkdtemp())
    skill_dir = tmp_dir / "test-skill"
    skill_dir.mkdir()
    (skill_dir / "SKILL.md").write_text(content)
    return skill_dir


GOOD_PRACTICES_SKILL = """---
name: good-practices-skill
description: A skill following best practices with when to use guidance
---

# Good Practices Skill

## When to Use

Use this skill when you need to:
- Process files efficiently
- Handle errors gracefully
- Validate input data

## Best Practices

### Code Style

```python
def process_data(data):
    '''Process input data.'''
    if not data:
        raise ValueError("Data required")
    return processed
```

### Error Handling

Always handle errors gracefully.

### Testing

Write tests for your code.

## Common Mistakes

❌ Bad: Not validating input
✅ Good: Always validate input

## See Also

- Related skill: data-validation
"""


class TestBestPracticesEvaluator:
    """Test cases for BestPracticesEvaluator."""

    def test_evaluator_properties(self):
        """Test evaluator has correct name and weight."""
        evaluator = BestPracticesEvaluator()

        assert evaluator.name == "best_practices"
        assert 0 < evaluator.weight <= 1.0

    def test_good_practices_score(self):
        """Test skill with good practices."""
        skill = create_skill_md(GOOD_PRACTICES_SKILL)

        evaluator = BestPracticesEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "best_practices"
        assert 0 <= result.score <= 100

    def test_skill_with_examples(self):
        """Test skill with code examples."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill with usage examples
---

# Test Skill

## Usage

```python
result = do_something()
```
""")

        evaluator = BestPracticesEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "best_practices"

    def test_skill_with_error_handling(self):
        """Test skill documenting error handling."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill with error handling
---

# Test Skill

## Error Handling

Handle errors gracefully.
""")

        evaluator = BestPracticesEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "best_practices"

    def test_skill_with_common_mistakes(self):
        """Test skill documenting common mistakes."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill with mistakes documented
---

# Test Skill

## Common Mistakes

❌ Bad: Using eval()
✅ Good: Using safe methods
""")

        evaluator = BestPracticesEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "best_practices"

    def test_bare_skill_score(self):
        """Test bare skill with minimal content."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

Simple content.
""")

        evaluator = BestPracticesEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "best_practices"
        assert 0 <= result.score <= 100

    def test_missing_skill_md(self):
        """Test with missing SKILL.md."""
        skill = Path("/nonexistent/skill")

        evaluator = BestPracticesEvaluator()
        result = evaluator.evaluate(skill)

        assert result.score == 0.0
        assert "not found" in result.findings[0].lower()

    def test_evaluate_function(self):
        """Test standalone evaluate function."""
        skill = create_skill_md(GOOD_PRACTICES_SKILL)

        result = evaluate_best_practices(skill)

        assert result.name == "best_practices"
        assert 0 <= result.score <= 100


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
