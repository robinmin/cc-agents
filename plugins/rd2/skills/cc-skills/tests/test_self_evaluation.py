"""Self-evaluation tests: cc-skills evaluates itself.

Meta-tests that verify cc-skills can evaluate itself without false positives
and meets its own quality standards. Tests ensure the evaluation framework
is working correctly and the cc-skills skill itself is production-ready.
"""

import pytest
from pathlib import Path

from skills import (
    evaluate_security,
    run_quality_assessment,
    calculate_total_score,
    Grade,
)


class TestSelfEvaluation:
    """Tests that cc-skills can evaluate itself without false positives."""

    @pytest.fixture
    def skill_path(self):
        """Path to cc-skills skill root."""
        return Path(__file__).parent.parent

    def test_security_no_false_positives(self, skill_path):
        """Security scanner should find 0 security issues in cc-skills."""
        result = evaluate_security(skill_path)

        # Filter for actual security findings (not positive observations)
        security_issues = [
            f
            for f in result.findings
            if f.startswith("SECURITY:") or "SECURITY in" in f
        ]

        assert len(security_issues) == 0, f"False positives detected: {security_issues}"

    def test_security_score_high(self, skill_path):
        """Security score should be >= 90.0 (0-100 scale)."""
        result = evaluate_security(skill_path)

        assert result.score >= 90.0, (
            f"Security score {result.score} < 90.0/100. Findings: {result.findings}"
        )

    def test_security_has_positive_findings(self, skill_path):
        """Security evaluation should include positive observations."""
        result = evaluate_security(skill_path)

        # Should have positive findings like "Mentions security considerations"
        positive_findings = [
            f
            for f in result.findings
            if not f.startswith("SECURITY:") and "SECURITY in" not in f
        ]

        assert len(positive_findings) > 0, "Should have positive security findings"

    def test_overall_grade_passing(self, skill_path):
        """Overall grade should be C or better for self-evaluation.

        Note: Self-evaluation with rubric-based scoring is more rigorous.
        Grade C indicates the skill meets basic quality standards.
        """
        dimensions = run_quality_assessment(skill_path)
        total_score = calculate_total_score(dimensions)
        grade = Grade.from_score(total_score)

        # Accept C, B, or A grade for self-evaluation
        assert grade in (Grade.A, Grade.B, Grade.C), (
            f"Grade {grade.letter} is below C. "
            f"Total score: {total_score}. "
            f"Dimension scores: {[(n, d.score) for n, d in dimensions.items()]}"
        )

    def test_all_dimensions_evaluated(self, skill_path):
        """All 7 dimensions should be evaluated."""
        dimensions = run_quality_assessment(skill_path)

        expected_dimensions = [
            "frontmatter",
            "content",
            "security",
            "structure",
            "efficiency",
            "best_practices",
            "code_quality",
        ]

        for dim in expected_dimensions:
            assert dim in dimensions, f"Missing dimension: {dim}"

    def test_no_zero_scores(self, skill_path):
        """No dimension should have a zero score."""
        dimensions = run_quality_assessment(skill_path)

        for name, dim in dimensions.items():
            assert dim.score > 0, (
                f"Dimension {name} has zero score. Findings: {dim.findings}"
            )
