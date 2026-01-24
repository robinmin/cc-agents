"""Tests for check command in coder-gemini.py."""
from __future__ import annotations

import subprocess
from argparse import Namespace
from unittest.mock import Mock, patch

import pytest

import coder_gemini as cg


class TestCheckGeminiAvailability:
    """Tests for check_gemini_availability function."""

    @patch("coder_gemini.shutil.which")
    @patch("coder_gemini.subprocess.run")
    def test_gemini_available_with_version(
        self, mock_run: Mock, mock_which: Mock
    ) -> None:
        """Test successful check with version info."""
        mock_which.return_value = "/usr/local/bin/gemini"
        mock_run.return_value = Mock(
            returncode=0, stdout="1.2.3\n", stderr=""
        )

        result = cg.check_gemini_availability()

        assert result.available is True
        assert result.message == "gemini ready"
        assert result.version == "1.2.3"
        mock_which.assert_called_once_with("gemini")
        mock_run.assert_called_once()

    @patch("coder_gemini.shutil.which")
    def test_gemini_not_installed(self, mock_which: Mock) -> None:
        """Test when Gemini CLI is not installed."""
        mock_which.return_value = None

        result = cg.check_gemini_availability()

        assert result.available is False
        assert "ERROR: Gemini CLI is not installed" in result.message
        assert result.version is None

    @patch("coder_gemini.shutil.which")
    @patch("coder_gemini.subprocess.run")
    def test_gemini_returns_error(
        self, mock_run: Mock, mock_which: Mock
    ) -> None:
        """Test when Gemini CLI returns an error."""
        mock_which.return_value = "/usr/local/bin/gemini"
        mock_run.return_value = Mock(
            returncode=1, stdout="", stderr="Command failed"
        )

        result = cg.check_gemini_availability()

        assert result.available is False
        assert "ERROR: Gemini CLI returned error" in result.message

    @patch("coder_gemini.shutil.which")
    @patch("coder_gemini.subprocess.run")
    def test_gemini_timeout(self, mock_run: Mock, mock_which: Mock) -> None:
        """Test when Gemini CLI times out."""
        mock_which.return_value = "/usr/local/bin/gemini"
        mock_run.side_effect = subprocess.TimeoutExpired(
            cmd=["gemini", "--version"], timeout=5
        )

        result = cg.check_gemini_availability()

        assert result.available is False
        assert "timeout" in result.message.lower()


class TestCmdCheck:
    """Tests for cmd_check function."""

    @patch("coder_gemini.check_gemini_availability")
    def test_check_success_without_verbose(
        self, mock_check: Mock, capsys: pytest.CaptureFixture[str]
    ) -> None:
        """Test successful check without verbose flag."""
        mock_check.return_value = cg.CheckResult(
            available=True, message="gemini ready", version="1.2.3"
        )
        args = Namespace(verbose=False)

        exit_code = cg.cmd_check(args)

        assert exit_code == 0
        captured = capsys.readouterr()
        assert "gemini ready" in captured.out

    @patch("coder_gemini.check_gemini_availability")
    def test_check_failure(
        self, mock_check: Mock, capsys: pytest.CaptureFixture[str]
    ) -> None:
        """Test check failure."""
        mock_check.return_value = cg.CheckResult(
            available=False, message="ERROR: Not installed"
        )
        args = Namespace(verbose=False)

        exit_code = cg.cmd_check(args)

        assert exit_code == 1
        captured = capsys.readouterr()
        assert "ERROR: Not installed" in captured.err
