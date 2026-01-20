"""Code quality evaluation module.

Evaluates code quality in skill scripts.
"""

from pathlib import Path

from .base import DimensionScore, DIMENSION_WEIGHTS

# Handle both package import and direct execution
try:
    from ..skills import get_file_content, analyze_type_hints, analyze_exception_handlers
except ImportError:
    from skills import get_file_content, analyze_type_hints, analyze_exception_handlers


class CodeQualityEvaluator:
    """Evaluates code quality in skill scripts."""

    def __init__(self):
        self._name = "code_quality"
        self._weight = DIMENSION_WEIGHTS.get("code_quality", 0.10)

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
        findings = []
        recommendations = []
        score = 10.0

        scripts_dir = skill_path / "scripts"
        if not scripts_dir.exists():
            return DimensionScore(
                name=self.name,
                score=10.0,  # N/A if no scripts
                weight=self.weight,
                findings=["No scripts directory (N/A for this dimension)"],
                recommendations=[],
            )

        script_files = list(scripts_dir.glob("*.py"))
        if not script_files:
            return DimensionScore(
                name=self.name,
                score=10.0,  # N/A if no scripts
                weight=self.weight,
                findings=["No Python scripts found (N/A for this dimension)"],
                recommendations=[],
            )

        for script_file in script_files:
            script_content = get_file_content(script_file) or ""

            # Check for error handling
            if "try:" in script_content:
                findings.append(f"{script_file.name}: Has error handling")
            else:
                recommendations.append(f"{script_file.name}: Consider adding error handling")
                score -= 0.5

            # Check for main guard
            if '__name__ == "__main__"' in script_content:
                findings.append(f"{script_file.name}: Has main guard")
            else:
                recommendations.append(f"{script_file.name}: Add main guard")
                score -= 0.5

            # Check for type hints using AST
            type_hint_analysis = analyze_type_hints(script_file)
            if type_hint_analysis.has_hints:
                findings.append(
                    f"{script_file.name}: Uses type hints "
                    f"({type_hint_analysis.coverage_pct}% coverage)"
                )
            else:
                recommendations.append(f"{script_file.name}: Consider adding type hints")
                score -= 0.5

            # Check for docstrings
            if '"""' in script_content or "'''" in script_content:
                findings.append(f"{script_file.name}: Has docstrings")
            else:
                recommendations.append(f"{script_file.name}: Add docstrings")
                score -= 0.5

            # Check for bare except using AST
            exception_issues = analyze_exception_handlers(script_file)
            for issue in exception_issues:
                if issue.issue_type == "bare_except":
                    findings.append(
                        f"{script_file.name}:{issue.line}: "
                        f"Bare except (anti-pattern)"
                    )
                    score -= 1.0
                elif issue.issue_type == "broad_except":
                    findings.append(
                        f"{script_file.name}:{issue.line}: "
                        f"Broad 'except Exception' - consider more specific types"
                    )
                    # Don't deduct for broad_except, just note it

        return DimensionScore(
            name=self.name,
            score=max(0.0, min(10.0, score)),
            weight=self.weight,
            findings=findings,
            recommendations=recommendations,
        )


def evaluate_code_quality(skill_path: Path) -> DimensionScore:
    """Evaluate code quality (backward compatibility)."""
    evaluator = CodeQualityEvaluator()
    return evaluator.evaluate(skill_path)
