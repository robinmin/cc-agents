"""Tests for Instruction Clarity evaluator."""

import pytest
from pathlib import Path
import tempfile

# Add scripts directory to path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from evaluators.instruction_clarity import InstructionClarityEvaluator, evaluate_instruction_clarity


def create_skill_md(content: str) -> Path:
    """Create a temporary skill directory with SKILL.md."""
    tmp_dir = Path(tempfile.mkdtemp())
    skill_dir = tmp_dir / "test-skill"
    skill_dir.mkdir()
    skill_md = skill_dir / "SKILL.md"
    skill_md.write_text(content)
    return skill_dir


class TestInstructionClarityEvaluator:
    """Test cases for InstructionClarityEvaluator."""

    def test_clear_imperative_instructions(self):
        """Test skill with clear, imperative instructions."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

## Overview

Use this skill to process files.

## Steps

1. Read the configuration file.
2. Parse the input data.
3. Validate the results.
4. Write the output file.
5. Log the completion status.
""")
        evaluator = InstructionClarityEvaluator()
        result = evaluator.evaluate(skill)

        assert result.score > 50
        assert "SKILL.md not found" not in result.findings

    def test_vague_hedging_language(self):
        """Test skill with vague, hedging language."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

## Overview

You might want to consider using this skill when appropriate. It could help with validation if needed. Maybe use it as needed.
""")
        evaluator = InstructionClarityEvaluator()
        result = evaluator.evaluate(skill)

        # Should score low due to hedging
        assert result.score < 60
        assert any("hedging" in f.lower() or "ambiguity" in f.lower() for f in result.findings)

    def test_actionable_references(self):
        """Test skill with specific tool/file references."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

## Overview

Use this script to process files.

## Steps

1. Run `python3 scripts/validate.py config.yaml`
2. Import the parser module
3. Call `process_file(input.json)`
4. Use `--output` flag to specify destination
""")
        evaluator = InstructionClarityEvaluator()
        result = evaluator.evaluate(skill)

        # Should score well for actionable references
        assert result.score > 50
        assert any("actionable" in f.lower() for f in result.findings)

    def test_missing_skill_md(self):
        """Test with missing SKILL.md."""
        skill = Path("/nonexistent/skill")
        evaluator = InstructionClarityEvaluator()
        result = evaluator.evaluate(skill)

        assert result.score == 0.0
        assert "SKILL.md not found" in result.findings

    def test_dimension_properties(self):
        """Test evaluator has correct name and weight."""
        evaluator = InstructionClarityEvaluator()

        assert evaluator.name == "instruction_clarity"
        assert 0 < evaluator.weight <= 1.0

    def test_contradiction_detection(self):
        """Test contradiction detection."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

Always validate input first, but you might skip validation if it's not needed.
Never use raw SQL queries, but use them when necessary.
""")
        evaluator = InstructionClarityEvaluator()
        result = evaluator.evaluate(skill)

        # Should detect potential contradictions
        assert any("contradict" in f.lower() for f in result.findings)

    def test_backward_compat_function(self):
        """Test standalone function works."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

Create a file.
Add content.
Run the script.
""")
        result = evaluate_instruction_clarity(skill)

        assert result.name == "instruction_clarity"
        assert 0 <= result.score <= 100

    def test_imperative_form_ratio(self):
        """Test imperative form detection."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

Create the config file.
Set the environment variables.
Build the project.
Test the output.
Deploy to production.
""")
        evaluator = InstructionClarityEvaluator()
        result = evaluator.evaluate(skill)

        # Should have high imperative form
        assert any("imperative" in f.lower() for f in result.findings)
        assert result.score > 60


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
