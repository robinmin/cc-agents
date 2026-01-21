"""Shared imports for evaluator modules (L1: Consolidate import fallback pattern).

This module consolidates the try/except import pattern used across all evaluators,
reducing code duplication and maintenance burden.
"""

# Handle both package import and direct execution
try:
    from ..skills import (
        DIMENSION_WEIGHTS,
        get_ast,
        get_file_content,
        parse_frontmatter,
        RuleCategory,
        RuleSeverity,
        get_rules,
        evaluate_rules,
        find_dangerous_calls_ast,
        analyze_markdown_security,
        analyze_type_hints,
        analyze_exception_handlers,
    )
except ImportError:
    from skills import (  # type: ignore[no-redef, import-not-found]
        DIMENSION_WEIGHTS,
        get_ast,
        get_file_content,
        parse_frontmatter,
        RuleCategory,
        RuleSeverity,
        get_rules,
        evaluate_rules,
        find_dangerous_calls_ast,
        analyze_markdown_security,
        analyze_type_hints,
        analyze_exception_handlers,
    )

__all__ = [
    "DIMENSION_WEIGHTS",
    "get_ast",
    "get_file_content",
    "parse_frontmatter",
    "RuleCategory",
    "RuleSeverity",
    "get_rules",
    "evaluate_rules",
    "find_dangerous_calls_ast",
    "analyze_markdown_security",
    "analyze_type_hints",
    "analyze_exception_handlers",
]
