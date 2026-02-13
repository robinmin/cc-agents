"""Tests for LLM-as-Judge evaluation module.

Tests verify:
- Rubric definitions
- Prompt building
- Response parsing
- Fallback behavior
- Cost calculation
"""

import pytest
import tempfile
from pathlib import Path
from unittest.mock import MagicMock

# Add scripts directory to path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from evaluators.llm_judge import (
    LLMJudgeEvaluator,
    LLMClient,
    LLMEvaluationResult,
    CostReport,
    INSTRUCTION_CLARITY_RUBRIC,
    VALUE_ADD_RUBRIC,
    LLM_RUBRICS,
    build_evaluation_prompt,
    evaluate_with_llm,
)


# Test fixtures
SAMPLE_SKILL_CONTENT = """---
name: test-skill
description: A test skill for validation
---

# Test Skill

This skill does amazing things.

## When to Use

Use this skill when you need to test things.

## Examples

```python
# Example code here
print("Hello")
```
"""

SAMPLE_TRIGGER_DESIGN_CONTENT = """---
name: test-skill
description: A test skill for validation
---

# Test Skill

## Triggers

- `/test-skill`
- `test this skill`

## When to Use

Use this skill when you need to test things.

## Examples

```python
# Example code here
print("Hello")
```
"""


class TestLLMRubrics:
    """Test rubric definitions."""

    def test_instruction_clarity_rubric_has_6_levels(self):
        """Instruction clarity rubric should have 6 levels including unknown."""
        assert len(INSTRUCTION_CLARITY_RUBRIC.levels) == 6
        level_names = [l.name for l in INSTRUCTION_CLARITY_RUBRIC.levels]
        assert "excellent" in level_names
        assert "good" in level_names
        assert "fair" in level_names
        assert "poor" in level_names
        assert "missing" in level_names
        assert "unknown" in level_names

    def test_value_add_rubric_has_6_levels(self):
        """Value add rubric should have 6 levels including unknown."""
        assert len(VALUE_ADD_RUBRIC.levels) == 6
        level_names = [l.name for l in VALUE_ADD_RUBRIC.levels]
        assert "exceptional" in level_names
        assert "significant" in level_names
        assert "moderate" in level_names
        assert "minimal" in level_names
        assert "none" in level_names
        assert "unknown" in level_names

    def test_rubric_scores_are_valid(self):
        """Rubric levels should have valid 0-100 scores."""
        for dimension, rubric in LLM_RUBRICS.items():
            for level in rubric.levels:
                assert 0 <= level.score <= 100, (
                    f"{dimension}/{level.name} has invalid score {level.score}"
                )

    def test_instruction_clarity_weight_sums_to_one(self):
        """Instruction clarity rubric should have weight 1.0."""
        assert INSTRUCTION_CLARITY_RUBRIC.weight == 1.0


class TestCostReport:
    """Test cost calculation."""

    def test_cost_report_defaults(self):
        """Cost report should have sensible defaults."""
        report = CostReport()
        assert report.model == ""
        assert report.input_tokens == 0
        assert report.output_tokens == 0
        assert report.estimated_cost_usd == 0.0
        assert report.passes == 1
        assert report.consistency_score == 0.0

    def test_cost_report_to_dict(self):
        """Cost report should serialize to dict correctly."""
        report = CostReport(
            model="claude-sonnet-4-20250514",
            input_tokens=1000,
            output_tokens=500,
            estimated_cost_usd=0.015,
            passes=3,
            consistency_score=95.0,
        )

        data = report.to_dict()
        assert data["model"] == "claude-sonnet-4-20250514"
        assert data["input_tokens"] == 1000
        assert data["output_tokens"] == 500
        assert data["total_tokens"] == 1500
        assert data["estimated_cost_usd"] == 0.015
        assert data["passes"] == 3
        assert data["consistency_score"] == 95.0


class TestPromptBuilder:
    """Test prompt building."""

    def test_build_prompt_includes_skill_name(self):
        """Prompt should include the skill name."""
        prompt = build_evaluation_prompt(
            skill_name="my-test-skill",
            skill_content="test content",
            rubric=INSTRUCTION_CLARITY_RUBRIC,
            dimension="instruction_clarity",
        )

        assert "my-test-skill" in prompt

    def test_build_prompt_includes_rubric(self):
        """Prompt should include rubric description and levels."""
        prompt = build_evaluation_prompt(
            skill_name="test-skill",
            skill_content="test content",
            rubric=VALUE_ADD_RUBRIC,
            dimension="value_add",
        )

        assert "Rubric: value_add" in prompt
        assert VALUE_ADD_RUBRIC.description in prompt

    def test_build_prompt_requests_json(self):
        """Prompt should request JSON response."""
        prompt = build_evaluation_prompt(
            skill_name="test",
            skill_content="content",
            rubric=INSTRUCTION_CLARITY_RUBRIC,
            dimension="instruction_clarity",
        )

        assert "JSON" in prompt or "json" in prompt


class TestResponseParsing:
    """Test LLM response parsing."""

    def test_parse_valid_json_response(self):
        """Should parse valid JSON response."""
        evaluator = LLMJudgeEvaluator()
        response = '{"level_name": "excellent", "reasoning": "Great clarity", "confidence": 0.9}'
        result = evaluator._parse_response(response, INSTRUCTION_CLARITY_RUBRIC)

        assert result is not None
        assert result["level_name"] == "excellent"
        assert result["score"] == 100.0  # excellent = 100

    def test_parse_markdown_json_response(self):
        """Should parse JSON in markdown code blocks."""
        evaluator = LLMJudgeEvaluator()
        response = '''```json
{
    "level_name": "significant",
    "reasoning": "Good value",
    "confidence": 0.8
}
```'''
        result = evaluator._parse_response(response, VALUE_ADD_RUBRIC)

        assert result is not None
        assert result["level_name"] == "significant"
        assert result["score"] == 75.0  # significant = 75

    def test_parse_invalid_json_returns_none(self):
        """Should return None for invalid JSON."""
        evaluator = LLMJudgeEvaluator()
        result = evaluator._parse_response("not valid json", VALUE_ADD_RUBRIC)
        assert result is None

    def test_parse_missing_level_name_returns_none(self):
        """Should return None if level_name is missing."""
        evaluator = LLMJudgeEvaluator()
        result = evaluator._parse_response(
            '{"reasoning": "No level", "confidence": 0.5}', VALUE_ADD_RUBRIC
        )
        assert result is None


class TestFallbackBehavior:
    """Test static fallback when LLM is unavailable."""

    def test_fallback_returns_is_fallback_true(self):
        """Fallback result should have is_fallback=True."""
        with tempfile.TemporaryDirectory() as tmpdir:
            skill_path = Path(tmpdir)
            (skill_path / "SKILL.md").write_text(SAMPLE_SKILL_CONTENT)

            evaluator = LLMJudgeEvaluator()
            evaluator.client = None  # Simulate no LLM

            result = evaluator.evaluate_dimension(
                skill_path, "instruction_clarity", INSTRUCTION_CLARITY_RUBRIC
            )

            assert result.is_fallback is True

    def test_fallback_scores_good_content_higher(self):
        """Fallback should score content with examples/triggers higher."""
        with tempfile.TemporaryDirectory() as tmpdir:
            skill_path = Path(tmpdir)
            (skill_path / "SKILL.md").write_text(SAMPLE_TRIGGER_DESIGN_CONTENT)

            evaluator = LLMJudgeEvaluator()
            evaluator.client = None

            result = evaluator.evaluate_dimension(
                skill_path, "instruction_clarity", INSTRUCTION_CLARITY_RUBRIC
            )

            # Has examples, triggers, and steps guidance -> should be "good"
            assert result.level_name == "good"
            assert result.score == 75.0

    def test_fallback_scores_poor_content_lower(self):
        """Fallback should score vague content lower."""
        vague_content = """
# Vague Skill

This skill does stuff. It's pretty cool.

## Maybe Use When

You might want to use it sometimes.
"""

        with tempfile.TemporaryDirectory() as tmpdir:
            skill_path = Path(tmpdir)
            (skill_path / "SKILL.md").write_text(vague_content)

            evaluator = LLMJudgeEvaluator()
            evaluator.client = None

            result = evaluator.evaluate_dimension(
                skill_path, "instruction_clarity", INSTRUCTION_CLARITY_RUBRIC
            )

            # No examples, triggers, or steps -> should be "poor"
            assert result.level_name == "poor"
            assert result.score == 25.0

    def test_missing_skill_md_returns_zero(self):
        """Missing SKILL.md should return zero score."""
        with tempfile.TemporaryDirectory() as tmpdir:
            skill_path = Path(tmpdir)

            evaluator = LLMJudgeEvaluator()
            evaluator.client = None

            result = evaluator.evaluate_dimension(
                skill_path, "instruction_clarity", INSTRUCTION_CLARITY_RUBRIC
            )

            assert result.score == 0.0
            assert result.level_name == "missing"
            assert "not found" in result.error_message.lower()


class TestLLMEvaluationResult:
    """Test LLMEvaluationResult dataclass."""

    def test_defaults(self):
        """Should have sensible defaults."""
        result = LLMEvaluationResult(
            dimension="test", score=75.0, level_name="good", reasoning="Test", rubric_criterion="test"
        )

        assert result.is_fallback is False
        assert result.error_message == ""

    def test_with_cost_report(self):
        """Should store cost report."""
        cost_report = CostReport(model="test", input_tokens=100, output_tokens=50)
        result = LLMEvaluationResult(
            dimension="test",
            score=75.0,
            level_name="good",
            reasoning="Test",
            rubric_criterion="test",
            cost_report=cost_report,
        )

        assert result.cost_report.model == "test"
        assert result.cost_report.input_tokens == 100


class TestLLMClient:
    """Test LLM client abstraction."""

    def test_token_counting(self):
        """Should estimate tokens from text length."""
        client = LLMClient()
        # 100 chars -> ~25 tokens
        assert client.count_tokens("a" * 100) == 25

    def test_estimate_cost_claude_sonnet(self):
        """Should calculate cost for Claude Sonnet."""
        client = LLMClient(model="claude-sonnet-4-20250514")
        # 1M input + 1M output = $3 + $15 = $18
        cost = client.estimate_cost(1_000_000, 1_000_000)
        assert cost == 18.0

    def test_estimate_cost_claude_opus(self):
        """Should calculate cost for Claude Opus."""
        client = LLMClient(model="claude-opus-4-20250514")
        # 1M input + 1M output = $30 + $150 = $180
        cost = client.estimate_cost(1_000_000, 1_000_000)
        assert cost == 180.0

    def test_unknown_model_uses_defaults(self):
        """Unknown model should use default pricing."""
        client = LLMClient(model="unknown-model")
        # Should use default (similar to Sonnet)
        cost = client.estimate_cost(1_000_000, 1_000_000)
        assert cost > 0


class TestEvaluateWithLLM:
    """Test the convenience function."""

    def test_unknown_dimension_raises(self):
        """Unknown dimension should raise ValueError."""
        with tempfile.TemporaryDirectory() as tmpdir:
            skill_path = Path(tmpdir)
            (skill_path / "SKILL.md").write_text(SAMPLE_SKILL_CONTENT)

            with pytest.raises(ValueError, match="Unknown dimension"):
                evaluate_with_llm(skill_path, "unknown_dimension")

    def test_instruction_clarity_dimension(self):
        """Should evaluate instruction clarity."""
        with tempfile.TemporaryDirectory() as tmpdir:
            skill_path = Path(tmpdir)
            (skill_path / "SKILL.md").write_text(SAMPLE_SKILL_CONTENT)

            # Will use fallback since no LLM client
            result = evaluate_with_llm(
                skill_path,
                "instruction_clarity",
                pass_k=1,
            )

            assert result.dimension == "instruction_clarity"
            assert result.score > 0

    def test_value_add_dimension(self):
        """Should evaluate value add."""
        with tempfile.TemporaryDirectory() as tmpdir:
            skill_path = Path(tmpdir)
            (skill_path / "SKILL.md").write_text(SAMPLE_SKILL_CONTENT)

            # Will use fallback since no LLM client
            result = evaluate_with_llm(
                skill_path,
                "value_add",
                pass_k=1,
            )

            assert result.dimension == "value_add"
            assert result.score > 0


class TestPassKConsistency:
    """Test pass@k consistency measurement."""

    def test_single_pass_consistency_zero(self):
        """Single pass should have zero consistency variance."""
        with tempfile.TemporaryDirectory() as tmpdir:
            skill_path = Path(tmpdir)
            (skill_path / "SKILL.md").write_text(SAMPLE_SKILL_CONTENT)

            # Mock the client to return consistent results
            mock_client = MagicMock()
            mock_client.is_available.return_value = True
            mock_client.count_tokens.return_value = 100
            mock_client.estimate_cost.return_value = 0.01
            mock_client.call.return_value = (
                '{"level_name": "good", "reasoning": "Test", "confidence": 0.9}',
                100,
                50,
            )

            evaluator = LLMJudgeEvaluator(pass_k=1, verbose=False)
            evaluator.client = mock_client

            result = evaluator.evaluate_dimension(
                skill_path, "instruction_clarity", INSTRUCTION_CLARITY_RUBRIC
            )

            assert result.cost_report.passes == 1
