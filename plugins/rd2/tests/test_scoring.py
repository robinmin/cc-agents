"""Tests for scoring module."""

import pytest

from scoring.grader import Grade
from scoring import get_weights, calculate_weighted_score, DimensionWeights


class TestGrade:
    """Tests for Grade enum."""

    def test_grade_values(self):
        """Test grade letter values."""
        assert Grade.A.letter == "A"
        assert Grade.B.letter == "B"
        assert Grade.C.letter == "C"
        assert Grade.D.letter == "D"
        assert Grade.F.letter == "F"

    def test_grade_score_ranges(self):
        """Test grade score ranges."""
        assert Grade.A.min_score == 90.0
        assert Grade.A.max_score == 100.0
        assert Grade.B.min_score == 70.0
        assert Grade.B.max_score == 89.9

    def test_from_score_a(self):
        """Test getting grade A."""
        assert Grade.from_score(95) == Grade.A
        assert Grade.from_score(90) == Grade.A

    def test_from_score_b(self):
        """Test getting grade B."""
        assert Grade.from_score(89.9) == Grade.B
        assert Grade.from_score(80) == Grade.B
        assert Grade.from_score(70) == Grade.B

    def test_from_score_c(self):
        """Test getting grade C."""
        assert Grade.from_score(69.9) == Grade.C
        assert Grade.from_score(60) == Grade.C
        assert Grade.from_score(50) == Grade.C

    def test_from_score_d(self):
        """Test getting grade D."""
        assert Grade.from_score(49.9) == Grade.D
        assert Grade.from_score(40) == Grade.D
        assert Grade.from_score(30) == Grade.D

    def test_from_score_f(self):
        """Test getting grade F."""
        assert Grade.from_score(29.9) == Grade.F
        assert Grade.from_score(10) == Grade.F
        assert Grade.from_score(0) == Grade.F

    def test_from_score_above_100(self):
        """Test score above 100 returns A."""
        assert Grade.from_score(100) == Grade.A
        assert Grade.from_score(150) == Grade.A

    def test_get_all_grades(self):
        """Test getting all grades."""
        grades = Grade.get_all_grades()
        assert len(grades) == 5
        assert grades[0]["grade"] == "A"
        assert grades[-1]["grade"] == "F"


class TestWeights:
    """Tests for weight definitions."""

    def test_skill_weights_count(self):
        """Test skill weights have expected dimensions."""
        weights = get_weights("skill")
        assert len(weights) >= 10

    def test_agent_weights_count(self):
        """Test agent weights have expected dimensions."""
        weights = get_weights("agent")
        assert len(weights) >= 10

    def test_weights_sum_to_one(self):
        """Test weights sum to 1.0."""
        weights = get_weights("skill")
        total = sum(w.weight for w in weights)
        # Allow small floating point error
        assert abs(total - 1.0) < 0.01

    def test_skill_weights_has_trigger_design(self):
        """Test skill weights include trigger_design."""
        weights = get_weights("skill")
        names = [w.name for w in weights]
        assert "trigger_design" in names

    def test_agent_weights_has_instruction_clarity(self):
        """Test agent weights include instruction_clarity."""
        weights = get_weights("agent")
        names = [w.name for w in weights]
        assert "instruction_clarity" in names


class TestCalculateWeightedScore:
    """Tests for calculate_weighted_score function."""

    def test_empty_dimensions(self):
        """Test with empty dimension scores."""
        weights = [DimensionWeights("test", 1.0, "test")]
        score = calculate_weighted_score({}, weights)
        assert score == 0.0

    def test_all_dimensions(self):
        """Test with all dimensions present."""
        weights = [
            DimensionWeights("content", 0.5, "Content weight"),
            DimensionWeights("structure", 0.5, "Structure weight"),
        ]
        dimension_scores = {
            "content": 100.0,
            "structure": 80.0,
        }
        score = calculate_weighted_score(dimension_scores, weights)
        # (100 * 0.5) + (80 * 0.5) = 90
        assert score == 90.0

    def test_partial_dimensions(self):
        """Test with partial dimension scores."""
        weights = [
            DimensionWeights("content", 0.7, "Content weight"),
            DimensionWeights("structure", 0.3, "Structure weight"),
        ]
        dimension_scores = {
            "content": 100.0,
            # structure is missing
        }
        score = calculate_weighted_score(dimension_scores, weights)
        # (100 * 0.7) + (0 * 0.3) = 70
        assert score == 70.0
