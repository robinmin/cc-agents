"""Efficiency evaluation module.

Evaluates token efficiency and conciseness of skills.
"""

from pathlib import Path

from .base import DimensionScore, DIMENSION_WEIGHTS


class EfficiencyEvaluator:
    """Evaluates token efficiency in skills."""

    def __init__(self):
        self._name = "efficiency"
        self._weight = DIMENSION_WEIGHTS.get("efficiency", 0.10)

    @property
    def name(self) -> str:
        """Dimension name."""
        return self._name

    @property
    def weight(self) -> float:
        """Weight in overall score."""
        return self._weight

    def evaluate(self, skill_path: Path) -> DimensionScore:
        """Evaluate token efficiency."""
        findings = []
        recommendations = []
        score = 100.0  # 0-100 scale

        skill_md = skill_path / "SKILL.md"
        if not skill_md.exists():
            return DimensionScore(
                name=self.name,
                score=0.0,
                weight=self.weight,
                findings=["SKILL.md not found"],
                recommendations=["Create SKILL.md"],
            )

        content = skill_md.read_text()

        # Check token count (rough estimate: ~4 chars per token)
        char_count = len(content)
        token_estimate = char_count / 4

        if token_estimate < 500:
            findings.append(f"Token-efficient (~{int(token_estimate)} tokens)")
        elif token_estimate < 1500:
            findings.append(f"Reasonable size (~{int(token_estimate)} tokens)")
        elif token_estimate < 3000:
            findings.append(f"Large skill (~{int(token_estimate)} tokens)")
            recommendations.append("Consider splitting into smaller skills")
            score -= 10.0  # 0-100 scale
        else:
            findings.append(f"Very large skill (~{int(token_estimate)} tokens)")
            recommendations.append(
                "Strongly consider splitting into smaller, focused skills"
            )
            score -= 20.0  # 0-100 scale

        # Check for redundant content
        lines = content.split("\n")
        non_empty_lines = [line.strip() for line in lines if line.strip()]

        # Look for repetitive patterns
        if len(non_empty_lines) > 50:
            # Check for duplicate lines (case-insensitive)
            seen = set()
            duplicates = 0
            for line in non_empty_lines:
                line_lower = line.lower()
                if line_lower in seen and len(line) > 20:  # Only meaningful lines
                    duplicates += 1
                seen.add(line_lower)

            if duplicates > 5:
                findings.append(f"Found {duplicates} potentially duplicate lines")
                recommendations.append("Review and consolidate duplicate content")
                score -= 10.0  # 0-100 scale

        # Check for excessive verbosity
        word_counts = [len(line.split()) for line in non_empty_lines if line]
        if word_counts:
            avg_words_per_line = sum(word_counts) / len(word_counts)
            if avg_words_per_line > 30:
                findings.append("Lines tend to be verbose")
                recommendations.append("Consider shorter, more concise lines")
                score -= 5.0  # 0-100 scale

        return DimensionScore(
            name=self.name,
            score=max(0.0, min(100.0, score)),  # 0-100 scale
            weight=self.weight,
            findings=findings,
            recommendations=recommendations,
        )


def evaluate_efficiency(skill_path: Path) -> DimensionScore:
    """Evaluate token efficiency (backward compatibility)."""
    evaluator = EfficiencyEvaluator()
    return evaluator.evaluate(skill_path)
