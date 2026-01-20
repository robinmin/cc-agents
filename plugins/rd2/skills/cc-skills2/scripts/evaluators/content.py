"""Content evaluation module.

Evaluates the quality and completeness of SKILL.md content.
"""

from pathlib import Path
import re

from .base import DimensionScore, DIMENSION_WEIGHTS

# Handle both package import and direct execution
try:
    from ..skills import parse_frontmatter
except ImportError:
    from skills import parse_frontmatter


class ContentEvaluator:
    """Evaluates content quality in SKILL.md files."""

    def __init__(self):
        self._name = "content"
        self._weight = DIMENSION_WEIGHTS.get("content", 0.25)

    @property
    def name(self) -> str:
        """Dimension name."""
        return self._name

    @property
    def weight(self) -> float:
        """Weight in overall score."""
        return self._weight

    def evaluate(self, skill_path: Path) -> DimensionScore:
        """Evaluate content quality."""
        findings = []
        recommendations = []
        score = 10.0

        skill_md = skill_path / "SKILL.md"
        if not skill_md.exists():
            return DimensionScore(
                name=self.name,
                score=0.0,
                weight=self.weight,
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
            name=self.name,
            score=max(0.0, min(10.0, score)),
            weight=self.weight,
            findings=findings,
            recommendations=recommendations,
        )


def evaluate_content(skill_path: Path) -> DimensionScore:
    """Evaluate content quality (backward compatibility)."""
    evaluator = ContentEvaluator()
    return evaluator.evaluate(skill_path)
