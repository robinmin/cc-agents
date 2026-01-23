"""Tests for template formatting in code-review-claude.py."""
from __future__ import annotations

from pathlib import Path
from unittest.mock import Mock, patch

import code_review_claude as crc


class TestExtractReviewSections:
    """Tests for extract_review_sections function."""

    def test_extract_critical_issues(self) -> None:
        """Test extracting critical issues from review output."""
        content = """
## Critical Issues (Must Fix)

**[CRITICAL-001]** SQL Injection
- **Location**: auth.py:45
- **Issue**: User input not sanitized
- **Fix**: Use prepared statements

## High Priority Issues (Should Fix)

None found.
"""
        sections = crc.extract_review_sections(content)

        assert "SQL Injection" in sections["critical_issues"]
        assert sections["high_priority_issues"] == "None found."

    def test_extract_quality_score(self) -> None:
        """Test extracting quality score."""
        content = """
Quality Score: 8/10
"""
        sections = crc.extract_review_sections(content)

        assert sections["quality_score"] == "8"

    def test_extract_recommendation(self) -> None:
        """Test extracting recommendation."""
        content = """
Recommendation: Request Changes
"""
        sections = crc.extract_review_sections(content)

        assert sections["recommendation"] == "Request Changes"

    def test_extract_all_sections(self) -> None:
        """Test extracting all sections from complete review."""
        content = """
## Executive Summary
This is a summary.

## Critical Issues (Must Fix)
Critical issue here.

## High Priority Issues (Should Fix)
High priority issue here.

## Security Analysis
Security concerns here.

## Performance Review
Performance issues here.

## Strengths
Good code structure

## Areas for Improvement
Add more tests
"""
        sections = crc.extract_review_sections(content)

        assert "This is a summary" in sections["executive_summary"]
        assert "Critical issue here" in sections["critical_issues"]
        assert "High priority issue here" in sections["high_priority_issues"]
        assert "Security concerns here" in sections["security_analysis"]
        assert "Performance issues here" in sections["performance_review"]
        assert "Good code structure" in sections["strengths"]
        assert "Add more tests" in sections["improvements"]


class TestFormatReviewWithTemplate:
    """Tests for format_review_with_template function."""

    @patch("code_review_claude.load_prompt_template")
    def test_format_review_with_template(
        self, mock_load_template: Mock
    ) -> None:
        """Test formatting review with template."""
        mock_load_template.return_value = """---
type: claude-code-review
target: {{TARGET}}
mode: {{MODE}}
---

# Review
{{EXECUTIVE_SUMMARY}}

## Critical Issues
{{CRITICAL_ISSUES}}
"""

        result = crc.format_review_with_template(
            content="Test review content",
            target="src/auth.py",
            mode="review",
            focus_areas=None,
            files_count=1,
            duration="300s timeout"
        )

        assert "src/auth.py" in result
        assert "review" in result
        assert "Test review content" in result

    @patch("code_review_claude.load_prompt_template")
    def test_format_review_without_template(
        self, mock_load_template: Mock
    ) -> None:
        """Test formatting review without template (fallback)."""
        mock_load_template.return_value = None

        result = crc.format_review_with_template(
            content="Test review content",
            target="src/auth.py",
            mode="review",
            focus_areas=None,
            files_count=1,
            duration="300s timeout"
        )

        assert "Test review content" in result
        assert "src/auth.py" in result
        assert "type: claude-review" in result


class TestBuildReviewPrompt:
    """Tests for build_review_prompt function."""

    @patch("code_review_claude.load_prompt_template")
    def test_build_review_prompt_with_template(
        self, mock_load_template: Mock
    ) -> None:
        """Test building review prompt with template."""
        mock_load_template.return_value = """Target: {{TARGET}}
Code: {{CODE_CONTENT}}
Focus: {{FOCUS_AREAS}}
"""

        result = crc.build_review_prompt(
            target="src/auth.py",
            code_content="def foo(): pass",
            mode="review",
            focus_areas=["security", "performance"]
        )

        assert "src/auth.py" in result
        assert "def foo(): pass" in result
        assert "security" in result
        assert "performance" in result

    @patch("code_review_claude.load_prompt_template")
    def test_build_review_prompt_without_template(
        self, mock_load_template: Mock
    ) -> None:
        """Test building review prompt without template (fallback)."""
        mock_load_template.return_value = None

        result = crc.build_review_prompt(
            target="src/auth.py",
            code_content="def foo(): pass",
            mode="review",
            focus_areas=None
        )

        assert "src/auth.py" in result
        assert "def foo(): pass" in result
        assert "code reviewer" in result.lower()

    @patch("code_review_claude.load_prompt_template")
    def test_build_planning_prompt(
        self, mock_load_template: Mock
    ) -> None:
        """Test building planning prompt."""
        mock_load_template.return_value = None

        result = crc.build_review_prompt(
            target="src/auth.py",
            code_content="def foo(): pass",
            mode="planning",
            focus_areas=None
        )

        assert "src/auth.py" in result
        assert "software architect" in result.lower()
        assert "implementation plan" in result.lower()


class TestSaveToPlan:
    """Tests for save_to_plan function."""

    def test_save_to_plan(self, mock_plans_dir: Path) -> None:
        """Test saving content to plan file."""
        content = "# Test Plan\n\nThis is a test plan."

        result = crc.save_to_plan(content, "test-plan")

        assert result.exists()
        assert result.read_text() == content
        assert result.name == "test-plan.md"

    def test_save_to_plan_sanitizes_name(self, mock_plans_dir: Path) -> None:
        """Test that plan names are sanitized."""
        content = "# Test Plan"

        result = crc.save_to_plan(content, "test/plan:with@special#chars")

        assert result.exists()
        assert result.name == "test-plan-with-special-chars.md"


class TestGatherCodeContent:
    """Tests for gather_code_content function."""

    def test_gather_from_file(self, tmp_path: Path) -> None:
        """Test gathering code from a single file."""
        test_file = tmp_path / "test.py"
        test_file.write_text("def foo(): pass")

        content, files = crc.gather_code_content(str(test_file))

        assert len(files) == 1
        assert "def foo(): pass" in content
        assert str(test_file) in content

    def test_gather_from_directory(self, tmp_path: Path) -> None:
        """Test gathering code from a directory."""
        (tmp_path / "test1.py").write_text("def foo(): pass")
        (tmp_path / "test2.py").write_text("def bar(): pass")
        (tmp_path / "README.md").write_text("# Documentation")

        content, files = crc.gather_code_content(str(tmp_path))

        # Should only include .py files
        assert len(files) == 2
        assert "def foo(): pass" in content
        assert "def bar(): pass" in content

    def test_gather_from_nonexistent_path(self, tmp_path: Path) -> None:
        """Test gathering from non-existent path."""
        content, files = crc.gather_code_content("nonexistent/path")

        # Should return empty results for glob patterns
        assert isinstance(content, str)
        assert isinstance(files, list)
