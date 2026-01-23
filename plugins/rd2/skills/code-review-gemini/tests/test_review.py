"""Tests for review command in code-review-gemini.py."""
from __future__ import annotations

from argparse import Namespace
from pathlib import Path
from unittest.mock import Mock, patch

import pytest

import code_review_gemini as crg


class TestSaveToPlan:
    """Tests for save_to_plan function."""

    def test_saves_content_to_plan_file(
        self, mock_plans_dir: Path
    ) -> None:
        """Test saving content to plan file."""
        content = "# Review\nThis is the review content"
        plan_name = "test-review"

        plan_path = crg.save_to_plan(content, plan_name)

        assert plan_path.exists()
        assert plan_path.name == "test-review.md"
        content_written = plan_path.read_text()
        assert "# Review" in content_written
        assert "review content" in content_written

    def test_sanitizes_plan_name(self, mock_plans_dir: Path) -> None:
        """Test plan name sanitization."""
        content = "Content"
        plan_name = "test plan@#$%with/invalid\\chars"

        plan_path = crg.save_to_plan(content, plan_name)

        # Check that special characters are replaced with hyphens
        assert plan_path.suffix == ".md"
        assert all(c.isalnum() or c in "-_." for c in plan_path.name)

    def test_adds_md_extension(self, mock_plans_dir: Path) -> None:
        """Test adding .md extension."""
        content = "Content"
        plan_name = "no-extension"

        plan_path = crg.save_to_plan(content, plan_name)

        assert plan_path.suffix == ".md"

    def test_preserves_md_extension(self, mock_plans_dir: Path) -> None:
        """Test preserving existing .md extension."""
        content = "Content"
        plan_name = "with-extension.md"

        plan_path = crg.save_to_plan(content, plan_name)

        # Should have .md extension without doubling
        assert plan_path.suffix == ".md"
        # Count occurrences - should be exactly 1
        assert str(plan_path).count(".md") == 1


class TestBuildReviewPrompt:
    """Tests for build_review_prompt function."""

    def test_build_review_mode_prompt(self, sample_code: str) -> None:
        """Test building a review mode prompt."""
        prompt = crg.build_review_prompt(
            target="test.py",
            code_content=sample_code,
            mode="review",
        )

        assert "test.py" in prompt
        assert sample_code in prompt
        assert "review" in prompt.lower()
        assert "bug" in prompt.lower()
        assert "security" in prompt.lower()

    def test_build_planning_mode_prompt(self, sample_code: str) -> None:
        """Test building a planning mode prompt."""
        prompt = crg.build_review_prompt(
            target="feature",
            code_content=sample_code,
            mode="planning",
        )

        assert "feature" in prompt
        assert sample_code in prompt
        assert "architect" in prompt.lower()
        assert "implementation" in prompt.lower()

    def test_build_prompt_with_focus_areas(
        self, sample_code: str
    ) -> None:
        """Test building prompt with focus areas."""
        focus_areas = ["security", "performance"]

        prompt = crg.build_review_prompt(
            target="test.py",
            code_content=sample_code,
            mode="review",
            focus_areas=focus_areas,
        )

        assert "security" in prompt.lower()
        assert "performance" in prompt.lower()

    @patch("code_review_gemini.load_prompt_template")
    def test_uses_template_when_available(
        self, mock_load: Mock, sample_code: str
    ) -> None:
        """Test using template when available."""
        mock_load.return_value = "Template: {{TARGET}} {{CODE_CONTENT}}"

        prompt = crg.build_review_prompt(
            target="test.py", code_content=sample_code, mode="review"
        )

        assert "Template:" in prompt
        assert "test.py" in prompt
        mock_load.assert_called_once_with("review_prompt")

    @patch("code_review_gemini.load_prompt_template")
    def test_uses_fallback_when_no_template(
        self, mock_load: Mock, sample_code: str
    ) -> None:
        """Test using fallback when template not available."""
        mock_load.return_value = None

        prompt = crg.build_review_prompt(
            target="test.py", code_content=sample_code, mode="review"
        )

        assert "test.py" in prompt
        assert sample_code in prompt
        mock_load.assert_called_once()


class TestGatherCodeContent:
    """Tests for gather_code_content function."""

    def test_gather_from_single_file(self, temp_dir: Path) -> None:
        """Test gathering content from a single file."""
        test_file = temp_dir / "test.py"
        test_file.write_text("def test():\n    pass")

        content, files = crg.gather_code_content(str(test_file))

        assert len(files) == 1
        assert files[0] == test_file
        assert "def test():" in content
        assert str(test_file) in content

    def test_gather_from_directory(self, temp_dir: Path) -> None:
        """Test gathering content from a directory."""
        # Create test files
        (temp_dir / "test1.py").write_text("def func1(): pass")
        (temp_dir / "test2.py").write_text("def func2(): pass")
        (temp_dir / "readme.txt").write_text("Not included")

        content, files = crg.gather_code_content(str(temp_dir))

        assert len(files) == 2
        assert "def func1():" in content
        assert "def func2():" in content
        assert "Not included" not in content

    def test_gather_handles_read_errors(self, temp_dir: Path) -> None:
        """Test handling file read errors gracefully."""
        test_file = temp_dir / "test.py"
        test_file.write_text("content")

        # Mock read_text to raise an exception
        with patch.object(Path, "read_text", side_effect=IOError("Error")):
            content, files = crg.gather_code_content(str(test_file))

            assert "Error reading file" in content

    def test_limits_number_of_files(self, temp_dir: Path) -> None:
        """Test limiting the number of files."""
        # Create more than 50 files
        for i in range(60):
            (temp_dir / f"test{i}.py").write_text(f"def func{i}(): pass")

        content, files = crg.gather_code_content(str(temp_dir))

        assert len(files) <= 50


class TestCmdReview:
    """Tests for cmd_review function."""

    @patch("code_review_gemini.check_gemini_availability")
    @patch("code_review_gemini.gather_code_content")
    @patch("code_review_gemini.run_gemini_from_file")
    @patch("code_review_gemini.save_to_plan")
    def test_review_success(
        self,
        mock_save: Mock,
        mock_run: Mock,
        mock_gather: Mock,
        mock_check: Mock,
        tmp_path: Path,
        mock_plans_dir: Path,
        capsys: pytest.CaptureFixture[str],
    ) -> None:
        """Test successful review command."""
        mock_check.return_value = crg.CheckResult(
            available=True, message="ready"
        )
        mock_gather.return_value = (
            "Code content",
            [tmp_path / "test.py"],
        )
        mock_run.return_value = crg.RunResult(
            success=True, output="Review output", model="gemini-2.5-pro"
        )
        plan_path = mock_plans_dir / "review-test.md"
        mock_save.return_value = plan_path

        args = Namespace(
            target="test.py",
            model="gemini-2.5-pro",
            plan=False,
            output=None,
            focus=None,
            timeout=None,
        )

        exit_code = crg.cmd_review(args)

        assert exit_code == 0
        captured = capsys.readouterr()
        # New format includes structured output
        assert "Code Review Result" in captured.out or "Review output" in captured.out
        assert "Review saved to" in captured.err

    @patch("code_review_gemini.check_gemini_availability")
    def test_review_gemini_not_available(
        self, mock_check: Mock, capsys: pytest.CaptureFixture[str]
    ) -> None:
        """Test review when Gemini is not available."""
        mock_check.return_value = crg.CheckResult(
            available=False, message="Not installed"
        )
        args = Namespace(
            target="test.py",
            model="gemini-2.5-pro",
            plan=False,
            output=None,
            focus=None,
            timeout=None,
        )

        exit_code = crg.cmd_review(args)

        assert exit_code == 1
        captured = capsys.readouterr()
        assert "Not installed" in captured.err

    @patch("code_review_gemini.check_gemini_availability")
    @patch("code_review_gemini.gather_code_content")
    def test_review_no_files_found(
        self,
        mock_gather: Mock,
        mock_check: Mock,
        capsys: pytest.CaptureFixture[str],
    ) -> None:
        """Test review when no files are found."""
        mock_check.return_value = crg.CheckResult(
            available=True, message="ready"
        )
        mock_gather.return_value = ("", [])
        args = Namespace(
            target="nonexistent.py",
            model="gemini-2.5-pro",
            plan=False,
            output=None,
            focus=None,
            timeout=None,
        )

        exit_code = crg.cmd_review(args)

        assert exit_code == 1
        captured = capsys.readouterr()
        assert "No files found" in captured.err

    @patch("code_review_gemini.check_gemini_availability")
    @patch("code_review_gemini.gather_code_content")
    @patch("code_review_gemini.run_gemini_from_file")
    @patch("code_review_gemini.build_review_prompt")
    def test_review_planning_mode(
        self,
        mock_build_prompt: Mock,
        mock_run: Mock,
        mock_gather: Mock,
        mock_check: Mock,
        tmp_path: Path,
    ) -> None:
        """Test review in planning mode."""
        mock_check.return_value = crg.CheckResult(
            available=True, message="ready"
        )
        mock_gather.return_value = (
            "Code content",
            [tmp_path / "test.py"],
        )
        mock_run.return_value = crg.RunResult(
            success=True, output="Plan output", model="gemini-2.5-pro"
        )
        mock_build_prompt.return_value = "Prompt with architect keyword"

        args = Namespace(
            target="test.py",
            model="gemini-2.5-pro",
            plan=True,  # Planning mode
            output="custom-plan",
            focus=None,
            timeout=None,
        )

        exit_code = crg.cmd_review(args)

        assert exit_code == 0
        # Verify build_review_prompt was called with planning mode
        mock_build_prompt.assert_called_once()
        call_kwargs = mock_build_prompt.call_args[1]
        assert call_kwargs["mode"] == "planning"

    @patch("code_review_gemini.check_gemini_availability")
    @patch("code_review_gemini.gather_code_content")
    @patch("code_review_gemini.run_gemini_from_file")
    @patch("code_review_gemini.build_review_prompt")
    def test_review_with_focus_areas(
        self,
        mock_build_prompt: Mock,
        mock_run: Mock,
        mock_gather: Mock,
        mock_check: Mock,
        tmp_path: Path,
    ) -> None:
        """Test review with specific focus areas."""
        mock_check.return_value = crg.CheckResult(
            available=True, message="ready"
        )
        mock_gather.return_value = (
            "Code",
            [tmp_path / "test.py"],
        )
        mock_run.return_value = crg.RunResult(
            success=True, output="Review", model="gemini-2.5-pro"
        )
        mock_build_prompt.return_value = "Prompt with security and performance"

        args = Namespace(
            target="test.py",
            model="gemini-2.5-pro",
            plan=False,
            output=None,
            focus="security,performance",
            timeout=None,
        )

        exit_code = crg.cmd_review(args)

        assert exit_code == 0
        # Verify build_review_prompt was called with focus areas
        mock_build_prompt.assert_called_once()
        call_kwargs = mock_build_prompt.call_args[1]
        assert call_kwargs["focus_areas"] == ["security", "performance"]

    @patch("code_review_gemini.check_gemini_availability")
    @patch("code_review_gemini.gather_code_content")
    @patch("code_review_gemini.run_gemini_from_file")
    def test_review_adjusts_timeout_based_on_file_count(
        self,
        mock_run: Mock,
        mock_gather: Mock,
        mock_check: Mock,
        tmp_path: Path,
    ) -> None:
        """Test that timeout is adjusted based on number of files."""
        mock_check.return_value = crg.CheckResult(
            available=True, message="ready"
        )
        # More than 10 files should use TIMEOUT_COMPLEX
        many_files = [tmp_path / f"test{i}.py" for i in range(15)]
        mock_gather.return_value = ("Code", many_files)
        mock_run.return_value = crg.RunResult(
            success=True, output="Review", model="gemini-2.5-pro"
        )

        args = Namespace(
            target="src/",
            model="gemini-2.5-pro",
            plan=False,
            output=None,
            focus=None,
            timeout=None,
        )

        exit_code = crg.cmd_review(args)

        assert exit_code == 0
        # Verify TIMEOUT_COMPLEX was used
        call_args = mock_run.call_args
        assert call_args[1]["timeout"] == crg.TIMEOUT_COMPLEX
