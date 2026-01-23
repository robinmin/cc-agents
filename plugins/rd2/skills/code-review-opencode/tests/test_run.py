"""Tests for run command in code-review-opencode.py."""
from __future__ import annotations

import subprocess
from argparse import Namespace
from pathlib import Path
from unittest.mock import Mock, patch

import pytest

import code_review_opencode as cro


class TestRunOpenCodePrompt:
    """Tests for run_opencode_prompt function."""

    @patch("code_review_opencode.subprocess.run")
    def test_successful_prompt_execution(self, mock_run: Mock) -> None:
        """Test successful execution of a prompt."""
        mock_run.return_value = Mock(
            returncode=0, stdout="Response from OpenCode", stderr=""
        )

        result = cro.run_opencode_prompt("Explain this code")

        assert result.success is True
        assert result.output == "Response from OpenCode"
        assert result.error is None

    @patch("code_review_opencode.subprocess.run")
    def test_failed_prompt_execution(self, mock_run: Mock) -> None:
        """Test failed execution of a prompt."""
        mock_run.return_value = Mock(
            returncode=1, stdout="", stderr="Command failed"
        )

        result = cro.run_opencode_prompt("Invalid prompt")

        assert result.success is False
        assert "Command failed" in result.error

    @patch("code_review_opencode.subprocess.run")
    def test_timeout(self, mock_run: Mock) -> None:
        """Test timeout handling."""
        mock_run.side_effect = subprocess.TimeoutExpired(
            cmd=["opencode", "run", "prompt"], timeout=300
        )

        result = cro.run_opencode_prompt("Long prompt")

        assert result.success is False
        assert "timeout" in result.error.lower()

    @patch("code_review_opencode.subprocess.run")
    def test_custom_timeout(self, mock_run: Mock) -> None:
        """Test custom timeout parameter."""
        mock_run.return_value = Mock(returncode=0, stdout="Response")

        cro.run_opencode_prompt("Prompt", timeout=600)

        # Check that the timeout was passed correctly
        call_args = mock_run.call_args
        assert call_args.kwargs["timeout"] == 600

    @patch("code_review_opencode.subprocess.run")
    def test_exception_handling(self, mock_run: Mock) -> None:
        """Test exception handling."""
        mock_run.side_effect = Exception("Unexpected error")

        result = cro.run_opencode_prompt("Prompt")

        assert result.success is False
        assert "Unexpected error" in result.error


class TestCmdRun:
    """Tests for cmd_run function."""

    @patch("code_review_opencode.run_opencode_prompt")
    @patch("code_review_opencode.check_opencode_availability")
    def test_successful_run(
        self, mock_check: Mock, mock_run: Mock, capsys: pytest.CaptureFixture[str]
    ) -> None:
        """Test successful run command."""
        mock_check.return_value = cro.CheckResult(
            available=True, message="opencode ready"
        )
        mock_run.return_value = cro.RunResult(
            success=True, output="AI Response"
        )
        args = Namespace(prompt="Test prompt", timeout=None, save=None)

        exit_code = cro.cmd_run(args)

        assert exit_code == 0
        captured = capsys.readouterr()
        assert "AI Response" in captured.out

    @patch("code_review_opencode.check_opencode_availability")
    def test_run_when_opencode_not_available(
        self, mock_check: Mock, capsys: pytest.CaptureFixture[str]
    ) -> None:
        """Test run command when OpenCode is not available."""
        mock_check.return_value = cro.CheckResult(
            available=False, message="ERROR: Not installed"
        )
        args = Namespace(prompt="Test prompt", timeout=None, save=None)

        exit_code = cro.cmd_run(args)

        assert exit_code == 1
        captured = capsys.readouterr()
        assert "ERROR: Not installed" in captured.err

    @patch("code_review_opencode.run_opencode_prompt")
    @patch("code_review_opencode.check_opencode_availability")
    def test_run_with_save(
        self, mock_check: Mock, mock_run: Mock, mock_plans_dir: Path, capsys: pytest.CaptureFixture[str], monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Test run command with save option."""
        import code_review_opencode as cro_module

        mock_check.return_value = cro.CheckResult(
            available=True, message="opencode ready"
        )
        mock_run.return_value = cro.RunResult(
            success=True, output="AI Response"
        )
        args = Namespace(prompt="Test prompt", timeout=None, save="test-plan")

        exit_code = cro_module.cmd_run(args)

        assert exit_code == 0
        # Check that plan file was created
        plan_files = list(mock_plans_dir.glob("test-plan*.md"))
        assert len(plan_files) > 0
