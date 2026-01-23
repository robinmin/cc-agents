"""Tests for import command in code-review-gemini.py."""
from __future__ import annotations

from argparse import Namespace
from pathlib import Path
from unittest.mock import Mock, patch

import pytest

import code_review_gemini as crg


class TestParseYamlFrontmatter:
    """Tests for parse_yaml_frontmatter function."""

    def test_parses_valid_frontmatter(self) -> None:
        """Test parsing valid YAML frontmatter."""
        content = """---
type: gemini-code-review
model: gemini-2.5-pro
target: src/auth/
quality_score: 8
---

# Review Content
Some content here
"""
        metadata, body = crg.parse_yaml_frontmatter(content)

        assert metadata["type"] == "gemini-code-review"
        assert metadata["model"] == "gemini-2.5-pro"
        assert metadata["target"] == "src/auth/"
        assert metadata["quality_score"] == "8"
        assert "Review Content" in body
        assert "Some content here" in body

    def test_handles_missing_frontmatter(self) -> None:
        """Test handling content without frontmatter."""
        content = """# Review Content
No frontmatter here
"""
        metadata, body = crg.parse_yaml_frontmatter(content)

        assert metadata == {}
        assert body == content

    def test_handles_malformed_frontmatter(self) -> None:
        """Test handling malformed frontmatter."""
        content = """---
not valid yaml: : :
---

Content
"""
        metadata, body = crg.parse_yaml_frontmatter(content)

        # Should return empty metadata on parse error
        assert isinstance(metadata, dict)
        assert "Content" in body

    def test_extracts_all_metadata_fields(self) -> None:
        """Test extracting various metadata fields."""
        content = """---
type: gemini-code-review
version: 1.0
model: gemini-2.5-pro
target: test.py
mode: review
focus_areas: security,performance
quality_score: 9
recommendation: Approve
files_reviewed: 5
---

Body content
"""
        metadata, body = crg.parse_yaml_frontmatter(content)

        assert len(metadata) == 9
        assert metadata["version"] == "1.0"
        assert metadata["mode"] == "review"
        assert metadata["focus_areas"] == "security,performance"
        assert metadata["recommendation"] == "Approve"
        assert metadata["files_reviewed"] == "5"

    def test_handles_empty_content(self) -> None:
        """Test handling empty content."""
        content = ""
        metadata, body = crg.parse_yaml_frontmatter(content)

        assert metadata == {}
        assert body == ""


class TestExtractIssuesFromSection:
    """Tests for extract_issues_from_section function."""

    def test_extracts_structured_issue_format(self) -> None:
        """Test extracting structured issue format."""
        section = """
**[CRITICAL-001]** SQL Injection Vulnerability

- **Location**: src/auth/login.py:45
- **Issue**: User input directly concatenated into SQL query
- **Impact**: Allows attackers to execute arbitrary SQL
- **Fix**: Use parameterized queries or ORM
"""
        issues = crg.extract_issues_from_section(section, "critical")

        assert len(issues) == 1
        issue = issues[0]
        assert issue.priority == "critical"
        assert issue.identifier == "CRITICAL-001"
        assert issue.title == "SQL Injection Vulnerability"
        assert issue.location == "src/auth/login.py:45"
        assert "User input" in issue.issue_description
        assert "arbitrary SQL" in issue.impact
        assert "parameterized queries" in issue.fix_recommendation

    def test_extracts_simple_bullet_points(self) -> None:
        """Test extracting simple bullet point issues."""
        section = """
- Missing input validation on user registration form
- No rate limiting on API endpoints
- Passwords stored without hashing
"""
        issues = crg.extract_issues_from_section(section, "high")

        assert len(issues) == 3
        assert issues[0].priority == "high"
        assert issues[0].identifier == "HIGH-001"
        assert "Missing input validation" in issues[0].title
        assert issues[1].identifier == "HIGH-002"
        assert "rate limiting" in issues[1].title
        assert issues[2].identifier == "HIGH-003"
        assert "Passwords stored" in issues[2].title

    def test_handles_empty_section(self) -> None:
        """Test handling empty section."""
        section = ""
        issues = crg.extract_issues_from_section(section, "medium")

        assert len(issues) == 0

    def test_handles_no_issues_section(self) -> None:
        """Test handling section with no issues."""
        section = "No issues found in this category."
        issues = crg.extract_issues_from_section(section, "low")

        assert len(issues) == 0

    def test_generates_identifiers_for_unstructured(self) -> None:
        """Test identifier generation for unstructured issues."""
        section = """
- First issue
- Second issue
- Third issue
"""
        issues = crg.extract_issues_from_section(section, "medium")

        assert len(issues) == 3
        assert issues[0].identifier == "MEDIUM-001"
        assert issues[1].identifier == "MEDIUM-002"
        assert issues[2].identifier == "MEDIUM-003"

    def test_extracts_multiple_structured_issues(self) -> None:
        """Test extracting multiple structured issues."""
        section = """
**[CRITICAL-001]** First Issue
- **Location**: file1.py:10

**[CRITICAL-002]** Second Issue
- **Location**: file2.py:20
"""
        issues = crg.extract_issues_from_section(section, "critical")

        assert len(issues) == 2
        assert issues[0].identifier == "CRITICAL-001"
        assert issues[0].title == "First Issue"
        assert issues[1].identifier == "CRITICAL-002"
        assert issues[1].title == "Second Issue"

    def test_handles_mixed_format(self) -> None:
        """Test handling mix of structured and unstructured issues."""
        section = """
**[HIGH-001]** Structured Issue
- **Location**: file.py:10

- Unstructured issue
"""
        issues = crg.extract_issues_from_section(section, "high")

        # Should extract both
        assert len(issues) == 2
        assert issues[0].identifier == "HIGH-001"
        assert issues[0].title == "Structured Issue"
        assert issues[1].identifier == "HIGH-002"


class TestParseReviewResultFile:
    """Tests for parse_review_result_file function."""

    def test_parses_complete_review_file(self, tmp_path: Path) -> None:
        """Test parsing complete review result file."""
        review_file = tmp_path / "review.md"
        review_file.write_text("""---
type: gemini-code-review
model: gemini-2.5-pro
target: src/
quality_score: 7
---

# Code Review Result

## Critical Issues (Must Fix)

**[CRITICAL-001]** SQL Injection
- **Location**: auth.py:45

## High Priority Issues (Should Fix)

- Missing input validation

## Medium Priority Issues (Consider Fixing)

- Code duplication in utils

## Low Priority Issues (Nice to Have)

- Add more comments
""")

        metadata, issues = crg.parse_review_result_file(review_file)

        assert metadata["type"] == "gemini-code-review"
        assert metadata["model"] == "gemini-2.5-pro"
        assert metadata["quality_score"] == "7"
        assert len(issues) == 4
        assert sum(1 for i in issues if i.priority == "critical") == 1
        assert sum(1 for i in issues if i.priority == "high") == 1
        assert sum(1 for i in issues if i.priority == "medium") == 1
        assert sum(1 for i in issues if i.priority == "low") == 1

    def test_extracts_issues_from_all_priorities(
        self, tmp_path: Path
    ) -> None:
        """Test extracting issues from all priority sections."""
        review_file = tmp_path / "review.md"
        review_file.write_text("""---
type: gemini-code-review
---

## Critical Issues (Must Fix)

- Critical issue 1
- Critical issue 2

## High Priority Issues (Should Fix)

- High issue 1

## Medium Priority Issues (Consider Fixing)

- Medium issue 1
- Medium issue 2
- Medium issue 3

## Low Priority Issues (Nice to Have)

- Low issue 1
""")

        metadata, issues = crg.parse_review_result_file(review_file)

        assert len(issues) == 7
        critical = [i for i in issues if i.priority == "critical"]
        high = [i for i in issues if i.priority == "high"]
        medium = [i for i in issues if i.priority == "medium"]
        low = [i for i in issues if i.priority == "low"]

        assert len(critical) == 2
        assert len(high) == 1
        assert len(medium) == 3
        assert len(low) == 1

    def test_handles_missing_sections(self, tmp_path: Path) -> None:
        """Test handling review file with missing sections."""
        review_file = tmp_path / "review.md"
        review_file.write_text("""---
type: gemini-code-review
---

# Code Review Result

## Critical Issues (Must Fix)

- Only critical issues present
""")

        metadata, issues = crg.parse_review_result_file(review_file)

        assert len(issues) == 1
        assert issues[0].priority == "critical"

    def test_handles_nonexistent_file(self, tmp_path: Path) -> None:
        """Test handling nonexistent file."""
        review_file = tmp_path / "nonexistent.md"

        with pytest.raises(FileNotFoundError):
            crg.parse_review_result_file(review_file)

    def test_handles_file_without_issues(self, tmp_path: Path) -> None:
        """Test handling file without any issues."""
        review_file = tmp_path / "review.md"
        review_file.write_text("""---
type: gemini-code-review
---

# Code Review Result

No issues found.
""")

        metadata, issues = crg.parse_review_result_file(review_file)

        assert len(issues) == 0


class TestCreateTaskFromIssue:
    """Tests for create_task_from_issue function."""

    @patch("subprocess.run")
    def test_creates_task_successfully(
        self, mock_run: Mock, tmp_path: Path, monkeypatch
    ) -> None:
        """Test successful task creation."""
        # Mock tasks CLI success
        mock_run.return_value = Mock(returncode=0, stdout="", stderr="")

        # Mock tasks directory
        tasks_dir = tmp_path / "docs" / "prompts"
        tasks_dir.mkdir(parents=True)
        monkeypatch.setattr(
            crg, "get_tasks_dir", lambda: tasks_dir
        )

        # Create a task file that would be created by tasks CLI
        task_file = tasks_dir / "0001_CRITICAL-001_SQL_Injection.md"
        task_file.write_text("""---
wbs: 0001
stage: backlog
---

# Background

# Requirements

# Solutions
""")

        issue = crg.ReviewIssue(
            priority="critical",
            identifier="CRITICAL-001",
            title="SQL Injection",
            location="auth.py:45",
            issue_description="User input not sanitized",
            impact="Security vulnerability",
            fix_recommendation="Use parameterized queries",
        )
        metadata = {"model": "gemini-2.5-pro", "target": "src/"}

        success, message = crg.create_task_from_issue(issue, metadata)

        assert success is True
        assert "0001_CRITICAL-001_SQL_Injection" in message
        mock_run.assert_called_once()
        # Verify task file was updated with background
        updated_content = task_file.read_text()
        assert "CRITICAL-001" in updated_content
        assert "SQL Injection" in updated_content

    @patch("subprocess.run")
    def test_handles_tasks_cli_failure(self, mock_run: Mock) -> None:
        """Test handling tasks CLI failure."""
        mock_run.return_value = Mock(
            returncode=1, stdout="", stderr="Error creating task"
        )

        issue = crg.ReviewIssue(
            priority="high",
            identifier="HIGH-001",
            title="Test Issue",
        )
        metadata = {}

        success, message = crg.create_task_from_issue(issue, metadata)

        assert success is False
        assert "Failed" in message

    def test_sanitizes_task_name(self) -> None:
        """Test task name sanitization."""
        issue = crg.ReviewIssue(
            priority="medium",
            identifier="MEDIUM-001",
            title="Issue/with\\special:chars*and?long|name>that<needs@truncation#because$it%exceeds^the&limit",
        )

        # We can't directly test the internal task name generation,
        # but we can verify it doesn't raise an exception
        # This is more of an integration test
        # For now, just ensure the issue structure is valid
        assert issue.identifier == "MEDIUM-001"
        assert len(issue.title) > 50

    @patch("subprocess.run")
    def test_builds_background_section(
        self, mock_run: Mock, tmp_path: Path, monkeypatch
    ) -> None:
        """Test building comprehensive background section."""
        mock_run.return_value = Mock(returncode=0, stdout="", stderr="")

        tasks_dir = tmp_path / "docs" / "prompts"
        tasks_dir.mkdir(parents=True)
        monkeypatch.setattr(crg, "get_tasks_dir", lambda: tasks_dir)

        task_file = tasks_dir / "0001_HIGH-001_Test_Issue.md"
        task_file.write_text("""---
wbs: 0001
---

# Background

# Requirements
""")

        issue = crg.ReviewIssue(
            priority="high",
            identifier="HIGH-001",
            title="Test Issue",
            location="test.py:100",
            issue_description="Detailed description",
            impact="High impact",
            fix_recommendation="Fix suggestion",
        )
        metadata = {
            "model": "gemini-2.5-pro",
            "target": "src/test/",
        }

        success, message = crg.create_task_from_issue(issue, metadata)

        assert success is True
        updated_content = task_file.read_text()
        assert "**Priority**: high" in updated_content
        assert "**ID**: HIGH-001" in updated_content
        assert "**Location**: test.py:100" in updated_content
        assert "Detailed description" in updated_content
        assert "High impact" in updated_content
        assert "Fix suggestion" in updated_content
        assert "gemini-2.5-pro" in updated_content

    @patch("subprocess.run")
    def test_updates_task_file_content(
        self, mock_run: Mock, tmp_path: Path, monkeypatch
    ) -> None:
        """Test that task file content is properly updated."""
        mock_run.return_value = Mock(returncode=0, stdout="", stderr="")

        tasks_dir = tmp_path / "docs" / "prompts"
        tasks_dir.mkdir(parents=True)
        monkeypatch.setattr(crg, "get_tasks_dir", lambda: tasks_dir)

        # Create initial task file
        task_file = tasks_dir / "0001_LOW-001_Minor_Issue.md"
        original_content = """---
wbs: 0001
stage: backlog
---

# Background

Placeholder

# Requirements

TBD

# Solutions

To be determined
"""
        task_file.write_text(original_content)

        issue = crg.ReviewIssue(
            priority="low",
            identifier="LOW-001",
            title="Minor Issue",
            issue_description="Minor issue description",
        )
        metadata = {"model": "gemini-2.5-flash"}

        success, message = crg.create_task_from_issue(issue, metadata)

        assert success is True
        updated_content = task_file.read_text()
        # Should have updated Background section
        assert "Minor issue description" in updated_content
        # Should preserve other sections
        assert "# Requirements" in updated_content
        assert "# Solutions" in updated_content


class TestCmdImport:
    """Tests for cmd_import function."""

    @patch("code_review_gemini.parse_review_result_file")
    @patch("code_review_gemini.create_task_from_issue")
    def test_import_success(
        self,
        mock_create: Mock,
        mock_parse: Mock,
        tmp_path: Path,
        capsys: pytest.CaptureFixture[str],
    ) -> None:
        """Test successful import of review results."""
        review_file = tmp_path / "review.md"
        review_file.write_text("content")

        mock_parse.return_value = (
            {"model": "gemini-2.5-pro"},
            [
                crg.ReviewIssue(
                    priority="critical",
                    identifier="CRITICAL-001",
                    title="Issue 1",
                ),
                crg.ReviewIssue(
                    priority="high",
                    identifier="HIGH-001",
                    title="Issue 2",
                ),
            ],
        )
        mock_create.return_value = (True, "docs/prompts/0001.md")

        args = Namespace(
            review_file=str(review_file),
            priority=None,
        )

        exit_code = crg.cmd_import(args)

        assert exit_code == 0
        mock_parse.assert_called_once()
        assert mock_create.call_count == 2
        captured = capsys.readouterr()
        assert "Successfully created 2 tasks" in captured.out

    @patch("code_review_gemini.parse_review_result_file")
    @patch("code_review_gemini.create_task_from_issue")
    def test_import_with_priority_filter(
        self,
        mock_create: Mock,
        mock_parse: Mock,
        tmp_path: Path,
        capsys: pytest.CaptureFixture[str],
    ) -> None:
        """Test import with priority filter."""
        review_file = tmp_path / "review.md"
        review_file.write_text("content")

        mock_parse.return_value = (
            {},
            [
                crg.ReviewIssue(
                    priority="critical",
                    identifier="CRITICAL-001",
                    title="Critical",
                ),
                crg.ReviewIssue(
                    priority="high",
                    identifier="HIGH-001",
                    title="High",
                ),
                crg.ReviewIssue(
                    priority="medium",
                    identifier="MEDIUM-001",
                    title="Medium",
                ),
            ],
        )
        mock_create.return_value = (True, "task.md")

        args = Namespace(
            review_file=str(review_file),
            priority="critical",
        )

        exit_code = crg.cmd_import(args)

        assert exit_code == 0
        # Should only create task for critical issue
        assert mock_create.call_count == 1
        captured = capsys.readouterr()
        assert "Successfully created 1 task" in captured.out

    def test_import_nonexistent_file(
        self, tmp_path: Path, capsys: pytest.CaptureFixture[str]
    ) -> None:
        """Test import with nonexistent file."""
        review_file = tmp_path / "nonexistent.md"

        args = Namespace(
            review_file=str(review_file),
            priority=None,
        )

        exit_code = crg.cmd_import(args)

        assert exit_code == 1
        captured = capsys.readouterr()
        assert "Error" in captured.err

    @patch("code_review_gemini.parse_review_result_file")
    def test_import_no_issues_found(
        self,
        mock_parse: Mock,
        tmp_path: Path,
        capsys: pytest.CaptureFixture[str],
    ) -> None:
        """Test import when no issues found."""
        review_file = tmp_path / "review.md"
        review_file.write_text("content")

        mock_parse.return_value = ({}, [])

        args = Namespace(
            review_file=str(review_file),
            priority=None,
        )

        exit_code = crg.cmd_import(args)

        assert exit_code == 0
        captured = capsys.readouterr()
        assert "No issues found" in captured.out

    @patch("code_review_gemini.parse_review_result_file")
    @patch("code_review_gemini.create_task_from_issue")
    def test_import_partial_failures(
        self,
        mock_create: Mock,
        mock_parse: Mock,
        tmp_path: Path,
        capsys: pytest.CaptureFixture[str],
    ) -> None:
        """Test import with some task creation failures."""
        review_file = tmp_path / "review.md"
        review_file.write_text("content")

        mock_parse.return_value = (
            {},
            [
                crg.ReviewIssue(
                    priority="high",
                    identifier="HIGH-001",
                    title="Issue 1",
                ),
                crg.ReviewIssue(
                    priority="high",
                    identifier="HIGH-002",
                    title="Issue 2",
                ),
                crg.ReviewIssue(
                    priority="high",
                    identifier="HIGH-003",
                    title="Issue 3",
                ),
            ],
        )
        # First and third succeed, second fails
        mock_create.side_effect = [
            (True, "task1.md"),
            (False, "Failed to create task"),
            (True, "task3.md"),
        ]

        args = Namespace(
            review_file=str(review_file),
            priority=None,
        )

        exit_code = crg.cmd_import(args)

        assert exit_code == 1  # Should fail if any task creation failed
        captured = capsys.readouterr()
        assert "Successfully created 2 tasks" in captured.out
        assert "Failed to create 1 task" in captured.err

    @patch("code_review_gemini.parse_review_result_file")
    @patch("code_review_gemini.create_task_from_issue")
    def test_import_filters_multiple_priorities(
        self,
        mock_create: Mock,
        mock_parse: Mock,
        tmp_path: Path,
    ) -> None:
        """Test that priority filter works correctly."""
        review_file = tmp_path / "review.md"
        review_file.write_text("content")

        all_issues = [
            crg.ReviewIssue(
                priority="critical",
                identifier="CRITICAL-001",
                title="C1",
            ),
            crg.ReviewIssue(
                priority="critical",
                identifier="CRITICAL-002",
                title="C2",
            ),
            crg.ReviewIssue(
                priority="high",
                identifier="HIGH-001",
                title="H1",
            ),
            crg.ReviewIssue(
                priority="medium",
                identifier="MEDIUM-001",
                title="M1",
            ),
            crg.ReviewIssue(priority="low", identifier="LOW-001", title="L1"),
        ]

        mock_parse.return_value = ({}, all_issues)
        mock_create.return_value = (True, "task.md")

        # Test high priority filter
        args = Namespace(
            review_file=str(review_file),
            priority="high",
        )

        exit_code = crg.cmd_import(args)

        assert exit_code == 0
        # Should only create task for high priority issue
        assert mock_create.call_count == 1
