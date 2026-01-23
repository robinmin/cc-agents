"""Tests for review command in code-review-opencode.py."""
from __future__ import annotations

from argparse import Namespace
from pathlib import Path
from unittest.mock import Mock, patch

import pytest

import code_review_opencode as cro


class TestExtractReviewSections:
    """Tests for extract_review_sections function."""

    def test_extract_all_sections(self) -> None:
        """Test extracting all sections from a complete review."""
        content = """## Executive Summary
This is a summary.

## Critical Issues (Must Fix)
- Critical issue 1

## High Priority Issues (Should Fix)
- High priority issue

## Medium Priority Issues (Consider Fixing)
- Medium issue

## Low Priority Issues (Nice to Have)
- Low issue

## Security Analysis
Security is okay.

## Performance Review
Performance is good.

## Code Quality
Code quality is acceptable.

## Testing Gaps
No testing gaps.

## Strengths
- Good code structure

## Areas for Improvement
- Add more tests

## Follow-up Actions
- Review again

## Next Steps
Implement changes.

Quality Score: 8/10
Recommendation: Approve
"""
        sections = cro.extract_review_sections(content)

        assert sections["executive_summary"] == "This is a summary."
        assert "Critical issue 1" in sections["critical_issues"]
        assert "High priority issue" in sections["high_priority_issues"]
        assert "Medium issue" in sections["medium_priority_issues"]
        assert "Low issue" in sections["low_priority_issues"]
        assert sections["quality_score"] == "8"
        assert sections["recommendation"] == "Approve"

    def test_fallback_to_summary(self) -> None:
        """Test that content without sections goes to executive summary."""
        content = "Just some plain text review content."

        sections = cro.extract_review_sections(content)

        assert sections["executive_summary"] == content
        assert sections["critical_issues"] == ""

    def test_extract_quality_score(self) -> None:
        """Test extracting quality score."""
        content = "Quality Score: 7.5/10"
        sections = cro.extract_review_sections(content)
        assert sections["quality_score"] == "7.5"

    def test_extract_recommendation_approve(self) -> None:
        """Test extracting approve recommendation."""
        content = "Recommendation: Approve with conditions"
        sections = cro.extract_review_sections(content)
        assert sections["recommendation"] == "Approve"

    def test_extract_recommendation_request_changes(self) -> None:
        """Test extracting request changes recommendation."""
        content = "Recommendation: Request Changes"
        sections = cro.extract_review_sections(content)
        assert sections["recommendation"] == "Request Changes"

    def test_extract_recommendation_block(self) -> None:
        """Test extracting block recommendation."""
        content = "Recommendation: Block this PR"
        sections = cro.extract_review_sections(content)
        assert sections["recommendation"] == "Block"


class TestFormatReviewWithTemplate:
    """Tests for format_review_with_template function."""

    @patch("code_review_opencode.load_prompt_template")
    def test_format_with_template(self, mock_load: Mock) -> None:
        """Test formatting with a template."""
        mock_load.return_value = """---
generated: {{TIMESTAMP}}
target: {{TARGET}}
mode: {{MODE}}
---
# Review
{{EXECUTIVE_SUMMARY}}
"""
        result = cro.format_review_with_template(
            content="Summary content",
            target="src/main.py",
            mode="review",
            focus_areas=None,
            files_count=5,
            duration="60s",
        )

        assert "target: src/main.py" in result
        assert "mode: review" in result
        assert "Summary content" in result

    @patch("code_review_opencode.load_prompt_template")
    def test_format_without_template(self, mock_load: Mock) -> None:
        """Test formatting without a template (fallback)."""
        mock_load.return_value = None

        result = cro.format_review_with_template(
            content="Raw review",
            target="src/main.py",
            mode="review",
        )

        assert "Raw review" in result
        assert "src/main.py" in result
        assert "---" in result  # YAML frontmatter


class TestBuildReviewPrompt:
    """Tests for build_review_prompt function."""

    @patch("code_review_opencode.load_prompt_template")
    def test_build_review_prompt_with_template(self, mock_load: Mock) -> None:
        """Test building review prompt with template."""
        mock_load.return_value = "Review {{TARGET}}: {{CODE_CONTENT}}"

        result = cro.build_review_prompt(
            target="main.py",
            code_content="def foo(): pass",
            mode="review",
            focus_areas=None,
        )

        assert "Review main.py:" in result
        assert "def foo(): pass" in result

    @patch("code_review_opencode.load_prompt_template")
    def test_build_planning_prompt_with_template(self, mock_load: Mock) -> None:
        """Test building planning prompt with template."""
        mock_load.return_value = "Plan {{TARGET}}: {{CODE_CONTENT}}"

        result = cro.build_review_prompt(
            target="main.py",
            code_content="def foo(): pass",
            mode="planning",
            focus_areas=None,
        )

        assert "Plan main.py:" in result

    @patch("code_review_opencode.load_prompt_template")
    def test_build_prompt_with_focus_areas(self, mock_load: Mock) -> None:
        """Test building prompt with focus areas."""
        mock_load.return_value = "{{FOCUS_AREAS}}\nReview {{TARGET}}"

        result = cro.build_review_prompt(
            target="main.py",
            code_content="code",
            mode="review",
            focus_areas=["security", "performance"],
        )

        assert "- security" in result
        assert "- performance" in result

    @patch("code_review_opencode.load_prompt_template")
    def test_build_planning_prompt_fallback(self, mock_load: Mock) -> None:
        """Test building planning prompt without template (fallback)."""
        mock_load.return_value = None

        result = cro.build_review_prompt(
            target="main.py",
            code_content="def foo(): pass",
            mode="planning",
            focus_areas=None,
        )

        assert "software architect" in result.lower()
        assert "implementation plan" in result.lower()

    @patch("code_review_opencode.load_prompt_template")
    def test_build_review_prompt_fallback(self, mock_load: Mock) -> None:
        """Test building review prompt without template (fallback)."""
        mock_load.return_value = None

        result = cro.build_review_prompt(
            target="main.py",
            code_content="def foo(): pass",
            mode="review",
            focus_areas=None,
        )

        assert "code reviewer" in result.lower()
        assert "Bugs and Logic Errors" in result


class TestGatherCodeContent:
    """Tests for gather_code_content function."""

    def test_gather_from_file(self, tmp_path: Path) -> None:
        """Test gathering content from a single file."""
        test_file = tmp_path / "test.py"
        test_file.write_text("def foo(): pass")

        content, files = cro.gather_code_content(str(test_file))

        assert len(files) == 1
        assert files[0] == test_file
        assert "def foo(): pass" in content

    def test_gather_from_directory(self, tmp_path: Path) -> None:
        """Test gathering content from a directory."""
        (tmp_path / "test1.py").write_text("code1")
        (tmp_path / "test2.py").write_text("code2")
        (tmp_path / "README.md").write_text("docs")

        content, files = cro.gather_code_content(str(tmp_path))

        # Should find Python files but not README.md
        assert len(files) == 2
        assert "code1" in content
        assert "code2" in content

    def test_gather_from_glob_pattern(self, tmp_path: Path) -> None:
        """Test gathering using glob pattern."""
        (tmp_path / "test.py").write_text("python code")
        (tmp_path / "test.js").write_text("js code")

        # Change to temp dir for glob to work
        import os
        original_cwd = os.getcwd()
        try:
            os.chdir(tmp_path)
            content, files = cro.gather_code_content("*.py")
            assert len(files) == 1
            assert "python code" in content
        finally:
            os.chdir(original_cwd)


class TestCmdReview:
    """Tests for cmd_review function."""

    @patch("code_review_opencode.run_opencode_from_file")
    @patch("code_review_opencode.check_opencode_availability")
    @patch("code_review_opencode.gather_code_content")
    @patch("code_review_opencode.save_to_plan")
    def test_successful_review(
        self,
        mock_save: Mock,
        mock_gather: Mock,
        mock_check: Mock,
        mock_run: Mock,
        tmp_path: Path,
        capsys: pytest.CaptureFixture[str],
    ) -> None:
        """Test successful review command."""
        mock_check.return_value = cro.CheckResult(
            available=True, message="opencode ready"
        )
        mock_gather.return_value = ("code content", [Path("main.py")])
        mock_run.return_value = cro.RunResult(
            success=True,
            output="## Executive Summary\nGood code.",
        )
        mock_save.return_value = tmp_path / "plan.md"

        args = Namespace(
            target="main.py",
            plan=False,
            output=None,
            focus=None,
            timeout=None,
        )

        exit_code = cro.cmd_review(args)

        assert exit_code == 0
        mock_save.assert_called_once()

    @patch("code_review_opencode.check_opencode_availability")
    def test_review_when_opencode_not_available(
        self,
        mock_check: Mock,
        capsys: pytest.CaptureFixture[str],
    ) -> None:
        """Test review when OpenCode is not available."""
        mock_check.return_value = cro.CheckResult(
            available=False, message="ERROR: Not installed"
        )

        args = Namespace(
            target="main.py",
            plan=False,
            output=None,
            focus=None,
            timeout=None,
        )

        exit_code = cro.cmd_review(args)

        assert exit_code == 1

    @patch("code_review_opencode.run_opencode_from_file")
    @patch("code_review_opencode.check_opencode_availability")
    @patch("code_review_opencode.gather_code_content")
    def test_planning_mode(
        self,
        mock_gather: Mock,
        mock_check: Mock,
        mock_run: Mock,
        capsys: pytest.CaptureFixture[str],
    ) -> None:
        """Test planning mode."""
        mock_check.return_value = cro.CheckResult(
            available=True, message="opencode ready"
        )
        mock_gather.return_value = ("code content", [Path("main.py")])
        mock_run.return_value = cro.RunResult(
            success=True,
            output="Planning output",
        )

        args = Namespace(
            target="main.py",
            plan=True,
            output=None,
            focus=None,
            timeout=None,
        )

        exit_code = cro.cmd_review(args)

        assert exit_code == 0
        captured = capsys.readouterr()
        assert "planning" in captured.out.lower()
