"""Structure evaluation module.

Evaluates the structural organization of skills.
"""

from pathlib import Path

from .base import DimensionScore, DIMENSION_WEIGHTS


class StructureEvaluator:
    """Evaluates structural organization in skills."""

    def __init__(self):
        self._name = "structure"
        self._weight = DIMENSION_WEIGHTS.get("structure", 0.15)

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
        findings = []
        recommendations = []
        score = 100.0  # 0-100 scale

        # Check directory structure
        has_skill_md = (skill_path / "SKILL.md").exists()
        has_scripts = (skill_path / "scripts").exists()
        has_references = (skill_path / "references").exists()
        has_assets = (skill_path / "assets").exists()

        if has_skill_md:
            findings.append("Has SKILL.md")
        else:
            recommendations.append("Add SKILL.md")
            score -= 30.0  # 0-100 scale

        # Check for progressive disclosure
        skill_md = skill_path / "SKILL.md"
        if has_skill_md:
            content = skill_md.read_text()

            # Look for progressive disclosure patterns
            has_quick_start = "## Quick Start" in content or "# Quick Start" in content
            has_overview = "## Overview" in content

            if has_quick_start:
                findings.append("Has Quick Start (progressive disclosure)")
            else:
                recommendations.append("Add Quick Start for progressive disclosure")
                score -= 10.0  # 0-100 scale

            if has_overview:
                findings.append("Has Overview section")
            else:
                score -= 10.0  # 0-100 scale

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
                    score -= 5.0  # 0-100 scale
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
            name=self.name,
            score=max(0.0, min(100.0, score)),  # 0-100 scale
            weight=self.weight,
            findings=findings,
            recommendations=recommendations,
        )


def evaluate_structure(skill_path: Path) -> DimensionScore:
    """Evaluate structural organization (backward compatibility)."""
    evaluator = StructureEvaluator()
    return evaluator.evaluate(skill_path)
