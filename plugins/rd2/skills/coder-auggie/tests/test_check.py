"""Tests for check command in coder-auggie.py."""
from __future__ import annotations

import subprocess
from argparse import Namespace
from unittest.mock import Mock, patch

import pytest

import coder_auggie as ca


class TestCheckAuggieAvailability:
    """Tests for check_auggie_availability function."""

    @patch("coder_auggie.shutil.which")
    @patch("coder_auggie.subprocess.run")
    def test_auggie_available_with_version(
        self, mock_run: Mock, mock_which: Mock
    ) -> None:
        """Test successful check with version info."""
        mock_which.return_value = "/usr/local/bin/npx"
        mock_run.return_value = Mock(
            returncode=0, stdout="1.2.3\n", stderr=""
        )

        result = ca.check_auggie_availability()

        assert result.available is True
        assert result.message == "auggie ready"
        mock_which.assert_called_once_with("npx")

    @patch("coder_auggie.shutil.which")
    def test_npx_not_installed(self, mock_which: Mock) -> None:
        """Test when npx is not installed."""
        mock_which.return_value = None

        result = ca.check_auggie_availability()

        assert result.available is False
        assert "npx is not installed" in result.message
        assert result.version is None

    @patch("coder_auggie.shutil.which")
    @patch("coder_auggie.subprocess.run")
    def test_auggie_timeout(self, mock_run: Mock, mock_which: Mock) -> None:
        """Test when Auggie MCP times out."""
        mock_which.return_value = "/usr/local/bin/npx"
        mock_run.side_effect = subprocess.TimeoutExpired(
            cmd=["npx", "@anthropics/auggie", "--version"], timeout=30
        )

        result = ca.check_auggie_availability()

        assert result.available is False
        assert "timeout" in result.message.lower()


class TestCmdCheck:
    """Tests for cmd_check function."""

    @patch("coder_auggie.check_auggie_availability")
    def test_check_success_without_verbose(
        self, mock_check: Mock, capsys: pytest.CaptureFixture[str]
    ) -> None:
        """Test successful check without verbose flag."""
        mock_check.return_value = ca.CheckResult(
            available=True, message="auggie ready", version="1.2.3"
        )
        args = Namespace(verbose=False)

        exit_code = ca.cmd_check(args)

        assert exit_code == 0
        captured = capsys.readouterr()
        assert "auggie ready" in captured.out

    @patch("coder_auggie.check_auggie_availability")
    def test_check_failure(
        self, mock_check: Mock, capsys: pytest.CaptureFixture[str]
    ) -> None:
        """Test check failure."""
        mock_check.return_value = ca.CheckResult(
            available=False, message="ERROR: Not installed"
        )
        args = Namespace(verbose=False)

        exit_code = ca.cmd_check(args)

        assert exit_code == 1
        captured = capsys.readouterr()
        assert "ERROR: Not installed" in captured.err
