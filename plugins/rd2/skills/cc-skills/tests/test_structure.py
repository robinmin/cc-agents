"""Tests for Structure Evaluator."""

import pytest
from pathlib import Path
import tempfile

# Add scripts directory to path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from evaluators.structure import StructureEvaluator, evaluate_structure


def create_skill_md(content: str) -> Path:
    """Create a temporary skill directory with SKILL.md."""
    tmp_dir = Path(tempfile.mkdtemp())
    skill_dir = tmp_dir / "test-skill"
    skill_dir.mkdir()
    (skill_dir / "SKILL.md").write_text(content)
    return skill_dir


WELL_STRUCTURED_SKILL = """---
name: well-structured-skill
description: A well-structured skill
---

# Well Structured Skill

## Overview

This skill provides comprehensive functionality.

## When to Use

Use when processing data.

## Prerequisites

- Python 3.8+
- Required packages

## Getting Started

1. Install
2. Configure
3. Run

## Examples

```python
result = process()
```

## Troubleshooting

- Check logs
- Verify settings

## See Also

- Related skill
"""


class TestStructureEvaluator:
    """Test cases for StructureEvaluator."""

    def test_evaluator_properties(self):
        """Test evaluator has correct name and weight."""
        evaluator = StructureEvaluator()

        assert evaluator.name == "structure"
        # Weight is 0 in Tier 2 model - now validated in Tier 1
        assert 0 <= evaluator.weight <= 1.0

    def test_well_structured_skill_score(self):
        """Test skill with good structure."""
        skill = create_skill_md(WELL_STRUCTURED_SKILL)

        evaluator = StructureEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "structure"
        assert 0 <= result.score <= 100

    def test_skill_with_overview(self):
        """Test skill with overview section."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

## Overview

This skill does something.
""")

        evaluator = StructureEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "structure"

    def test_skill_with_examples(self):
        """Test skill with examples section."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

## Examples

```python
result = do()
```
""")

        evaluator = StructureEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "structure"

    def test_skill_with_troubleshooting(self):
        """Test skill with troubleshooting section."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

## Troubleshooting

Check logs.
""")

        evaluator = StructureEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "structure"

    def test_skill_with_prerequisites(self):
        """Test skill with prerequisites section."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

## Prerequisites

- Python 3.8
""")

        evaluator = StructureEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "structure"

    def test_skill_with_when_to_use(self):
        """Test skill with when to use section."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

## When to Use

When processing data.
""")

        evaluator = StructureEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "structure"

    def test_bare_skill_score(self):
        """Test bare skill with minimal content."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

Minimal.
""")

        evaluator = StructureEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "structure"
        assert 0 <= result.score <= 100

    def test_missing_skill_md(self):
        """Test with missing SKILL.md."""
        skill = Path("/nonexistent/skill")

        evaluator = StructureEvaluator()
        result = evaluator.evaluate(skill)

        # Missing SKILL.md results in low score but not zero
        assert result.score >= 0
        assert len(result.findings) > 0

    def test_evaluate_function(self):
        """Test standalone evaluate function."""
        skill = create_skill_md(WELL_STRUCTURED_SKILL)

        result = evaluate_structure(skill)

        assert result.name == "structure"
        assert 0 <= result.score <= 100


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
