"""Tests for run command in code-review-claude.py."""
from __future__ import annotations

from argparse import Namespace
from pathlib import Path
import subprocess
from typing import TYPE_CHECKING
from unittest.mock import Mock, patch

if TYPE_CHECKING:
    import pytest

import code_review_claude as crc


class TestRunClaudePrompt:
    """Tests for run_claude_prompt function."""

    @patch("code_review_claude.subprocess.run")
    def test_run_prompt_success(self, mock_run: Mock) -> None:
        """Test successful prompt execution."""
        mock_run.return_value = Mock(
            returncode=0,
            stdout="Test response from Claude",
            stderr=""
        )

        result = crc.run_claude_prompt("Test prompt")

        assert result.success is True
        assert result.output == "Test response from Claude"
        assert result.error is None
        mock_run.assert_called_once()

    @patch("code_review_claude.subprocess.run")
    def test_run_prompt_failure(self, mock_run: Mock) -> None:
        """Test prompt execution failure."""
        mock_run.return_value = Mock(
            returncode=1,
            stdout="Partial output",
            stderr="Error occurred"
        )

        result = crc.run_claude_prompt("Test prompt")

        assert result.success is False
        assert result.output == "Partial output"
        assert result.error == "Error occurred"

    @patch("code_review_claude.subprocess.run")
    def test_run_prompt_timeout(self, mock_run: Mock) -> None:
        """Test prompt execution timeout."""
        mock_run.side_effect = subprocess.TimeoutExpired(
            cmd=["claude", "ask", "test"], timeout=300
        )

        result = crc.run_claude_prompt("Test prompt")

        assert result.success is False
        assert result.output == ""
        assert "timeout" in result.error.lower()

    @patch("code_review_claude.subprocess.run")
    def test_run_prompt_exception(self, mock_run: Mock) -> None:
        """Test prompt execution exception."""
        mock_run.side_effect = Exception("Unexpected error")

        result = crc.run_claude_prompt("Test prompt")

        assert result.success is False
        assert result.output == ""
        assert "Unexpected error" in result.error


class TestCmdRun:
    """Tests for cmd_run function."""

    @patch("code_review_claude.run_claude_prompt")
    @patch("code_review_claude.check_claude_availability")
    def test_run_success(
        self,
        mock_check: Mock,
        mock_run: Mock,
        capsys: pytest.CaptureFixture[str]
    ) -> None:
        """Test successful run command."""
        mock_check.return_value = crc.CheckResult(
            available=True, message="claude ready"
        )
        mock_run.return_value = crc.RunResult(
            success=True,
            output="Test response"
        )
        args = Namespace(prompt="Test prompt", timeout=None, save=None)

        exit_code = crc.cmd_run(args)

        assert exit_code == 0
        captured = capsys.readouterr()
        assert "Test response" in captured.out
        mock_check.assert_called_once()
        mock_run.assert_called_once()

    @patch("code_review_claude.run_claude_prompt")
    @patch("code_review_claude.check_claude_availability")
    def test_run_failure(
        self,
        mock_check: Mock,
        mock_run: Mock,
        capsys: pytest.CaptureFixture[str]
    ) -> None:
        """Test run command failure."""
        mock_check.return_value = crc.CheckResult(
            available=True, message="claude ready"
        )
        mock_run.return_value = crc.RunResult(
            success=False,
            output="Partial output",
            error="Error occurred"
        )
        args = Namespace(prompt="Test prompt", timeout=None, save=None)

        exit_code = crc.cmd_run(args)

        assert exit_code == 1
        captured = capsys.readouterr()
        assert "Partial output" in captured.out
        assert "Error occurred" in captured.err

    @patch("code_review_claude.check_claude_availability")
    def test_run_claude_not_available(
        self,
        mock_check: Mock,
        capsys: pytest.CaptureFixture[str]
    ) -> None:
        """Test run command when Claude is not available."""
        mock_check.return_value = crc.CheckResult(
            available=False,
            message="ERROR: Claude not installed"
        )
        args = Namespace(prompt="Test prompt", timeout=None, save=None)

        exit_code = crc.cmd_run(args)

        assert exit_code == 1
        captured = capsys.readouterr()
        assert "ERROR: Claude not installed" in captured.err

    @patch("code_review_claude.run_claude_prompt")
    @patch("code_review_claude.check_claude_availability")
    @patch("code_review_claude.save_to_plan")
    def test_run_with_save(
        self,
        mock_save: Mock,
        mock_check: Mock,
        mock_run: Mock,
        mock_plans_dir: Path
    ) -> None:
        """Test run command with save option."""
        mock_check.return_value = crc.CheckResult(
            available=True, message="claude ready"
        )
        mock_run.return_value = crc.RunResult(
            success=True,
            output="Test response"
        )
        mock_save.return_value = mock_plans_dir / "test-plan.md"
        args = Namespace(prompt="Test prompt", timeout=None, save="test-plan")

        exit_code = crc.cmd_run(args)

        assert exit_code == 0
        mock_save.assert_called_once_with("Test response", "test-plan")
