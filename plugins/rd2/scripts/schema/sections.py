"""Common section patterns for all skill types."""

import re
from dataclasses import dataclass, field
from typing import Any

from schema.base import ValidationIssue


@dataclass
class SectionDefinition:
    """Definition of a required/optional section."""
    name: str
    required: bool = True
    patterns: list[str] = field(default_factory=list)


# Agent-specific sections (8-section anatomy)
AGENT_SECTIONS = [
    SectionDefinition("METADATA", required=True, patterns=[r"^# ", r"name:", r"description:"]),
    SectionDefinition("PERSONA", required=True, patterns=[r"##\s+.*[Pp]ersona", r"##\s+.*[Aa]gent", r"role:", r"expertise:"]),
    SectionDefinition("PHILOSOPHY", required=True, patterns=[r"##\s+.*[Pp]hilosophy", r"##\s+.*[Pp]rinciples", r"design values"]),
    SectionDefinition("VERIFICATION", required=True, patterns=[r"##\s+.*[Vv]erif", r"##\s+.*[Qq]uality", r"check:", r"validate:"]),
    SectionDefinition("COMPETENCIES", required=True, patterns=[r"##\s+.*[Cc]ompetenc", r"##\s+.*[Ss]kill", r"can:", r"able to:"]),
    SectionDefinition("PROCESS", required=True, patterns=[r"##\s+.*[Pp]rocess", r"##\s+.*[Ww]orkflow", r"steps:", r"phases:"]),
    SectionDefinition("RULES", required=True, patterns=[r"##\s+.*[Rr]ules", r"##\s+.*[Dd]o[n']t", r"DO:", r"DON'T:"]),
    SectionDefinition("OUTPUT", required=True, patterns=[r"##\s+.*[Oo]utput", r"##\s+.*[Ee]xample", r"format:", r"response:"]),
]

# Skill-specific sections
SKILL_SECTIONS = [
    SectionDefinition("Overview", required=True, patterns=[r"##\s+.*[Oo]verview"]),
    SectionDefinition("When to Use", required=False, patterns=[r"##\s+.*[Ww]hen.*[Tt]o.*[Uu]se"]),
    SectionDefinition("Quick Start", required=False, patterns=[r"##\s+.*[Qq]uick.*[Ss]tart"]),
    SectionDefinition("Workflows", required=False, patterns=[r"##\s+.*[Ww]orkflow"]),
    SectionDefinition("Examples", required=True, patterns=[r"##\s+.*[Ee]xample"]),
    SectionDefinition("References", required=False, patterns=[r"##\s+.*[Rr]eference"]),
]

# Command-specific sections
COMMAND_SECTIONS = [
    SectionDefinition("Description", required=True, patterns=[r"##\s+.*[Dd]escription"]),
    SectionDefinition("Usage", required=True, patterns=[r"##\s+.*[Uu]sage"]),
    SectionDefinition("Arguments", required=False, patterns=[r"##\s+.*[Aa]rgument"]),
]


def validate_sections(
    lines: list[str],
    section_definitions: list[SectionDefinition]
) -> list[ValidationIssue]:
    """Validate that required sections exist."""
    issues = []
    found_sections = set()

    # Check each line for section patterns
    for line in lines:
        for section in section_definitions:
            for pattern in section.patterns:
                if re.search(pattern, line):
                    found_sections.add(section.name)
                    break

    # Check required sections
    for section in section_definitions:
        if section.required and section.name not in found_sections:
            issues.append(ValidationIssue(
                "warning",
                "section",
                f"Section not found: {section.name}",
                line=None
            ))

    return issues


def get_section_schema(skill_type: str) -> list[SectionDefinition]:
    """Get section definitions for a skill type."""
    schemas = {
        "agent": AGENT_SECTIONS,
        "skill": SKILL_SECTIONS,
        "command": COMMAND_SECTIONS,
    }
    return schemas.get(skill_type, SKILL_SECTIONS)
