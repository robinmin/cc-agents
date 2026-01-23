"""Tests for import command in code-review-claude.py."""
from __future__ import annotations

from argparse import Namespace
from pathlib import Path
from unittest.mock import Mock, patch

import pytest

import code_review_claude as crc


class TestParseYamlFrontmatter:
    """Tests for parse_yaml_frontmatter function."""

    def test_parse_with_frontmatter(self) -> None:
        """Test parsing markdown with YAML frontmatter."""
        content = """---
type: claude-code-review
target: src/auth.py
mode: review
---

# Review content here
"""
        metadata, remaining = crc.parse_yaml_frontmatter(content)

        assert metadata["type"] == "claude-code-review"
        assert metadata["target"] == "src/auth.py"
        assert metadata["mode"] == "review"
        assert "# Review content here" in remaining

    def test_parse_without_frontmatter(self) -> None:
        """Test parsing markdown without YAML frontmatter."""
        content = "# Review content here\n\nNo frontmatter."
        metadata, remaining = crc.parse_yaml_frontmatter(content)

        assert metadata == {}
        assert remaining == content

    def test_parse_with_empty_frontmatter(self) -> None:
        """Test parsing with empty frontmatter."""
        content = """---
---

# Content
"""
        metadata, remaining = crc.parse_yaml_frontmatter(content)

        assert metadata == {}
        assert "# Content" in remaining


class TestExtractIssuesFromSection:
    """Tests for extract_issues_from_section function."""

    def test_extract_structured_issues(self) -> None:
        """Test extracting structured issues."""
        section = """
**[CRITICAL-001]** SQL Injection Vulnerability
- **Location**: auth.py:45
- **Issue**: User input directly concatenated
- **Impact**: Allows arbitrary SQL execution
- **Fix**: Use parameterized queries

**[CRITICAL-002]** Missing Authentication
- **Location**: api/admin.py:10
- **Issue**: No auth check on admin endpoint
"""
        issues = crc.extract_issues_from_section(section, "critical")

        assert len(issues) == 2
        assert issues[0].identifier == "CRITICAL-001"
        assert issues[0].priority == "critical"
        assert "SQL Injection" in issues[0].title
        assert issues[0].location == "auth.py:45"
        assert issues[1].identifier == "CRITICAL-002"
        assert "Missing Authentication" in issues[1].title

    def test_extract_simple_issues(self) -> None:
        """Test extracting simple bullet point issues."""
        section = """
- Missing input validation on user registration
- No rate limiting on API endpoints
- Passwords stored without hashing
"""
        issues = crc.extract_issues_from_section(section, "high")

        assert len(issues) == 3
        assert issues[0].identifier == "HIGH-001"
        assert issues[0].priority == "high"
        assert "Missing input validation" in issues[0].title
        assert issues[1].identifier == "HIGH-002"
        assert "No rate limiting" in issues[1].title
        assert issues[2].identifier == "HIGH-003"

    def test_extract_empty_section(self) -> None:
        """Test extracting from empty section."""
        issues = crc.extract_issues_from_section("", "medium")

        assert len(issues) == 0

    def test_extract_section_with_no_issues(self) -> None:
        """Test extracting section with 'No issues identified'."""
        section = "No critical issues identified."
        issues = crc.extract_issues_from_section(section, "critical")

        assert len(issues) == 0


class TestParseReviewResultFile:
    """Tests for parse_review_result_file function."""

    def test_parse_complete_review(self, tmp_path: Path) -> None:
        """Test parsing complete review result file."""
        review_file = tmp_path / "review.md"
        review_file.write_text("""---
type: claude-code-review
target: src/auth.py
mode: review
---

# Code Review

## Critical Issues (Must Fix)

**[CRITICAL-001]** SQL Injection
- **Location**: auth.py:45
- **Issue**: Not sanitized
- **Impact**: High
- **Fix**: Use prepared statements

## High Priority Issues (Should Fix)

- Missing error handling

## Medium Priority Issues (Consider Fixing)

None found.
""")

        metadata, issues = crc.parse_review_result_file(review_file)

        assert metadata["type"] == "claude-code-review"
        assert metadata["target"] == "src/auth.py"
        assert len(issues) >= 2  # At least one critical and one high

    def test_parse_nonexistent_file(self, tmp_path: Path) -> None:
        """Test parsing non-existent file."""
        with pytest.raises(FileNotFoundError):
            crc.parse_review_result_file(tmp_path / "nonexistent.md")


class TestCreateTaskFromIssue:
    """Tests for create_task_from_issue function."""

    @patch("code_review_claude.subprocess.run")
    @patch("code_review_claude.get_tasks_dir")
    def test_create_task_success(
        self,
        mock_get_tasks_dir: Mock,
        mock_run: Mock,
        tmp_path: Path
    ) -> None:
        """Test successful task creation."""
        # Setup mock tasks directory
        tasks_dir = tmp_path / "docs" / "prompts"
        tasks_dir.mkdir(parents=True, exist_ok=True)
        mock_get_tasks_dir.return_value = tasks_dir

        def mock_subprocess_run(*args, **kwargs):
            """Mock subprocess.run to create the expected task file."""
            # When tasks create is called, create the file that would be created
            if args and isinstance(args[0], list) and len(args[0]) > 0 and args[0][0] == "tasks":
                # Generate the expected task name pattern
                task_name = "CRITICAL-001_SQL_Injection_Vulnerability"
                task_file = tasks_dir / f"{task_name}.md"
                task_file.write_text("# Background\n\nDefault content\n\n# Requirements\n\nDefault requirements\n")
                return Mock(returncode=0, stdout="", stderr="")
            return Mock(returncode=0, stdout="", stderr="")

        mock_run.side_effect = mock_subprocess_run

        issue = crc.ReviewIssue(
            priority="critical",
            identifier="CRITICAL-001",
            title="SQL Injection Vulnerability",
            location="auth.py:45",
            issue_description="User input not sanitized",
            impact="Allows arbitrary SQL execution",
            fix_recommendation="Use parameterized queries",
            raw_content=None
        )

        metadata = {"target": "src/auth.py", "type": "claude-code-review"}
        success, message = crc.create_task_from_issue(issue, metadata)

        assert success is True
        assert "SQL_Injection_Vulnerability" in message

    @patch("code_review_claude.subprocess.run")
    def test_create_task_subprocess_failure(self, mock_run: Mock) -> None:
        """Test task creation when subprocess fails."""
        mock_run.return_value = Mock(returncode=1, stderr="Task creation failed")

        issue = crc.ReviewIssue(
            priority="critical",
            identifier="CRITICAL-001",
            title="Test Issue",
            location=None,
            issue_description=None,
            impact=None,
            fix_recommendation=None,
            raw_content=None
        )

        success, message = crc.create_task_from_issue(issue, {})

        assert success is False
        assert "Failed to create task" in message

    @patch("code_review_claude.subprocess.run")
    def test_create_task_timeout(self, mock_run: Mock) -> None:
        """Test task creation timeout."""
        import subprocess
        mock_run.side_effect = subprocess.TimeoutExpired("tasks create", 30)

        issue = crc.ReviewIssue(
            priority="critical",
            identifier="CRITICAL-001",
            title="Test Issue",
            location=None,
            issue_description=None,
            impact=None,
            fix_recommendation=None,
            raw_content=None
        )

        success, message = crc.create_task_from_issue(issue, {})

        assert success is False
        assert "timeout" in message.lower()


class TestCmdImport:
    """Tests for cmd_import function."""

    @patch("code_review_claude.create_task_from_issue")
    @patch("code_review_claude.parse_review_result_file")
    def test_import_success(
        self,
        mock_parse: Mock,
        mock_create: Mock,
        capsys: pytest.CaptureFixture[str],
        tmp_path: Path
    ) -> None:
        """Test successful import command."""
        # Create a temporary review file
        review_file = tmp_path / "review.md"
        review_file.write_text("# Test Review")

        # Setup mock issues
        issue1 = crc.ReviewIssue(
            priority="critical",
            identifier="CRITICAL-001",
            title="SQL Injection",
            location="auth.py:45",
            issue_description="Not sanitized",
            impact="High",
            fix_recommendation="Use prepared statements",
            raw_content=None
        )

        issue2 = crc.ReviewIssue(
            priority="high",
            identifier="HIGH-001",
            title="Missing Error Handling",
            location=None,
            issue_description=None,
            impact=None,
            fix_recommendation=None,
            raw_content=None
        )

        mock_parse.return_value = ({"target": "src/auth.py"}, [issue1, issue2])
        mock_create.side_effect = [
            (True, "/path/to/task1.md"),
            (True, "/path/to/task2.md")
        ]

        args = Namespace(
            review_file=str(review_file),
            priority=None
        )

        exit_code = crc.cmd_import(args)

        assert exit_code == 0
        captured = capsys.readouterr()
        assert "Successfully created 2 tasks" in captured.out
        mock_parse.assert_called_once()
        assert mock_create.call_count == 2

    def test_import_file_not_found(
        self,
        capsys: pytest.CaptureFixture[str]
    ) -> None:
        """Test import with non-existent file."""
        args = Namespace(
            review_file="nonexistent.md",
            priority=None
        )

        exit_code = crc.cmd_import(args)

        assert exit_code == 1
        captured = capsys.readouterr()
        assert "Review file not found" in captured.err

    @patch("code_review_claude.create_task_from_issue")
    @patch("code_review_claude.parse_review_result_file")
    def test_import_with_priority_filter(
        self,
        mock_parse: Mock,
        mock_create: Mock,
        capsys: pytest.CaptureFixture[str],
        tmp_path: Path
    ) -> None:
        """Test import with priority filter."""
        # Create a temporary review file
        review_file = tmp_path / "review.md"
        review_file.write_text("# Test Review")

        critical_issue = crc.ReviewIssue(
            priority="critical",
            identifier="CRITICAL-001",
            title="Critical Issue",
            location=None,
            issue_description=None,
            impact=None,
            fix_recommendation=None,
            raw_content=None
        )

        high_issue = crc.ReviewIssue(
            priority="high",
            identifier="HIGH-001",
            title="High Issue",
            location=None,
            issue_description=None,
            impact=None,
            fix_recommendation=None,
            raw_content=None
        )

        mock_parse.return_value = ({"target": "src/auth.py"}, [critical_issue, high_issue])
        mock_create.return_value = (True, "/path/to/task.md")

        args = Namespace(
            review_file=str(review_file),
            priority="critical"
        )

        exit_code = crc.cmd_import(args)

        assert exit_code == 0
        # Should only create tasks for critical issues
        assert mock_create.call_count == 1
        call_args = mock_create.call_args
        assert call_args[0][0].priority == "critical"

    @patch("code_review_claude.create_task_from_issue")
    @patch("code_review_claude.parse_review_result_file")
    def test_import_no_issues(
        self,
        mock_parse: Mock,
        mock_create: Mock,
        capsys: pytest.CaptureFixture[str],
        tmp_path: Path
    ) -> None:
        """Test import when no issues found."""
        # Create a temporary review file
        review_file = tmp_path / "review.md"
        review_file.write_text("# Test Review")

        mock_parse.return_value = ({"target": "src/auth.py"}, [])

        args = Namespace(
            review_file=str(review_file),
            priority=None
        )

        exit_code = crc.cmd_import(args)

        assert exit_code == 0
        captured = capsys.readouterr()
        assert "No issues found" in captured.out
        mock_create.assert_not_called()

    @patch("code_review_claude.create_task_from_issue")
    @patch("code_review_claude.parse_review_result_file")
    def test_import_with_failures(
        self,
        mock_parse: Mock,
        mock_create: Mock,
        capsys: pytest.CaptureFixture[str],
        tmp_path: Path
    ) -> None:
        """Test import with some failures."""
        # Create a temporary review file
        review_file = tmp_path / "review.md"
        review_file.write_text("# Test Review")

        issue1 = crc.ReviewIssue(
            priority="critical",
            identifier="CRITICAL-001",
            title="Issue 1",
            location=None,
            issue_description=None,
            impact=None,
            fix_recommendation=None,
            raw_content=None
        )

        issue2 = crc.ReviewIssue(
            priority="high",
            identifier="HIGH-001",
            title="Issue 2",
            location=None,
            issue_description=None,
            impact=None,
            fix_recommendation=None,
            raw_content=None
        )

        mock_parse.return_value = ({"target": "src/auth.py"}, [issue1, issue2])
        mock_create.side_effect = [
            (True, "/path/to/task1.md"),
            (False, "Task creation failed")
        ]

        args = Namespace(
            review_file=str(review_file),
            priority=None
        )

        exit_code = crc.cmd_import(args)

        assert exit_code == 1  # Returns 1 if there are failures
        captured = capsys.readouterr()
        assert "Successfully created 1 task" in captured.out
        assert "Failed to create 1 task" in captured.err
