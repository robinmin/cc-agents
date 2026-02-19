"""Common data classes for all skill validations."""

from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any


class SkillType(Enum):
    """Supported skill types in rd2 plugin."""
    SKILL = "skill"
    AGENT = "agent"
    COMMAND = "command"
    HOOK = "hook"


@dataclass
class ValidationIssue:
    """A single validation issue (error or warning)."""
    severity: str  # "error" or "warning"
    category: str   # "frontmatter", "section", "content", "naming"
    message: str
    line: int | None = None
    field: str | None = None


@dataclass
class ValidationResult:
    """Complete validation result for a skill/agent."""
    path: Path
    valid: bool
    issues: list[ValidationIssue] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def errors(self) -> list[ValidationIssue]:
        return [i for i in self.issues if i.severity == "error"]

    @property
    def warnings(self) -> list[ValidationIssue]:
        return [i for i in self.issues if i.severity == "warning"]


@dataclass
class DimensionScore:
    """Score for a single quality dimension."""
    name: str
    raw_score: float
    max_score: float = 100.0

    @property
    def percentage(self) -> float:
        return (self.raw_score / self.max_score * 100) if self.max_score > 0 else 0


@dataclass
class ScoreBreakdown:
    """Detailed score breakdown by dimension."""
    total_score: float
    grade: str
    dimension_scores: dict[str, float]
    findings: list[str] = field(default_factory=list)
    recommendations: list[str] = field(default_factory=list)
