"""Tests for schema/frontmatter.py - frontmatter validation."""

import pytest
from pathlib import Path

from schema.frontmatter import (
    validate_name,
    validate_description,
    validate_model,
    validate_color,
    validate_tools,
    validate_frontmatter,
    parse_frontmatter,
)
from schema.base import SkillType, ValidationIssue


class TestValidateName:
    """Tests for validate_name function."""

    def test_valid_name(self):
        """Test valid name passes."""
        issues = validate_name("test-skill")
        assert len([i for i in issues if i.severity == "error"]) == 0

    def test_name_too_short(self):
        """Test name too short."""
        issues = validate_name("ab")
        assert any("too short" in i.message for i in issues)

    def test_name_too_long(self):
        """Test name too long."""
        issues = validate_name("a" * 51)
        assert any("too long" in i.message for i in issues)

    def test_name_with_uppercase(self):
        """Test name with uppercase."""
        issues = validate_name("TestSkill")
        assert any("lowercase" in i.message.lower() for i in issues)

    def test_name_with_underscore(self):
        """Test name with underscore."""
        issues = validate_name("test_skill")
        assert any("hyphen" in i.message.lower() for i in issues)

    def test_name_none(self):
        """Test None name."""
        issues = validate_name(None)
        assert any("required" in i.message.lower() for i in issues)

    def test_name_not_string(self):
        """Test non-string name."""
        issues = validate_name(123)
        assert any("string" in i.message.lower() for i in issues)


class TestValidateDescription:
    """Tests for validate_description function."""

    def test_valid_description(self):
        """Test valid description."""
        issues = validate_description("Use this skill when you need to create skills")
        assert len([i for i in issues if i.severity == "error"]) == 0

    def test_description_too_short(self):
        """Test description too short."""
        issues = validate_description("short")
        assert any("too short" in i.message for i in issues)

    def test_description_none(self):
        """Test None description."""
        issues = validate_description(None)
        assert any("required" in i.message.lower() for i in issues)

    def test_skill_requires_trigger(self):
        """Test skill requires 'Use this skill when'."""
        issues = validate_description("A skill description", context="skill")
        assert any("Use this skill when" in i.message for i in issues)

    def test_agent_requires_trigger(self):
        """Test agent requires 'Use this agent when'."""
        issues = validate_description("An agent description", context="agent")
        assert any("Use this agent when" in i.message for i in issues)


class TestValidateModel:
    """Tests for validate_model function."""

    def test_valid_models(self):
        """Test valid model values."""
        for model in ["inherit", "sonnet", "opus", "haiku"]:
            issues = validate_model(model)
            assert len([i for i in issues if i.severity == "error"]) == 0

    def test_invalid_model(self):
        """Test invalid model value."""
        issues = validate_model("gpt-4")
        assert any("must be one of" in i.message for i in issues)

    def test_model_none_optional(self):
        """Test None model is optional."""
        issues = validate_model(None)
        assert len([i for i in issues if i.severity == "error"]) == 0


class TestValidateColor:
    """Tests for validate_color function."""

    def test_valid_colors(self):
        """Test valid color values."""
        for color in ["blue", "cyan", "green", "yellow", "magenta", "red"]:
            issues = validate_color(color)
            assert len([i for i in issues if i.severity == "error"]) == 0

    def test_invalid_color(self):
        """Test invalid color value."""
        issues = validate_color("rainbow")
        assert any("must be one of" in i.message for i in issues)

    def test_color_none_optional(self):
        """Test None color is optional."""
        issues = validate_color(None)
        assert len([i for i in issues if i.severity == "error"]) == 0


class TestValidateTools:
    """Tests for validate_tools function."""

    def test_valid_tools_array(self):
        """Test valid tools array."""
        issues = validate_tools(["Read", "Write", "Grep"])
        assert len([i for i in issues if i.severity == "error"]) == 0

    def test_invalid_tools_not_array(self):
        """Test invalid tools (not array)."""
        issues = validate_tools("Read,Write")
        assert any("array" in i.message.lower() for i in issues)

    def test_tools_none_optional(self):
        """Test None tools is optional."""
        issues = validate_tools(None)
        assert len([i for i in issues if i.severity == "error"]) == 0


class TestValidateFrontmatter:
    """Tests for validate_frontmatter function."""

    def test_valid_skill_frontmatter(self):
        """Test valid skill frontmatter."""
        fm = {
            "name": "test-skill",
            "description": "Use this skill when you need to test"
        }
        issues = validate_frontmatter(fm, SkillType.SKILL)
        assert len([i for i in issues if i.severity == "error"]) == 0

    def test_valid_agent_frontmatter(self):
        """Test valid agent frontmatter."""
        fm = {
            "name": "test-agent",
            "description": "Use this agent when you need to test",
            "model": "sonnet",
            "color": "blue"
        }
        issues = validate_frontmatter(fm, SkillType.AGENT)
        assert len([i for i in issues if i.severity == "error"]) == 0

    def test_invalid_field_agent(self):
        """Test invalid frontmatter field for agent."""
        fm = {
            "name": "test",
            "description": "test",
            "agent": "something"
        }
        issues = validate_frontmatter(fm, SkillType.AGENT)
        assert any("Invalid field" in i.message for i in issues)

    def test_agent_missing_model(self):
        """Test agent missing model."""
        fm = {
            "name": "test-agent",
            "description": "test",
            "color": "blue"
        }
        issues = validate_frontmatter(fm, SkillType.AGENT)
        assert any("model required" in i.message for i in issues)

    def test_agent_missing_color(self):
        """Test agent missing color."""
        fm = {
            "name": "test-agent",
            "description": "test",
            "model": "sonnet"
        }
        issues = validate_frontmatter(fm, SkillType.AGENT)
        assert any("color required" in i.message for i in issues)


class TestParseFrontmatter:
    """Tests for parse_frontmatter function."""

    def test_parse_with_frontmatter(self):
        """Test parsing with frontmatter."""
        content = """---
name: test-skill
description: A test skill
---
# Content here
"""
        fm, body = parse_frontmatter(content)
        assert fm["name"] == "test-skill"
        assert fm["description"] == "A test skill"
        assert "# Content here" in body

    def test_parse_without_frontmatter(self):
        """Test parsing without frontmatter."""
        content = "# Just content"
        fm, body = parse_frontmatter(content)
        assert fm == {}
        assert body == "# Just content"

    def test_parse_empty(self):
        """Test parsing empty content."""
        fm, body = parse_frontmatter("")
        assert fm == {}
