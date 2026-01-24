"""Tests for check command in coder-claude.py."""
from __future__ import annotations

import subprocess
from argparse import Namespace
from unittest.mock import Mock, patch

import pytest

import coder_claude as cc


class TestCheckClaudeAvailability:
    """Tests for check_claude_availability function."""

    @patch("coder_claude.shutil.which")
    @patch("coder_claude.subprocess.run")
    def test_claude_available_with_version(
        self, mock_run: Mock, mock_which: Mock
    ) -> None:
        """Test successful check with version info."""
        mock_which.return_value = "/usr/local/bin/claude"
        mock_run.return_value = Mock(
            returncode=0, stdout="1.2.3\n", stderr=""
        )

        result = cc.check_claude_availability()

        assert result.available is True
        assert result.message == "claude ready"
        assert result.version == "1.2.3"
        mock_which.assert_called_once_with("claude")
        mock_run.assert_called_once()

    @patch("coder_claude.shutil.which")
    def test_claude_not_installed(self, mock_which: Mock) -> None:
        """Test when Claude CLI is not installed."""
        mock_which.return_value = None

        result = cc.check_claude_availability()

        assert result.available is False
        assert "ERROR: Claude CLI is not installed" in result.message
        assert result.version is None

    @patch("coder_claude.shutil.which")
    @patch("coder_claude.subprocess.run")
    def test_claude_returns_error(
        self, mock_run: Mock, mock_which: Mock
    ) -> None:
        """Test when Claude CLI returns an error."""
        mock_which.return_value = "/usr/local/bin/claude"
        mock_run.return_value = Mock(
            returncode=1, stdout="", stderr="Command failed"
        )

        result = cc.check_claude_availability()

        assert result.available is False
        assert "ERROR: Claude CLI returned error" in result.message

    @patch("coder_claude.shutil.which")
    @patch("coder_claude.subprocess.run")
    def test_claude_timeout(self, mock_run: Mock, mock_which: Mock) -> None:
        """Test when Claude CLI times out."""
        mock_which.return_value = "/usr/local/bin/claude"
        mock_run.side_effect = subprocess.TimeoutExpired(
            cmd=["claude", "--version"], timeout=10
        )

        result = cc.check_claude_availability()

        assert result.available is False
        assert "timeout" in result.message.lower()


class TestCmdCheck:
    """Tests for cmd_check function."""

    @patch("coder_claude.check_claude_availability")
    def test_check_success_without_verbose(
        self, mock_check: Mock, capsys: pytest.CaptureFixture[str]
    ) -> None:
        """Test successful check without verbose flag."""
        mock_check.return_value = cc.CheckResult(
            available=True, message="claude ready", version="1.2.3"
        )
        args = Namespace(verbose=False)

        exit_code = cc.cmd_check(args)

        assert exit_code == 0
        captured = capsys.readouterr()
        assert "claude ready" in captured.out

    @patch("coder_claude.check_claude_availability")
    def test_check_failure(
        self, mock_check: Mock, capsys: pytest.CaptureFixture[str]
    ) -> None:
        """Test check failure."""
        mock_check.return_value = cc.CheckResult(
            available=False, message="ERROR: Not installed"
        )
        args = Namespace(verbose=False)

        exit_code = cc.cmd_check(args)

        assert exit_code == 1
        captured = capsys.readouterr()
        assert "ERROR: Not installed" in captured.err
