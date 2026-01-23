"""Tests for check command in code-review-gemini.py."""
from __future__ import annotations

import subprocess
from argparse import Namespace
from unittest.mock import Mock, patch

import pytest

import code_review_gemini as crg


class TestCheckGeminiAvailability:
    """Tests for check_gemini_availability function."""

    @patch("code_review_gemini.shutil.which")
    @patch("code_review_gemini.subprocess.run")
    def test_gemini_available_with_version(
        self, mock_run: Mock, mock_which: Mock
    ) -> None:
        """Test successful check with version info."""
        mock_which.return_value = "/usr/local/bin/gemini"
        mock_run.return_value = Mock(
            returncode=0, stdout="1.2.3\n", stderr=""
        )

        result = crg.check_gemini_availability()

        assert result.available is True
        assert result.message == "gemini ready"
        assert result.version == "1.2.3"
        mock_which.assert_called_once_with("gemini")
        mock_run.assert_called_once()

    @patch("code_review_gemini.shutil.which")
    def test_gemini_not_installed(self, mock_which: Mock) -> None:
        """Test when Gemini CLI is not installed."""
        mock_which.return_value = None

        result = crg.check_gemini_availability()

        assert result.available is False
        assert "ERROR: Gemini CLI is not installed" in result.message
        assert "npm install -g @google/gemini-cli" in result.message
        assert result.version is None

    @patch("code_review_gemini.shutil.which")
    @patch("code_review_gemini.subprocess.run")
    def test_gemini_returns_error(
        self, mock_run: Mock, mock_which: Mock
    ) -> None:
        """Test when Gemini CLI returns an error."""
        mock_which.return_value = "/usr/local/bin/gemini"
        mock_run.return_value = Mock(
            returncode=1, stdout="", stderr="Command failed"
        )

        result = crg.check_gemini_availability()

        assert result.available is False
        assert "ERROR: Gemini CLI returned error" in result.message
        assert "Command failed" in result.message

    @patch("code_review_gemini.shutil.which")
    @patch("code_review_gemini.subprocess.run")
    def test_gemini_timeout(self, mock_run: Mock, mock_which: Mock) -> None:
        """Test when Gemini CLI times out."""
        mock_which.return_value = "/usr/local/bin/gemini"
        mock_run.side_effect = subprocess.TimeoutExpired(
            cmd=["gemini", "--version"], timeout=5
        )

        result = crg.check_gemini_availability()

        assert result.available is False
        assert "timeout" in result.message.lower()

    @patch("code_review_gemini.shutil.which")
    @patch("code_review_gemini.subprocess.run")
    def test_gemini_exception(self, mock_run: Mock, mock_which: Mock) -> None:
        """Test when an unexpected exception occurs."""
        mock_which.return_value = "/usr/local/bin/gemini"
        mock_run.side_effect = Exception("Unexpected error")

        result = crg.check_gemini_availability()

        assert result.available is False
        assert "Failed to check Gemini CLI" in result.message
        assert "Unexpected error" in result.message


class TestCmdCheck:
    """Tests for cmd_check function."""

    @patch("code_review_gemini.check_gemini_availability")
    def test_check_success_without_verbose(
        self, mock_check: Mock, capsys: pytest.CaptureFixture[str]
    ) -> None:
        """Test successful check without verbose flag."""
        mock_check.return_value = crg.CheckResult(
            available=True, message="gemini ready", version="1.2.3"
        )
        args = Namespace(verbose=False)

        exit_code = crg.cmd_check(args)

        assert exit_code == 0
        captured = capsys.readouterr()
        assert "gemini ready" in captured.out
        assert "1.2.3" not in captured.out  # Version not shown without verbose

    @patch("code_review_gemini.check_gemini_availability")
    def test_check_success_with_verbose(
        self, mock_check: Mock, capsys: pytest.CaptureFixture[str]
    ) -> None:
        """Test successful check with verbose flag."""
        mock_check.return_value = crg.CheckResult(
            available=True, message="gemini ready", version="1.2.3"
        )
        args = Namespace(verbose=True)

        exit_code = crg.cmd_check(args)

        assert exit_code == 0
        captured = capsys.readouterr()
        assert "gemini ready" in captured.out
        assert "1.2.3" in captured.out  # Version shown with verbose

    @patch("code_review_gemini.check_gemini_availability")
    def test_check_failure(
        self, mock_check: Mock, capsys: pytest.CaptureFixture[str]
    ) -> None:
        """Test check failure."""
        mock_check.return_value = crg.CheckResult(
            available=False, message="ERROR: Not installed"
        )
        args = Namespace(verbose=False)

        exit_code = crg.cmd_check(args)

        assert exit_code == 1
        captured = capsys.readouterr()
        assert "ERROR: Not installed" in captured.err
