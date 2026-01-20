"""Security evaluation module.

Evaluates security considerations in SKILL.md and scripts.
"""

from pathlib import Path

from .base import DimensionScore, DIMENSION_WEIGHTS

# Handle both package import and direct execution
try:
    from ..skills import analyze_markdown_security, evaluate_rules, find_dangerous_calls_ast, RuleCategory
except ImportError:
    from skills import analyze_markdown_security, evaluate_rules, find_dangerous_calls_ast, RuleCategory


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
        score = 10.0

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
            recommendations.append(f"Review {pattern} usage in code block at line {line_num}")
            score -= 1.5

        # Check for security mentions (positive indicator)
        security_keywords = ["security", "inject", "sanitize", "validate", "escape", "credential"]
        has_security_discussion = any(keyword in content_lower for keyword in security_keywords)

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
                    rule_results = evaluate_rules(script_file, language=lang, category=RuleCategory.SECURITY)
                    for rule_id, line_num, pattern, message, severity in rule_results:
                        # Filter out false positives from rule definitions
                        # Skip if line contains "id=" or "pattern=" (likely a rule definition)
                        try:
                            line_content = script_file.read_text().splitlines()[line_num - 1]
                            if "id=" in line_content or 'id="' in line_content:
                                continue
                            if "pattern=" in line_content or 'pattern="' in line_content:
                                continue
                        except (IndexError, OSError):
                            pass

                        findings.append(
                            f"SECURITY {rule_id} in {script_file.name}:{line_num}: {message}"
                        )
                        score -= 1.0
                        recommendations.append(
                            f"Review {rule_id} at {script_file.name}:{line_num}"
                        )
                except Exception as e:
                    # If rules engine fails, fall back to old method
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
            score=max(0.0, min(10.0, score)),
            weight=self.weight,
            findings=findings,
            recommendations=recommendations,
        )


def evaluate_security(skill_path: Path) -> DimensionScore:
    """Evaluate security quality (backward compatibility)."""
    evaluator = SecurityEvaluator()
    return evaluator.evaluate(skill_path)
