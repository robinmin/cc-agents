"""Skill-specific common validation utilities.

This module provides skill-specific validation helpers that extend the common
validation framework for Claude Code skill definitions.
"""

from pathlib import Path
from typing import Any

from schema.base import SkillType, ValidationIssue, ValidationResult
from schema.frontmatter import (
    parse_frontmatter as common_parse_frontmatter,
    validate_frontmatter as common_validate_frontmatter,
    validate_name,
    validate_description,
)
from schema.sections import (
    validate_sections as common_validate_sections,
    get_section_schema,
    SKILL_SECTIONS,
)

# Re-export for convenience
__all__ = [
    "validate_skill_frontmatter",
    "validate_skill_sections",
    "validate_skill",
    "SkillType",
    "ValidationIssue",
    "ValidationResult",
    "parse_frontmatter",
    "validate_name",
    "validate_description",
    "get_section_schema",
    "SKILL_SECTIONS",
]


def validate_skill_frontmatter(frontmatter: dict[str, Any]) -> list[ValidationIssue]:
    """Validate skill-specific frontmatter.

    Args:
        frontmatter: Frontmatter dictionary to validate

    Returns:
        List of validation issues
    """
    return common_validate_frontmatter(frontmatter, SkillType.SKILL)


def validate_skill_sections(lines: list[str]) -> list[ValidationIssue]:
    """Validate skill sections.

    Args:
        lines: Lines from the skill markdown file

    Returns:
        List of validation issues
    """
    section_defs = get_section_schema("skill")
    return common_validate_sections(lines, section_defs)


def validate_skill(skill_path: Path) -> ValidationResult:
    """Validate a skill definition file.

    Args:
        skill_path: Path to the skill .md file

    Returns:
        ValidationResult with validation status and issues
    """
    issues: list[ValidationIssue] = []

    if not skill_path.exists():
        issues.append(ValidationIssue(
            "error", "file", f"File not found: {skill_path}", field="file"
        ))
        return ValidationResult(valid=False, issues=issues)

    content = skill_path.read_text()
    lines = content.split("\n")

    # Validate frontmatter
    if content.startswith("---"):
        frontmatter, body = common_parse_frontmatter(content)
        issues.extend(validate_skill_frontmatter(frontmatter))
    else:
        issues.append(ValidationIssue(
            "warning", "frontmatter", "No frontmatter found", field="frontmatter"
        ))

    # Validate sections
    issues.extend(validate_skill_sections(lines))

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
