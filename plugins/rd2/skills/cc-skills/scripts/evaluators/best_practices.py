"""Best practices evaluation module.

Evaluates adherence to coding and documentation best practices using rubric-based scoring.
"""

from pathlib import Path
import re

from .base import DimensionScore, RubricLevel, RubricCriterion, RubricScorer, DIMENSION_WEIGHTS

# Handle both package import and direct execution
try:
    from ..skills import parse_frontmatter
except ImportError:
    from skills import parse_frontmatter  # type: ignore[no-redef, import-not-found]


# =============================================================================
# RUBRIC DEFINITIONS
# =============================================================================

# Rubric for naming convention (25% weight)
NAMING_CONVENTION_RUBRIC = RubricCriterion(
    name="naming_convention",
    description="Hyphen-case naming in frontmatter",
    weight=0.25,
    levels=[
        RubricLevel("perfect", 100, "Name follows hyphen-case [a-z0-9-]+ perfectly"),
        RubricLevel("good", 75, "Name mostly hyphen-case with minor issues"),
        RubricLevel("fair", 50, "Name has multiple hyphen issues"),
        RubricLevel("poor", 25, "Name does not follow hyphen-case"),
    ],
)

# Rubric for documentation completeness (30% weight)
DOC_COMPLETENESS_RUBRIC = RubricCriterion(
    name="documentation_completeness",
    description="Description length and 'when to use' guidance",
    weight=0.30,
    levels=[
        RubricLevel("complete", 100, "Good description (20-1024 chars) with 'when to use'"),
        RubricLevel("good", 75, "Good description with 'when to use'"),
        RubricLevel("fair", 50, "Description present but missing 'when to use'"),
        RubricLevel("poor", 25, "Description too short/long or missing"),
    ],
)

# Rubric for TODO resolution (25% weight)
TODO_RESOLUTION_RUBRIC = RubricCriterion(
    name="todo_resolution",
    description="Absence of TODO placeholders",
    weight=0.25,
    levels=[
        RubricLevel("clean", 100, "No TODO placeholders"),
        RubricLevel("minor", 75, "1-2 TODOs present"),
        RubricLevel("moderate", 50, "3-4 TODOs present"),
        RubricLevel("extensive", 25, "5+ TODOs present"),
    ],
)

# Rubric for script best practices (20% weight)
SCRIPT_BEST_PRACTICES_RUBRIC = RubricCriterion(
    name="script_best_practices",
    description="Python scripts follow best practices (shebang, imports)",
    weight=0.20,
    levels=[
        RubricLevel("excellent", 100, "All scripts have shebang and __future__ imports"),
        RubricLevel("good", 75, "Most scripts follow best practices"),
        RubricLevel("fair", 50, "Some scripts have shebang but missing __future__ imports"),
        RubricLevel("poor", 25, "Scripts missing basic best practices"),
        RubricLevel("none", 0, "No scripts directory"),
    ],
)


class BestPracticesEvaluator:
    """Evaluates best practices adherence in skills using rubric-based scoring."""

    # Pre-configured rubric scorer
    RUBRIC_SCORER = RubricScorer([
        NAMING_CONVENTION_RUBRIC,
        DOC_COMPLETENESS_RUBRIC,
        TODO_RESOLUTION_RUBRIC,
        SCRIPT_BEST_PRACTICES_RUBRIC,
    ])

    def __init__(self):
        self._name = "best_practices"
        self._weight = DIMENSION_WEIGHTS.get("best_practices", 0.05)  # Updated weight

    @property
    def name(self) -> str:
        """Dimension name."""
        return self._name

    @property
    def weight(self) -> float:
        """Weight in overall score."""
        return self._weight

    def evaluate(self, skill_path: Path) -> DimensionScore:
        """Evaluate adherence to best practices."""
        findings: list[str] = []
        recommendations: list[str] = []

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
        frontmatter, _ = parse_frontmatter(content)

        # Extract data
        name = frontmatter.get("name", "") if frontmatter else ""
        description = frontmatter.get("description", "") if frontmatter else ""
        todo_count = content.count("TODO:")

        # Analyze scripts
        scripts_dir = skill_path / "scripts"
        script_count = 0
        scripts_with_shebang = 0
        scripts_with_future = 0

        if scripts_dir.exists():
            for script_file in scripts_dir.glob("*.py"):
                # Skip __init__.py - it's a package marker, not a script
                if script_file.name == "__init__.py":
                    continue
                script_count += 1
                script_content = script_file.read_text()
                if script_content.startswith("#!/usr/bin/env python3"):
                    scripts_with_shebang += 1
                if "from __future__ import" in script_content:
                    scripts_with_future += 1

        # Evaluate all criteria with a single function
        def evaluate_criterion(criterion: RubricCriterion) -> tuple[str, str]:
            if criterion.name == "naming_convention":
                if not name:
                    return "poor", "No name in frontmatter"
                is_valid = bool(re.match(r"^[a-z0-9-]+$", name))
                has_invalid = name.startswith("-") or name.endswith("-") or "--" in name
                if is_valid and not has_invalid:
                    return "perfect", f"'{name}' follows hyphen-case"
                elif is_valid:
                    return "good", f"'{name}' mostly valid"
                return "poor", f"'{name}' does not follow hyphen-case"
            elif criterion.name == "documentation_completeness":
                has_when_to_use = "when to use" in content.lower()
                desc_len = len(description) if description else 0
                if 20 <= desc_len <= 1024 and has_when_to_use:
                    return "complete", "Good description with 'when to use'"
                elif 20 <= desc_len <= 1024:
                    return "good", "Good description length"
                elif desc_len > 0:
                    return "fair", f"Description present ({desc_len} chars)"
                return "poor", "No description"
            elif criterion.name == "todo_resolution":
                if todo_count == 0:
                    return "clean", "No TODO placeholders"
                elif todo_count <= 2:
                    return "minor", f"{todo_count} TODO(s)"
                elif todo_count <= 4:
                    return "moderate", f"{todo_count} TODOs"
                return "extensive", f"{todo_count} TODOs"
            elif criterion.name == "script_best_practices":
                if script_count == 0:
                    return "none", "No scripts directory"
                shebang_ratio = scripts_with_shebang / script_count if script_count > 0 else 0
                future_ratio = scripts_with_future / script_count if script_count > 0 else 0
                if shebang_ratio == 1.0 and future_ratio == 1.0:
                    return "excellent", "All scripts follow best practices"
                elif shebang_ratio >= 0.5:
                    return "good", f"{scripts_with_shebang}/{script_count} have shebang"
                elif shebang_ratio > 0:
                    return "fair", "Some scripts have shebang"
                return "poor", "Scripts missing best practices"
            return "poor", "Unknown criterion"

        score, findings, recommendations = self.RUBRIC_SCORER.evaluate(evaluate_criterion)

        return DimensionScore(
            name=self.name,
            score=score,
            weight=self.weight,
            findings=findings,
            recommendations=recommendations if recommendations else ["Follows best practices"],
        )


def evaluate_best_practices(skill_path: Path) -> DimensionScore:
    """Evaluate best practices adherence (backward compatibility)."""
    evaluator = BestPracticesEvaluator()
    return evaluator.evaluate(skill_path)
