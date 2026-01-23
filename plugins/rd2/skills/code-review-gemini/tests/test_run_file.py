"""Tests for run-file command in code-review-gemini.py."""
from __future__ import annotations

import subprocess
from argparse import Namespace
from pathlib import Path
from unittest.mock import Mock, patch

import pytest

import code_review_gemini as crg


class TestRunGeminiFromFile:
    """Tests for run_gemini_from_file function."""

    @patch("code_review_gemini.subprocess.run")
    def test_successful_run_from_file(
        self, mock_run: Mock, temp_file: Path
    ) -> None:
        """Test successful execution from file."""
        temp_file.write_text("Long prompt content")
        mock_run.return_value = Mock(
            returncode=0, stdout="Gemini response", stderr=""
        )

        result = crg.run_gemini_from_file(
            prompt_file=temp_file, model="gemini-2.5-pro"
        )

        assert result.success is True
        assert result.output == "Gemini response"
        assert result.model == "gemini-2.5-pro"
        mock_run.assert_called_once()

    @patch("code_review_gemini.subprocess.run")
    def test_run_from_file_with_output_file(
        self, mock_run: Mock, temp_file: Path, tmp_path: Path
    ) -> None:
        """Test execution with output file."""
        temp_file.write_text("Prompt content")
        output_file = tmp_path / "output.txt"
        mock_run.return_value = Mock(
            returncode=0, stdout="Response", stderr=""
        )

        result = crg.run_gemini_from_file(
            prompt_file=temp_file,
            model="gemini-2.5-flash",
            output_file=output_file,
        )

        assert result.success is True
        assert output_file.exists()
        assert output_file.read_text() == "Response"

    def test_run_from_missing_file(self, tmp_path: Path) -> None:
        """Test execution with missing file."""
        missing_file = tmp_path / "missing.txt"

        result = crg.run_gemini_from_file(prompt_file=missing_file)

        assert result.success is False
        assert "not found" in result.error.lower()

    @patch("code_review_gemini.subprocess.run")
    def test_run_from_file_failure(
        self, mock_run: Mock, temp_file: Path
    ) -> None:
        """Test execution failure."""
        temp_file.write_text("Prompt")
        mock_run.return_value = Mock(
            returncode=1, stdout="", stderr="Error occurred"
        )

        result = crg.run_gemini_from_file(prompt_file=temp_file)

        assert result.success is False
        assert result.error == "Error occurred"

    @patch("code_review_gemini.subprocess.run")
    def test_run_from_file_timeout(
        self, mock_run: Mock, temp_file: Path
    ) -> None:
        """Test execution timeout."""
        temp_file.write_text("Prompt")
        mock_run.side_effect = subprocess.TimeoutExpired(
            cmd=["gemini"], timeout=600
        )

        result = crg.run_gemini_from_file(
            prompt_file=temp_file, timeout=600
        )

        assert result.success is False
        assert "timed out" in result.error.lower()

    @patch("code_review_gemini.subprocess.run")
    def test_run_from_file_exception(
        self, mock_run: Mock, temp_file: Path
    ) -> None:
        """Test unexpected exception."""
        temp_file.write_text("Prompt")
        mock_run.side_effect = Exception("Unexpected error")

        result = crg.run_gemini_from_file(prompt_file=temp_file)

        assert result.success is False
        assert result.error == "Unexpected error"


class TestCmdRunFile:
    """Tests for cmd_run_file function."""

    @patch("code_review_gemini.check_gemini_availability")
    @patch("code_review_gemini.run_gemini_from_file")
    def test_run_file_success(
        self,
        mock_run: Mock,
        mock_check: Mock,
        temp_file: Path,
        capsys: pytest.CaptureFixture[str],
    ) -> None:
        """Test successful run-file command."""
        temp_file.write_text("Prompt content")
        mock_check.return_value = crg.CheckResult(
            available=True, message="ready"
        )
        mock_run.return_value = crg.RunResult(
            success=True, output="Response", model="gemini-2.5-pro"
        )
        args = Namespace(
            prompt_file=str(temp_file),
            model="gemini-2.5-pro",
            output_format="text",
            output=None,
            timeout=None,
        )

        exit_code = crg.cmd_run_file(args)

        assert exit_code == 0
        captured = capsys.readouterr()
        assert "Response" in captured.out

    @patch("code_review_gemini.check_gemini_availability")
    def test_run_file_gemini_not_available(
        self, mock_check: Mock, capsys: pytest.CaptureFixture[str]
    ) -> None:
        """Test run-file when Gemini is not available."""
        mock_check.return_value = crg.CheckResult(
            available=False, message="Not installed"
        )
        args = Namespace(
            prompt_file="test.txt",
            model="gemini-2.5-pro",
            output_format="text",
            output=None,
            timeout=None,
        )

        exit_code = crg.cmd_run_file(args)

        assert exit_code == 1
        captured = capsys.readouterr()
        assert "Not installed" in captured.err

    @patch("code_review_gemini.check_gemini_availability")
    @patch("code_review_gemini.run_gemini_from_file")
    def test_run_file_with_output(
        self,
        mock_run: Mock,
        mock_check: Mock,
        temp_file: Path,
        tmp_path: Path,
        capsys: pytest.CaptureFixture[str],
    ) -> None:
        """Test run-file with output file."""
        temp_file.write_text("Prompt")
        output_file = tmp_path / "output.txt"
        mock_check.return_value = crg.CheckResult(
            available=True, message="ready"
        )
        mock_run.return_value = crg.RunResult(
            success=True, output="Response", model="gemini-2.5-flash"
        )
        args = Namespace(
            prompt_file=str(temp_file),
            model="gemini-2.5-flash",
            output_format="text",
            output=str(output_file),
            timeout=None,
        )

        exit_code = crg.cmd_run_file(args)

        assert exit_code == 0
        captured = capsys.readouterr()
        assert "Output saved to" in captured.out
        assert str(output_file) in captured.out

    @patch("code_review_gemini.check_gemini_availability")
    @patch("code_review_gemini.run_gemini_from_file")
    def test_run_file_failure(
        self,
        mock_run: Mock,
        mock_check: Mock,
        temp_file: Path,
        capsys: pytest.CaptureFixture[str],
    ) -> None:
        """Test run-file failure."""
        temp_file.write_text("Prompt")
        mock_check.return_value = crg.CheckResult(
            available=True, message="ready"
        )
        mock_run.return_value = crg.RunResult(
            success=False, output="", error="File error", model=None
        )
        args = Namespace(
            prompt_file=str(temp_file),
            model="gemini-2.5-pro",
            output_format="text",
            output=None,
            timeout=None,
        )

        exit_code = crg.cmd_run_file(args)

        assert exit_code == 1
        captured = capsys.readouterr()
        assert "File error" in captured.err
