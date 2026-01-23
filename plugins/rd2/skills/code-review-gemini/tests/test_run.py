"""Tests for run command in code-review-gemini.py."""
from __future__ import annotations

import subprocess
from argparse import Namespace
from pathlib import Path
from unittest.mock import Mock, patch

import pytest

import code_review_gemini as crg


class TestRunGeminiPrompt:
    """Tests for run_gemini_prompt function."""

    @patch("code_review_gemini.subprocess.run")
    def test_successful_run(self, mock_run: Mock) -> None:
        """Test successful prompt execution."""
        mock_run.return_value = Mock(
            returncode=0, stdout="Response from Gemini", stderr=""
        )

        result = crg.run_gemini_prompt(
            prompt="Test prompt", model="gemini-2.5-pro"
        )

        assert result.success is True
        assert result.output == "Response from Gemini"
        assert result.error is None
        assert result.model == "gemini-2.5-pro"
        mock_run.assert_called_once()
        cmd = mock_run.call_args[0][0]
        assert cmd[0] == "gemini"
        assert "-m" in cmd
        assert "gemini-2.5-pro" in cmd
        assert "--sandbox" in cmd
        assert "-o" in cmd
        assert "text" in cmd

    @patch("code_review_gemini.subprocess.run")
    def test_run_with_json_format(self, mock_run: Mock) -> None:
        """Test run with JSON output format."""
        mock_run.return_value = Mock(
            returncode=0, stdout='{"result": "data"}', stderr=""
        )

        result = crg.run_gemini_prompt(
            prompt="Test", model="gemini-2.5-flash", output_format="json"
        )

        assert result.success is True
        cmd = mock_run.call_args[0][0]
        assert "json" in cmd

    @patch("code_review_gemini.subprocess.run")
    def test_run_with_custom_timeout(self, mock_run: Mock) -> None:
        """Test run with custom timeout."""
        mock_run.return_value = Mock(returncode=0, stdout="OK", stderr="")

        crg.run_gemini_prompt(prompt="Test", timeout=600)

        assert mock_run.call_args[1]["timeout"] == 600

    @patch("code_review_gemini.subprocess.run")
    def test_run_failure(self, mock_run: Mock) -> None:
        """Test prompt execution failure."""
        mock_run.return_value = Mock(
            returncode=1, stdout="", stderr="API Error"
        )

        result = crg.run_gemini_prompt(prompt="Test")

        assert result.success is False
        assert result.error == "API Error"

    @patch("code_review_gemini.subprocess.run")
    def test_run_timeout(self, mock_run: Mock) -> None:
        """Test timeout during execution."""
        mock_run.side_effect = subprocess.TimeoutExpired(
            cmd=["gemini"], timeout=300
        )

        result = crg.run_gemini_prompt(prompt="Test", timeout=300)

        assert result.success is False
        assert "timed out" in result.error.lower()
        assert "300" in result.error

    @patch("code_review_gemini.subprocess.run")
    def test_run_exception(self, mock_run: Mock) -> None:
        """Test unexpected exception during execution."""
        mock_run.side_effect = Exception("Unexpected error")

        result = crg.run_gemini_prompt(prompt="Test")

        assert result.success is False
        assert result.error == "Unexpected error"


class TestCmdRun:
    """Tests for cmd_run function."""

    @patch("code_review_gemini.check_gemini_availability")
    @patch("code_review_gemini.run_gemini_prompt")
    def test_run_success(
        self,
        mock_run: Mock,
        mock_check: Mock,
        capsys: pytest.CaptureFixture[str],
    ) -> None:
        """Test successful run command."""
        mock_check.return_value = crg.CheckResult(
            available=True, message="ready"
        )
        mock_run.return_value = crg.RunResult(
            success=True, output="Gemini response", model="gemini-2.5-pro"
        )
        args = Namespace(
            prompt="Test prompt",
            model="gemini-2.5-pro",
            output_format="text",
            timeout=None,
            save=None,
        )

        exit_code = crg.cmd_run(args)

        assert exit_code == 0
        captured = capsys.readouterr()
        assert "Gemini response" in captured.out

    @patch("code_review_gemini.check_gemini_availability")
    def test_run_gemini_not_available(
        self, mock_check: Mock, capsys: pytest.CaptureFixture[str]
    ) -> None:
        """Test run when Gemini is not available."""
        mock_check.return_value = crg.CheckResult(
            available=False, message="Not installed"
        )
        args = Namespace(
            prompt="Test",
            model="gemini-2.5-pro",
            output_format="text",
            timeout=None,
            save=None,
        )

        exit_code = crg.cmd_run(args)

        assert exit_code == 1
        captured = capsys.readouterr()
        assert "Not installed" in captured.err

    @patch("code_review_gemini.check_gemini_availability")
    @patch("code_review_gemini.run_gemini_prompt")
    def test_run_failure(
        self,
        mock_run: Mock,
        mock_check: Mock,
        capsys: pytest.CaptureFixture[str],
    ) -> None:
        """Test run command failure."""
        mock_check.return_value = crg.CheckResult(
            available=True, message="ready"
        )
        mock_run.return_value = crg.RunResult(
            success=False,
            output="Partial output",
            error="API Error",
            model="gemini-2.5-pro",
        )
        args = Namespace(
            prompt="Test",
            model="gemini-2.5-pro",
            output_format="text",
            timeout=None,
            save=None,
        )

        exit_code = crg.cmd_run(args)

        assert exit_code == 1
        captured = capsys.readouterr()
        assert "Partial output" in captured.out
        assert "API Error" in captured.err

    @patch("code_review_gemini.check_gemini_availability")
    @patch("code_review_gemini.run_gemini_prompt")
    @patch("code_review_gemini.save_to_plan")
    def test_run_with_save(
        self,
        mock_save: Mock,
        mock_run: Mock,
        mock_check: Mock,
        mock_plans_dir: Path,
    ) -> None:
        """Test run command with save to plan."""
        mock_check.return_value = crg.CheckResult(
            available=True, message="ready"
        )
        mock_run.return_value = crg.RunResult(
            success=True, output="Response", model="gemini-2.5-pro"
        )
        mock_save.return_value = mock_plans_dir / "test-plan.md"
        args = Namespace(
            prompt="Test",
            model="gemini-2.5-pro",
            output_format="text",
            timeout=None,
            save="test-plan",
        )

        exit_code = crg.cmd_run(args)

        assert exit_code == 0
        mock_save.assert_called_once_with(
            "Response", "test-plan", "gemini-2.5-pro"
        )
