"""Content evaluation module.

Evaluates the quality and completeness of SKILL.md content.
"""

from pathlib import Path
import re

from .base import DimensionScore, DIMENSION_WEIGHTS

# Handle both package import and direct execution
try:
    from ..skills import parse_frontmatter
except ImportError:
    from skills import parse_frontmatter


class ContentEvaluator:
    """Evaluates content quality in SKILL.md files."""

    def __init__(self):
        self._name = "content"
        self._weight = DIMENSION_WEIGHTS.get("content", 0.25)

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
                recommendations=["Create SKILL.md with comprehensive content"],
            )

        content = skill_md.read_text()

        # Remove frontmatter
        content_body = re.sub(r"^---\n.*?\n---\n", "", content, flags=re.DOTALL)

        # Check content length
        lines = [l for l in content_body.split("\n") if l.strip()]
        if len(lines) < 20:
            findings.append("Content is very brief (< 20 lines)")
            recommendations.append("Expand content with more details")
            score -= 2.0
        elif len(lines) > 500:
            findings.append("Content is very long (> 500 lines)")
            recommendations.append("Consider splitting into smaller skills")
            score -= 1.0
        else:
            findings.append(f"Content length is appropriate ({len(lines)} lines)")

        # Check for sections
        has_overview = "## Overview" in content or "# Overview" in content
        has_examples = "## Example" in content or "```" in content
        has_when_to_use = "## When to use" in content or "# When to use" in content

        if has_overview:
            findings.append("Has Overview section")
        else:
            recommendations.append("Add Overview section explaining the skill")
            score -= 1.0

        if has_examples:
            findings.append("Has examples or code blocks")
        else:
            recommendations.append("Add examples to illustrate usage")
            score -= 1.5

        # Enhanced workflow check: Verify workflow is IN SKILL.md, not just referenced
        # But allow single-action tools to skip workflow section

        workflow_section_found = False
        workflow_has_substance = False
        workflow_only_external = False

        # Look for workflow sections in body (after frontmatter)
        content_body = re.sub(r"^---\n.*?\n---\n", "", content, flags=re.DOTALL)

        # Check for workflow section headers
        workflow_pattern = re.search(
            r"#{1,3}\s+(workflow|workflows)",
            content_body,
            re.IGNORECASE | re.MULTILINE
        )

        # Determine if this is a "simple tool" (single-action) vs "complex skill"
        # Simple tools: single-action verbs in description, short content, direct commands
        is_simple_tool = False

        # Check 1: Description contains single-action verbs
        single_action_verbs = [
            r"\bconvert\b", r"\bformat\b", r"\bresize\b", r"\bextract\b",
            r"\btransform\b", r"\bparse\b", r"\bvalidate\b", r"\bencode\b",
            r"\bdecode\b", r"\bcompress\b", r"\bexpand\b"
        ]
        desc_check = False
        frontmatter_match = re.search(r"^---\n(.*?)\n---", content, re.DOTALL)
        if frontmatter_match:
            frontmatter = frontmatter_match.group(1)
            desc_match = re.search(r"description:\s*[\"'](.+?)[\"']", frontmatter, re.IGNORECASE)
            if desc_match:
                description = desc_match.group(1)
                for verb_pattern in single_action_verbs:
                    if re.search(verb_pattern, description, re.IGNORECASE):
                        desc_check = True
                        break

        # Check 2: Short content with Quick Start
        quick_start_simple = False
        has_quick_start = "## Quick Start" in content_body or "# Quick Start" in content_body
        if has_quick_start and len(lines) < 150:
            # Check if Quick Start has direct single command (not numbered steps)
            quick_start_match = re.search(
                r"#{1,3}\s+Quick\s+Start.*?(?=#{1,3}|\Z)",
                content_body,
                re.DOTALL | re.IGNORECASE
            )
            if quick_start_match:
                quick_start_content = quick_start_match.group(0)
                # If few numbered/bullet items, it's a simple tool
                step_count = len(re.findall(r"^\s*[\d\-\*]+\s+", quick_start_content, re.MULTILINE))
                if step_count <= 2:
                    quick_start_simple = True

        # Simple tool = single-action verb OR short + simple quick start
        is_simple_tool = desc_check or (quick_start_simple and len(lines) < 150)

        if workflow_pattern:
            workflow_section_found = True
            # Extract workflow section content (next 2000 chars)
            workflow_start = workflow_pattern.end()
            workflow_section = content_body[workflow_start:workflow_start + 2000]

            # Check if workflow has substantive content (not just links)
            workflow_indicators = [
                r"step\s+\d+",           # Numbered steps
                r"\*\*Step\s+\d",        # Bold step headers
                r"- \[\*\*\]",            # Checklists
                r"\d+\.",                 # Numbered lists
                r"^\s*- ",                # Bullet lists with content
                r"follow\s+this",        # "Follow this" language
                r"use\s+this",            # "Use this" language
            ]

            for pattern in workflow_indicators:
                if re.search(pattern, workflow_section, re.IGNORECASE | re.MULTILINE):
                    workflow_has_substance = True
                    break

            # Check if workflow is ONLY external reference (never acceptable)
            if re.search(r"^\s*\[.*?\]\(.*\.md\)\s*$", workflow_section, re.MULTILINE):
                # Check if ONLY links exist without substantive content
                link_lines = re.findall(r"^\s*\[.*?\]\(.*\.md\)\s*$", workflow_section, re.MULTILINE)
                if len(link_lines) > 0 and not workflow_has_substance:
                    workflow_only_external = True

        # Evaluate workflow quality with nuance for simple tools
        if workflow_section_found:
            if workflow_only_external:
                # External-only workflow is NEVER acceptable (even for simple tools)
                findings.append("Has workflow section but only references external files")
                recommendations.append("Move workflow content directly into SKILL.md - workflows are the skill's core guidance")
                score -= 2.0
            elif workflow_has_substance:
                findings.append("Has workflow/usage guidance with substantive steps in SKILL.md")
            else:
                findings.append("Has workflow section but needs more detail")
                recommendations.append("Add step-by-step details to workflow section (checklists, numbered steps, feedback loops)")
                score -= 1.0
        elif has_when_to_use:
            findings.append("Has 'when to use' guidance")
        elif is_simple_tool:
            # Simple tools don't need workflow sections - this is acceptable
            findings.append("Simple single-action tool (workflow section not required)")
        else:
            # Complex skills without workflow need guidance
            recommendations.append("Add workflow or step-by-step guidance directly in SKILL.md (not just in references/)")
            score -= 1.5

        # Check for TODO placeholders
        if "[TODO:" in content:
            findings.append("Contains unresolved TODO placeholders")
            recommendations.append("Complete or remove TODO placeholders")
            score -= 2.0

        # Check for clarity indicators
        has_quick_start = "## Quick Start" in content or "# Quick Start" in content
        if has_quick_start:
            findings.append("Has Quick Start section")
        else:
            recommendations.append("Consider adding Quick Start section")

        return DimensionScore(
            name=self.name,
            score=max(0.0, min(10.0, score)),
            weight=self.weight,
            findings=findings,
            recommendations=recommendations,
        )


def evaluate_content(skill_path: Path) -> DimensionScore:
    """Evaluate content quality (backward compatibility)."""
    evaluator = ContentEvaluator()
    return evaluator.evaluate(skill_path)
