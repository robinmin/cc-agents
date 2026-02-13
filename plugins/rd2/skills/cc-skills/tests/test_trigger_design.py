"""Tests for Trigger Design evaluator."""

import pytest
from pathlib import Path
import tempfile
import os

# Add scripts directory to path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from evaluators.trigger_design import TriggerDesignEvaluator, evaluate_trigger_design


def create_skill_md(content: str) -> Path:
    """Create a temporary skill directory with SKILL.md."""
    tmp_dir = Path(tempfile.mkdtemp())
    skill_dir = tmp_dir / "test-skill"
    skill_dir.mkdir()
    skill_md = skill_dir / "SKILL.md"
    skill_md.write_text(content)
    return skill_dir


class TestTriggerDesignEvaluator:
    """Test cases for TriggerDesignEvaluator."""

    def test_good_description_with_triggers(self):
        """Test skill with good trigger phrases."""
        skill = create_skill_md("""---
name: test-skill
description: "This skill should be used when the user asks to 'create a hook', 'add PreToolUse validation', or mentions 'before tool use'. Also use when encountering 'Hook timed out', 'ENOTEMPTY', or 'zombie processes'. This skill provides hook event guidance."
---

# Test Skill

## Overview

This is a test skill.
""")
        evaluator = TriggerDesignEvaluator()
        result = evaluator.evaluate(skill)

        assert result.score > 60
        assert "SKILL.md not found" not in result.findings

    def test_vague_description(self):
        """Test skill with vague, trigger-less description."""
        skill = create_skill_md("""---
name: test-skill
description: This skill helps with hooks and validation.
---

# Test Skill

## Overview

This is a test skill.
""")
        evaluator = TriggerDesignEvaluator()
        result = evaluator.evaluate(skill)

        # Should score low due to missing trigger phrases
        assert result.score < 50
        # Should have recommendations for low score
        assert len(result.recommendations) > 0

    def test_workflow_summary_violation(self):
        """Test skill with workflow summary in description (CSO violation)."""
        skill = create_skill_md("""---
name: test-skill
description: "This skill should be used when the user asks to create a hook. First analyze the hook type, then identify the event, and finally apply the validation."
---

# Test Skill

## Overview

This is a test skill.
""")
        evaluator = TriggerDesignEvaluator()
        result = evaluator.evaluate(skill)

        # Should deduct points for workflow summary
        assert any("workflow" in f.lower() for f in result.findings)

    def test_missing_skill_md(self):
        """Test with missing SKILL.md."""
        skill = Path("/nonexistent/skill")
        evaluator = TriggerDesignEvaluator()
        result = evaluator.evaluate(skill)

        assert result.score == 0.0
        assert "SKILL.md not found" in result.findings

    def test_invalid_frontmatter(self):
        """Test with invalid YAML frontmatter."""
        skill = create_skill_md("""---
name: test-skill
invalid yaml here
---
# Test Skill
""")
        evaluator = TriggerDesignEvaluator()
        result = evaluator.evaluate(skill)

        assert result.score == 0.0
        assert any("invalid" in f.lower() or "error" in f.lower() for f in result.findings)

    def test_empty_description(self):
        """Test with empty description."""
        skill = create_skill_md("""---
name: test-skill
description:
---

# Test Skill
""")
        evaluator = TriggerDesignEvaluator()
        result = evaluator.evaluate(skill)

        # Should score low
        assert result.score < 50

    def test_dimension_properties(self):
        """Test evaluator has correct name and weight."""
        evaluator = TriggerDesignEvaluator()

        assert evaluator.name == "trigger_design"
        assert 0 < evaluator.weight <= 1.0

    def test_backward_compat_function(self):
        """Test standalone function works."""
        skill = create_skill_md("""---
name: test-skill
description: "Use when user says 'create hook'"
---

# Test Skill
""")
        result = evaluate_trigger_design(skill)

        assert result.name == "trigger_design"
        assert 0 <= result.score <= 100

    def test_third_person_form(self):
        """Test third-person form detection."""
        skill = create_skill_md("""---
name: test-skill
description: "This skill should be used when the user asks to 'test something'"
---

# Test Skill
""")
        evaluator = TriggerDesignEvaluator()
        result = evaluator.evaluate(skill)

        # Should get points for third-person form
        assert any("third-person" in f.lower() for f in result.findings)

    def test_cso_coverage(self):
        """Test CSO keyword coverage."""
        skill = create_skill_md("""---
name: test-skill
description: "Use when encountering 'Hook timed out', 'error', 'timeout', or using `python` commands"
---

# Test Skill
""")
        evaluator = TriggerDesignEvaluator()
        result = evaluator.evaluate(skill)

        # Should have CSO coverage
        assert any("cso" in f.lower() or "category" in f.lower() for f in result.findings)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
