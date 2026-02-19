"""Agent-specific common validation utilities.

This module provides agent-specific validation helpers that extend the common
validation framework for Claude Code agent definitions.
"""

from pathlib import Path
from typing import Any

from schema.base import SkillType, ValidationIssue, ValidationResult
from schema.frontmatter import (
    parse_frontmatter as common_parse_frontmatter,
    validate_frontmatter as common_validate_frontmatter,
    validate_name,
    validate_description,
    validate_model,
    validate_color,
    validate_tools,
)
from schema.sections import (
    validate_sections as common_validate_sections,
    get_section_schema,
    AGENT_SECTIONS,
)

# Re-export for convenience
__all__ = [
    "validate_agent_frontmatter",
    "validate_agent_sections",
    "validate_agent",
    "SkillType",
    "ValidationIssue",
    "ValidationResult",
    "parse_frontmatter",
    "validate_name",
    "validate_description",
    "validate_model",
    "validate_color",
    "validate_tools",
    "get_section_schema",
    "AGENT_SECTIONS",
]


def validate_agent_frontmatter(frontmatter: dict[str, Any]) -> list[ValidationIssue]:
    """Validate agent-specific frontmatter.

    Args:
        frontmatter: Frontmatter dictionary to validate

    Returns:
        List of validation issues
    """
    return common_validate_frontmatter(frontmatter, SkillType.AGENT)


def validate_agent_sections(lines: list[str]) -> list[ValidationIssue]:
    """Validate agent sections.

    Args:
        lines: Lines from the agent markdown file

    Returns:
        List of validation issues
    """
    section_defs = get_section_schema("agent")
    return common_validate_sections(lines, section_defs)


def validate_agent(agent_path: Path) -> ValidationResult:
    """Validate an agent definition file.

    Args:
        agent_path: Path to the agent .md file

    Returns:
        ValidationResult with validation status and issues
    """
    issues: list[ValidationIssue] = []

    if not agent_path.exists():
        issues.append(ValidationIssue(
            "error", "file", f"File not found: {agent_path}", field="file"
        ))
        return ValidationResult(valid=False, issues=issues)

    content = agent_path.read_text()
    lines = content.split("\n")

    # Validate frontmatter
    if content.startswith("---"):
        frontmatter, body = common_parse_frontmatter(content)
        issues.extend(validate_agent_frontmatter(frontmatter))
    else:
        issues.append(ValidationIssue(
            "warning", "frontmatter", "No frontmatter found", field="frontmatter"
        ))

    # Validate sections
    issues.extend(validate_agent_sections(lines))

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
