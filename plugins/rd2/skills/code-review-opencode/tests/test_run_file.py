"""Tests for run-file command in code-review-opencode.py."""
from __future__ import annotations

import subprocess
from argparse import Namespace
from pathlib import Path
from unittest.mock import Mock, patch

import pytest

import code_review_opencode as cro


class TestRunOpenCodeFromFile:
    """Tests for run_opencode_from_file function."""

    def test_successful_execution_from_file(self, tmp_path: Path) -> None:
        """Test successful execution from a file."""
        # Create a temporary prompt file
        prompt_file = tmp_path / "prompt.txt"
        prompt_file.write_text("Explain this code in detail")

        with patch("code_review_opencode.subprocess.run") as mock_run:
            mock_run.return_value = Mock(
                returncode=0, stdout="Response from OpenCode", stderr=""
            )

            result = cro.run_opencode_from_file(prompt_file)

            assert result.success is True
            assert result.output == "Response from OpenCode"
            assert result.error is None

    def test_nonexistent_file(self, tmp_path: Path) -> None:
        """Test with a nonexistent file."""
        nonexistent_file = tmp_path / "does_not_exist.txt"

        result = cro.run_opencode_from_file(nonexistent_file)

        assert result.success is False
        assert "not found" in result.error.lower()

    def test_saves_to_output_file(self, tmp_path: Path) -> None:
        """Test saving output to a file."""
        prompt_file = tmp_path / "prompt.txt"
        prompt_file.write_text("Test prompt")
        output_file = tmp_path / "output.txt"

        with patch("code_review_opencode.subprocess.run") as mock_run:
            mock_run.return_value = Mock(
                returncode=0, stdout="Response", stderr=""
            )

            result = cro.run_opencode_from_file(
                prompt_file, output_file=output_file
            )

            assert result.success is True
            assert output_file.exists()
            assert output_file.read_text() == "Response"

    @patch("code_review_opencode.subprocess.run")
    def test_timeout(self, mock_run: Mock, tmp_path: Path) -> None:
        """Test timeout handling."""
        prompt_file = tmp_path / "prompt.txt"
        prompt_file.write_text("Long prompt")

        mock_run.side_effect = subprocess.TimeoutExpired(
            cmd=["opencode", "run", "prompt"], timeout=600
        )

        result = cro.run_opencode_from_file(prompt_file)

        assert result.success is False
        assert "timeout" in result.error.lower()

    @patch("code_review_opencode.subprocess.run")
    def test_custom_timeout(self, mock_run: Mock, tmp_path: Path) -> None:
        """Test custom timeout parameter."""
        prompt_file = tmp_path / "prompt.txt"
        prompt_file.write_text("Prompt")
        mock_run.return_value = Mock(returncode=0, stdout="Response")

        cro.run_opencode_from_file(prompt_file, timeout=900)

        # Check that the timeout was passed correctly
        call_args = mock_run.call_args
        assert call_args.kwargs["timeout"] == 900


class TestCmdRunFile:
    """Tests for cmd_run_file function."""

    @patch("code_review_opencode.run_opencode_from_file")
    @patch("code_review_opencode.check_opencode_availability")
    def test_successful_run_file(
        self,
        mock_check: Mock,
        mock_run: Mock,
        tmp_path: Path,
        capsys: pytest.CaptureFixture[str],
    ) -> None:
        """Test successful run-file command."""
        prompt_file = tmp_path / "prompt.txt"
        prompt_file.write_text("Test prompt")

        mock_check.return_value = cro.CheckResult(
            available=True, message="opencode ready"
        )
        mock_run.return_value = cro.RunResult(
            success=True, output="AI Response"
        )
        args = Namespace(
            prompt_file=str(prompt_file), output=None, timeout=None
        )

        exit_code = cro.cmd_run_file(args)

        assert exit_code == 0
        captured = capsys.readouterr()
        assert "AI Response" in captured.out

    @patch("code_review_opencode.run_opencode_from_file")
    @patch("code_review_opencode.check_opencode_availability")
    def test_run_file_with_output(
        self,
        mock_check: Mock,
        mock_run: Mock,
        tmp_path: Path,
        capsys: pytest.CaptureFixture[str],
    ) -> None:
        """Test run-file with output file."""
        prompt_file = tmp_path / "prompt.txt"
        prompt_file.write_text("Test prompt")
        output_file = tmp_path / "output.txt"

        mock_check.return_value = cro.CheckResult(
            available=True, message="opencode ready"
        )
        mock_run.return_value = cro.RunResult(
            success=True, output="AI Response"
        )
        args = Namespace(
            prompt_file=str(prompt_file),
            output=str(output_file),
            timeout=None,
        )

        exit_code = cro.cmd_run_file(args)

        assert exit_code == 0
        captured = capsys.readouterr()
        assert "Output saved to:" in captured.out
        assert str(output_file) in captured.out

    @patch("code_review_opencode.check_opencode_availability")
    def test_run_file_when_opencode_not_available(
        self,
        mock_check: Mock,
        tmp_path: Path,
        capsys: pytest.CaptureFixture[str],
    ) -> None:
        """Test run-file when OpenCode is not available."""
        prompt_file = tmp_path / "prompt.txt"
        prompt_file.write_text("Test prompt")

        mock_check.return_value = cro.CheckResult(
            available=False, message="ERROR: Not installed"
        )
        args = Namespace(
            prompt_file=str(prompt_file), output=None, timeout=None
        )

        exit_code = cro.cmd_run_file(args)

        assert exit_code == 1
        captured = capsys.readouterr()
        assert "ERROR: Not installed" in captured.err
