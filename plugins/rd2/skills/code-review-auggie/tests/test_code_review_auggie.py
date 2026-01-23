"""Unit tests for code-review-auggie.py

Tests all 5 commands:
- check: Validate Auggie MCP availability
- run: Execute short prompts
- run-file: Execute long prompts from file
- review: Comprehensive code review
- import: Convert reviews to tasks
"""

import json
import tempfile
import unittest.mock as mock
from pathlib import Path
from unittest import TestCase

# Module is loaded via conftest.py using importlib
from code_review_auggie import (
    AUGGIE_MCP_SERVER_NAME,
    AUGGIE_MCP_TOOL_NAME,
    CheckResult,
    PLANS_DIR,
    ReviewIssue,
    RunResult,
    TIMEOUT_MODERATE,
    TIMEOUT_SIMPLE,
    build_review_prompt,
    check_auggie_mcp_availability,
    create_task_from_issue,
    ensure_plans_dir,
    extract_issues_from_section,
    extract_review_sections,
    format_review_with_template,
    gather_file_info,
    get_assets_dir,
    get_claude_mcp_servers,
    get_script_dir,
    get_tasks_dir,
    load_prompt_template,
    parse_yaml_frontmatter,
    parse_review_result_file,
    run_auggie_from_file,
    run_auggie_prompt,
    save_to_plan,
    _build_issue_from_dict,
    generate_temp_path,
)


###############################################################################
# TEST RESULT TYPES
###############################################################################


class TestCheckResult(TestCase):
    """Test CheckResult named tuple."""

    def test_check_result_creation(self) -> None:
        """Test creating a CheckResult."""
        result = CheckResult(
            available=True,
            message="auggie-mcp ready",
            server_name="auggie-mcp",
            tool_names=["codebase-retrieval"],
        )
        self.assertTrue(result.available)
        self.assertEqual(result.message, "auggie-mcp ready")
        self.assertEqual(result.server_name, "auggie-mcp")
        self.assertEqual(result.tool_names, ["codebase-retrieval"])

    def test_check_result_unavailable(self) -> None:
        """Test CheckResult for unavailable service."""
        result = CheckResult(
            available=False,
            message="Auggie MCP not configured",
            server_name=None,
            tool_names=None,
        )
        self.assertFalse(result.available)
        self.assertIsNone(result.server_name)
        self.assertIsNone(result.tool_names)


class TestRunResult(TestCase):
    """Test RunResult named tuple."""

    def test_run_result_success(self) -> None:
        """Test RunResult for successful execution."""
        result = RunResult(
            success=True,
            output="This is the output",
            error=None,
        )
        self.assertTrue(result.success)
        self.assertEqual(result.output, "This is the output")
        self.assertIsNone(result.error)

    def test_run_result_failure(self) -> None:
        """Test RunResult for failed execution."""
        result = RunResult(
            success=False,
            output="",
            error="Command failed",
        )
        self.assertFalse(result.success)
        self.assertEqual(result.error, "Command failed")


class TestReviewIssue(TestCase):
    """Test ReviewIssue named tuple."""

    def test_review_issue_full(self) -> None:
        """Test ReviewIssue with all fields."""
        issue = ReviewIssue(
            priority="critical",
            identifier="CRITICAL-001",
            title="SQL Injection Vulnerability",
            location="src/auth/login.py:45",
            issue_description="User input not sanitized",
            impact="Allows arbitrary SQL execution",
            fix_recommendation="Use parameterized queries",
            raw_content="Full issue details here",
        )
        self.assertEqual(issue.priority, "critical")
        self.assertEqual(issue.identifier, "CRITICAL-001")
        self.assertEqual(issue.title, "SQL Injection Vulnerability")
        self.assertEqual(issue.location, "src/auth/login.py:45")

    def test_review_issue_minimal(self) -> None:
        """Test ReviewIssue with minimal fields."""
        issue = ReviewIssue(
            priority="low",
            identifier="LOW-001",
            title="Minor style issue",
        )
        self.assertEqual(issue.priority, "low")
        self.assertIsNone(issue.location)
        self.assertIsNone(issue.fix_recommendation)


###############################################################################
# TEST UTILITY FUNCTIONS
###############################################################################


class TestUtilityFunctions(TestCase):
    """Test utility functions."""

    def test_generate_temp_path(self) -> None:
        """Test temp path generation."""
        path = generate_temp_path("test")
        self.assertTrue(path.name.startswith("test-"))
        self.assertTrue(path.suffix == ".txt")

    def test_ensure_plans_dir(self) -> None:
        """Test plans directory creation."""
        with tempfile.TemporaryDirectory() as tmpdir:
            original = PLANS_DIR
            import code_review_auggie
            code_review_auggie.PLANS_DIR = Path(tmpdir) / "plans"

            try:
                result = ensure_plans_dir()
                self.assertTrue(result.exists())
                self.assertTrue(result.is_dir())
            finally:
                code_review_auggie.PLANS_DIR = original

    def test_get_script_dir(self) -> None:
        """Test getting script directory."""
        result = get_script_dir()
        self.assertTrue(result.exists())
        self.assertTrue((result / "code-review-auggie.py").exists())

    def test_get_assets_dir(self) -> None:
        """Test getting assets directory."""
        result = get_assets_dir()
        self.assertTrue(result.exists())
        self.assertTrue((result / "review_prompt.md").exists())

    def test_load_prompt_template(self) -> None:
        """Test loading prompt template."""
        result = load_prompt_template("review_prompt")
        self.assertIsNotNone(result)
        self.assertIn("You are an expert code reviewer", result)

    def test_load_nonexistent_template(self) -> None:
        """Test loading non-existent template returns None."""
        result = load_prompt_template("nonexistent")
        self.assertIsNone(result)


###############################################################################
# TEST CHECK COMMAND
###############################################################################


class TestCheckCommand(TestCase):
    """Test check command functionality."""

    def test_get_claude_mcp_servers_success(self) -> None:
        """Test getting MCP servers list successfully."""
        mock_output = json.dumps({
            "servers": {
                "auggie-mcp": {
                    "tools": ["codebase-retrieval"],
                },
            },
        })

        with mock.patch("subprocess.run") as mock_run:
            mock_run.return_value = mock.Mock(
                returncode=0,
                stdout=mock_output,
            )
            servers = get_claude_mcp_servers()
            self.assertIn("auggie-mcp", servers)

    def test_get_claude_mcp_servers_failure(self) -> None:
        """Test getting MCP servers when command fails."""
        with mock.patch("subprocess.run") as mock_run:
            mock_run.side_effect = FileNotFoundError()
            servers = get_claude_mcp_servers()
            self.assertEqual(servers, {})

    def test_check_auggie_available(self) -> None:
        """Test check when Auggie MCP is available."""
        mock_servers = {
            AUGGIE_MCP_SERVER_NAME: {
                "tools": [AUGGIE_MCP_TOOL_NAME],
            },
        }

        with mock.patch("code_review_auggie.get_claude_mcp_servers", return_value=mock_servers):
            result = check_auggie_mcp_availability()
            self.assertTrue(result.available)
            self.assertIn("ready", result.message.lower())

    def test_check_auggie_not_configured(self) -> None:
        """Test check when Auggie MCP is not configured."""
        with mock.patch("code_review_auggie.get_claude_mcp_servers", return_value={}):
            result = check_auggie_mcp_availability()
            self.assertFalse(result.available)
            self.assertIn("not configured", result.message)

    def test_check_auggie_missing_tool(self) -> None:
        """Test check when Auggie MCP exists but tool is missing."""
        mock_servers = {
            AUGGIE_MCP_SERVER_NAME: {
                "tools": ["other-tool"],
            },
        }

        with mock.patch("code_review_auggie.get_claude_mcp_servers", return_value=mock_servers):
            result = check_auggie_mcp_availability()
            self.assertFalse(result.available)
            self.assertIn("tool not found", result.message.lower())


###############################################################################
# TEST RUN COMMAND
###############################################################################


class TestRunCommand(TestCase):
    """Test run command functionality."""

    def test_run_auggie_prompt_success(self) -> None:
        """Test running a prompt successfully."""
        with mock.patch("subprocess.run") as mock_run:
            mock_run.return_value = mock.Mock(
                returncode=0,
                stdout="This is the answer",
            )
            result = run_auggie_prompt("Test prompt", timeout=TIMEOUT_SIMPLE)
            self.assertTrue(result.success)
            self.assertEqual(result.output, "This is the answer")

    def test_run_auggie_prompt_failure(self) -> None:
        """Test running a prompt that fails."""
        with mock.patch("subprocess.run") as mock_run:
            mock_run.return_value = mock.Mock(
                returncode=1,
                stdout="",
                stderr="Command failed",
            )
            result = run_auggie_prompt("Test prompt", timeout=TIMEOUT_SIMPLE)
            self.assertFalse(result.success)
            self.assertEqual(result.error, "Command failed")

    def test_run_auggie_prompt_timeout(self) -> None:
        """Test running a prompt that times out."""
        import subprocess
        with mock.patch("subprocess.run") as mock_run:
            mock_run.side_effect = subprocess.TimeoutExpired("claude", TIMEOUT_SIMPLE)
            result = run_auggie_prompt("Test prompt", timeout=TIMEOUT_SIMPLE)
            self.assertFalse(result.success)
            self.assertIn("timed out", result.error.lower())


###############################################################################
# TEST RUN-FILE COMMAND
###############################################################################


class TestRunFileCommand(TestCase):
    """Test run-file command functionality."""

    def test_run_auggie_from_file_success(self) -> None:
        """Test running from file successfully."""
        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".txt") as f:
            f.write("Long prompt content")
            prompt_file = Path(f.name)

        try:
            with mock.patch("subprocess.run") as mock_run:
                mock_run.return_value = mock.Mock(
                    returncode=0,
                    stdout="Response content",
                )
                result = run_auggie_from_file(prompt_file, timeout=TIMEOUT_MODERATE)
                self.assertTrue(result.success)
                self.assertEqual(result.output, "Response content")
        finally:
            prompt_file.unlink()

    def test_run_auggie_from_file_not_found(self) -> None:
        """Test running from non-existent file."""
        result = run_auggie_from_file(Path("/nonexistent/file.txt"))
        self.assertFalse(result.success)
        self.assertIn("not found", result.error.lower())

    def test_run_auggie_from_file_with_output(self) -> None:
        """Test running from file with output file."""
        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".txt") as f:
            f.write("Long prompt content")
            prompt_file = Path(f.name)

        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".txt") as f:
            output_file = Path(f.name)

        try:
            with mock.patch("subprocess.run") as mock_run:
                mock_run.return_value = mock.Mock(
                    returncode=0,
                    stdout="Response content",
                )
                result = run_auggie_from_file(
                    prompt_file,
                    timeout=TIMEOUT_MODERATE,
                    output_file=output_file,
                )
                self.assertTrue(result.success)
                self.assertTrue(output_file.exists())
                self.assertEqual(output_file.read_text(), "Response content")
        finally:
            prompt_file.unlink()
            if output_file.exists():
                output_file.unlink()


###############################################################################
# TEST REVIEW COMMAND
###############################################################################


class TestReviewCommand(TestCase):
    """Test review command functionality."""

    def test_extract_review_sections_full(self) -> None:
        """Test extracting sections from full review output."""
        content = """
## Executive Summary
This is a summary.

## Critical Issues (Must Fix)
**[CRITICAL-001]** SQL Injection
- **Location**: file.py:10
- **Issue**: User input not sanitized

## Security Analysis
Security looks good overall.

Quality Score: 8/10
Recommendation: Request Changes
"""
        sections = extract_review_sections(content)
        self.assertIn("summary", sections["executive_summary"].lower())
        self.assertIn("SQL Injection", sections["critical_issues"])
        self.assertIn("Security", sections["security_analysis"])
        self.assertEqual(sections["quality_score"], "8")
        self.assertEqual(sections["recommendation"], "Request Changes")

    def test_extract_review_sections_minimal(self) -> None:
        """Test extracting sections from minimal output."""
        content = "Simple output without structured sections."
        sections = extract_review_sections(content)
        self.assertEqual(sections["executive_summary"], content.strip())

    def test_format_review_with_template(self) -> None:
        """Test formatting review with template."""
        content = """
## Executive Summary
Review complete.

## Critical Issues (Must Fix)
No critical issues.

Quality Score: 9/10
Recommendation: Approve
"""
        result = format_review_with_template(
            content=content,
            target="src/auth/",
            mode="review",
            focus_areas=["security"],
            files_count=5,
            duration="30s",
        )
        self.assertIn("---", result)  # YAML frontmatter
        self.assertIn("src/auth/", result)
        self.assertIn("review", result.lower())

    def test_build_review_prompt_review_mode(self) -> None:
        """Test building review prompt for review mode."""
        prompt = build_review_prompt(
            target="src/auth/",
            mode="review",
            focus_areas=["security", "performance"],
        )
        self.assertIn("src/auth/", prompt)
        self.assertIn("security", prompt.lower())
        self.assertIn("performance", prompt.lower())

    def test_build_review_prompt_planning_mode(self) -> None:
        """Test building review prompt for planning mode."""
        prompt = build_review_prompt(
            target="src/",
            mode="planning",
            focus_areas=None,
        )
        self.assertIn("src/", prompt)
        self.assertIn("architecture", prompt.lower())
        self.assertIn("implementation plan", prompt.lower())

    def test_gather_file_info_directory(self) -> None:
        """Test gathering file info from directory."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)
            (tmpdir_path / "test.py").write_text("# Python file")
            (tmpdir_path / "test.js").write_text("// JS file")

            count, files = gather_file_info(tmpdir)
            self.assertEqual(count, 2)
            self.assertTrue(any(f.name == "test.py" for f in files))
            self.assertTrue(any(f.name == "test.js" for f in files))

    def test_gather_file_info_file(self) -> None:
        """Test gathering file info from single file."""
        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".py") as f:
            f.write("# Python file")
            file_path = Path(f.name)

        try:
            count, files = gather_file_info(file_path)
            self.assertEqual(count, 1)
            self.assertEqual(files[0], file_path)
        finally:
            file_path.unlink()

    def test_save_to_plan(self) -> None:
        """Test saving content to plan file."""
        content = "# Test Plan\n\nThis is a test plan."

        with tempfile.TemporaryDirectory() as tmpdir:
            import code_review_auggie
            original = PLANS_DIR
            code_review_auggie.PLANS_DIR = Path(tmpdir) / "plans"

            try:
                plan_path = save_to_plan(content, "test-plan")
                self.assertTrue(plan_path.exists())
                self.assertEqual(plan_path.read_text(), content)
                self.assertTrue(plan_path.name.startswith("test-plan"))
                self.assertTrue(plan_path.suffix == ".md")
            finally:
                code_review_auggie.PLANS_DIR = original


###############################################################################
# TEST IMPORT COMMAND
###############################################################################


class TestImportCommand(TestCase):
    """Test import command functionality."""

    def test_parse_yaml_frontmatter_with_frontmatter(self) -> None:
        """Test parsing YAML frontmatter."""
        content = """---
type: auggie-code-review
target: src/auth/
mode: review
---

# Review Content
"""
        metadata, body = parse_yaml_frontmatter(content)
        self.assertEqual(metadata["type"], "auggie-code-review")
        self.assertEqual(metadata["target"], "src/auth/")
        self.assertEqual(metadata["mode"], "review")
        self.assertIn("Review Content", body)

    def test_parse_yaml_frontmatter_without_frontmatter(self) -> None:
        """Test parsing content without frontmatter."""
        content = "# Just content\n\nNo frontmatter here."
        metadata, body = parse_yaml_frontmatter(content)
        self.assertEqual(metadata, {})
        self.assertEqual(body, content)

    def test_extract_issues_from_section_structured(self) -> None:
        """Test extracting structured issues."""
        content = """
**[CRITICAL-001]** SQL Injection Vulnerability
- **Location**: src/auth/login.py:45
- **Issue**: User input directly concatenated into SQL query
- **Impact**: Allows attackers to execute arbitrary SQL
- **Fix**: Use parameterized queries or ORM

**[CRITICAL-002]** Missing Authentication
- **Location**: src/api/admin.py:10
- **Issue**: No authentication check on admin endpoint
"""
        issues = extract_issues_from_section(content, "critical")
        self.assertEqual(len(issues), 2)
        self.assertEqual(issues[0].identifier, "CRITICAL-001")
        self.assertEqual(issues[0].title, "SQL Injection Vulnerability")
        self.assertEqual(issues[0].location, "src/auth/login.py:45")
        self.assertEqual(issues[0].issue_description, "User input directly concatenated into SQL query")

    def test_extract_issues_from_section_simple(self) -> None:
        """Test extracting simple bullet issues."""
        content = """
- Missing input validation on user registration form
- No rate limiting on API endpoints
- Passwords stored without hashing
"""
        issues = extract_issues_from_section(content, "high")
        self.assertEqual(len(issues), 3)
        self.assertEqual(issues[0].priority, "high")
        self.assertIn("input validation", issues[0].title.lower())

    def test_extract_issues_from_section_empty(self) -> None:
        """Test extracting issues from empty section."""
        issues = extract_issues_from_section("No critical issues identified.", "critical")
        self.assertEqual(len(issues), 0)

    def test_build_issue_from_dict(self) -> None:
        """Test building ReviewIssue from dict."""
        issue_dict = {
            "identifier": "HIGH-001",
            "title": "Performance Issue",
            "location": "src/utils.py:100",
            "issue": "Inefficient loop",
            "impact": "Slow response time",
            "fix": "Use list comprehension",
        }
        issue = _build_issue_from_dict(
            issue_dict=issue_dict,
            content_lines=["Additional context"],
            priority="high",
            counter=1,
        )
        self.assertEqual(issue.identifier, "HIGH-001")
        self.assertEqual(issue.title, "Performance Issue")
        self.assertEqual(issue.location, "src/utils.py:100")

    def test_parse_review_result_file(self) -> None:
        """Test parsing a complete review result file."""
        content = """---
type: auggie-code-review
target: src/auth/
mode: review
---

## Critical Issues (Must Fix)

**[CRITICAL-001]** SQL Injection Vulnerability
- **Location**: src/auth/login.py:45
- **Issue**: User input directly concatenated into SQL query

## High Priority Issues (Should Fix)

- Missing input validation on user registration form
"""
        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".md") as f:
            f.write(content)
            file_path = Path(f.name)

        try:
            metadata, issues = parse_review_result_file(file_path)
            self.assertEqual(metadata["type"], "auggie-code-review")
            self.assertEqual(len(issues), 2)
            self.assertEqual(issues[0].priority, "critical")
            self.assertEqual(issues[1].priority, "high")
        finally:
            file_path.unlink()

    def test_get_tasks_dir(self) -> None:
        """Test getting tasks directory."""
        result = get_tasks_dir()
        self.assertEqual(result, Path("docs/prompts"))

    def test_create_task_from_issue(self) -> None:
        """Test creating a task from an issue."""
        issue = ReviewIssue(
            priority="critical",
            identifier="CRITICAL-001",
            title="SQL Injection",
            location="src/auth.py:45",
            issue_description="User input not sanitized",
            impact="Security risk",
            fix_recommendation="Use parameterized queries",
        )
        metadata = {"target": "src/auth/", "type": "auggie-code-review"}

        with tempfile.TemporaryDirectory() as tmpdir:
            tasks_dir = Path(tmpdir)

            # Mock get_tasks_dir to return our temp directory
            with mock.patch("code_review_auggie.get_tasks_dir", return_value=tasks_dir):
                # Mock subprocess.run to simulate tasks create command
                def mock_subprocess_run(*args, **kwargs):
                    """Mock subprocess.run to create the expected task file."""
                    # Create the task file that tasks CLI would create
                    task_file = tasks_dir / "0001_CRITICAL-001_SQL_Injection.md"
                    task_file.write_text("# Background\n\nDefault content\n\n# Requirements\n\nDefault requirements")
                    return mock.Mock(returncode=0, stdout="", stderr="")

                with mock.patch("subprocess.run", side_effect=mock_subprocess_run):
                    success, message = create_task_from_issue(issue, metadata)
                    self.assertTrue(success)
                    self.assertIn("SQL_Injection", message)


###############################################################################
# TEST INTEGRATION
###############################################################################


class TestIntegration(TestCase):
    """Integration tests for command workflows."""

    def test_check_to_run_workflow(self) -> None:
        """Test workflow: check availability then run prompt."""
        mock_servers = {
            AUGGIE_MCP_SERVER_NAME: {
                "tools": [AUGGIE_MCP_TOOL_NAME],
            },
        }

        with mock.patch("code_review_auggie.get_claude_mcp_servers", return_value=mock_servers):
            # Check availability
            check_result = check_auggie_mcp_availability()
            self.assertTrue(check_result.available)

        # Run prompt
        with mock.patch("subprocess.run") as mock_run:
            mock_run.return_value = mock.Mock(
                returncode=0,
                stdout="Answer",
            )
            run_result = run_auggie_prompt("Test prompt")
            self.assertTrue(run_result.success)

    def test_review_to_import_workflow(self) -> None:
        """Test workflow: review then import issues."""
        # Simulate review output
        review_content = """---
type: auggie-code-review
target: src/auth/
mode: review
---

## Critical Issues (Must Fix)

**[CRITICAL-001]** SQL Injection
- **Location**: src/auth.py:45
- **Issue**: User input not sanitized
- **Fix**: Use parameterized queries
"""

        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".md") as f:
            f.write(review_content)
            review_file = Path(f.name)

        try:
            _metadata, issues = parse_review_result_file(review_file)
            self.assertEqual(len(issues), 1)
            self.assertEqual(issues[0].priority, "critical")
        finally:
            review_file.unlink()


if __name__ == "__main__":
    import unittest
    unittest.main()
