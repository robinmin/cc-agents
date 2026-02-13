"""Code quality evaluation module.

Evaluates code quality in skill scripts using rubric-based scoring.
"""

from pathlib import Path

from .base import DimensionScore, RubricLevel, RubricCriterion, RubricScorer, DIMENSION_WEIGHTS

# Handle both package import and direct execution
try:
    from ..skills import (
        get_file_content,
        analyze_type_hints,
        analyze_exception_handlers,
    )
except ImportError:
    from skills import get_file_content, analyze_type_hints, analyze_exception_handlers  # type: ignore[no-redef, import-not-found]


# =============================================================================
# RUBRIC DEFINITIONS
# =============================================================================

# Rubric for error handling coverage (30% weight)
ERROR_HANDLING_RUBRIC = RubricCriterion(
    name="error_handling",
    description="Scripts have proper try/except error handling",
    weight=0.30,
    levels=[
        RubricLevel("excellent", 100, "All scripts have error handling"),
        RubricLevel("good", 75, "Most scripts have error handling"),
        RubricLevel("fair", 50, "Some scripts have error handling"),
        RubricLevel("poor", 25, "Few scripts have error handling"),
        RubricLevel("none", 0, "No scripts have error handling"),
    ],
)

# Rubric for main guard presence (20% weight)
MAIN_GUARD_RUBRIC = RubricCriterion(
    name="main_guard",
    description="Scripts have __name__ == \"__main__\" guard",
    weight=0.20,
    levels=[
        RubricLevel("complete", 100, "All scripts have main guard"),
        RubricLevel("good", 75, "Most scripts have main guard"),
        RubricLevel("partial", 50, "Some scripts have main guard"),
        RubricLevel("minimal", 25, "Few scripts have main guard"),
        RubricLevel("none", 0, "No scripts have main guard"),
    ],
)

# Rubric for type hints (30% weight)
TYPE_HINTS_RUBRIC = RubricCriterion(
    name="type_hints",
    description="Functions and variables use type annotations",
    weight=0.30,
    levels=[
        RubricLevel("complete", 100, "All scripts have comprehensive type hints"),
        RubricLevel("good", 75, "Most scripts have type hints"),
        RubricLevel("fair", 50, "Some scripts have type hints"),
        RubricLevel("minimal", 25, "Few scripts have type hints"),
        RubricLevel("none", 0, "No type hints present"),
    ],
)

# Rubric for documentation (20% weight)
DOCUMENTATION_RUBRIC = RubricCriterion(
    name="documentation",
    description="Scripts have docstrings and comments",
    weight=0.20,
    levels=[
        RubricLevel("well_documented", 100, "All scripts have docstrings"),
        RubricLevel("good", 75, "Most scripts have docstrings"),
        RubricLevel("fair", 50, "Some scripts have docstrings"),
        RubricLevel("minimal", 25, "Few scripts have docstrings"),
        RubricLevel("none", 0, "No docstrings present"),
    ],
)


class CodeQualityEvaluator:
    """Evaluates code quality in skill scripts using rubric-based scoring."""

    # Pre-configured rubric scorer
    RUBRIC_SCORER = RubricScorer([
        ERROR_HANDLING_RUBRIC,
        MAIN_GUARD_RUBRIC,
        TYPE_HINTS_RUBRIC,
        DOCUMENTATION_RUBRIC,
    ])

    def __init__(self):
        self._name = "code_quality"
        self._weight = DIMENSION_WEIGHTS.get("code_quality", 0.05)  # Updated weight

    @property
    def name(self) -> str:
        """Dimension name."""
        return self._name

    @property
    def weight(self) -> float:
        """Weight in overall score."""
        return self._weight

    def evaluate(self, skill_path: Path) -> DimensionScore:
        """Evaluate code quality in scripts directory."""
        findings: list[str] = []
        recommendations: list[str] = []

        scripts_dir = skill_path / "scripts"
        if not scripts_dir.exists():
            return DimensionScore(
                name=self.name,
                score=50.0,  # Neutral score for N/A
                weight=self.weight,
                findings=["No scripts directory"],
                recommendations=[],
            )

        script_files = list(scripts_dir.glob("*.py"))
        if not script_files:
            return DimensionScore(
                name=self.name,
                score=50.0,  # Neutral score for N/A
                weight=self.weight,
                findings=["No Python scripts found"],
                recommendations=[],
            )

        # Analyze each script
        scripts_with_error_handling = 0
        scripts_with_main_guard = 0
        scripts_with_type_hints = 0
        scripts_with_docstrings = 0
        total_bare_excepts = 0

        for script_file in script_files:
            script_content = get_file_content(script_file) or ""

            # Check error handling
            if "try:" in script_content:
                scripts_with_error_handling += 1

            # Check main guard
            if '__name__ == "__main__"' in script_content:
                scripts_with_main_guard += 1

            # Check type hints
            type_hint_analysis = analyze_type_hints(script_file)
            if type_hint_analysis.has_hints:
                scripts_with_type_hints += 1

            # Check docstrings
            if '"""' in script_content or "'''" in script_content:
                scripts_with_docstrings += 1

            # Check for bare excepts
            exception_issues = analyze_exception_handlers(script_file)
            total_bare_excepts += sum(1 for i in exception_issues if i.issue_type == "bare_except")

        script_count = len(script_files)

        # Calculate percentages
        error_pct = scripts_with_error_handling / script_count if script_count > 0 else 0
        guard_pct = scripts_with_main_guard / script_count if script_count > 0 else 0
        type_pct = scripts_with_type_hints / script_count if script_count > 0 else 0
        doc_pct = scripts_with_docstrings / script_count if script_count > 0 else 0

        # Evaluate error handling
        def eval_error_handling(criterion: RubricCriterion) -> tuple[str, str]:
            if error_pct == 1.0:
                return "excellent", f"{scripts_with_error_handling}/{script_count} scripts have error handling"
            elif error_pct >= 0.75:
                return "good", f"{scripts_with_error_handling}/{script_count} scripts have error handling"
            elif error_pct >= 0.5:
                return "fair", f"{scripts_with_error_handling}/{script_count} scripts have error handling"
            elif error_pct >= 0.25:
                return "poor", f"{scripts_with_error_handling}/{script_count} scripts have error handling"
            return "none", f"No scripts have error handling"

        # Evaluate main guard
        def eval_main_guard(criterion: RubricCriterion) -> tuple[str, str]:
            if guard_pct == 1.0:
                return "complete", f"{scripts_with_main_guard}/{script_count} scripts have main guard"
            elif guard_pct >= 0.75:
                return "good", f"{scripts_with_main_guard}/{script_count} scripts have main guard"
            elif guard_pct >= 0.5:
                return "partial", f"{scripts_with_main_guard}/{script_count} scripts have main guard"
            elif guard_pct >= 0.25:
                return "minimal", f"{scripts_with_main_guard}/{script_count} scripts have main guard"
            return "none", "No scripts have main guard"

        # Evaluate type hints
        def eval_type_hints(criterion: RubricCriterion) -> tuple[str, str]:
            if type_pct == 1.0:
                return "complete", f"{scripts_with_type_hints}/{script_count} scripts have type hints"
            elif type_pct >= 0.75:
                return "good", f"{scripts_with_type_hints}/{script_count} scripts have type hints"
            elif type_pct >= 0.5:
                return "fair", f"{scripts_with_type_hints}/{script_count} scripts have type hints"
            elif type_pct >= 0.25:
                return "minimal", f"{scripts_with_type_hints}/{script_count} scripts have type hints"
            return "none", "No type hints present"

        # Evaluate documentation
        def eval_documentation(criterion: RubricCriterion) -> tuple[str, str]:
            if doc_pct == 1.0:
                return "well_documented", f"{scripts_with_docstrings}/{script_count} scripts have docstrings"
            elif doc_pct >= 0.75:
                return "good", f"{scripts_with_docstrings}/{script_count} scripts have docstrings"
            elif doc_pct >= 0.5:
                return "fair", f"{scripts_with_docstrings}/{script_count} scripts have docstrings"
            elif doc_pct >= 0.25:
                return "minimal", f"{scripts_with_docstrings}/{script_count} scripts have docstrings"
            return "none", "No docstrings present"

        # Evaluate all criteria
        score1, findings1, recs1 = self.RUBRIC_SCORER.evaluate(eval_error_handling)
        score2, findings2, recs2 = self.RUBRIC_SCORER.evaluate(eval_main_guard)
        score3, findings3, recs3 = self.RUBRIC_SCORER.evaluate(eval_type_hints)
        score4, findings4, recs4 = self.RUBRIC_SCORER.evaluate(eval_documentation)

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

        # Add bare except findings
        if total_bare_excepts > 0:
            findings.append(f"Found {total_bare_excepts} bare except clauses")

        return DimensionScore(
            name=self.name,
            score=combined_score,
            weight=self.weight,
            findings=findings,
            recommendations=recommendations if recommendations else ["Code quality is good"],
        )


def evaluate_code_quality(skill_path: Path) -> DimensionScore:
    """Evaluate code quality (backward compatibility)."""
    evaluator = CodeQualityEvaluator()
    return evaluator.evaluate(skill_path)
