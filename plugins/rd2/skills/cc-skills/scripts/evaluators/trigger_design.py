"""Trigger Design evaluation module.

Evaluates how well a skill defines its activation triggers - the phrases,
keywords, and signals that cause Claude to discover and invoke the skill.

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

try:
    from ..skills import parse_frontmatter
except ImportError:
    from skills import parse_frontmatter  # type: ignore[no-redef, import-not-found]


# =============================================================================
# RUBRIC DEFINITIONS
# =============================================================================

# Rubric for trigger phrases (30% weight)
TRIGGER_PHRASES_RUBRIC = RubricCriterion(
    name="trigger_phrases",
    description="Presence and quantity of quoted trigger phrases in description",
    weight=0.30,
    levels=[
        RubricLevel("excellent", 100, "Has 3+ quoted trigger phrases in description"),
        RubricLevel("good", 75, "Has 1-2 quoted trigger phrases in description"),
        RubricLevel("poor", 25, "No quoted trigger phrases but description exists"),
        RubricLevel("missing", 0, "No description or trigger phrases"),
    ],
)

# Rubric for third-person form (20% weight)
THIRD_PERSON_RUBRIC = RubricCriterion(
    name="third_person_form",
    description="Uses third-person 'This skill...' form in description",
    weight=0.20,
    levels=[
        RubricLevel("excellent", 100, "Uses 'This skill should be used when...' or similar form"),
        RubricLevel("missing", 0, "Does not use third-person form"),
    ],
)

# Rubric for keyword specificity (20% weight)
KEYWORD_SPECIFICITY_RUBRIC = RubricCriterion(
    name="keyword_specificity",
    description="Specific trigger keywords vs vague generic language",
    weight=0.20,
    levels=[
        RubricLevel("excellent", 100, "Has specific keywords without vague language"),
        RubricLevel("good", 75, "Has specific keywords but also some vague language"),
        RubricLevel("fair", 50, "Has only vague language"),
        RubricLevel("poor", 25, "Neither specific nor vague patterns detected"),
        RubricLevel("missing", 0, "No description content"),
    ],
)

# Rubric for anti-patterns (15% weight)
ANTI_PATTERNS_RUBRIC = RubricCriterion(
    name="anti_patterns",
    description="Absence of workflow summaries and description length issues",
    weight=0.15,
    levels=[
        RubricLevel("excellent", 100, "No workflow summary, appropriate description length (50-500 chars)"),
        RubricLevel("good", 75, "Minor issues only (slightly short/long description)"),
        RubricLevel("fair", 50, "Has workflow summary (CSO violation) OR length issues"),
        RubricLevel("poor", 25, "Has workflow summary AND length issues"),
        RubricLevel("missing", 0, "No description or major issues"),
    ],
)

# Rubric for CSO coverage (15% weight)
CSO_COVERAGE_RUBRIC = RubricCriterion(
    name="cso_coverage",
    description="Coverage of Context/Symptoms/Objects categories for trigger matching",
    weight=0.15,
    levels=[
        RubricLevel("excellent", 100, "Covers 3+ CSO categories (errors, symptoms, tools)"),
        RubricLevel("good", 75, "Covers 2 CSO categories"),
        RubricLevel("fair", 50, "Covers 1 CSO category"),
        RubricLevel("poor", 25, "No CSO category coverage"),
        RubricLevel("missing", 0, "No description content"),
    ],
)


class TriggerDesignEvaluator:
    """Evaluates trigger/discovery quality in skill descriptions using rubric-based scoring."""

    # Pre-configured rubric scorer for trigger design evaluation
    RUBRIC_SCORER = RubricScorer([
        TRIGGER_PHRASES_RUBRIC,
        THIRD_PERSON_RUBRIC,
        KEYWORD_SPECIFICITY_RUBRIC,
        ANTI_PATTERNS_RUBRIC,
        CSO_COVERAGE_RUBRIC,
    ])

    def __init__(self):
        self._name = "trigger_design"
        self._weight = DIMENSION_WEIGHTS.get("trigger_design", 0.15)

    @property
    def name(self) -> str:
        """Dimension name."""
        return self._name

    @property
    def weight(self) -> float:
        """Weight in overall score."""
        return self._weight

    def evaluate(self, skill_path: Path) -> DimensionScore:
        """Evaluate trigger design quality.

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
                recommendations=["Create SKILL.md with trigger design"],
            )

        content = skill_md.read_text()
        frontmatter, _ = parse_frontmatter(content)

        if frontmatter is None:
            return DimensionScore(
                name=self.name,
                score=0.0,
                weight=self.weight,
                findings=["Invalid frontmatter"],
                recommendations=["Fix YAML frontmatter syntax"],
            )

        description = frontmatter.get("description", "") or ""
        desc_len = len(description.strip())

        # Count trigger phrases (used by multiple criteria)
        quoted_phrases = re.findall(r'"([^"]+)"', description)
        single_quoted = re.findall(r"'([^']+)'", description)
        all_quoted = quoted_phrases + single_quoted
        trigger_phrase_count = len(all_quoted)

        # Single evaluator function for all criteria
        def evaluate_criterion(criterion: RubricCriterion) -> tuple[str, str]:
            if criterion.name == "trigger_phrases":
                if trigger_phrase_count >= 3:
                    return "excellent", f"Has {trigger_phrase_count} trigger phrases"
                elif trigger_phrase_count >= 1:
                    return "good", f"Has {trigger_phrase_count} trigger phrases (recommend 3+)"
                elif desc_len > 0:
                    return "poor", "No quoted trigger phrases in description"
                return "missing", "No description content"

            elif criterion.name == "third_person_form":
                third_person_patterns = [
                    r"This skill should be used when",
                    r"This skill provides",
                    r"This skill handles",
                    r"Use this skill when",
                    r"Should be used when",
                ]
                has_third_person = any(
                    re.search(p, description, re.IGNORECASE) for p in third_person_patterns
                )
                if has_third_person:
                    return "excellent", "Uses third-person 'This skill' form"
                return "missing", "Does not use third-person form"

            elif criterion.name == "keyword_specificity":
                vague_patterns = [
                    r"\bprovides guidance\b",
                    r"\bhelps with\b",
                    r"\bworks with\b",
                    r"\bcan be used\b",
                    r"\bsupports\b",
                ]
                has_vague = any(re.search(p, description, re.IGNORECASE) for p in vague_patterns)

                specific_patterns = [
                    r"when the user asks to ['\"](.+?)['\"]",
                    r"mentions",
                    r"error message",
                    r"tool use",
                    r"file path",
                ]
                has_specific = any(
                    re.search(p, description, re.IGNORECASE) for p in specific_patterns
                )

                if desc_len == 0:
                    return "missing", "No description content"
                elif has_specific and not has_vague:
                    return "excellent", "Has specific trigger keywords"
                elif has_specific:
                    return "good", "Has specific terms but also vague language"
                elif has_vague:
                    return "fair", "Has only vague language"
                return "poor", "Neither specific nor vague patterns detected"

            elif criterion.name == "anti_patterns":
                workflow_indicators = [
                    r"first\s+",
                    r"then\s+",
                    r"finally\s+",
                    r"analyzes?\s+.*\s+identifies?\s+.*\s+applies?",
                    r"step\s+\d+",
                ]
                has_workflow_summary = any(
                    re.search(p, description, re.IGNORECASE) for p in workflow_indicators
                )

                length_ok = 50 <= desc_len <= 500 or (desc_len >= 50 and trigger_phrase_count >= 1)
                too_short = desc_len < 50
                too_long = desc_len > 500 and trigger_phrase_count == 0

                if desc_len == 0:
                    return "missing", "No description content"
                elif has_workflow_summary and (too_short or too_long):
                    return "poor", "Has workflow summary AND length issues"
                elif has_workflow_summary:
                    return "fair", "Has workflow summary (CSO violation)"
                elif too_short or too_long:
                    return "fair", f"Description length issue ({desc_len} chars)"
                return "excellent", f"No anti-patterns, description length OK ({desc_len} chars)"

            elif criterion.name == "cso_coverage":
                categories_found = 0

                # Error messages (quoted strings that look like errors)
                error_like = re.findall(r'"[^"]{10,100}"', description)
                if error_like:
                    categories_found += 1

                # Symptoms
                symptom_patterns = [
                    r"\b(failed|error|timeout|hang|freeze|slow|flaky|crash|exception)\b"
                ]
                has_symptoms = any(re.search(p, description, re.IGNORECASE) for p in symptom_patterns)
                if has_symptoms:
                    categories_found += 1

                # Tool/library names
                tool_patterns = [
                    r"`\w+`",
                    r"\b(script|command|tool)\b",
                ]
                has_tools = any(re.search(p, description) for p in tool_patterns)
                if has_tools:
                    categories_found += 1

                if desc_len == 0:
                    return "missing", "No description content"
                elif categories_found >= 3:
                    return "excellent", f"Covers {categories_found} CSO categories"
                elif categories_found >= 2:
                    return "good", f"Covers {categories_found} CSO categories"
                elif categories_found >= 1:
                    return "fair", f"Covers {categories_found} CSO category"
                return "poor", "No CSO category coverage"

            return "missing", f"Unknown criterion: {criterion.name}"

        # Run rubric evaluation
        score, findings, recommendations = self.RUBRIC_SCORER.evaluate(evaluate_criterion)

        return DimensionScore(
            name=self.name,
            score=score,
            weight=self.weight,
            findings=findings,
            recommendations=recommendations if recommendations else ["Trigger design is adequate"],
        )


def evaluate_trigger_design(skill_path: Path) -> DimensionScore:
    """Evaluate trigger design quality (backward compatibility)."""
    evaluator = TriggerDesignEvaluator()
    return evaluator.evaluate(skill_path)
