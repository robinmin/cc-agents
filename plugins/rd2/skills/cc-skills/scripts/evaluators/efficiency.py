"""Efficiency evaluation module.

Evaluates token efficiency and conciseness of skills using rubric-based scoring.
"""

from pathlib import Path
import re

from .base import DimensionScore, RubricLevel, RubricCriterion, RubricScorer, DIMENSION_WEIGHTS


# =============================================================================
# RUBRIC DEFINITIONS
# =============================================================================

# Rubric for token efficiency (50% weight)
TOKEN_EFFICIENCY_RUBRIC = RubricCriterion(
    name="token_efficiency",
    description="Token count relative to content value",
    weight=0.50,
    levels=[
        RubricLevel("efficient", 100, "<500 tokens - highly efficient"),
        RubricLevel("reasonable", 75, "500-1500 tokens - reasonable size"),
        RubricLevel("large", 50, "1500-3000 tokens - consider splitting"),
        RubricLevel("excessive", 25, ">3000 tokens - strongly consider splitting"),
        RubricLevel("bloated", 0, ">5000 tokens - must split into smaller skills"),
    ],
)

# Rubric for content redundancy (30% weight)
CONTENT_REDUNDANCY_RUBRIC = RubricCriterion(
    name="content_redundancy",
    description="Absence of duplicate or redundant content",
    weight=0.30,
    levels=[
        RubricLevel("clean", 100, "No duplicate lines found"),
        RubricLevel("minimal", 75, "1-2 duplicate lines (acceptable)"),
        RubricLevel("moderate", 50, "3-5 duplicate lines - review recommended"),
        RubricLevel("redundant", 25, "6+ duplicate lines - consolidate needed"),
        RubricLevel("severe", 0, "Many duplicates - significant consolidation required"),
    ],
)

# RubRIC for conciseness (20% weight)
CONCISENESS_RUBRIC = RubricCriterion(
    name="conciseness",
    description="Average words per line (brevity)",
    weight=0.20,
    levels=[
        RubricLevel("concise", 100, "<20 words/line - very concise"),
        RubricLevel("clear", 75, "20-30 words/line - appropriate"),
        RubricLevel("verbose", 50, "30-40 words/line - somewhat verbose"),
        RubricLevel("wordy", 25, "40-50 words/line - needs editing"),
        RubricLevel("bloated", 0, ">50 words/line - split into multiple lines"),
    ],
)


class EfficiencyEvaluator:
    """Evaluates token efficiency in skills using rubric-based scoring."""

    # Pre-configured rubric scorer
    RUBRIC_SCORER = RubricScorer([
        TOKEN_EFFICIENCY_RUBRIC,
        CONTENT_REDUNDANCY_RUBRIC,
        CONCISENESS_RUBRIC,
    ])

    def __init__(self):
        self._name = "efficiency"
        self._weight = DIMENSION_WEIGHTS.get("efficiency", 0.05)  # Updated weight

    @property
    def name(self) -> str:
        """Dimension name."""
        return self._name

    @property
    def weight(self) -> float:
        """Weight in overall score."""
        return self._weight

    def evaluate(self, skill_path: Path) -> DimensionScore:
        """Evaluate token efficiency."""
        findings: list[str] = []
        recommendations: list[str] = []

        skill_md = skill_path / "SKILL.md"
        if not skill_md.exists():
            return DimensionScore(
                name=self.name,
                score=0.0,
                weight=self.weight,
                findings=["SKILL.md not found"],
                recommendations=["Create SKILL.md"],
            )

        content = skill_md.read_text()

        # Calculate metrics
        char_count = len(content)
        token_estimate = char_count / 4

        lines = content.split("\n")
        non_empty_lines = [line.strip() for line in lines if line.strip()]

        # Check for duplicate lines
        seen: dict[str, int] = {}
        duplicates = 0
        for line in non_empty_lines:
            line_lower = line.lower()
            if len(line_lower) > 20:
                if line_lower in seen:
                    duplicates += 1
                seen[line_lower] = 1

        # Calculate words per line
        word_counts = [len(line.split()) for line in non_empty_lines if line]
        avg_words_per_line = sum(word_counts) / len(word_counts) if word_counts else 0

        # Evaluate all criteria with a single function
        def evaluate_criterion(criterion: RubricCriterion) -> tuple[str, str]:
            if criterion.name == "token_efficiency":
                if token_estimate < 500:
                    return "efficient", f"~{int(token_estimate)} tokens (efficient)"
                elif token_estimate < 1500:
                    return "reasonable", f"~{int(token_estimate)} tokens (reasonable)"
                elif token_estimate < 3000:
                    return "large", f"~{int(token_estimate)} tokens (large)"
                elif token_estimate < 5000:
                    return "excessive", f"~{int(token_estimate)} tokens (excessive)"
                return "bloated", f"~{int(token_estimate)} tokens (must split)"
            elif criterion.name == "content_redundancy":
                if duplicates == 0:
                    return "clean", "No duplicate lines"
                elif duplicates <= 2:
                    return "minimal", f"{duplicates} duplicate line(s)"
                elif duplicates <= 5:
                    return "moderate", f"{duplicates} duplicate lines"
                elif duplicates <= 10:
                    return "redundant", f"{duplicates} duplicate lines"
                return "severe", f"{duplicates} duplicate lines"
            elif criterion.name == "conciseness":
                if avg_words_per_line < 20:
                    return "concise", f"{avg_words_per_line:.1f} words/line (concise)"
                elif avg_words_per_line < 30:
                    return "clear", f"{avg_words_per_line:.1f} words/line (clear)"
                elif avg_words_per_line < 40:
                    return "verbose", f"{avg_words_per_line:.1f} words/line (verbose)"
                elif avg_words_per_line < 50:
                    return "wordy", f"{avg_words_per_line:.1f} words/line (wordy)"
                return "bloated", f"{avg_words_per_line:.1f} words/line (bloated)"
            return "bloated", "Unknown criterion"

        score, findings, recommendations = self.RUBRIC_SCORER.evaluate(evaluate_criterion)

        return DimensionScore(
            name=self.name,
            score=score,
            weight=self.weight,
            findings=findings,
            recommendations=recommendations if recommendations else ["Content is efficient"],
        )


def evaluate_efficiency(skill_path: Path) -> DimensionScore:
    """Evaluate token efficiency (backward compatibility)."""
    evaluator = EfficiencyEvaluator()
    return evaluator.evaluate(skill_path)
