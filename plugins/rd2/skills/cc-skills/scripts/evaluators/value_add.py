"""Value-Add Assessment evaluation module.

Evaluates whether a skill provides genuine value beyond what Claude
already knows - checking for domain-specific content, unique workflows,
and concrete artifacts.

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

# Rubric for concrete artifacts (30% weight)
ARTIFACTS_RUBRIC = RubricCriterion(
    name="artifacts",
    description="Presence of concrete artifacts (scripts, references, assets)",
    weight=0.30,
    levels=[
        RubricLevel("excellent", 100, "Has scripts/ (2+ files), references/, and assets/"),
        RubricLevel("good", 75, "Has scripts/ and references/ directories"),
        RubricLevel("fair", 50, "Has scripts/ or references/ directory"),
        RubricLevel("poor", 25, "Has minimal artifacts"),
        RubricLevel("missing", 0, "No artifacts (scripts/, references/, assets/)"),
    ],
)

# Rubric for specificity (30% weight)
SPECIFICITY_RUBRIC = RubricCriterion(
    name="specificity",
    description="Specific content vs generic advice",
    weight=0.30,
    levels=[
        RubricLevel("excellent", 100, "70%+ specific content (code, paths, commands)"),
        RubricLevel("good", 75, "40-69% specific content"),
        RubricLevel("fair", 50, "20-39% specific content"),
        RubricLevel("poor", 25, "Less than 20% specific content"),
        RubricLevel("missing", 0, "No content to evaluate"),
    ],
)

# Rubric for custom workflows (25% weight)
WORKFLOW_RUBRIC = RubricCriterion(
    name="custom_workflows",
    description="Presence of custom workflows, tools, or commands",
    weight=0.25,
    levels=[
        RubricLevel("excellent", 100, "Has custom scripts, workflows, and error guidance"),
        RubricLevel("good", 75, "Has custom scripts and workflow steps"),
        RubricLevel("fair", 50, "Has some custom patterns"),
        RubricLevel("poor", 25, "Minimal custom content"),
        RubricLevel("missing", 0, "No custom workflows detected"),
    ],
)

# Rubric for anti-patterns (15% weight)
ANTI_PATTERNS_RUBRIC = RubricCriterion(
    name="anti_patterns",
    description="Absence of value-reducing patterns (wrapper-only, generic advice)",
    weight=0.15,
    levels=[
        RubricLevel("excellent", 100, "No anti-patterns detected"),
        RubricLevel("good", 75, "Minor issues (some generic advice)"),
        RubricLevel("fair", 50, "Moderate issues (concept explanations, generic advice)"),
        RubricLevel("poor", 25, "Significant issues (description-heavy, concept-heavy)"),
        RubricLevel("missing", 0, "No content or major anti-patterns"),
    ],
)


class ValueAddEvaluator:
    """Evaluates value-add assessment of a skill using rubric-based scoring."""

    # Pre-configured rubric scorer for value-add evaluation
    RUBRIC_SCORER = RubricScorer([
        ARTIFACTS_RUBRIC,
        SPECIFICITY_RUBRIC,
        WORKFLOW_RUBRIC,
        ANTI_PATTERNS_RUBRIC,
    ])

    def __init__(self):
        self._name = "value_add"
        self._weight = DIMENSION_WEIGHTS.get("value_add", 0.10)

    @property
    def name(self) -> str:
        """Dimension name."""
        return self._name

    @property
    def weight(self) -> float:
        """Weight in overall score."""
        return self._weight

    def evaluate(self, skill_path: Path) -> DimensionScore:
        """Evaluate value-add quality.

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
                recommendations=["Create SKILL.md with value-add content"],
            )

        content = skill_md.read_text()

        # Remove frontmatter
        body = re.sub(r"^---\n.*?\n---\n", "", content, flags=re.DOTALL)

        # Pre-compute artifact metrics
        has_scripts = False
        has_references = False
        has_assets = False
        script_count = 0
        ref_count = 0
        asset_count = 0

        scripts_dir = skill_path / "scripts"
        if scripts_dir.exists():
            scripts = list(scripts_dir.glob("*.py")) + list(scripts_dir.glob("*.sh"))
            if scripts:
                has_scripts = True
                script_count = len(scripts)

        references_dir = skill_path / "references"
        if references_dir.exists():
            ref_files = list(references_dir.glob("*.md"))
            if ref_files:
                has_references = True
                ref_count = len(ref_files)

        assets_dir = skill_path / "assets"
        if assets_dir.exists():
            asset_files = list(assets_dir.rglob("*"))
            if asset_files and not assets_dir.is_file():
                has_assets = True
                asset_count = len(asset_files)

        # Pre-compute specificity metrics
        specific_patterns = [
            r"`[^`]+`",  # Code snippets
            r"\./\w+",  # Relative paths
            r"\w+\.(py|sh|md|json|yaml|yml|js|ts|go|rs)",  # File extensions
            r"\b[a-zA-Z_][a-zA-Z0-9_]*\.py::[a-zA-Z_]",  # Python module:func
            r"\$\{?\w+\}?",  # Environment variables
            r"--\w+",  # CLI flags
            r"\bimport\s+\w+",  # Import statements
        ]
        specific_count = len(re.findall(r"|".join(specific_patterns), body))

        generic_patterns = [
            r"best practices?\b",
            r"\b(good|proper|correct)\s+\w+\s+(?:way|approach|method|practice)\b",
            r"\b(code|style|design|pattern)\s+(?:best|good|proper)\b",
            r"\bfollow\s+(?:the\s+)?(?:best\s+)?(?:coding\s+)?practices?\b",
            r"\bstandard\s+(?:convention|practice|approach)\b",
            r"\bmake sure to\b",
            r"\bensure (?:that )?\w+",
        ]
        generic_count = len(re.findall(r"|".join(generic_patterns), body, re.IGNORECASE))

        sentences = re.split(r"[.!?\n]+", body)
        sentence_count = len([s for s in sentences if s.strip()])
        specificity_ratio = specific_count / max(specific_count + generic_count + 1, 1)

        # Pre-compute workflow metrics
        script_invocations = len(re.findall(r"(python3?\s+.*scripts?|bash\s+.*scripts?|sh\s+)", body))
        numbered_steps = len(re.findall(r"\b(step\s+\d+|^\d+\.|first\s+,?\s*second\s+,?\s*third)", body, re.MULTILINE | re.IGNORECASE))
        custom_patterns = [
            r"\b(?:my|our|this)\s+(?:project|plugin|tool|skill|system)\b",
            r"\bspecific(?:ly)?\s+(?:to|for|project|domain)\b",
            r"\bcustom(?:ized)?\s+\w+\b",
        ]
        custom_matches = len(re.findall(r"|".join(custom_patterns), body, re.IGNORECASE))
        error_guides = len(re.findall(r"(error|exception|fail|timeout|crash)\s*[:\-]\s*\S+", body, re.IGNORECASE))
        command_patterns = [
            r"python3?\s+\${?\w+}?\s+\w+",
            r"npm\s+(run|exec|start|test)",
            r"go\s+(run|build|test)",
            r"cargo\s+(run|build|test)",
        ]
        commands_found = len(re.findall(r"|".join(command_patterns), body))
        workflow_score_raw = (1 if script_invocations else 0) + (1 if numbered_steps else 0) + (1 if custom_matches else 0) + (1 if error_guides else 0) + (1 if commands_found else 0)

        # Pre-compute anti-pattern metrics
        frontmatter_match = re.search(r"^---\n.*?\n---", content, re.DOTALL)
        frontmatter_len = len(frontmatter_match.group(0)) if frontmatter_match else 0
        body_len = len(body)

        generic_advice_count = len(re.findall(
            r"\b(choose the right|use best practices|follow standards|"
            r"write clean code|be consistent|keep it simple|"
            r"think about|consider the|make informed)\b",
            body, re.IGNORECASE
        ))
        concept_explanations = len(re.findall(
            r"\b(is a|are |refers to|means|defined as)\b.*\b(which|that|this)\b",
            body, re.IGNORECASE
        ))

        # Single evaluator function for all criteria
        def evaluate_criterion(criterion: RubricCriterion) -> tuple[str, str]:
            if criterion.name == "artifacts":
                if has_scripts and has_references and has_assets:
                    return "excellent", f"Has scripts/ ({script_count}), references/ ({ref_count}), assets/ ({asset_count})"
                elif has_scripts and has_references:
                    return "good", f"Has scripts/ ({script_count}) and references/ ({ref_count})"
                elif has_scripts or has_references:
                    which = "scripts" if has_scripts else "references"
                    count = script_count if has_scripts else ref_count
                    return "fair", f"Has {which}/ ({count})"
                elif script_count > 0 or ref_count > 0:
                    return "poor", "Has minimal artifacts"
                return "missing", "No artifacts (scripts/, references/, assets/)"

            elif criterion.name == "specificity":
                if sentence_count == 0:
                    return "missing", "No content to evaluate"
                pct = specificity_ratio * 100
                if specificity_ratio >= 0.7:
                    return "excellent", f"Highly specific ({pct:.0f}% ratio)"
                elif specificity_ratio >= 0.4:
                    return "good", f"Good specificity ({pct:.0f}% ratio)"
                elif specificity_ratio >= 0.2:
                    return "fair", f"Moderate specificity ({pct:.0f}% ratio)"
                return "poor", f"Low specificity ({pct:.0f}% ratio)"

            elif criterion.name == "custom_workflows":
                if workflow_score_raw >= 4:
                    return "excellent", f"Has scripts ({script_invocations}), steps ({numbered_steps}), custom ({custom_matches}), errors ({error_guides})"
                elif workflow_score_raw >= 2:
                    return "good", f"Has custom scripts ({script_invocations}) and steps ({numbered_steps})"
                elif workflow_score_raw >= 1:
                    return "fair", "Has some custom patterns"
                elif body_len > 0:
                    return "poor", "Minimal custom content"
                return "missing", "No custom workflows detected"

            elif criterion.name == "anti_patterns":
                if body_len == 0:
                    return "missing", "No content or major anti-patterns"
                
                issues = 0
                issue_list = []
                
                if frontmatter_len > body_len and frontmatter_len > 500:
                    issues += 1
                    issue_list.append("description-heavy")
                if generic_advice_count >= 3:
                    issues += 1
                    issue_list.append("generic advice")
                if concept_explanations >= 3:
                    issues += 1
                    issue_list.append("concept explanations")
                
                if issues == 0:
                    return "excellent", "No anti-patterns detected"
                elif issues == 1:
                    return "good", f"Minor issues ({', '.join(issue_list)})"
                elif issues == 2:
                    return "fair", f"Moderate issues ({', '.join(issue_list)})"
                return "poor", f"Significant issues ({', '.join(issue_list)})"

            return "missing", f"Unknown criterion: {criterion.name}"

        # Run rubric evaluation
        score, findings, recommendations = self.RUBRIC_SCORER.evaluate(evaluate_criterion)

        return DimensionScore(
            name=self.name,
            score=score,
            weight=self.weight,
            findings=findings,
            recommendations=recommendations if recommendations else ["Value-add assessment is adequate"],
        )


def evaluate_value_add(skill_path: Path) -> DimensionScore:
    """Evaluate value-add quality (backward compatibility)."""
    evaluator = ValueAddEvaluator()
    return evaluator.evaluate(skill_path)
