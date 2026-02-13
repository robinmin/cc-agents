"""Behavioral Readiness evaluation module.

Evaluates whether a skill is ready for real-world behavioral use -
checking for error handling, edge cases, anti-patterns, testability,
trigger testing, and performance comparison.

Uses rubric-based scoring with clear criteria for each level.
"""

from __future__ import annotations

import re
from pathlib import Path

from .base import DimensionScore, RubricLevel, RubricCriterion, RubricScorer

# Handle both package import and direct execution
try:
    from ..skills import DIMENSION_WEIGHTS
except ImportError:
    from skills import DIMENSION_WEIGHTS  # type: ignore[no-redef, import-not-found]


# =============================================================================
# RUBRIC DEFINITIONS
# =============================================================================

# Rubric for example/scenario coverage (25% weight)
EXAMPLES_RUBRIC = RubricCriterion(
    name="examples",
    description="Presence of code examples and scenario patterns",
    weight=0.25,
    levels=[
        RubricLevel("excellent", 100, "Has 3+ code blocks, Example section, and scenario patterns"),
        RubricLevel("good", 75, "Has code blocks and Example section"),
        RubricLevel("fair", 50, "Has some code blocks or examples"),
        RubricLevel("poor", 25, "Minimal examples"),
        RubricLevel("missing", 0, "No examples or scenarios"),
    ],
)

# Rubric for anti-pattern documentation (20% weight)
ANTI_PATTERNS_RUBRIC = RubricCriterion(
    name="anti_patterns",
    description="Documentation of common mistakes and DON'T patterns",
    weight=0.20,
    levels=[
        RubricLevel("excellent", 100, "Has Common Mistakes section, 3+ DON'T patterns, comparisons"),
        RubricLevel("good", 75, "Has Common Mistakes section and DON'T patterns"),
        RubricLevel("fair", 50, "Has some DON'T/Never patterns"),
        RubricLevel("poor", 25, "Minimal anti-pattern documentation"),
        RubricLevel("missing", 0, "No anti-pattern documentation"),
    ],
)

# Rubric for error handling guidance (20% weight)
ERROR_HANDLING_RUBRIC = RubricCriterion(
    name="error_handling",
    description="Error handling and fallback guidance",
    weight=0.20,
    levels=[
        RubricLevel("excellent", 100, "Has Troubleshooting section, error refs, fallback patterns"),
        RubricLevel("good", 75, "Has error handling references and fallback patterns"),
        RubricLevel("fair", 50, "Has some error handling content"),
        RubricLevel("poor", 25, "Minimal error handling"),
        RubricLevel("missing", 0, "No error handling guidance"),
    ],
)

# Rubric for edge case coverage (15% weight)
EDGE_CASES_RUBRIC = RubricCriterion(
    name="edge_cases",
    description="Coverage of edge cases and boundary conditions",
    weight=0.15,
    levels=[
        RubricLevel("excellent", 100, "Has 3+ edge case mentions and boundary terms"),
        RubricLevel("good", 75, "Has edge case mentions and boundary terms"),
        RubricLevel("fair", 50, "Has some edge case content"),
        RubricLevel("poor", 25, "Minimal edge case coverage"),
        RubricLevel("missing", 0, "No edge case coverage"),
    ],
)

# Rubric for test infrastructure (10% weight)
TEST_INFRA_RUBRIC = RubricCriterion(
    name="test_infrastructure",
    description="Presence of tests directory and scenario files",
    weight=0.10,
    levels=[
        RubricLevel("excellent", 100, "Has tests/ with scenario YAML files"),
        RubricLevel("good", 75, "Has tests/ directory with files"),
        RubricLevel("fair", 50, "Has tests/ directory or test refs in docs"),
        RubricLevel("poor", 25, "Has test references only"),
        RubricLevel("missing", 0, "No test infrastructure"),
    ],
)

# Rubric for trigger testing (10% weight)
TRIGGER_TESTING_RUBRIC = RubricCriterion(
    name="trigger_testing",
    description="Trigger tests (should_trigger/should_not_trigger)",
    weight=0.10,
    levels=[
        RubricLevel("excellent", 100, "Has trigger tests in scenarios.yaml and negative guidance"),
        RubricLevel("good", 75, "Has trigger tests or negative trigger guidance"),
        RubricLevel("fair", 50, "Has negative trigger guidance only"),
        RubricLevel("poor", 25, "Minimal trigger testing"),
        RubricLevel("missing", 0, "No trigger testing"),
    ],
)


class BehavioralReadinessEvaluator:
    """Evaluates behavioral readiness indicators in a skill using rubric-based scoring."""

    # Pre-configured rubric scorer for behavioral readiness evaluation
    RUBRIC_SCORER = RubricScorer([
        EXAMPLES_RUBRIC,
        ANTI_PATTERNS_RUBRIC,
        ERROR_HANDLING_RUBRIC,
        EDGE_CASES_RUBRIC,
        TEST_INFRA_RUBRIC,
        TRIGGER_TESTING_RUBRIC,
    ])

    def __init__(self):
        self._name = "behavioral_readiness"
        self._weight = DIMENSION_WEIGHTS.get("behavioral_readiness", 0.05)

    @property
    def name(self) -> str:
        """Dimension name."""
        return self._name

    @property
    def weight(self) -> float:
        """Weight in overall score."""
        return self._weight

    def evaluate(self, skill_path: Path) -> DimensionScore:
        """Evaluate behavioral readiness.

        Args:
            skill_path: Path to the skill directory

        Returns:
            DimensionScore with findings and recommendations
        """
        skill_md = skill_path / "SKILL.md"
        if not skill_md.exists():
            return DimensionScore(
                name=self.name,
                score=0.0,
                weight=self.weight,
                findings=["SKILL.md not found"],
                recommendations=["Create SKILL.md with behavioral guidance"],
            )

        content = skill_md.read_text()

        # Remove frontmatter
        body = re.sub(r"^---\n.*?\n---\n?", "", content, flags=re.DOTALL)

        # Pre-compute metrics for examples
        code_blocks = re.findall(r"```[\s\S]*?```", body)
        has_example_section = bool(re.search(
            r"^#{1,3}\s+(?:[Ee]xample|[Ee]xamples)", body, re.MULTILINE
        ))
        scenario_patterns = [
            r"Given\s+\w+", r"When\s+\w+", r"Then\s+\w+",
            r"If\s+\w+,\s+(?:do|use|apply)",
        ]
        scenario_count = sum(len(re.findall(p, body)) for p in scenario_patterns)

        # Pre-compute metrics for anti-patterns
        has_mistakes_section = bool(re.search(
            r"^#{1,3}\s+(?:[Cc]ommon\s+[Mm]istakes?|[Mm]istakes?\s+[Tt]o\s+[Aa]void|[Ww]hat\s+[Nn]ot\s+[Tt]o\s+[Dd]o)",
            body, re.MULTILINE
        ))
        dont_patterns = [r"[Dd]on't\s+", r"[Dd]o\s+not\s+", r"[Nn]ever\s+", r"Avoid\s+", r"Don'?t\s+"]
        dont_count = sum(len(re.findall(p, body)) for p in dont_patterns)
        comparison_patterns = [r"[Bb]ad[:\s]+", r"[Gg]ood[:\s]+", r"[Ww]rong[:\s]+", r"[Cc]orrect[:\s]+", r"❌", r"✅"]
        comparison_count = sum(len(re.findall(p, body)) for p in comparison_patterns)

        # Pre-compute metrics for error handling
        error_keywords = [
            r"\b(error|exception|fail(?:ure)?|timeout|crash|panic)\b",
            r"\b(try|catch|except|finally)\b",
            r"\b(raise|throw)\b",
            r"\b(log|print)\s+(?:error|warning|info)\b",
        ]
        error_count = sum(len(re.findall(p, body, re.IGNORECASE)) for p in error_keywords)
        has_troubleshooting = bool(re.search(
            r"^#{1,3}\s+(?:[Tt]roubleshooting|[Dd]ebugging|[Ee]rror\s+[Hh]andling)", body, re.MULTILINE
        ))
        fallback_patterns = [
            r"if\s+\w+\s+(?:fails?|errors?|times?\s+out|isn?'t?\s+available)",
            r"(fallback|backup|alternative)\s+(?:is|to|use)",
            r"(retry|re-try)\s+",
        ]
        fallback_count = sum(len(re.findall(p, body, re.IGNORECASE)) for p in fallback_patterns)

        # Pre-compute metrics for edge cases
        edge_mentions = len(re.findall(
            r"\b(edge|corner)\s+(?:case|scenario)|\b(when|if)\s+\w+\s+(?:is\s+)?(?:null|undefined|none|empty|zero|missing)",
            body, re.IGNORECASE
        ))
        boundary_terms = len(re.findall(
            r"\b(maximum|minimum|max|min|large|small|empty|zero|null|undefined|none|optional|required)\b",
            body, re.IGNORECASE
        ))

        # Pre-compute metrics for test infrastructure
        tests_dir = skill_path / "tests"
        has_tests_dir = tests_dir.exists()
        scenario_files = []
        if has_tests_dir:
            scenario_files = list(tests_dir.glob("*.yaml")) + list(tests_dir.glob("*.yml"))
        test_patterns = [
            r"\btest\s+(?:case|scenario|file|data)",
            r"\brun\s+(?:the\s+)?(?:test|spec)",
            r"expect(?:ed)?\s+(?:to|that|value)",
        ]
        test_refs = sum(len(re.findall(p, body, re.IGNORECASE)) for p in test_patterns)

        # Pre-compute metrics for trigger testing
        has_trigger_tests = False
        if scenario_files:
            for sf in scenario_files:
                try:
                    scenario_content = sf.read_text()
                    if re.search(r"trigger_tests?:|should_trigger:|should_not_trigger:", scenario_content):
                        has_trigger_tests = True
                        break
                except Exception:
                    pass
        negative_trigger_patterns = [
            r"do\s+not\s+(?:use|trigger)",
            r"don'?t\s+(?:use|trigger)",
            r"should\s+not\s+trigger",
            r"negative\s+triggers?",
            r"overtrigger",
        ]
        negative_count = sum(len(re.findall(p, body, re.IGNORECASE)) for p in negative_trigger_patterns)

        # Single evaluator function for all criteria
        def evaluate_criterion(criterion: RubricCriterion) -> tuple[str, str]:
            if criterion.name == "examples":
                score_factors = (
                    (1 if len(code_blocks) >= 3 else 0.5 if code_blocks else 0),
                    (1 if has_example_section else 0),
                    (1 if scenario_count >= 3 else 0.5 if scenario_count >= 1 else 0),
                )
                total = sum(score_factors)
                if total >= 2.5:
                    return "excellent", f"Has {len(code_blocks)} code blocks, Example section, {scenario_count} scenarios"
                elif total >= 1.5:
                    return "good", f"Has {len(code_blocks)} code blocks, Example section"
                elif total >= 0.5:
                    return "fair", f"Has {len(code_blocks)} code blocks"
                elif code_blocks:
                    return "poor", "Minimal examples"
                return "missing", "No examples or scenarios"

            elif criterion.name == "anti_patterns":
                score_factors = (
                    (1 if has_mistakes_section else 0),
                    (1 if dont_count >= 3 else 0.5 if dont_count >= 1 else 0),
                    (1 if comparison_count >= 4 else 0.5 if comparison_count >= 2 else 0),
                )
                total = sum(score_factors)
                if total >= 2.5:
                    return "excellent", f"Has Common Mistakes, {dont_count} DON'T patterns, {comparison_count} comparisons"
                elif total >= 1.5:
                    return "good", f"Has Common Mistakes, {dont_count} DON'T patterns"
                elif total >= 0.5:
                    return "fair", f"Has {dont_count} DON'T/Never patterns"
                elif dont_count > 0:
                    return "poor", "Minimal anti-pattern documentation"
                return "missing", "No anti-pattern documentation"

            elif criterion.name == "error_handling":
                score_factors = (
                    (1 if has_troubleshooting else 0),
                    (1 if error_count >= 5 else 0.5 if error_count >= 2 else 0),
                    (1 if fallback_count >= 2 else 0.5 if fallback_count >= 1 else 0),
                )
                total = sum(score_factors)
                if total >= 2.5:
                    return "excellent", f"Has Troubleshooting, {error_count} error refs, {fallback_count} fallbacks"
                elif total >= 1.5:
                    return "good", f"Has {error_count} error handling refs, {fallback_count} fallbacks"
                elif total >= 0.5:
                    return "fair", f"Has {error_count} error handling content"
                elif error_count > 0:
                    return "poor", "Minimal error handling"
                return "missing", "No error handling guidance"

            elif criterion.name == "edge_cases":
                score_factors = (
                    (1 if edge_mentions >= 3 else 0.5 if edge_mentions >= 1 else 0),
                    (1 if boundary_terms >= 5 else 0.5 if boundary_terms >= 2 else 0),
                )
                total = sum(score_factors)
                if total >= 1.5:
                    return "excellent", f"Has {edge_mentions} edge case mentions, {boundary_terms} boundary terms"
                elif total >= 1.0:
                    return "good", f"Has edge case mentions and boundary terms"
                elif total >= 0.5:
                    return "fair", f"Has some edge case content"
                elif edge_mentions > 0 or boundary_terms > 0:
                    return "poor", "Minimal edge case coverage"
                return "missing", "No edge case coverage"

            elif criterion.name == "test_infrastructure":
                if has_tests_dir and scenario_files:
                    return "excellent", f"Has tests/ with {len(scenario_files)} scenario files"
                elif has_tests_dir:
                    return "good", "Has tests/ directory"
                elif test_refs >= 2:
                    return "fair", "Has test references in docs"
                elif test_refs > 0:
                    return "poor", "Has test references only"
                return "missing", "No test infrastructure"

            elif criterion.name == "trigger_testing":
                if has_trigger_tests and negative_count >= 2:
                    return "excellent", f"Has trigger tests and {negative_count} negative guidance"
                elif has_trigger_tests or negative_count >= 2:
                    return "good", "Has trigger tests or negative trigger guidance"
                elif negative_count >= 1:
                    return "fair", "Has negative trigger guidance only"
                elif has_trigger_tests:
                    return "poor", "Minimal trigger testing"
                return "missing", "No trigger testing"

            return "missing", f"Unknown criterion: {criterion.name}"

        # Run rubric evaluation
        score, findings, recommendations = self.RUBRIC_SCORER.evaluate(evaluate_criterion)

        return DimensionScore(
            name=self.name,
            score=score,
            weight=self.weight,
            findings=findings,
            recommendations=recommendations if recommendations else ["Behavioral readiness is adequate"],
        )


def evaluate_behavioral_readiness(skill_path: Path) -> DimensionScore:
    """Evaluate behavioral readiness (backward compatibility)."""
    evaluator = BehavioralReadinessEvaluator()
    return evaluator.evaluate(skill_path)
