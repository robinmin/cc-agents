"""Tests for schema/base.py - common data classes."""

import pytest
from pathlib import Path

from schema.base import (
    SkillType,
    ValidationIssue,
    ValidationResult,
    DimensionScore,
    ScoreBreakdown,
)


class TestSkillType:
    """Tests for SkillType enum."""

    def test_skill_type_values(self):
        """Test all skill type values."""
        assert SkillType.SKILL.value == "skill"
        assert SkillType.AGENT.value == "agent"
        assert SkillType.COMMAND.value == "command"
        assert SkillType.HOOK.value == "hook"

    def test_skill_type_from_string(self):
        """Test creating SkillType from string."""
        assert SkillType("skill") == SkillType.SKILL
        assert SkillType("agent") == SkillType.AGENT


class TestValidationIssue:
    """Tests for ValidationIssue dataclass."""

    def test_create_error_issue(self):
        """Test creating an error issue."""
        issue = ValidationIssue(
            severity="error",
            category="frontmatter",
            message="name required",
            field="name"
        )
        assert issue.severity == "error"
        assert issue.category == "frontmatter"
        assert issue.message == "name required"
        assert issue.field == "name"
        assert issue.line is None

    def test_create_warning_with_line(self):
        """Test creating a warning with line number."""
        issue = ValidationIssue(
            severity="warning",
            category="section",
            message="Section not found",
            line=42
        )
        assert issue.severity == "warning"
        assert issue.line == 42


class TestValidationResult:
    """Tests for ValidationResult dataclass."""

    def test_create_valid_result(self):
        """Test creating a valid result."""
        result = ValidationResult(
            path=Path("test.md"),
            valid=True,
            issues=[]
        )
        assert result.valid is True
        assert len(result.errors) == 0
        assert len(result.warnings) == 0

    def test_create_invalid_result_with_issues(self):
        """Test result with errors and warnings."""
        issues = [
            ValidationIssue("error", "frontmatter", "name required", field="name"),
            ValidationIssue("warning", "section", "Missing section", line=10),
        ]
        result = ValidationResult(
            path=Path("test.md"),
            valid=False,
            issues=issues
        )
        assert result.valid is False
        assert len(result.errors) == 1
        assert len(result.warnings) == 1
        assert result.errors[0].field == "name"
        assert result.warnings[0].line == 10


class TestDimensionScore:
    """Tests for DimensionScore."""

    def test_percentage_calculation(self):
        """Test percentage calculation."""
        score = DimensionScore(name="test", raw_score=75, max_score=100)
        assert score.percentage == 75.0

    def test_zero_max_score(self):
        """Test zero max score handling."""
        score = DimensionScore(name="test", raw_score=50, max_score=0)
        assert score.percentage == 0


class TestScoreBreakdown:
    """Tests for ScoreBreakdown."""

    def test_create_breakdown(self):
        """Test creating a score breakdown."""
        breakdown = ScoreBreakdown(
            total_score=85.5,
            grade="B",
            dimension_scores={"content": 90, "structure": 80},
            findings=["Good structure"],
            recommendations=["Add more examples"]
        )
        assert breakdown.total_score == 85.5
        assert breakdown.grade == "B"
        assert breakdown.dimension_scores["content"] == 90
