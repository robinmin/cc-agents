"""Tests for generate command in coder-claude.py."""
from __future__ import annotations

from pathlib import Path
from unittest.mock import Mock, patch


import coder_claude as cc


class TestSanitizeFilename:
    """Tests for sanitize_filename function."""

    def test_simple_string(self) -> None:
        """Test simple string sanitization."""
        assert cc.sanitize_filename("hello world") == "hello-world"

    def test_special_characters(self) -> None:
        """Test special character removal."""
        assert cc.sanitize_filename("hello@world!") == "hello-world"

    def test_consecutive_hyphens(self) -> None:
        """Test consecutive hyphen removal."""
        assert cc.sanitize_filename("hello   world") == "hello-world"

    def test_length_limit(self) -> None:
        """Test length limiting."""
        long_string = "a" * 100
        result = cc.sanitize_filename(long_string)
        assert len(result) <= 50

    def test_leading_trailing_hyphens(self) -> None:
        """Test leading/trailing hyphen removal."""
        assert cc.sanitize_filename("--hello--") == "hello"


class TestBuildTaskPrompt:
    """Tests for build_task_prompt function."""

    def test_basic_prompt(self) -> None:
        """Test basic prompt generation."""
        prompt = cc.build_task_prompt("Create a hello world function")
        assert "Create a hello world function" in prompt
        assert "Task Specification" in prompt

    def test_tdd_mode(self) -> None:
        """Test TDD mode instructions."""
        prompt = cc.build_task_prompt(
            "Create a function",
            tdd=True
        )
        assert "Test-Driven Development" in prompt
        assert "test" in prompt.lower()

    def test_context_inclusion(self) -> None:
        """Test context inclusion."""
        prompt = cc.build_task_prompt(
            "Create a function",
            context="This is for a web application"
        )
        assert "web application" in prompt


class TestGenerateCode:
    """Tests for generate_code function."""

    @patch("coder_claude.run_claude_file")
    @patch("coder_claude.ensure_plans_dir")
    def test_successful_generation(
        self, mock_ensure: Mock, mock_run: Mock, mock_plans_dir: Path
    ) -> None:
        """Test successful code generation."""
        mock_ensure.return_value = mock_plans_dir
        mock_run.return_value = Mock(
            success=True,
            output="Generated code here"
        )

        result = cc.generate_code(
            task_content="Create a hello function",
            output="test-output"
        )

        assert result.success
        assert result.output_path is not None

    @patch("coder_claude.run_claude_file")
    def test_failed_generation(self, mock_run: Mock) -> None:
        """Test failed code generation."""
        mock_run.return_value = Mock(
            success=False,
            output="",
            error="CLI error"
        )

        result = cc.generate_code(task_content="Create a function")

        assert not result.success
        assert "failed" in result.message.lower()

    def test_methodology_included(self) -> None:
        """Test that methodology is included in prompt."""
        assert "Correctness" in cc.METHODOLOGY
        assert "Simplicity" in cc.METHODOLOGY
        assert "Testability" in cc.METHODOLOGY


class TestCheckClaudeAvailability:
    """Tests for check_claude_availability function."""

    @patch("shutil.which")
    def test_claude_not_found(self, mock_which: Mock) -> None:
        """Test when Claude CLI is not found."""
        mock_which.return_value = None
        result = cc.check_claude_availability()
        assert not result.available
        assert "not installed" in result.message.lower()

    @patch("subprocess.run")
    @patch("shutil.which")
    def test_claude_available(self, mock_which: Mock, mock_run: Mock) -> None:
        """Test when Claude CLI is available."""
        mock_which.return_value = "/usr/bin/claude"
        mock_run.return_value = Mock(
            returncode=0,
            stdout="claude version 1.0.0",
            stderr=""
        )
        result = cc.check_claude_availability()
        assert result.available
        assert "ready" in result.message.lower()


class TestRunClaudePrompt:
    """Tests for run_claude_prompt function."""

    @patch("subprocess.run")
    def test_successful_prompt(self, mock_run: Mock) -> None:
        """Test successful prompt execution."""
        mock_run.return_value = Mock(
            returncode=0,
            stdout="Response here",
            stderr=""
        )
        result = cc.run_claude_prompt("test prompt")
        assert result.success
        assert "Response here" in result.output

    @patch("subprocess.run")
    def test_failed_prompt(self, mock_run: Mock) -> None:
        """Test failed prompt execution."""
        mock_run.return_value = Mock(
            returncode=1,
            stdout="",
            stderr="Error occurred"
        )
        result = cc.run_claude_prompt("test prompt")
        assert not result.success
        assert result.error == "Error occurred"


class TestRunClaudeFile:
    """Tests for run_claude_file function."""

    def test_file_not_found(self) -> None:
        """Test when prompt file doesn't exist."""
        result = cc.run_claude_file(Path("/nonexistent/file.txt"))
        assert not result.success
        assert "not found" in result.error.lower()

    @patch("coder_claude.run_claude_prompt")
    def test_successful_file_run(self, mock_prompt: Mock) -> None:
        """Test successful file-based prompt."""
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as f:
            f.write("test prompt from file")
            temp_path = Path(f.name)

        try:
            mock_prompt.return_value = Mock(
                success=True,
                output="Response from file"
            )
            result = cc.run_claude_file(temp_path)
            assert result.success
            assert "Response from file" in result.output
        finally:
            temp_path.unlink()
