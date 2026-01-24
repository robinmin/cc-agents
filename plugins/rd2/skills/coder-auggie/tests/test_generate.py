"""Tests for generate command in coder-auggie.py."""
from __future__ import annotations

from pathlib import Path
from unittest.mock import Mock, patch


import coder_auggie as ca


class TestSanitizeFilename:
    """Tests for sanitize_filename function."""

    def test_simple_string(self) -> None:
        """Test simple string sanitization."""
        assert ca.sanitize_filename("hello world") == "hello-world"

    def test_special_characters(self) -> None:
        """Test special character removal."""
        assert ca.sanitize_filename("hello@world!") == "hello-world"

    def test_consecutive_hyphens(self) -> None:
        """Test consecutive hyphen removal."""
        assert ca.sanitize_filename("hello   world") == "hello-world"

    def test_length_limit(self) -> None:
        """Test length limiting."""
        long_string = "a" * 100
        result = ca.sanitize_filename(long_string)
        assert len(result) <= 50

    def test_leading_trailing_hyphens(self) -> None:
        """Test leading/trailing hyphen removal."""
        assert ca.sanitize_filename("--hello--") == "hello"


class TestBuildTaskPrompt:
    """Tests for build_task_prompt function."""

    def test_basic_prompt(self) -> None:
        """Test basic prompt generation."""
        prompt = ca.build_task_prompt("Create a hello world function")
        assert "Create a hello world function" in prompt
        assert "Task Specification" in prompt

    def test_tdd_mode(self) -> None:
        """Test TDD mode instructions."""
        prompt = ca.build_task_prompt(
            "Create a function",
            tdd=True
        )
        assert "Test-Driven Development" in prompt
        assert "test" in prompt.lower()

    def test_context_inclusion(self) -> None:
        """Test context inclusion."""
        prompt = ca.build_task_prompt(
            "Create a function",
            context="This is for a web application"
        )
        assert "web application" in prompt

    def test_codebase_aware_instructions(self) -> None:
        """Test codebase-aware specific instructions."""
        prompt = ca.build_task_prompt("Create a function")
        assert "semantic understanding" in prompt.lower()


class TestGenerateCode:
    """Tests for generate_code function."""

    @patch("coder_auggie.run_auggie_file")
    @patch("coder_auggie.ensure_plans_dir")
    def test_successful_generation(
        self, mock_ensure: Mock, mock_run: Mock, mock_plans_dir: Path
    ) -> None:
        """Test successful code generation."""
        mock_ensure.return_value = mock_plans_dir
        mock_run.return_value = Mock(
            success=True,
            output="Generated code here",
            context_used=["file1.py", "file2.py"]
        )

        result = ca.generate_code(
            task_content="Create a hello function",
            output="test-output"
        )

        assert result.success
        assert result.output_path is not None
        assert result.context_files == ["file1.py", "file2.py"]

    @patch("coder_auggie.run_auggie_file")
    def test_failed_generation(self, mock_run: Mock) -> None:
        """Test failed code generation."""
        mock_run.return_value = Mock(
            success=False,
            output="",
            error="MCP error"
        )

        result = ca.generate_code(task_content="Create a function")

        assert not result.success
        assert "failed" in result.message.lower()

    def test_methodology_included(self) -> None:
        """Test that methodology is included in prompt."""
        assert "Correctness" in ca.METHODOLOGY
        assert "Simplicity" in ca.METHODOLOGY
        assert "Testability" in ca.METHODOLOGY


class TestCheckAuggieAvailability:
    """Tests for check_auggie_availability function."""

    @patch("shutil.which")
    def test_npx_not_found(self, mock_which: Mock) -> None:
        """Test when npx is not found."""
        mock_which.return_value = None
        result = ca.check_auggie_availability()
        assert not result.available
        assert "npx" in result.message.lower()

    @patch("subprocess.run")
    @patch("shutil.which")
    def test_auggie_available(self, mock_which: Mock, mock_run: Mock) -> None:
        """Test when Auggie MCP is available."""
        mock_which.return_value = "/usr/bin/npx"
        mock_run.return_value = Mock(
            returncode=0,
            stdout="auggie version 1.0",
            stderr=""
        )
        result = ca.check_auggie_availability()
        assert result.available
        assert "ready" in result.message.lower()


class TestRunAuggiePrompt:
    """Tests for run_auggie_prompt function."""

    @patch("subprocess.run")
    def test_successful_prompt(self, mock_run: Mock) -> None:
        """Test successful prompt execution."""
        mock_run.return_value = Mock(
            returncode=0,
            stdout="Response here",
            stderr=""
        )
        result = ca.run_auggie_prompt("test prompt")
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
        result = ca.run_auggie_prompt("test prompt")
        assert not result.success
        assert result.error == "Error occurred"


class TestRunAuggieFile:
    """Tests for run_auggie_file function."""

    def test_file_not_found(self) -> None:
        """Test when prompt file doesn't exist."""
        result = ca.run_auggie_file(Path("/nonexistent/file.txt"))
        assert not result.success
        assert "not found" in result.error.lower()

    @patch("coder_auggie.run_auggie_prompt")
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
            result = ca.run_auggie_file(temp_path)
            assert result.success
            assert "Response from file" in result.output
        finally:
            temp_path.unlink()
