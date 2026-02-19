"""Command-specific common validation utilities.

This module provides command-specific validation helpers that extend the common
validation framework for Claude Code slash command definitions.
"""

from pathlib import Path
from typing import Any

from schema.base import SkillType, ValidationIssue, ValidationResult
from schema.frontmatter import (
    parse_frontmatter as common_parse_frontmatter,
    validate_name,
    validate_description,
)
from schema.sections import (
    validate_sections as common_validate_sections,
    get_section_schema,
    COMMAND_SECTIONS,
)

# Re-export for convenience
__all__ = [
    "validate_command_frontmatter",
    "validate_command_sections",
    "validate_command",
    "SkillType",
    "ValidationIssue",
    "ValidationResult",
    "parse_frontmatter",
    "validate_name",
    "validate_description",
    "get_section_schema",
    "COMMAND_SECTIONS",
]


# Command-specific frontmatter validation
COMMAND_REQUIRED_FIELDS = {"name", "description"}
COMMAND_OPTIONAL_FIELDS = {"argument-hint", "color"}


def validate_command_frontmatter(frontmatter: dict[str, Any]) -> list[ValidationIssue]:
    """Validate command-specific frontmatter.

    Args:
        frontmatter: Frontmatter dictionary to validate

    Returns:
        List of validation issues
    """
    issues: list[ValidationIssue] = []

    # Check required fields
    for field in COMMAND_REQUIRED_FIELDS:
        if not frontmatter.get(field):
            issues.append(ValidationIssue(
                "error", "frontmatter",
                f"Command frontmatter requires '{field}' field",
                field=field
            ))

    # Validate name format (commands use different naming convention)
    name = frontmatter.get("name", "")
    if name:
        # Commands typically use kebab-case like verbs
        if not name.replace("-", "").replace("_", "").isalnum():
            issues.append(ValidationIssue(
                "warning", "frontmatter",
                f"Command name '{name}' should be alphanumeric with hyphens",
                field="name"
            ))

    # Validate description length
    desc = frontmatter.get("description", "")
    if desc and len(desc) > 60:
        issues.append(ValidationIssue(
            "warning", "frontmatter",
            f"Command description should be under 60 chars (currently {len(desc)})",
            field="description"
        ))

    return issues


def validate_command_sections(lines: list[str]) -> list[ValidationIssue]:
    """Validate command sections.

    Args:
        lines: Lines from the command markdown file

    Returns:
        List of validation issues
    """
    section_defs = get_section_schema("command")
    return common_validate_sections(lines, section_defs)


def validate_command(command_path: Path) -> ValidationResult:
    """Validate a command definition file.

    Args:
        command_path: Path to the command .md file

    Returns:
        ValidationResult with validation status and issues
    """
    issues: list[ValidationIssue] = []

    if not command_path.exists():
        issues.append(ValidationIssue(
            "error", "file", f"File not found: {command_path}", field="file"
        ))
        return ValidationResult(valid=False, issues=issues)

    content = command_path.read_text()
    lines = content.split("\n")

    # Validate frontmatter
    if content.startswith("---"):
        frontmatter, body = common_parse_frontmatter(content)
        issues.extend(validate_command_frontmatter(frontmatter))
    else:
        issues.append(ValidationIssue(
            "warning", "frontmatter", "No frontmatter found", field="frontmatter"
        ))

    # Validate sections
    issues.extend(validate_command_sections(lines))

    # Determine if valid (no errors)
    has_errors = any(i.severity == "error" for i in issues)

    return ValidationResult(
        valid=not has_errors,
        issues=issues,
    )


def parse_frontmatter(content: str) -> tuple[dict[str, Any], str]:
    """Parse YAML frontmatter from markdown content.

    Args:
        content: Full markdown content

    Returns:
        Tuple of (frontmatter_dict, body_text)
    """
    return common_parse_frontmatter(content)
