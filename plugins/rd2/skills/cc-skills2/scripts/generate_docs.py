#!/usr/bin/env python3
"""
Documentation Generation Script

Generates documentation from code to ensure docs stay in sync with implementation.

Usage:
    python3 scripts/generate_docs.py              # Generate all docs
    python3 scripts/generate_docs.py --check       # Verify docs are fresh
    python3 scripts/generate_docs.py --rules      # Generate rule docs only
    python3 scripts/generate_docs.py --evaluators  # Generate evaluator docs only
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path


def generate_evaluator_docs() -> str:
    """Generate docs from evaluator docstrings.

    Returns:
        Markdown documentation string
    """
    lines = []
    lines.append("# Evaluator Dimensions")
    lines.append("")
    lines.append(
        "This document describes each evaluation dimension in the skill evaluation system."
    )
    lines.append("")
    lines.append("## Dimensions")
    lines.append("")

    # Import evaluators
    sys.path.insert(0, str(Path(__file__).parent))
    from evaluators.frontmatter import FrontmatterEvaluator
    from evaluators.content import ContentEvaluator
    from evaluators.security import SecurityEvaluator
    from evaluators.structure import StructureEvaluator
    from evaluators.efficiency import EfficiencyEvaluator
    from evaluators.best_practices import BestPracticesEvaluator
    from evaluators.code_quality import CodeQualityEvaluator

    evaluators = [
        FrontmatterEvaluator,
        ContentEvaluator,
        SecurityEvaluator,
        StructureEvaluator,
        EfficiencyEvaluator,
        BestPracticesEvaluator,
        CodeQualityEvaluator,
    ]

    for evaluator_cls in evaluators:
        evaluator = evaluator_cls()
        lines.append(f"### {evaluator.name.title().replace('_', ' ')}")
        lines.append("")
        lines.append(f"**Weight:** {evaluator.weight * 100:.0f}%")
        lines.append("")

        # Add class docstring if available
        if evaluator_cls.__doc__:
            docstring = evaluator_cls.__doc__.strip()
            lines.append(docstring)
            lines.append("")

        # Add evaluate method docstring
        evaluate_method = getattr(evaluator, "evaluate")
        if evaluate_method.__doc__:
            lines.append("**Evaluation Criteria:**")
            lines.append("")
            for line in evaluate_method.__doc__.strip().split("\n"):
                if line:
                    lines.append(f"  {line}")
            lines.append("")

        lines.append("---")
        lines.append("")

    return "\n".join(lines)


def generate_rule_docs() -> str:
    """Generate docs from rule definitions.

    Returns:
        Markdown documentation string
    """
    lines = []
    lines.append("# Security and Code Quality Rules")
    lines.append("")
    lines.append("This document describes all built-in rules used in skill evaluation.")
    lines.append("")
    lines.append("## Rule Categories")
    lines.append("")
    lines.append("- **Security** - Security vulnerability patterns")
    lines.append("- **Code Quality** - Code quality and maintainability patterns")
    lines.append("- **Style** - Code style and formatting patterns")
    lines.append("- **Performance** - Performance-related patterns")
    lines.append("- **Best Practices** - Best practice violations")
    lines.append("")
    lines.append("## Rules")
    lines.append("")

    # Import rules
    sys.path.insert(0, str(Path(__file__).parent))
    from skills import BUILTIN_RULES

    # Group by category
    by_category: dict[str, list] = {}
    for rule in BUILTIN_RULES:
        category = rule.category.value
        if category not in by_category:
            by_category[category] = []
        by_category[category].append(rule)

    for category in sorted(by_category.keys()):
        lines.append(f"### {category.replace('_', ' ').title()}")
        lines.append("")

        for rule in sorted(by_category[category], key=lambda r: r.id):
            lines.append(f"#### {rule.id}: {rule.message}")
            lines.append("")
            lines.append(f"- **Pattern:** `{rule.pattern}`")
            lines.append(f"- **Severity:** {rule.severity.value}")
            lines.append(f"- **Languages:** {', '.join(rule.languages)}")
            lines.append(f"- **Pattern Type:** {rule.pattern_type.value}")
            lines.append("")

    return "\n".join(lines)


def generate_api_docs() -> str:
    """Generate API documentation for main skills module.

    Returns:
        Markdown documentation string
    """
    lines = []
    lines.append("# Skills API Documentation")
    lines.append("")
    lines.append(
        "This document describes the main API for the skills evaluation system."
    )
    lines.append("")
    lines.append("## Core Functions")
    lines.append("")

    sys.path.insert(0, str(Path(__file__).parent))
    import skills

    # Document key functions
    functions_to_doc = [
        "validate_skill",
        "init_skill",
        "package_skill",
        "run_quality_assessment",
        "evaluate_rules",
        "get_rules",
        "get_cache",
        "get_hooks",
        "register_hook",
    ]

    for func_name in functions_to_doc:
        if hasattr(skills, func_name):
            func = getattr(skills, func_name)
            lines.append(f"### {func_name}()")
            lines.append("")

            if func.__doc__:
                lines.append("```")
                lines.append(func.__doc__)
                lines.append("```")
                lines.append("")

            # Get function signature
            import inspect

            try:
                sig = inspect.signature(func)
                lines.append(f"**Signature:** `{func_name}{sig}`")
                lines.append("")
            except Exception:
                pass

            lines.append("---")
            lines.append("")

    return "\n".join(lines)


def check_freshness(docs_dir: Path) -> tuple[bool, list[str]]:
    """Check if generated docs are up to date.

    Args:
        docs_dir: Path to docs directory

    Returns:
        Tuple of (is_fresh, list_of_stale_files)
    """

    stale_files = []

    # Regenerate docs to temp file and compare
    evaluators_doc = generate_evaluator_docs()
    rules_doc = generate_rule_docs()
    api_doc = generate_api_docs()

    # Check evaluator docs
    evaluator_path = docs_dir / "evaluators.md"
    if evaluator_path.exists():
        current = evaluator_path.read_text()
        if current != evaluators_doc:
            stale_files.append("evaluators.md")

    # Check rule docs
    rules_path = docs_dir / "rules.md"
    if rules_path.exists():
        current = rules_path.read_text()
        if current != rules_doc:
            stale_files.append("rules.md")

    # Check API docs
    api_path = docs_dir / "api.md"
    if api_path.exists():
        current = api_path.read_text()
        if current != api_doc:
            stale_files.append("api.md")

    return (len(stale_files) == 0, stale_files)


def write_docs(docs_dir: Path) -> None:
    """Write generated docs to files.

    Args:
        docs_dir: Path to docs directory
    """
    docs_dir.mkdir(parents=True, exist_ok=True)

    # Generate and write evaluator docs
    evaluators_doc = generate_evaluator_docs()
    (docs_dir / "evaluators.md").write_text(evaluators_doc)
    print(f"Generated: {docs_dir / 'evaluators.md'}")

    # Generate and write rule docs
    rules_doc = generate_rule_docs()
    (docs_dir / "rules.md").write_text(rules_doc)
    print(f"Generated: {docs_dir / 'rules.md'}")

    # Generate and write API docs
    api_doc = generate_api_docs()
    (docs_dir / "api.md").write_text(api_doc)
    print(f"Generated: {docs_dir / 'api.md'}")


def main() -> int:
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Generate documentation from code")
    parser.add_argument(
        "--check",
        action="store_true",
        help="Check if docs are up to date (exit code 1 if not)",
    )
    parser.add_argument(
        "--rules", action="store_true", help="Only generate rule documentation"
    )
    parser.add_argument(
        "--evaluators",
        action="store_true",
        help="Only generate evaluator documentation",
    )
    parser.add_argument(
        "--api", action="store_true", help="Only generate API documentation"
    )
    parser.add_argument(
        "--output-dir",
        "-o",
        type=Path,
        default=Path(__file__).parent.parent / "docs" / "generated",
        help="Output directory for generated docs",
    )

    args = parser.parse_args()

    if args.check:
        # Check freshness mode
        is_fresh, stale = check_freshness(args.output_dir)
        if not is_fresh:
            print(f"Stale documentation files: {', '.join(stale)}")
            print("Run 'python3 scripts/generate_docs.py' to update documentation")
            return 1
        print("Documentation is up to date")
        return 0

    # Generate mode
    if args.rules:
        # Generate only rules
        args.output_dir.mkdir(parents=True, exist_ok=True)
        rules_doc = generate_rule_docs()
        (args.output_dir / "rules.md").write_text(rules_doc)
        print(f"Generated: {args.output_dir / 'rules.md'}")
    elif args.evaluators:
        # Generate only evaluators
        args.output_dir.mkdir(parents=True, exist_ok=True)
        evaluators_doc = generate_evaluator_docs()
        (args.output_dir / "evaluators.md").write_text(evaluators_doc)
        print(f"Generated: {args.output_dir / 'evaluators.md'}")
    elif args.api:
        # Generate only API docs
        args.output_dir.mkdir(parents=True, exist_ok=True)
        api_doc = generate_api_docs()
        (args.output_dir / "api.md").write_text(api_doc)
        print(f"Generated: {args.output_dir / 'api.md'}")
    else:
        # Generate all
        write_docs(args.output_dir)

    return 0


if __name__ == "__main__":
    sys.exit(main())
