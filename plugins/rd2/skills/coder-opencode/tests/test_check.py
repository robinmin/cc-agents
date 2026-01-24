"""Tests for check command in coder-opencode.py."""
from __future__ import annotations

import subprocess
from argparse import Namespace
from unittest.mock import Mock, patch

import pytest

import coder_opencode as co


class TestCheckOpencodeAvailability:
    """Tests for check_opencode_availability function."""

    @patch("coder_opencode.shutil.which")
    @patch("coder_opencode.subprocess.run")
    def test_opencode_available_with_version(
        self, mock_run: Mock, mock_which: Mock
    ) -> None:
        """Test successful check with version info."""
        mock_which.return_value = "/usr/local/bin/opencode"
        mock_run.return_value = Mock(
            returncode=0, stdout="1.2.3\n", stderr=""
        )

        result = co.check_opencode_availability()

        assert result.available is True
        assert result.message == "opencode ready"
        assert result.version == "1.2.3"
        mock_which.assert_called_once_with("opencode")
        mock_run.assert_called_once()

    @patch("coder_opencode.shutil.which")
    def test_opencode_not_installed(self, mock_which: Mock) -> None:
        """Test when OpenCode CLI is not installed."""
        mock_which.return_value = None

        result = co.check_opencode_availability()

        assert result.available is False
        assert "OpenCode CLI is not installed" in result.message
        assert result.version is None

    @patch("coder_opencode.shutil.which")
    @patch("coder_opencode.subprocess.run")
    def test_opencode_returns_error(
        self, mock_run: Mock, mock_which: Mock
    ) -> None:
        """Test when OpenCode CLI returns an error."""
        mock_which.return_value = "/usr/local/bin/opencode"
        mock_run.return_value = Mock(
            returncode=1, stdout="", stderr="Command failed"
        )

        result = co.check_opencode_availability()

        assert result.available is False
        assert "ERROR: OpenCode CLI returned error" in result.message

    @patch("coder_opencode.shutil.which")
    @patch("coder_opencode.subprocess.run")
    def test_opencode_timeout(self, mock_run: Mock, mock_which: Mock) -> None:
        """Test when OpenCode CLI times out."""
        mock_which.return_value = "/usr/local/bin/opencode"
        mock_run.side_effect = subprocess.TimeoutExpired(
            cmd=["opencode", "--version"], timeout=10
        )

        result = co.check_opencode_availability()

        assert result.available is False
        assert "timeout" in result.message.lower()


class TestCmdCheck:
    """Tests for cmd_check function."""

    @patch("coder_opencode.check_opencode_availability")
    def test_check_success_without_verbose(
        self, mock_check: Mock, capsys: pytest.CaptureFixture[str]
    ) -> None:
        """Test successful check without verbose flag."""
        mock_check.return_value = co.CheckResult(
            available=True, message="opencode ready", version="1.2.3"
        )
        args = Namespace(verbose=False)

        exit_code = co.cmd_check(args)

        assert exit_code == 0
        captured = capsys.readouterr()
        assert "opencode ready" in captured.out

    @patch("coder_opencode.check_opencode_availability")
    def test_check_failure(
        self, mock_check: Mock, capsys: pytest.CaptureFixture[str]
    ) -> None:
        """Test check failure."""
        mock_check.return_value = co.CheckResult(
            available=False, message="ERROR: Not installed"
        )
        args = Namespace(verbose=False)

        exit_code = co.cmd_check(args)

        assert exit_code == 1
        captured = capsys.readouterr()
        assert "ERROR: Not installed" in captured.err
