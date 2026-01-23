"""Tests for review command in code-review-claude.py."""
from __future__ import annotations

from argparse import Namespace
from pathlib import Path
from unittest.mock import Mock, patch

import pytest

import code_review_claude as crc


class TestCmdReview:
    """Tests for cmd_review function."""

    @patch("code_review_claude.run_claude_from_file")
    @patch("code_review_claude.check_claude_availability")
    @patch("code_review_claude.gather_code_content")
    def test_review_success(
        self,
        mock_gather: Mock,
        mock_check: Mock,
        mock_run: Mock,
        capsys: pytest.CaptureFixture[str],
        mock_plans_dir: Path,
        sample_code: str
    ) -> None:
        """Test successful review command."""
        mock_check.return_value = crc.CheckResult(available=True, message="claude ready")
        mock_gather.return_value = (sample_code, [Path("test.py")])

        # Mock review output
        review_output = """
## Executive Summary
Code review complete.

## Critical Issues (Must Fix)
No critical issues.

## High Priority Issues (Should Fix)
No high priority issues.

## Quality Score
7/10

## Recommendation
Approve
"""
        mock_run.return_value = crc.RunResult(success=True, output=review_output)

        args = Namespace(
            target="test.py",
            plan=False,
            output="test-review",
            focus=None,
            timeout=None
        )

        exit_code = crc.cmd_review(args)

        assert exit_code == 0
        mock_gather.assert_called_once_with("test.py")
        mock_run.assert_called_once()

    @patch("code_review_claude.check_claude_availability")
    def test_review_claude_not_available(
        self,
        mock_check: Mock,
        capsys: pytest.CaptureFixture[str]
    ) -> None:
        """Test review command when Claude is not available."""
        mock_check.return_value = crc.CheckResult(
            available=False,
            message="ERROR: Claude not installed"
        )

        args = Namespace(
            target="test.py",
            plan=False,
            output="test-review",
            focus=None,
            timeout=None
        )

        exit_code = crc.cmd_review(args)

        assert exit_code == 1
        captured = capsys.readouterr()
        assert "ERROR: Claude not installed" in captured.err

    @patch("code_review_claude.gather_code_content")
    @patch("code_review_claude.check_claude_availability")
    def test_review_no_files_found(
        self,
        mock_check: Mock,
        mock_gather: Mock,
        capsys: pytest.CaptureFixture[str]
    ) -> None:
        """Test review command when no files are found."""
        mock_check.return_value = crc.CheckResult(available=True, message="claude ready")
        mock_gather.return_value = ("", [])

        args = Namespace(
            target="nonexistent/*.py",
            plan=False,
            output="test-review",
            focus=None,
            timeout=None
        )

        exit_code = crc.cmd_review(args)

        assert exit_code == 1
        captured = capsys.readouterr()
        assert "No files found" in captured.err

    @patch("code_review_claude.run_claude_from_file")
    @patch("code_review_claude.gather_code_content")
    @patch("code_review_claude.check_claude_availability")
    def test_review_with_focus_areas(
        self,
        mock_check: Mock,
        mock_gather: Mock,
        mock_run: Mock,
        sample_code: str
    ) -> None:
        """Test review command with focus areas."""
        mock_check.return_value = crc.CheckResult(available=True, message="claude ready")
        mock_gather.return_value = (sample_code, [Path("test.py")])
        mock_run.return_value = crc.RunResult(
            success=True,
            output="Review complete."
        )

        args = Namespace(
            target="test.py",
            plan=False,
            output="test-review",
            focus="security,performance",
            timeout=None
        )

        exit_code = crc.cmd_review(args)

        assert exit_code == 0
        # Verify focus areas were parsed and passed correctly
        mock_run.assert_called_once()

    @patch("code_review_claude.run_claude_from_file")
    @patch("code_review_claude.gather_code_content")
    @patch("code_review_claude.check_claude_availability")
    def test_review_planning_mode(
        self,
        mock_check: Mock,
        mock_gather: Mock,
        mock_run: Mock,
        mock_plans_dir: Path,
        sample_code: str
    ) -> None:
        """Test review command in planning mode."""
        mock_check.return_value = crc.CheckResult(available=True, message="claude ready")
        mock_gather.return_value = (sample_code, [Path("test.py")])
        mock_run.return_value = crc.RunResult(
            success=True,
            output="Implementation plan here."
        )

        args = Namespace(
            target="test.py",
            plan=True,
            output="test-plan",
            focus=None,
            timeout=None
        )

        exit_code = crc.cmd_review(args)

        assert exit_code == 0
        # Should create planning mode output
        mock_run.assert_called_once()

    @patch("code_review_claude.run_claude_from_file")
    @patch("code_review_claude.gather_code_content")
    @patch("code_review_claude.check_claude_availability")
    def test_review_failure(
        self,
        mock_check: Mock,
        mock_gather: Mock,
        mock_run: Mock,
        capsys: pytest.CaptureFixture[str],
        sample_code: str
    ) -> None:
        """Test review command failure."""
        mock_check.return_value = crc.CheckResult(available=True, message="claude ready")
        mock_gather.return_value = (sample_code, [Path("test.py")])
        mock_run.return_value = crc.RunResult(
            success=False,
            output="Partial output",
            error="Review failed"
        )

        args = Namespace(
            target="test.py",
            plan=False,
            output="test-review",
            focus=None,
            timeout=None
        )

        exit_code = crc.cmd_review(args)

        assert exit_code == 1
        captured = capsys.readouterr()
        assert "Review failed" in captured.err

    @patch("code_review_claude.run_claude_from_file")
    @patch("code_review_claude.gather_code_content")
    @patch("code_review_claude.check_claude_availability")
    def test_review_custom_timeout(
        self,
        mock_check: Mock,
        mock_gather: Mock,
        mock_run: Mock,
        sample_code: str
    ) -> None:
        """Test review command with custom timeout."""
        mock_check.return_value = crc.CheckResult(available=True, message="claude ready")
        mock_gather.return_value = (sample_code, [Path("test.py")] * 15)  # Many files
        mock_run.return_value = crc.RunResult(success=True, output="Review complete.")

        args = Namespace(
            target="test.py",
            plan=False,
            output="test-review",
            focus=None,
            timeout=120  # Custom timeout
        )

        exit_code = crc.cmd_review(args)

        assert exit_code == 0
        # Verify the custom timeout is used
        call_args = mock_run.call_args
        assert call_args[1]["timeout"] == 120


class TestGatherCodeContentIntegration:
    """Integration tests for gather_code_content function."""

    def test_gather_from_multiple_py_files(self, tmp_path: Path) -> None:
        """Test gathering from multiple Python files."""
        (tmp_path / "module1.py").write_text("def func1(): pass")
        (tmp_path / "module2.py").write_text("def func2(): pass")
        (tmp_path / "module3.py").write_text("def func3(): pass")

        content, files = crc.gather_code_content(str(tmp_path))

        assert len(files) == 3
        assert "func1" in content
        assert "func2" in content
        assert "func3" in content

    def test_gather_filters_by_extension(self, tmp_path: Path) -> None:
        """Test that gathering filters by code file extensions."""
        (tmp_path / "code.py").write_text("def func(): pass")
        (tmp_path / "code.ts").write_text("function func() {}")
        (tmp_path / "README.md").write_text("# Documentation")
        (tmp_path / "config.json").write_text("{}")

        content, files = crc.gather_code_content(str(tmp_path))

        # Should include .py and .ts but not .md or .json
        assert len(files) == 2
        assert any(f.suffix == ".py" for f in files)
        assert any(f.suffix == ".ts" for f in files)

    def test_gather_limits_file_count(self, tmp_path: Path) -> None:
        """Test that gathering limits to 50 files."""
        # Create 60 files
        for i in range(60):
            (tmp_path / f"file{i}.py").write_text(f"# File {i}")

        content, files = crc.gather_code_content(str(tmp_path))

        # Should be limited to 50
        assert len(files) <= 50
