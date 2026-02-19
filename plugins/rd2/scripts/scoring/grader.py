"""Common grading logic for rd2 skills."""


class Grade:
    """Letter grade with score ranges."""

    def __init__(self, letter: str, min_score: float, max_score: float, description: str):
        self.letter = letter
        self.min_score = min_score
        self.max_score = max_score
        self.description = description

    # Pre-create all grade instances
    A = None
    B = None
    C = None
    D = None
    F = None

    @classmethod
    def _init_class(cls):
        """Initialize class-level grade instances."""
        if cls.A is None:
            cls.A = cls("A", 90.0, 100.0, "Production ready")
            cls.B = cls("B", 70.0, 89.9, "Minor fixes needed")
            cls.C = cls("C", 50.0, 69.9, "Moderate revision")
            cls.D = cls("D", 30.0, 49.9, "Major revision")
            cls.F = cls("F", 0.0, 29.9, "Rewrite needed")

    @classmethod
    def from_score(cls, score: float) -> "Grade":
        """Convert numeric score to letter grade."""
        cls._init_class()
        if score >= 90.0:
            return cls.A
        if score >= 70.0:
            return cls.B
        if score >= 50.0:
            return cls.C
        if score >= 30.0:
            return cls.D
        return cls.F

    @classmethod
    def get_all_grades(cls) -> list[dict]:
        """Get all grades as dict list."""
        cls._init_class()
        return [
            {"grade": "A", "min": 90.0, "max": 100.0, "description": "Production ready"},
            {"grade": "B", "min": 70.0, "max": 89.9, "description": "Minor fixes needed"},
            {"grade": "C", "min": 50.0, "max": 69.9, "description": "Moderate revision"},
            {"grade": "D", "min": 30.0, "max": 49.9, "description": "Major revision"},
            {"grade": "F", "min": 0.0, "max": 29.9, "description": "Rewrite needed"},
        ]

    def __eq__(self, other):
        if isinstance(other, Grade):
            return self.letter == other.letter
        return False

    def __hash__(self):
        return hash(self.letter)

    def __repr__(self):
        return f"Grade.{self.letter}"


# Initialize grades
Grade._init_class()
