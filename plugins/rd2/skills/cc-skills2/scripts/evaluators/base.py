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
    from skills import DIMENSION_WEIGHTS


# Re-export for convenience
__all__ = [
    "DimensionScore",
    "DIMENSION_WEIGHTS",
    "ValidationResult",
    "Grade",
    "EvaluationResult",
]


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
