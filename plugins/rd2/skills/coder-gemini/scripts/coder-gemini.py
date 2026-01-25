#!/usr/bin/env python3
"""
Gemini Code Generation Utility - CLI tool for Gemini-powered code generation.

Usage:
    python3 coder-gemini.py <command> [options]

Commands:
    check                    Validate Gemini CLI availability
    run <prompt>             Run a short prompt via Gemini CLI
    run-file <prompt_file>   Run a long prompt from a file
    generate <task_content>  Generate code from task specification or requirements

Examples:
    python3 coder-gemini.py check
    python3 coder-gemini.py run "Explain the best approach for rate limiting"
    python3 coder-gemini.py generate "Create a REST API endpoint" --output api.md
    python3 coder-gemini.py generate "Implement cache manager" --no-tdd --output cache.md
"""

from __future__ import annotations

import argparse
import random
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime
from pathlib import Path
from typing import NamedTuple


###############################################################################
# CONSTANTS
###############################################################################

DEFAULT_MODEL = "gemini-3-flash-preview"
FLASH_MODEL = "gemini-2.5-flash"
PRO_MODEL = "gemini-2.5-pro"

AVAILABLE_MODELS = [
    DEFAULT_MODEL,
    FLASH_MODEL,
    PRO_MODEL,
    "gemini-2.5-flash-lite",
    "gemini-3-pro-preview",
]

# Timeout settings (in seconds)
TIMEOUT_SIMPLE = 300  # 5 minutes
TIMEOUT_MODERATE = 600  # 10 minutes
TIMEOUT_COMPLEX = 900  # 15 minutes

# Output directory
PLANS_DIR = Path("docs/plans")

# Super-coder methodology
METHODOLOGY = """
## Super-Coder Methodology

Follow these principles in order of priority:

1. **Correctness & invariants** - Code must work; invalid states are impossible
2. **Simplicity (KISS > DRY)** - Manage complexity; simple changes should be simple
3. **Testability / verifiability** - Every change must be verifiable
4. **Maintainability (ETC)** - Design to be easier to change
5. **Performance** - Measure first; optimize last

### Working Loop
Clarify → Map impact → Plan minimal diff → Implement → Validate → Refactor → Report

### Two Hats Rule
Never add features and refactor simultaneously.
"""


###############################################################################
# RESULT TYPES
###############################################################################


class CheckResult(NamedTuple):
    """Result of Gemini CLI availability check."""

    available: bool
    message: str
    version: str | None = None


class RunResult(NamedTuple):
    """Result of running a Gemini prompt."""

    success: bool
    output: str
    error: str | None = None
    model: str | None = None


class GenerateResult(NamedTuple):
    """Result of code generation."""

    success: bool
    output_path: Path | None
    message: str
    model: str | None = None


###############################################################################
# UTILITY FUNCTIONS
###############################################################################


def generate_temp_path(prefix: str = "gemini-coder") -> Path:
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
    # Replace spaces and special chars with hyphens
    safe = "".join(c if c.isalnum() or c in "-_" else "-" for c in name.lower())
    # Remove consecutive hyphens
    while "--" in safe:
        safe = safe.replace("--", "-")
    return safe.strip("-")[:50]  # Limit length


###############################################################################
# CHECK COMMAND
###############################################################################


def check_gemini_availability() -> CheckResult:
    """
    Validate Gemini CLI availability.

    Returns:
        CheckResult with availability status and message.
    """
    gemini_path = shutil.which("gemini")
    if not gemini_path:
        return CheckResult(
            available=False,
            message="""ERROR: Gemini CLI is not installed or not in PATH.

Install Gemini CLI:
  npm install -g @google/gemini-cli

Or via Homebrew:
  brew install gemini-cli

Documentation: https://github.com/google-gemini/gemini-cli

After installation, ensure 'gemini' is available in your PATH.""",
        )

    try:
        result = subprocess.run(
            ["gemini", "--version"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0:
            version = result.stdout.strip() or result.stderr.strip()
            return CheckResult(
                available=True,
                message="gemini ready",
                version=version,
            )
        else:
            return CheckResult(
                available=False,
                message=f"ERROR: Gemini CLI returned error: {result.stderr.strip()}",
            )
    except subprocess.TimeoutExpired:
        return CheckResult(
            available=False,
            message="ERROR: Gemini CLI is installed but not responding (timeout)",
        )
    except Exception as e:
        return CheckResult(
            available=False,
            message=f"ERROR: Failed to check Gemini CLI: {e}",
        )


def cmd_check(args: argparse.Namespace) -> int:
    """Handle check command."""
    result = check_gemini_availability()

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


def run_gemini_prompt(
    prompt: str,
    model: str = DEFAULT_MODEL,
    timeout: int = TIMEOUT_MODERATE,
) -> RunResult:
    """
    Run a prompt via Gemini CLI.

    Args:
        prompt: The prompt to send to Gemini
        model: Model to use
        timeout: Timeout in seconds

    Returns:
        RunResult with success status and output
    """
    try:
        result = subprocess.run(
            ["gemini", "-m", model, prompt],
            capture_output=True,
            text=True,
            timeout=timeout,
        )

        if result.returncode == 0:
            return RunResult(
                success=True,
                output=result.stdout.strip(),
                model=model,
            )
        else:
            return RunResult(
                success=False,
                output="",
                error=result.stderr.strip() or "Unknown error",
                model=model,
            )
    except subprocess.TimeoutExpired:
        return RunResult(
            success=False,
            output="",
            error=f"Timeout after {timeout} seconds",
            model=model,
        )
    except Exception as e:
        return RunResult(
            success=False,
            output="",
            error=str(e),
            model=model,
        )


def run_gemini_file(
    prompt_file: Path,
    model: str = DEFAULT_MODEL,
    timeout: int = TIMEOUT_COMPLEX,
) -> RunResult:
    """
    Run a prompt from file via Gemini CLI.

    Args:
        prompt_file: Path to file containing the prompt
        model: Model to use
        timeout: Timeout in seconds

    Returns:
        RunResult with success status and output
    """
    if not prompt_file.exists():
        return RunResult(
            success=False,
            output="",
            error=f"Prompt file not found: {prompt_file}",
        )

    prompt = prompt_file.read_text()
    return run_gemini_prompt(prompt, model, timeout)


def cmd_run(args: argparse.Namespace) -> int:
    """Handle run command."""
    model = args.model or DEFAULT_MODEL
    result = run_gemini_prompt(args.prompt, model)

    if result.success:
        print(result.output)
        return 0
    else:
        print(f"ERROR: {result.error}", file=sys.stderr)
        return 1


def cmd_run_file(args: argparse.Namespace) -> int:
    """Handle run-file command."""
    prompt_file = Path(args.prompt_file)
    model = args.model or DEFAULT_MODEL
    result = run_gemini_file(prompt_file, model)

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
    context: str | None = None,
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
    model: str = DEFAULT_MODEL,
    no_tdd: bool = False,
    output: str | None = None,
    context: str | None = None,
) -> GenerateResult:
    """
    Generate code using Gemini.

    Args:
        task_content: Task specification (full task file content or requirements)
        model: Model to use
        no_tdd: Opt-out from TDD mode (default is TDD via rd2:tdd-workflow)
        output: Output file name
        context: Additional context

    Returns:
        GenerateResult with success status and output path
    """
    # Build the prompt from task content
    prompt = build_task_prompt(task_content, no_tdd, context)

    # Write prompt to temp file for complex generation
    temp_file = generate_temp_path()
    temp_file.write_text(prompt)

    try:
        # Run generation
        result = run_gemini_file(temp_file, model, TIMEOUT_COMPLEX)

        if not result.success:
            return GenerateResult(
                success=False,
                output_path=None,
                message=f"Generation failed: {result.error}",
                model=model,
            )

        # Prepare output
        ensure_plans_dir()
        output_name = output or f"coder-{sanitize_filename(task_content[:30])}"
        output_path = PLANS_DIR / f"{output_name}.md"

        # Build output document
        timestamp = datetime.now().isoformat()
        mode = "tdd" if not no_tdd else "standard"

        document = f"""---
type: gemini-code-generation
version: 1.0
model: {model}
generated: {timestamp}
task: "{task_content[:100]}..."
mode: {mode}
---

# Code Generation Result

**Task:** {task_content}
**Model:** {model}
**Mode:** {mode.upper()}
**Generated:** {timestamp}

---

{result.output}

---

## Metadata

- **Model:** {model}
- **Mode:** {mode}
- **Methodology:** super-coder (Correctness > Simplicity > Testability > Maintainability > Performance)
- **Generated:** {timestamp}

---

*Generated by coder-gemini | {timestamp}*
"""

        output_path.write_text(document)

        return GenerateResult(
            success=True,
            output_path=output_path,
            message=f"Code generated successfully: {output_path}",
            model=model,
        )

    finally:
        # Cleanup temp file
        if temp_file.exists():
            temp_file.unlink()


def cmd_generate(args: argparse.Namespace) -> int:
    """Handle generate command."""
    model = args.model or DEFAULT_MODEL

    # Read context from file if provided
    context = None
    if args.context:
        context_path = Path(args.context)
        if context_path.exists():
            context = context_path.read_text()
        else:
            print(f"WARNING: Context file not found: {args.context}", file=sys.stderr)

    result = generate_code(
        task_content=args.requirements,
        model=model,
        no_tdd=args.no_tdd,
        output=args.output,
        context=context,
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
        description="Gemini Code Generation Utility",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable verbose output",
    )

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Check command
    check_parser = subparsers.add_parser("check", help="Check Gemini CLI availability")
    check_parser.set_defaults(func=cmd_check)

    # Run command
    run_parser = subparsers.add_parser("run", help="Run a short prompt")
    run_parser.add_argument("prompt", help="Prompt to send to Gemini")
    run_parser.add_argument("-m", "--model", help=f"Model to use (default: {DEFAULT_MODEL})")
    run_parser.set_defaults(func=cmd_run)

    # Run-file command
    run_file_parser = subparsers.add_parser("run-file", help="Run prompt from file")
    run_file_parser.add_argument("prompt_file", help="Path to prompt file")
    run_file_parser.add_argument("-m", "--model", help=f"Model to use (default: {DEFAULT_MODEL})")
    run_file_parser.set_defaults(func=cmd_run_file)

    # Generate command
    gen_parser = subparsers.add_parser("generate", help="Generate code")
    gen_parser.add_argument("task_content", help="Task specification (file content or requirements)")
    gen_parser.add_argument("-m", "--model", help=f"Model to use (default: {DEFAULT_MODEL})")
    gen_parser.add_argument("--no-tdd", action="store_true", help="Disable TDD mode (opt-out from rd2:tdd-workflow default)")
    gen_parser.add_argument("-o", "--output", help="Output file name")
    gen_parser.add_argument("-c", "--context", help="Path to context file")
    gen_parser.set_defaults(func=cmd_generate)

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return 1

    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
