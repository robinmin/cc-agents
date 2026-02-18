"""Frontmatter evaluation module.

Evaluates the quality of YAML frontmatter in SKILL.md files.

Uses rubric-based scoring with clear criteria for each level.
"""

import re
from pathlib import Path

from .base import DimensionScore, RubricLevel, RubricCriterion, RubricScorer, DIMENSION_WEIGHTS

# Handle both package import and direct execution
try:
    from ..skills import parse_frontmatter
except ImportError:
    from skills import parse_frontmatter  # type: ignore[no-redef, import-not-found]


# =============================================================================
# RUBRIC DEFINITIONS
# =============================================================================

# Rubric for required fields completeness (40% weight)
REQUIRED_FIELDS_RUBRIC = RubricCriterion(
    name="required_fields",
    description="Presence of required frontmatter fields",
    weight=0.40,
    levels=[
        RubricLevel("complete", 100, "Both 'name' and 'description' present with meaningful values"),
        RubricLevel("partial", 50, "One required field present, one missing"),
        RubricLevel("missing", 0, "Both required fields missing"),
    ],
)

# Rubric for description quality (35% weight)
DESCRIPTION_RUBRIC = RubricCriterion(
    name="description_quality",
    description="Quality and completeness of description field",
    weight=0.35,
    levels=[
        RubricLevel("excellent", 100, "Description is 20-1024 chars, clear and specific"),
        RubricLevel("good", 75, "Description is 20-1024 chars but somewhat generic"),
        RubricLevel("fair", 50, "Description is too short (20 chars) or too long (>1024 chars)"),
        RubricLevel("poor", 25, "Description exists but is very short (<20 chars)"),
        RubricLevel("missing", 0, "No description field"),
    ],
)

# Rubric for naming convention (25% weight)
NAMING_RUBRIC = RubricCriterion(
    name="naming_convention",
    description="Follows hyphen-case naming convention",
    weight=0.25,
    levels=[
        RubricLevel("perfect", 100, "Name follows hyphen-case pattern [a-z0-9-]+"),
        RubricLevel("minor_issues", 50, "Name has some issues (invalid hyphens)"),
        RubricLevel("invalid", 0, "Name does not follow hyphen-case at all"),
    ],
)


class FrontmatterEvaluator:
    """Evaluates frontmatter quality in SKILL.md files using rubric-based scoring."""

    # Pre-configured rubric scorer for frontmatter evaluation
    RUBRIC_SCORER = RubricScorer([
        REQUIRED_FIELDS_RUBRIC,
        DESCRIPTION_RUBRIC,
        NAMING_RUBRIC,
    ])

    def __init__(self):
        self._name = "frontmatter"
        # Weight 0 - validated in Phase 1 (structural validation), not Phase 2 (quality scoring)
        self._weight = DIMENSION_WEIGHTS.get("frontmatter", 0.0)

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
        findings: list[str] = []
        recommendations: list[str] = []

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

        # Evaluate all criteria with a single function
        def evaluate_criterion(criterion: RubricCriterion) -> tuple[str, str]:
            if criterion.name == "required_fields":
                has_name = frontmatter.get("name", "").strip() != ""
                has_desc = frontmatter.get("description", "").strip() != ""
                if has_name and has_desc:
                    return "complete", f"name='{frontmatter.get('name')}', description present"
                elif has_name or has_desc:
                    return "partial", f"only {'name' if has_name else 'description'} present"
                return "missing", "no required fields"
            elif criterion.name == "description_quality":
                desc = frontmatter.get("description", "")
                desc_len = len(desc)
                if desc_len == 0:
                    return "missing", "description empty"
                elif desc_len < 20:
                    return "poor", f"description is {desc_len} chars (very short)"
                elif desc_len > 1024:
                    return "fair", f"description is {desc_len} chars (too long)"
                else:
                    specific_patterns = ["when", "use", "skill", "handle", "process"]
                    has_specific = any(p in desc.lower() for p in specific_patterns)
                    if has_specific:
                        return "excellent", f"description is {desc_len} chars with specific usage context"
                    return "good", f"description is {desc_len} chars but somewhat generic"
            elif criterion.name == "naming_convention":
                name = frontmatter.get("name", "")
                if not name:
                    return "invalid", "name field is empty"
                has_invalid_hyphens = name.startswith("-") or name.endswith("-") or "--" in name
                is_hyphen_case = bool(re.match(r"^[a-z0-9-]+$", name))
                if is_hyphen_case and not has_invalid_hyphens:
                    return "perfect", f"name '{name}' follows hyphen-case"
                elif has_invalid_hyphens:
                    return "minor_issues", f"name '{name}' has invalid hyphen placement"
                return "invalid", f"name '{name}' does not follow hyphen-case"
            return "missing", "Unknown criterion"

        score, findings, recommendations = self.RUBRIC_SCORER.evaluate(evaluate_criterion)

        return DimensionScore(
            name=self.name,
            score=score,
            weight=self.weight,
            findings=findings,
            recommendations=recommendations if recommendations else ["Frontmatter is adequate"],
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
