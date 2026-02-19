#!/usr/bin/env python3
"""Agent validation script for cc-agents skill.

Validates Claude Code agent definition files against 8-section anatomy
and official frontmatter validation schema.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from typing import Any


try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False


REQUIRED_SECTIONS = [
    "METADATA",
    "PERSONA",
    "PHILOSOPHY",
    "VERIFICATION",
    "COMPETENCIES",
    "PROCESS",
    "RULES",
    "OUTPUT",
]

SECTION_PATTERNS = {
    "METADATA": [r"^# ", r"name:", r"description:"],
    "PERSONA": [r"##\s+.*[Pp]ersona", r"##\s+.*[Aa]gent", r"role:", r"expertise:"],
    "PHILOSOPHY": [r"##\s+.*[Pp]hilosophy", r"##\s+.*[Pp]rinciples", r"design values"],
    "VERIFICATION": [r"##\s+.*[Vv]erif", r"##\s+.*[Qq]uality", r"check:", r"validate:"],
    "COMPETENCIES": [r"##\s+.*[Cc]ompetenc", r"##\s+.*[Ss]kill", r"can:", r"able to:"],
    "PROCESS": [r"##\s+.*[Pp]rocess", r"##\s+.*[Ww]orkflow", r"steps:", r"phases:"],
    "RULES": [r"##\s+.*[Rr]ules", r"##\s+.*[Dd]o[n']t", r"DO:", r"DON'T:"],
    "OUTPUT": [r"##\s+.*[Oo]utput", r"##\s+.*[Ee]xample", r"format:", r"response:"],
}

# Official frontmatter validation rules from Claude Code documentation
VALID_MODELS = {"inherit", "sonnet", "opus", "haiku"}
VALID_COLORS = {"blue", "cyan", "green", "yellow", "magenta", "red"}
INVALID_FRONTMATTER_FIELDS = {"agent", "subagents", "orchestrates", "skills"}


def parse_frontmatter(content: str) -> tuple[dict[str, Any], str]:
    """Parse YAML frontmatter from agent file.

    Args:
        content: Full file content

    Returns:
        Tuple of (frontmatter dict, body content)
    """
    if not content.startswith("---"):
        return {}, content

    # Find the closing ---
    lines = content.split("\n")
    if len(lines) < 3:
        return {}, content

    # Skip the opening ---
    frontmatter_lines = []
    body_start = 1
    for i, line in enumerate(lines[1:], 1):
        if line.strip() == "---":
            body_start = i + 1
            break
        frontmatter_lines.append(line)

    frontmatter_str = "\n".join(frontmatter_lines)
    body = "\n".join(lines[body_start:])

    try:
        if HAS_YAML:
            # Use safe_load with a custom loader that handles multiline strings
            fm = yaml.safe_load(frontmatter_str) or {}
        else:
            # Simple YAML parsing fallback
            fm = _simple_yaml_parse(frontmatter_str)
    except Exception:
        # Fallback to simple parsing on error
        fm = _simple_yaml_parse(frontmatter_str)

    return fm, body


def _simple_yaml_parse(yaml_str: str) -> dict:
    """Simple YAML parsing fallback without yaml module."""
    result = {}
    current_key = None
    current_list = None

    # Simple regex-based parsing that handles quoted strings
    for line in yaml_str.split("\n"):
        line = line.rstrip()
        if not line or line.startswith("#"):
            continue

        # Key-value pair
        if ":" in line:
            # Find the first colon to get the key
            colon_idx = line.index(":")
            key = line[:colon_idx].strip()
            value = line[colon_idx + 1:].strip()

            if not value:
                # Start of nested or list
                current_key = key
                if value == "[" or (current_key == "tools" and "[" in line):
                    current_list = []
                    result[key] = current_list
                else:
                    result[key] = ""
            else:
                # Simple key: value - remove quotes if present
                if (value.startswith('"') and value.endswith('"')) or \
                   (value.startswith("'") and value.endswith("'")):
                    value = value[1:-1]

                if key == "tools" and value.startswith("["):
                    # Parse array
                    arr_content = value.strip("[]")
                    result[key] = [t.strip().strip('"').strip("'") for t in arr_content.split(",")] if arr_content else []
                else:
                    result[key] = value

        elif current_list is not None and line.strip().startswith("-"):
            # List item
            item = line.strip("- ").strip().strip('"').strip("'")
            current_list.append(item)

    return result


def validate_name(name: str | None) -> list[str]:
    """Validate agent name field.

    Rules:
    - 3-50 characters
    - Lowercase letters, numbers, hyphens only
    - Must start and end with alphanumeric
    """
    errors = []

    if name is None:
        errors.append("name field is required")
        return errors

    if not isinstance(name, str):
        errors.append("name must be a string")
        return errors

    # Length check
    if len(name) < 3:
        errors.append(f"name '{name}' is too short (minimum 3 characters)")
    if len(name) > 50:
        errors.append(f"name '{name}' is too long (maximum 50 characters)")

    # Pattern check: lowercase, numbers, hyphens only
    if not re.match(r"^[a-z0-9][a-z0-9-]*[a-z0-9]$", name) and len(name) >= 3:
        if name != name.lower():
            errors.append(f"name '{name}' must be lowercase")
        if re.search(r"[^a-z0-9-]", name):
            errors.append(f"name '{name}' can only contain lowercase letters, numbers, and hyphens")

    # Start/end check
    if name and not re.match(r"^[a-z0-9]", name):
        errors.append(f"name '{name}' must start with alphanumeric")
    if name and not re.match(r".*[a-z0-9]$", name):
        errors.append(f"name '{name}' must end with alphanumeric")

    return errors


def validate_description(description: str | None) -> list[str]:
    """Validate agent description field.

    Rules:
    - 10-5000 characters
    - Must include triggering conditions ("Use this agent when...")
    - Should include <example> blocks
    """
    errors = []

    if description is None:
        errors.append("description field is required")
        return errors

    if not isinstance(description, str):
        errors.append("description must be a string")
        return errors

    # Length check
    if len(description) < 10:
        errors.append(f"description is too short (minimum 10 characters)")
    if len(description) > 5000:
        errors.append(f"description is too long (maximum 5000 characters)")

    # Must have triggering conditions
    if "use this agent when" not in description.lower():
        errors.append("description must include 'Use this agent when' triggering condition")

    # Should have examples
    if "<example>" not in description.lower():
        errors.append("description should include <example> blocks")

    return errors


def validate_model(model: str | None) -> list[str]:
    """Validate agent model field.

    Rules:
    - Must be one of: inherit, sonnet, opus, haiku
    """
    errors = []

    if model is None:
        errors.append("model field is required")
        return errors

    if not isinstance(model, str):
        errors.append("model must be a string")
        return errors

    if model.lower() not in VALID_MODELS:
        errors.append(f"model must be one of: {', '.join(sorted(VALID_MODELS))}")

    return errors


def validate_color(color: str | None) -> list[str]:
    """Validate agent color field.

    Rules:
    - Must be one of: blue, cyan, green, yellow, magenta, red
    """
    errors = []

    if color is None:
        errors.append("color field is required")
        return errors

    if not isinstance(color, str):
        errors.append("color must be a string")
        return errors

    if color.lower() not in VALID_COLORS:
        errors.append(f"color must be one of: {', '.join(sorted(VALID_COLORS))}")

    return errors


def validate_tools(tools: Any) -> list[str]:
    """Validate agent tools field.

    Rules:
    - Must be an array if provided
    - Each tool should be a valid tool name
    """
    errors = []

    if tools is None:
        # tools is optional
        return errors

    if not isinstance(tools, list):
        errors.append("tools must be an array")
        return errors

    return errors


def validate_frontmatter(frontmatter: dict[str, Any]) -> list[str]:
    """Validate all frontmatter fields.

    Args:
        frontmatter: Parsed frontmatter dict

    Returns:
        List of error messages
    """
    errors = []

    # Check for invalid fields
    for field in INVALID_FRONTMATTER_FIELDS:
        if field in frontmatter:
            errors.append(f"Invalid frontmatter field '{field}' - document in body instead")

    # Validate required fields
    errors.extend(validate_name(frontmatter.get("name")))
    errors.extend(validate_description(frontmatter.get("description")))
    errors.extend(validate_model(frontmatter.get("model")))
    errors.extend(validate_color(frontmatter.get("color")))

    # Validate optional fields
    errors.extend(validate_tools(frontmatter.get("tools")))

    return errors


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
        # Parse and validate frontmatter
        frontmatter, body = parse_frontmatter(content)
        results["frontmatter"] = frontmatter

        frontmatter_errors = validate_frontmatter(frontmatter)
        if frontmatter_errors:
            results["errors"].extend([f"Frontmatter: {e}" for e in frontmatter_errors])
            results["valid"] = False

    # Check for required sections
    for section in REQUIRED_SECTIONS:
        found = False
        for pattern in SECTION_PATTERNS.get(section, []):
            for line in lines:
                if re.search(pattern, line):
                    found = True
                    break
            if found:
                break

        if found:
            results["sections_found"].append(section)
        else:
            results["sections_missing"].append(section)
            results["warnings"].append(f"Section not found: {section}")

    # Check line count
    line_count = len([l for l in lines if l.strip()])
    if line_count < 300:
        results["warnings"].append(f"Low line count: {line_count} (recommended: 400-600)")
    elif line_count > 700:
        results["warnings"].append(f"High line count: {line_count} (recommended: 400-600)")

    # Check for competencies (look for list items)
    competency_markers = sum(1 for line in lines if line.strip().startswith(("- ", "* ", "1.")))
    if competency_markers < 20:
        results["warnings"].append(f"Low competency count: {competency_markers} (recommended: 50+)")

    return results


def main() -> int:
    """Main entry point."""
    try:
        parser = argparse.ArgumentParser(description="Validate Claude Code agent definitions")
        parser.add_argument("agent", help="Path to agent .md file")
        parser.add_argument("--strict", action="store_true", help="Treat warnings as errors")
        parser.add_argument("--yaml", action="store_true", help="Require yaml module for parsing")
        args = parser.parse_args()

        if args.yaml and not HAS_YAML:
            print("Error: --yaml requires pyyaml to be installed")
            print("Install with: pip install pyyaml")
            return 1

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
