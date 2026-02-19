"""Tests for schema/sections.py - section validation."""

import pytest

from schema.sections import (
    SectionDefinition,
    validate_sections,
    get_section_schema,
    AGENT_SECTIONS,
    SKILL_SECTIONS,
)
from schema.base import ValidationIssue


class TestSectionDefinition:
    """Tests for SectionDefinition dataclass."""

    def test_create_section_definition(self):
        """Test creating a section definition."""
        section = SectionDefinition(
            name="Overview",
            required=True,
            patterns=[r"##\s+Overview"]
        )
        assert section.name == "Overview"
        assert section.required is True
        assert len(section.patterns) == 1


class TestGetSectionSchema:
    """Tests for get_section_schema function."""

    def test_get_agent_schema(self):
        """Test getting agent schema."""
        schema = get_section_schema("agent")
        assert len(schema) == 8  # 8 sections for agents

    def test_get_skill_schema(self):
        """Test getting skill schema."""
        schema = get_section_schema("skill")
        assert len(schema) >= 4  # At least 4 sections for skills

    def test_get_command_schema(self):
        """Test getting command schema."""
        schema = get_section_schema("command")
        assert len(schema) >= 2  # At least Description and Usage

    def test_get_unknown_schema(self):
        """Test getting unknown schema defaults to skill."""
        schema = get_section_schema("unknown")
        assert schema == get_section_schema("skill")


class TestValidateSections:
    """Tests for validate_sections function."""

    def test_all_sections_found(self):
        """Test when all sections are found."""
        lines = [
            "# Agent Name",
            "## Persona",
            "## Philosophy",
            "## Verification",
            "## Competencies",
            "## Process",
            "## Rules",
            "## Output",
        ]
        issues = validate_sections(lines, AGENT_SECTIONS)
        # Should have no warnings for required sections
        assert len([i for i in issues if i.severity == "warning"]) == 0

    def test_missing_required_section(self):
        """Test when a required section is missing."""
        lines = [
            "# Agent Name",
            "## Persona",
            # Missing other sections
        ]
        issues = validate_sections(lines, AGENT_SECTIONS)
        # Should have warnings for missing sections
        assert len([i for i in issues if i.severity == "warning"]) > 0

    def test_skill_sections_overview(self):
        """Test skill sections with Overview."""
        lines = [
            "# Skill Name",
            "## Overview",
            "Use this skill when...",
            "## Examples",
        ]
        issues = validate_sections(lines, SKILL_SECTIONS)
        # Should find Overview and Examples
        section_names = [i.message.replace("Section not found: ", "") for i in issues if "not found" in i.message]
        assert "Overview" not in section_names

    def test_empty_lines(self):
        """Test with empty lines."""
        lines = []
        issues = validate_sections(lines, AGENT_SECTIONS)
        # All required sections should be missing
        assert len(issues) > 0


class TestAgentSections:
    """Tests for agent section definitions."""

    def test_agent_sections_count(self):
        """Test agent has 8 sections."""
        assert len(AGENT_SECTIONS) == 8

    def test_agent_sections_names(self):
        """Test agent section names."""
        names = [s.name for s in AGENT_SECTIONS]
        assert "METADATA" in names
        assert "PERSONA" in names
        assert "PHILOSOPHY" in names
        assert "VERIFICATION" in names
        assert "COMPETENCIES" in names
        assert "PROCESS" in names
        assert "RULES" in names
        assert "OUTPUT" in names


class TestSkillSections:
    """Tests for skill section definitions."""

    def test_skill_sections_count(self):
        """Test skill has expected sections."""
        assert len(SKILL_SECTIONS) >= 4

    def test_skill_sections_include_examples(self):
        """Test skill includes Examples section."""
        names = [s.name for s in SKILL_SECTIONS]
        assert "Examples" in names

    def test_skill_sections_overview_required(self):
        """Test Overview is required for skills."""
        overview = next((s for s in SKILL_SECTIONS if s.name == "Overview"), None)
        assert overview is not None
        assert overview.required is True
