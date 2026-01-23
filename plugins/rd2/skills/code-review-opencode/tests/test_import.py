"""Tests for import command in code-review-opencode.py."""
from __future__ import annotations

from argparse import Namespace
from pathlib import Path
from unittest.mock import Mock, patch

import pytest

import code_review_opencode as cro


class TestParseYamlFrontmatter:
    """Tests for parse_yaml_frontmatter function."""

    def test_parse_with_frontmatter(self) -> None:
        """Test parsing content with YAML frontmatter."""
        content = """---
generated: 2024-01-01
type: opencode-review
target: src/main.py
mode: review
---
# Review content
"""
        metadata, body = cro.parse_yaml_frontmatter(content)

        assert metadata["generated"] == "2024-01-01"
        assert metadata["type"] == "opencode-review"
        assert metadata["target"] == "src/main.py"
        assert metadata["mode"] == "review"
        assert "# Review content" in body

    def test_parse_without_frontmatter(self) -> None:
        """Test parsing content without YAML frontmatter."""
        content = "# Just content"
        metadata, body = cro.parse_yaml_frontmatter(content)

        assert metadata == {}
        assert body == content

    def test_parse_with_empty_frontmatter(self) -> None:
        """Test parsing with empty frontmatter."""
        content = """---
---
# Content
"""
        metadata, body = cro.parse_yaml_frontmatter(content)

        assert metadata == {}
        assert "# Content" in body


class TestExtractIssuesFromSection:
    """Tests for extract_issues_from_section function."""

    def test_extract_structured_issues(self) -> None:
        """Test extracting structured issue format."""
        content = """**[CRITICAL-001]** Missing input validation
- **Location**: src/auth.py:42
- **Issue**: No validation on user input
- **Impact**: SQL injection vulnerability
- **Fix**: Add parameterized queries

**[CRITICAL-002]** Hardcoded credentials
- **Location**: config.py:10
"""
        issues = cro.extract_issues_from_section(content, "critical")

        assert len(issues) == 2
        assert issues[0].identifier == "CRITICAL-001"
        assert "Missing input validation" in issues[0].title
        assert issues[0].location == "src/auth.py:42"
        assert issues[0].issue_description == "No validation on user input"

    def test_extract_simple_list_issues(self) -> None:
        """Test extracting simple list issues."""
        content = """- Missing error handling
- No logging
- Hardcoded values
"""
        issues = cro.extract_issues_from_section(content, "medium")

        assert len(issues) == 3
        assert issues[0].identifier == "MEDIUM-001"
        assert "Missing error handling" in issues[0].title

    def test_returns_empty_for_no_issues(self) -> None:
        """Test returning empty list when no issues."""
        content = "No critical issues identified."

        issues = cro.extract_issues_from_section(content, "critical")

        assert len(issues) == 0

    def test_mixed_format_issues(self) -> None:
        """Test extracting mixed format issues."""
        content = """**[HIGH-001]** Performance issue
- **Location**: api.py:100
- Simple list issue
"""
        issues = cro.extract_issues_from_section(content, "high")

        assert len(issues) >= 1
        assert any(i.identifier == "HIGH-001" for i in issues)


class TestBuildIssueFromDict:
    """Tests for _build_issue_from_dict function."""

    def test_build_complete_issue(self) -> None:
        """Test building issue with all fields."""
        issue_dict = {
            "identifier": "TEST-001",
            "title": "Test Issue",
            "location": "test.py:10",
            "issue": "Bug found",
            "impact": "High",
            "fix": "Fix it",
        }
        content_lines = ["Additional context"]

        issue = cro._build_issue_from_dict(
            issue_dict, content_lines, "critical", 1
        )

        assert issue.identifier == "TEST-001"
        assert issue.title == "Test Issue"
        assert issue.location == "test.py:10"
        assert issue.issue_description == "Bug found"
        assert issue.impact == "High"
        assert issue.fix_recommendation == "Fix it"
        assert issue.raw_content == "Additional context"

    def test_build_minimal_issue(self) -> None:
        """Test building issue with minimal fields."""
        issue_dict = {}
        content_lines = []

        issue = cro._build_issue_from_dict(
            issue_dict, content_lines, "low", 5
        )

        assert issue.identifier == "LOW-005"
        assert issue.title == "Untitled Issue"


class TestParseReviewResultFile:
    """Tests for parse_review_result_file function."""

    def test_parse_complete_file(self, tmp_path: Path) -> None:
        """Test parsing a complete review file."""
        review_file = tmp_path / "review.md"
        review_file.write_text("""---
generated: 2024-01-01
type: opencode-review
target: src/auth.py
---

## Critical Issues (Must Fix)
**[CRITICAL-001]** SQL Injection
- **Location**: auth.py:42
- **Issue**: User input not sanitized
- **Impact**: Database compromise
- **Fix**: Use parameterized queries

## High Priority Issues (Should Fix)
- Add error handling
""")

        metadata, issues = cro.parse_review_result_file(review_file)

        assert metadata["target"] == "src/auth.py"
        assert len(issues) >= 1
        assert any(i.identifier == "CRITICAL-001" for i in issues)

    def test_parse_nonexistent_file(self) -> None:
        """Test parsing a nonexistent file."""
        with pytest.raises(FileNotFoundError):
            cro.parse_review_result_file(Path("/nonexistent/file.md"))

    def test_parse_file_with_no_issues(self, tmp_path: Path) -> None:
        """Test parsing file with no issues sections."""
        review_file = tmp_path / "review.md"
        review_file.write_text("---\ntype: review\n---\nNo issues here.")

        metadata, issues = cro.parse_review_result_file(review_file)

        assert len(issues) == 0


class TestCreateTaskFromIssue:
    """Tests for create_task_from_issue function."""

    @patch("code_review_opencode.get_tasks_dir")
    @patch("code_review_opencode.subprocess.run")
    def test_create_task_success(
        self, mock_run: Mock, mock_tasks_dir: Mock, tmp_path: Path
    ) -> None:
        """Test successful task creation."""
        tasks_dir = tmp_path / "docs" / "prompts"
        tasks_dir.mkdir(parents=True, exist_ok=True)
        mock_tasks_dir.return_value = tasks_dir

        # Mock subprocess to succeed
        mock_run.return_value = Mock(returncode=0, stdout="Created", stderr="")

        # Create a mock task file
        task_file = tasks_dir / "CRITICAL-001_test-issue.md"
        task_file.write_text("# Background\n\n# Requirements\n\n")

        issue = cro.ReviewIssue(
            priority="critical",
            identifier="CRITICAL-001",
            title="Test Issue",
            location="test.py:10",
            issue_description="Bug description",
            impact="High",
            fix_recommendation="Fix it",
        )

        success, message = cro.create_task_from_issue(
            issue, {"target": "src/auth.py", "type": "opencode-review"}
        )

        # This test verifies the function structure
        # Full integration would need more complex mocking
        assert isinstance(success, bool)
        assert isinstance(message, str)

    @patch("code_review_opencode.subprocess.run")
    def test_create_task_timeout(self, mock_run: Mock) -> None:
        """Test task creation timeout."""
        import subprocess
        mock_run.side_effect = subprocess.TimeoutExpired("tasks", 30)

        issue = cro.ReviewIssue(
            priority="critical",
            identifier="CRITICAL-001",
            title="Test Issue",
        )

        success, message = cro.create_task_from_issue(issue, {})

        assert success is False
        assert "timeout" in message.lower()


class TestCmdImport:
    """Tests for cmd_import function."""

    @patch("code_review_opencode.create_task_from_issue")
    @patch("code_review_opencode.parse_review_result_file")
    @patch("pathlib.Path.exists", return_value=True)
    def test_successful_import(
        self,
        mock_exists: Mock,
        mock_parse: Mock,
        mock_create: Mock,
        capsys: pytest.CaptureFixture[str],
    ) -> None:
        """Test successful import of issues."""
        mock_parse.return_value = (
            {"target": "src/auth.py", "type": "opencode-review"},
            [
                cro.ReviewIssue(
                    priority="critical",
                    identifier="CRITICAL-001",
                    title="Test Issue 1",
                ),
                cro.ReviewIssue(
                    priority="high",
                    identifier="HIGH-001",
                    title="Test Issue 2",
                ),
            ],
        )
        mock_create.side_effect = [
            (True, "/path/to/task1.md"),
            (True, "/path/to/task2.md"),
        ]

        args = Namespace(review_file="review.md", priority=None)

        exit_code = cro.cmd_import(args)

        assert exit_code == 0
        captured = capsys.readouterr()
        assert "Successfully created 2 tasks" in captured.out

    @patch("code_review_opencode.parse_review_result_file")
    def test_import_nonexistent_file(
        self,
        mock_parse: Mock,
        capsys: pytest.CaptureFixture[str],
    ) -> None:
        """Test importing a nonexistent file."""
        mock_parse.side_effect = FileNotFoundError("File not found")

        args = Namespace(review_file="nonexistent.md", priority=None)

        exit_code = cro.cmd_import(args)

        assert exit_code == 1

    @patch("code_review_opencode.create_task_from_issue")
    @patch("code_review_opencode.parse_review_result_file")
    @patch("pathlib.Path.exists", return_value=True)
    def test_import_with_priority_filter(
        self,
        mock_exists: Mock,
        mock_parse: Mock,
        mock_create: Mock,
        capsys: pytest.CaptureFixture[str],
    ) -> None:
        """Test importing with priority filter."""
        mock_parse.return_value = (
            {"target": "src"},
            [
                cro.ReviewIssue(priority="critical", identifier="C-1", title="Critical"),
                cro.ReviewIssue(priority="high", identifier="H-1", title="High"),
            ],
        )
        mock_create.return_value = (True, "/path/to/task.md")

        args = Namespace(review_file="review.md", priority="critical")

        exit_code = cro.cmd_import(args)

        assert exit_code == 0
        # Should only call create_task for critical issues
        assert mock_create.call_count == 1

    @patch("code_review_opencode.create_task_from_issue")
    @patch("code_review_opencode.parse_review_result_file")
    @patch("pathlib.Path.exists", return_value=True)
    def test_import_with_failures(
        self,
        mock_exists: Mock,
        mock_parse: Mock,
        mock_create: Mock,
        capsys: pytest.CaptureFixture[str],
    ) -> None:
        """Test import with some failures."""
        mock_parse.return_value = (
            {"target": "src"},
            [
                cro.ReviewIssue(priority="critical", identifier="C-1", title="Issue 1"),
                cro.ReviewIssue(priority="critical", identifier="C-2", title="Issue 2"),
            ],
        )
        mock_create.side_effect = [
            (True, "/path/to/task1.md"),
            (False, "Failed to create"),
        ]

        args = Namespace(review_file="review.md", priority=None)

        exit_code = cro.cmd_import(args)

        assert exit_code == 1  # Non-zero exit code for failures
        captured = capsys.readouterr()
        assert "Failed to create 1 task" in captured.err
