"""
Unit tests for coder-agy.py - Antigravity Code Generation Utility.
"""

import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from unittest.mock import Mock, patch

import pytest

# Import the module under test (registered by conftest.py)
import coder_agy


###############################################################################
# TEST DATA
###############################################################################

VALID_MODES = ["agent", "ask", "edit"]
INVALID_MODE = "invalid_mode"
TEST_PROMPT = "Explain rate limiting best practices"
TEST_TASK_CONTENT = "Create a REST API endpoint for user management"
TEST_TIMEOUT = 300


###############################################################################
# RESULT TYPE TESTS
###############################################################################


class TestCheckResult:
    """Test CheckResult NamedTuple."""

    def test_check_result_creation(self):
        """Test creating CheckResult with all fields."""
        result = coder_agy.CheckResult(
            available=True,
            message="Available",
            version="1.0.0"
        )
        assert result.available is True
        assert result.message == "Available"
        assert result.version == "1.0.0"

    def test_check_result_without_version(self):
        """Test creating CheckResult without optional version."""
        result = coder_agy.CheckResult(
            available=False,
            message="Not available"
        )
        assert result.available is False
        assert result.message == "Not available"
        assert result.version is None


class TestRunResult:
    """Test RunResult NamedTuple."""

    def test_run_result_success(self):
        """Test creating successful RunResult."""
        result = coder_agy.RunResult(
            success=True,
            output="Generated code",
            mode="agent"
        )
        assert result.success is True
        assert result.output == "Generated code"
        assert result.error is None
        assert result.mode == "agent"

    def test_run_result_failure(self):
        """Test creating failed RunResult."""
        result = coder_agy.RunResult(
            success=False,
            output="",
            error="Command failed",
            mode="ask"
        )
        assert result.success is False
        assert result.output == ""
        assert result.error == "Command failed"
        assert result.mode == "ask"


class TestGenerateResult:
    """Test GenerateResult NamedTuple."""

    def test_generate_result_success(self):
        """Test creating successful GenerateResult."""
        output_path = Path("docs/plans/output.md")
        result = coder_agy.GenerateResult(
            success=True,
            output_path=output_path,
            message="Generated successfully",
            mode="agent"
        )
        assert result.success is True
        assert result.output_path == output_path
        assert result.message == "Generated successfully"
        assert result.mode == "agent"

    def test_generate_result_failure(self):
        """Test creating failed GenerateResult."""
        result = coder_agy.GenerateResult(
            success=False,
            output_path=None,
            message="Generation failed",
            mode=None
        )
        assert result.success is False
        assert result.output_path is None
        assert result.message == "Generation failed"
        assert result.mode is None


###############################################################################
# UTILITY FUNCTION TESTS
###############################################################################


class TestGenerateTempPath:
    """Test generate_temp_path function."""

    def test_generates_unique_paths(self):
        """Test that multiple calls generate different paths."""
        path1 = coder_agy.generate_temp_path()
        path2 = coder_agy.generate_temp_path()
        assert path1 != path2

    def test_uses_prefix(self):
        """Test that generated paths use the correct prefix."""
        path = coder_agy.generate_temp_path(prefix="test-prefix")
        assert path.name.startswith("test-prefix-")

    def test_creates_txt_extension(self):
        """Test that generated paths have .txt extension."""
        path = coder_agy.generate_temp_path()
        assert path.suffix == ".txt"

    def test_uses_temp_directory(self):
        """Test that paths are created in temp directory."""
        path = coder_agy.generate_temp_path()
        assert path.parent == Path(tempfile.gettempdir())


class TestEnsurePlansDir:
    """Test ensure_plans_dir function."""

    def test_creates_directory_if_not_exists(self, tmp_path):
        """Test that directory is created when it doesn't exist."""
        with patch.object(coder_agy, "PLANS_DIR", tmp_path / "new_plans"):
            result = coder_agy.ensure_plans_dir()
            assert result.exists()
            assert result.is_dir()

    def test_returns_existing_directory(self, tmp_path):
        """Test that existing directory is returned."""
        existing_dir = tmp_path / "plans"
        existing_dir.mkdir()
        with patch.object(coder_agy, "PLANS_DIR", existing_dir):
            result = coder_agy.ensure_plans_dir()
            assert result == existing_dir


class TestGetScriptDir:
    """Test get_script_dir function."""

    def test_returns_scripts_directory(self):
        """Test that script directory is returned."""
        result = coder_agy.get_script_dir()
        assert result.is_dir()
        assert (result / "coder-agy.py").exists()


class TestSanitizeFilename:
    """Test sanitize_filename function."""

    @pytest.mark.parametrize(
        "input_name,expected",
        [
            ("Simple Name", "simple-name"),
            ("Complex!!Name@@@", "complex-name"),
            ("Name_With_Underscores", "name_with_underscores"),
            ("Name-With-Dashes", "name-with-dashes"),
            ("CamelCaseName", "camelcasename"),
            ("name_with_numbers123", "name_with_numbers123"),
            ("", ""),
            ("---", ""),
            ("   ", ""),
        ]
    )
    def test_sanitizes_various_names(self, input_name, expected):
        """Test filename sanitization with various inputs."""
        result = coder_agy.sanitize_filename(input_name)
        assert result == expected

    def test_limits_length_to_50_chars(self):
        """Test that filename is limited to 50 characters."""
        long_name = "a" * 100
        result = coder_agy.sanitize_filename(long_name)
        assert len(result) <= 50

    def test_removes_leading_trailing_dashes(self):
        """Test that leading/trailing dashes are removed."""
        result = coder_agy.sanitize_filename("-test-name-")
        assert result == "test-name"

    def test_converts_multiple_dashes_to_single(self):
        """Test that multiple consecutive dashes are converted to single."""
        result = coder_agy.sanitize_filename("test---name")
        assert result == "test-name"


class TestValidateMode:
    """Test validate_mode function."""

    def test_valid_mode_returns_mode(self):
        """Test that valid mode is returned."""
        for mode in VALID_MODES:
            result = coder_agy.validate_mode(mode)
            assert result == mode

    def test_none_returns_none(self):
        """Test that None input returns None."""
        result = coder_agy.validate_mode(None)
        assert result is None

    def test_invalid_mode_raises_error(self):
        """Test that invalid mode raises ValueError."""
        with pytest.raises(ValueError, match="Invalid mode"):
            coder_agy.validate_mode(INVALID_MODE)

    def test_error_message_includes_available_modes(self):
        """Test that error message includes list of available modes."""
        with pytest.raises(ValueError) as exc_info:
            coder_agy.validate_mode("invalid")
        error_msg = str(exc_info.value)
        for mode in VALID_MODES:
            assert mode in error_msg


class TestValidateFilePath:
    """Test validate_file_path function."""

    def test_validates_existing_file(self, tmp_path):
        """Test validation of existing file."""
        test_file = tmp_path / "test.txt"
        test_file.write_text("content")
        result = coder_agy.validate_file_path(test_file, must_exist=True)
        assert result == test_file.resolve()

    def test_allows_non_existing_file_when_not_required(self, tmp_path):
        """Test that non-existing file is allowed when must_exist=False."""
        test_file = tmp_path / "nonexistent.txt"
        result = coder_agy.validate_file_path(test_file, must_exist=False)
        assert result == test_file.resolve()

    def test_raises_error_for_non_existing_file_when_required(self, tmp_path):
        """Test error when file doesn't exist and must_exist=True."""
        test_file = tmp_path / "nonexistent.txt"
        with pytest.raises(ValueError, match="File not found"):
            coder_agy.validate_file_path(test_file, must_exist=True)

    def test_raises_error_for_directory(self, tmp_path):
        """Test error when path is a directory."""
        with pytest.raises(ValueError, match="not a file"):
            coder_agy.validate_file_path(tmp_path, must_exist=True)

    def test_resolves_path_with_dots(self, tmp_path):
        """Test that paths with .. are resolved correctly."""
        # The resolve() method handles .. by resolving to the actual path
        # The check for ".." in the resolved string won't catch it if resolve() succeeds
        test_path = tmp_path / "subdir" / ".." / "test.txt"
        # This should resolve successfully to tmp_path/test.txt
        # No error is raised since resolve() normalizes the path
        result = coder_agy.validate_file_path(test_path, must_exist=False)
        assert result == tmp_path / "test.txt"

    def test_handles_null_byte_error(self, tmp_path):
        """Test that null bytes in path are handled (caught by pathlib)."""
        test_path = tmp_path / "test\x00.txt"
        # Pathlib raises ValueError for null bytes during resolve()
        with pytest.raises(ValueError, match="embedded null"):
            coder_agy.validate_file_path(test_path)

    def test_raises_error_for_unreadable_file(self, tmp_path):
        """Test error when file is not readable."""
        test_file = tmp_path / "unreadable.txt"
        test_file.write_text("content")
        os.chmod(test_file, 0o000)
        try:
            with pytest.raises(PermissionError, match="not readable"):
                coder_agy.validate_file_path(test_file, must_exist=True)
        finally:
            os.chmod(test_file, 0o644)


class TestValidateAddFiles:
    """Test validate_add_files function."""

    def test_empty_list_returns_empty(self):
        """Test that empty list returns empty list."""
        result = coder_agy.validate_add_files([])
        assert result == []

    def test_none_returns_empty(self):
        """Test that None returns empty list."""
        result = coder_agy.validate_add_files(None)
        assert result == []

    def test_validates_multiple_files(self, tmp_path):
        """Test validation of multiple files."""
        file1 = tmp_path / "file1.txt"
        file2 = tmp_path / "file2.txt"
        file1.write_text("content1")
        file2.write_text("content2")

        result = coder_agy.validate_add_files([str(file1), str(file2)])
        assert len(result) == 2
        assert result[0] == file1.resolve()
        assert result[1] == file2.resolve()

    def test_raises_error_for_invalid_file(self, tmp_path):
        """Test error when file is invalid."""
        with pytest.raises(ValueError, match="Invalid --add-file"):
            coder_agy.validate_add_files(["nonexistent.txt"])


###############################################################################
# CHECK COMMAND TESTS
###############################################################################


class TestCheckAntigravityAvailability:
    """Test check_antigravity_availability function."""

    def test_antigravity_not_in_path(self):
        """Test when agy is not installed."""
        with patch.object(shutil, "which", return_value=None):
            result = coder_agy.check_antigravity_availability()
            assert result.available is False
            assert "not installed" in result.message
            assert result.version is None

    def test_antigravity_available_with_version(self):
        """Test successful check with version extraction."""
        mock_output = "Antigravity CLI v1.2.3\nOther output"
        with patch.object(shutil, "which", return_value="/usr/bin/agy"):
            with patch.object(subprocess, "run") as mock_run:
                mock_result = Mock()
                mock_result.returncode = 0
                mock_result.stdout = mock_output
                mock_run.return_value = mock_result

                result = coder_agy.check_antigravity_availability()
                assert result.available is True
                assert "ready" in result.message
                assert "Antigravity" in result.version

    def test_antigravity_command_fails(self):
        """Test when agy command returns error."""
        with patch.object(shutil, "which", return_value="/usr/bin/agy"):
            with patch.object(subprocess, "run") as mock_run:
                mock_result = Mock()
                mock_result.returncode = 1
                mock_result.stderr = "Command failed"
                mock_run.return_value = mock_result

                result = coder_agy.check_antigravity_availability()
                assert result.available is False
                assert "returned error" in result.message

    def test_antigravity_timeout(self):
        """Test timeout when checking agy."""
        with patch.object(shutil, "which", return_value="/usr/bin/agy"):
            with patch.object(subprocess, "run", side_effect=subprocess.TimeoutExpired("agy", 10)):
                result = coder_agy.check_antigravity_availability()
                assert result.available is False
                assert "not responding" in result.message

    def test_antigravity_not_found_error(self):
        """Test FileNotFoundError when executing agy."""
        with patch.object(shutil, "which", return_value="/usr/bin/agy"):
            with patch.object(subprocess, "run", side_effect=FileNotFoundError()):
                result = coder_agy.check_antigravity_availability()
                assert result.available is False
                assert "not found" in result.message

    def test_antigravity_permission_error(self):
        """Test PermissionError when executing agy."""
        with patch.object(shutil, "which", return_value="/usr/bin/agy"):
            with patch.object(subprocess, "run", side_effect=PermissionError()):
                result = coder_agy.check_antigravity_availability()
                assert result.available is False
                assert "Permission denied" in result.message

    def test_antigravity_os_error(self):
        """Test OSError when executing agy."""
        with patch.object(shutil, "which", return_value="/usr/bin/agy"):
            with patch.object(subprocess, "run", side_effect=OSError("OS error")):
                result = coder_agy.check_antigravity_availability()
                assert result.available is False
                assert "Failed to execute" in result.message


class TestCmdCheck:
    """Test cmd_check function."""

    def test_check_success_without_verbose(self, capsys):
        """Test successful check without verbose flag."""
        mock_args = Mock(verbose=False)
        with patch.object(coder_agy, "check_antigravity_availability") as mock_check:
            mock_check.return_value = coder_agy.CheckResult(
                available=True,
                message="Ready",
                version="1.0"
            )
            result = coder_agy.cmd_check(mock_args)
            captured = capsys.readouterr()
            assert result == 0
            assert "Ready" in captured.out
            assert "Version" not in captured.out

    def test_check_success_with_verbose(self, capsys):
        """Test successful check with verbose flag."""
        mock_args = Mock(verbose=True)
        with patch.object(coder_agy, "check_antigravity_availability") as mock_check:
            mock_check.return_value = coder_agy.CheckResult(
                available=True,
                message="Ready",
                version="1.0"
            )
            result = coder_agy.cmd_check(mock_args)
            captured = capsys.readouterr()
            assert result == 0
            assert "Ready" in captured.out
            assert "Version: 1.0" in captured.out

    def test_check_failure(self, capsys):
        """Test failed check."""
        mock_args = Mock(verbose=False)
        with patch.object(coder_agy, "check_antigravity_availability") as mock_check:
            mock_check.return_value = coder_agy.CheckResult(
                available=False,
                message="Not available"
            )
            result = coder_agy.cmd_check(mock_args)
            captured = capsys.readouterr()
            assert result == 1
            assert "Not available" in captured.err


###############################################################################
# RUN COMMAND TESTS
###############################################################################


class TestRunAntigravityPrompt:
    """Test run_antigravity_prompt function."""

    def test_successful_run(self):
        """Test successful prompt execution."""
        mock_output = "Generated response"
        with patch.object(coder_agy, "validate_mode") as mock_validate:
            mock_validate.return_value = "agent"
            with patch.object(coder_agy, "validate_add_files") as mock_files:
                mock_files.return_value = []
                with patch.object(subprocess, "run") as mock_run:
                    mock_result = Mock()
                    mock_result.returncode = 0
                    mock_result.stdout = mock_output
                    mock_run.return_value = mock_result

                    result = coder_agy.run_antigravity_prompt(TEST_PROMPT)
                    assert result.success is True
                    assert result.output == mock_output
                    assert result.mode == "agent"

    def test_run_with_mode(self):
        """Test run with specific mode."""
        mock_output = "Response in ask mode"
        with patch.object(coder_agy, "validate_mode") as mock_validate:
            mock_validate.return_value = "ask"
            with patch.object(coder_agy, "validate_add_files", return_value=[]):
                with patch.object(subprocess, "run") as mock_run:
                    mock_result = Mock()
                    mock_result.returncode = 0
                    mock_result.stdout = mock_output
                    mock_run.return_value = mock_result

                    result = coder_agy.run_antigravity_prompt(TEST_PROMPT, mode="ask")
                    assert result.success is True
                    assert result.mode == "ask"

    def test_run_with_add_files(self, tmp_path):
        """Test run with additional files."""
        test_file = tmp_path / "context.txt"
        test_file.write_text("context content")

        mock_output = "Response with context"
        with patch.object(coder_agy, "validate_mode", return_value=None):
            with patch.object(coder_agy, "validate_add_files") as mock_files:
                mock_files.return_value = [test_file]
                with patch.object(subprocess, "run") as mock_run:
                    mock_result = Mock()
                    mock_result.returncode = 0
                    mock_result.stdout = mock_output
                    mock_run.return_value = mock_result

                    result = coder_agy.run_antigravity_prompt(
                        TEST_PROMPT,
                        add_files=[str(test_file)]
                    )
                    assert result.success is True
                    mock_files.assert_called_once()

    def test_run_command_fails(self):
        """Test when subprocess command fails."""
        with patch.object(coder_agy, "validate_mode", return_value=None):
            with patch.object(coder_agy, "validate_add_files", return_value=[]):
                with patch.object(subprocess, "run") as mock_run:
                    mock_result = Mock()
                    mock_result.returncode = 1
                    mock_result.stderr = "Command failed"
                    mock_run.return_value = mock_result

                    result = coder_agy.run_antigravity_prompt(TEST_PROMPT)
                    assert result.success is False
                    assert result.error == "Command failed"

    def test_run_timeout(self):
        """Test timeout during prompt execution."""
        with patch.object(coder_agy, "validate_mode", return_value=None):
            with patch.object(coder_agy, "validate_add_files", return_value=[]):
                with patch.object(subprocess, "run", side_effect=subprocess.TimeoutExpired("agy", 300)):
                    result = coder_agy.run_antigravity_prompt(TEST_PROMPT, timeout=300)
                    assert result.success is False
                    assert "Timeout" in result.error

    def test_run_invalid_mode(self):
        """Test with invalid mode."""
        with patch.object(coder_agy, "validate_mode", side_effect=ValueError("Invalid mode")):
            result = coder_agy.run_antigravity_prompt(TEST_PROMPT, mode="invalid")
            assert result.success is False
            assert "Invalid mode" in result.error

    def test_run_invalid_file_path(self, tmp_path):
        """Test with invalid file path."""
        with patch.object(coder_agy, "validate_mode", return_value=None):
            with patch.object(coder_agy, "validate_add_files", side_effect=ValueError("Invalid file")):
                result = coder_agy.run_antigravity_prompt(TEST_PROMPT, add_files=["invalid.txt"])
                assert result.success is False
                assert "Invalid file" in result.error


class TestRunAntigravityFile:
    """Test run_antigravity_file function."""

    def test_successful_run_from_file(self, tmp_path):
        """Test successful run from file."""
        prompt_file = tmp_path / "prompt.txt"
        prompt_file.write_text(TEST_PROMPT)

        mock_output = "Response from file"
        with patch.object(coder_agy, "validate_file_path") as mock_validate:
            mock_validate.return_value = prompt_file
            with patch.object(coder_agy, "run_antigravity_prompt") as mock_run:
                mock_run.return_value = coder_agy.RunResult(
                    success=True,
                    output=mock_output
                )

                result = coder_agy.run_antigravity_file(prompt_file)
                assert result.success is True
                assert result.output == mock_output

    def test_file_not_found(self, tmp_path):
        """Test with non-existent file."""
        nonexistent = tmp_path / "nonexistent.txt"
        with patch.object(coder_agy, "validate_file_path") as mock_validate:
            mock_validate.side_effect = ValueError("File not found")

            result = coder_agy.run_antigravity_file(nonexistent)
            assert result.success is False
            assert "File not found" in result.error

    def test_unreadable_file(self, tmp_path):
        """Test with unreadable file."""
        test_file = tmp_path / "unreadable.txt"
        with patch.object(coder_agy, "validate_file_path") as mock_validate:
            mock_validate.side_effect = PermissionError("Not readable")

            result = coder_agy.run_antigravity_file(test_file)
            assert result.success is False
            assert "Not readable" in result.error

    def test_unicode_decode_error(self, tmp_path):
        """Test with file that has encoding issues."""
        test_file = tmp_path / "binary.txt"
        test_file.write_bytes(b'\x80\x81\x82\x83')

        with patch.object(coder_agy, "validate_file_path") as mock_validate:
            mock_validate.return_value = test_file
            # The actual read will fail with UnicodeDecodeError
            result = coder_agy.run_antigravity_file(test_file)
            # This should handle the decode error
            assert result.success is False


class TestCmdRun:
    """Test cmd_run function."""

    def test_cmd_run_success(self, capsys):
        """Test successful run command."""
        mock_args = Mock(prompt=TEST_PROMPT, mode=None, add_files=[])
        with patch.object(coder_agy, "run_antigravity_prompt") as mock_run:
            mock_run.return_value = coder_agy.RunResult(
                success=True,
                output="Response"
            )
            result = coder_agy.cmd_run(mock_args)
            captured = capsys.readouterr()
            assert result == 0
            assert "Response" in captured.out

    def test_cmd_run_failure(self, capsys):
        """Test failed run command."""
        mock_args = Mock(prompt=TEST_PROMPT, mode=None, add_files=[])
        with patch.object(coder_agy, "run_antigravity_prompt") as mock_run:
            mock_run.return_value = coder_agy.RunResult(
                success=False,
                output="",
                error="Failed"
            )
            result = coder_agy.cmd_run(mock_args)
            captured = capsys.readouterr()
            assert result == 1
            assert "Failed" in captured.err


class TestCmdRunFile:
    """Test cmd_run_file function."""

    def test_cmd_run_file_success(self, capsys, tmp_path):
        """Test successful run-file command."""
        prompt_file = tmp_path / "prompt.txt"
        prompt_file.write_text(TEST_PROMPT)

        mock_args = Mock(prompt_file=str(prompt_file), mode=None, add_files=[])
        with patch.object(coder_agy, "run_antigravity_file") as mock_run:
            mock_run.return_value = coder_agy.RunResult(
                success=True,
                output="Response from file"
            )
            result = coder_agy.cmd_run_file(mock_args)
            captured = capsys.readouterr()
            assert result == 0
            assert "Response from file" in captured.out

    def test_cmd_run_file_failure(self, capsys, tmp_path):
        """Test failed run-file command."""
        prompt_file = tmp_path / "prompt.txt"
        mock_args = Mock(prompt_file=str(prompt_file), mode=None, add_files=[])
        with patch.object(coder_agy, "run_antigravity_file") as mock_run:
            mock_run.return_value = coder_agy.RunResult(
                success=False,
                output="",
                error="File error"
            )
            result = coder_agy.cmd_run_file(mock_args)
            captured = capsys.readouterr()
            assert result == 1
            assert "File error" in captured.err


###############################################################################
# GENERATE COMMAND TESTS
###############################################################################


class TestBuildTaskPrompt:
    """Test build_task_prompt function."""

    def test_build_prompt_with_defaults(self):
        """Test building prompt with default parameters."""
        task = "Implement a feature"
        prompt = coder_agy.build_task_prompt(task)
        assert "# Code Work Request" in prompt
        assert task in prompt
        assert "Test-Driven Development" in prompt
        assert "## Expected Output" in prompt

    def test_build_prompt_no_tdd(self):
        """Test building prompt with TDD disabled."""
        task = "Implement a feature"
        prompt = coder_agy.build_task_prompt(task, no_tdd=True)
        assert "# Code Work Request" in prompt
        assert task in prompt
        assert "Test-Driven Development" not in prompt

    def test_build_prompt_with_context(self):
        """Test building prompt with additional context."""
        task = "Implement a feature"
        context = "This is for a web application"
        prompt = coder_agy.build_task_prompt(task, context=context)
        assert "# Code Work Request" in prompt
        assert task in prompt
        assert "## Additional Context" in prompt
        assert context in prompt

    def test_prompt_includes_methodology_priority(self):
        """Test that prompt includes methodology priority."""
        prompt = coder_agy.build_task_prompt("Test task")
        assert "Correctness > Simplicity > Testability" in prompt


class TestGenerateCode:
    """Test generate_code function."""

    def test_successful_generation(self, tmp_path):
        """Test successful code generation."""
        with patch.object(coder_agy, "validate_mode", return_value="agent"):
            with patch.object(coder_agy, "generate_temp_path") as mock_temp:
                temp_file = tmp_path / "temp.txt"
                mock_temp.return_value = temp_file
                with patch.object(coder_agy, "run_antigravity_file") as mock_run:
                    mock_run.return_value = coder_agy.RunResult(
                        success=True,
                        output="Generated code content"
                    )
                    with patch.object(coder_agy, "PLANS_DIR", tmp_path / "plans"):
                        result = coder_agy.generate_code(TEST_TASK_CONTENT)
                        assert result.success is True
                        assert result.output_path is not None
                        assert result.mode == "agent"

    def test_generation_with_output_name(self, tmp_path):
        """Test generation with custom output name."""
        with patch.object(coder_agy, "validate_mode", return_value="agent"):
            with patch.object(coder_agy, "generate_temp_path") as mock_temp:
                temp_file = tmp_path / "temp.txt"
                mock_temp.return_value = temp_file
                with patch.object(coder_agy, "run_antigravity_file") as mock_run:
                    mock_run.return_value = coder_agy.RunResult(
                        success=True,
                        output="Generated code"
                    )
                    with patch.object(coder_agy, "PLANS_DIR", tmp_path / "plans"):
                        result = coder_agy.generate_code(
                            TEST_TASK_CONTENT,
                            output="custom-output"
                        )
                        assert result.success is True
                        assert "custom-output" in str(result.output_path)

    def test_generation_with_no_tdd(self, tmp_path):
        """Test generation with TDD disabled."""
        with patch.object(coder_agy, "validate_mode", return_value="agent"):
            with patch.object(coder_agy, "generate_temp_path") as mock_temp:
                temp_file = tmp_path / "temp.txt"
                mock_temp.return_value = temp_file
                with patch.object(coder_agy, "run_antigravity_file") as mock_run:
                    mock_run.return_value = coder_agy.RunResult(
                        success=True,
                        output="Generated code"
                    )
                    with patch.object(coder_agy, "PLANS_DIR", tmp_path / "plans"):
                        result = coder_agy.generate_code(
                            TEST_TASK_CONTENT,
                            no_tdd=True
                        )
                        assert result.success is True
                        # Check output file contains tdd_mode: standard
                        output_content = result.output_path.read_text()
                        assert "tdd_mode: standard" in output_content

    def test_generation_with_context(self, tmp_path):
        """Test generation with additional context."""
        with patch.object(coder_agy, "validate_mode", return_value="agent"):
            with patch.object(coder_agy, "generate_temp_path") as mock_temp:
                temp_file = tmp_path / "temp.txt"
                mock_temp.return_value = temp_file
                with patch.object(coder_agy, "run_antigravity_file") as mock_run:
                    mock_run.return_value = coder_agy.RunResult(
                        success=True,
                        output="Generated code"
                    )
                    with patch.object(coder_agy, "PLANS_DIR", tmp_path / "plans"):
                        context = "Additional project context"
                        result = coder_agy.generate_code(
                            TEST_TASK_CONTENT,
                            context=context
                        )
                        assert result.success is True

    def test_generation_with_add_files(self, tmp_path):
        """Test generation with additional files."""
        context_file = tmp_path / "context.txt"
        context_file.write_text("File content")

        with patch.object(coder_agy, "validate_mode", return_value="agent"):
            with patch.object(coder_agy, "generate_temp_path") as mock_temp:
                temp_file = tmp_path / "temp.txt"
                mock_temp.return_value = temp_file
                with patch.object(coder_agy, "run_antigravity_file") as mock_run:
                    mock_run.return_value = coder_agy.RunResult(
                        success=True,
                        output="Generated code"
                    )
                    with patch.object(coder_agy, "PLANS_DIR", tmp_path / "plans"):
                        result = coder_agy.generate_code(
                            TEST_TASK_CONTENT,
                            add_files=[str(context_file)]
                        )
                        assert result.success is True

    def test_generation_fails(self, tmp_path):
        """Test failed code generation."""
        with patch.object(coder_agy, "validate_mode", return_value="agent"):
            with patch.object(coder_agy, "generate_temp_path") as mock_temp:
                temp_file = tmp_path / "temp.txt"
                mock_temp.return_value = temp_file
                with patch.object(coder_agy, "run_antigravity_file") as mock_run:
                    mock_run.return_value = coder_agy.RunResult(
                        success=False,
                        output="",
                        error="Generation failed"
                    )
                    result = coder_agy.generate_code(TEST_TASK_CONTENT)
                    assert result.success is False
                    assert "Generation failed" in result.message

    def test_generation_invalid_mode(self):
        """Test generation with invalid mode."""
        with patch.object(coder_agy, "validate_mode", side_effect=ValueError("Invalid mode")):
            result = coder_agy.generate_code(TEST_TASK_CONTENT, mode="invalid")
            assert result.success is False
            assert "Invalid mode" in result.message

    def test_generates_proper_frontmatter(self, tmp_path):
        """Test that output file has proper YAML frontmatter."""
        with patch.object(coder_agy, "validate_mode", return_value="agent"):
            with patch.object(coder_agy, "generate_temp_path") as mock_temp:
                temp_file = tmp_path / "temp.txt"
                mock_temp.return_value = temp_file
                with patch.object(coder_agy, "run_antigravity_file") as mock_run:
                    mock_run.return_value = coder_agy.RunResult(
                        success=True,
                        output="Generated code"
                    )
                    with patch.object(coder_agy, "PLANS_DIR", tmp_path / "plans"):
                        result = coder_agy.generate_code(TEST_TASK_CONTENT)
                        assert result.success is True
                        content = result.output_path.read_text()
                        assert "---" in content
                        assert "type: antigravity-code-generation" in content
                        assert "version: 1.0" in content
                        assert "mode: agent" in content

    def test_temp_file_cleanup(self, tmp_path):
        """Test that temp file is cleaned up after generation."""
        with patch.object(coder_agy, "validate_mode", return_value="agent"):
            with patch.object(coder_agy, "generate_temp_path") as mock_temp:
                temp_file = tmp_path / "temp.txt"
                mock_temp.return_value = temp_file
                with patch.object(coder_agy, "run_antigravity_file") as mock_run:
                    mock_run.return_value = coder_agy.RunResult(
                        success=True,
                        output="Generated code"
                    )
                    with patch.object(coder_agy, "PLANS_DIR", tmp_path / "plans"):
                        result = coder_agy.generate_code(TEST_TASK_CONTENT)
                        # Temp file should be cleaned up
                        assert not temp_file.exists()


class TestCmdGenerate:
    """Test cmd_generate function."""

    def test_cmd_generate_success(self, capsys, tmp_path):
        """Test successful generate command."""
        mock_args = Mock(
            requirements=TEST_TASK_CONTENT,
            mode=None,
            no_tdd=False,
            output=None,
            context=None,
            add_files=[],
            verbose=False
        )
        with patch.object(coder_agy, "validate_file_path"):
            with patch.object(coder_agy, "validate_add_files", return_value=[]):
                with patch.object(coder_agy, "generate_code") as mock_gen:
                    mock_gen.return_value = coder_agy.GenerateResult(
                        success=True,
                        output_path=Path("output.md"),
                        message="Generated successfully"
                    )
                    result = coder_agy.cmd_generate(mock_args)
                    captured = capsys.readouterr()
                    assert result == 0
                    assert "Generated successfully" in captured.out

    def test_cmd_generate_with_context(self, capsys, tmp_path):
        """Test generate command with context file."""
        context_file = tmp_path / "context.md"
        context_file.write_text("Project context")

        mock_args = Mock(
            requirements=TEST_TASK_CONTENT,
            mode=None,
            no_tdd=False,
            output=None,
            context=str(context_file),
            add_files=[],
            verbose=False
        )
        with patch.object(coder_agy, "validate_file_path", return_value=context_file):
            with patch.object(coder_agy, "validate_add_files", return_value=[]):
                with patch.object(coder_agy, "generate_code") as mock_gen:
                    mock_gen.return_value = coder_agy.GenerateResult(
                        success=True,
                        output_path=Path("output.md"),
                        message="Generated successfully"
                    )
                    result = coder_agy.cmd_generate(mock_args)
                    assert result == 0

    def test_cmd_generate_context_file_error(self, capsys):
        """Test generate command with context file error."""
        mock_args = Mock(
            requirements=TEST_TASK_CONTENT,
            mode=None,
            no_tdd=False,
            output=None,
            context="nonexistent.md",
            add_files=[],
            verbose=False
        )
        with patch.object(coder_agy, "validate_file_path") as mock_validate:
            mock_validate.side_effect = ValueError("File not found")
            result = coder_agy.cmd_generate(mock_args)
            captured = capsys.readouterr()
            assert result == 1
            assert "Context file error" in captured.err

    def test_cmd_generate_invalid_add_file(self, capsys):
        """Test generate command with invalid add file."""
        mock_args = Mock(
            requirements=TEST_TASK_CONTENT,
            mode=None,
            no_tdd=False,
            output=None,
            context=None,
            add_files=["invalid.txt"],
            verbose=False
        )
        with patch.object(coder_agy, "validate_add_files") as mock_validate:
            mock_validate.side_effect = ValueError("Invalid file")
            result = coder_agy.cmd_generate(mock_args)
            captured = capsys.readouterr()
            assert result == 1
            assert "Invalid file" in captured.err

    def test_cmd_generate_verbose(self, capsys):
        """Test generate command with verbose output."""
        mock_args = Mock(
            requirements=TEST_TASK_CONTENT,
            mode=None,
            no_tdd=False,
            output=None,
            context=None,
            add_files=[],
            verbose=True
        )
        with patch.object(coder_agy, "validate_file_path"):
            with patch.object(coder_agy, "validate_add_files", return_value=[]):
                with patch.object(coder_agy, "generate_code") as mock_gen:
                    output_path = Path("docs/plans/output.md")
                    mock_gen.return_value = coder_agy.GenerateResult(
                        success=True,
                        output_path=output_path,
                        message="Generated successfully"
                    )
                    result = coder_agy.cmd_generate(mock_args)
                    captured = capsys.readouterr()
                    assert result == 0
                    assert str(output_path) in captured.out

    def test_cmd_generate_failure(self, capsys):
        """Test failed generate command."""
        mock_args = Mock(
            requirements=TEST_TASK_CONTENT,
            mode=None,
            no_tdd=False,
            output=None,
            context=None,
            add_files=[],
            verbose=False
        )
        with patch.object(coder_agy, "validate_file_path"):
            with patch.object(coder_agy, "validate_add_files", return_value=[]):
                with patch.object(coder_agy, "generate_code") as mock_gen:
                    mock_gen.return_value = coder_agy.GenerateResult(
                        success=False,
                        output_path=None,
                        message="Generation failed"
                    )
                    result = coder_agy.cmd_generate(mock_args)
                    captured = capsys.readouterr()
                    assert result == 1
                    assert "Generation failed" in captured.err


###############################################################################
# INTEGRATION TESTS
###############################################################################


class TestIntegration:
    """Integration tests for coder-agy."""

    def test_constants_are_defined(self):
        """Test that all constants are properly defined."""
        assert coder_agy.ANTIGRAVITY_CLI == "agy"
        assert "agent" in coder_agy.AVAILABLE_MODES
        assert "ask" in coder_agy.AVAILABLE_MODES
        assert "edit" in coder_agy.AVAILABLE_MODES
        assert coder_agy.TIMEOUT_SIMPLE == 300
        assert coder_agy.TIMEOUT_MODERATE == 600
        assert coder_agy.TIMEOUT_COMPLEX == 900

    def test_available_modes_list(self):
        """Test that AVAILABLE_MODES contains expected modes."""
        expected_modes = ["agent", "ask", "edit"]
        assert coder_agy.AVAILABLE_MODES == expected_modes

    def test_plans_dir_constant(self):
        """Test PLANS_DIR constant."""
        assert coder_agy.PLANS_DIR == Path("docs/plans")
