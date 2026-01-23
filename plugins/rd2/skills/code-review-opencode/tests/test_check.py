"""Tests for check command in code-review-opencode.py."""
from __future__ import annotations

import subprocess
from argparse import Namespace
from unittest.mock import Mock, patch

import pytest

import code_review_opencode as cro


class TestCheckOpenCodeAvailability:
    """Tests for check_opencode_availability function."""

    @patch("code_review_opencode.shutil.which")
    @patch("code_review_opencode.subprocess.run")
    def test_opencode_available_with_version(
        self, mock_run: Mock, mock_which: Mock
    ) -> None:
        """Test successful check with version info."""
        mock_which.return_value = "/usr/local/bin/opencode"
        mock_run.return_value = Mock(
            returncode=0, stdout="opencode version 1.0.0\n", stderr=""
        )

        result = cro.check_opencode_availability()

        assert result.available is True
        assert result.message == "opencode ready"
        assert result.version == "opencode version 1.0.0"
        mock_which.assert_called_once_with("opencode")
        mock_run.assert_called_once()

    @patch("code_review_opencode.shutil.which")
    def test_opencode_not_installed(self, mock_which: Mock) -> None:
        """Test when OpenCode CLI is not installed."""
        mock_which.return_value = None

        result = cro.check_opencode_availability()

        assert result.available is False
        assert "ERROR: OpenCode CLI is not installed" in result.message
        assert "https://opencode.ai/docs/cli/" in result.message
        assert result.version is None

    @patch("code_review_opencode.shutil.which")
    @patch("code_review_opencode.subprocess.run")
    def test_opencode_timeout(self, mock_run: Mock, mock_which: Mock) -> None:
        """Test when OpenCode CLI times out."""
        mock_which.return_value = "/usr/local/bin/opencode"
        mock_run.side_effect = subprocess.TimeoutExpired(
            cmd=["opencode", "--version"], timeout=10
        )

        result = cro.check_opencode_availability()

        assert result.available is False
        assert "timeout" in result.message.lower()

    @patch("code_review_opencode.shutil.which")
    @patch("code_review_opencode.subprocess.run")
    def test_opencode_exception(self, mock_run: Mock, mock_which: Mock) -> None:
        """Test when an unexpected exception occurs."""
        mock_which.return_value = "/usr/local/bin/opencode"
        mock_run.side_effect = Exception("Unexpected error")

        result = cro.check_opencode_availability()

        assert result.available is True  # Falls back to available if command exists
        assert result.message == "opencode ready"


class TestCmdCheck:
    """Tests for cmd_check function."""

    @patch("code_review_opencode.check_opencode_availability")
    def test_check_success_without_verbose(
        self, mock_check: Mock, capsys: pytest.CaptureFixture[str]
    ) -> None:
        """Test successful check without verbose flag."""
        mock_check.return_value = cro.CheckResult(
            available=True, message="opencode ready", version="1.0.0"
        )
        args = Namespace(verbose=False)

        exit_code = cro.cmd_check(args)

        assert exit_code == 0
        captured = capsys.readouterr()
        assert "opencode ready" in captured.out
        assert "1.0.0" not in captured.out  # Version not shown without verbose

    @patch("code_review_opencode.check_opencode_availability")
    def test_check_success_with_verbose(
        self, mock_check: Mock, capsys: pytest.CaptureFixture[str]
    ) -> None:
        """Test successful check with verbose flag."""
        mock_check.return_value = cro.CheckResult(
            available=True, message="opencode ready", version="1.0.0"
        )
        args = Namespace(verbose=True)

        exit_code = cro.cmd_check(args)

        assert exit_code == 0
        captured = capsys.readouterr()
        assert "opencode ready" in captured.out
        assert "1.0.0" in captured.out  # Version shown with verbose

    @patch("code_review_opencode.check_opencode_availability")
    def test_check_failure(
        self, mock_check: Mock, capsys: pytest.CaptureFixture[str]
    ) -> None:
        """Test check failure."""
        mock_check.return_value = cro.CheckResult(
            available=False, message="ERROR: Not installed"
        )
        args = Namespace(verbose=False)

        exit_code = cro.cmd_check(args)

        assert exit_code == 1
        captured = capsys.readouterr()
        assert "ERROR: Not installed" in captured.err
