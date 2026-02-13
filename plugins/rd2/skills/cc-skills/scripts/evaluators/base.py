"""Base classes and shared utilities for skill evaluators."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any

# Handle both package import and direct execution
try:
    from ..skills import DIMENSION_WEIGHTS
except ImportError:
    from skills import DIMENSION_WEIGHTS  # type: ignore[no-redef, import-not-found]


# Re-export for convenience
__all__ = [
    "DimensionScore",
    "DIMENSION_WEIGHTS",
    "ValidationResult",
    "Grade",
    "EvaluationResult",
    "RubricLevel",
    "RubricCriterion",
    "RubricScorer",
]


# =============================================================================
# RUBRIC-BASED SCORING SYSTEM
# =============================================================================

@dataclass
class RubricLevel:
    """A single level in a rubric criterion with description and score."""

    name: str  # e.g., "excellent", "good", "fair", "poor", "missing"
    score: float  # Score for this level (0-100 scale)
    description: str  # Human-readable description of what earns this level


@dataclass
class RubricCriterion:
    """A single criterion in a rubric with multiple scoring levels.

    Each criterion defines:
    - name: Identifier for the criterion
    - description: What this criterion measures
    - weight: How much this criterion contributes to total score
    - levels: Ordered list of possible levels (highest first)
    """

    name: str
    description: str
    weight: float  # e.g., 0.30 for 30% weight
    levels: list[RubricLevel]  # Ordered from highest to lowest score


class RubricScorer:
    """Scores a skill against a rubric definition.

    Usage:
        # Define criteria with levels
        criteria = [
            RubricCriterion(
                name="description_quality",
                description="Quality of skill description",
                weight=0.30,
                levels=[
                    RubricLevel("excellent", 100, "Clear, specific with trigger phrases"),
                    RubricLevel("good", 75, "Clear but generic description"),
                    RubricLevel("fair", 50, "Vague or incomplete"),
                    RubricLevel("poor", 25, "Minimal or confusing"),
                    RubricLevel("missing", 0, "No description"),
                ]
            ),
            # ... more criteria
        ]

        scorer = RubricScorer(criteria)

        # Evaluate all criteria at once with a single function
        def evaluate_criterion(criterion: RubricCriterion) -> tuple[str, str]:
            if criterion.name == "description_quality":
                if desc_len >= 20 and desc_len <= 1024:
                    return "good", f"Description is {desc_len} chars"
                return "poor", "Description missing or too short"
            # ... handle other criteria

        score, findings, recommendations = scorer.evaluate(evaluate_criterion)
    """

    def __init__(self, criteria: list[RubricCriterion]):
        """Initialize with rubric criteria.

        Args:
            criteria: List of RubricCriterion objects defining the scoring rubric
        """
        self.criteria = criteria
        self.total_weight = sum(c.weight for c in criteria)
        # Normalize weights to sum to 1.0
        self.normalized_criteria = [
            RubricCriterion(
                name=c.name,
                description=c.description,
                weight=c.weight / self.total_weight,
                levels=c.levels,
            )
            for c in criteria
        ]

    def evaluate(self, evaluator_fn: callable) -> tuple[float, list[str], list[str]]:
        """Evaluate using the rubric.

        Args:
            evaluator_fn: Function that takes a RubricCriterion and returns
                         (level_name: str, evidence: str)

        Returns:
            Tuple of (score, findings, recommendations)
        """
        score = 0.0
        findings: list[str] = []
        recommendations: list[str] = []

        for criterion in self.normalized_criteria:
            level_name, evidence = evaluator_fn(criterion)
            # Find matching level
            level_score = 0.0
            level_desc = "Not assessed"
            for level in criterion.levels:
                if level.name == level_name:
                    level_score = level.score
                    level_desc = level.description
                    break

            weighted_score = level_score * criterion.weight
            score += weighted_score

            findings.append(
                f"{criterion.name}: {level_name} ({level_score:.0f}%) - {evidence}"
            )

            if level_score < 50:
                # Get recommendation from level description
                recommendations.append(
                    f"{criterion.name}: {level_desc}"
                )

        # Clamp score
        score = max(0.0, min(100.0, score))

        return score, findings, recommendations


class ValidationResult(Enum):
    """Result of structural validation."""

    PASS = "PASS"
    FAIL = "FAIL"


class Grade(Enum):
    """Letter grade for overall quality (0-100 scale)."""

    A = ("A", 90.0, 100.0, "Production ready")
    B = ("B", 70.0, 89.9, "Minor fixes needed")
    C = ("C", 50.0, 69.9, "Moderate revision")
    D = ("D", 30.0, 49.9, "Major revision")
    F = ("F", 0.0, 29.9, "Rewrite needed")

    @classmethod
    def from_score(cls, score: float) -> "Grade":
        """Get grade from numeric score (0-100 scale)."""
        # Handle edge case: perfect score
        if score >= 100.0:
            return cls.A

        # Find appropriate grade with exclusive upper bound
        for grade in cls:
            if grade.min_score <= score < grade.max_score:
                return grade

        # Scores below 0 get F
        return cls.F

    def __init__(
        self, letter: str, min_score: float, max_score: float, description: str
    ):
        self.letter = letter
        self.min_score = min_score
        self.max_score = max_score
        self.description = description


@dataclass
class DimensionScore:
    """Score for a single dimension."""

    name: str
    score: float  # 0-100 scale
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
                "result": self.validation_result.value
                if self.validation_result
                else None,
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
