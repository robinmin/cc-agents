#!/usr/bin/env python3
"""
{{skill_title}} Utility - Helper script for {{skill_name}} skill.

Usage:
    python3 ${CLAUDE_PLUGIN_ROOT}/skills/{{skill_name}}/scripts/example.py <command> [options]

Commands:
    hello <name>       Say hello to someone
    process <file>     Process a file

Examples:
    python3 ${CLAUDE_PLUGIN_ROOT}/skills/{{skill_name}}/scripts/example.py hello World
    python3 ${CLAUDE_PLUGIN_ROOT}/skills/{{skill_name}}/scripts/example.py process input.txt --output result.txt
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

###############################################################################
# COMMANDS
###############################################################################


def cmd_hello(args: argparse.Namespace) -> int:
    """Handle hello command."""
    print(f"Hello, {args.name}!")
    return 0


def cmd_process(args: argparse.Namespace) -> int:
    """Handle process command."""
    input_path = Path(args.file)

    if not input_path.exists():
        print(f"Error: File not found: {input_path}")
        return 1

    print(f"Processing: {input_path}")
    # TODO: Add actual processing logic

    if args.output:
        print(f"Output: {args.output}")

    return 0


###############################################################################
# CLI INTERFACE
###############################################################################


def main() -> int:
    """Main entry point with argument parsing."""
    parser = argparse.ArgumentParser(
        description="{{skill_title}} Utility - Helper script for {{skill_name}} skill.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Commands:
  hello     Say hello to someone
  process   Process a file

Examples:
  python3 example.py hello World
  python3 example.py process input.txt --output result.txt
""",
    )

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # hello command
    hello_parser = subparsers.add_parser("hello", help="Say hello to someone")
    hello_parser.add_argument("name", help="Name to greet")

    # process command
    process_parser = subparsers.add_parser("process", help="Process a file")
    process_parser.add_argument("file", help="Input file to process")
    process_parser.add_argument("--output", "-o", help="Output file (optional)")

    args = parser.parse_args()

    if args.command == "hello":
        return cmd_hello(args)
    elif args.command == "process":
        return cmd_process(args)
    else:
        parser.print_help()
        return 1


###############################################################################

if __name__ == "__main__":
    sys.exit(main())
