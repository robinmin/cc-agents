"""Tests for Frontmatter Evaluator."""

import pytest
from pathlib import Path
import tempfile

# Add scripts directory to path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from evaluators.frontmatter import FrontmatterEvaluator, evaluate_frontmatter


def create_skill_md(content: str) -> Path:
    """Create a temporary skill directory with SKILL.md."""
    tmp_dir = Path(tempfile.mkdtemp())
    skill_dir = tmp_dir / "test-skill"
    skill_dir.mkdir()
    (skill_dir / "SKILL.md").write_text(content)
    return skill_dir


COMPLETE_FRONTMATTER_SKILL = """---
name: complete-skill
description: A skill with complete frontmatter
trigger: file-processing, data
tags: [python, processing]
complexity: intermediate
version: 1.0.0
---

# Complete Skill

This skill has all required frontmatter.
"""


class TestFrontmatterEvaluator:
    """Test cases for FrontmatterEvaluator."""

    def test_evaluator_properties(self):
        """Test evaluator has correct name and weight."""
        evaluator = FrontmatterEvaluator()

        assert evaluator.name == "frontmatter"
        assert 0 < evaluator.weight <= 1.0

    def test_complete_frontmatter_score(self):
        """Test skill with complete frontmatter."""
        skill = create_skill_md(COMPLETE_FRONTMATTER_SKILL)

        evaluator = FrontmatterEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "frontmatter"
        assert 0 <= result.score <= 100

    def test_skill_with_name(self):
        """Test skill with name field."""
        skill = create_skill_md("""---
name: my-skill
description: A skill
---

# My Skill
""")

        evaluator = FrontmatterEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "frontmatter"

    def test_skill_with_triggers(self):
        """Test skill with trigger field."""
        skill = create_skill_md("""---
name: my-skill
description: A skill
trigger: file-processing
---

# My Skill
""")

        evaluator = FrontmatterEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "frontmatter"

    def test_skill_with_tags(self):
        """Test skill with tags field."""
        skill = create_skill_md("""---
name: my-skill
description: A skill
tags: [python, processing]
---

# My Skill
""")

        evaluator = FrontmatterEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "frontmatter"

    def test_skill_with_complexity(self):
        """Test skill with complexity field."""
        skill = create_skill_md("""---
name: my-skill
description: A skill
complexity: beginner
---

# My Skill
""")

        evaluator = FrontmatterEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "frontmatter"

    def test_skill_with_version(self):
        """Test skill with version field."""
        skill = create_skill_md("""---
name: my-skill
description: A skill
version: 1.0.0
---

# My Skill
""")

        evaluator = FrontmatterEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "frontmatter"

    def test_skill_missing_frontmatter(self):
        """Test skill without frontmatter."""
        skill = create_skill_md("""# My Skill

No frontmatter.
""")

        evaluator = FrontmatterEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "frontmatter"

    def test_empty_frontmatter(self):
        """Test skill with empty frontmatter."""
        skill = create_skill_md("""---

# My Skill
""")

        evaluator = FrontmatterEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "frontmatter"

    def test_missing_name_field(self):
        """Test skill missing name field."""
        skill = create_skill_md("""---
description: A skill without name
trigger: test
---

# My Skill
""")

        evaluator = FrontmatterEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "frontmatter"

    def test_missing_description_field(self):
        """Test skill missing description field."""
        skill = create_skill_md("""---
name: my-skill
trigger: test
---

# My Skill
""")

        evaluator = FrontmatterEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "frontmatter"

    def test_missing_skill_md(self):
        """Test with missing SKILL.md."""
        skill = Path("/nonexistent/skill")

        evaluator = FrontmatterEvaluator()
        result = evaluator.evaluate(skill)

        assert result.score == 0.0

    def test_evaluate_function(self):
        """Test standalone evaluate function."""
        skill = create_skill_md(COMPLETE_FRONTMATTER_SKILL)

        result = evaluate_frontmatter(skill)

        assert result.name == "frontmatter"
        assert 0 <= result.score <= 100


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
