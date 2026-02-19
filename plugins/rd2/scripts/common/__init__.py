"""Common validation utilities for rd2 plugins.

This package provides shared validation, scoring, and drivers for
skill and agent quality evaluation.
"""

from schema.base import SkillType, ValidationIssue, ValidationResult
from schema.frontmatter import (
    parse_frontmatter,
    validate_frontmatter,
    validate_name,
    validate_description,
    validate_model,
    validate_color,
    validate_tools,
)
from schema.sections import (
    validate_sections,
    get_section_schema,
    AGENT_SECTIONS,
    SKILL_SECTIONS,
    COMMAND_SECTIONS,
)

# Import submodules
from common import agents
from common import skills
from common import commands

__all__ = [
    # Base types
    "SkillType",
    "ValidationIssue",
    "ValidationResult",
    # Frontmatter
    "parse_frontmatter",
    "validate_frontmatter",
    "validate_name",
    "validate_description",
    "validate_model",
    "validate_color",
    "validate_tools",
    # Sections
    "validate_sections",
    "get_section_schema",
    "AGENT_SECTIONS",
    "SKILL_SECTIONS",
    "COMMAND_SECTIONS",
    # Submodules
    "agents",
    "skills",
    "commands",
]
