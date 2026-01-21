"""Frontmatter evaluation module.

Evaluates the quality of YAML frontmatter in SKILL.md files.
"""

import re
from pathlib import Path

from .base import DimensionScore, DIMENSION_WEIGHTS

# Score deduction constants (M4: Extract magic numbers)
PENALTY_MISSING_REQUIRED = 20.0  # Missing required frontmatter field (0-100 scale)

# Handle both package import and direct execution
try:
    from ..skills import parse_frontmatter
except ImportError:
    from skills import parse_frontmatter  # type: ignore[no-redef, import-not-found]


class FrontmatterEvaluator:
    """Evaluates frontmatter quality in SKILL.md files."""

    def __init__(self):
        self._name = "frontmatter"
        self._weight = DIMENSION_WEIGHTS.get("frontmatter", 0.10)

    @property
    def name(self) -> str:
        """Dimension name."""
        return self._name

    @property
    def weight(self) -> float:
        """Weight in overall score."""
        return self._weight

    def evaluate(self, skill_path: Path) -> DimensionScore:
        """Evaluate frontmatter quality.

        Args:
            skill_path: Path to the skill directory

        Returns:
            DimensionScore with findings and recommendations
        """
        findings = []
        recommendations = []
        score = 100.0  # 0-100 scale

        skill_md = skill_path / "SKILL.md"
        if not skill_md.exists():
            return DimensionScore(
                name=self.name,
                score=0.0,
                weight=self.weight,
                findings=["SKILL.md not found"],
                recommendations=["Create SKILL.md with proper frontmatter"],
            )

        content = skill_md.read_text()
        frontmatter, error = parse_frontmatter(content)

        if frontmatter is None:
            return DimensionScore(
                name=self.name,
                score=0.0,
                weight=self.weight,
                findings=[f"Frontmatter error: {error}"],
                recommendations=["Fix YAML frontmatter syntax"],
            )

        # Check required fields
        required_fields = ["name", "description"]
        for field in required_fields:
            if field not in frontmatter:
                findings.append(f"Missing required field: {field}")
                recommendations.append(f"Add '{field}' to frontmatter")
                score -= PENALTY_MISSING_REQUIRED

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
            name=self.name,
            score=max(0.0, min(100.0, score)),  # 0-100 scale
            weight=self.weight,
            findings=findings,
            recommendations=recommendations,
        )


# Backward compatibility: standalone function
def evaluate_frontmatter(skill_path: Path) -> DimensionScore:
    """Evaluate frontmatter quality.

    Args:
        skill_path: Path to the skill directory

    Returns:
        DimensionScore with findings and recommendations
    """
    evaluator = FrontmatterEvaluator()
    return evaluator.evaluate(skill_path)
