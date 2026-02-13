"""Instruction Clarity evaluation module.

Evaluates how clearly and unambiguously a skill communicates its
instructions to an AI agent - checking for imperative form, ambiguity
detection, and actionability.

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

# Rubric for ambiguity/hedging (30% weight)
AMBIGUITY_RUBRIC = RubricCriterion(
    name="ambiguity",
    description="Absence of hedging and ambiguous language",
    weight=0.30,
    levels=[
        RubricLevel("excellent", 100, "No hedging phrases (might, could, maybe, etc.)"),
        RubricLevel("good", 75, "1-2 hedging phrases (minor ambiguity)"),
        RubricLevel("fair", 50, "3-4 hedging phrases (moderate ambiguity)"),
        RubricLevel("poor", 25, "5+ hedging phrases (significant ambiguity)"),
        RubricLevel("missing", 0, "No content to evaluate"),
    ],
)

# Rubric for imperative form (25% weight)
IMPERATIVE_RUBRIC = RubricCriterion(
    name="imperative_form",
    description="Use of imperative verb form in instructions",
    weight=0.25,
    levels=[
        RubricLevel("excellent", 100, "80%+ of lines use imperative form"),
        RubricLevel("good", 75, "60-79% of lines use imperative form"),
        RubricLevel("fair", 50, "40-59% of lines use imperative form"),
        RubricLevel("poor", 25, "Less than 40% use imperative form"),
        RubricLevel("missing", 0, "No instruction content"),
    ],
)

# Rubric for actionability (25% weight)
ACTIONABLE_RUBRIC = RubricCriterion(
    name="actionability",
    description="Presence of specific, actionable references",
    weight=0.25,
    levels=[
        RubricLevel("excellent", 100, "60%+ of lines have actionable references"),
        RubricLevel("good", 75, "40-59% of lines have actionable references"),
        RubricLevel("fair", 50, "20-39% of lines have actionable references"),
        RubricLevel("poor", 25, "Less than 20% have actionable references"),
        RubricLevel("missing", 0, "No instruction content"),
    ],
)

# Rubric for contradictions (20% weight)
CONTRADICTION_RUBRIC = RubricCriterion(
    name="contradictions",
    description="Absence of contradictory instructions",
    weight=0.20,
    levels=[
        RubricLevel("excellent", 100, "No contradictions detected"),
        RubricLevel("good", 75, "Minor potential conflict (but/however)"),
        RubricLevel("fair", 50, "Potential always/never contradiction"),
        RubricLevel("poor", 25, "Multiple contradictions detected"),
        RubricLevel("missing", 0, "No content to evaluate"),
    ],
)


class InstructionClarityEvaluator:
    """Evaluates instruction clarity in SKILL.md content using rubric-based scoring."""

    # Pre-configured rubric scorer for instruction clarity evaluation
    RUBRIC_SCORER = RubricScorer([
        AMBIGUITY_RUBRIC,
        IMPERATIVE_RUBRIC,
        ACTIONABLE_RUBRIC,
        CONTRADICTION_RUBRIC,
    ])

    # Common imperative verbs for instruction detection
    IMPERATIVE_VERBS = [
        "create", "add", "run", "use", "check", "verify", "configure",
        "install", "define", "set", "read", "write", "update", "remove",
        "build", "test", "deploy", "start", "stop", "open", "close",
        "parse", "extract", "validate", "follow", "ensure", "return",
        "invoke", "call", "execute", "import", "export", "handle",
        "catch", "raise", "throw", "log", "print", "display", "show",
    ]

    def __init__(self):
        self._name = "instruction_clarity"
        self._weight = DIMENSION_WEIGHTS.get("instruction_clarity", 0.10)

    @property
    def name(self) -> str:
        """Dimension name."""
        return self._name

    @property
    def weight(self) -> float:
        """Weight in overall score."""
        return self._weight

    def evaluate(self, skill_path: Path) -> DimensionScore:
        """Evaluate instruction clarity.

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
                recommendations=["Create SKILL.md with clear instructions"],
            )

        content = skill_md.read_text()

        # Remove frontmatter
        body = re.sub(r"^---\n.*?\n---\n", "", content, flags=re.DOTALL)
        lines = body.split("\n")

        # Count meaningful lines (non-header, non-empty)
        total_instruction_like = len([l for l in lines if l.strip() and not l.strip().startswith("#")])

        # Pre-compute metrics used by multiple criteria

        # 1. Hedging count
        hedging_patterns = [
            r"\bmight\b", r"\bcould\b", r"\bmaybe\b", r"\bperhaps\b",
            r"\bas needed\b", r"\bif appropriate\b", r"\bwhen necessary\b",
            r"\bas applicable\b", r"\bif desired\b", r"\boptionally\b",
            r"\bmight want to\b", r"\bmight consider\b",
        ]
        hedging_count = 0
        for pattern in hedging_patterns:
            hedging_count += len(re.findall(pattern, body, re.IGNORECASE))

        # 2. Imperative form ratio
        instruction_lines = []
        for line in lines:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            first_word = re.split(r"[\s\-*]+", line.lower())[0] if line else ""
            if first_word in self.IMPERATIVE_VERBS:
                instruction_lines.append(line)
        imperative_ratio = len(instruction_lines) / max(total_instruction_like, 1)

        # 3. Actionable ratio
        actionable_patterns = [
            r"`[^`]+`",  # Backtick-wrapped terms
            r"\.[a-z]{2,4}(?:\s|$|[,;:])",  # File extensions
            r"\b[a-zA-Z_][a-zA-Z0-9_]*\.py\b",  # Python files
            r"\b[a-zA-Z_][a-zA-Z0-9_]*\.sh\b",  # Shell scripts
            r"\b(script|command|tool|function|method|class)\b",  # Technical terms
            r"\b(import|from|export|return|yield)\b",  # Code keywords
        ]
        actionable_count = 0
        for line in lines:
            for pattern in actionable_patterns:
                if re.search(pattern, line, re.IGNORECASE):
                    actionable_count += 1
                    break
        actionable_ratio = actionable_count / max(total_instruction_like, 1)

        # 4. Contradiction detection
        but_patterns = [
            r"always\s+\w+\s+but\s+\w+",
            r"never\s+\w+\s+but\s+\w+",
            r"do\s+this\s+but\s+(?:don't|do\s+not)\s+\w+",
        ]
        found_but = len([p for p in but_patterns if re.search(p, body, re.IGNORECASE)])
        always_statements = re.findall(r"always\s+(.+?)(?:[.;,\n])", body, re.IGNORECASE)
        never_statements = re.findall(r"never\s+(.+?)(?:[.;,\n])", body, re.IGNORECASE)
        has_overlap = False
        if always_statements and never_statements:
            always_set = set(always_statements[0].lower().split()) if always_statements else set()
            never_set = set(never_statements[0].lower().split()) if never_statements else set()
            has_overlap = bool(always_set & never_set)

        # Single evaluator function for all criteria
        def evaluate_criterion(criterion: RubricCriterion) -> tuple[str, str]:
            if criterion.name == "ambiguity":
                if total_instruction_like == 0:
                    return "missing", "No content to evaluate"
                elif hedging_count == 0:
                    return "excellent", "No hedging phrases found"
                elif hedging_count <= 2:
                    return "good", f"Minor hedging: {hedging_count} phrases"
                elif hedging_count <= 4:
                    return "fair", f"Moderate hedging: {hedging_count} phrases"
                return "poor", f"Significant hedging: {hedging_count} phrases"

            elif criterion.name == "imperative_form":
                if total_instruction_like == 0:
                    return "missing", "No instruction content"
                pct = imperative_ratio * 100
                if imperative_ratio >= 0.8:
                    return "excellent", f"High imperative form ({pct:.0f}% of lines)"
                elif imperative_ratio >= 0.6:
                    return "good", f"Good imperative form ({pct:.0f}% of lines)"
                elif imperative_ratio >= 0.4:
                    return "fair", f"Moderate imperative form ({pct:.0f}% of lines)"
                return "poor", f"Low imperative form ({pct:.0f}% of lines)"

            elif criterion.name == "actionability":
                if total_instruction_like == 0:
                    return "missing", "No instruction content"
                pct = actionable_ratio * 100
                if actionable_ratio >= 0.6:
                    return "excellent", f"Highly actionable ({pct:.0f}% of lines)"
                elif actionable_ratio >= 0.4:
                    return "good", f"Good actionability ({pct:.0f}% of lines)"
                elif actionable_ratio >= 0.2:
                    return "fair", f"Moderate actionability ({pct:.0f}% of lines)"
                return "poor", f"Low actionability ({pct:.0f}% of lines)"

            elif criterion.name == "contradictions":
                if total_instruction_like == 0:
                    return "missing", "No content to evaluate"
                elif found_but == 0 and not has_overlap:
                    return "excellent", "No contradictions detected"
                elif has_overlap:
                    return "fair", "Potential always/never contradiction"
                elif found_but >= 2:
                    return "poor", f"Multiple contradictions: {found_but}"
                return "good", f"Minor potential conflict: {found_but}"

            return "missing", f"Unknown criterion: {criterion.name}"

        # Run rubric evaluation
        score, findings, recommendations = self.RUBRIC_SCORER.evaluate(evaluate_criterion)

        return DimensionScore(
            name=self.name,
            score=score,
            weight=self.weight,
            findings=findings,
            recommendations=recommendations if recommendations else ["Instruction clarity is adequate"],
        )


def evaluate_instruction_clarity(skill_path: Path) -> DimensionScore:
    """Evaluate instruction clarity (backward compatibility)."""
    evaluator = InstructionClarityEvaluator()
    return evaluator.evaluate(skill_path)
