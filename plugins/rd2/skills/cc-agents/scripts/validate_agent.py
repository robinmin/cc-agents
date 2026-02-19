#!/usr/bin/env python3
"""Agent validation script for cc-agents skill.

Validates Claude Code agent definition files against 8-section anatomy
and official frontmatter validation schema.

Now uses common validation libraries from plugins/rd2/scripts.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from typing import Any

# Add common library to path
_common_lib_path = Path(__file__).parent.parent.parent.parent / "scripts"
if _common_lib_path.exists():
    sys.path.insert(0, str(_common_lib_path))

from schema.base import SkillType, ValidationIssue, ValidationResult
from schema.frontmatter import (
    parse_frontmatter as common_parse_frontmatter,
    validate_frontmatter as common_validate_frontmatter,
)
from schema.sections import (
    validate_sections as common_validate_sections,
    get_section_schema,
    AGENT_SECTIONS,
)


# Agent-specific validation extensions

def validate_agent_specific(agent_path: Path, content: str, lines: list[str]) -> list[ValidationIssue]:
    """Additional agent-specific validations."""
    issues = []

    # Check for competencies (list items)
    competency_markers = sum(1 for line in lines if line.strip().startswith(("- ", "* ", "1.")))
    if competency_markers < 20:
        issues.append(ValidationIssue(
            "warning", "content",
            f"Low competency count: {competency_markers} (recommended: 50+)"
        ))

    # Check line count
    non_empty = [l for l in lines if l.strip()]
    line_count = len(non_empty)
    if line_count < 300:
        issues.append(ValidationIssue(
            "warning", "content",
            f"Low line count: {line_count} (recommended: 400-600)"
        ))
    elif line_count > 700:
        issues.append(ValidationIssue(
            "warning", "content",
            f"High line count: {line_count} (recommended: 400-600)"
        ))

    return issues


def validate_agent(agent_path: Path) -> dict:
    """Validate an agent definition file.

    Args:
        agent_path: Path to agent .md file

    Returns:
        Dict with validation results
    """
    results = {
        "valid": True,
        "errors": [],
        "warnings": [],
        "sections_found": [],
        "sections_missing": [],
        "frontmatter": {},
    }

    if not agent_path.exists():
        results["valid"] = False
        results["errors"].append(f"File not found: {agent_path}")
        return results

    content = agent_path.read_text()
    lines = content.split("\n")

    # Check for frontmatter
    has_frontmatter = content.startswith("---")
    if not has_frontmatter:
        results["warnings"].append("No frontmatter found")
    else:
        # Use common frontmatter validation
        frontmatter, body = common_parse_frontmatter(content)
        results["frontmatter"] = frontmatter

        frontmatter_errors = common_validate_frontmatter(frontmatter, SkillType.AGENT)
        if frontmatter_errors:
            for err in frontmatter_errors:
                if err.severity == "error":
                    results["errors"].append(f"Frontmatter: {err.message}")
                else:
                    results["warnings"].append(f"Frontmatter: {err.message}")
            results["valid"] = False

    # Use common section validation
    section_defs = get_section_schema("agent")
    section_issues = common_validate_sections(lines, section_defs)

    found_sections = set()
    for issue in section_issues:
        if "not found" in issue.message.lower():
            results["sections_missing"].append(issue.category)
        else:
            found_sections.add(issue.category)

    results["sections_found"] = list(found_sections)
    if section_issues:
        for issue in section_issues:
            if issue.severity == "warning":
                results["warnings"].append(f"Section: {issue.message}")

    # Agent-specific validations
    agent_issues = validate_agent_specific(agent_path, content, lines)
    for issue in agent_issues:
        if issue.severity == "error":
            results["errors"].append(issue.message)
            results["valid"] = False
        else:
            results["warnings"].append(issue.message)

    return results


def main() -> int:
    """Main entry point."""
    try:
        parser = argparse.ArgumentParser(description="Validate Claude Code agent definitions")
        parser.add_argument("agent", help="Path to agent .md file")
        parser.add_argument("--strict", action="store_true", help="Treat warnings as errors")
        args = parser.parse_args()

        agent_path = Path(args.agent)
        results = validate_agent(agent_path)

        # Print results
        print(f"Validating: {agent_path}")
        print()

        # Frontmatter validation results
        if results["frontmatter"]:
            print("Frontmatter:")
            fm = results["frontmatter"]
            print(f"  name: {fm.get('name', 'MISSING')}")
            print(f"  model: {fm.get('model', 'MISSING')}")
            print(f"  color: {fm.get('color', 'MISSING')}")
            if fm.get("tools"):
                print(f"  tools: {fm.get('tools')}")
            print()

        if results["sections_found"]:
            print("Sections found:")
            for section in results["sections_found"]:
                print(f"  ✓ {section}")
            print()

        if results["sections_missing"]:
            print("Sections missing:")
            for section in results["sections_missing"]:
                print(f"  ✗ {section}")
            print()

        if results["warnings"]:
            print("Warnings:")
            for warning in results["warnings"]:
                print(f"  ⚠ {warning}")
            print()

        if results["errors"]:
            print("Errors:")
            for error in results["errors"]:
                print(f"  ✗ {error}")
            print()

        # Exit code
        if results["errors"] or (args.strict and results["warnings"]):
            print("Validation: FAILED")
            return 1

        print("Validation: PASSED")
        return 0
    except KeyboardInterrupt:
        print("\nValidation cancelled by user")
        return 130
    except Exception as e:
        print(f"Validation error: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
