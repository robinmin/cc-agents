"""Security evaluation module.

Evaluates security considerations in SKILL.md and scripts using rubric-based scoring.
"""

import ast
from pathlib import Path
from typing import Any

from .base import DimensionScore, RubricLevel, RubricCriterion, RubricScorer, DIMENSION_WEIGHTS

# Handle both package import and direct execution
try:
    from ..skills import (
        analyze_markdown_security,
        evaluate_rules,
        find_dangerous_calls_ast,
        RuleCategory,
    )
except ImportError:
    from skills import (  # type: ignore[no-redef, import-not-found]
        analyze_markdown_security,
        evaluate_rules,
        find_dangerous_calls_ast,
        RuleCategory,
    )


# =============================================================================
# RUBRIC DEFINITIONS
# =============================================================================

# Rubric for SKILL.md security issues (30% weight)
SKILL_MD_SECURITY_RUBRIC = RubricCriterion(
    name="skill_md_security",
    description="No dangerous code patterns in SKILL.md code blocks",
    weight=0.30,
    levels=[
        RubricLevel("clean", 100, "No security issues in SKILL.md code blocks"),
        RubricLevel("minor", 75, "1 minor security issue in SKILL.md"),
        RubricLevel("moderate", 50, "2-3 security issues in SKILL.md"),
        RubricLevel("significant", 25, "4+ security issues in SKILL.md"),
        RubricLevel("critical", 0, "Critical security issues in SKILL.md"),
    ],
)

# Rubric for script security issues (30% weight)
SCRIPT_SECURITY_RUBRIC = RubricCriterion(
    name="script_security",
    description="No dangerous patterns in Python scripts",
    weight=0.30,
    levels=[
        RubricLevel("clean", 100, "No security issues in scripts"),
        RubricLevel("minor", 75, "1 minor security issue in scripts"),
        RubricLevel("moderate", 50, "2-3 security issues in scripts"),
        RubricLevel("significant", 25, "4+ security issues in scripts"),
        RubricLevel("critical", 0, "Critical security issues in scripts"),
    ],
)

# Rubric for security awareness (25% weight)
SECURITY_AWARENESS_RUBRIC = RubricCriterion(
    name="security_awareness",
    description="Skill documents security considerations",
    weight=0.25,
    levels=[
        RubricLevel("comprehensive", 100, "Detailed security section with mitigations"),
        RubricLevel("good", 75, "Mentions security considerations"),
        RubricLevel("adequate", 50, "Has basic security mention"),
        RubricLevel("minimal", 25, "Security mentioned briefly"),
        RubricLevel("missing", 0, "No security documentation"),
    ],
)

# Rubric for security documentation (15% weight)
SECURITY_DOCS_RUBRIC = RubricCriterion(
    name="security_documentation",
    description="References and external security guidance",
    weight=0.15,
    levels=[
        RubricLevel("complete", 100, "References directory with security docs"),
        RubricLevel("good", 75, "References security topics in SKILL.md"),
        RubricLevel("adequate", 50, "Has references directory"),
        RubricLevel("minimal", 25, "Basic references present"),
        RubricLevel("none", 0, "No references or security docs"),
    ],
)


def _is_within_rule_definition_context(script_file: Path, target_line: int) -> bool:
    """Check if a line is within a rule definition context using AST analysis."""
    try:
        source = script_file.read_text()
        tree = ast.parse(source)
    except (SyntaxError, OSError):
        return False

    for node in ast.walk(tree):
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and "RULES" in target.id.upper():
                    if hasattr(node, "lineno") and hasattr(node, "end_lineno"):
                        if node.lineno <= target_line <= (node.end_lineno or node.lineno + 100):
                            return True

        if isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id == "Rule":
                if hasattr(node, "lineno") and hasattr(node, "end_lineno"):
                    if node.lineno <= target_line <= (node.end_lineno or node.lineno + 10):
                        return True

        if isinstance(node, ast.ClassDef):
            is_dataclass = any(
                (isinstance(d, ast.Name) and d.id == "dataclass")
                or (isinstance(d, ast.Call) and isinstance(d.func, ast.Name) and d.func.id == "dataclass")
                for d in node.decorator_list
            )
            if is_dataclass and node.name == "Rule":
                if hasattr(node, "lineno") and hasattr(node, "end_lineno"):
                    if node.lineno <= target_line <= (node.end_lineno or node.lineno + 50):
                        return True

    return False


class SecurityEvaluator:
    """Evaluates security quality in skills using rubric-based scoring."""

    def __init__(self):
        self._name = "security"
        self._weight = DIMENSION_WEIGHTS.get("security", 0.15)

    @property
    def name(self) -> str:
        """Dimension name."""
        return self._name

    @property
    def weight(self) -> float:
        """Weight in overall score."""
        return self._weight

    def _create_scorer(self) -> RubricScorer:
        """Create a fresh rubric scorer for each evaluation."""
        return RubricScorer([
            SKILL_MD_SECURITY_RUBRIC,
            SCRIPT_SECURITY_RUBRIC,
            SECURITY_AWARENESS_RUBRIC,
            SECURITY_DOCS_RUBRIC,
        ])

    def evaluate(self, skill_path: Path) -> DimensionScore:
        """Evaluate security considerations using rubric-based scoring."""
        findings: list[str] = []
        recommendations: list[str] = []

        skill_md = skill_path / "SKILL.md"
        if not skill_md.exists():
            return DimensionScore(
                name=self.name,
                score=0.0,
                weight=self.weight,
                findings=["SKILL.md not found"],
                recommendations=["Create SKILL.md with security considerations"],
            )

        content = skill_md.read_text()
        content_lower = content.lower()

        # Analyze SKILL.md for security issues
        md_findings = analyze_markdown_security(skill_md)
        md_issue_count = len(md_findings)

        # Check for security awareness
        security_keywords = ["security", "inject", "sanitize", "validate", "escape", "credential"]
        has_security_discussion = any(keyword in content_lower for keyword in security_keywords)
        has_security_section = "## Security" in content or "# Security" in content

        # Check references
        refs_dir = skill_path / "references"
        has_refs = refs_dir.exists()

        # Analyze scripts for security issues
        scripts_dir = skill_path / "scripts"
        script_issues = 0

        if scripts_dir.exists():
            for script_file in scripts_dir.glob("*.py"):
                if script_file.name == "skills.py":
                    continue

                try:
                    rule_results = evaluate_rules(
                        script_file, language="python", category=RuleCategory.SECURITY
                    )
                    for _rule_id, line_num, _pattern, _message, _severity in rule_results:
                        if _is_within_rule_definition_context(script_file, line_num):
                            continue
                        script_issues += 1
                except Exception:
                    script_findings = find_dangerous_calls_ast(script_file)
                    script_issues += len(script_findings)

        def evaluate_criterion(criterion: RubricCriterion) -> tuple[str, str]:
            """Evaluate a single criterion by name."""
            if criterion.name == "skill_md_security":
                if md_issue_count == 0:
                    return "clean", f"No security issues in SKILL.md code blocks"
                elif md_issue_count == 1:
                    return "minor", f"1 security issue in SKILL.md"
                elif md_issue_count <= 3:
                    return "moderate", f"{md_issue_count} security issues in SKILL.md"
                elif md_issue_count <= 5:
                    return "significant", f"{md_issue_count} security issues in SKILL.md"
                return "critical", f"{md_issue_count} security issues in SKILL.md"

            elif criterion.name == "script_security":
                if script_issues == 0:
                    return "clean", f"No security issues in scripts"
                elif script_issues == 1:
                    return "minor", f"1 security issue in scripts"
                elif script_issues <= 3:
                    return "moderate", f"{script_issues} security issues in scripts"
                elif script_issues <= 5:
                    return "significant", f"{script_issues} security issues in scripts"
                return "critical", f"{script_issues} security issues in scripts"

            elif criterion.name == "security_awareness":
                if has_security_section:
                    return "comprehensive", "Has dedicated Security section"
                elif has_security_discussion:
                    return "good", "Mentions security considerations"
                return "missing", "No security documentation"

            elif criterion.name == "security_documentation":
                if has_refs and has_security_discussion:
                    return "complete", "References directory with security topics"
                elif has_security_discussion:
                    return "good", "Mentions security in SKILL.md"
                elif has_refs:
                    return "adequate", "Has references directory"
                return "none", "No security references"

            return "none", "Not assessed"

        scorer = self._create_scorer()
        score, findings, recommendations = scorer.evaluate(evaluate_criterion)

        # Add findings for each issue
        for _pattern, line_num, context in md_findings:
            findings.append(f"SECURITY in SKILL.md:{line_num}: {context}")

        if script_issues > 0:
            findings.append(f"Found {script_issues} security issue(s) in scripts")

        return DimensionScore(
            name=self.name,
            score=score,
            weight=self.weight,
            findings=findings,
            recommendations=recommendations if recommendations else ["Security considerations are adequate"],
        )


def evaluate_security(skill_path: Path) -> DimensionScore:
    """Evaluate security quality (backward compatibility)."""
    evaluator = SecurityEvaluator()
    return evaluator.evaluate(skill_path)
