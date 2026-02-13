"""Tests for Content Quality Evaluator."""

import pytest
from pathlib import Path
import tempfile

# Add scripts directory to path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from evaluators.content import ContentEvaluator, evaluate_content


def create_skill_md(content: str) -> Path:
    """Create a temporary skill directory with SKILL.md."""
    tmp_dir = Path(tempfile.mkdtemp())
    skill_dir = tmp_dir / "test-skill"
    skill_dir.mkdir()
    (skill_dir / "SKILL.md").write_text(content)
    return skill_dir


QUALITY_CONTENT_SKILL = """---
name: quality-content-skill
description: A skill with high-quality content
---

# Quality Content Skill

This skill provides comprehensive documentation.

## Overview

The processing module handles various inputs.

## Usage

1. First, understand requirements
2. Configure parameters
3. Execute operation

## Examples

```python
result = process(data)
print(result)
```

## Troubleshooting

- Check logs
- Verify settings
"""


class TestContentEvaluator:
    """Test cases for ContentEvaluator."""

    def test_evaluator_properties(self):
        """Test evaluator has correct name and weight."""
        evaluator = ContentEvaluator()

        assert evaluator.name == "content"
        assert 0 < evaluator.weight <= 1.0

    def test_quality_content_score(self):
        """Test skill with quality content."""
        skill = create_skill_md(QUALITY_CONTENT_SKILL)

        evaluator = ContentEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "content"
        assert 0 <= result.score <= 100

    def test_skill_with_code_examples(self):
        """Test skill with code examples."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

```python
def example():
    print("Hello")
```
""")

        evaluator = ContentEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "content"

    def test_skill_with_tables(self):
        """Test skill with markdown tables."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

| Name | Type | Description |
|------|------|-------------|
| a | int | First |
""")

        evaluator = ContentEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "content"

    def test_skill_with_steps(self):
        """Test skill with numbered instructions."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

1. First step
2. Second step
""")

        evaluator = ContentEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "content"

    def test_skill_with_troubleshooting(self):
        """Test skill with troubleshooting section."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

## Troubleshooting

- Check logs
""")

        evaluator = ContentEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "content"

    def test_bare_skill_score(self):
        """Test bare skill with minimal content."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

Minimal.
""")

        evaluator = ContentEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "content"
        assert 0 <= result.score <= 100

    def test_missing_skill_md(self):
        """Test with missing SKILL.md."""
        skill = Path("/nonexistent/skill")

        evaluator = ContentEvaluator()
        result = evaluator.evaluate(skill)

        assert result.score == 0.0

    def test_evaluate_function(self):
        """Test standalone evaluate function."""
        skill = create_skill_md(QUALITY_CONTENT_SKILL)

        result = evaluate_content(skill)

        assert result.name == "content"
        assert 0 <= result.score <= 100


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
