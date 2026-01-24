"""Tests for generate command in coder-opencode.py."""
from __future__ import annotations

from pathlib import Path
from unittest.mock import Mock, patch


import coder_opencode as co


class TestSanitizeFilename:
    """Tests for sanitize_filename function."""

    def test_simple_string(self) -> None:
        """Test simple string sanitization."""
        assert co.sanitize_filename("hello world") == "hello-world"

    def test_special_characters(self) -> None:
        """Test special character removal."""
        assert co.sanitize_filename("hello@world!") == "hello-world"

    def test_consecutive_hyphens(self) -> None:
        """Test consecutive hyphen removal."""
        assert co.sanitize_filename("hello   world") == "hello-world"

    def test_length_limit(self) -> None:
        """Test length limiting."""
        long_string = "a" * 100
        result = co.sanitize_filename(long_string)
        assert len(result) <= 50

    def test_leading_trailing_hyphens(self) -> None:
        """Test leading/trailing hyphen removal."""
        assert co.sanitize_filename("--hello--") == "hello"


class TestBuildTaskPrompt:
    """Tests for build_task_prompt function."""

    def test_basic_prompt(self) -> None:
        """Test basic prompt generation."""
        prompt = co.build_task_prompt("Create a hello world function")
        assert "Create a hello world function" in prompt
        assert "Task Specification" in prompt

    def test_tdd_mode(self) -> None:
        """Test TDD mode instructions."""
        prompt = co.build_task_prompt(
            "Create a function",
            tdd=True
        )
        assert "Test-Driven Development" in prompt
        assert "test" in prompt.lower()

    def test_context_inclusion(self) -> None:
        """Test context inclusion."""
        prompt = co.build_task_prompt(
            "Create a function",
            context="This is for a web application"
        )
        assert "web application" in prompt


class TestGenerateCode:
    """Tests for generate_code function."""

    @patch("coder_opencode.run_opencode_file")
    @patch("coder_opencode.ensure_plans_dir")
    def test_successful_generation(
        self, mock_ensure: Mock, mock_run: Mock, mock_plans_dir: Path
    ) -> None:
        """Test successful code generation."""
        mock_ensure.return_value = mock_plans_dir
        mock_run.return_value = Mock(
            success=True,
            output="Generated code here",
            model="gpt-4o"
        )

        result = co.generate_code(
            task_content="Create a hello function",
            output="test-output"
        )

        assert result.success
        assert result.output_path is not None

    @patch("coder_opencode.run_opencode_file")
    def test_failed_generation(self, mock_run: Mock) -> None:
        """Test failed code generation."""
        mock_run.return_value = Mock(
            success=False,
            output="",
            error="CLI error"
        )

        result = co.generate_code(task_content="Create a function")

        assert not result.success
        assert "failed" in result.message.lower()

    @patch("coder_opencode.run_opencode_file")
    @patch("coder_opencode.ensure_plans_dir")
    def test_with_model_specified(
        self, mock_ensure: Mock, mock_run: Mock, mock_plans_dir: Path
    ) -> None:
        """Test code generation with specific model."""
        mock_ensure.return_value = mock_plans_dir
        mock_run.return_value = Mock(
            success=True,
            output="Generated code here",
            model="claude-3-opus"
        )

        result = co.generate_code(
            task_content="Create a function",
            model="claude-3-opus"
        )

        assert result.success
        assert result.model == "claude-3-opus"

    def test_methodology_included(self) -> None:
        """Test that methodology is included in prompt."""
        assert "Correctness" in co.METHODOLOGY
        assert "Simplicity" in co.METHODOLOGY
        assert "Testability" in co.METHODOLOGY


class TestCheckOpenCodeAvailability:
    """Tests for check_opencode_availability function."""

    @patch("shutil.which")
    def test_opencode_not_found(self, mock_which: Mock) -> None:
        """Test when OpenCode CLI is not found."""
        mock_which.return_value = None
        result = co.check_opencode_availability()
        assert not result.available
        assert "not installed" in result.message.lower()

    @patch("subprocess.run")
    @patch("shutil.which")
    def test_opencode_available(self, mock_which: Mock, mock_run: Mock) -> None:
        """Test when OpenCode CLI is available."""
        mock_which.return_value = "/usr/bin/opencode"
        mock_run.return_value = Mock(
            returncode=0,
            stdout="opencode version 2.0.0",
            stderr=""
        )
        result = co.check_opencode_availability()
        assert result.available
        assert "ready" in result.message.lower()


class TestRunOpenCodePrompt:
    """Tests for run_opencode_prompt function."""

    @patch("subprocess.run")
    def test_successful_prompt(self, mock_run: Mock) -> None:
        """Test successful prompt execution."""
        mock_run.return_value = Mock(
            returncode=0,
            stdout="Response here",
            stderr=""
        )
        result = co.run_opencode_prompt("test prompt")
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
        result = co.run_opencode_prompt("test prompt")
        assert not result.success
        assert result.error == "Error occurred"

    @patch("subprocess.run")
    def test_with_model(self, mock_run: Mock) -> None:
        """Test prompt execution with specific model."""
        mock_run.return_value = Mock(
            returncode=0,
            stdout="Response from model",
            stderr=""
        )
        result = co.run_opencode_prompt("test prompt", model="gpt-4o")
        assert result.success
        assert result.model == "gpt-4o"


class TestRunOpenCodeFile:
    """Tests for run_opencode_file function."""

    def test_file_not_found(self) -> None:
        """Test when prompt file doesn't exist."""
        result = co.run_opencode_file(Path("/nonexistent/file.txt"))
        assert not result.success
        assert "not found" in result.error.lower()

    @patch("coder_opencode.run_opencode_prompt")
    def test_successful_file_run(self, mock_prompt: Mock) -> None:
        """Test successful file-based prompt."""
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as f:
            f.write("test prompt from file")
            temp_path = Path(f.name)

        try:
            mock_prompt.return_value = Mock(
                success=True,
                output="Response from file",
                model="gpt-4o"
            )
            result = co.run_opencode_file(temp_path, model="gpt-4o")
            assert result.success
            assert "Response from file" in result.output
            assert result.model == "gpt-4o"
        finally:
            temp_path.unlink()
