"""Tests for generate command in coder-gemini.py."""
from __future__ import annotations

from pathlib import Path
from unittest.mock import Mock, patch


import coder_gemini as cg


class TestSanitizeFilename:
    """Tests for sanitize_filename function."""

    def test_simple_string(self) -> None:
        """Test simple string sanitization."""
        assert cg.sanitize_filename("hello world") == "hello-world"

    def test_special_characters(self) -> None:
        """Test special character removal."""
        assert cg.sanitize_filename("hello@world!") == "hello-world"

    def test_consecutive_hyphens(self) -> None:
        """Test consecutive hyphen removal."""
        assert cg.sanitize_filename("hello   world") == "hello-world"

    def test_length_limit(self) -> None:
        """Test length limiting."""
        long_string = "a" * 100
        result = cg.sanitize_filename(long_string)
        assert len(result) <= 50

    def test_leading_trailing_hyphens(self) -> None:
        """Test leading/trailing hyphen removal."""
        assert cg.sanitize_filename("--hello--") == "hello"


class TestBuildTaskPrompt:
    """Tests for build_task_prompt function."""

    def test_basic_prompt(self) -> None:
        """Test basic prompt generation."""
        prompt = cg.build_task_prompt("Create a hello world function")
        assert "Create a hello world function" in prompt
        assert "Task Specification" in prompt

    def test_tdd_mode(self) -> None:
        """Test TDD mode instructions (TDD is enabled by default)."""
        prompt = cg.build_task_prompt("Create a function")
        assert "Test-Driven Development" in prompt
        assert "test" in prompt.lower()

    def test_context_inclusion(self) -> None:
        """Test context inclusion."""
        prompt = cg.build_task_prompt(
            "Create a function",
            context="This is for a web application"
        )
        assert "web application" in prompt


class TestGenerateCode:
    """Tests for generate_code function."""

    @patch("coder_gemini.run_gemini_file")
    @patch("coder_gemini.ensure_plans_dir")
    def test_successful_generation(
        self, mock_ensure: Mock, mock_run: Mock, mock_plans_dir: Path
    ) -> None:
        """Test successful code generation."""
        mock_ensure.return_value = mock_plans_dir
        mock_run.return_value = Mock(
            success=True,
            output="Generated code here",
            model="gemini-3-flash-preview"
        )

        result = cg.generate_code(
            task_content="Create a hello function",
            output="test-output"
        )

        assert result.success
        assert result.output_path is not None

    @patch("coder_gemini.run_gemini_file")
    def test_failed_generation(self, mock_run: Mock) -> None:
        """Test failed code generation."""
        mock_run.return_value = Mock(
            success=False,
            output="",
            error="API error"
        )

        result = cg.generate_code(task_content="Create a function")

        assert not result.success
        assert "failed" in result.message.lower()

    def test_methodology_included(self) -> None:
        """Test that methodology is included in prompt."""
        assert "Correctness" in cg.METHODOLOGY
        assert "Simplicity" in cg.METHODOLOGY
        assert "Testability" in cg.METHODOLOGY
