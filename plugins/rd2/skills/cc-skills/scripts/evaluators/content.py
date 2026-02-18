"""Content evaluation module.

Evaluates the quality and completeness of SKILL.md content.

Uses rubric-based scoring with clear criteria for each level.
"""

from pathlib import Path
import re

from .base import DimensionScore, RubricLevel, RubricCriterion, RubricScorer, DIMENSION_WEIGHTS


# =============================================================================
# RUBRIC DEFINITIONS
# =============================================================================

# Rubric for content length (20% weight)
CONTENT_LENGTH_RUBRIC = RubricCriterion(
    name="content_length",
    description="Appropriateness of content length",
    weight=0.20,
    levels=[
        RubricLevel("optimal", 100, "Content is 20-500 lines with comprehensive details"),
        RubricLevel("adequate", 75, "Content is 20-500 lines with basic information"),
        RubricLevel("brief", 50, "Content is <20 lines but has essential information"),
        RubricLevel("minimal", 25, "Content is <20 lines and lacks essential information"),
        RubricLevel("empty", 0, "Content is essentially empty"),
    ],
)

# Rubric for core sections (30% weight)
CORE_SECTIONS_RUBRIC = RubricCriterion(
    name="core_sections",
    description="Presence of Overview, Examples, and Workflow/When to Use sections",
    weight=0.30,
    levels=[
        RubricLevel("complete", 100, "Has Overview, Examples, and Workflow/When to Use sections"),
        RubricLevel("good", 75, "Has Overview + Examples OR Overview + Workflow sections"),
        RubricLevel("fair", 50, "Has only one core section (Overview, Examples, or Workflow)"),
        RubricLevel("poor", 25, "Has Overview but missing Examples and Workflow"),
        RubricLevel("missing", 0, "Missing Overview section entirely"),
    ],
)

# Rubric for workflow quality (30% weight)
WORKFLOW_QUALITY_RUBRIC = RubricCriterion(
    name="workflow_quality",
    description="Quality of workflow/usage guidance within SKILL.md",
    weight=0.30,
    levels=[
        RubricLevel("excellent", 100, "Substantive workflow with numbered steps, checklists, or detailed guidance"),
        RubricLevel("good", 75, "Has workflow section with meaningful content (not just links)"),
        RubricLevel("acceptable", 50, "Has workflow section with basic details"),
        RubricLevel("minimal", 25, "Has 'When to use' guidance but no detailed workflow"),
        RubricLevel("external_only", 0, "Workflow only references external files (not acceptable)"),
    ],
)

# Rubric for documentation completeness (20% weight)
DOC_COMPLETENESS_RUBRIC = RubricCriterion(
    name="documentation_completeness",
    description="Presence of Quick Start, examples, and absence of TODO placeholders",
    weight=0.20,
    levels=[
        RubricLevel("complete", 100, "Has Quick Start, Examples, code blocks, and no TODOs"),
        RubricLevel("good", 75, "Has Quick Start and Examples with minimal TODOs"),
        RubricLevel("fair", 50, "Has Quick Start OR Examples but not both"),
        RubricLevel("poor", 25, "Missing both Quick Start and Examples"),
        RubricLevel("incomplete", 0, "Contains unresolved TODOs and missing essential sections"),
    ],
)


class ContentEvaluator:
    """Evaluates content quality in SKILL.md files using rubric-based scoring."""

    # Pre-configured rubric scorer for content evaluation
    RUBRIC_SCORER = RubricScorer([
        CONTENT_LENGTH_RUBRIC,
        CORE_SECTIONS_RUBRIC,
        WORKFLOW_QUALITY_RUBRIC,
        DOC_COMPLETENESS_RUBRIC,
    ])

    def __init__(self):
        self._name = "content"
        self._weight = DIMENSION_WEIGHTS.get("content", 0.15)  # Updated weight

    @property
    def name(self) -> str:
        """Dimension name."""
        return self._name

    @property
    def weight(self) -> float:
        """Weight in overall score."""
        return self._weight

    def evaluate(self, skill_path: Path) -> DimensionScore:
        """Evaluate content quality."""
        findings: list[str] = []
        recommendations: list[str] = []

        skill_md = skill_path / "SKILL.md"
        if not skill_md.exists():
            return DimensionScore(
                name=self.name,
                score=0.0,
                weight=self.weight,
                findings=["SKILL.md not found"],
                recommendations=["Create SKILL.md with comprehensive content"],
            )

        content = skill_md.read_text()

        # Remove frontmatter
        content_body = re.sub(r"^---\n.*?\n---\n?", "", content, flags=re.DOTALL)
        lines = [line for line in content_body.split("\n") if line.strip()]

        # Check for sections
        has_overview = re.search(r"^#{1,3}\s+Overview", content_body, re.MULTILINE | re.IGNORECASE)
        has_examples = re.search(r"^#{1,3}\s+Example", content_body, re.MULTILINE | re.IGNORECASE) or "```" in content_body
        has_when_to_use = re.search(r"^#{1,3}\s+(When to use|Usage)", content_body, re.MULTILINE | re.IGNORECASE)
        has_quick_start = re.search(r"^#{1,3}\s+Quick\s+Start", content_body, re.MULTILINE | re.IGNORECASE)
        has_todo = "[TODO:" in content

        # Evaluate all criteria with a single function
        def evaluate_criterion(criterion: RubricCriterion) -> tuple[str, str]:
            if criterion.name == "content_length":
                line_count = len(lines)
                if 20 <= line_count <= 500:
                    return "optimal", f"{line_count} lines (appropriate length)"
                elif 10 <= line_count < 20:
                    return "adequate", f"{line_count} lines (brief but present)"
                elif line_count < 10:
                    return "brief", f"{line_count} lines (very minimal)"
                elif line_count > 500:
                    return "minimal", f"{line_count} lines (excessive, consider splitting)"
                return "empty", "no content"
            elif criterion.name == "core_sections":
                sections = sum([bool(has_overview), bool(has_examples), bool(has_when_to_use)])
                if sections >= 3:
                    return "complete", f"Overview, Examples, and Workflow sections present"
                elif sections == 2:
                    return "good", f"Two core sections present"
                elif sections == 1:
                    return "fair", f"One core section present"
                elif has_overview:
                    return "poor", "Only Overview present"
                return "missing", "Missing core sections"
            elif criterion.name == "workflow_quality":
                workflow_pattern = re.search(
                    r"^#{1,3}\s+(workflow|Workflows|Usage|When to use)",
                    content_body, re.MULTILINE | re.IGNORECASE
                )
                if not workflow_pattern:
                    if has_when_to_use:
                        return "minimal", "Has 'When to use' guidance but no detailed workflow"
                    return "minimal", "No workflow or usage guidance section"
                workflow_start = workflow_pattern.end()
                workflow_section = content_body[workflow_start : workflow_start + 2000]
                link_pattern = re.search(r"^\s*\[.*?\]\(.*?\)\s*$", workflow_section, re.MULTILINE)
                if link_pattern and not any(p in workflow_section for p in ["step", "Step", "1.", "2.", "- ["]):
                    return "external_only", "Workflow only references external files"
                substantive_patterns = [
                    r"step\s+\d+", r"Step\s+\d+", r"\d+\.\s+", r"- \[\*",
                ]
                has_substantive = any(re.search(p, workflow_section, re.IGNORECASE) for p in substantive_patterns)
                if has_substantive:
                    return "excellent", "Workflow has detailed step-by-step guidance"
                return "good", "Workflow section has meaningful content"
            elif criterion.name == "documentation_completeness":
                if not has_todo and has_quick_start and has_examples:
                    return "complete", "Quick Start, Examples, and no TODOs"
                elif has_quick_start and has_examples and not has_todo:
                    return "good", "Quick Start and Examples present"
                elif has_quick_start or has_examples:
                    return "fair", "One of Quick Start or Examples present"
                elif has_todo:
                    return "incomplete", "Contains unresolved TODOs"
                return "poor", "Missing both Quick Start and Examples"
            return "poor", "Unknown criterion"

        score, findings, recommendations = self.RUBRIC_SCORER.evaluate(evaluate_criterion)

        return DimensionScore(
            name=self.name,
            score=score,
            weight=self.weight,
            findings=findings,
            recommendations=recommendations if recommendations else ["Content is comprehensive"],
        )


def evaluate_content(skill_path: Path) -> DimensionScore:
    """Evaluate content quality (backward compatibility)."""
    evaluator = ContentEvaluator()
    return evaluator.evaluate(skill_path)
