"""Security evaluation module.

Evaluates security considerations in SKILL.md and scripts.
"""

import ast
from pathlib import Path

from .base import DimensionScore, DIMENSION_WEIGHTS

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


# Score deduction constants (M4: Extract magic numbers)
PENALTY_CRITICAL_SECURITY = 15.0  # For SKILL.md security issues (0-100 scale)
PENALTY_HIGH_SECURITY = 10.0  # For script security issues (0-100 scale)


def _is_within_rule_definition_context(script_file: Path, target_line: int) -> bool:
    """Check if a line is within a rule definition context using AST analysis.

    This prevents false positives when security patterns appear in:
    - BUILTIN_RULES list definitions
    - Rule dataclass instantiations
    - @dataclass decorated classes

    Args:
        script_file: Path to the Python script
        target_line: Line number to check (1-indexed)

    Returns:
        True if the line is within a rule definition context (false positive)
    """
    try:
        source = script_file.read_text()
        tree = ast.parse(source)
    except (SyntaxError, OSError):
        return False

    # Walk the AST to find if target_line is within a rule definition context
    for node in ast.walk(tree):
        # Check for assignment to BUILTIN_RULES or similar rule lists
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and "RULES" in target.id.upper():
                    # Check if target_line falls within this assignment
                    if hasattr(node, "lineno") and hasattr(node, "end_lineno"):
                        if (
                            node.lineno
                            <= target_line
                            <= (node.end_lineno or node.lineno + 100)
                        ):
                            return True

        # Check for Rule() instantiations
        if isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id == "Rule":
                if hasattr(node, "lineno") and hasattr(node, "end_lineno"):
                    if (
                        node.lineno
                        <= target_line
                        <= (node.end_lineno or node.lineno + 10)
                    ):
                        return True

        # Check for @dataclass decorated class definitions containing rule-like fields
        if isinstance(node, ast.ClassDef):
            is_dataclass = any(
                (isinstance(d, ast.Name) and d.id == "dataclass")
                or (
                    isinstance(d, ast.Call)
                    and isinstance(d.func, ast.Name)
                    and d.func.id == "dataclass"
                )
                for d in node.decorator_list
            )
            if is_dataclass and node.name == "Rule":
                if hasattr(node, "lineno") and hasattr(node, "end_lineno"):
                    if (
                        node.lineno
                        <= target_line
                        <= (node.end_lineno or node.lineno + 50)
                    ):
                        return True

    return False


class SecurityEvaluator:
    """Evaluates security quality in skills."""

    def __init__(self):
        self._name = "security"
        self._weight = DIMENSION_WEIGHTS.get("security", 0.20)

    @property
    def name(self) -> str:
        """Dimension name."""
        return self._name

    @property
    def weight(self) -> float:
        """Weight in overall score."""
        return self._weight

    def evaluate(self, skill_path: Path) -> DimensionScore:
        """Evaluate security considerations using AST-based analysis."""
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
                recommendations=["Create SKILL.md with security considerations"],
            )

        content = skill_md.read_text()
        content_lower = content.lower()

        # AST-based analysis of Python code blocks in SKILL.md
        md_findings = analyze_markdown_security(skill_md)
        for pattern, line_num, context in md_findings:
            findings.append(f"SECURITY in SKILL.md:{line_num}: {context}")
            recommendations.append(
                f"Review {pattern} usage in code block at line {line_num}"
            )
            score -= PENALTY_CRITICAL_SECURITY

        # Check for security mentions (positive indicator)
        security_keywords = [
            "security",
            "inject",
            "sanitize",
            "validate",
            "escape",
            "credential",
        ]
        has_security_discussion = any(
            keyword in content_lower for keyword in security_keywords
        )

        if has_security_discussion:
            findings.append("Mentions security considerations")
        else:
            recommendations.append("Add security considerations if applicable")

        # Check for references
        refs_dir = skill_path / "references"
        if refs_dir.exists():
            findings.append("Has references directory for documentation")
        else:
            recommendations.append("Consider adding references for security guidance")

        # AST-based analysis of Python scripts using new rules system
        scripts_dir = skill_path / "scripts"
        if scripts_dir.exists():
            for script_file in scripts_dir.glob("*.py"):
                # Skip the skills.py framework file itself
                if script_file.name == "skills.py":
                    continue

                # Detect language from extension
                lang = "python"  # Default for now, could be extended

                # Use the new rules system for comprehensive security checking
                try:
                    rule_results = evaluate_rules(
                        script_file, language=lang, category=RuleCategory.SECURITY
                    )
                    for rule_id, line_num, pattern, message, severity in rule_results:
                        # Filter out false positives using AST context analysis
                        # Skip if the finding is within a rule definition context
                        if _is_within_rule_definition_context(script_file, line_num):
                            continue

                        findings.append(
                            f"SECURITY {rule_id} in {script_file.name}:{line_num}: {message} [severity: {severity}]"
                        )
                        score -= PENALTY_HIGH_SECURITY
                        recommendations.append(
                            f"Review {rule_id} at {script_file.name}:{line_num}"
                        )
                except Exception as e:
                    # If rules engine fails, log warning and fall back to old method
                    import sys

                    print(
                        f"Warning: Rules engine failed for {script_file.name}: {e}",
                        file=sys.stderr,
                    )
                    script_findings = find_dangerous_calls_ast(script_file)
                    for pattern, line_num, context in script_findings:
                        findings.append(
                            f"SECURITY in {script_file.name}:{line_num}: {context}"
                        )
                        recommendations.append(
                            f"Review {pattern} at {script_file.name}:{line_num}"
                        )
                        score -= 1.0

        if not any("SECURITY SEC" in f or "SECURITY in" in f for f in findings):
            findings.append("No obvious security issues detected")

        return DimensionScore(
            name=self.name,
            score=max(0.0, min(100.0, score)),  # 0-100 scale
            weight=self.weight,
            findings=findings,
            recommendations=recommendations,
        )


def evaluate_security(skill_path: Path) -> DimensionScore:
    """Evaluate security quality (backward compatibility)."""
    evaluator = SecurityEvaluator()
    return evaluator.evaluate(skill_path)
