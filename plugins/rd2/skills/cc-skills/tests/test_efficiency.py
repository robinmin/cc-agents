"""Tests for Efficiency Evaluator."""

import pytest
from pathlib import Path
import tempfile

# Add scripts directory to path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from evaluators.efficiency import EfficiencyEvaluator, evaluate_efficiency


def create_skill_md(content: str) -> Path:
    """Create a temporary skill directory with SKILL.md."""
    tmp_dir = Path(tempfile.mkdtemp())
    skill_dir = tmp_dir / "test-skill"
    skill_dir.mkdir()
    (skill_dir / "SKILL.md").write_text(content)
    return skill_dir


EFFICIENT_SKILL = """---
name: efficient-skill
description: An efficient skill
---

# Efficient Skill

## Performance

Use batch operations and caching.

## Tips

- Use batch operations
- Cache results
- Stream large files

## Complexity

Time: O(n)
Space: O(1)
"""


class TestEfficiencyEvaluator:
    """Test cases for EfficiencyEvaluator."""

    def test_evaluator_properties(self):
        """Test evaluator has correct name and weight."""
        evaluator = EfficiencyEvaluator()

        assert evaluator.name == "efficiency"
        assert 0 < evaluator.weight <= 1.0

    def test_efficient_skill_score(self):
        """Test skill with efficiency guidance."""
        skill = create_skill_md(EFFICIENT_SKILL)

        evaluator = EfficiencyEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "efficiency"
        assert 0 <= result.score <= 100

    def test_skill_with_optimization_tips(self):
        """Test skill with optimization guidance."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

## Performance

- Batch operations
- Caching
""")

        evaluator = EfficiencyEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "efficiency"

    def test_skill_with_complexity_info(self):
        """Test skill with complexity documentation."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

## Complexity

O(n) time
O(1) space
""")

        evaluator = EfficiencyEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "efficiency"

    def test_skill_with_batching(self):
        """Test skill with batching documentation."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

## Batch Processing

Process in chunks of 1000.
""")

        evaluator = EfficiencyEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "efficiency"

    def test_bare_skill_score(self):
        """Test bare skill with minimal content."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

Simple.
""")

        evaluator = EfficiencyEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "efficiency"
        assert 0 <= result.score <= 100

    def test_missing_skill_md(self):
        """Test with missing SKILL.md."""
        skill = Path("/nonexistent/skill")

        evaluator = EfficiencyEvaluator()
        result = evaluator.evaluate(skill)

        assert result.score == 0.0

    def test_evaluate_function(self):
        """Test standalone evaluate function."""
        skill = create_skill_md(EFFICIENT_SKILL)

        result = evaluate_efficiency(skill)

        assert result.name == "efficiency"
        assert 0 <= result.score <= 100


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
