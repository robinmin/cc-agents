"""Tests for check command in code-review-claude.py."""
from __future__ import annotations

import subprocess
from argparse import Namespace
from unittest.mock import Mock, patch

import pytest

import code_review_claude as crc


class TestCheckClaudeAvailability:
    """Tests for check_claude_availability function."""

    @patch("code_review_claude.shutil.which")
    @patch("code_review_claude.subprocess.run")
    def test_claude_available_with_version(
        self, mock_run: Mock, mock_which: Mock
    ) -> None:
        """Test successful check with version info."""
        mock_which.return_value = "/usr/local/bin/claude"
        mock_run.return_value = Mock(
            returncode=0, stdout="1.2.3\n", stderr=""
        )

        result = crc.check_claude_availability()

        assert result.available is True
        assert result.message == "claude ready"
        assert result.version == "1.2.3"
        mock_which.assert_called_once_with("claude")
        mock_run.assert_called_once()

    @patch("code_review_claude.shutil.which")
    def test_claude_not_installed(self, mock_which: Mock) -> None:
        """Test when Claude CLI is not installed."""
        mock_which.return_value = None

        result = crc.check_claude_availability()

        assert result.available is False
        assert "ERROR: Claude CLI is not installed" in result.message
        assert "github.com/anthropics/claude-code" in result.message
        assert result.version is None

    @patch("code_review_claude.shutil.which")
    @patch("code_review_claude.subprocess.run")
    def test_claude_returns_error(
        self, mock_run: Mock, mock_which: Mock
    ) -> None:
        """Test when Claude CLI returns an error but command exists."""
        mock_which.return_value = "/usr/local/bin/claude"
        mock_run.return_value = Mock(
            returncode=1, stdout="", stderr="Command failed"
        )

        result = crc.check_claude_availability()

        # Even if --version fails, if claude exists, it should be available
        assert result.available is True
        assert "version unknown" in result.message

    @patch("code_review_claude.shutil.which")
    @patch("code_review_claude.subprocess.run")
    def test_claude_timeout(self, mock_run: Mock, mock_which: Mock) -> None:
        """Test when Claude CLI times out."""
        mock_which.return_value = "/usr/local/bin/claude"
        mock_run.side_effect = subprocess.TimeoutExpired(
            cmd=["claude", "--version"], timeout=10
        )

        result = crc.check_claude_availability()

        assert result.available is False
        assert "timeout" in result.message.lower()

    @patch("code_review_claude.shutil.which")
    @patch("code_review_claude.subprocess.run")
    def test_claude_exception(self, mock_run: Mock, mock_which: Mock) -> None:
        """Test when an unexpected exception occurs."""
        mock_which.return_value = "/usr/local/bin/claude"
        mock_run.side_effect = Exception("Unexpected error")

        result = crc.check_claude_availability()

        # Even with exception, if claude exists, consider it available
        assert result.available is True


class TestCmdCheck:
    """Tests for cmd_check function."""

    @patch("code_review_claude.check_claude_availability")
    def test_check_success_without_verbose(
        self, mock_check: Mock, capsys: pytest.CaptureFixture[str]
    ) -> None:
        """Test successful check without verbose flag."""
        mock_check.return_value = crc.CheckResult(
            available=True, message="claude ready", version="1.2.3"
        )
        args = Namespace(verbose=False)

        exit_code = crc.cmd_check(args)

        assert exit_code == 0
        captured = capsys.readouterr()
        assert "claude ready" in captured.out
        assert "1.2.3" not in captured.out  # Version not shown without verbose

    @patch("code_review_claude.check_claude_availability")
    def test_check_success_with_verbose(
        self, mock_check: Mock, capsys: pytest.CaptureFixture[str]
    ) -> None:
        """Test successful check with verbose flag."""
        mock_check.return_value = crc.CheckResult(
            available=True, message="claude ready", version="1.2.3"
        )
        args = Namespace(verbose=True)

        exit_code = crc.cmd_check(args)

        assert exit_code == 0
        captured = capsys.readouterr()
        assert "claude ready" in captured.out
        assert "1.2.3" in captured.out  # Version shown with verbose

    @patch("code_review_claude.check_claude_availability")
    def test_check_failure(
        self, mock_check: Mock, capsys: pytest.CaptureFixture[str]
    ) -> None:
        """Test check failure."""
        mock_check.return_value = crc.CheckResult(
            available=False, message="ERROR: Not installed"
        )
        args = Namespace(verbose=False)

        exit_code = crc.cmd_check(args)

        assert exit_code == 1
        captured = capsys.readouterr()
        assert "ERROR: Not installed" in captured.err
