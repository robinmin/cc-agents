"""Tests for drivers module."""

import pytest
import tempfile
from pathlib import Path

from drivers.structural import (
    validate_structure,
    validate_naming,
    print_validation_result,
)
from drivers.behavioral import (
    load_scenarios,
    run_trigger_tests,
    run_scenario_tests,
)
from schema.base import SkillType


class TestValidateStructure:
    """Tests for validate_structure function."""

    def test_valid_agent_file(self):
        """Test validating a valid agent file."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as f:
            f.write("""---
name: test-agent
description: Use this agent when testing
model: sonnet
color: blue
---
# Test Agent

## Persona
A test agent

## Philosophy
Test principles

## Verification
Red flags and sources

## Competencies
- Item 1
- Item 2

## Process
Steps here

## Rules
DO: Do this
DON'T: Don't do that

## Output
Templates here
""")
            f.flush()
            result = validate_structure(Path(f.name), SkillType.AGENT)
            Path(f.name).unlink()

        assert result.valid is True or len(result.errors) == 0

    def test_valid_skill_file(self):
        """Test validating a valid skill file."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as f:
            f.write("""---
name: test-skill
description: Use this skill when testing
---
# Test Skill

## Overview
Test skill

## Examples
Example here
""")
            f.flush()
            result = validate_structure(Path(f.name), SkillType.SKILL)
            Path(f.name).unlink()

        assert result.valid is True or len(result.errors) == 0

    def test_missing_file(self):
        """Test validating non-existent file."""
        result = validate_structure(Path("/nonexistent/file.md"), SkillType.SKILL)
        assert result.valid is False
        assert any("not found" in i.message.lower() for i in result.errors)

    def test_missing_name(self):
        """Test file without name."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as f:
            f.write("""---
description: No name field
---
# Content
""")
            f.flush()
            result = validate_structure(Path(f.name), SkillType.SKILL)
            Path(f.name).unlink()

        assert len(result.errors) > 0

    def test_agent_missing_required_fields(self):
        """Test agent missing model/color."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as f:
            f.write("""---
name: test-agent
description: Use this agent when testing
---
# Agent
""")
            f.flush()
            result = validate_structure(Path(f.name), SkillType.AGENT)
            Path(f.name).unlink()

        # Should have errors for missing model/color
        assert len(result.errors) > 0


class TestValidateNaming:
    """Tests for validate_naming function."""

    def test_skill_in_wrong_location(self):
        """Test skill file in wrong location."""
        path = Path("/some/other/path.md")
        issues = validate_naming(path, SkillType.SKILL)
        assert len([i for i in issues if i.severity == "warning"]) > 0

    def test_agent_in_agents_dir(self):
        """Test agent in agents directory."""
        path = Path("/path/agents/test-agent.md")
        issues = validate_naming(path, SkillType.AGENT)
        # Should not have warning about being in agents directory
        assert all("agents/" not in i.message for i in issues)


class TestLoadScenarios:
    """Tests for load_scenarios function."""

    def test_load_valid_yaml(self):
        """Test loading valid scenarios.yaml."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            f.write("""trigger_tests:
  should_trigger:
    - query: "create a skill"
      confidence: 0.8
  should_not_trigger:
    - query: "make coffee"
      reason: "Unrelated"
""")
            f.flush()
            scenarios = load_scenarios(Path(f.name))
            Path(f.name).unlink()

        assert "trigger_tests" in scenarios
        assert len(scenarios["trigger_tests"]["should_trigger"]) == 1

    def test_load_nonexistent_file(self):
        """Test loading non-existent file."""
        scenarios = load_scenarios(Path("/nonexistent/scenarios.yaml"))
        assert scenarios == {}

    def test_load_empty_file(self):
        """Test loading empty file."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            f.write("")
            f.flush()
            scenarios = load_scenarios(Path(f.name))
            Path(f.name).unlink()

        assert scenarios == {}


class TestRunTriggerTests:
    """Tests for run_trigger_tests function."""

    def test_trigger_matched(self):
        """Test trigger detection with matching keywords."""
        description = "Use this skill when you need to create skills"
        scenarios = {
            "trigger_tests": {
                "should_trigger": [
                    {"query": "create a skill", "confidence": 0.5}
                ],
                "should_not_trigger": [],
                "pass_criteria": {
                    "min_trigger_rate": 0.8,
                    "max_false_positive_rate": 0.2
                }
            }
        }
        results = run_trigger_tests(description, scenarios)
        assert "triggered" in results

    def test_no_false_positives(self):
        """Test no false positives for unrelated queries."""
        description = "Use this skill when you need to create skills"
        scenarios = {
            "trigger_tests": {
                "should_trigger": [],
                "should_not_trigger": [
                    {"query": "make coffee", "reason": "Unrelated"}
                ],
                "pass_criteria": {
                    "min_trigger_rate": 0.8,
                    "max_false_positive_rate": 0.2
                }
            }
        }
        results = run_trigger_tests(description, scenarios)
        # Should pass with 0 false positives
        assert results.get("passed") is True or results.get("false_positive_rate", 1.0) <= 0.2

    def test_empty_scenarios(self):
        """Test with empty scenarios."""
        description = "Use this skill when you need to create skills"
        scenarios = {
            "trigger_tests": {
                "should_trigger": [],
                "should_not_trigger": [],
                "pass_criteria": {}
            }
        }
        results = run_trigger_tests(description, scenarios)
        # Should have passed key
        assert "passed" in results


class TestRunScenarioTests:
    """Tests for run_scenario_tests function."""

    def test_run_scenarios(self):
        """Test running scenario tests."""
        scenarios = {
            "scenarios": [
                {
                    "name": "Test Scenario",
                    "input": "test input",
                    "expected_behaviors": ["check something"]
                }
            ]
        }
        results = run_scenario_tests(scenarios)
        assert "scenarios" in results
        assert results["total"] == 1

    def test_empty_scenarios(self):
        """Test with empty scenarios."""
        results = run_scenario_tests({})
        assert results["total"] == 0
