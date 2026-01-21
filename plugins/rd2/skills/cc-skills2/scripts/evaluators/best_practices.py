"""Best practices evaluation module.

Evaluates adherence to coding and documentation best practices.
"""

from pathlib import Path
import re

from .base import DimensionScore, DIMENSION_WEIGHTS

# Handle both package import and direct execution
try:
    from ..skills import parse_frontmatter
except ImportError:
    from skills import parse_frontmatter  # type: ignore[no-redef, import-not-found]


class BestPracticesEvaluator:
    """Evaluates best practices adherence in skills."""

    def __init__(self):
        self._name = "best_practices"
        self._weight = DIMENSION_WEIGHTS.get("best_practices", 0.10)

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
        frontmatter, _ = parse_frontmatter(content)

        # Check naming convention
        if frontmatter:
            name = frontmatter.get("name", "")
            if name:
                if re.match(r"^[a-z0-9-]+$", name):
                    findings.append("Follows hyphen-case naming convention")
                else:
                    findings.append("Does not follow hyphen-case naming")
                    score -= 15.0  # 0-100 scale

        # Check for anti-patterns
        todo_count = content.count("TODO:")
        if todo_count > 0:
            findings.append(f"Contains {todo_count} TODO placeholders")
            recommendations.append("Resolve TODO placeholders before production")
            score -= min(20.0, todo_count * 5.0)  # 0-100 scale

        # Check for clear activation
        if frontmatter:
            description = frontmatter.get("description", "")
            if description:
                if len(description) >= 20 and len(description) <= 1024:
                    findings.append("Description length is appropriate")
                else:
                    recommendations.append("Improve description (20-1024 characters)")
                    score -= 10.0  # 0-100 scale

        # Check for when to use guidance
        if "when to use" in content.lower():
            findings.append("Has 'when to use' guidance")
        else:
            recommendations.append("Consider adding 'when to use' section")

        # Check scripts directory for best practices
        scripts_dir = skill_path / "scripts"
        if scripts_dir.exists():
            for script_file in scripts_dir.glob("*.py"):
                script_content = script_file.read_text()

                # Check for shebang
                if script_content.startswith("#!/usr/bin/env python3"):
                    findings.append(f"{script_file.name}: Has proper shebang")
                else:
                    recommendations.append(
                        f"{script_file.name}: Add #!/usr/bin/env python3 shebang"
                    )

                # Check for __future__ imports (Python best practice)
                if "from __future__ import" in script_content:
                    findings.append(f"{script_file.name}: Uses __future__ imports")
                else:
                    recommendations.append(
                        f"{script_file.name}: Consider adding 'from __future__ import annotations'"
                    )

        return DimensionScore(
            name=self.name,
            score=max(0.0, min(100.0, score)),  # 0-100 scale
            weight=self.weight,
            findings=findings,
            recommendations=recommendations,
        )


def evaluate_best_practices(skill_path: Path) -> DimensionScore:
    """Evaluate best practices adherence (backward compatibility)."""
    evaluator = BestPracticesEvaluator()
    return evaluator.evaluate(skill_path)
