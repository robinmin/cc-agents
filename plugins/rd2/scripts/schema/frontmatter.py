"""Common frontmatter validation rules."""

import re
from typing import Any

from schema.base import ValidationIssue, SkillType

# Common field validators
def validate_name(name: Any, context: str = "skill") -> list[ValidationIssue]:
    """Validate name field (common rules for all types)."""
    issues = []
    if name is None:
        issues.append(ValidationIssue("error", "frontmatter", "name required", field="name"))
        return issues

    if not isinstance(name, str):
        issues.append(ValidationIssue("error", "frontmatter", "name must be string", field="name"))
        return issues

    # Length: 3-50 chars
    if len(name) < 3:
        issues.append(ValidationIssue("error", "frontmatter", f"name '{name}' too short (min 3 chars)", field="name"))
    if len(name) > 50:
        issues.append(ValidationIssue("error", "frontmatter", f"name '{name}' too long (max 50 chars)", field="name"))

    # Pattern: lowercase, numbers, hyphens only
    if not re.match(r"^[a-z0-9][a-z0-9-]*[a-z0-9]$", name):
        issues.append(ValidationIssue("warning", "frontmatter", f"name '{name}' should be lowercase with hyphens", field="name"))

    return issues


def validate_description(description: Any, context: str = "skill") -> list[ValidationIssue]:
    """Validate description field."""
    issues = []
    if description is None:
        issues.append(ValidationIssue("error", "frontmatter", "description required", field="description"))
        return issues

    if not isinstance(description, str):
        issues.append(ValidationIssue("error", "frontmatter", "description must be string", field="description"))
        return issues

    # Length check
    if len(description) < 10:
        issues.append(ValidationIssue("error", "frontmatter", "description too short (min 10 chars)", field="description"))
    if len(description) > 5000:
        issues.append(ValidationIssue("warning", "frontmatter", "description too long (max 5000 chars)", field="description"))

    # Skill requires "Use this skill when"
    if context == "skill" and "use this skill when" not in description.lower():
        issues.append(ValidationIssue("warning", "frontmatter", "description should include 'Use this skill when' trigger", field="description"))

    # Agent requires "Use this agent when"
    if context == "agent" and "use this agent when" not in description.lower():
        issues.append(ValidationIssue("warning", "frontmatter", "description should include 'Use this agent when' trigger", field="description"))

    return issues


# Valid values
VALID_MODELS = {"inherit", "sonnet", "opus", "haiku"}

# Standard colors (from Claude Code docs)
VALID_COLORS_STANDARD = {"blue", "cyan", "green", "yellow", "magenta", "red"}

# Extended colors (for rd2 agents)
VALID_COLORS_EXTENDED = {
    "blue", "cyan", "green", "yellow", "magenta", "red",
    "teal", "coral", "crimson", "lavender", "purple", "pink",
    "azure", "gold", "orange", "aquamarine", "orange",
}

VALID_COLORS = VALID_COLORS_STANDARD | VALID_COLORS_EXTENDED

INVALID_FRONTMATTER_FIELDS = {"agent", "subagents", "orchestrates", "skills"}


def validate_model(model: Any) -> list[ValidationIssue]:
    """Validate model field for agents."""
    issues = []
    if model is None:
        return issues  # Optional for skills

    if not isinstance(model, str):
        issues.append(ValidationIssue("error", "frontmatter", "model must be string", field="model"))
        return issues

    if model.lower() not in VALID_MODELS:
        issues.append(ValidationIssue("error", "frontmatter", f"model must be one of: {', '.join(sorted(VALID_MODELS))}", field="model"))

    return issues


def validate_color(color: Any) -> list[ValidationIssue]:
    """Validate color field for agents."""
    issues = []
    if color is None:
        return issues  # Optional for skills

    if not isinstance(color, str):
        issues.append(ValidationIssue("error", "frontmatter", "color must be string", field="color"))
        return issues

    if color.lower() not in VALID_COLORS:
        issues.append(ValidationIssue("error", "frontmatter", f"color must be one of: {', '.join(sorted(VALID_COLORS))}", field="color"))

    return issues


def validate_tools(tools: Any) -> list[ValidationIssue]:
    """Validate tools field."""
    issues = []
    if tools is None:
        return issues  # Optional

    if not isinstance(tools, list):
        issues.append(ValidationIssue("error", "frontmatter", "tools must be array", field="tools"))

    return issues


def validate_frontmatter(frontmatter: dict[str, Any], skill_type: SkillType) -> list[ValidationIssue]:
    """Validate frontmatter based on skill type."""
    issues = []

    # Check for invalid fields
    for field_name in INVALID_FRONTMATTER_FIELDS:
        if field_name in frontmatter:
            issues.append(ValidationIssue(
                "error", "frontmatter",
                f"Invalid field '{field_name}' - document in body instead",
                field=field_name
            ))

    # Validate name (common)
    issues.extend(validate_name(frontmatter.get("name"), skill_type.value))

    # Validate description (common)
    issues.extend(validate_description(frontmatter.get("description"), skill_type.value))

    # Agent-specific validation
    if skill_type == SkillType.AGENT:
        # model is optional - defaults to inherit if not specified
        if "model" in frontmatter:
            issues.extend(validate_model(frontmatter.get("model")))

        # color is NOT in official Claude Code schema - it's a UI enhancement
        # Validate it if present but don't require it
        if "color" in frontmatter:
            issues.extend(validate_color(frontmatter.get("color")))

        issues.extend(validate_tools(frontmatter.get("tools")))

    return issues


def parse_frontmatter(content: str) -> tuple[dict[str, Any], str]:
    """Parse YAML frontmatter from markdown content."""
    if not content.startswith("---"):
        return {}, content

    lines = content.split("\n")
    if len(lines) < 3:
        return {}, content

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
        import yaml
        fm = yaml.safe_load(frontmatter_str) or {}
    except Exception:
        fm = _simple_yaml_parse(frontmatter_str)

    return fm, body


def _simple_yaml_parse(yaml_str: str) -> dict:
    """Simple YAML parsing fallback without yaml module."""
    result = {}
    current_key = None
    current_list = None

    for line in yaml_str.split("\n"):
        line = line.rstrip()
        if not line or line.startswith("#"):
            continue

        if ":" in line:
            colon_idx = line.index(":")
            key = line[:colon_idx].strip()
            value = line[colon_idx + 1:].strip()

            if not value:
                current_key = key
                if key == "tools":
                    current_list = []
                    result[key] = current_list
                else:
                    result[key] = ""
            else:
                # Remove quotes
                if (value.startswith('"') and value.endswith('"')) or \
                   (value.startswith("'") and value.endswith("'")):
                    value = value[1:-1]

                if key == "tools" and value.startswith("["):
                    arr_content = value.strip("[]")
                    result[key] = [t.strip().strip('"').strip("'") for t in arr_content.split(",")] if arr_content else []
                else:
                    result[key] = value
        elif current_list is not None and line.strip().startswith("-"):
            item = line.strip("- ").strip().strip('"').strip("'")
            current_list.append(item)

    return result
