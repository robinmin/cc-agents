#!/usr/bin/env python3
"""
Super Code Reviewer - Unified code review coordinator

Implements auto-selection logic and delegates to code-review-* skills.
Follows "fat skills, thin wrappers" pattern.
"""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Optional, List


class SuperCodeReviewer:
    """Unified code review coordinator with auto-selection."""

    def __init__(self, plugin_root: Optional[Path] = None):
        """Initialize the reviewer.

        Args:
            plugin_root: Path to the rd2 plugin root directory
        """
        if plugin_root is None:
            plugin_root = Path(os.environ.get("CLAUDE_PLUGIN_ROOT", "."))
        self.plugin_root = Path(plugin_root)
        self.skills_base = self.plugin_root / "skills"

    def check(self) -> dict:
        """Check availability of all review skills.

        Returns:
            dict: Availability status for each review tool
        """
        tools = ["gemini", "claude", "auggie", "opencode"]
        status = {}

        for tool in tools:
            script_path = self.skills_base / f"code-review-{tool}" / "scripts" / f"code-review-{tool}.py"
            status[tool] = {
                "available": script_path.exists(),
                "script": str(script_path)
            }

        return status

    def analyze_code_characteristics(self, target: str) -> dict:
        """Analyze code to determine optimal review tool.

        Args:
            target: Path to code (file or directory)

        Returns:
            dict: Code characteristics (size, complexity, patterns)
        """
        target_path = Path(target)

        if not target_path.exists():
            raise ValueError(f"Target path does not exist: {target}")

        # Count lines of code
        loc = 0
        files = []

        if target_path.is_file():
            files = [target_path]
        else:
            # Find code files
            extensions = {".py", ".js", ".ts", ".tsx", ".go", ".rs", ".java", ".rb", ".php"}
            for ext in extensions:
                files.extend(target_path.rglob(f"*{ext}"))

        for file in files:
            try:
                loc += len(file.read_text(errors="ignore").splitlines())
            except Exception:
                pass

        # Determine complexity based on heuristics
        complexity = "simple"
        if loc > 2000 or len(files) > 20:
            complexity = "high"
        elif loc > 500 or len(files) > 5:
            complexity = "medium"

        return {
            "loc": loc,
            "file_count": len(files),
            "complexity": complexity,
            "target_type": "file" if target_path.is_file() else "directory"
        }

    def select_tool(self, characteristics: dict, explicit_tool: Optional[str] = None) -> str:
        """Select optimal review tool based on code characteristics.

        Args:
            characteristics: Code analysis results
            explicit_tool: User-specified tool (bypasses auto-selection)

        Returns:
            str: Selected tool name (gemini, claude, auggie, opencode)
        """
        if explicit_tool:
            return explicit_tool

        loc = characteristics["loc"]
        complexity = characteristics["complexity"]

        # Auto-selection logic
        if loc < 500 and complexity == "simple":
            return "claude"
        elif loc >= 500 and loc <= 2000:
            return "gemini"  # Uses flash by default
        elif loc > 2000 or complexity == "high":
            return "gemini"  # Uses pro for complex code
        else:
            return "gemini"  # Safe default

    def review(self, target: str, tool: str = "auto",
               focus: Optional[List[str]] = None, plan: bool = False,
               output: Optional[str] = None) -> dict:
        """Execute code review with selected tool.

        Args:
            target: Path to code (file or directory)
            tool: Tool to use (auto, gemini, claude, auggie, opencode)
            focus: Focus areas (security, performance, testing, quality, architecture)
            plan: Enable architecture planning mode
            output: Output file path

        Returns:
            dict: Review results with tool attribution
        """
        # Check tool availability
        availability = self.check()

        # Analyze code characteristics
        characteristics = self.analyze_code_characteristics(target)

        # Select tool
        if tool == "auto":
            selected_tool = self.select_tool(characteristics)
        else:
            selected_tool = tool

        # Verify tool availability
        if not availability[selected_tool]["available"]:
            # Fallback to available tool
            for fallback in ["gemini", "claude", "auggie", "opencode"]:
                if availability[fallback]["available"]:
                    print(f"Warning: {selected_tool} unavailable, using {fallback}", file=sys.stderr)
                    selected_tool = fallback
                    break
            else:
                raise RuntimeError("No code review tools available")

        # Build command
        script_path = availability[selected_tool]["script"]
        cmd = [sys.executable, str(script_path), "review", target]

        if focus:
            cmd.extend(["--focus", ",".join(focus)])

        if plan:
            cmd.append("--plan")

        if output:
            cmd.extend(["--output", output])

        # Execute review
        result = subprocess.run(cmd, capture_output=True, text=True)

        return {
            "tool": selected_tool,
            "characteristics": characteristics,
            "exit_code": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr
        }


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Super Code Reviewer - Unified code review coordinator"
    )

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Check command (no arguments needed)
    subparsers.add_parser("check", help="Check review tool availability")

    # Review command
    review_parser = subparsers.add_parser("review", help="Execute code review")
    review_parser.add_argument("target", help="Path to code (file or directory)")
    review_parser.add_argument("--tool", choices=["auto", "gemini", "claude", "auggie", "opencode"],
                              default="auto", help="Review tool to use")
    review_parser.add_argument("--focus", help="Focus areas (comma-separated)")
    review_parser.add_argument("--plan", action="store_true", help="Enable architecture planning mode")
    review_parser.add_argument("--output", help="Output file path")

    # Analyze command
    analyze_parser = subparsers.add_parser("analyze", help="Analyze code characteristics")
    analyze_parser.add_argument("target", help="Path to code (file or directory)")

    args = parser.parse_args()

    reviewer = SuperCodeReviewer()

    if args.command == "check":
        status = reviewer.check()
        print("Review Tool Availability:")
        for tool, info in status.items():
            avail = "✓" if info["available"] else "✗"
            print(f"  {avail} {tool}: {info['script']}")

    elif args.command == "review":
        focus_areas = args.focus.split(",") if args.focus else None
        result = reviewer.review(
            target=args.target,
            tool=args.tool,
            focus=focus_areas,
            plan=args.plan,
            output=args.output
        )

        # Print tool selection info
        print(f"Tool: {result['tool']}", file=sys.stderr)
        print(f"LOC: {result['characteristics']['loc']}", file=sys.stderr)
        print(f"Complexity: {result['characteristics']['complexity']}", file=sys.stderr)

        # Print review output
        if result["stdout"]:
            print(result["stdout"])
        if result["stderr"]:
            print(result["stderr"], file=sys.stderr)

        sys.exit(result["exit_code"])

    elif args.command == "analyze":
        characteristics = reviewer.analyze_code_characteristics(args.target)
        print(json.dumps(characteristics, indent=2))

    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
