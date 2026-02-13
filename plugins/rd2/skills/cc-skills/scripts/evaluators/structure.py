"""Structure evaluation module.

Evaluates the structural organization of skills using rubric-based scoring.
"""

from pathlib import Path
import re

from .base import DimensionScore, RubricLevel, RubricCriterion, RubricScorer, DIMENSION_WEIGHTS


# =============================================================================
# RUBRIC DEFINITIONS
# =============================================================================

# Rubric for SKILL.md presence (30% weight)
SKILL_MD_RUBRIC = RubricCriterion(
    name="skill_md_presence",
    description="Presence and completeness of SKILL.md",
    weight=0.30,
    levels=[
        RubricLevel("complete", 100, "SKILL.md exists with all required sections"),
        RubricLevel("present", 75, "SKILL.md exists but missing some sections"),
        RubricLevel("minimal", 50, "SKILL.md exists with minimal content"),
        RubricLevel("missing", 0, "SKILL.md is missing"),
    ],
)

# Rubric for progressive disclosure (40% weight)
PROGRESSIVE_DISCLOSURE_RUBRIC = RubricCriterion(
    name="progressive_disclosure",
    description="Quick Start and Overview sections for progressive disclosure",
    weight=0.40,
    levels=[
        RubricLevel("complete", 100, "Has both Quick Start and Overview sections"),
        RubricLevel("good", 75, "Has Quick Start section"),
        RubricLevel("fair", 50, "Has Overview section but no Quick Start"),
        RubricLevel("poor", 25, "Missing both Quick Start and Overview"),
        RubricLevel("none", 0, "SKILL.md missing or empty"),
    ],
)

# Rubric for heading hierarchy (15% weight)
HEADING_HIERARCHY_RUBRIC = RubricCriterion(
    name="heading_hierarchy",
    description="Proper heading hierarchy and structure",
    weight=0.15,
    levels=[
        RubricLevel("proper", 100, "Headings follow proper hierarchy (starts with # or ##)"),
        RubricLevel("acceptable", 75, "Headings present but minor hierarchy issues"),
        RubricLevel("deep_start", 50, "Content starts with deep heading (### or lower)"),
        RubricLevel("missing", 25, "No clear heading structure"),
    ],
)

# Rubric for resource directories (15% weight)
RESOURCE_DIRS_RUBRIC = RubricCriterion(
    name="resource_directories",
    description="Supporting directories (scripts/, references/, assets/)",
    weight=0.15,
    levels=[
        RubricLevel("complete", 100, "Has scripts/, references/, and assets/ directories"),
        RubricLevel("good", 75, "Has scripts/ and at least one other resource directory"),
        RubricLevel("adequate", 50, "Has scripts/ directory"),
        RubricLevel("minimal", 25, "Has only one resource directory"),
        RubricLevel("none", 0, "No resource directories"),
    ],
)


class StructureEvaluator:
    """Evaluates structural organization in skills using rubric-based scoring."""

    # Pre-configured rubric scorer
    RUBRIC_SCORER = RubricScorer([
        SKILL_MD_RUBRIC,
        PROGRESSIVE_DISCLOSURE_RUBRIC,
        HEADING_HIERARCHY_RUBRIC,
        RESOURCE_DIRS_RUBRIC,
    ])

    def __init__(self):
        self._name = "structure"
        self._weight = DIMENSION_WEIGHTS.get("structure", 0.10)  # Updated weight

    @property
    def name(self) -> str:
        """Dimension name."""
        return self._name

    @property
    def weight(self) -> float:
        """Weight in overall score."""
        return self._weight

    def evaluate(self, skill_path: Path) -> DimensionScore:
        """Evaluate structural organization."""
        findings: list[str] = []
        recommendations: list[str] = []

        # Check directory structure
        has_skill_md = (skill_path / "SKILL.md").exists()
        has_scripts = (skill_path / "scripts").exists()
        has_references = (skill_path / "references").exists()
        has_assets = (skill_path / "assets").exists()

        # Check SKILL.md content
        skill_md = skill_path / "SKILL.md"
        content = ""
        heading_levels: list[int] = []
        has_quick_start = False
        has_overview = False

        if has_skill_md:
            content = skill_md.read_text()
            has_quick_start = bool(re.search(r"^#{1,3}\s+Quick\s+Start", content, re.MULTILINE | re.IGNORECASE))
            has_overview = bool(re.search(r"^#{1,3}\s+Overview", content, re.MULTILINE | re.IGNORECASE))

            # Analyze heading hierarchy
            for line in content.split("\n"):
                if line.startswith("#"):
                    level = len(line) - len(line.lstrip("#"))
                    if level <= 3:
                        heading_levels.append(level)

        # Evaluate SKILL.md presence
        def eval_skill_md(criterion: RubricCriterion) -> tuple[str, str]:
            if has_skill_md:
                return "present", "SKILL.md exists"
            return "missing", "SKILL.md is missing"

        # Evaluate progressive disclosure
        def eval_progressive(criterion: RubricCriterion) -> tuple[str, str]:
            if not has_skill_md:
                return "none", "SKILL.md missing"
            if has_quick_start and has_overview:
                return "complete", "Has Quick Start and Overview"
            elif has_quick_start:
                return "good", "Has Quick Start"
            elif has_overview:
                return "fair", "Has Overview but no Quick Start"
            return "poor", "Missing progressive disclosure sections"

        # Evaluate heading hierarchy
        def eval_heading(criterion: RubricCriterion) -> tuple[str, str]:
            if not heading_levels:
                return "missing", "No heading structure"
            if heading_levels[0] > 3:
                return "deep_start", f"Starts with level {heading_levels[0]} heading"
            elif heading_levels[0] > 2:
                return "acceptable", f"Starts with level {heading_levels[0]} heading"
            return "proper", "Good heading hierarchy"

        # Evaluate resource directories
        def eval_resources(criterion: RubricCriterion) -> tuple[str, str]:
            dirs = sum([has_scripts, has_references, has_assets])
            if dirs == 3:
                return "complete", "Has scripts/, references/, assets/"
            elif dirs == 2:
                return "good", "Has 2 resource directories"
            elif dirs == 1:
                return "adequate", "Has 1 resource directory"
            return "none", "No resource directories"

        # Evaluate all criteria
        score1, findings1, recs1 = self.RUBRIC_SCORER.evaluate(eval_skill_md)
        score2, findings2, recs2 = self.RUBRIC_SCORER.evaluate(eval_progressive)
        score3, findings3, recs3 = self.RUBRIC_SCORER.evaluate(eval_heading)
        score4, findings4, recs4 = self.RUBRIC_SCORER.evaluate(eval_resources)

        # Combine scores
        combined_score = (score1 + score2 + score3 + score4) / 4.0

        findings.extend(findings1)
        findings.extend(findings2)
        findings.extend(findings3)
        findings.extend(findings4)
        recommendations.extend(recs1)
        recommendations.extend(recs2)
        recommendations.extend(recs3)
        recommendations.extend(recs4)

        return DimensionScore(
            name=self.name,
            score=combined_score,
            weight=self.weight,
            findings=findings,
            recommendations=recommendations if recommendations else ["Structure is well-organized"],
        )


def evaluate_structure(skill_path: Path) -> DimensionScore:
    """Evaluate structural organization (backward compatibility)."""
    evaluator = StructureEvaluator()
    return evaluator.evaluate(skill_path)
