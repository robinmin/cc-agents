"""Structural validation driver."""

from pathlib import Path
from typing import Any

from schema.base import ValidationResult, ValidationIssue, SkillType
from schema.frontmatter import parse_frontmatter, validate_frontmatter
from schema.sections import get_section_schema, validate_sections


def validate_structure(
    path: Path,
    skill_type: SkillType,
) -> ValidationResult:
    """Validate file structure.

    Args:
        path: Path to skill/agent .md file
        skill_type: Type of skill (auto-detected or specified)

    Returns:
        ValidationResult with all issues found
    """
    issues = []
    metadata: dict[str, Any] = {}

    # 1. Check file exists
    if not path.exists():
        return ValidationResult(path, False, [
            ValidationIssue("error", "general", f"File not found: {path}")
        ])

    content = path.read_text()
    lines = content.split("\n")

    # 2. Parse and validate frontmatter
    fm, body = parse_frontmatter(content)
    metadata["frontmatter"] = fm
    issues.extend(validate_frontmatter(fm, skill_type))

    # 3. Validate sections
    section_defs = get_section_schema(skill_type.value)
    issues.extend(validate_sections(lines, section_defs))

    # 4. Validate naming conventions
    issues.extend(validate_naming(path, skill_type))

    # 5. Calculate line count metrics
    non_empty_lines = [l for l in lines if l.strip()]
    metadata["line_count"] = len(non_empty_lines)
    metadata["total_lines"] = len(lines)

    valid = not any(i.severity == "error" for i in issues)
    return ValidationResult(path, valid, issues, metadata)


def validate_naming(path: Path, skill_type: SkillType) -> list[ValidationIssue]:
    """Validate file and directory naming conventions."""
    issues = []

    # Check parent directory
    parent = path.parent
    if skill_type == SkillType.AGENT:
        # Agents should be in agents/ directory
        if "agents" not in str(parent):
            issues.append(ValidationIssue(
                "warning", "naming",
                f"Agent should be in agents/ directory"
            ))

    if skill_type == SkillType.SKILL:
        # Skills should have SKILL.md file
        if path.name.upper() != "SKILL.MD":
            issues.append(ValidationIssue(
                "warning", "naming",
                f"Skill file should be named SKILL.md"
            ))

    return issues


def print_validation_result(result: ValidationResult) -> None:
    """Print validation result in human-readable format."""
    print(f"Validating: {result.path}")
    print()

    if result.metadata.get("frontmatter"):
        fm = result.metadata["frontmatter"]
        print("Frontmatter:")
        print(f"  name: {fm.get('name', 'MISSING')}")
        print(f"  model: {fm.get('model', 'N/A')}")
        print(f"  color: {fm.get('color', 'N/A')}")
        print()

    if result.errors:
        print("Errors:")
        for error in result.errors:
            print(f"  ✗ {error.message}")
        print()

    if result.warnings:
        print("Warnings:")
        for warning in result.warnings:
            print(f"  ⚠ {warning.message}")
        print()

    status = "PASSED" if result.valid else "FAILED"
    print(f"Validation: {status}")
