"""Tests for run-file command in code-review-claude.py."""
from __future__ import annotations

import subprocess
from argparse import Namespace
from pathlib import Path
from unittest.mock import Mock, patch

import pytest

import code_review_claude as crc


class TestRunClaudeFromFile:
    """Tests for run_claude_from_file function."""

    @patch("code_review_claude.subprocess.run")
    def test_run_from_file_success(self, mock_run: Mock, temp_file: Path) -> None:
        """Test successful file-based prompt execution."""
        temp_file.write_text("Test prompt from file")
        mock_run.return_value = Mock(
            returncode=0,
            stdout="Test response from Claude",
            stderr=""
        )

        result = crc.run_claude_from_file(temp_file)

        assert result.success is True
        assert result.output == "Test response from Claude"
        assert result.error is None

    @patch("code_review_claude.subprocess.run")
    def test_run_from_file_with_output(self, mock_run: Mock, temp_file: Path, tmp_path: Path) -> None:
        """Test file-based prompt with output file."""
        temp_file.write_text("Test prompt from file")
        output_file = tmp_path / "output.txt"

        mock_run.return_value = Mock(
            returncode=0,
            stdout="Test response from Claude",
            stderr=""
        )

        result = crc.run_claude_from_file(temp_file, output_file=output_file)

        assert result.success is True
        assert output_file.exists()
        assert output_file.read_text() == "Test response from Claude"

    @patch("code_review_claude.subprocess.run")
    def test_run_from_file_not_found(self, mock_run: Mock, temp_file: Path) -> None:
        """Test file-based prompt with non-existent file."""
        # Don't create the file
        result = crc.run_claude_from_file(temp_file)

        assert result.success is False
        assert "not found" in result.error.lower()

    @patch("code_review_claude.subprocess.run")
    def test_run_from_file_timeout(self, mock_run: Mock, temp_file: Path) -> None:
        """Test file-based prompt timeout."""
        temp_file.write_text("Test prompt from file")
        mock_run.side_effect = subprocess.TimeoutExpired(
            cmd=["claude", "ask"], timeout=600
        )

        result = crc.run_claude_from_file(temp_file)

        assert result.success is False
        assert "timeout" in result.error.lower()

    @patch("code_review_claude.subprocess.run")
    def test_run_from_file_exception(self, mock_run: Mock, temp_file: Path) -> None:
        """Test file-based prompt exception."""
        temp_file.write_text("Test prompt from file")
        mock_run.side_effect = Exception("Unexpected error")

        result = crc.run_claude_from_file(temp_file)

        assert result.success is False
        assert "Unexpected error" in result.error


class TestCmdRunFile:
    """Tests for cmd_run_file function."""

    @patch("code_review_claude.run_claude_from_file")
    @patch("code_review_claude.check_claude_availability")
    def test_run_file_success(
        self,
        mock_check: Mock,
        mock_run: Mock,
        capsys: pytest.CaptureFixture[str],
        temp_file: Path
    ) -> None:
        """Test successful run-file command."""
        temp_file.write_text("Test prompt")
        mock_check.return_value = crc.CheckResult(available=True, message="claude ready")
        mock_run.return_value = crc.RunResult(success=True, output="Test response")

        args = Namespace(prompt_file=str(temp_file), output=None, timeout=None)
        exit_code = crc.cmd_run_file(args)

        assert exit_code == 0
        captured = capsys.readouterr()
        assert "Test response" in captured.out

    @patch("code_review_claude.run_claude_from_file")
    @patch("code_review_claude.check_claude_availability")
    def test_run_file_with_output(
        self,
        mock_check: Mock,
        mock_run: Mock,
        capsys: pytest.CaptureFixture[str],
        temp_file: Path,
        tmp_path: Path
    ) -> None:
        """Test run-file command with output file."""
        temp_file.write_text("Test prompt")
        output_file = tmp_path / "output.txt"

        # Mock that creates the output file when called
        def mock_run_from_file(prompt_file: Path, timeout: int, output_file: Path | None = None) -> crc.RunResult:
            if output_file:
                output_file.parent.mkdir(parents=True, exist_ok=True)
                output_file.write_text("Test response")
            return crc.RunResult(success=True, output="Test response")

        mock_check.return_value = crc.CheckResult(available=True, message="claude ready")
        mock_run.side_effect = mock_run_from_file

        args = Namespace(prompt_file=str(temp_file), output=str(output_file), timeout=None)
        exit_code = crc.cmd_run_file(args)

        assert exit_code == 0
        captured = capsys.readouterr()
        assert str(output_file) in captured.out
        assert output_file.exists()

    @patch("code_review_claude.check_claude_availability")
    def test_run_file_claude_not_available(
        self,
        mock_check: Mock,
        capsys: pytest.CaptureFixture[str],
        temp_file: Path
    ) -> None:
        """Test run-file command when Claude is not available."""
        temp_file.write_text("Test prompt")
        mock_check.return_value = crc.CheckResult(
            available=False, message="ERROR: Claude not installed"
        )

        args = Namespace(prompt_file=str(temp_file), output=None, timeout=None)
        exit_code = crc.cmd_run_file(args)

        assert exit_code == 1
        captured = capsys.readouterr()
        assert "ERROR: Claude not installed" in captured.err

    @patch("code_review_claude.run_claude_from_file")
    @patch("code_review_claude.check_claude_availability")
    def test_run_file_failure(
        self,
        mock_check: Mock,
        mock_run: Mock,
        capsys: pytest.CaptureFixture[str],
        temp_file: Path
    ) -> None:
        """Test run-file command failure."""
        temp_file.write_text("Test prompt")
        mock_check.return_value = crc.CheckResult(available=True, message="claude ready")
        mock_run.return_value = crc.RunResult(
            success=False,
            output="Partial output",
            error="Error occurred"
        )

        args = Namespace(prompt_file=str(temp_file), output=None, timeout=None)
        exit_code = crc.cmd_run_file(args)

        assert exit_code == 1
        captured = capsys.readouterr()
        assert "Partial output" in captured.out
        assert "Error occurred" in captured.err
