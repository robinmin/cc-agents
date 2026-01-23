#!/usr/bin/env python3
"""
Auggie Code Review Utility - CLI tool for Auggie MCP-powered code review and planning.

Usage:
    python3 code-review-auggie.py <command> [options]

Commands:
    check                    Validate Auggie MCP availability
    run <prompt>             Run a short prompt via Auggie MCP
    run-file <prompt_file>   Run a long prompt from a file
    review <target>          Comprehensive code review
    import <review_file>     Convert review results to tasks

Examples:
    python3 code-review-auggie.py check
    python3 code-review-auggie.py run "Explain this function"
    python3 code-review-auggie.py run-file prompt.txt
    python3 code-review-auggie.py review src/auth/ --output plan.md
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Literal, NamedTuple


###############################################################################
# CONSTANTS
###############################################################################

# Timeout settings (in seconds)
TIMEOUT_SIMPLE = 300  # 5 minutes
TIMEOUT_MODERATE = 600  # 10 minutes
TIMEOUT_COMPLEX = 900  # 15 minutes

# Plans output directory
PLANS_DIR = Path(".claude/plans")

# MCP server name for Auggie
AUGGIE_MCP_SERVER_NAME = "auggie-mcp"
AUGGIE_MCP_TOOL_NAME = "codebase-retrieval"

# Claude Code CLI path
CLAUDE_CLI = "claude"


###############################################################################
# RESULT TYPES
###############################################################################


class CheckResult(NamedTuple):
    """Result of Auggie MCP availability check."""

    available: bool
    message: str
    server_name: str | None = None
    tool_names: list[str] | None = None


class RunResult(NamedTuple):
    """Result of running an Auggie prompt."""

    success: bool
    output: str
    error: str | None = None


###############################################################################
# UTILITY FUNCTIONS
###############################################################################


def generate_temp_path(prefix: str = "auggie") -> Path:
    """Generate a unique temporary file path."""
    import random
    random_suffix = f"{random.randint(10000, 99999)}{random.randint(10000, 99999)}"
    return Path(tempfile.gettempdir()) / f"{prefix}-{random_suffix}.txt"


def ensure_plans_dir() -> Path:
    """Ensure the plans directory exists and return its path."""
    plans_path = PLANS_DIR
    plans_path.mkdir(parents=True, exist_ok=True)
    return plans_path


def get_script_dir() -> Path:
    """Get the directory containing this script."""
    return Path(__file__).parent.resolve()


def get_assets_dir() -> Path:
    """Get the assets directory for prompt templates."""
    return get_script_dir().parent / "assets"


def load_prompt_template(template_name: str) -> str | None:
    """Load a prompt template from the assets directory."""
    assets_dir = get_assets_dir()
    template_path = assets_dir / f"{template_name}.md"
    if template_path.exists():
        return template_path.read_text()
    return None


###############################################################################
# CHECK COMMAND
###############################################################################


def get_claude_mcp_servers() -> dict[str, dict]:
    """
    Get list of configured MCP servers from Claude Code.

    Returns:
        Dictionary mapping server names to their configurations.
    """
    try:
        result = subprocess.run(
            [CLAUDE_CLI, "mcp", "list", "--json"],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode == 0:
            try:
                servers = json.loads(result.stdout)
                return servers.get("servers", {})
            except json.JSONDecodeError:
                pass
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass
    return {}


def check_auggie_mcp_availability() -> CheckResult:
    """
    Validate Auggie MCP availability.

    Returns:
        CheckResult with availability status and message.
    """
    # Check if claude CLI exists
    claude_path = shutil.which(CLAUDE_CLI)
    if not claude_path:
        return CheckResult(
            available=False,
            message="""ERROR: Claude Code CLI is not installed or not in PATH.

Please install Claude Code to use MCP servers.
See: https://github.com/anthropics/claude-code
""",
        )

    # Get configured MCP servers
    servers = get_claude_mcp_servers()

    # Check if auggie-mcp is configured
    if AUGGIE_MCP_SERVER_NAME not in servers:
        # Try alternative names by searching for auggie/augmentcode in server names
        found_name = None
        for name in servers:
            if "auggie" in name.lower() or "augmentcode" in name.lower():
                found_name = name
                break

        if found_name:
            server_info = servers[found_name]
            tool_names = server_info.get("tools", [])
            has_codebase_tool = AUGGIE_MCP_TOOL_NAME in tool_names or "codebase_retrieval" in tool_names

            if has_codebase_tool:
                return CheckResult(
                    available=True,
                    message=f"auggie-mcp ready (found as '{found_name}')",
                    server_name=found_name,
                    tool_names=tool_names,
                )

        return CheckResult(
            available=False,
            message=f"""ERROR: Auggie MCP server ('{AUGGIE_MCP_SERVER_NAME}') is not configured.

To add Auggie MCP server:
  claude mcp add-json {AUGGIE_MCP_SERVER_NAME} --scope user '{{"type":"stdio","command":"auggie","args":["--mcp"]}}'

Or with workspace specification:
  claude mcp add-json {AUGGIE_MCP_SERVER_NAME} --scope user '{{"type":"stdio","command":"auggie","args":["-w","/path/to/project","--mcp"]}}'

Documentation: https://docs.augmentcode.com/context-services/mcp/quickstart-claude-code

Available MCP servers: {', '.join(servers.keys()) or 'None'}
""",
            server_name=None,
            tool_names=list(servers.keys()),
        )

    # Auggie MCP server is configured
    server_info = servers[AUGGIE_MCP_SERVER_NAME]
    tool_names = server_info.get("tools", [])

    # Check for codebase-retrieval tool
    has_codebase_tool = (
        AUGGIE_MCP_TOOL_NAME in tool_names or
        "codebase_retrieval" in tool_names or
        "codebaseRetrieval" in tool_names
    )

    if not has_codebase_tool:
        return CheckResult(
            available=False,
            message=f"""ERROR: Auggie MCP server is configured but '{AUGGIE_MCP_TOOL_NAME}' tool not found.

Available tools: {', '.join(tool_names) or 'None'}

This may indicate the Auggie MCP server is not running correctly.
Try restarting Claude Code or checking the Auggie installation.
""",
            server_name=AUGGIE_MCP_SERVER_NAME,
            tool_names=tool_names,
        )

    return CheckResult(
        available=True,
        message="auggie-mcp ready",
        server_name=AUGGIE_MCP_SERVER_NAME,
        tool_names=tool_names,
    )


def cmd_check(args: argparse.Namespace) -> int:
    """Handle check command."""
    result = check_auggie_mcp_availability()

    if result.available:
        print(result.message)
        if args.verbose:
            if result.server_name:
                print(f"Server: {result.server_name}")
            if result.tool_names:
                print(f"Tools: {', '.join(result.tool_names)}")
        return 0
    else:
        print(result.message, file=sys.stderr)
        return 1


###############################################################################
# RUN COMMAND (Short Prompts)
###############################################################################


def run_auggie_prompt(
    prompt: str,
    timeout: int = TIMEOUT_SIMPLE,
) -> RunResult:
    """
    Run a prompt via Auggie MCP using Claude Code.

    Args:
        prompt: The prompt text to send.
        timeout: Timeout in seconds.

    Returns:
        RunResult with success status and output.
    """
    # Create a temporary file with the prompt
    prompt_file = generate_temp_path("auggie-prompt")
    prompt_file.write_text(prompt)

    try:
        # Use Claude Code's ask command with the prompt
        # We pipe the prompt to claude ask command
        result = subprocess.run(
            [CLAUDE_CLI, "ask", prompt],
            capture_output=True,
            text=True,
            timeout=timeout,
        )

        if result.returncode == 0:
            return RunResult(
                success=True,
                output=result.stdout,
            )
        else:
            return RunResult(
                success=False,
                output=result.stdout,
                error=result.stderr,
            )
    except subprocess.TimeoutExpired:
        return RunResult(
            success=False,
            output="",
            error=f"Auggie MCP timed out after {timeout} seconds",
        )
    except Exception as e:
        return RunResult(
            success=False,
            output="",
            error=str(e),
        )
    finally:
        # Clean up temp file
        try:
            prompt_file.unlink()
        except Exception:
            pass


def cmd_run(args: argparse.Namespace) -> int:
    """Handle run command for short prompts."""
    # Check Auggie availability first
    check_result = check_auggie_mcp_availability()
    if not check_result.available:
        print(check_result.message, file=sys.stderr)
        return 1

    # Determine timeout
    timeout = TIMEOUT_SIMPLE
    if hasattr(args, "timeout") and args.timeout:
        timeout = args.timeout

    result = run_auggie_prompt(
        prompt=args.prompt,
        timeout=timeout,
    )

    if result.success:
        print(result.output)

        # Save to plan file if requested
        if hasattr(args, "save") and args.save:
            save_to_plan(result.output, args.save)

        return 0
    else:
        if result.output:
            print(result.output)
        if result.error:
            print(f"Error: {result.error}", file=sys.stderr)
        return 1


###############################################################################
# RUN-FILE COMMAND (Long Prompts)
###############################################################################


def run_auggie_from_file(
    prompt_file: Path,
    timeout: int = TIMEOUT_MODERATE,
    output_file: Path | None = None,
) -> RunResult:
    """
    Run a long prompt from a file via Auggie MCP.

    Args:
        prompt_file: Path to the prompt file.
        timeout: Timeout in seconds.
        output_file: Optional path to save output.

    Returns:
        RunResult with success status and output.
    """
    if not prompt_file.exists():
        return RunResult(
            success=False,
            output="",
            error=f"Prompt file not found: {prompt_file}",
        )

    prompt_content = prompt_file.read_text()

    try:
        result = subprocess.run(
            [CLAUDE_CLI, "ask", prompt_content],
            capture_output=True,
            text=True,
            timeout=timeout,
        )

        output = result.stdout

        # Save to output file if specified
        if output_file and result.returncode == 0:
            output_file.parent.mkdir(parents=True, exist_ok=True)
            output_file.write_text(output)

        if result.returncode == 0:
            return RunResult(
                success=True,
                output=output,
            )
        else:
            return RunResult(
                success=False,
                output=output,
                error=result.stderr,
            )
    except subprocess.TimeoutExpired:
        return RunResult(
            success=False,
            output="",
            error=f"Auggie MCP timed out after {timeout} seconds",
        )
    except Exception as e:
        return RunResult(
            success=False,
            output="",
            error=str(e),
        )


def cmd_run_file(args: argparse.Namespace) -> int:
    """Handle run-file command for long prompts."""
    # Check Auggie availability first
    check_result = check_auggie_mcp_availability()
    if not check_result.available:
        print(check_result.message, file=sys.stderr)
        return 1

    prompt_file = Path(args.prompt_file)
    output_file = Path(args.output) if args.output else None

    # Determine timeout
    timeout = TIMEOUT_MODERATE
    if hasattr(args, "timeout") and args.timeout:
        timeout = args.timeout

    result = run_auggie_from_file(
        prompt_file=prompt_file,
        timeout=timeout,
        output_file=output_file,
    )

    if result.success:
        if output_file:
            print(f"Output saved to: {output_file}")
        else:
            print(result.output)
        return 0
    else:
        if result.output:
            print(result.output)
        if result.error:
            print(f"Error: {result.error}", file=sys.stderr)
        return 1


###############################################################################
# REVIEW COMMAND (Comprehensive Code Review)
###############################################################################


def extract_review_sections(content: str) -> dict[str, str]:
    """
    Extract structured sections from Auggie's review output.

    Args:
        content: Raw review output from Auggie.

    Returns:
        Dictionary with extracted sections.
    """
    sections = {
        "executive_summary": "",
        "critical_issues": "",
        "high_priority_issues": "",
        "medium_priority_issues": "",
        "low_priority_issues": "",
        "security_analysis": "",
        "performance_review": "",
        "code_quality": "",
        "testing_gaps": "",
        "strengths": "",
        "improvements": "",
        "followup_actions": "",
        "next_steps": "",
        "quality_score": "N/A",
        "recommendation": "N/A",
    }

    lines = content.split("\n")
    current_section = None
    current_content: list[str] = []

    for line in lines:
        line_lower = line.lower().strip()

        # Detect sections
        if "executive summary" in line_lower or ("summary" in line_lower and current_section is None):
            if current_section and current_content:
                sections[current_section] = "\n".join(current_content).strip()
            current_section = "executive_summary"
            current_content = []
        elif "critical" in line_lower and ("must fix" in line_lower or "issue" in line_lower):
            if current_section and current_content:
                sections[current_section] = "\n".join(current_content).strip()
            current_section = "critical_issues"
            current_content = []
        elif "high priority" in line_lower or ("high" in line_lower and "should fix" in line_lower):
            if current_section and current_content:
                sections[current_section] = "\n".join(current_content).strip()
            current_section = "high_priority_issues"
            current_content = []
        elif "medium priority" in line_lower or ("medium" in line_lower and "consider" in line_lower):
            if current_section and current_content:
                sections[current_section] = "\n".join(current_content).strip()
            current_section = "medium_priority_issues"
            current_content = []
        elif "low priority" in line_lower or ("low" in line_lower and "nice to have" in line_lower):
            if current_section and current_content:
                sections[current_section] = "\n".join(current_content).strip()
            current_section = "low_priority_issues"
            current_content = []
        elif "security" in line_lower and "analysis" in line_lower:
            if current_section and current_content:
                sections[current_section] = "\n".join(current_content).strip()
            current_section = "security_analysis"
            current_content = []
        elif "performance" in line_lower and "review" in line_lower:
            if current_section and current_content:
                sections[current_section] = "\n".join(current_content).strip()
            current_section = "performance_review"
            current_content = []
        elif "code quality" in line_lower:
            if current_section and current_content:
                sections[current_section] = "\n".join(current_content).strip()
            current_section = "code_quality"
            current_content = []
        elif "testing" in line_lower and "gap" in line_lower:
            if current_section and current_content:
                sections[current_section] = "\n".join(current_content).strip()
            current_section = "testing_gaps"
            current_content = []
        elif "strength" in line_lower:
            if current_section and current_content:
                sections[current_section] = "\n".join(current_content).strip()
            current_section = "strengths"
            current_content = []
        elif "improvement" in line_lower or "area" in line_lower:
            if current_section and current_content:
                sections[current_section] = "\n".join(current_content).strip()
            current_section = "improvements"
            current_content = []
        elif "follow-up" in line_lower or "followup" in line_lower:
            if current_section and current_content:
                sections[current_section] = "\n".join(current_content).strip()
            current_section = "followup_actions"
            current_content = []
        elif "next step" in line_lower:
            if current_section and current_content:
                sections[current_section] = "\n".join(current_content).strip()
            current_section = "next_steps"
            current_content = []
        elif "quality score" in line_lower:
            match = re.search(r"(\d+(?:\.\d+)?)\s*/\s*10", line)
            if match:
                sections["quality_score"] = match.group(1)
        elif "recommendation" in line_lower and ("approve" in line_lower or "request" in line_lower or "block" in line_lower):
            if "approve" in line_lower and "request" not in line_lower:
                sections["recommendation"] = "Approve"
            elif "request" in line_lower and "change" in line_lower:
                sections["recommendation"] = "Request Changes"
            elif "block" in line_lower:
                sections["recommendation"] = "Block"
        else:
            if current_section:
                current_content.append(line)

    # Save last section
    if current_section and current_content:
        sections[current_section] = "\n".join(current_content).strip()

    # If no sections detected, put everything in executive summary
    if not any(v for k, v in sections.items() if k not in ["quality_score", "recommendation"]):
        sections["executive_summary"] = content.strip()

    return sections


def format_review_with_template(
    content: str,
    target: str,
    mode: Literal["planning", "review"],
    focus_areas: list[str] | None = None,
    files_count: int = 0,
    duration: str = "N/A",
) -> str:
    """
    Format review output using the code-review-result template.

    Args:
        content: Raw review output from Auggie.
        target: Target that was reviewed.
        mode: Review mode (planning or review).
        focus_areas: Focus areas if specified.
        files_count: Number of files reviewed.
        duration: Duration of the review.

    Returns:
        Formatted review content.
    """
    template = load_prompt_template("code-review-result")

    if not template:
        # Fallback to simple format if template not found
        timestamp = datetime.now().isoformat()
        return f"""---
generated: {timestamp}
type: auggie-review
target: {target}
mode: {mode}
---

# Code Review Result

{content}
"""

    sections = extract_review_sections(content)

    timestamp = datetime.now().isoformat()
    mode_display = "Architecture Planning" if mode == "planning" else "Code Review"
    focus_areas_str = ",".join(focus_areas) if focus_areas else "general"
    focus_areas_list = ", ".join(focus_areas) if focus_areas else "General review"

    result = template
    replacements = {
        "{{TIMESTAMP}}": timestamp,
        "{{TARGET}}": target,
        "{{MODE}}": mode,
        "{{MODE_DISPLAY}}": mode_display,
        "{{FOCUS_AREAS}}": focus_areas_str,
        "{{FOCUS_AREAS_LIST}}": focus_areas_list,
        "{{FILES_COUNT}}": str(files_count),
        "{{QUALITY_SCORE}}": sections["quality_score"],
        "{{RECOMMENDATION}}": sections["recommendation"],
        "{{EXECUTIVE_SUMMARY}}": sections["executive_summary"] or "No summary provided.",
        "{{CRITICAL_ISSUES}}": sections["critical_issues"] or "No critical issues identified.",
        "{{HIGH_PRIORITY_ISSUES}}": sections["high_priority_issues"] or "No high priority issues identified.",
        "{{MEDIUM_PRIORITY_ISSUES}}": sections["medium_priority_issues"] or "No medium priority issues identified.",
        "{{LOW_PRIORITY_ISSUES}}": sections["low_priority_issues"] or "No low priority issues identified.",
        "{{SECURITY_ANALYSIS}}": sections["security_analysis"] or "No specific security concerns identified.",
        "{{PERFORMANCE_REVIEW}}": sections["performance_review"] or "No significant performance issues identified.",
        "{{CODE_QUALITY}}": sections["code_quality"] or "Code quality is acceptable.",
        "{{TESTING_GAPS}}": sections["testing_gaps"] or "No specific testing gaps identified.",
        "{{STRENGTHS}}": sections["strengths"] or "- Code follows standard conventions",
        "{{IMPROVEMENTS}}": sections["improvements"] or "- Continue following best practices",
        "{{FOLLOWUP_ACTIONS}}": sections["followup_actions"] or "- Monitor code quality over time",
        "{{NEXT_STEPS}}": sections["next_steps"] or "Review complete. See recommendations above.",
        "{{DURATION}}": duration,
    }

    for placeholder, value in replacements.items():
        result = result.replace(placeholder, value)

    return result


def save_to_plan(content: str, plan_name: str) -> Path:
    """
    Save review output to a plan file.

    Args:
        content: The content to save.
        plan_name: Name for the plan file.

    Returns:
        Path to the saved plan file.
    """
    plans_dir = ensure_plans_dir()

    safe_name = "".join(c if c.isalnum() or c in "-_" else "-" for c in plan_name)
    if not safe_name.endswith(".md"):
        safe_name += ".md"

    plan_path = plans_dir / safe_name
    plan_path.write_text(content)
    return plan_path


def build_review_prompt(
    target: str,
    mode: Literal["planning", "review"] = "review",
    focus_areas: list[str] | None = None,
) -> str:
    """
    Build a comprehensive review prompt.

    Args:
        target: Description of what is being reviewed.
        mode: 'planning' for architecture/implementation plans, 'review' for code review.
        focus_areas: Optional list of specific areas to focus on.

    Returns:
        The constructed prompt string.
    """
    template = load_prompt_template(f"{mode}_prompt")

    if template:
        prompt = template.replace("{{TARGET}}", target)
        if focus_areas:
            prompt = prompt.replace("{{FOCUS_AREAS}}", "\n".join(f"- {area}" for area in focus_areas))
        else:
            prompt = prompt.replace("{{FOCUS_AREAS}}", "")
        return prompt

    # Fallback to built-in prompts
    if mode == "planning":
        return f"""You are a senior software architect. Analyze the following code and provide a detailed implementation plan.

## Target
{target}

Use Auggie's codebase-retrieval to understand the full context of this code, including:
- Related files and dependencies
- Established patterns and conventions
- Historical context

Provide a comprehensive analysis covering:

1. **Architecture Overview**
   - Current structure and patterns
   - Dependencies and coupling
   - Data flow

2. **Implementation Plan**
   - Files to create or modify
   - Implementation sequence with dependencies
   - Estimated complexity for each step

3. **Trade-offs and Decisions**
   - Key architectural choices to make
   - Pros and cons of each approach
   - Recommended approach with rationale

4. **Risks and Blockers**
   - Potential issues and how to mitigate
   - Dependencies on external factors
   - Testing considerations

5. **Success Criteria**
   - How to verify the implementation is correct
   - Key metrics or behaviors to validate

Do NOT implement anything. Provide analysis and recommendations only.
Format your response in clear markdown with actionable items."""

    else:  # review mode
        focus_section = ""
        if focus_areas:
            focus_section = f"""
## Focus Areas
{chr(10).join(f"- {area}" for area in focus_areas)}
"""

        return f"""You are an expert code reviewer with deep knowledge of software engineering best practices, security, and performance optimization.

## Target for Review
{target}

Use Auggie's codebase-retrieval to understand:
- The full codebase structure and relationships
- Related files and dependencies
- Established patterns and conventions
{focus_section}
## Review Criteria

Analyze the code for:

1. **Bugs and Logic Errors**
   - Off-by-one errors, null pointer issues
   - Race conditions, deadlocks
   - Incorrect algorithm implementations

2. **Security Vulnerabilities**
   - Input validation issues
   - Injection vulnerabilities
   - Authentication/authorization flaws
   - Data exposure risks

3. **Performance Issues**
   - Inefficient algorithms (O(n^2) where O(n) possible)
   - Memory leaks or excessive allocations
   - Unnecessary I/O or network calls
   - Missing caching opportunities

4. **Code Quality**
   - Readability and maintainability
   - Proper error handling
   - Code duplication
   - Naming conventions

5. **Best Practices**
   - Language-specific idioms
   - Framework conventions
   - Testing coverage gaps

## Output Format

For each issue found, provide:
- **Location**: File and line reference
- **Severity**: Critical / High / Medium / Low
- **Issue**: Clear description of the problem
- **Impact**: What could go wrong
- **Fix**: Specific recommendation

Conclude with:
- Summary of critical issues requiring immediate attention
- Overall code quality assessment
- Prioritized list of improvements"""


def gather_file_info(target: str) -> tuple[int, list[Path]]:
    """
    Gather file information from a target path.

    Args:
        target: File or directory path.

    Returns:
        Tuple of (file count, list of files).
    """
    target_path = Path(target)
    files: list[Path] = []

    if target_path.is_file():
        files = [target_path]
    elif target_path.is_dir():
        extensions = {".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".rs", ".java", ".kt", ".swift", ".c", ".cpp", ".h"}
        for ext in extensions:
            files.extend(target_path.rglob(f"*{ext}"))
        files = sorted(files)[:50]
    else:
        files = list(Path(".").glob(target))[:50]

    return len(files), files


def cmd_review(args: argparse.Namespace) -> int:
    """Handle review command for comprehensive code review."""
    # Check Auggie availability first
    check_result = check_auggie_mcp_availability()
    if not check_result.available:
        print(check_result.message, file=sys.stderr)
        return 1

    target = args.target
    mode: Literal["planning", "review"] = "planning" if args.plan else "review"

    # Gather file info
    print(f"Analyzing target: {target}", file=sys.stderr)
    files_count, files = gather_file_info(target)

    if not files:
        print(f"Error: No files found for target: {target}", file=sys.stderr)
        return 1

    print(f"Found {files_count} file(s) to review", file=sys.stderr)

    # Parse focus areas
    focus_areas = args.focus.split(",") if args.focus else None

    # Build the prompt
    prompt = build_review_prompt(
        target=target,
        mode=mode,
        focus_areas=focus_areas,
    )

    # Write prompt to temp file
    prompt_file = generate_temp_path("auggie-prompt")
    prompt_file.write_text(prompt)

    # Determine timeout based on file count
    if files_count > 10:
        timeout = TIMEOUT_COMPLEX
    elif files_count > 3:
        timeout = TIMEOUT_MODERATE
    else:
        timeout = TIMEOUT_SIMPLE

    if args.timeout:
        timeout = args.timeout

    print(f"Running Auggie MCP ({mode} mode)...", file=sys.stderr)

    # Execute Auggie
    result = run_auggie_from_file(
        prompt_file=prompt_file,
        timeout=timeout,
    )

    # Clean up temp file
    try:
        prompt_file.unlink()
    except Exception:
        pass

    if result.success:
        raw_output = result.output

        # Format output using template for review mode
        if mode == "review":
            formatted_output = format_review_with_template(
                content=raw_output,
                target=target,
                mode=mode,
                focus_areas=focus_areas,
                files_count=files_count,
                duration=f"{timeout}s timeout",
            )
        else:
            # For planning mode, keep raw output with simple header
            timestamp = datetime.now().isoformat()
            formatted_output = f"""---
generated: {timestamp}
type: auggie-planning
target: {target}
mode: {mode}
files_reviewed: {files_count}
---

# Implementation Plan

{raw_output}
"""

        # Save to plan file
        if args.output:
            plan_name = args.output
        else:
            safe_target = "".join(c if c.isalnum() or c in "-_" else "-" for c in target)
            plan_name = f"{mode}-{safe_target}"

        plan_path = save_to_plan(formatted_output, plan_name)
        print(f"\n{'=' * 60}", file=sys.stderr)
        print(f"Review saved to: {plan_path}", file=sys.stderr)
        print(f"Mode: {mode}", file=sys.stderr)
        print(f"{'=' * 60}\n", file=sys.stderr)

        # Also print output
        print(formatted_output)
        return 0
    else:
        if result.output:
            print(result.output)
        if result.error:
            print(f"Error: {result.error}", file=sys.stderr)
        return 1


###############################################################################
# IMPORT COMMAND (Convert review results to task files)
###############################################################################


class ReviewIssue(NamedTuple):
    """Represents a single issue from a code review."""

    priority: str  # critical, high, medium, low
    identifier: str
    title: str
    location: str | None = None
    issue_description: str | None = None
    impact: str | None = None
    fix_recommendation: str | None = None
    raw_content: str | None = None


def parse_yaml_frontmatter(content: str) -> tuple[dict[str, str], str]:
    """
    Parse YAML frontmatter from markdown file.

    Args:
        content: File content with optional YAML frontmatter.

    Returns:
        Tuple of (metadata dict, remaining content).
    """
    metadata: dict[str, str] = {}
    remaining = content

    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            frontmatter = parts[1].strip()
            remaining = parts[2].strip()

            for line in frontmatter.split("\n"):
                line = line.strip()
                if ":" in line:
                    key, value = line.split(":", 1)
                    metadata[key.strip()] = value.strip()

    return metadata, remaining


def extract_issues_from_section(section_content: str, priority: str) -> list[ReviewIssue]:
    """
    Extract individual issues from a review section.

    Args:
        section_content: Content of a priority section.
        priority: Priority level (critical, high, medium, low).

    Returns:
        List of ReviewIssue objects.
    """
    issues: list[ReviewIssue] = []

    if not section_content or "No" in section_content and "identified" in section_content:
        return issues

    lines = section_content.split("\n")
    current_issue: dict[str, str | None] = {}
    current_lines: list[str] = []
    issue_counter = 1

    for line in lines:
        line_stripped = line.strip()

        # Detect structured issue format: **[CRITICAL-001]**
        if line_stripped.startswith("**[") and "]**" in line_stripped:
            if current_issue or current_lines:
                issues.append(_build_issue_from_dict(current_issue, current_lines, priority, issue_counter))
                issue_counter += 1

            identifier_end = line_stripped.find("]**")
            identifier = line_stripped[3:identifier_end]
            title = line_stripped[identifier_end + 3:].strip()
            current_issue = {
                "identifier": identifier,
                "title": title,
            }
            current_lines = []

        # Detect field lines: - **Location**: value
        elif line_stripped.startswith("- **") and "**:" in line_stripped:
            field_end = line_stripped.find("**:", 4)
            field_name = line_stripped[4:field_end].lower()
            field_value = line_stripped[field_end + 3:].strip()
            current_issue[field_name] = field_value

        # Detect simple list item
        elif line_stripped.startswith("-") and not line_stripped.startswith("- **"):
            if current_issue or current_lines:
                issues.append(_build_issue_from_dict(current_issue, current_lines, priority, issue_counter))
                issue_counter += 1

            issue_text = line_stripped[1:].strip()
            current_issue = {
                "identifier": f"{priority.upper()}-{issue_counter:03d}",
                "title": issue_text[:100],
            }
            current_lines = [issue_text]

        # Continuation lines
        elif line_stripped and current_issue:
            current_lines.append(line_stripped)

    # Save last issue
    if current_issue or current_lines:
        issues.append(_build_issue_from_dict(current_issue, current_lines, priority, issue_counter))

    return issues


def _build_issue_from_dict(
    issue_dict: dict[str, str | None],
    content_lines: list[str],
    priority: str,
    counter: int,
) -> ReviewIssue:
    """Build a ReviewIssue from parsed dictionary."""
    identifier = issue_dict.get("identifier") or f"{priority.upper()}-{counter:03d}"
    title = issue_dict.get("title") or "Untitled Issue"
    location = issue_dict.get("location")
    issue_desc = issue_dict.get("issue")
    impact = issue_dict.get("impact")
    fix_rec = issue_dict.get("fix")
    raw_content = "\n".join(content_lines) if content_lines else None

    return ReviewIssue(
        priority=priority,
        identifier=identifier,
        title=title,
        location=location,
        issue_description=issue_desc,
        impact=impact,
        fix_recommendation=fix_rec,
        raw_content=raw_content,
    )


def parse_review_result_file(file_path: Path) -> tuple[dict[str, str], list[ReviewIssue]]:
    """
    Parse a code review result file and extract all issues.

    Args:
        file_path: Path to the review result markdown file.

    Returns:
        Tuple of (metadata, list of issues).
    """
    if not file_path.exists():
        raise FileNotFoundError(f"Review result file not found: {file_path}")

    content = file_path.read_text()

    # Parse frontmatter
    metadata, body = parse_yaml_frontmatter(content)

    # Extract issues from each priority section
    all_issues: list[ReviewIssue] = []

    sections = [
        ("Critical Issues (Must Fix)", "critical"),
        ("High Priority Issues (Should Fix)", "high"),
        ("Medium Priority Issues (Consider Fixing)", "medium"),
        ("Low Priority Issues (Nice to Have)", "low"),
    ]

    for section_name, priority in sections:
        section_start = body.find(f"## {section_name}")
        if section_start == -1:
            continue

        next_section = body.find("##", section_start + 1)
        if next_section == -1:
            section_content = body[section_start:]
        else:
            section_content = body[section_start:next_section]

        section_content = section_content.replace(f"## {section_name}", "").strip()

        issues = extract_issues_from_section(section_content, priority)
        all_issues.extend(issues)

    return metadata, all_issues


def get_tasks_dir() -> Path:
    """Get the tasks directory path."""
    return Path("docs/prompts")


def create_task_from_issue(issue: ReviewIssue, review_metadata: dict[str, str]) -> tuple[bool, str]:
    """
    Create a task file from a review issue using tasks CLI.

    Args:
        issue: ReviewIssue to convert to task.
        review_metadata: Metadata from the review result.

    Returns:
        Tuple of (success, message/error).
    """
    task_name = f"{issue.identifier}_{issue.title[:50]}".replace(" ", "_").replace("/", "-")
    task_name = "".join(c if c.isalnum() or c in "-_" else "-" for c in task_name)

    background_parts = []
    background_parts.append(f"**Issue**: {issue.title}")
    background_parts.append(f"**Priority**: {issue.priority}")
    background_parts.append(f"**ID**: {issue.identifier}")

    if issue.location:
        background_parts.append(f"**Location**: {issue.location}")

    if review_metadata.get("target"):
        background_parts.append(f"**Review Target**: {review_metadata['target']}")

    if review_metadata.get("type"):
        background_parts.append(f"**Reviewed by**: {review_metadata['type']}")

    if issue.issue_description:
        background_parts.append(f"\n**Issue Description**:\n{issue.issue_description}")

    if issue.impact:
        background_parts.append(f"\n**Impact**:\n{issue.impact}")

    background_section = "\n".join(background_parts)

    requirements_parts = []
    if issue.fix_recommendation:
        requirements_parts.append(f"**Recommended Fix**:\n{issue.fix_recommendation}")

    if issue.raw_content:
        requirements_parts.append(f"\n**Additional Context**:\n{issue.raw_content}")

    requirements_section = "\n".join(requirements_parts) if requirements_parts else "Address the issue described in the Background section."

    try:
        result = subprocess.run(
            ["tasks", "create", task_name],
            capture_output=True,
            text=True,
            timeout=30,
        )

        if result.returncode != 0:
            return False, f"Failed to create task: {result.stderr}"

        tasks_dir = get_tasks_dir()
        task_files = list(tasks_dir.glob(f"*{task_name}*.md"))
        if not task_files:
            return False, f"Task file not found after creation for: {task_name}"

        task_file = task_files[0]
        task_content = task_file.read_text()

        import re
        if "# Background" in task_content:
            task_content = re.sub(
                r'(#+ Background)\s*\n+',
                rf'\1\n\n{background_section}\n\n',
                task_content,
                count=1
            )

        if "# Requirements" in task_content or "## Requirements" in task_content:
            task_content = re.sub(
                r'(#+ Requirements(?: / Objectives)?)\s*\n+',
                rf'\1\n\n{requirements_section}\n\n',
                task_content,
                count=1
            )

        task_file.write_text(task_content)

        return True, str(task_file)

    except subprocess.TimeoutExpired:
        return False, f"Task creation timed out for: {task_name}"
    except Exception as e:
        return False, f"Error creating task: {e}"


def cmd_import(args: argparse.Namespace) -> int:
    """Handle import command to convert review results to tasks."""
    review_file = Path(args.review_file)

    if not review_file.exists():
        print(f"Error: Review file not found: {review_file}", file=sys.stderr)
        return 1

    print(f"Parsing review results from: {review_file}")

    try:
        metadata, issues = parse_review_result_file(review_file)

        if not issues:
            print("No issues found in review file.")
            return 0

        print(f"Found {len(issues)} issue(s) to import")

        if args.priority:
            priority_filter = args.priority.lower()
            issues = [i for i in issues if i.priority.lower() == priority_filter]
            print(f"Filtered to {len(issues)} {priority_filter} priority issue(s)")

        created_count = 0
        failed_count = 0
        failed_issues: list[str] = []

        for i, issue in enumerate(issues, 1):
            print(f"\n[{i}/{len(issues)}] Creating task for: {issue.identifier} - {issue.title[:50]}")

            success, message = create_task_from_issue(issue, metadata)

            if success:
                created_count += 1
                print(f"  OK Created: {message}")
            else:
                failed_count += 1
                failed_issues.append(f"{issue.identifier}: {message}")
                print(f"  X Failed: {message}", file=sys.stderr)

        print(f"\n{'=' * 60}")
        print("Task Import Summary")
        print(f"{'=' * 60}")
        print(f"Total issues: {len(issues)}")

        if created_count > 0:
            print(f"Successfully created {created_count} task{'s' if created_count != 1 else ''}")

        if failed_count > 0:
            print(f"Failed to create {failed_count} task{'s' if failed_count != 1 else ''}", file=sys.stderr)
            print("\nFailed issues:", file=sys.stderr)
            for failure in failed_issues:
                print(f"  - {failure}", file=sys.stderr)

        return 0 if failed_count == 0 else 1

    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"Error importing review results: {e}", file=sys.stderr)
        return 1


###############################################################################
# CLI INTERFACE
###############################################################################


def main() -> int:
    """Main entry point with argument parsing."""
    parser = argparse.ArgumentParser(
        description="Auggie Code Review Utility - CLI tool for Auggie MCP-powered code review and planning.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Commands:
  check       Validate Auggie MCP availability
  run         Run a short prompt via Auggie MCP
  run-file    Run a long prompt from a file
  review      Comprehensive code review
  import      Convert review results to task files

Examples:
  python3 code-review-auggie.py check
  python3 code-review-auggie.py run "Explain this function"
  python3 code-review-auggie.py run-file prompt.txt -o output.txt
  python3 code-review-auggie.py review src/auth/ --plan --output auth-plan
  python3 code-review-auggie.py review main.py --focus "security,performance"
  python3 code-review-auggie.py import .claude/plans/review-src.md
""",
    )

    parser.add_argument("-v", "--verbose", action="store_true", help="Verbose output")

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # check command
    check_parser = subparsers.add_parser("check", help="Validate Auggie MCP availability")
    check_parser.add_argument("-v", "--verbose", action="store_true", help="Show version info")

    # run command
    run_parser = subparsers.add_parser("run", help="Run a short prompt via Auggie MCP")
    run_parser.add_argument("prompt", help="The prompt to send to Auggie")
    run_parser.add_argument(
        "-t", "--timeout",
        type=int,
        help="Timeout in seconds",
    )
    run_parser.add_argument(
        "-s", "--save",
        help="Save output to plan file with this name",
    )

    # run-file command
    run_file_parser = subparsers.add_parser("run-file", help="Run a long prompt from a file")
    run_file_parser.add_argument("prompt_file", help="Path to the prompt file")
    run_file_parser.add_argument(
        "-o", "--output",
        help="Output file path",
    )
    run_file_parser.add_argument(
        "-t", "--timeout",
        type=int,
        help="Timeout in seconds",
    )

    # review command
    review_parser = subparsers.add_parser("review", help="Comprehensive code review")
    review_parser.add_argument("target", help="File, directory, or glob pattern to review")
    review_parser.add_argument(
        "-p", "--plan",
        action="store_true",
        help="Planning mode (architecture/implementation plan instead of code review)",
    )
    review_parser.add_argument(
        "-o", "--output",
        help="Output plan file name",
    )
    review_parser.add_argument(
        "-f", "--focus",
        help="Comma-separated focus areas (e.g., security,performance,testing,comprehensive)",
    )
    review_parser.add_argument(
        "-t", "--timeout",
        type=int,
        help="Timeout in seconds",
    )

    # import command
    import_parser = subparsers.add_parser("import", help="Import review results as task files")
    import_parser.add_argument("review_file", help="Path to code review result file")
    import_parser.add_argument(
        "-p", "--priority",
        choices=["critical", "high", "medium", "low"],
        help="Only import issues of this priority level",
    )

    args = parser.parse_args()

    if args.command == "check":
        return cmd_check(args)
    elif args.command == "run":
        return cmd_run(args)
    elif args.command == "run-file":
        return cmd_run_file(args)
    elif args.command == "review":
        return cmd_review(args)
    elif args.command == "import":
        return cmd_import(args)
    else:
        parser.print_help()
        return 1


###############################################################################

if __name__ == "__main__":
    sys.exit(main())
