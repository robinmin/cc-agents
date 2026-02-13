"""Tests for Behavioral Evaluator - tests/scenarios.yaml parsing and execution."""

import pytest
from pathlib import Path
import tempfile

# Add scripts directory to path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from evaluators.behavioral import (
    BehavioralEvaluator,
    ScenarioParser,
    ScenarioSet,
    evaluate_behavioral,
    SCENARIO_MINIMUMS,
    DIFFICULTY_WEIGHTS,
)


def create_skill_with_scenarios(scenarios_content: str, skill_content: str = "") -> Path:
    """Create a temporary skill directory with scenarios.yaml."""
    tmp_dir = Path(tempfile.mkdtemp())
    skill_dir = tmp_dir / "test-skill"
    skill_dir.mkdir()

    # Write scenarios.yaml
    scenarios_file = skill_dir / "tests" / "scenarios.yaml"
    scenarios_file.parent.mkdir(parents=True, exist_ok=True)
    scenarios_file.write_text(scenarios_content)

    # Write SKILL.md
    (skill_dir / "SKILL.md").write_text(skill_content or "# Test Skill\n")

    return skill_dir


VALID_SCENARIOS = """
scenarios:
  - name: basic_success
    description: Standard successful case
    input: "hello world"
    expected_behaviors:
      - output contains "hello"
      - status is success

  - name: error_handling
    description: Error case
    input: "invalid"
    expected_behaviors:
      - error is true
      - message is "input required"

  - name: edge_case
    description: Edge case with special characters
    input: "special!@#$%chars"
    expected_behaviors:
      - output is not empty
"""


class TestScenarioParser:
    """Test cases for ScenarioParser."""

    def test_parse_valid_scenarios(self):
        """Test parsing valid scenarios YAML."""
        result = ScenarioParser.parse(VALID_SCENARIOS)

        assert len(result.scenarios) == 3
        assert result.version == "1.0"
        assert len(result.errors) == 0

    def test_parse_empty_yaml(self):
        """Test parsing empty YAML returns errors."""
        result = ScenarioParser.parse("")

        assert len(result.scenarios) == 0
        assert len(result.errors) > 0

    def test_parse_invalid_yaml(self):
        """Test parsing invalid YAML returns errors."""
        result = ScenarioParser.parse("invalid: yaml: content: [")

        assert len(result.scenarios) == 0
        assert len(result.errors) > 0

    def test_parse_missing_scenarios_key(self):
        """Test when scenarios key is missing."""
        result = ScenarioParser.parse("other_key:\n  - item")

        assert len(result.scenarios) == 0

    def test_parse_empty_scenarios_list(self):
        """Test when scenarios list is empty."""
        result = ScenarioParser.parse("scenarios: []")

        assert len(result.scenarios) == 0
        assert len(result.errors) > 0  # "No scenarios defined"

    def test_parse_scenario_with_all_fields(self):
        """Test parsing scenario with all optional fields."""
        content = """
scenarios:
  - name: full_scenario
    description: Complete scenario
    input: "test input"
    expected_behaviors:
      - behavior one
      - behavior two
    anti_behaviors:
      - sql injection
      - xss attack
    difficulty: advanced
    tags:
      - security
      - validation
"""
        result = ScenarioParser.parse(content)

        assert len(result.scenarios) == 1
        scenario = result.scenarios[0]
        assert scenario.name == "full_scenario"
        assert len(scenario.anti_behaviors) == 2
        assert scenario.difficulty == "advanced"
        assert "security" in scenario.tags

    def test_parse_scenario_missing_input(self):
        """Test scenario missing input field."""
        content = """
scenarios:
  - name: missing_input
    expected_behaviors:
      - some behavior
"""
        result = ScenarioParser.parse(content)

        assert len(result.scenarios) == 1
        assert len(result.errors) > 0
        assert "input" in result.errors[0].lower()

    def test_parse_scenario_missing_behaviors(self):
        """Test scenario missing expected_behaviors field."""
        content = """
scenarios:
  - name: missing_behaviors
    input: "test"
"""
        result = ScenarioParser.parse(content)

        assert len(result.scenarios) == 1
        assert len(result.errors) > 0
        assert "expected_behaviors" in result.errors[0].lower()

    def test_parse_multiple_scenarios_with_errors(self):
        """Test parsing multiple scenarios with some having errors."""
        content = """
scenarios:
  - name: valid_scenario
    input: "test"
    expected_behaviors:
      - behavior one
  - name: invalid_scenario
    description: Missing expected_behaviors
    input: "test2"
  - name: another_valid
    input: "test3"
    expected_behaviors:
      - behavior
"""
        result = ScenarioParser.parse(content)

        assert len(result.scenarios) == 3
        # Should have error for the invalid scenario
        assert any("expected_behaviors" in e.lower() for e in result.errors)


class TestBehavioralEvaluator:
    """Test cases for BehavioralEvaluator."""

    def test_evaluator_dimension_properties(self):
        """Test evaluator has correct name and weight."""
        evaluator = BehavioralEvaluator()

        assert evaluator.name == "behavioral"
        assert 0 < evaluator.weight <= 1.0
        assert evaluator.weight == 0.10

    def test_evaluate_with_valid_scenarios(self):
        """Test full evaluation with valid scenarios."""
        skill = create_skill_with_scenarios(VALID_SCENARIOS, """---
name: test-skill
description: Test skill
---

# Test Skill

This skill handles processing.
""")

        evaluator = BehavioralEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "behavioral"
        assert 0 <= result.score <= 100
        assert len(result.findings) > 0

    def test_evaluate_no_scenarios_file(self):
        """Test evaluation when no scenarios.yaml exists."""
        tmp_dir = Path(tempfile.mkdtemp())
        skill_dir = tmp_dir / "test-skill"
        skill_dir.mkdir()
        (skill_dir / "SKILL.md").write_text("# Test Skill")

        evaluator = BehavioralEvaluator()
        result = evaluator.evaluate(skill_dir)

        assert result.name == "behavioral"
        assert result.score == 0.0
        assert "scenarios.yaml" in result.findings[0].lower()

    def test_evaluate_partial_credit(self):
        """Test evaluation with some valid scenarios."""
        content = """
scenarios:
  - name: single_scenario
    input: "test"
    expected_behaviors:
      - behavior one
"""
        skill = create_skill_with_scenarios(content)

        evaluator = BehavioralEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "behavioral"
        assert result.score > 0  # Partial credit

    def test_evaluate_difficulty_bonus(self):
        """Test evaluation with multiple difficulty levels."""
        content = """
scenarios:
  - name: beginner_scenario
    input: "test"
    expected_behaviors:
      - behavior one
    difficulty: beginner
  - name: advanced_scenario
    input: "test"
    expected_behaviors:
      - behavior two
    difficulty: advanced
"""
        skill = create_skill_with_scenarios(content)

        evaluator = BehavioralEvaluator()
        result = evaluator.evaluate(skill)

        assert "difficulty" in str(result.findings).lower()

    def test_evaluate_with_anti_behaviors(self):
        """Test evaluation with anti-behaviors."""
        content = """
scenarios:
  - name: with_anti
    input: "test"
    expected_behaviors:
      - behavior one
    anti_behaviors:
      - sql injection
      - xss
"""
        skill = create_skill_with_scenarios(content)

        evaluator = BehavioralEvaluator()
        result = evaluator.evaluate(skill)

        # Findings contain "Anti-behavior" or similar
        findings_str = str(result.findings).lower()
        assert "anti" in findings_str or "behavior" in findings_str

    def test_evaluate_with_tags(self):
        """Test evaluation with scenario tags."""
        content = """
scenarios:
  - name: tagged_scenario
    input: "test"
    expected_behaviors:
      - behavior one
    tags:
      - security
      - validation
"""
        skill = create_skill_with_scenarios(content)

        result = BehavioralEvaluator().evaluate(skill)
        assert result.name == "behavioral"
        # Score should be positive since we have valid scenarios
        assert result.score > 0

    def test_evaluate_minimum_threshold(self):
        """Test evaluation meets minimum scenario threshold."""
        scenarios = """
scenarios:
"""
        for i in range(5):
            scenarios += f"""
  - name: scenario_{i}
    input: "test{i}"
    expected_behaviors:
      - behavior {i}
    difficulty: {"beginner" if i < 2 else "advanced"}
"""
        skill = create_skill_with_scenarios(scenarios)

        evaluator = BehavioralEvaluator()
        result = evaluator.evaluate(skill)

        assert result.score >= 100  # Full score for meeting minimum

    def test_evaluate_recommendations(self):
        """Test that recommendations are generated."""
        tmp_dir = Path(tempfile.mkdtemp())
        skill_dir = tmp_dir / "test-skill"
        skill_dir.mkdir()
        (skill_dir / "SKILL.md").write_text("# Test Skill")

        evaluator = BehavioralEvaluator()
        result = evaluator.evaluate(skill_dir)

        assert len(result.recommendations) > 0


class TestBackwardCompatibility:
    """Test backward compatibility function."""

    def test_evaluate_behavioral_function(self):
        """Test standalone function works."""
        skill = create_skill_with_scenarios(VALID_SCENARIOS)

        result = evaluate_behavioral(skill)

        assert result.name == "behavioral"
        assert 0 <= result.score <= 100


class TestConstants:
    """Test module constants."""

    def test_scenario_minimums(self):
        """Test scenario minimum thresholds."""
        assert "technique" in SCENARIO_MINIMUMS
        assert "pattern" in SCENARIO_MINIMUMS
        assert "reference" in SCENARIO_MINIMUMS
        assert "workflow" in SCENARIO_MINIMUMS
        assert SCENARIO_MINIMUMS["technique"] == 3

    def test_difficulty_weights(self):
        """Test difficulty weight multipliers."""
        assert "beginner" in DIFFICULTY_WEIGHTS
        assert "intermediate" in DIFFICULTY_WEIGHTS
        assert "advanced" in DIFFICULTY_WEIGHTS
        assert DIFFICULTY_WEIGHTS["beginner"] == 1.0
        assert DIFFICULTY_WEIGHTS["advanced"] == 1.5


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
