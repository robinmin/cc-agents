#!/usr/bin/env python3
"""
Skill Management Utility - Initialize, validate, evaluate, and package skills.

Usage:
    python3 skills.py <command> [options]

Commands:
    init <skill-name> --path <path>    Initialize a new skill directory
    validate <skill-path>              Validate a skill directory
    evaluate <skill-path> [--json]     Evaluate skill quality
    package <skill-path> [output-dir]  Package a skill for distribution

Examples:
    python3 skills.py init my-skill --path ./skills
    python3 skills.py validate ./skills/my-skill
    python3 skills.py evaluate ./skills/my-skill
    python3 skills.py evaluate ./skills/my-skill --json
    python3 skills.py package ./skills/my-skill ./dist
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import zipfile
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any

try:
    import yaml  # type: ignore[import-not-found]

    HAS_YAML = True
except ImportError:
    yaml = None  # type: ignore[assignment]
    HAS_YAML = False


def parse_simple_yaml(text: str) -> dict[str, Any]:
    """
    Simple YAML frontmatter parser for when PyYAML is not available.
    Handles basic key: value pairs only (no nested structures).
    """
    result: dict[str, Any] = {}
    for line in text.strip().split("\n"):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if ":" in line:
            key, _, value = line.partition(":")
            key = key.strip()
            value = value.strip()
            # Remove quotes if present
            if (value.startswith('"') and value.endswith('"')) or (
                value.startswith("'") and value.endswith("'")
            ):
                value = value[1:-1]
            result[key] = value
    return result


###############################################################################
# TEMPLATES - Read from assets folder
###############################################################################

# Get the skill root directory (parent of scripts/)
SCRIPT_DIR = Path(__file__).parent.resolve()
SKILL_ROOT = SCRIPT_DIR.parent
ASSETS_DIR = SKILL_ROOT / "assets"


def load_template(filename: str, fallback: str = "") -> str:
    """Load template from assets folder, return fallback if not found."""
    template_path = ASSETS_DIR / filename
    if template_path.exists():
        return template_path.read_text()
    return fallback


def render_template(template: str, **kwargs: str) -> str:
    """Replace {{placeholder}} style variables in template."""
    result = template
    for key, value in kwargs.items():
        result = result.replace(f"{{{{{key}}}}}", value)
    return result


# Fallback templates (used if assets not found)
SKILL_TEMPLATE_FALLBACK = """---
name: {{skill_name}}
description: [TODO: Complete explanation]
---

# {{skill_title}}

## Overview

[TODO: 1-2 sentences]

## Quick Start

[TODO: Add example]

## Workflow

[TODO: Define steps]
"""

EXAMPLE_SCRIPT_FALLBACK = '''#!/usr/bin/env python3
"""{{skill_title}} Utility - Helper script for {{skill_name}} skill."""

from __future__ import annotations
import sys
import argparse

def cmd_hello(args: argparse.Namespace) -> int:
    """Handle hello command."""
    print(f"Hello, {args.name}!")
    return 0

def main() -> int:
    """Main entry point."""
    parser = argparse.ArgumentParser(description="{{skill_title}} Utility")
    subparsers = parser.add_subparsers(dest="command", help="Commands")

    hello_parser = subparsers.add_parser("hello", help="Say hello")
    hello_parser.add_argument("name", help="Name to greet")

    args = parser.parse_args()

    if args.command == "hello":
        return cmd_hello(args)
    parser.print_help()
    return 1

if __name__ == "__main__":
    sys.exit(main())
'''

EXAMPLE_REFERENCE_FALLBACK = """# Reference for {{skill_title}}

Replace with actual reference content or delete if not needed.
"""

###############################################################################
# VALIDATION
###############################################################################

ALLOWED_PROPERTIES = {"name", "description", "license", "allowed-tools", "metadata"}


def parse_frontmatter(content: str) -> tuple[dict[str, Any] | None, str]:
    """
    Parse YAML frontmatter from markdown content.

    Args:
        content: Full markdown content with frontmatter

    Returns:
        Tuple of (frontmatter_dict or None, error_message)
    """
    if not content.startswith("---"):
        return None, "No YAML frontmatter found"

    match = re.match(r"^---\n(.*?)\n---", content, re.DOTALL)
    if not match:
        return None, "Invalid frontmatter format"

    frontmatter_text = match.group(1)

    # Parse YAML frontmatter (use PyYAML if available, fallback to simple parser)
    try:
        if HAS_YAML and yaml is not None:
            frontmatter = yaml.safe_load(frontmatter_text)
        else:
            frontmatter = parse_simple_yaml(frontmatter_text)
        if not isinstance(frontmatter, dict):
            return None, "Frontmatter must be a YAML dictionary"
    except Exception as e:
        return None, f"Invalid YAML: {e}"

    return frontmatter, ""


def validate_skill(skill_path: str | Path) -> tuple[bool, str]:
    """
    Validate a skill directory structure and frontmatter.

    Args:
        skill_path: Path to the skill directory

    Returns:
        Tuple of (is_valid, message)
    """
    skill_path = Path(skill_path).resolve()

    # Check SKILL.md exists
    skill_md = skill_path / "SKILL.md"
    if not skill_md.exists():
        return False, "SKILL.md not found"

    # Read content
    content = skill_md.read_text()
    if not content.startswith("---"):
        return False, "No YAML frontmatter found"

    # Extract frontmatter
    match = re.match(r"^---\n(.*?)\n---", content, re.DOTALL)
    if not match:
        return False, "Invalid frontmatter format"

    frontmatter_text = match.group(1)

    # Parse YAML frontmatter (use PyYAML if available, fallback to simple parser)
    try:
        if HAS_YAML and yaml is not None:
            frontmatter = yaml.safe_load(frontmatter_text)
        else:
            frontmatter = parse_simple_yaml(frontmatter_text)
        if not isinstance(frontmatter, dict):
            return False, "Frontmatter must be a YAML dictionary"
    except Exception as e:
        return False, f"Invalid YAML in frontmatter: {e}"

    # Check for unexpected properties
    unexpected_keys = set(frontmatter.keys()) - ALLOWED_PROPERTIES
    if unexpected_keys:
        return False, (
            f"Unexpected key(s) in frontmatter: {', '.join(sorted(unexpected_keys))}. "
            f"Allowed: {', '.join(sorted(ALLOWED_PROPERTIES))}"
        )

    # Check required fields
    if "name" not in frontmatter:
        return False, "Missing 'name' in frontmatter"
    if "description" not in frontmatter:
        return False, "Missing 'description' in frontmatter"

    # Validate name
    name = frontmatter.get("name", "")
    if not isinstance(name, str):
        return False, f"Name must be a string, got {type(name).__name__}"

    name = name.strip()
    if name:
        # Check naming convention (hyphen-case)
        if not re.match(r"^[a-z0-9-]+$", name):
            return (
                False,
                f"Name '{name}' must be hyphen-case (lowercase, digits, hyphens only)",
            )
        if name.startswith("-") or name.endswith("-") or "--" in name:
            return (
                False,
                f"Name '{name}' cannot start/end with hyphen or contain consecutive hyphens",
            )
        # Check length (max 64 characters)
        if len(name) > 64:
            return False, f"Name too long ({len(name)} chars). Maximum is 64."

    # Validate description
    description = frontmatter.get("description", "")
    if not isinstance(description, str):
        return False, f"Description must be a string, got {type(description).__name__}"

    description = description.strip()
    if description:
        # Check for angle brackets (no XML tags)
        if "<" in description or ">" in description:
            return False, "Description cannot contain angle brackets (< or >)"
        # Check length (max 1024 characters)
        if len(description) > 1024:
            return (
                False,
                f"Description too long ({len(description)} chars). Maximum is 1024.",
            )

    # Check for TODO placeholders
    if "[TODO:" in content:
        return False, "SKILL.md contains unresolved [TODO:] placeholders"

    return True, "Skill is valid!"


###############################################################################
# INITIALIZATION
###############################################################################


def title_case_skill_name(skill_name: str) -> str:
    """Convert hyphenated skill name to Title Case."""
    return " ".join(word.capitalize() for word in skill_name.split("-"))


def init_skill(skill_name: str, path: str) -> Path | None:
    """
    Initialize a new skill directory with template SKILL.md.

    Args:
        skill_name: Name of the skill
        path: Path where the skill directory should be created

    Returns:
        Path to created skill directory, or None if error
    """
    # Validate skill name format
    if not re.match(r"^[a-z0-9-]+$", skill_name):
        print(
            f"Error: Skill name '{skill_name}' must be hyphen-case (lowercase, digits, hyphens only)"
        )
        return None

    if skill_name.startswith("-") or skill_name.endswith("-") or "--" in skill_name:
        print(
            f"Error: Skill name '{skill_name}' cannot start/end with hyphen or contain consecutive hyphens"
        )
        return None

    if len(skill_name) > 64:
        print(f"Error: Skill name too long ({len(skill_name)} chars). Maximum is 64.")
        return None

    # Determine skill directory path
    skill_dir = Path(path).resolve() / skill_name

    # Check if directory already exists
    if skill_dir.exists():
        print(f"Error: Skill directory already exists: {skill_dir}")
        return None

    # Create skill directory
    try:
        skill_dir.mkdir(parents=True, exist_ok=False)
        print(f"Created skill directory: {skill_dir}")
    except Exception as e:
        print(f"Error creating directory: {e}")
        return None

    # Create SKILL.md from template (load from assets or use fallback)
    skill_title = title_case_skill_name(skill_name)
    skill_template = load_template("skill-template.md", SKILL_TEMPLATE_FALLBACK)
    skill_content = render_template(
        skill_template, skill_name=skill_name, skill_title=skill_title
    )

    skill_md_path = skill_dir / "SKILL.md"
    try:
        skill_md_path.write_text(skill_content)
        print("Created SKILL.md")
    except Exception as e:
        print(f"Error creating SKILL.md: {e}")
        return None

    # Create resource directories with examples
    try:
        # scripts/
        scripts_dir = skill_dir / "scripts"
        scripts_dir.mkdir(exist_ok=True)
        example_script_template = load_template(
            "example-script.py", EXAMPLE_SCRIPT_FALLBACK
        )
        example_script = scripts_dir / "example.py"
        example_script.write_text(
            render_template(
                example_script_template, skill_name=skill_name, skill_title=skill_title
            )
        )
        example_script.chmod(0o755)
        print("Created scripts/example.py")

        # references/
        references_dir = skill_dir / "references"
        references_dir.mkdir(exist_ok=True)
        example_ref_template = load_template(
            "example-reference.md", EXAMPLE_REFERENCE_FALLBACK
        )
        example_reference = references_dir / "api_reference.md"
        example_reference.write_text(
            render_template(example_ref_template, skill_title=skill_title)
        )
        print("Created references/api_reference.md")

        # assets/ (empty directory - no example file needed)
        assets_dir = skill_dir / "assets"
        assets_dir.mkdir(exist_ok=True)
        print("Created assets/")

    except Exception as e:
        print(f"Error creating resource directories: {e}")
        return None

    print(f"\nSkill '{skill_name}' initialized at {skill_dir}")
    print("\nNext steps:")
    print("1. Edit SKILL.md - complete TODO items and update description")
    print("2. Customize or delete example files in scripts/, references/, assets/")
    print("3. Run: python3 skills.py validate <skill-path>")

    return skill_dir


###############################################################################
# PACKAGING
###############################################################################


def package_skill(
    skill_path: str | Path, output_dir: str | Path | None = None
) -> Path | None:
    """
    Package a skill folder into a .skill file.

    Args:
        skill_path: Path to the skill folder
        output_dir: Optional output directory (defaults to current directory)

    Returns:
        Path to the created .skill file, or None if error
    """
    skill_path_resolved = Path(skill_path).resolve()

    # Validate skill folder exists
    if not skill_path_resolved.exists():
        print(f"Error: Skill folder not found: {skill_path_resolved}")
        return None

    if not skill_path_resolved.is_dir():
        print(f"Error: Path is not a directory: {skill_path_resolved}")
        return None

    # Validate SKILL.md exists
    skill_md = skill_path_resolved / "SKILL.md"
    if not skill_md.exists():
        print(f"Error: SKILL.md not found in {skill_path_resolved}")
        return None

    # Run validation before packaging
    print("Validating skill...")
    valid, message = validate_skill(skill_path_resolved)
    if not valid:
        print(f"Validation failed: {message}")
        print("Please fix validation errors before packaging.")
        return None
    print(f"{message}\n")

    # Determine output location
    skill_name = skill_path_resolved.name
    if output_dir:
        output_path = Path(output_dir).resolve()
        output_path.mkdir(parents=True, exist_ok=True)
    else:
        output_path = Path.cwd()

    skill_filename = output_path / f"{skill_name}.skill"

    # Create the .skill file (zip format)
    try:
        with zipfile.ZipFile(skill_filename, "w", zipfile.ZIP_DEFLATED) as zipf:
            for file_path in skill_path_resolved.rglob("*"):
                if file_path.is_file():
                    # Skip __pycache__ and other unwanted files
                    if "__pycache__" in str(file_path) or file_path.suffix == ".pyc":
                        continue
                    arcname = file_path.relative_to(skill_path_resolved.parent)
                    zipf.write(file_path, arcname)
                    print(f"  Added: {arcname}")

        print(f"\nSuccessfully packaged skill to: {skill_filename}")
        return skill_filename

    except Exception as e:
        print(f"Error creating .skill file: {e}")
        return None



###############################################################################
# EVALUATION
###############################################################################

# Scoring weights
DIMENSION_WEIGHTS = {
    "frontmatter": 0.10,
    "content": 0.25,
    "security": 0.20,
    "structure": 0.15,
    "efficiency": 0.10,
    "best_practices": 0.10,
    "code_quality": 0.10,
}


class ValidationResult(Enum):
    """Result of structural validation."""
    PASS = "PASS"
    FAIL = "FAIL"


class Grade(Enum):
    """Letter grade for overall quality."""
    A = ("A", 9.0, 10.0, "Production ready")
    B = ("B", 7.0, 8.9, "Minor fixes needed")
    C = ("C", 5.0, 6.9, "Moderate revision")
    D = ("D", 3.0, 4.9, "Major revision")
    F = ("F", 0.0, 2.9, "Rewrite needed")

    @classmethod
    def from_score(cls, score: float) -> "Grade":
        """Get grade from numeric score."""
        for grade in cls:
            if grade.min_score <= score <= grade.max_score:
                return grade
        return cls.F

    def __init__(self, letter: str, min_score: float, max_score: float, description: str):
        self.letter = letter
        self.min_score = min_score
        self.max_score = max_score
        self.description = description


@dataclass
class DimensionScore:
    """Score for a single dimension."""
    name: str
    score: float  # 0-10
    weight: float
    findings: list[str] = field(default_factory=list)
    recommendations: list[str] = field(default_factory=list)

    @property
    def weighted_score(self) -> float:
        """Weighted contribution to total score."""
        return self.score * self.weight


@dataclass
class EvaluationResult:
    """Complete evaluation result."""
    skill_path: Path
    validation_result: ValidationResult | None = None
    validation_message: str = ""
    dimensions: dict[str, DimensionScore] = field(default_factory=dict)
    total_score: float = 0.0
    grade: Grade = Grade.F

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON output."""
        return {
            "skill_path": str(self.skill_path),
            "validation": {
                "result": self.validation_result.value if self.validation_result else None,
                "message": self.validation_message,
            },
            "dimensions": {
                name: {
                    "score": d.score,
                    "weight": d.weight,
                    "weighted_score": d.weighted_score,
                    "findings": d.findings,
                    "recommendations": d.recommendations,
                }
                for name, d in self.dimensions.items()
            },
            "total_score": round(self.total_score, 2),
            "grade": self.grade.letter,
            "grade_description": self.grade.description,
        }

def evaluate_frontmatter(skill_path: Path) -> DimensionScore:
    """Evaluate frontmatter quality."""
    findings = []
    recommendations = []
    score = 10.0

    skill_md = skill_path / "SKILL.md"
    if not skill_md.exists():
        return DimensionScore(
            name="frontmatter",
            score=0.0,
            weight=DIMENSION_WEIGHTS["frontmatter"],
            findings=["SKILL.md not found"],
            recommendations=["Create SKILL.md with proper frontmatter"],
        )

    content = skill_md.read_text()
    frontmatter, error = parse_frontmatter(content)

    if frontmatter is None:
        return DimensionScore(
            name="frontmatter",
            score=0.0,
            weight=DIMENSION_WEIGHTS["frontmatter"],
            findings=[f"Frontmatter error: {error}"],
            recommendations=["Fix YAML frontmatter syntax"],
        )

    # Check required fields
    required_fields = ["name", "description"]
    for field in required_fields:
        if field not in frontmatter:
            findings.append(f"Missing required field: {field}")
            recommendations.append(f"Add '{field}' to frontmatter")
            score -= 2.0

    # Check optional fields
    if "allowed-tools" in frontmatter:
        findings.append("Has allowed-tools specification")
    else:
        recommendations.append("Consider adding allowed-tools for better scoping")

    # Check description quality
    description = frontmatter.get("description", "")
    if description:
        if len(description) < 20:
            findings.append("Description is very short")
            recommendations.append("Expand description to better explain the skill")
            score -= 1.0
        elif len(description) > 1024:
            findings.append("Description exceeds 1024 characters")
            score -= 1.0
        else:
            findings.append("Description length is appropriate")
    else:
        score -= 3.0

    # Check naming convention
    name = frontmatter.get("name", "")
    if name:
        if not re.match(r"^[a-z0-9-]+$", name):
            findings.append("Name does not follow hyphen-case convention")
            score -= 1.0
        if name.startswith("-") or name.endswith("-") or "--" in name:
            findings.append("Name has invalid hyphen placement")
            score -= 1.0

    return DimensionScore(
        name="frontmatter",
        score=max(0.0, min(10.0, score)),
        weight=DIMENSION_WEIGHTS["frontmatter"],
        findings=findings,
        recommendations=recommendations,
    )


def evaluate_content(skill_path: Path) -> DimensionScore:
    """Evaluate content quality."""
    findings = []
    recommendations = []
    score = 10.0

    skill_md = skill_path / "SKILL.md"
    if not skill_md.exists():
        return DimensionScore(
            name="content",
            score=0.0,
            weight=DIMENSION_WEIGHTS["content"],
            findings=["SKILL.md not found"],
            recommendations=["Create SKILL.md with comprehensive content"],
        )

    content = skill_md.read_text()

    # Remove frontmatter
    content_body = re.sub(r"^---\n.*?\n---\n", "", content, flags=re.DOTALL)

    # Check content length
    lines = [l for l in content_body.split("\n") if l.strip()]
    if len(lines) < 20:
        findings.append("Content is very brief (< 20 lines)")
        recommendations.append("Expand content with more details")
        score -= 2.0
    elif len(lines) > 500:
        findings.append("Content is very long (> 500 lines)")
        recommendations.append("Consider splitting into smaller skills")
        score -= 1.0
    else:
        findings.append(f"Content length is appropriate ({len(lines)} lines)")

    # Check for sections
    has_overview = "## Overview" in content or "# Overview" in content
    has_examples = "## Example" in content or "```" in content
    has_workflow = "## Workflow" in content or "## When to use" in content

    if has_overview:
        findings.append("Has Overview section")
    else:
        recommendations.append("Add Overview section explaining the skill")
        score -= 1.0

    if has_examples:
        findings.append("Has examples or code blocks")
    else:
        recommendations.append("Add examples to illustrate usage")
        score -= 1.5

    if has_workflow:
        findings.append("Has workflow/usage guidance")
    else:
        recommendations.append("Add workflow or step-by-step guidance")
        score -= 1.5

    # Check for TODO placeholders
    if "[TODO:" in content:
        findings.append("Contains unresolved TODO placeholders")
        recommendations.append("Complete or remove TODO placeholders")
        score -= 2.0

    # Check for clarity indicators
    has_quick_start = "## Quick Start" in content or "# Quick Start" in content
    if has_quick_start:
        findings.append("Has Quick Start section")
    else:
        recommendations.append("Consider adding Quick Start section")

    return DimensionScore(
        name="content",
        score=max(0.0, min(10.0, score)),
        weight=DIMENSION_WEIGHTS["content"],
        findings=findings,
        recommendations=recommendations,
    )


def evaluate_security(skill_path: Path) -> DimensionScore:
    """Evaluate security considerations."""
    findings = []
    recommendations = []
    score = 10.0

    skill_md = skill_path / "SKILL.md"
    if not skill_md.exists():
        return DimensionScore(
            name="security",
            score=0.0,
            weight=DIMENSION_WEIGHTS["security"],
            findings=["SKILL.md not found"],
            recommendations=["Create SKILL.md with security considerations"],
        )

    content = skill_md.read_text().lower()

    # Check for dangerous patterns
    dangerous_patterns = [
        ("eval(", "Use of eval() - code injection risk"),
        ("exec(", "Use of exec() - code injection risk"),
        ("subprocess.call(shell=true)", "shell=True - command injection risk"),
        ("os.system(", "Use of os.system() - command injection risk"),
        ("pickle.loads(", "Use of pickle - arbitrary code execution risk"),
        ("__import__", "Dynamic imports - potential code injection risk"),
    ]

    for pattern, warning in dangerous_patterns:
        if pattern in content:
            findings.append(f"SECURITY: {warning}")
            recommendations.append(f"Review and document safe use of: {pattern}")
            score -= 1.5

    # Check for security mentions
    security_keywords = ["security", "inject", "sanitize", "validate", "escape", "credential"]
    has_security_discussion = any(keyword in content for keyword in security_keywords)

    if has_security_discussion:
        findings.append("Mentions security considerations")
    else:
        recommendations.append("Add security considerations if applicable")

    # Check for references
    refs_dir = skill_path / "references"
    if refs_dir.exists():
        findings.append("Has references directory for documentation")
    else:
        recommendations.append("Consider adding references for security guidance")

    # Check scripts for dangerous patterns
    scripts_dir = skill_path / "scripts"
    if scripts_dir.exists():
        for script_file in scripts_dir.glob("*.py"):
            script_content = script_file.read_text().lower()
            for pattern, warning in dangerous_patterns:
                if pattern in script_content:
                    findings.append(f"SECURITY in {script_file.name}: {warning}")
                    score -= 1.0

    if not any("SECURITY:" in f for f in findings):
        findings.append("No obvious security issues detected")

    return DimensionScore(
        name="security",
        score=max(0.0, min(10.0, score)),
        weight=DIMENSION_WEIGHTS["security"],
        findings=findings,
        recommendations=recommendations,
    )


def evaluate_structure(skill_path: Path) -> DimensionScore:
    """Evaluate structural organization."""
    findings = []
    recommendations = []
    score = 10.0

    # Check directory structure
    has_skill_md = (skill_path / "SKILL.md").exists()
    has_scripts = (skill_path / "scripts").exists()
    has_references = (skill_path / "references").exists()
    has_assets = (skill_path / "assets").exists()

    if has_skill_md:
        findings.append("Has SKILL.md")
    else:
        recommendations.append("Add SKILL.md")
        score -= 3.0

    # Check for progressive disclosure
    skill_md = skill_path / "SKILL.md"
    if has_skill_md:
        content = skill_md.read_text()

        # Look for progressive disclosure patterns
        has_quick_start = "## Quick Start" in content or "# Quick Start" in content
        has_overview = "## Overview" in content
        has_advanced = "## Advanced" in content or "###" in content

        if has_quick_start:
            findings.append("Has Quick Start (progressive disclosure)")
        else:
            recommendations.append("Add Quick Start for progressive disclosure")
            score -= 1.0

        if has_overview:
            findings.append("Has Overview section")
        else:
            score -= 1.0

        # Check heading hierarchy
        heading_levels = []
        for line in content.split("\n"):
            if line.startswith("#"):
                level = len(line) - len(line.lstrip("#"))
                if level <= 3:  # Only count top 3 levels
                    heading_levels.append(level)

        if heading_levels:
            # Check for proper hierarchy (should start with # or ##)
            if heading_levels[0] > 2:
                findings.append("Content structure starts with deep heading")
                score -= 0.5
            else:
                findings.append("Good heading hierarchy")
        else:
            recommendations.append("Add clear heading structure")

    # Check resource directories
    if has_scripts:
        findings.append("Has scripts/ directory")
    if has_references:
        findings.append("Has references/ directory")
    if has_assets:
        findings.append("Has assets/ directory")

    return DimensionScore(
        name="structure",
        score=max(0.0, min(10.0, score)),
        weight=DIMENSION_WEIGHTS["structure"],
        findings=findings,
        recommendations=recommendations,
    )


def evaluate_efficiency(skill_path: Path) -> DimensionScore:
    """Evaluate token efficiency."""
    findings = []
    recommendations = []
    score = 10.0

    skill_md = skill_path / "SKILL.md"
    if not skill_md.exists():
        return DimensionScore(
            name="efficiency",
            score=0.0,
            weight=DIMENSION_WEIGHTS["efficiency"],
            findings=["SKILL.md not found"],
            recommendations=["Create SKILL.md"],
        )

    content = skill_md.read_text()

    # Check token count (rough estimate: ~4 chars per token)
    char_count = len(content)
    token_estimate = char_count / 4

    if token_estimate < 500:
        findings.append(f"Token-efficient (~{int(token_estimate)} tokens)")
    elif token_estimate < 1500:
        findings.append(f"Reasonable size (~{int(token_estimate)} tokens)")
    elif token_estimate < 3000:
        findings.append(f"Large skill (~{int(token_estimate)} tokens)")
        recommendations.append("Consider splitting into smaller skills")
        score -= 1.0
    else:
        findings.append(f"Very large skill (~{int(token_estimate)} tokens)")
        recommendations.append("Strongly consider splitting into smaller, focused skills")
        score -= 2.0

    # Check for redundant content
    lines = content.split("\n")
    non_empty_lines = [l.strip() for l in lines if l.strip()]

    # Look for repetitive patterns
    if len(non_empty_lines) > 50:
        # Check for duplicate lines (case-insensitive)
        seen = set()
        duplicates = 0
        for line in non_empty_lines:
            line_lower = line.lower()
            if line_lower in seen and len(line) > 20:  # Only meaningful lines
                duplicates += 1
            seen.add(line_lower)

        if duplicates > 5:
            findings.append(f"Found {duplicates} potentially duplicate lines")
            recommendations.append("Review and consolidate duplicate content")
            score -= 1.0

    # Check for excessive verbosity
    word_counts = [len(line.split()) for line in non_empty_lines if line]
    if word_counts:
        avg_words_per_line = sum(word_counts) / len(word_counts)
        if avg_words_per_line > 30:
            findings.append("Lines tend to be verbose")
            recommendations.append("Consider shorter, more concise lines")
            score -= 0.5

    return DimensionScore(
        name="efficiency",
        score=max(0.0, min(10.0, score)),
        weight=DIMENSION_WEIGHTS["efficiency"],
        findings=findings,
        recommendations=recommendations,
    )


def evaluate_best_practices(skill_path: Path) -> DimensionScore:
    """Evaluate adherence to best practices."""
    findings = []
    recommendations = []
    score = 10.0

    skill_md = skill_path / "SKILL.md"
    if not skill_md.exists():
        return DimensionScore(
            name="best_practices",
            score=0.0,
            weight=DIMENSION_WEIGHTS["best_practices"],
            findings=["SKILL.md not found"],
            recommendations=["Create SKILL.md"],
        )

    content = skill_md.read_text()
    frontmatter, _ = parse_frontmatter(content)

    # Check naming convention
    if frontmatter:
        name = frontmatter.get("name", "")
        if name:
            if re.match(r"^[a-z0-9-]+$", name):
                findings.append("Follows hyphen-case naming convention")
            else:
                findings.append("Does not follow hyphen-case naming")
                score -= 1.5

    # Check for anti-patterns
    todo_count = content.count("TODO:")
    if todo_count > 0:
        findings.append(f"Contains {todo_count} TODO placeholders")
        recommendations.append("Resolve TODO placeholders before production")
        score -= min(2.0, todo_count * 0.5)

    # Check for clear activation
    if frontmatter:
        description = frontmatter.get("description", "")
        if description:
            if len(description) >= 20 and len(description) <= 1024:
                findings.append("Description length is appropriate")
            else:
                recommendations.append("Improve description (20-1024 characters)")
                score -= 1.0

    # Check for when to use guidance
    if "when to use" in content.lower():
        findings.append("Has 'when to use' guidance")
    else:
        recommendations.append("Consider adding 'when to use' section")

    # Check scripts directory for best practices
    scripts_dir = skill_path / "scripts"
    if scripts_dir.exists():
        for script_file in scripts_dir.glob("*.py"):
            script_content = script_file.read_text()

            # Check for shebang
            if script_content.startswith("#!/usr/bin/env python3"):
                findings.append(f"{script_file.name}: Has proper shebang")
            else:
                recommendations.append(f"{script_file.name}: Add #!/usr/bin/env python3 shebang")

            # Check for __future__ imports (Python best practice)
            if "from __future__ import" in script_content:
                findings.append(f"{script_file.name}: Uses __future__ imports")
            else:
                recommendations.append(
                    f"{script_file.name}: Consider adding 'from __future__ import annotations'"
                )

    return DimensionScore(
        name="best_practices",
        score=max(0.0, min(10.0, score)),
        weight=DIMENSION_WEIGHTS["best_practices"],
        findings=findings,
        recommendations=recommendations,
    )


def evaluate_code_quality(skill_path: Path) -> DimensionScore:
    """Evaluate code quality in scripts directory."""
    findings = []
    recommendations = []
    score = 10.0

    scripts_dir = skill_path / "scripts"
    if not scripts_dir.exists():
        return DimensionScore(
            name="code_quality",
            score=10.0,  # N/A if no scripts
            weight=DIMENSION_WEIGHTS["code_quality"],
            findings=["No scripts directory (N/A for this dimension)"],
            recommendations=[],
        )

    script_files = list(scripts_dir.glob("*.py"))
    if not script_files:
        return DimensionScore(
            name="code_quality",
            score=10.0,  # N/A if no scripts
            weight=DIMENSION_WEIGHTS["code_quality"],
            findings=["No Python scripts found (N/A for this dimension)"],
            recommendations=[],
        )

    for script_file in script_files:
        script_content = script_file.read_text()

        # Check for error handling
        if "try:" in script_content:
            findings.append(f"{script_file.name}: Has error handling")
        else:
            recommendations.append(f"{script_file.name}: Consider adding error handling")
            score -= 0.5

        # Check for main guard
        if '__name__ == "__main__"' in script_content:
            findings.append(f"{script_file.name}: Has main guard")
        else:
            recommendations.append(f"{script_file.name}: Add main guard")
            score -= 0.5

        # Check for type hints
        has_type_hints = bool(
            re.search(r":\s*(str|int|float|bool|list|dict|Path|None)", script_content)
        )
        if has_type_hints:
            findings.append(f"{script_file.name}: Uses type hints")
        else:
            recommendations.append(f"{script_file.name}: Consider adding type hints")
            score -= 0.5

        # Check for docstrings
        if '"""' in script_content or "'''" in script_content:
            findings.append(f"{script_file.name}: Has docstrings")
        else:
            recommendations.append(f"{script_file.name}: Add docstrings")
            score -= 0.5

        # Check for bare except
        if "except:" in script_content or "except :" in script_content:
            findings.append(f"{script_file.name}: Has bare except (anti-pattern)")
            score -= 1.0

    return DimensionScore(
        name="code_quality",
        score=max(0.0, min(10.0, score)),
        weight=DIMENSION_WEIGHTS["code_quality"],
        findings=findings,
        recommendations=recommendations,
    )


def run_quality_assessment(skill_path: Path) -> dict[str, DimensionScore]:
    """Run all quality assessment dimensions."""
    return {
        "frontmatter": evaluate_frontmatter(skill_path),
        "content": evaluate_content(skill_path),
        "security": evaluate_security(skill_path),
        "structure": evaluate_structure(skill_path),
        "efficiency": evaluate_efficiency(skill_path),
        "best_practices": evaluate_best_practices(skill_path),
        "code_quality": evaluate_code_quality(skill_path),
    }


def calculate_total_score(dimensions: dict[str, DimensionScore]) -> float:
    """Calculate total weighted score."""
    total = sum(d.weighted_score for d in dimensions.values())
    return round(total, 2)


def format_report(result: EvaluationResult) -> str:
    """Format evaluation result as human-readable report."""
    lines = []
    lines.append("=" * 70)
    lines.append(f"SKILL EVALUATION REPORT")
    lines.append(f"Path: {result.skill_path}")
    lines.append("=" * 70)
    lines.append("")

    # Phase 1: Structural Validation
    lines.append("## Phase 1: Structural Validation")
    lines.append("-" * 70)
    if result.validation_result == ValidationResult.PASS:
        lines.append(f"✓ PASSED: {result.validation_message}")
    else:
        lines.append(f"✗ FAILED: {result.validation_message}")
    lines.append("")

    # Phase 2: Quality Assessment
    lines.append("## Phase 2: Quality Assessment")
    lines.append("-" * 70)
    lines.append("")

    for dim_name, dim_score in result.dimensions.items():
        lines.append(f"### {dim_name.replace('_', ' ').title()}")
        lines.append(f"Score: {dim_score.score:.1f}/10 | Weight: {dim_score.weight*100:.0f}% | "
                    f"Weighted: {dim_score.weighted_score:.2f}")
        lines.append("")

        if dim_score.findings:
            lines.append("Findings:")
            for finding in dim_score.findings:
                lines.append(f"  • {finding}")
            lines.append("")

        if dim_score.recommendations:
            lines.append("Recommendations:")
            for rec in dim_score.recommendations:
                lines.append(f"  → {rec}")
            lines.append("")

    # Overall Score
    lines.append("## Overall Score")
    lines.append("-" * 70)
    lines.append(f"Total Score: {result.total_score:.2f}/10")
    lines.append(f"Grade: {result.grade.letter} - {result.grade.description}")
    lines.append("")

    # Grade scale reference
    lines.append("### Grading Scale")
    lines.append("A (9.0-10.0) | Production ready")
    lines.append("B (7.0-8.9)  | Minor fixes needed")
    lines.append("C (5.0-6.9)  | Moderate revision")
    lines.append("D (3.0-4.9)  | Major revision")
    lines.append("F (0.0-2.9)  | Rewrite needed")
    lines.append("")

    lines.append("=" * 70)

    return "\n".join(lines)



###############################################################################
# CLI INTERFACE
###############################################################################


def cmd_init(args):
    """Handle init command."""
    if not args.skill_name or not args.path:
        print("Usage: skills.py init <skill-name> --path <path>")
        print("\nExample:")
        print("  skills.py init my-skill --path ./skills")
        return 1

    print(f"Initializing skill: {args.skill_name}")
    print(f"Location: {args.path}\n")

    result = init_skill(args.skill_name, args.path)
    return 0 if result else 1


def cmd_validate(args):
    """Handle validate command."""
    if not args.skill_path:
        print("Usage: skills.py validate <skill-path>")
        print("\nExample:")
        print("  skills.py validate ./skills/my-skill")
        return 1

    print(f"Validating skill: {args.skill_path}\n")

    valid, message = validate_skill(args.skill_path)
    print(message)
    return 0 if valid else 1


def cmd_package(args):
    """Handle package command."""
    if not args.skill_path:
        print("Usage: skills.py package <skill-path> [output-dir]")
        print("\nExample:")
        print("  skills.py package ./skills/my-skill")
        print("  skills.py package ./skills/my-skill ./dist")
        return 1

    print(f"Packaging skill: {args.skill_path}")
    if args.output_dir:
        print(f"Output directory: {args.output_dir}")
    print()

    result = package_skill(args.skill_path, args.output_dir)
    return 0 if result else 1


def cmd_evaluate(args):
    """Handle evaluate command - two-phase skill evaluation."""
    if not args.skill_path:
        print("Usage: skills.py evaluate <skill-path> [--json]")
        print("\nExample:")
        print("  skills.py evaluate ./skills/my-skill")
        print("  skills.py evaluate ./skills/my-skill --json")
        return 1

    skill_path = Path(args.skill_path).resolve()

    if not skill_path.exists():
        print(f"Error: Path not found: {skill_path}", file=sys.stderr)
        return 1

    if not skill_path.is_dir():
        print(f"Error: Not a directory: {skill_path}", file=sys.stderr)
        return 1

    # Initialize result
    result = EvaluationResult(skill_path=skill_path)

    # Phase 1: Structural Validation
    print("Phase 1: Running structural validation...")
    valid, message = validate_skill(skill_path)
    result.validation_result = ValidationResult.PASS if valid else ValidationResult.FAIL
    result.validation_message = message

    if valid:
        print(f"  ✓ PASSED: {message}")
    else:
        print(f"  ✗ FAILED: {message}")
        print("\nNote: Structural validation failed. Quality assessment will still run.")
    print()

    # Phase 2: Quality Assessment
    print("Phase 2: Running quality assessment...")
    dimensions = run_quality_assessment(skill_path)
    result.dimensions = dimensions
    result.total_score = calculate_total_score(dimensions)
    result.grade = Grade.from_score(result.total_score)

    for dim_name, dim_score in dimensions.items():
        print(f"  {dim_name}: {dim_score.score:.1f}/10")

    print(f"\n  Total Score: {result.total_score:.2f}/10")
    print(f"  Grade: {result.grade.letter} - {result.grade.description}")
    print()

    # Output
    if args.json:
        print(json.dumps(result.to_dict(), indent=2))
    else:
        print()
        print(format_report(result))

    # Return exit code based on validation
    return 0 if valid else 1


def main():
    """Main entry point with argument parsing."""
    parser = argparse.ArgumentParser(
        description="Skill Management Utility - Initialize, validate, evaluate, and package skills.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Commands:
  init      Initialize a new skill directory structure
  validate  Validate a skill directory structure
  evaluate  Evaluate skill quality (structural + quality assessment)
  package   Package a skill for distribution

Examples:
  python3 skills.py init my-skill --path ./skills
  python3 skills.py validate ./skills/my-skill
  python3 skills.py evaluate ./skills/my-skill
  python3 skills.py evaluate ./skills/my-skill --json
  python3 skills.py package ./skills/my-skill ./dist
""",
    )

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # init command
    init_parser = subparsers.add_parser(
        "init", help="Initialize a new skill directory structure"
    )
    init_parser.add_argument("skill_name", nargs="?", help="Name of the skill")
    init_parser.add_argument("--path", help="Directory to create skill in")

    # validate command
    validate_parser = subparsers.add_parser(
        "validate", help="Validate a skill directory structure"
    )
    validate_parser.add_argument(
        "skill_path", nargs="?", help="Path to skill directory"
    )

    # package command
    package_parser = subparsers.add_parser(
        "package", help="Package a skill for distribution"
    )
    package_parser.add_argument("skill_path", nargs="?", help="Path to skill directory")
    package_parser.add_argument(
        "output_dir", nargs="?", help="Output directory (optional)"
    )

    # evaluate command
    evaluate_parser = subparsers.add_parser(
        "evaluate", help="Evaluate skill quality (structural + quality assessment)"
    )
    evaluate_parser.add_argument("skill_path", nargs="?", help="Path to skill directory")
    evaluate_parser.add_argument(
        "--json", action="store_true", help="Output results as JSON"
    )

    args = parser.parse_args()

    if args.command == "init":
        sys.exit(cmd_init(args))
    elif args.command == "validate":
        sys.exit(cmd_validate(args))
    elif args.command == "evaluate":
        sys.exit(cmd_evaluate(args))
    elif args.command == "package":
        sys.exit(cmd_package(args))
    else:
        parser.print_help()
        sys.exit(1)


###############################################################################

if __name__ == "__main__":
    main()
