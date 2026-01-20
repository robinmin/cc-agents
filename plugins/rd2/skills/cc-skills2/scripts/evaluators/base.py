"""Base classes and shared utilities for skill evaluators."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any

# Handle both package import and direct execution
try:
    from ..skills import (
        DIMENSION_WEIGHTS,
        get_ast,
        get_file_content,
        parse_frontmatter,
        RuleCategory,
        RuleSeverity,
        get_rules,
        evaluate_rules,
        find_dangerous_calls_ast,
        analyze_markdown_security,
        analyze_type_hints,
        analyze_exception_handlers,
    )
except ImportError:
    from skills import (
        DIMENSION_WEIGHTS,
        get_ast,
        get_file_content,
        parse_frontmatter,
        RuleCategory,
        RuleSeverity,
        get_rules,
        evaluate_rules,
        find_dangerous_calls_ast,
        analyze_markdown_security,
        analyze_type_hints,
        analyze_exception_handlers,
    )


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
