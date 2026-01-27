#!/usr/bin/env python3
"""
Antigravity (agy) Code Generation Utility - CLI tool for Google AI code generation.

Usage:
    python3 coder-agy.py <command> [options]

Commands:
    check                    Validate Antigravity CLI availability
    run <prompt>             Run a short prompt via Antigravity CLI
    run-file <prompt_file>   Run a long prompt from a file
    generate <task_content>  Generate code from task specification or requirements

Examples:
    python3 coder-agy.py check
    python3 coder-agy.py run "Explain the best approach for rate limiting"
    python3 coder-agy.py generate "Create a REST API endpoint" --output api.md
    python3 coder-agy.py generate "Implement cache manager" --mode agent --no-tdd --output cache.md
"""

from __future__ import annotations

import argparse
import os
import random
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime
from pathlib import Path
from typing import List, NamedTuple, Optional


###############################################################################
# CONSTANTS
###############################################################################

# Antigravity CLI command
ANTIGRAVITY_CLI = "agy"

# Available modes (from agy chat --help)
AVAILABLE_MODES = [
    "agent",  # Complex tasks with multi-step reasoning
    "ask",    # Quick questions and simple tasks
    "edit",   # Code editing and refactoring
]

# Timeout settings (in seconds)
TIMEOUT_SIMPLE = 300  # 5 minutes
TIMEOUT_MODERATE = 600  # 10 minutes
TIMEOUT_COMPLEX = 900  # 15 minutes

# Output directory
PLANS_DIR = Path("docs/plans")

# Super-coder methodology (moved to references/methodology.md)
METHODOLOGY = """
See references/methodology.md for the complete Super-Coder Methodology.
"""


###############################################################################
# RESULT TYPES
###############################################################################


class CheckResult(NamedTuple):
    """Result of Antigravity CLI availability check."""

    available: bool
    message: str
    version: Optional[str] = None


class RunResult(NamedTuple):
    """Result of running an Antigravity prompt."""

    success: bool
    output: str
    error: Optional[str] = None
    mode: Optional[str] = None


class GenerateResult(NamedTuple):
    """Result of code generation."""

    success: bool
    output_path: Optional[Path]
    message: str
    mode: Optional[str] = None


###############################################################################
# UTILITY FUNCTIONS
###############################################################################


def generate_temp_path(prefix: str = "agy-coder") -> Path:
    """Generate a unique temporary file path."""
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


def sanitize_filename(name: str) -> str:
    """Convert a string to a safe filename."""
    safe = "".join(c if c.isalnum() or c in "-_" else "-" for c in name.lower())
    while "--" in safe:
        safe = safe.replace("--", "-")
    return safe.strip("-")[:50]


def validate_mode(mode: Optional[str]) -> Optional[str]:
    """
    Validate mode parameter against allowed values.

    Args:
        mode: Mode string to validate

    Returns:
        Validated mode string or None if invalid

    Raises:
        ValueError: If mode is not in allowed list
    """
    if mode is None:
        return None
    if mode not in AVAILABLE_MODES:
        raise ValueError(f"Invalid mode '{mode}'. Available modes: {', '.join(AVAILABLE_MODES)}")
    return mode


def validate_file_path(file_path: Path, must_exist: bool = False) -> Path:
    """
    Validate file path to prevent path traversal and ensure it's within allowed bounds.

    Args:
        file_path: Path to validate
        must_exist: Whether the file must exist

    Returns:
        Resolved, absolute Path object

    Raises:
        ValueError: If path contains suspicious patterns or doesn't exist when required
        PermissionError: If path exists but is not readable
    """
    # Resolve to absolute path to eliminate .. and symlinks
    try:
        resolved = file_path.resolve(strict=must_exist)
    except FileNotFoundError:
        if must_exist:
            raise ValueError(f"File not found: {file_path}")
        resolved = file_path.resolve()
    except OSError as e:
        raise ValueError(f"Invalid path '{file_path}': {e}")

    # Check for path traversal attempts
    try:
        resolved_str = str(resolved)
        if ".." in resolved_str or "\0" in resolved_str:
            raise ValueError(f"Path traversal detected: {file_path}")
    except (TypeError, AttributeError) as e:
        raise ValueError(f"Invalid path format: {e}")

    # If file exists, verify it's readable
    if resolved.exists():
        if not resolved.is_file():
            raise ValueError(f"Path is not a file: {resolved}")
        if not os.access(resolved, os.R_OK):
            raise PermissionError(f"File not readable: {resolved}")

    return resolved


def validate_add_files(file_paths: Optional[List[str]]) -> List[Path]:
    """
    Validate list of file paths for context addition.

    Args:
        file_paths: List of file path strings

    Returns:
        List of validated Path objects

    Raises:
        ValueError: If any path is invalid
        PermissionError: If any file is not readable
    """
    if not file_paths:
        return []

    validated = []
    for file_path_str in file_paths:
        try:
            path = Path(file_path_str)
            validated.append(validate_file_path(path, must_exist=True))
        except (ValueError, PermissionError) as e:
            # Re-raise with context
            raise type(e)(f"Invalid --add-file '{file_path_str}': {e}") from e

    return validated


###############################################################################
# CHECK COMMAND
###############################################################################


def check_antigravity_availability() -> CheckResult:
    """
    Validate Antigravity CLI availability.

    Returns:
        CheckResult with availability status and message.
    """
    agy_path = shutil.which(ANTIGRAVITY_CLI)
    if not agy_path:
        return CheckResult(
            available=False,
            message="""ERROR: Antigravity CLI (agy) is not installed or not in PATH.

Install Antigravity CLI:
  Visit: https://antigravity.google/docs/get-started

After installation:
1. Ensure 'agy' is available in your PATH
2. Verify with: agy chat --help

Documentation: https://antigravity.google/docs/get-started""",
        )

    try:
        result = subprocess.run(
            [ANTIGRAVITY_CLI, "chat", "--help"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode == 0:
            # Extract version from help output (first line)
            version = "Unknown"
            for line in result.stdout.split('\n')[:5]:
                if 'Antigravity' in line:
                    version = line.strip()
                    break
            return CheckResult(
                available=True,
                message="Antigravity ready",
                version=version,
            )
        else:
            return CheckResult(
                available=False,
                message=f"ERROR: Antigravity CLI returned error: {result.stderr.strip()}",
            )
    except subprocess.TimeoutExpired:
        return CheckResult(
            available=False,
            message="ERROR: Antigravity CLI is installed but not responding (timeout)",
        )
    except FileNotFoundError:
        return CheckResult(
            available=False,
            message="ERROR: Antigravity CLI executable not found",
        )
    except PermissionError:
        return CheckResult(
            available=False,
            message="ERROR: Permission denied when executing Antigravity CLI",
        )
    except OSError as e:
        return CheckResult(
            available=False,
            message=f"ERROR: Failed to execute Antigravity CLI: {e}",
        )
    except Exception as e:
        return CheckResult(
            available=False,
            message=f"ERROR: Unexpected error checking Antigravity CLI: {e}",
        )


def cmd_check(args: argparse.Namespace) -> int:
    """Handle check command."""
    result = check_antigravity_availability()

    if result.available:
        print(result.message)
        if result.version and args.verbose:
            print(f"Version: {result.version}")
        return 0
    else:
        print(result.message, file=sys.stderr)
        return 1


###############################################################################
# RUN COMMAND
###############################################################################


def run_antigravity_prompt(
    prompt: str,
    mode: Optional[str] = None,
    add_files: Optional[List[str]] = None,
    timeout: int = TIMEOUT_MODERATE,
) -> RunResult:
    """
    Run a prompt via Antigravity CLI.

    Args:
        prompt: The prompt to send to Antigravity
        mode: Mode to use (agent/ask/edit)
        add_files: List of file paths to add as context
        timeout: Timeout in seconds

    Returns:
        RunResult with success status and output
    """
    try:
        # Validate mode parameter
        validated_mode = validate_mode(mode)

        # Validate file paths
        validated_files = validate_add_files(add_files)

        cmd = [ANTIGRAVITY_CLI, "chat"]

        if validated_mode:
            cmd.extend(["-m", validated_mode])

        for file_path in validated_files:
            cmd.extend(["-a", str(file_path)])

        cmd.append(prompt)

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
        )

        if result.returncode == 0:
            return RunResult(
                success=True,
                output=result.stdout.strip(),
                mode=validated_mode,
            )
        else:
            return RunResult(
                success=False,
                output="",
                error=result.stderr.strip() or "Unknown error",
                mode=validated_mode,
            )
    except subprocess.TimeoutExpired as e:
        return RunResult(
            success=False,
            output="",
            error=f"Timeout after {timeout} seconds",
            mode=mode,
        )
    except (ValueError, PermissionError) as e:
        return RunResult(
            success=False,
            output="",
            error=str(e),
            mode=mode,
        )
    except OSError as e:
        return RunResult(
            success=False,
            output="",
            error=f"Failed to execute Antigravity CLI: {e}",
            mode=mode,
        )
    except Exception as e:
        return RunResult(
            success=False,
            output="",
            error=f"Unexpected error: {e}",
            mode=mode,
        )


def run_antigravity_file(
    prompt_file: Path,
    mode: Optional[str] = None,
    add_files: Optional[List[str]] = None,
    timeout: int = TIMEOUT_COMPLEX,
) -> RunResult:
    """
    Run a prompt from file via Antigravity CLI.

    Args:
        prompt_file: Path to file containing the prompt
        mode: Mode to use
        add_files: List of file paths to add as context
        timeout: Timeout in seconds

    Returns:
        RunResult with success status and output
    """
    try:
        # Validate and resolve prompt file path (SEC002 - path traversal protection)
        validated_path = validate_file_path(prompt_file, must_exist=True)

        prompt = validated_path.read_text(encoding="utf-8")
        return run_antigravity_prompt(prompt, mode, add_files, timeout)
    except (ValueError, PermissionError, UnicodeDecodeError) as e:
        return RunResult(
            success=False,
            output="",
            error=str(e),
        )
    except OSError as e:
        return RunResult(
            success=False,
            output="",
            error=f"Failed to read file: {e}",
        )


def cmd_run(args: argparse.Namespace) -> int:
    """Handle run command."""
    mode = getattr(args, 'mode', None)
    add_files = getattr(args, 'add_files', [])
    result = run_antigravity_prompt(args.prompt, mode, add_files)

    if result.success:
        print(result.output)
        return 0
    else:
        print(f"ERROR: {result.error}", file=sys.stderr)
        return 1


def cmd_run_file(args: argparse.Namespace) -> int:
    """Handle run-file command."""
    prompt_file = Path(args.prompt_file)
    mode = getattr(args, 'mode', None)
    add_files = getattr(args, 'add_files', [])
    result = run_antigravity_file(prompt_file, mode, add_files)

    if result.success:
        print(result.output)
        return 0
    else:
        print(f"ERROR: {result.error}", file=sys.stderr)
        return 1


###############################################################################
# GENERATE COMMAND
###############################################################################


def build_task_prompt(
    task_content: str,
    no_tdd: bool = False,
    context: Optional[str] = None,
) -> str:
    """
    Build prompt from task file content with minimal wrapper.

    Args:
        task_content: Full task file content (markdown format)
        no_tdd: Opt-out from TDD mode (default is TDD via rd2:tdd-workflow)
        context: Additional context

    Returns:
        Complete prompt string
    """
    prompt = f"""# Code Work Request

You are an expert software engineer. The following is a complete task specification for code work.

## Task Specification
{task_content}

"""

    if not no_tdd:
        prompt += """## Development Approach
Follow Test-Driven Development: write tests first, implement to pass tests, then refactor.
"""

    if context:
        prompt += f"""## Additional Context
{context}

"""

    prompt += """## Expected Output
Provide your solution with:
- Clear file structure (### File: path/to/file.ext)
- Complete, production-ready code
- Comprehensive tests
- Verification steps

Follow this methodology priority: Correctness > Simplicity > Testability > Maintainability > Performance.
"""
    return prompt


def generate_code(
    task_content: str,
    mode: Optional[str] = None,
    no_tdd: bool = False,
    output: Optional[str] = None,
    context: Optional[str] = None,
    add_files: Optional[List[str]] = None,
) -> GenerateResult:
    """
    Generate code using Antigravity.

    Args:
        task_content: Task specification (full task file content or requirements)
        mode: Mode to use (agent/ask/edit)
        no_tdd: Opt-out from TDD mode (default is TDD via rd2:tdd-workflow)
        output: Output file name
        context: Additional context
        add_files: List of file paths to add as context

    Returns:
        GenerateResult with success status and output path
    """
    temp_file = None
    try:
        # Validate mode (SEC001 - input validation before subprocess calls)
        validated_mode = validate_mode(mode)

        prompt = build_task_prompt(task_content, no_tdd, context)

        temp_file = generate_temp_path()
        temp_file.write_text(prompt, encoding="utf-8")

        try:
            result = run_antigravity_file(temp_file, validated_mode, add_files, TIMEOUT_COMPLEX)

            if not result.success:
                return GenerateResult(
                    success=False,
                    output_path=None,
                    message=f"Generation failed: {result.error}",
                    mode=validated_mode,
                )

            ensure_plans_dir()
            output_name = output or f"coder-agy-{sanitize_filename(task_content[:30])}"
            output_path = PLANS_DIR / f"{output_name}.md"

            timestamp = datetime.now().isoformat()
            tdd_mode = "tdd" if not no_tdd else "standard"
            mode_used = validated_mode or "agent"

            document = f"""---
type: antigravity-code-generation
version: 1.0
mode: {mode_used}
generated: {timestamp}
task: "{task_content[:100]}..."
tdd_mode: {tdd_mode}
---

# Code Generation Result

**Task:** {task_content}
**Tool:** Antigravity (agy)
**Mode:** {mode_used.upper()}
**TDD:** {tdd_mode.upper()}
**Generated:** {timestamp}

---

{result.output}

---

## Metadata

- **Tool:** Antigravity (agy)
- **Mode:** {mode_used}
- **TDD Mode:** {tdd_mode}
- **Methodology:** super-coder (Correctness > Simplicity > Testability > Maintainability > Performance)
- **Generated:** {timestamp}

---

*Generated by coder-agy | {timestamp}*
"""

            output_path.write_text(document, encoding="utf-8")

            return GenerateResult(
                success=True,
                output_path=output_path,
                message=f"Code generated successfully: {output_path}",
                mode=mode_used,
            )

        finally:
            if temp_file is not None and temp_file.exists():
                temp_file.unlink()

    except (ValueError, PermissionError) as e:
        return GenerateResult(
            success=False,
            output_path=None,
            message=str(e),
            mode=mode,
        )
    except OSError as e:
        return GenerateResult(
            success=False,
            output_path=None,
            message=f"File system error: {e}",
            mode=mode,
        )
    except Exception as e:
        return GenerateResult(
            success=False,
            output_path=None,
            message=f"Unexpected error during generation: {e}",
            mode=mode,
        )


def cmd_generate(args: argparse.Namespace) -> int:
    """Handle generate command."""
    context = None
    if args.context:
        try:
            context_path = Path(args.context)
            # Validate context file path (SEC003 - path traversal protection)
            validated_path = validate_file_path(context_path, must_exist=True)
            context = validated_path.read_text(encoding="utf-8")
        except (ValueError, PermissionError, UnicodeDecodeError) as e:
            print(f"ERROR: Context file error: {e}", file=sys.stderr)
            return 1
        except OSError as e:
            print(f"ERROR: Failed to read context file: {e}", file=sys.stderr)
            return 1

    # Validate add_files (if provided)
    add_files = args.add_files if args.add_files else []
    try:
        validated_add_files = validate_add_files(add_files)
    except (ValueError, PermissionError) as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 1

    result = generate_code(
        task_content=args.requirements,
        mode=args.mode,
        no_tdd=args.no_tdd,
        output=args.output,
        context=context,
        add_files=[str(p) for p in validated_add_files] if validated_add_files else None,
    )

    if result.success:
        print(result.message)
        if args.verbose and result.output_path:
            print(f"\nOutput saved to: {result.output_path}")
        return 0
    else:
        print(f"ERROR: {result.message}", file=sys.stderr)
        return 1


###############################################################################
# MAIN
###############################################################################


def main() -> int:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Antigravity Code Generation Utility",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable verbose output",
    )

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    check_parser = subparsers.add_parser("check", help="Check Antigravity CLI availability")
    check_parser.set_defaults(func=cmd_check)

    run_parser = subparsers.add_parser("run", help="Run a short prompt")
    run_parser.add_argument("prompt", help="Prompt to send to Antigravity")
    run_parser.add_argument("-m", "--mode", choices=AVAILABLE_MODES, help="Mode to use")
    run_parser.add_argument("-a", "--add-file", action="append", dest="add_files",
                           help="Add file as context")
    run_parser.set_defaults(func=cmd_run)

    run_file_parser = subparsers.add_parser("run-file", help="Run prompt from file")
    run_file_parser.add_argument("prompt_file", help="Path to prompt file")
    run_file_parser.add_argument("-m", "--mode", choices=AVAILABLE_MODES, help="Mode to use")
    run_file_parser.add_argument("-a", "--add-file", action="append", dest="add_files",
                                help="Add file as context")
    run_file_parser.set_defaults(func=cmd_run_file)

    gen_parser = subparsers.add_parser("generate", help="Generate code")
    gen_parser.add_argument("task_content", help="Task specification (file content or requirements)")
    gen_parser.add_argument("-m", "--mode", choices=AVAILABLE_MODES, help="Mode to use")
    gen_parser.add_argument("--no-tdd", action="store_true", help="Disable TDD mode (opt-out from rd2:tdd-workflow default)")
    gen_parser.add_argument("-o", "--output", help="Output file name")
    gen_parser.add_argument("-c", "--context", help="Path to context file")
    gen_parser.add_argument("-a", "--add-file", action="append", dest="add_files",
                           help="Add file as context")
    gen_parser.set_defaults(func=cmd_generate)

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return 1

    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
