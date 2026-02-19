#!/usr/bin/env python3
"""Unified validation CLI for rd2 plugin skills.

Auto-detects skill type and runs appropriate validation.

Usage:
    python validate_skill.py <path> [--type skill|agent|command] [--strict] [--scenarios <path>] [--output text|json]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

# Add scripts directory to path for imports
scripts_dir = Path(__file__).parent
sys.path.insert(0, str(scripts_dir))

from schema.base import SkillType
from drivers.structural import validate_structure, print_validation_result
from drivers.behavioral import load_scenarios, run_trigger_tests, print_behavioral_results
from scoring.grader import Grade


def detect_skill_type(path: Path) -> SkillType:
    """Auto-detect skill type from file content and location."""
    content = path.read_text()

    # Check location
    if "/agents/" in str(path):
        return SkillType.AGENT
    if "/commands/" in str(path):
        return SkillType.COMMAND

    # Check frontmatter
    if "model:" in content and "color:" in content:
        return SkillType.AGENT
    if "triggers:" in content or "Use this skill when" in content:
        return SkillType.SKILL

    # Check for agent template indicators
    if "Use this agent when" in content:
        return SkillType.AGENT

    # Default to skill
    return SkillType.SKILL


def to_dict(result: Any) -> dict:
    """Convert validation result to dict for JSON output."""
    return {
        "path": str(result.path),
        "valid": result.valid,
        "issues": [
            {
                "severity": i.severity,
                "category": i.category,
                "message": i.message,
                "line": i.line,
                "field": i.field,
            }
            for i in result.issues
        ],
        "metadata": result.metadata,
    }


def main() -> int:
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Validate rd2 skill/agent")
    parser.add_argument("path", help="Path to skill/agent .md file or directory")
    parser.add_argument("--type", choices=["skill", "agent", "command"], help="Force skill type")
    parser.add_argument("--strict", action="store_true", help="Treat warnings as errors")
    parser.add_argument("--scenarios", help="Path to scenarios.yaml for behavioral tests")
    parser.add_argument("--output", choices=["text", "json"], default="text")
    args = parser.parse_args()

    path = Path(args.path)

    # If directory, find the main file
    if path.is_dir():
        if (path / "SKILL.md").exists():
            path = path / "SKILL.md"
        elif (path / "agents").exists():
            # For agents, look for .md files in agents/ subdir
            agents_dir = path / "agents"
            md_files = list(agents_dir.glob("*.md"))
            if md_files:
                path = md_files[0]
            else:
                print(f"No agent files found in {agents_dir}")
                return 1
        else:
            print(f"Cannot find SKILL.md or agent file in {path}")
            return 1

    # Detect or use specified type
    skill_type = SkillType(args.type) if args.type else detect_skill_type(path)

    # Run structural validation
    result = validate_structure(path, skill_type)

    # Run behavioral tests if scenarios provided
    behavioral_results = {}
    if args.scenarios:
        scenarios = load_scenarios(Path(args.scenarios))
        if scenarios:
            # Get description from frontmatter
            desc = result.metadata.get("frontmatter", {}).get("description", "")
            behavioral_results = run_trigger_tests(desc, scenarios)
            result.metadata["behavioral"] = behavioral_results

    # Output results
    if args.output == "json":
        output = {
            "validation": to_dict(result),
            "behavioral": behavioral_results,
            "skill_type": skill_type.value,
        }
        print(json.dumps(output, indent=2))
    else:
        print_validation_result(result)
        if behavioral_results:
            print_behavioral_results(behavioral_results)

    # Exit code
    if not result.valid:
        return 1
    if args.strict and result.warnings:
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
