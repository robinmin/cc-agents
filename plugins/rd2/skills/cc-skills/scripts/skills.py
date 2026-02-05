#!/usr/bin/env python3
"""
Skill Management Utility - Initialize, validate, evaluate, and package skills.

Usage:
    python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py <command> [options]

Commands:
    init <skill-name> --path <path>    Initialize a new skill directory
    validate <skill-path>              Validate a skill directory
    evaluate <skill-path> [--json]     Evaluate skill quality
    package <skill-path> [output-dir]  Package a skill for distribution

Examples:
    python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py init my-skill --path ./skills
    python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py validate ./skills/my-skill
    python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py evaluate ./skills/my-skill
    python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py evaluate ./skills/my-skill --json
    python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py package ./skills/my-skill ./dist
"""

from __future__ import annotations

import argparse
import ast
import json
import re
import shutil
import subprocess
import sys
import zipfile
from dataclasses import dataclass, field
from enum import Enum
from functools import lru_cache
from pathlib import Path
from typing import Any, Callable, MutableMapping, Protocol, runtime_checkable

try:
    import yaml  # type: ignore[import-not-found, import-untyped]

    HAS_YAML = True
except ImportError:
    yaml = None  # type: ignore[assignment]
    HAS_YAML = False


###############################################################################
# AST-BASED SECURITY ANALYSIS
###############################################################################


def find_dangerous_calls_ast(script_path: Path) -> list[tuple[str, int, str]]:
    """
    Find dangerous function calls using Python AST analysis.

    This function parses Python source code into an AST and walks the tree
    to find actual dangerous function calls. Unlike string matching, this
    approach does not trigger on comments, strings, or documentation.

    Args:
        script_path: Path to a Python script file

    Returns:
        List of (pattern, line_number, context) tuples for each finding.
        Empty list if file has syntax errors or cannot be parsed.
    """
    dangerous_calls: list[tuple[str, int, str]] = []

    try:
        source = script_path.read_text()
        tree = ast.parse(source)
    except SyntaxError:
        return []
    except OSError:
        return []

    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            # Check for direct function calls
            if isinstance(node.func, ast.Name):
                func_name = node.func.id
                if func_name == "eval":
                    dangerous_calls.append(
                        (
                            "eval()",
                            node.lineno,
                            "Direct call to eval() - code injection risk",
                        )
                    )
                elif func_name == "exec":
                    dangerous_calls.append(
                        (
                            "exec()",
                            node.lineno,
                            "Direct call to exec() - code injection risk",
                        )
                    )
                elif func_name == "__import__":
                    dangerous_calls.append(
                        (
                            "__import__()",
                            node.lineno,
                            "Dynamic import with __import__() - code injection risk",
                        )
                    )

            # Check for attribute calls
            if isinstance(node.func, ast.Attribute):
                attr_name = node.func.attr
                if isinstance(node.func.value, ast.Name):
                    obj_name = node.func.value.id

                    if obj_name == "os" and attr_name in ("system", "popen"):
                        dangerous_calls.append(
                            (
                                f"os.{attr_name}()",
                                node.lineno,
                                f"Call to os.{attr_name}() - command injection risk",
                            )
                        )

                    if obj_name == "pickle" and attr_name == "loads":
                        dangerous_calls.append(
                            (
                                "pickle.loads()",
                                node.lineno,
                                "Call to pickle.loads() - arbitrary code execution risk",
                            )
                        )

                    if obj_name == "subprocess" and attr_name in (
                        "call",
                        "run",
                        "Popen",
                        "check_call",
                        "check_output",
                    ):
                        for keyword in node.keywords:
                            if keyword.arg == "shell":
                                if isinstance(keyword.value, ast.Constant):
                                    if keyword.value.value is True:
                                        dangerous_calls.append(
                                            (
                                                f"subprocess.{attr_name}(shell=True)",
                                                node.lineno,
                                                f"subprocess.{attr_name}() with shell=True - command injection risk",
                                            )
                                        )

    return dangerous_calls


def extract_python_code_blocks(markdown_content: str) -> list[tuple[str, int]]:
    """
    Extract Python code blocks from markdown content.

    Args:
        markdown_content: Full markdown file content

    Returns:
        List of (code_content, start_line_number) tuples
    """
    code_blocks: list[tuple[str, int]] = []
    pattern = r"```(?:python|py)\n(.*?)```"

    for match in re.finditer(pattern, markdown_content, re.DOTALL | re.IGNORECASE):
        code = match.group(1)
        start_pos = match.start()
        line_num = markdown_content[:start_pos].count("\n") + 2
        code_blocks.append((code, line_num))

    return code_blocks


def analyze_markdown_security(skill_md_path: Path) -> list[tuple[str, int, str]]:
    """
    Analyze SKILL.md for security issues in Python code blocks only.

    This function extracts Python code blocks from markdown and applies
    AST-based security analysis. Prose text is completely ignored.

    Args:
        skill_md_path: Path to SKILL.md file

    Returns:
        List of (pattern, line_number, context) tuples for each finding.
    """
    findings: list[tuple[str, int, str]] = []

    try:
        content = skill_md_path.read_text()
    except OSError:
        return []

    code_blocks = extract_python_code_blocks(content)

    for code, block_start_line in code_blocks:
        try:
            tree = ast.parse(code)
        except SyntaxError:
            continue

        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name):
                    func_name = node.func.id
                    if func_name == "eval":
                        findings.append(
                            (
                                "eval()",
                                block_start_line + node.lineno - 1,
                                "Code block contains eval() call",
                            )
                        )
                    elif func_name == "exec":
                        findings.append(
                            (
                                "exec()",
                                block_start_line + node.lineno - 1,
                                "Code block contains exec() call",
                            )
                        )
                    elif func_name == "__import__":
                        findings.append(
                            (
                                "__import__()",
                                block_start_line + node.lineno - 1,
                                "Code block contains __import__() call",
                            )
                        )

                if isinstance(node.func, ast.Attribute):
                    if isinstance(node.func.value, ast.Name):
                        obj_name = node.func.value.id
                        attr_name = node.func.attr

                        if obj_name == "os" and attr_name in ("system", "popen"):
                            findings.append(
                                (
                                    f"os.{attr_name}()",
                                    block_start_line + node.lineno - 1,
                                    f"Code block contains os.{attr_name}() call",
                                )
                            )

                        if obj_name == "pickle" and attr_name == "loads":
                            findings.append(
                                (
                                    "pickle.loads()",
                                    block_start_line + node.lineno - 1,
                                    "Code block contains pickle.loads() call",
                                )
                            )

                        if obj_name == "subprocess":
                            for keyword in node.keywords:
                                if keyword.arg == "shell":
                                    if isinstance(keyword.value, ast.Constant):
                                        if keyword.value.value is True:
                                            findings.append(
                                                (
                                                    f"subprocess.{attr_name}(shell=True)",
                                                    block_start_line + node.lineno - 1,
                                                    "Code block contains subprocess with shell=True",
                                                )
                                            )

    return findings


###############################################################################
# AST CACHING (Phase 2 - Task 0011)
###############################################################################


def _get_cache_key(path: Path) -> tuple[str, float]:
    """Create cache key from path and modification time."""
    return (str(path), path.stat().st_mtime)


@lru_cache(maxsize=100)
def _parse_python_cached(cache_key: tuple[str, float]) -> ast.AST | None:
    """Parse Python file with caching based on path and mtime."""
    path = Path(cache_key[0])
    try:
        return ast.parse(path.read_text())
    except (SyntaxError, OSError):
        return None


def get_ast(path: Path) -> ast.AST | None:
    """Get cached AST for Python file."""
    try:
        key = _get_cache_key(path)
        return _parse_python_cached(key)
    except OSError:
        return None


@lru_cache(maxsize=100)
def _read_file_cached(cache_key: tuple[str, float]) -> str | None:
    """Read file with caching based on path and mtime."""
    path = Path(cache_key[0])
    try:
        return path.read_text()
    except OSError:
        return None


def get_file_content(path: Path) -> str | None:
    """Get cached file content."""
    try:
        key = _get_cache_key(path)
        return _read_file_cached(key)
    except OSError:
        return None


def clear_ast_cache() -> None:
    """Clear AST and file caches (for testing)."""
    _parse_python_cached.cache_clear()
    _read_file_cached.cache_clear()


class CacheManager:
    """Unified cache for skill evaluation.

    Provides:
    - File content caching with mtime invalidation
    - AST parsing caching
    - Evaluation results caching
    - Cache statistics tracking
    - Optional persistent cache
    """

    def __init__(self, max_size: int = 100):
        self._file_cache: dict[str, tuple[float, str]] = {}
        self._ast_cache: dict[str, tuple[float, str]] = {}  # Store source as string
        self._result_cache: dict[str, tuple[float, dict]] = {}
        self.hits = 0
        self.misses = 0
        self._max_size = max_size

    def _evict_if_needed(self) -> None:
        """Evict oldest entries if cache exceeds max size."""
        caches: list[MutableMapping[str, tuple[float, Any]]] = [
            self._file_cache,
            self._ast_cache,
            self._result_cache,
        ]
        total_items = sum(len(c) for c in caches)

        if total_items > self._max_size:
            # Clear 20% of entries
            target_size = int(self._max_size * 0.8)
            for cache in caches:
                if len(cache) > 0:
                    # Sort by mtime and keep oldest 80%
                    sorted_items = sorted(cache.items(), key=lambda x: x[1][0])
                    keep_count = min(len(sorted_items), int(target_size / 3))
                    cache.clear()
                    for key, (mtime, value) in sorted_items[:keep_count]:
                        cache[key] = (mtime, value)

    def get_file(self, path: Path) -> str | None:
        """Get cached file content.

        Args:
            path: Path to file

        Returns:
            File content or None if not cached/expired
        """
        key = str(path)
        try:
            mtime = path.stat().st_mtime
        except OSError:
            self.misses += 1
            return None

        if key in self._file_cache:
            cached_mtime, content = self._file_cache[key]
            if cached_mtime == mtime:
                self.hits += 1
                return content

        self.misses += 1
        try:
            content = path.read_text()
            self._file_cache[key] = (mtime, content)
            self._evict_if_needed()
            return content
        except OSError:
            return None

    def get_ast(self, path: Path) -> ast.AST | None:
        """Get cached AST for Python file.

        Args:
            path: Path to Python file

        Returns:
            AST or None if parsing failed
        """
        key = str(path)
        try:
            mtime = path.stat().st_mtime
        except OSError:
            self.misses += 1
            return None

        if key in self._ast_cache:
            cached_mtime, source = self._ast_cache[key]
            if cached_mtime == mtime:
                self.hits += 1
                try:
                    return ast.parse(source)
                except SyntaxError:
                    return None

        self.misses += 1
        try:
            source = path.read_text()
            tree = ast.parse(source)
            self._ast_cache[key] = (mtime, source)
            self._evict_if_needed()
            return tree
        except (SyntaxError, OSError):
            return None

    def get_evaluation(self, skill_path: Path, dimensions: list[str]) -> dict | None:
        """Get cached evaluation result.

        Args:
            skill_path: Path to skill directory
            dimensions: List of dimension names evaluated

        Returns:
            Cached evaluation dict or None
        """
        key = f"{skill_path}:{','.join(sorted(dimensions))}"
        try:
            # Use directory mtime as a simple proxy
            mtime = skill_path.stat().st_mtime
        except OSError:
            self.misses += 1
            return None

        if key in self._result_cache:
            cached_mtime, result = self._result_cache[key]
            if cached_mtime == mtime:
                self.hits += 1
                return result

        self.misses += 1
        return None

    def set_evaluation(
        self, skill_path: Path, dimensions: list[str], result: dict
    ) -> None:
        """Cache evaluation result.

        Args:
            skill_path: Path to skill directory
            dimensions: List of dimension names evaluated
            result: Evaluation result dict
        """
        key = f"{skill_path}:{','.join(sorted(dimensions))}"
        try:
            mtime = skill_path.stat().st_mtime
            self._result_cache[key] = (mtime, result)
            self._evict_if_needed()
        except OSError:
            pass

    def get_stats(self) -> dict[str, Any]:
        """Get cache statistics.

        Returns:
            Dict with hits, misses, hit_rate, and sizes
        """
        total = self.hits + self.misses
        hit_rate = (self.hits / total * 100) if total > 0 else 0

        return {
            "hits": self.hits,
            "misses": self.misses,
            "hit_rate": f"{hit_rate:.1f}%",
            "file_cache_size": len(self._file_cache),
            "ast_cache_size": len(self._ast_cache),
            "result_cache_size": len(self._result_cache),
        }

    def clear(self) -> None:
        """Clear all caches."""
        self._file_cache.clear()
        self._ast_cache.clear()
        self._result_cache.clear()
        self.hits = 0
        self.misses = 0

    def save_to_disk(self, path: Path) -> bool:
        """Save cache to disk (persistent cache).

        Uses JSON for safe serialization. AST is stored as source code.

        Args:
            path: Path to cache file

        Returns:
            True if saved successfully
        """
        try:
            data = {
                "version": 1,
                "file_cache": self._file_cache,
                "ast_cache": self._ast_cache,
                "result_cache": self._result_cache,
                "hits": self.hits,
                "misses": self.misses,
            }
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps(data))
            return True
        except (OSError, TypeError):
            return False

    def load_from_disk(self, path: Path) -> bool:
        """Load cache from disk.

        Args:
            path: Path to cache file

        Returns:
            True if loaded successfully
        """
        try:
            if path.exists():
                text = path.read_text()
                data = json.loads(text)

                # Validate version
                if data.get("version") != 1:
                    return False

                self._file_cache = data.get("file_cache", {})
                self._ast_cache = data.get("ast_cache", {})
                self._result_cache = data.get("result_cache", {})
                self.hits = data.get("hits", 0)
                self.misses = data.get("misses", 0)
                return True
        except (OSError, json.JSONDecodeError, KeyError, TypeError):
            pass
        return False


# Global cache manager instance
_global_cache: CacheManager | None = None


def get_cache() -> CacheManager:
    """Get the global cache manager instance."""
    global _global_cache
    if _global_cache is None:
        _global_cache = CacheManager()
    return _global_cache


def clear_global_cache() -> None:
    """Clear the global cache."""
    global _global_cache
    if _global_cache is not None:
        _global_cache.clear()


###############################################################################
# RULES SYSTEM (Phase 2 - Task 0010)
###############################################################################


class RuleCategory(Enum):
    """Rule categories."""

    SECURITY = "security"
    CODE_QUALITY = "code_quality"
    STYLE = "style"
    PERFORMANCE = "performance"
    BEST_PRACTICES = "best_practices"
    FILE_SYSTEM = "file_system"


class RuleSeverity(Enum):
    """Rule severity levels."""

    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


class PatternType(Enum):
    """Pattern types."""

    AST = "ast"
    REGEX = "regex"
    AST_GREP = "ast_grep"


@dataclass
class Rule:
    """A rule for code analysis."""

    id: str  # Unique identifier (e.g., "SEC001")
    pattern: str  # AST pattern, regex, or ast-grep pattern
    message: str  # Human-readable description
    category: RuleCategory  # Rule category
    severity: RuleSeverity  # Severity level
    languages: list[str]  # Applicable languages
    pattern_type: PatternType  # Pattern type

    def matches_language(self, language: str) -> bool:
        """Check if rule applies to given language."""
        return language in self.languages or "all" in self.languages


# Built-in rules - security patterns migrated to rule system
BUILTIN_RULES: list[Rule] = [
    # Python security rules
    Rule(
        id="SEC001",
        pattern="eval($$$)",
        message="eval() - code injection risk",
        category=RuleCategory.SECURITY,
        severity=RuleSeverity.ERROR,
        languages=["python"],
        pattern_type=PatternType.AST_GREP,
    ),
    Rule(
        id="SEC002",
        pattern="exec($$$)",
        message="exec() - code injection risk",
        category=RuleCategory.SECURITY,
        severity=RuleSeverity.ERROR,
        languages=["python"],
        pattern_type=PatternType.AST_GREP,
    ),
    Rule(
        id="SEC003",
        pattern="__import__($$$)",
        message="__import__() - dynamic import risk",
        category=RuleCategory.SECURITY,
        severity=RuleSeverity.WARNING,
        languages=["python"],
        pattern_type=PatternType.AST_GREP,
    ),
    Rule(
        id="SEC004",
        pattern="os.system($$$)",
        message="os.system() - command injection risk",
        category=RuleCategory.SECURITY,
        severity=RuleSeverity.ERROR,
        languages=["python"],
        pattern_type=PatternType.AST_GREP,
    ),
    Rule(
        id="SEC005",
        pattern="os.popen($$$)",
        message="os.popen() - command injection risk",
        category=RuleCategory.SECURITY,
        severity=RuleSeverity.ERROR,
        languages=["python"],
        pattern_type=PatternType.AST_GREP,
    ),
    Rule(
        id="SEC006",
        pattern="pickle.loads($$$)",
        message="pickle.loads() - arbitrary code execution risk",
        category=RuleCategory.SECURITY,
        severity=RuleSeverity.ERROR,
        languages=["python"],
        pattern_type=PatternType.AST_GREP,
    ),
    # TypeScript security rules
    Rule(
        id="SEC007",
        pattern="eval($$$)",
        message="eval() - code injection risk",
        category=RuleCategory.SECURITY,
        severity=RuleSeverity.ERROR,
        languages=["typescript", "javascript"],
        pattern_type=PatternType.AST_GREP,
    ),
    Rule(
        id="SEC008",
        pattern="new Function($$$)",
        message="new Function() - code injection risk",
        category=RuleCategory.SECURITY,
        severity=RuleSeverity.ERROR,
        languages=["typescript", "javascript"],
        pattern_type=PatternType.AST_GREP,
    ),
    Rule(
        id="SEC009",
        pattern="innerHTML = $$$",
        message="innerHTML assignment - XSS risk",
        category=RuleCategory.SECURITY,
        severity=RuleSeverity.WARNING,
        languages=["typescript", "javascript"],
        pattern_type=PatternType.AST_GREP,
    ),
    Rule(
        id="SEC010",
        pattern="dangerouslySetInnerHTML",
        message="dangerouslySetInnerHTML - XSS risk",
        category=RuleCategory.SECURITY,
        severity=RuleSeverity.WARNING,
        languages=["typescript", "javascript"],
        pattern_type=PatternType.AST_GREP,
    ),
    # Go security rules
    Rule(
        id="SEC011",
        pattern="exec.Command($$$)",
        message="exec.Command() - command injection risk",
        category=RuleCategory.SECURITY,
        severity=RuleSeverity.WARNING,
        languages=["go"],
        pattern_type=PatternType.AST_GREP,
    ),
    Rule(
        id="SEC012",
        pattern="os.Exec($$$)",
        message="os.Exec() - command injection risk",
        category=RuleCategory.SECURITY,
        severity=RuleSeverity.WARNING,
        languages=["go"],
        pattern_type=PatternType.AST_GREP,
    ),
    # Code quality rules
    Rule(
        id="Q001",
        pattern="except:",
        message="Bare except catches all exceptions including SystemExit",
        category=RuleCategory.CODE_QUALITY,
        severity=RuleSeverity.WARNING,
        languages=["python"],
        pattern_type=PatternType.AST,
    ),
    # File system - dangerous removal operations
    Rule(
        id="SEC013",
        pattern="shutil.rmtree($$$)",
        message="shutil.rmtree() - recursive directory deletion",
        category=RuleCategory.FILE_SYSTEM,
        severity=RuleSeverity.ERROR,
        languages=["python"],
        pattern_type=PatternType.AST_GREP,
    ),
    Rule(
        id="SEC014",
        pattern="os.remove($$$)",
        message="os.remove() - file deletion",
        category=RuleCategory.FILE_SYSTEM,
        severity=RuleSeverity.ERROR,
        languages=["python"],
        pattern_type=PatternType.AST_GREP,
    ),
    Rule(
        id="SEC015",
        pattern="os.unlink($$$)",
        message="os.unlink() - file deletion",
        category=RuleCategory.FILE_SYSTEM,
        severity=RuleSeverity.ERROR,
        languages=["python"],
        pattern_type=PatternType.AST_GREP,
    ),
    Rule(
        id="SEC016",
        pattern="os.rmdir($$$)",
        message="os.rmdir() - directory deletion",
        category=RuleCategory.FILE_SYSTEM,
        severity=RuleSeverity.ERROR,
        languages=["python"],
        pattern_type=PatternType.AST_GREP,
    ),
    Rule(
        id="SEC017",
        pattern="fs.rm($$$)",
        message="fs.rm() - file/directory removal",
        category=RuleCategory.FILE_SYSTEM,
        severity=RuleSeverity.ERROR,
        languages=["typescript", "javascript"],
        pattern_type=PatternType.AST_GREP,
    ),
    Rule(
        id="SEC018",
        pattern="fs.unlink($$$)",
        message="fs.unlink() - file deletion",
        category=RuleCategory.FILE_SYSTEM,
        severity=RuleSeverity.ERROR,
        languages=["typescript", "javascript"],
        pattern_type=PatternType.AST_GREP,
    ),
    Rule(
        id="SEC019",
        pattern="os.RemoveAll($$$)",
        message="os.RemoveAll() - recursive directory removal",
        category=RuleCategory.FILE_SYSTEM,
        severity=RuleSeverity.ERROR,
        languages=["go"],
        pattern_type=PatternType.AST_GREP,
    ),
    # File system - sensitive file access patterns (string-based detection)
    Rule(
        id="SEC020",
        pattern=r'"\.env"',
        message=".env file access - may contain sensitive credentials",
        category=RuleCategory.FILE_SYSTEM,
        severity=RuleSeverity.WARNING,
        languages=["all"],
        pattern_type=PatternType.REGEX,
    ),
    Rule(
        id="SEC021",
        pattern=r"'\.env'",
        message=".env file access - may contain sensitive credentials",
        category=RuleCategory.FILE_SYSTEM,
        severity=RuleSeverity.WARNING,
        languages=["all"],
        pattern_type=PatternType.REGEX,
    ),
    Rule(
        id="SEC022",
        pattern=r'"/\.ssh/"',
        message="SSH directory access - may contain private keys",
        category=RuleCategory.FILE_SYSTEM,
        severity=RuleSeverity.WARNING,
        languages=["all"],
        pattern_type=PatternType.REGEX,
    ),
    Rule(
        id="SEC023",
        pattern=r"'/.ssh/'",
        message="SSH directory access - may contain private keys",
        category=RuleCategory.FILE_SYSTEM,
        severity=RuleSeverity.WARNING,
        languages=["all"],
        pattern_type=PatternType.REGEX,
    ),
    Rule(
        id="SEC024",
        pattern=r'"/\.aws/"',
        message="AWS directory access - may contain credentials",
        category=RuleCategory.FILE_SYSTEM,
        severity=RuleSeverity.WARNING,
        languages=["all"],
        pattern_type=PatternType.REGEX,
    ),
    Rule(
        id="SEC025",
        pattern=r"'/.aws/'",
        message="AWS directory access - may contain credentials",
        category=RuleCategory.FILE_SYSTEM,
        severity=RuleSeverity.WARNING,
        languages=["all"],
        pattern_type=PatternType.REGEX,
    ),
    Rule(
        id="SEC026",
        pattern=r'"/\.config/"',
        message=".config directory access - may contain sensitive configs",
        category=RuleCategory.FILE_SYSTEM,
        severity=RuleSeverity.WARNING,
        languages=["all"],
        pattern_type=PatternType.REGEX,
    ),
    Rule(
        id="SEC027",
        pattern=r"'/.config/'",
        message=".config directory access - may contain sensitive configs",
        category=RuleCategory.FILE_SYSTEM,
        severity=RuleSeverity.WARNING,
        languages=["all"],
        pattern_type=PatternType.REGEX,
    ),
    Rule(
        id="SEC028",
        pattern=r'"/etc/passwd"',
        message="/etc/passwd access - system file",
        category=RuleCategory.FILE_SYSTEM,
        severity=RuleSeverity.ERROR,
        languages=["all"],
        pattern_type=PatternType.REGEX,
    ),
    Rule(
        id="SEC029",
        pattern=r"'/etc/passwd'",
        message="/etc/passwd access - system file",
        category=RuleCategory.FILE_SYSTEM,
        severity=RuleSeverity.ERROR,
        languages=["all"],
        pattern_type=PatternType.REGEX,
    ),
    # Network - dangerous download patterns
    Rule(
        id="SEC030",
        pattern="urllib.request.urlopen($$$)",
        message="urllib.request.urlopen() - downloading content from URL",
        category=RuleCategory.SECURITY,
        severity=RuleSeverity.WARNING,
        languages=["python"],
        pattern_type=PatternType.AST_GREP,
    ),
    Rule(
        id="SEC031",
        pattern="requests.get($$$)",
        message="requests.get() - downloading content from URL",
        category=RuleCategory.SECURITY,
        severity=RuleSeverity.WARNING,
        languages=["python"],
        pattern_type=PatternType.AST_GREP,
    ),
    Rule(
        id="SEC032",
        pattern="httpx.get($$$)",
        message="httpx.get() - downloading content from URL",
        category=RuleCategory.SECURITY,
        severity=RuleSeverity.WARNING,
        languages=["python"],
        pattern_type=PatternType.AST_GREP,
    ),
    Rule(
        id="SEC033",
        pattern="fetch($$$)",
        message="fetch() - downloading content from URL",
        category=RuleCategory.SECURITY,
        severity=RuleSeverity.WARNING,
        languages=["typescript", "javascript"],
        pattern_type=PatternType.AST_GREP,
    ),
    Rule(
        id="SEC034",
        pattern="axios.get($$$)",
        message="axios.get() - downloading content from URL",
        category=RuleCategory.SECURITY,
        severity=RuleSeverity.WARNING,
        languages=["typescript", "javascript"],
        pattern_type=PatternType.AST_GREP,
    ),
    Rule(
        id="SEC035",
        pattern="http.Get($$$)",
        message="http.Get() - downloading content from URL",
        category=RuleCategory.SECURITY,
        severity=RuleSeverity.WARNING,
        languages=["go"],
        pattern_type=PatternType.AST_GREP,
    ),
    # Download + execute patterns (regex-based for string matching)
    Rule(
        id="SEC036",
        pattern=r"curl.*\|.*sh",
        message="curl piped to shell - download and execute",
        category=RuleCategory.SECURITY,
        severity=RuleSeverity.ERROR,
        languages=["all"],
        pattern_type=PatternType.REGEX,
    ),
    Rule(
        id="SEC037",
        pattern=r"wget.*\|.*sh",
        message="wget piped to shell - download and execute",
        category=RuleCategory.SECURITY,
        severity=RuleSeverity.ERROR,
        languages=["all"],
        pattern_type=PatternType.REGEX,
    ),
    Rule(
        id="SEC038",
        pattern=r"curl.*\|.*bash",
        message="curl piped to bash - download and execute",
        category=RuleCategory.SECURITY,
        severity=RuleSeverity.ERROR,
        languages=["all"],
        pattern_type=PatternType.REGEX,
    ),
    Rule(
        id="SEC039",
        pattern=r"wget.*\|.*bash",
        message="wget piped to bash - download and execute",
        category=RuleCategory.SECURITY,
        severity=RuleSeverity.ERROR,
        languages=["all"],
        pattern_type=PatternType.REGEX,
    ),
    # Executing downloaded content
    Rule(
        id="SEC040",
        pattern=r"exec\(.*urlopen",
        message="exec() with urlopen - executing downloaded code",
        category=RuleCategory.SECURITY,
        severity=RuleSeverity.ERROR,
        languages=["python"],
        pattern_type=PatternType.REGEX,
    ),
    Rule(
        id="SEC041",
        pattern=r"exec\(.*requests\.get",
        message="exec() with requests.get - executing downloaded code",
        category=RuleCategory.SECURITY,
        severity=RuleSeverity.ERROR,
        languages=["python"],
        pattern_type=PatternType.REGEX,
    ),
    Rule(
        id="SEC042",
        pattern=r"eval\(.*urlopen",
        message="eval() with urlopen - executing downloaded code",
        category=RuleCategory.SECURITY,
        severity=RuleSeverity.ERROR,
        languages=["python"],
        pattern_type=PatternType.REGEX,
    ),
    Rule(
        id="SEC043",
        pattern=r"eval\(.*fetch\(",
        message="eval() with fetch() - executing downloaded code",
        category=RuleCategory.SECURITY,
        severity=RuleSeverity.ERROR,
        languages=["typescript", "javascript"],
        pattern_type=PatternType.REGEX,
    ),
    # Package installation from external sources
    Rule(
        id="SEC044",
        pattern=r"pip install.*http://",
        message="pip install from HTTP URL - insecure package source",
        category=RuleCategory.SECURITY,
        severity=RuleSeverity.ERROR,
        languages=["all"],
        pattern_type=PatternType.REGEX,
    ),
    Rule(
        id="SEC045",
        pattern=r"pip install.*https://",
        message="pip install from HTTPS URL - external package source",
        category=RuleCategory.SECURITY,
        severity=RuleSeverity.WARNING,
        languages=["all"],
        pattern_type=PatternType.REGEX,
    ),
    Rule(
        id="SEC046",
        pattern=r"subprocess.*pip install.*http",
        message="subprocess pip install from URL - installing external package",
        category=RuleCategory.SECURITY,
        severity=RuleSeverity.WARNING,
        languages=["python"],
        pattern_type=PatternType.REGEX,
    ),
    Rule(
        id="SEC047",
        pattern=r"npm install.*http://",
        message="npm install from HTTP URL - insecure package source",
        category=RuleCategory.SECURITY,
        severity=RuleSeverity.ERROR,
        languages=["all"],
        pattern_type=PatternType.REGEX,
    ),
    Rule(
        id="SEC048",
        pattern=r"npm install.*git+",
        message="npm install from git URL - external package source",
        category=RuleCategory.SECURITY,
        severity=RuleSeverity.WARNING,
        languages=["all"],
        pattern_type=PatternType.REGEX,
    ),
]


def get_rules(
    category: RuleCategory | None = None,
    severity: RuleSeverity | None = None,
    language: str | None = None,
    custom_rules: list[Rule] | None = None,
) -> list[Rule]:
    """
    Get filtered rules based on criteria.

    Args:
        category: Filter by category
        severity: Filter by severity
        language: Filter by language
        custom_rules: Additional custom rules to include

    Returns:
        List of matching rules
    """
    rules = BUILTIN_RULES + (custom_rules or [])

    if category:
        rules = [r for r in rules if r.category == category]
    if severity:
        rules = [r for r in rules if r.severity == severity]
    if language:
        rules = [r for r in rules if r.matches_language(language)]

    return rules


###############################################################################
# AST-GREP INTEGRATION (Phase 2 - Task 0006)
###############################################################################


# Check if ast-grep is available
HAS_AST_GREP = shutil.which("ast-grep") is not None


@dataclass
class AstGrepMatch:
    """Structured ast-grep match result."""

    file: str
    line: int
    column: int
    text: str
    pattern: str


def run_ast_grep(
    pattern: str,
    path: Path,
    language: str = "python",
    timeout: float = 5.0,
) -> list[AstGrepMatch]:
    """
    Run ast-grep with a pattern and return structured matches.

    Uses subprocess.run with list arguments (no shell) for security.

    Args:
        pattern: ast-grep pattern (e.g., 'eval($$$)')
        path: File or directory to search
        language: Language to use (python, typescript, go)
        timeout: Timeout in seconds

    Returns:
        List of AstGrepMatch objects. Empty list on errors.
    """
    if not HAS_AST_GREP:
        return []

    try:
        # Using list arguments, not shell=True, for security
        result = subprocess.run(
            [
                "ast-grep",
                "--pattern",
                pattern,
                "--lang",
                language,
                "--json",
                str(path),
            ],
            capture_output=True,
            text=True,
            timeout=timeout,
        )

        if result.returncode != 0:
            return []

        matches_json = json.loads(result.stdout) if result.stdout.strip() else []
        matches = []

        for match in matches_json:
            matches.append(
                AstGrepMatch(
                    file=match.get("file", ""),
                    line=match.get("range", {}).get("start", {}).get("line", 0),
                    column=match.get("range", {}).get("start", {}).get("column", 0),
                    text=match.get("text", "")[:100],  # Truncate for readability
                    pattern=pattern,
                )
            )

        return matches

    except (subprocess.TimeoutExpired, json.JSONDecodeError, OSError):
        return []


# Security patterns for ast-grep (kept for backward compatibility)
# Deprecated: Use BUILTIN_RULES with Rule dataclass instead
AST_GREP_SECURITY_PATTERNS: dict[str, list[tuple[str, str]]] = {
    "python": [
        ("eval($$$)", "eval() - code injection risk"),
        ("os.system($$$)", "os.system() - command injection risk"),
        ("os.popen($$$)", "os.popen() - command injection risk"),
        ("pickle.loads($$$)", "pickle.loads() - arbitrary code execution risk"),
    ],
    "typescript": [
        ("innerHTML = $$$", "innerHTML assignment - XSS risk"),
        ("dangerouslySetInnerHTML", "dangerouslySetInnerHTML - XSS risk"),
    ],
    "go": [
        ("exec.Command($$$)", "exec.Command() - command injection risk"),
    ],
}


def scan_with_ast_grep(
    path: Path,
    language: str = "python",
) -> list[tuple[str, int, str]]:
    """
    Scan a file/directory for security issues using ast-grep.

    Deprecated: Use evaluate_rules() instead for better filtering.

    Args:
        path: File or directory to scan
        language: Language to scan for

    Returns:
        List of (pattern, line_number, description) tuples.
    """
    findings: list[tuple[str, int, str]] = []

    # Use new rules system
    rules = get_rules(language=language, category=RuleCategory.SECURITY)
    ast_grep_rules = [r for r in rules if r.pattern_type == PatternType.AST_GREP]

    for rule in ast_grep_rules:
        matches = run_ast_grep(rule.pattern, path, language)
        for match in matches:
            findings.append((rule.pattern, match.line, rule.message))

    return findings


def evaluate_rules(
    path: Path,
    language: str = "python",
    category: RuleCategory | None = None,
    severity: RuleSeverity | None = None,
) -> list[tuple[str, int, str, str, RuleSeverity]]:
    """
    Evaluate rules against a file or directory.

    Args:
        path: File or directory to analyze
        language: Language to analyze
        category: Filter by category
        severity: Filter by severity

    Returns:
        List of (rule_id, line_number, pattern, message, severity) tuples.
    """
    findings: list[tuple[str, int, str, str, RuleSeverity]] = []

    # Get applicable rules
    rules = get_rules(category=category, severity=severity, language=language)

    for rule in rules:
        if rule.pattern_type == PatternType.AST_GREP and HAS_AST_GREP:
            matches = run_ast_grep(rule.pattern, path, language)
            for match in matches:
                findings.append(
                    (
                        rule.id,
                        match.line,
                        rule.pattern,
                        rule.message,
                        rule.severity,
                    )
                )
        elif rule.pattern_type == PatternType.AST:
            # For AST-based rules, use existing Python AST analysis
            if language == "python" and path.is_file() and path.suffix == ".py":
                tree = get_ast(path)
                if tree:
                    for node in ast.walk(tree):
                        if isinstance(node, ast.ExceptHandler):
                            if rule.pattern == "except:" and node.type is None:
                                findings.append(
                                    (
                                        rule.id,
                                        node.lineno,
                                        rule.pattern,
                                        rule.message,
                                        rule.severity,
                                    )
                                )
        elif rule.pattern_type == PatternType.REGEX:
            # For regex-based rules, scan file content for string patterns
            if path.is_file():
                try:
                    content = path.read_text()
                    # Compile the pattern (rule.pattern is already a regex string)
                    regex_pattern = re.compile(rule.pattern)
                    # Search line by line to get line numbers
                    for line_num, line in enumerate(content.splitlines(), start=1):
                        if regex_pattern.search(line):
                            findings.append(
                                (
                                    rule.id,
                                    line_num,
                                    rule.pattern,
                                    rule.message,
                                    rule.severity,
                                )
                            )
                except (OSError, re.error):
                    # File not readable or invalid regex pattern
                    pass

    return findings


###############################################################################
# AST-BASED TYPE HINT ANALYSIS (Phase 2 - Task 0007)
###############################################################################


@dataclass
class TypeHintAnalysis:
    """Result of type hint coverage analysis."""

    has_hints: bool
    coverage_pct: float
    annotated_count: int
    total_count: int
    details: list[str] = field(default_factory=list)


def analyze_type_hints(script_path: Path) -> TypeHintAnalysis:
    """
    Analyze type hint coverage using AST.

    This replaces the regex-based detection with accurate AST analysis.
    Detects function annotations, return types, and variable annotations.

    Args:
        script_path: Path to Python script

    Returns:
        TypeHintAnalysis with coverage statistics
    """
    tree = get_ast(script_path)
    if tree is None:
        return TypeHintAnalysis(
            has_hints=False,
            coverage_pct=0.0,
            annotated_count=0,
            total_count=0,
            details=["Could not parse file"],
        )

    annotated = 0
    total = 0
    details: list[str] = []

    for node in ast.walk(tree):
        # Function definitions (including async)
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            total += 1
            has_return = node.returns is not None
            has_params = any(arg.annotation for arg in node.args.args)

            if has_return or has_params:
                annotated += 1
                if has_return and has_params:
                    details.append(f"{node.name}: fully annotated")
                elif has_return:
                    details.append(f"{node.name}: return type only")
                else:
                    details.append(f"{node.name}: parameters only")
            else:
                details.append(f"{node.name}: no annotations")

        # Variable annotations (e.g., x: int = 5)
        if isinstance(node, ast.AnnAssign):
            annotated += 1
            total += 1

    coverage = (annotated / total * 100) if total > 0 else 0.0

    return TypeHintAnalysis(
        has_hints=annotated > 0,
        coverage_pct=round(coverage, 1),
        annotated_count=annotated,
        total_count=total,
        details=details[:10],  # Limit details to first 10
    )


###############################################################################
# AST-BASED EXCEPTION HANDLER ANALYSIS (Phase 2 - Task 0008)
###############################################################################


@dataclass
class ExceptionIssue:
    """An exception handling issue."""

    issue_type: str  # bare_except, broad_except
    line: int
    description: str


def analyze_exception_handlers(script_path: Path) -> list[ExceptionIssue]:
    """
    Analyze exception handlers for anti-patterns using AST.

    Detects:
    - Bare except: (catches everything including SystemExit)
    - Broad except Exception: (catches all exceptions)

    Args:
        script_path: Path to Python script

    Returns:
        List of ExceptionIssue objects
    """
    tree = get_ast(script_path)
    if tree is None:
        return []

    issues: list[ExceptionIssue] = []

    for node in ast.walk(tree):
        if isinstance(node, ast.ExceptHandler):
            if node.type is None:
                # Bare except: (catches everything including SystemExit)
                issues.append(
                    ExceptionIssue(
                        issue_type="bare_except",
                        line=node.lineno,
                        description="Bare except catches all exceptions including SystemExit",
                    )
                )
            elif isinstance(node.type, ast.Name) and node.type.id == "Exception":
                # except Exception: (very broad)
                issues.append(
                    ExceptionIssue(
                        issue_type="broad_except",
                        line=node.lineno,
                        description="Broad 'except Exception' - consider more specific types",
                    )
                )

    return issues


###############################################################################
# MULTI-LANGUAGE SUPPORT (Phase 2 - Task 0009)
###############################################################################


LANGUAGE_EXTENSIONS: dict[str, str] = {
    ".py": "python",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".go": "go",
    ".sh": "bash",
    ".bash": "bash",
}


def get_script_language(path: Path) -> str | None:
    """Detect script language from file extension."""
    return LANGUAGE_EXTENSIONS.get(path.suffix.lower())


def analyze_script(script_path: Path) -> dict[str, Any]:
    """
    Analyze a script file using the appropriate analyzer.

    Routes to Python AST, ast-grep, or other analyzers based on language.

    Args:
        script_path: Path to script file

    Returns:
        Dictionary with analysis results
    """
    language = get_script_language(script_path)

    if language is None:
        return {"language": None, "supported": False}

    result: dict[str, Any] = {
        "language": language,
        "supported": True,
        "security_issues": [],
        "code_quality": {},
    }

    if language == "python":
        # Use Python AST for detailed analysis
        result["security_issues"] = find_dangerous_calls_ast(script_path)
        result["type_hints"] = analyze_type_hints(script_path)
        result["exception_issues"] = analyze_exception_handlers(script_path)

    elif language in ("typescript", "go") and HAS_AST_GREP:
        # Use ast-grep for TypeScript and Go
        result["security_issues"] = scan_with_ast_grep(script_path, language)

    elif language == "bash":
        # Basic bash analysis (can be extended with shellcheck)
        result["note"] = (
            "Bash analysis is basic; consider shellcheck for thorough review"
        )

    return result


###############################################################################
# YAML PARSING
###############################################################################


def parse_simple_yaml(text: str) -> dict[str, Any]:
    """
    Simple YAML frontmatter parser for when PyYAML is not available.
    Handles basic key: value pairs and simple nested structures using indentation.
    """
    result: dict[str, Any] = {}
    stack: list[tuple[int, dict[str, Any]]] = [(-1, result)]  # (indent_level, dict)

    for line in text.split("\n"):
        # Skip empty lines and comments
        if not line.strip() or line.strip().startswith("#"):
            continue

        # Calculate indentation (spaces)
        stripped = line.lstrip()
        indent = len(line) - len(stripped)

        # Pop stack to appropriate level
        while stack and stack[-1][0] >= indent:
            stack.pop()

        # Parse key: value
        if ":" in stripped:
            key, _, value = stripped.partition(":")
            key = key.strip()
            value = value.strip()

            # Strip inline comments (but not in quoted strings)
            if "#" in value and not (value.startswith('"') or value.startswith("'")):
                value = value.split("#")[0].strip()

            # Remove quotes if present
            if (value.startswith('"') and value.endswith('"')) or (
                value.startswith("'") and value.endswith("'")
            ):
                value = value[1:-1]

            # Get current dict from stack
            current_dict = stack[-1][1]

            # Handle different value types
            if not value:  # Empty value, could be a nested dict or list item
                # Check if next line is more indented (nested structure)
                current_dict[key] = {}
                stack.append((indent, current_dict[key]))
            elif value == "[]" or value.startswith("["):
                # List indicator
                current_dict[key] = []
            else:
                # Try to convert to appropriate type
                parsed_value: bool | None | int | float | str
                if value.lower() == "true":
                    parsed_value = True
                elif value.lower() == "false":
                    parsed_value = False
                elif value.lower() == "null" or value == "~":
                    parsed_value = None
                elif value.isdigit() or (value.startswith("-") and value[1:].isdigit()):
                    parsed_value = int(value)
                elif (
                    value.replace(".", "")
                    .replace("-", "")
                    .replace("e", "")
                    .replace("E", "")
                    .replace("+", "")
                    .isdigit()
                ):
                    try:
                        parsed_value = float(value)
                    except ValueError:
                        parsed_value = value  # Keep as string
                else:
                    parsed_value = value

                current_dict[key] = parsed_value

    return result


###############################################################################
# TEMPLATES - Read from assets folder
###############################################################################

# Get the skill root directory (parent of scripts/)
SCRIPT_DIR = Path(__file__).parent.resolve()
SKILL_ROOT = SCRIPT_DIR.parent
ASSETS_DIR = SKILL_ROOT / "assets"


###############################################################################
# CONFIGURATION FILE SUPPORT (Phase 3 - Task 0015)
###############################################################################

# Scoring dimension weights (must sum to 1.0)
DIMENSION_WEIGHTS: dict[str, float] = {
    "frontmatter": 0.10,
    "content": 0.25,
    "security": 0.20,
    "structure": 0.15,
    "efficiency": 0.10,
    "best_practices": 0.10,
    "code_quality": 0.10,
}


@dataclass
class Config:
    """Configuration for skill evaluation.

    Attributes:
        weights: Dimension weights (must sum to 1.0)
        disabled_checks: List of rule IDs to disable
        thresholds: Quality thresholds
        languages: Languages to analyze
    """

    weights: dict[str, float] = field(default_factory=lambda: DIMENSION_WEIGHTS.copy())
    disabled_checks: list[str] = field(default_factory=list)
    thresholds: dict[str, int] = field(default_factory=dict)
    languages: list[str] = field(default_factory=lambda: ["python"])

    def __post_init__(self) -> None:
        """Validate configuration after initialization."""
        # Validate weights sum to approximately 1.0
        total_weight = sum(self.weights.values())
        if abs(total_weight - 1.0) > 0.01:
            raise ValueError(
                f"Weights must sum to 1.0, got {total_weight}. "
                f"Adjust weights in configuration file."
            )

        # Validate disabled_checks is a list of strings
        if not isinstance(self.disabled_checks, list):
            raise ValueError(
                f"disabled_checks must be a list, got {type(self.disabled_checks).__name__}"
            )
        for check in self.disabled_checks:
            if not isinstance(check, str):
                raise ValueError(
                    f"Each disabled check must be a string, got {type(check).__name__}"
                )

        # Validate thresholds is a dict with string keys and int values
        if not isinstance(self.thresholds, dict):
            raise ValueError(
                f"thresholds must be a dict, got {type(self.thresholds).__name__}"
            )
        for key, value in self.thresholds.items():
            if not isinstance(key, str):
                raise ValueError(
                    f"Threshold keys must be strings, got {type(key).__name__}"
                )
            if not isinstance(value, int):
                raise ValueError(
                    f"Threshold values must be integers, got {type(value).__name__}"
                )

        # Validate languages is a list of strings
        if not isinstance(self.languages, list):
            raise ValueError(
                f"languages must be a list, got {type(self.languages).__name__}"
            )
        for lang in self.languages:
            if not isinstance(lang, str):
                raise ValueError(
                    f"Each language must be a string, got {type(lang).__name__}"
                )


CONFIG_FILENAME = ".cc-skills.yaml"


def load_config(skill_path: Path) -> Config:
    """Load configuration from skill directory.

    Configuration loading priority (highest to lowest):
    1. CC_SKILLS_CONFIG environment variable (full path to config file)
    2. .cc-skills.yaml in skill directory
    3. .cc-skills.yaml in skill directory
    4. scripts/.cc-skills.yaml (default fallback)

    Args:
        skill_path: Path to the skill directory

    Returns:
        Config with defaults merged with file contents
    """
    import os

    config = Config()
    config_source = "default"
    config_file = None

    # Priority 1: Check CC_SKILLS_CONFIG environment variable
    env_config = os.environ.get("CC_SKILLS_CONFIG")
    if env_config:
        config_file = Path(env_config)
        if config_file.is_file():
            config_source = "environment variable"
        else:
            print(
                f"WARNING: CC_SKILLS_CONFIG points to non-existent file: {env_config}"
            )
            print("WARNING: Falling back to default configuration")
            config_file = None

    # Priority 2 & 3: Check skill directory for config files
    if not config_file:
        for config_name in [".cc-skills.yaml", ".cc-skills.yaml"]:
            potential_file = skill_path / config_name
            if potential_file.is_file():
                config_file = potential_file
                config_source = f"skill directory ({config_name})"
                break

    # Priority 4: Fall back to default config in scripts/
    if not config_file:
        # Try to load default config from scripts directory
        scripts_dir = Path(__file__).parent
        default_config = scripts_dir / ".cc-skills.yaml"
        if default_config.is_file():
            config_file = default_config
            config_source = "default (scripts/.cc-skills.yaml)"
            print("INFO: Using default configuration from scripts/.cc-skills.yaml")
            print("      To customize, copy this file to your skill directory:")
            print(f"      cp scripts/.cc-skills.yaml {skill_path / '.cc-skills.yaml'}")

    # Load and parse config file
    if config_file and config_file.is_file():
        try:
            # Parse YAML config
            if HAS_YAML and yaml is not None:
                data = yaml.safe_load(config_file.read_text())
            else:
                data = parse_simple_yaml(config_file.read_text())

            if not isinstance(data, dict):
                return config

            # Merge weights
            if "weights" in data and isinstance(data["weights"], dict):
                # Validate keys are valid dimensions
                valid_weights = set(DIMENSION_WEIGHTS.keys())
                for key, value in data["weights"].items():
                    if key in valid_weights and isinstance(value, (int, float)):
                        config.weights[key] = float(value)

            # Merge disabled checks
            if "disabled_checks" in data and isinstance(data["disabled_checks"], list):
                config.disabled_checks = data["disabled_checks"]

            # Merge thresholds
            if "thresholds" in data and isinstance(data["thresholds"], dict):
                config.thresholds.update(data["thresholds"])

            # Merge languages
            if "languages" in data and isinstance(data["languages"], list):
                config.languages = data["languages"]

        except Exception as e:
            # If config parsing fails, use defaults
            print(f"WARNING: Config parsing failed from {config_source}: {e}")
            print("WARNING: Using default configuration")

    return config


def save_config(skill_path: Path, config: Config) -> bool:
    """Save configuration to skill directory.

    Args:
        skill_path: Path to the skill directory
        config: Config to save

    Returns:
        True if saved successfully
    """
    config_file = skill_path / CONFIG_FILENAME

    try:
        data: dict[str, Any] = {
            "weights": config.weights,
            "disabled_checks": config.disabled_checks,
            "thresholds": config.thresholds,
            "languages": config.languages,
        }

        if HAS_YAML and yaml is not None:
            content = yaml.dump(data, default_flow_style=False)
        else:
            # Simple YAML output
            lines: list[str] = []
            lines.append("# cc-skills configuration")
            lines.append("weights:")
            for key, value in data["weights"].items():
                lines.append(f"  {key}: {value}")
            lines.append(f"disabled_checks: {data['disabled_checks']}")
            lines.append(f"thresholds: {data['thresholds']}")
            lines.append(f"languages: {data['languages']}")
            content = "\n".join(lines)

        config_file.write_text(content)
        return True
    except Exception:
        # Log would go here: logging.error(f"Config save failed: {e}")
        return False


###############################################################################
# TEMPLATES - Read from assets folder
###############################################################################


def load_template(filename: str, fallback: str = "") -> str:
    """Load template from assets folder, return fallback if not found."""
    template_path = ASSETS_DIR / filename
    if template_path.exists():
        return template_path.read_text()
    return fallback


def render_template(template: str, **kwargs: str) -> str:
    """Replace {{placeholder}} style variables in template."""
    result = template
    for key, value in kwargs.items():
        result = result.replace(f"{{{{{key}}}}}", value)
    return result


# Fallback templates (used if assets not found)
SKILL_TEMPLATE_FALLBACK = """---
name: {{skill_name}}
description: [TODO: Complete explanation]
---

# {{skill_title}}

## Overview

[TODO: 1-2 sentences]

## Quick Start

[TODO: Add example]

## Workflow

[TODO: Define steps]
"""

EXAMPLE_SCRIPT_FALLBACK = '''#!/usr/bin/env python3
"""{{skill_title}} Utility - Helper script for {{skill_name}} skill."""

from __future__ import annotations
import sys
import argparse

def cmd_hello(args: argparse.Namespace) -> int:
    """Handle hello command."""
    print(f"Hello, {args.name}!")
    return 0

def main() -> int:
    """Main entry point."""
    parser = argparse.ArgumentParser(description="{{skill_title}} Utility")
    subparsers = parser.add_subparsers(dest="command", help="Commands")

    hello_parser = subparsers.add_parser("hello", help="Say hello")
    hello_parser.add_argument("name", help="Name to greet")

    args = parser.parse_args()

    if args.command == "hello":
        return cmd_hello(args)
    parser.print_help()
    return 1

if __name__ == "__main__":
    sys.exit(main())
'''

EXAMPLE_REFERENCE_FALLBACK = """# Reference for {{skill_title}}

Replace with actual reference content or delete if not needed.
"""

EVALUATION_REPORT_TEMPLATE_FALLBACK = """# Skill Quality Evaluation: {{skill_name}}

**Quality:** {{quality_level}}
**Readiness:** {{readiness_status}}
**Path:** `{{skill_path}}`

---

## Phase 1: Structural Validation

{{validation_status}} **{{validation_result}}:** {{validation_message}}

---

## Phase 2: Quality Assessment

### Summary

| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
{{scores_table}}

### Dimension Details

{{dimension_details}}

---

## Overall Score

**Total Score:** {{total_score}}/100

**Grade:** {{grade_letter}} - {{grade_description}}

---

## Recommendations

### Critical (Fix Immediately)

{{recommendations_critical}}

### High Priority

{{recommendations_high}}

### Medium Priority

{{recommendations_medium}}

---

## Positive Aspects

{{strengths}}

---

## Next Steps

1. Fix critical issues first
2. Address high priority items
3. Run `/rd2:skill-refine` for automated improvements
4. Re-evaluate with `/rd2:skill-evaluate` to confirm fixes
"""

###############################################################################
# VALIDATION
###############################################################################

ALLOWED_PROPERTIES = {"name", "description", "version"}


###############################################################################
# PLUGIN ARCHITECTURE (Phase 3 - Task 0013)
###############################################################################


@runtime_checkable
class DimensionEvaluator(Protocol):
    """Protocol for evaluation dimension plugins.

    Dimension evaluators are plugins that score a specific aspect of a skill.
    They must implement this protocol to be discoverable and usable.
    """

    @property
    def name(self) -> str:
        """Dimension name (e.g., 'security', 'code_quality')."""
        ...

    @property
    def weight(self) -> float:
        """Weight in overall score (0.0-1.0)."""
        ...

    def evaluate(self, skill_path: Path) -> "DimensionScore":
        """Evaluate the skill and return a score.

        Args:
            skill_path: Path to the skill directory

        Returns:
            DimensionScore with findings and recommendations
        """
        ...


def discover_evaluators(plugins_dir: Path | None = None) -> list[DimensionEvaluator]:
    """Discover and load evaluator plugins.

    Args:
        plugins_dir: Path to plugins directory. If None, uses default location.

    Returns:
        List of evaluator instances
    """
    evaluators: list[DimensionEvaluator] = []

    if plugins_dir is None:
        # Default to scripts/evaluators/ directory
        plugins_dir = SCRIPT_DIR / "evaluators"

    if not plugins_dir.exists():
        return evaluators

    # Add parent directory to sys.path so evaluators can be imported as a package
    import sys

    parent_dir = str(plugins_dir.parent)
    if parent_dir not in sys.path:
        sys.path.insert(0, parent_dir)

    # Import evaluators package directly
    try:
        import evaluators as evals_module  # type: ignore[import-not-found]

        # Get all classes from the evaluators module
        for item_name in dir(evals_module):
            if item_name.startswith("_"):
                continue
            item = getattr(evals_module, item_name)
            # Check if it's a class (not a module, function, etc.)
            # Classes from evaluators package have __module__ starting with "evaluators."
            if isinstance(item, type) and item.__module__.startswith("evaluators."):
                # Check if class has required properties/methods
                # Properties use @property decorator (not callable), methods are callable
                has_name = hasattr(item, "name")
                has_weight = hasattr(item, "weight")
                has_evaluate = hasattr(item, "evaluate") and callable(
                    getattr(item, "evaluate")
                )
                if has_name and has_weight and has_evaluate:
                    # Instantiate and add to list
                    try:
                        instance = item()
                        evaluators.append(instance)
                    except Exception:
                        # Skip evaluators that fail to instantiate
                        # Log would go here: logging.warning(f"Evaluator instantiation failed: {e}")
                        pass
    except ImportError:
        # If evaluators package can't be imported, return empty list
        # Log would go here: logging.error(f"Failed to import evaluators package: {e}")
        pass

    return evaluators


def register_evaluator(evaluator: DimensionEvaluator) -> None:
    """Register an evaluator plugin programmatically.

    Args:
        evaluator: Evaluator instance to register
    """
    # This function allows programmatic registration of evaluators
    # The actual registration happens in the run_quality_assessment function
    _custom_evaluators.append(evaluator)


# List of custom evaluators registered programmatically
_custom_evaluators: list[DimensionEvaluator] = []


###############################################################################
# EXTENSIBILITY HOOKS (Phase 3 - Task 0018)
###############################################################################


class HookManager:
    """Manage evaluation lifecycle hooks.

    Hooks allow users to extend evaluation behavior without modifying core code.
    Hooks can be registered for specific lifecycle events and can modify results.

    Available hooks:
    - pre_evaluation: Before any analysis begins (receives skill_path)
    - post_dimension: After each dimension evaluation (receives dimension, score)
    - pre_report: Before report formatting (receives evaluation_result)
    - post_report: After report formatting (receives formatted_report)
    """

    def __init__(self) -> None:
        self._hooks: dict[str, list[Callable]] = {
            "pre_evaluation": [],
            "post_dimension": [],
            "pre_report": [],
            "post_report": [],
        }

    def register(self, hook_name: str, callback: Callable) -> None:
        """Register a hook callback.

        Args:
            hook_name: Name of the hook (pre_evaluation, post_dimension, etc.)
            callback: Callable to execute when hook is triggered

        Raises:
            ValueError: If hook_name is not a valid hook
        """
        if hook_name not in self._hooks:
            valid_hooks = ", ".join(self._hooks.keys())
            raise ValueError(
                f"Invalid hook '{hook_name}'. Valid hooks are: {valid_hooks}"
            )
        self._hooks[hook_name].append(callback)

    def trigger(self, hook_name: str, *args: Any, **kwargs: Any) -> list[Any]:
        """Trigger all callbacks for a hook.

        Args:
            hook_name: Name of the hook to trigger
            *args: Positional arguments to pass to callbacks
            **kwargs: Keyword arguments to pass to callbacks

        Returns:
            List of results from all callbacks (empty list if no hooks registered)
        """
        results = []
        for callback in self._hooks.get(hook_name, []):
            try:
                result = callback(*args, **kwargs)
                results.append(result)
            except Exception:
                # Don't let one failed hook break the entire evaluation
                # Log would go here: logging.warning(f"Hook {hook_name} callback failed: {e}")
                pass
        return results

    def clear(self, hook_name: str | None = None) -> None:
        """Clear hooks.

        Args:
            hook_name: Specific hook to clear, or None to clear all hooks
        """
        if hook_name:
            self._hooks[hook_name].clear()
        else:
            for hooks in self._hooks.values():
                hooks.clear()

    def list_hooks(self) -> dict[str, int]:
        """List registered hooks by name.

        Returns:
            Dict mapping hook names to count of registered callbacks
        """
        return {name: len(callbacks) for name, callbacks in self._hooks.items()}


# Global hook manager instance
_hooks: HookManager | None = None


def get_hooks() -> HookManager:
    """Get the global hook manager instance."""
    global _hooks
    if _hooks is None:
        _hooks = HookManager()
    return _hooks


def register_hook(hook_name: str, callback: Callable) -> None:
    """Register a hook callback (convenience function).

    Args:
        hook_name: Name of the hook (pre_evaluation, post_dimension, etc.)
        callback: Callable to execute when hook is triggered
    """
    get_hooks().register(hook_name, callback)


###############################################################################
# VALIDATION
###############################################################################


def parse_frontmatter(content: str) -> tuple[dict[str, Any] | None, str]:
    """
    Parse YAML frontmatter from markdown content.

    Args:
        content: Full markdown content with frontmatter

    Returns:
        Tuple of (frontmatter_dict or None, error_message)
    """
    if not content.startswith("---"):
        return None, "No YAML frontmatter found"

    match = re.match(r"^---\n(.*?)\n---", content, re.DOTALL)
    if not match:
        return None, "Invalid frontmatter format"

    frontmatter_text = match.group(1)

    # Parse YAML frontmatter (use PyYAML if available, fallback to simple parser)
    try:
        if HAS_YAML and yaml is not None:
            frontmatter = yaml.safe_load(frontmatter_text)
        else:
            frontmatter = parse_simple_yaml(frontmatter_text)
        if not isinstance(frontmatter, dict):
            return None, "Frontmatter must be a YAML dictionary"
    except Exception as e:
        return None, f"Invalid YAML: {e}"

    return frontmatter, ""


def validate_skill(skill_path: str | Path) -> tuple[bool, str]:
    """
    Validate a skill directory structure and frontmatter.

    Args:
        skill_path: Path to the skill directory

    Returns:
        Tuple of (is_valid, message)
    """
    skill_path = Path(skill_path).resolve()

    # Check SKILL.md exists
    skill_md = skill_path / "SKILL.md"
    if not skill_md.exists():
        return False, "SKILL.md not found"

    # Read content
    content = skill_md.read_text()
    if not content.startswith("---"):
        return False, "No YAML frontmatter found"

    # Extract frontmatter
    match = re.match(r"^---\n(.*?)\n---", content, re.DOTALL)
    if not match:
        return False, "Invalid frontmatter format"

    frontmatter_text = match.group(1)

    # Parse YAML frontmatter (use PyYAML if available, fallback to simple parser)
    try:
        if HAS_YAML and yaml is not None:
            frontmatter = yaml.safe_load(frontmatter_text)
        else:
            frontmatter = parse_simple_yaml(frontmatter_text)
        if not isinstance(frontmatter, dict):
            return False, "Frontmatter must be a YAML dictionary"
    except Exception as e:
        return False, f"Invalid YAML in frontmatter: {e}"

    # Check for unexpected properties
    unexpected_keys = set(frontmatter.keys()) - ALLOWED_PROPERTIES
    if unexpected_keys:
        return False, (
            f"Unexpected key(s) in frontmatter: {', '.join(sorted(unexpected_keys))}. "
            f"Allowed: {', '.join(sorted(ALLOWED_PROPERTIES))}"
        )

    # Check required fields
    if "name" not in frontmatter:
        return False, "Missing 'name' in frontmatter"
    if "description" not in frontmatter:
        return False, "Missing 'description' in frontmatter"

    # Validate name
    name = frontmatter.get("name", "")
    if not isinstance(name, str):
        return False, f"Name must be a string, got {type(name).__name__}"

    name = name.strip()
    if name:
        # Check naming convention (hyphen-case)
        if not re.match(r"^[a-z0-9-]+$", name):
            return (
                False,
                f"Name '{name}' must be hyphen-case (lowercase, digits, hyphens only)",
            )
        if name.startswith("-") or name.endswith("-") or "--" in name:
            return (
                False,
                f"Name '{name}' cannot start/end with hyphen or contain consecutive hyphens",
            )
        # Check length (max 64 characters)
        if len(name) > 64:
            return False, f"Name too long ({len(name)} chars). Maximum is 64."

    # Validate description
    description = frontmatter.get("description", "")
    if not isinstance(description, str):
        return False, f"Description must be a string, got {type(description).__name__}"

    description = description.strip()
    if description:
        # Check for angle brackets (no XML tags)
        if "<" in description or ">" in description:
            return False, "Description cannot contain angle brackets (< or >)"
        # Check length (max 1024 characters)
        if len(description) > 1024:
            return (
                False,
                f"Description too long ({len(description)} chars). Maximum is 1024.",
            )

    # Check for TODO placeholders
    if "[TODO:" in content:
        return False, "SKILL.md contains unresolved [TODO:] placeholders"

    return True, "Skill is valid!"


###############################################################################
# INITIALIZATION
###############################################################################


def title_case_skill_name(skill_name: str) -> str:
    """Convert hyphenated skill name to Title Case."""
    return " ".join(word.capitalize() for word in skill_name.split("-"))


def init_skill(skill_name: str, path: str, skill_type: str | None = None) -> Path | None:
    """
    Initialize a new skill directory with template SKILL.md.

    Args:
        skill_name: Name of the skill
        path: Path where the skill directory should be created
        skill_type: Type of skill template to use (technique, pattern, reference, or None for generic)

    Returns:
        Path to created skill directory, or None if error
    """
    # Validate skill type
    valid_types = {"technique", "pattern", "reference", None}
    if skill_type is not None and skill_type not in valid_types:
        print(f"Error: Invalid skill type '{skill_type}'. Must be one of: technique, pattern, reference")
        return None

    # Validate skill name format
    if not re.match(r"^[a-z0-9-]+$", skill_name):
        print(
            f"Error: Skill name '{skill_name}' must be hyphen-case (lowercase, digits, hyphens only)"
        )
        return None

    if skill_name.startswith("-") or skill_name.endswith("-") or "--" in skill_name:
        print(
            f"Error: Skill name '{skill_name}' cannot start/end with hyphen or contain consecutive hyphens"
        )
        return None

    if len(skill_name) > 64:
        print(f"Error: Skill name too long ({len(skill_name)} chars). Maximum is 64.")
        return None

    # Determine skill directory path
    skill_dir = Path(path).resolve() / skill_name

    # Check if directory already exists
    if skill_dir.exists():
        print(f"Error: Skill directory already exists: {skill_dir}")
        return None

    # Create skill directory
    try:
        skill_dir.mkdir(parents=True, exist_ok=False)
        print(f"Created skill directory: {skill_dir}")
    except Exception as e:
        print(f"Error creating directory: {e}")
        return None

    # Create SKILL.md from template (load from assets or use fallback)
    skill_title = title_case_skill_name(skill_name)

    # Select template based on skill type
    if skill_type:
        template_name = f"skill-template-{skill_type}.md"
    else:
        template_name = "skill-template.md"

    skill_template = load_template(template_name, SKILL_TEMPLATE_FALLBACK)
    skill_content = render_template(
        skill_template, skill_name=skill_name, skill_title=skill_title
    )

    skill_md_path = skill_dir / "SKILL.md"
    try:
        skill_md_path.write_text(skill_content)
        print("Created SKILL.md")
    except Exception as e:
        print(f"Error creating SKILL.md: {e}")
        return None

    # Create resource directories with examples
    try:
        # scripts/
        scripts_dir = skill_dir / "scripts"
        scripts_dir.mkdir(exist_ok=True)
        example_script_template = load_template(
            "example-script.py", EXAMPLE_SCRIPT_FALLBACK
        )
        example_script = scripts_dir / "example.py"
        example_script.write_text(
            render_template(
                example_script_template, skill_name=skill_name, skill_title=skill_title
            )
        )
        example_script.chmod(0o755)
        print("Created scripts/example.py")

        # references/
        references_dir = skill_dir / "references"
        references_dir.mkdir(exist_ok=True)
        example_ref_template = load_template(
            "example-reference.md", EXAMPLE_REFERENCE_FALLBACK
        )
        example_reference = references_dir / "api_reference.md"
        example_reference.write_text(
            render_template(example_ref_template, skill_title=skill_title)
        )
        print("Created references/api_reference.md")

        # assets/ (empty directory - no example file needed)
        assets_dir = skill_dir / "assets"
        assets_dir.mkdir(exist_ok=True)
        print("Created assets/")

    except Exception as e:
        print(f"Error creating resource directories: {e}")
        return None

    print(f"\nSkill '{skill_name}' initialized at {skill_dir}")
    print("\nNext steps:")
    print("1. Edit SKILL.md - complete TODO items and update description")
    print("2. Customize or delete example files in scripts/, references/, assets/")
    print("3. Run: python3 scripts/skills.py validate <skill-path>")

    return skill_dir


###############################################################################
# PACKAGING
###############################################################################


def package_skill(
    skill_path: str | Path, output_dir: str | Path | None = None
) -> Path | None:
    """
    Package a skill folder into a .skill file.

    Args:
        skill_path: Path to the skill folder
        output_dir: Optional output directory (defaults to current directory)

    Returns:
        Path to the created .skill file, or None if error
    """
    skill_path_resolved = Path(skill_path).resolve()

    # Validate skill folder exists
    if not skill_path_resolved.exists():
        print(f"Error: Skill folder not found: {skill_path_resolved}")
        return None

    if not skill_path_resolved.is_dir():
        print(f"Error: Path is not a directory: {skill_path_resolved}")
        return None

    # Validate SKILL.md exists
    skill_md = skill_path_resolved / "SKILL.md"
    if not skill_md.exists():
        print(f"Error: SKILL.md not found in {skill_path_resolved}")
        return None

    # Run validation before packaging
    print("Validating skill...")
    valid, message = validate_skill(skill_path_resolved)
    if not valid:
        print(f"Validation failed: {message}")
        print("Please fix validation errors before packaging.")
        return None
    print(f"{message}\n")

    # Determine output location
    skill_name = skill_path_resolved.name
    if output_dir:
        output_path = Path(output_dir).resolve()
        output_path.mkdir(parents=True, exist_ok=True)
    else:
        output_path = Path.cwd()

    skill_filename = output_path / f"{skill_name}.skill"

    # Create the .skill file (zip format)
    try:
        with zipfile.ZipFile(skill_filename, "w", zipfile.ZIP_DEFLATED) as zipf:
            for file_path in skill_path_resolved.rglob("*"):
                if file_path.is_file():
                    # Skip __pycache__ and other unwanted files
                    if "__pycache__" in str(file_path) or file_path.suffix == ".pyc":
                        continue
                    arcname = file_path.relative_to(skill_path_resolved.parent)
                    zipf.write(file_path, arcname)
                    print(f"  Added: {arcname}")

        print(f"\nSuccessfully packaged skill to: {skill_filename}")
        return skill_filename

    except Exception as e:
        print(f"Error creating .skill file: {e}")
        return None


###############################################################################
# EVALUATION
###############################################################################

# Re-export evaluate_security for backward compatibility
try:
    from evaluators.security import evaluate_security  # type: ignore[import-not-found]
except ImportError:
    # Fallback for direct script execution
    try:
        from scripts.evaluators.security import (
            evaluate_security,  # type: ignore[import-not-found]
        )
    except ImportError:
        # Define stub if evaluators unavailable
        def evaluate_security(skill_path: Path) -> "DimensionScore":  # type: ignore[misc]
            """Stub when evaluators unavailable."""
            raise ImportError("evaluators.security not available")


class ValidationResult(Enum):
    """Result of structural validation."""

    PASS = "PASS"
    FAIL = "FAIL"


class Grade(Enum):
    """Letter grade for overall quality (0-100 scale)."""

    A = ("A", 90.0, 100.0, "Production ready")
    B = ("B", 70.0, 89.9, "Minor fixes needed")
    C = ("C", 50.0, 69.9, "Moderate revision")
    D = ("D", 30.0, 49.9, "Major revision")
    F = ("F", 0.0, 29.9, "Rewrite needed")

    @classmethod
    def from_score(cls, score: float) -> "Grade":
        """Get grade from numeric score (0-100 scale)."""
        # Handle edge case: perfect score
        if score >= 100.0:
            return cls.A

        # Find appropriate grade with exclusive upper bound
        for grade in cls:
            if grade.min_score <= score < grade.max_score:
                return grade

        # Scores below 0 get F
        return cls.F

    def __init__(
        self, letter: str, min_score: float, max_score: float, description: str
    ):
        self.letter = letter
        self.min_score = min_score
        self.max_score = max_score
        self.description = description


@dataclass
class DimensionScore:
    """Score for a single dimension."""

    name: str
    score: float  # 0-100 scale
    weight: float
    findings: list[str] = field(default_factory=list)
    recommendations: list[str] = field(default_factory=list)

    @property
    def weighted_score(self) -> float:
        """Weighted contribution to total score."""
        return self.score * self.weight


@dataclass
class EvaluationResult:
    """Complete evaluation result."""

    skill_path: Path
    validation_result: ValidationResult | None = None
    validation_message: str = ""
    dimensions: dict[str, DimensionScore] = field(default_factory=dict)
    total_score: float = 0.0
    grade: Grade = Grade.F

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON output."""
        return {
            "skill_path": str(self.skill_path),
            "validation": {
                "result": self.validation_result.value
                if self.validation_result
                else None,
                "message": self.validation_message,
            },
            "dimensions": {
                name: {
                    "score": d.score,
                    "weight": d.weight,
                    "weighted_score": d.weighted_score,
                    "findings": d.findings,
                    "recommendations": d.recommendations,
                }
                for name, d in self.dimensions.items()
            },
            "total_score": round(self.total_score, 2),
            "grade": self.grade.letter,
            "grade_description": self.grade.description,
        }


# Standalone evaluation functions removed - use evaluator modules instead
# See scripts/evaluators/ for the actual evaluation implementations


def run_quality_assessment(skill_path: Path) -> dict[str, DimensionScore]:
    """Run all quality assessment dimensions using evaluator modules.

    This uses the plugin architecture to discover and run all evaluators.
    Custom evaluators registered via register_evaluator() are included.
    """
    # Discover built-in evaluators from scripts/evaluators/
    evaluators = discover_evaluators()

    # Add any custom evaluators registered programmatically
    evaluators.extend(_custom_evaluators)

    # Run all evaluators
    dimensions: dict[str, DimensionScore] = {}
    for evaluator in evaluators:
        try:
            result = evaluator.evaluate(skill_path)
            dimensions[result.name] = result
        except Exception as e:
            # If evaluator fails, create a failure result
            dimensions[evaluator.name] = DimensionScore(
                name=evaluator.name,
                score=0.0,
                weight=evaluator.weight,
                findings=[f"Evaluator failed: {e}"],
                recommendations=[],
            )

    return dimensions


def calculate_total_score(dimensions: dict[str, DimensionScore]) -> float:
    """Calculate total weighted score."""
    total = sum(d.weighted_score for d in dimensions.values())
    return round(total, 2)


###############################################################################
# REPORT FORMATTERS (Phase 3 - Task 0014)
###############################################################################


class ReportFormatter:
    """Base class for report formatters."""

    def format(self, result: EvaluationResult) -> str:
        """Format evaluation result. Override in subclasses."""
        raise NotImplementedError


class TextFormatter(ReportFormatter):
    """Plain text report formatter (default)."""

    def format(self, result: EvaluationResult) -> str:
        """Format as plain text with box drawing."""
        lines = []
        lines.append("=" * 70)
        lines.append("SKILL EVALUATION REPORT")
        lines.append(f"Path: {result.skill_path}")
        lines.append("=" * 70)
        lines.append("")

        # Phase 1: Structural Validation
        lines.append("## Phase 1: Structural Validation")
        lines.append("-" * 70)
        if result.validation_result == ValidationResult.PASS:
            lines.append(f"✓ PASSED: {result.validation_message}")
        else:
            lines.append(f"✗ FAILED: {result.validation_message}")
        lines.append("")

        # Phase 2: Quality Assessment
        lines.append("## Phase 2: Quality Assessment")
        lines.append("-" * 70)
        lines.append("")

        for dim_name, dim_score in result.dimensions.items():
            lines.append(f"### {dim_name.replace('_', ' ').title()}")
            lines.append(
                f"Score: {dim_score.score:.1f}/100 | "
                f"Weight: {dim_score.weight * 100:.0f}% | "
                f"Weighted: {dim_score.weighted_score:.2f}"
            )
            lines.append("")

            if dim_score.findings:
                lines.append("Findings:")
                for finding in dim_score.findings:
                    lines.append(f"  • {finding}")
                lines.append("")

            if dim_score.recommendations:
                lines.append("Recommendations:")
                for rec in dim_score.recommendations:
                    lines.append(f"  → {rec}")
                lines.append("")

        # Overall Score
        lines.append("## Overall Score")
        lines.append("-" * 70)
        lines.append(f"Total Score: {result.total_score:.2f}/100")
        lines.append(f"Grade: {result.grade.letter} - {result.grade.description}")
        lines.append("")

        # Grade scale reference
        lines.append("### Grading Scale")
        lines.append("A (90.0-100.0) | Production ready")
        lines.append("B (70.0-89.9)  | Minor fixes needed")
        lines.append("C (50.0-69.9)  | Moderate revision")
        lines.append("D (30.0-49.9)  | Major revision")
        lines.append("F (0.0-29.9)  | Rewrite needed")
        lines.append("")

        lines.append("=" * 70)

        return "\n".join(lines)


class JsonFormatter(ReportFormatter):
    """JSON report formatter."""

    def format(self, result: EvaluationResult) -> str:
        """Format as JSON."""
        return json.dumps(result.to_dict(), indent=2)


class MarkdownFormatter(ReportFormatter):
    """Markdown report formatter using evaluation-report-template.md."""

    def format(self, result: EvaluationResult) -> str:
        """Format as GitHub-flavored Markdown using template."""
        template = load_template(
            "evaluation-report-template.md",
            EVALUATION_REPORT_TEMPLATE_FALLBACK,
        )

        # Build dynamic sections
        scores_table = self._build_scores_table(result)
        dimension_details = self._build_dimension_details(result)
        recommendations = self._categorize_recommendations(result)
        strengths = self._extract_strengths(result)

        # Determine quality level based on grade
        quality_levels = {
            "A": "Excellent",
            "B": "Good",
            "C": "Fair",
            "D": "Needs Work",
            "F": "Poor",
        }
        quality_level = quality_levels.get(result.grade.letter, "Unknown")

        # Validation status emoji
        validation_status = (
            "✅" if result.validation_result == ValidationResult.PASS else "❌"
        )
        validation_result_text = (
            "PASSED" if result.validation_result == ValidationResult.PASS else "FAILED"
        )

        return render_template(
            template,
            skill_name=result.skill_path.name,
            skill_path=str(result.skill_path),
            quality_level=quality_level,
            readiness_status=result.grade.description,
            validation_status=validation_status,
            validation_result=validation_result_text,
            validation_message=result.validation_message,
            scores_table=scores_table,
            dimension_details=dimension_details,
            total_score=f"{result.total_score:.2f}",
            grade_letter=result.grade.letter,
            grade_description=result.grade.description,
            recommendations_critical=recommendations["critical"],
            recommendations_high=recommendations["high"],
            recommendations_medium=recommendations["medium"],
            strengths=strengths,
        )

    def _build_scores_table(self, result: EvaluationResult) -> str:
        """Build markdown table rows for dimension scores."""
        rows = []
        for dim_name, dim_score in result.dimensions.items():
            name = dim_name.replace("_", " ").title()
            rows.append(
                f"| {name} | {dim_score.score:.1f}/100 | "
                f"{dim_score.weight * 100:.0f}% | {dim_score.weighted_score:.2f} |"
            )
        return "\n".join(rows)

    def _build_dimension_details(self, result: EvaluationResult) -> str:
        """Build detailed findings/recommendations per dimension."""
        sections = []
        for dim_name, dim_score in result.dimensions.items():
            name = dim_name.replace("_", " ").title()
            lines = [f"#### {name}", ""]

            if dim_score.findings:
                lines.append("**Findings:**")
                for finding in dim_score.findings:
                    lines.append(f"- {finding}")
                lines.append("")

            if dim_score.recommendations:
                lines.append("**Recommendations:**")
                for rec in dim_score.recommendations:
                    lines.append(f"- {rec}")
                lines.append("")

            if not dim_score.findings and not dim_score.recommendations:
                lines.append("*No issues found.*")
                lines.append("")

            sections.append("\n".join(lines))
        return "\n".join(sections)

    def _categorize_recommendations(
        self, result: EvaluationResult
    ) -> dict[str, str]:
        """Categorize recommendations by priority based on dimension scores."""
        critical = []
        high = []
        medium = []

        for dim_name, dim_score in result.dimensions.items():
            name = dim_name.replace("_", " ").title()
            for rec in dim_score.recommendations:
                # Categorize based on dimension score
                if dim_score.score < 30:
                    critical.append(f"- **{name}:** {rec}")
                elif dim_score.score < 70:
                    high.append(f"- **{name}:** {rec}")
                else:
                    medium.append(f"- **{name}:** {rec}")

        return {
            "critical": "\n".join(critical) if critical else "*None*",
            "high": "\n".join(high) if high else "*None*",
            "medium": "\n".join(medium) if medium else "*None*",
        }

    def _extract_strengths(self, result: EvaluationResult) -> str:
        """Extract positive findings as strengths."""
        strengths = []
        for dim_name, dim_score in result.dimensions.items():
            name = dim_name.replace("_", " ").title()
            # High-scoring dimensions are strengths
            if dim_score.score >= 80:
                strengths.append(f"- **{name}** ({dim_score.score:.0f}/100): Well implemented")
            # Also include positive findings
            for finding in dim_score.findings:
                if any(
                    word in finding.lower()
                    for word in ["good", "excellent", "proper", "correct", "well"]
                ):
                    strengths.append(f"- {finding}")

        return "\n".join(strengths) if strengths else "*No significant strengths identified.*"


# Formatter registry
FORMATTERS: dict[str, type[ReportFormatter]] = {
    "text": TextFormatter,
    "json": JsonFormatter,
    "markdown": MarkdownFormatter,
    "md": MarkdownFormatter,  # Alias
}


def get_formatter(name: str) -> ReportFormatter:
    """Get formatter by name."""
    formatter_class = FORMATTERS.get(name.lower(), TextFormatter)
    return formatter_class()


def format_report(result: EvaluationResult) -> str:
    """Format evaluation result as human-readable report."""
    lines = []
    lines.append("=" * 70)
    lines.append("SKILL EVALUATION REPORT")
    lines.append(f"Path: {result.skill_path}")
    lines.append("=" * 70)
    lines.append("")

    # Phase 1: Structural Validation
    lines.append("## Phase 1: Structural Validation")
    lines.append("-" * 70)
    if result.validation_result == ValidationResult.PASS:
        lines.append(f"✓ PASSED: {result.validation_message}")
    else:
        lines.append(f"✗ FAILED: {result.validation_message}")
    lines.append("")

    # Phase 2: Quality Assessment
    lines.append("## Phase 2: Quality Assessment")
    lines.append("-" * 70)
    lines.append("")

    for dim_name, dim_score in result.dimensions.items():
        lines.append(f"### {dim_name.replace('_', ' ').title()}")
        lines.append(
            f"Score: {dim_score.score:.1f}/100 | Weight: {dim_score.weight * 100:.0f}% | "
            f"Weighted: {dim_score.weighted_score:.2f}"
        )
        lines.append("")

        if dim_score.findings:
            lines.append("Findings:")
            for finding in dim_score.findings:
                lines.append(f"  • {finding}")
            lines.append("")

        if dim_score.recommendations:
            lines.append("Recommendations:")
            for rec in dim_score.recommendations:
                lines.append(f"  → {rec}")
            lines.append("")

    # Overall Score
    lines.append("## Overall Score")
    lines.append("-" * 70)
    lines.append(f"Total Score: {result.total_score:.2f}/100")
    lines.append(f"Grade: {result.grade.letter} - {result.grade.description}")
    lines.append("")

    # Grade scale reference
    lines.append("### Grading Scale")
    lines.append("A (90.0-100.0) | Production ready")
    lines.append("B (70.0-89.9)  | Minor fixes needed")
    lines.append("C (50.0-69.9)  | Moderate revision")
    lines.append("D (30.0-49.9)  | Major revision")
    lines.append("F (0.0-29.9)  | Rewrite needed")
    lines.append("")

    lines.append("=" * 70)

    return "\n".join(lines)


# Import backward compatibility wrapper functions for tests


###############################################################################
# CLI INTERFACE
###############################################################################


def cmd_init(args):
    """Handle init command."""
    if not args.skill_name or not args.path:
        print("Usage: python3 scripts/skills.py init <skill-name> --path <path> [--type <type>]")
        print("\nTypes: technique, pattern, reference (default: generic)")
        print("\nExample:")
        print("  python3 scripts/skills.py init my-skill --path ./skills")
        print("  python3 scripts/skills.py init my-skill --path ./skills --type technique")
        return 1

    skill_type = getattr(args, "type", None)
    print(f"Initializing skill: {args.skill_name}")
    print(f"Location: {args.path}")
    if skill_type:
        print(f"Type: {skill_type}")
    print()

    result = init_skill(args.skill_name, args.path, skill_type)
    return 0 if result else 1


def cmd_validate(args):
    """Handle validate command."""
    if not args.skill_path:
        print("Usage: python3 scripts/skills.py validate <skill-path>")
        print("\nExample:")
        print("  python3 scripts/skills.py validate ./skills/my-skill")
        return 1

    print(f"Validating skill: {args.skill_path}\n")

    valid, message = validate_skill(args.skill_path)
    print(message)
    return 0 if valid else 1


def cmd_package(args):
    """Handle package command."""
    if not args.skill_path:
        print("Usage: python3 scripts/skills.py package <skill-path> [output-dir]")
        print("\nExample:")
        print("  python3 scripts/skills.py package ./skills/my-skill")
        print("  python3 scripts/skills.py package ./skills/my-skill ./dist")
        return 1

    print(f"Packaging skill: {args.skill_path}")
    if args.output_dir:
        print(f"Output directory: {args.output_dir}")
    print()

    result = package_skill(args.skill_path, args.output_dir)
    return 0 if result else 1


def cmd_evaluate(args):
    """Handle evaluate command - two-phase skill evaluation."""
    if not args.skill_path:
        print(
            "Usage: python3 scripts/skills.py evaluate <skill-path> [--format text|json|markdown]"
        )
        print("\nExample:")
        print("  python3 scripts/skills.py evaluate ./skills/my-skill")
        print("  python3 scripts/skills.py evaluate ./skills/my-skill --format json")
        print(
            "  python3 scripts/skills.py evaluate ./skills/my-skill --format markdown"
        )
        return 1

    skill_path = Path(args.skill_path).resolve()

    if not skill_path.exists():
        print(f"Error: Path not found: {skill_path}", file=sys.stderr)
        return 1

    if not skill_path.is_dir():
        print(f"Error: Not a directory: {skill_path}", file=sys.stderr)
        return 1

    # Determine output format (--json is shorthand for --format json)
    output_format = "json" if args.json else getattr(args, "format", "text") or "text"

    # Initialize result
    result = EvaluationResult(skill_path=skill_path)

    # Phase 1: Structural Validation
    print("Phase 1: Running structural validation...", file=sys.stderr)
    valid, message = validate_skill(skill_path)
    result.validation_result = ValidationResult.PASS if valid else ValidationResult.FAIL
    result.validation_message = message

    if valid:
        print(f"  ✓ PASSED: {message}", file=sys.stderr)
    else:
        print(f"  ✗ FAILED: {message}", file=sys.stderr)
        print(
            "\nNote: Structural validation failed. Quality assessment will still run.",
            file=sys.stderr,
        )
    print(file=sys.stderr)

    # Phase 2: Quality Assessment
    print("Phase 2: Running quality assessment...", file=sys.stderr)
    dimensions = run_quality_assessment(skill_path)
    result.dimensions = dimensions
    result.total_score = calculate_total_score(dimensions)
    result.grade = Grade.from_score(result.total_score)

    for dim_name, dim_score in dimensions.items():
        print(f"  {dim_name}: {dim_score.score:.1f}/100", file=sys.stderr)

    print(f"\n  Total Score: {result.total_score:.2f}/100", file=sys.stderr)
    print(
        f"  Grade: {result.grade.letter} - {result.grade.description}", file=sys.stderr
    )
    print(file=sys.stderr)

    # Output using formatter
    formatter = get_formatter(output_format)
    print(formatter.format(result))

    # Return exit code based on validation
    return 0 if valid else 1


def check_dependencies() -> None:
    """Check external dependencies and display warnings if missing.

    External dependencies:
    - PyYAML: Optional, for parsing YAML config files (has built-in fallback)
    - ast-grep: Optional, for structural code search in TS/JS/Go (Python AST used as fallback)
    """
    import sys

    missing_optional = []

    # Check PyYAML
    if not HAS_YAML:
        missing_optional.append("PyYAML (pip install pyyaml)")

    # Check ast-grep
    if not HAS_AST_GREP:
        missing_optional.append(
            "ast-grep (brew install ast-grep or visit https://ast-grep.github.io/)"
        )

    if missing_optional:
        print(
            "NOTE: The following optional dependencies are not installed:",
            file=sys.stderr,
        )
        for dep in missing_optional:
            print(f"  - {dep}", file=sys.stderr)
        print("", file=sys.stderr)
        print("The script will continue with reduced functionality:", file=sys.stderr)
        if not HAS_YAML:
            print(
                "  - YAML parsing will use built-in simple parser (slower, less featureful)",
                file=sys.stderr,
            )
        if not HAS_AST_GREP:
            print(
                "  - TS/JS/Go security scanning will use basic patterns (Python unaffected)",
                file=sys.stderr,
            )
        print("", file=sys.stderr)
        print(
            "For full functionality, install the optional dependencies.",
            file=sys.stderr,
        )
        print("", file=sys.stderr)


def main():
    """Main entry point with argument parsing."""
    # Check dependencies at startup
    check_dependencies()

    parser = argparse.ArgumentParser(
        description="Skill Management Utility - Initialize, validate, evaluate, and package skills.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Commands:
  init      Initialize a new skill directory structure
  validate  Validate a skill directory structure
  evaluate  Evaluate skill quality (structural + quality assessment)
  package   Package a skill for distribution

Examples:
  python3 scripts/skills.py init my-skill --path ./skills
  python3 scripts/skills.py validate ./skills/my-skill
  python3 scripts/skills.py evaluate ./skills/my-skill
  python3 scripts/skills.py evaluate ./skills/my-skill --json
  python3 scripts/skills.py package ./skills/my-skill ./dist
""",
    )

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # init command
    init_parser = subparsers.add_parser(
        "init", help="Initialize a new skill directory structure"
    )
    init_parser.add_argument("skill_name", nargs="?", help="Name of the skill")
    init_parser.add_argument("--path", help="Directory to create skill in")
    init_parser.add_argument(
        "--type",
        choices=["technique", "pattern", "reference"],
        help="Skill type: technique (steps), pattern (mental model), reference (API docs)",
    )

    # validate command
    validate_parser = subparsers.add_parser(
        "validate", help="Validate a skill directory structure"
    )
    validate_parser.add_argument(
        "skill_path", nargs="?", help="Path to skill directory"
    )

    # package command
    package_parser = subparsers.add_parser(
        "package", help="Package a skill for distribution"
    )
    package_parser.add_argument("skill_path", nargs="?", help="Path to skill directory")
    package_parser.add_argument(
        "output_dir", nargs="?", help="Output directory (optional)"
    )

    # evaluate command
    evaluate_parser = subparsers.add_parser(
        "evaluate", help="Evaluate skill quality (structural + quality assessment)"
    )
    evaluate_parser.add_argument(
        "skill_path", nargs="?", help="Path to skill directory"
    )
    evaluate_parser.add_argument(
        "--json",
        action="store_true",
        help="Output results as JSON (shorthand for --format json)",
    )
    evaluate_parser.add_argument(
        "--format",
        "-f",
        choices=["text", "json", "markdown", "md"],
        default="text",
        help="Output format (default: text)",
    )

    args = parser.parse_args()

    if args.command == "init":
        sys.exit(cmd_init(args))
    elif args.command == "validate":
        sys.exit(cmd_validate(args))
    elif args.command == "evaluate":
        sys.exit(cmd_evaluate(args))
    elif args.command == "package":
        sys.exit(cmd_package(args))
    else:
        parser.print_help()
        sys.exit(1)


###############################################################################

if __name__ == "__main__":
    main()
