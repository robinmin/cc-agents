# Changelog

All notable changes to cc-skills2 are documented here.

## [2.0.0] - 2025-01-20

### Breaking Changes

- Security scanner now uses AST analysis (produces different, more accurate results)
- Security findings now include file:line format
- Skills that previously had false positives will now score higher

### Added

- **AST-based security analysis** for Python scripts
  - Parses actual code, not strings or comments
  - Distinguishes code from documentation
  - Provides exact line numbers for findings
- **Markdown-aware analysis** for SKILL.md
  - Extracts Python code blocks
  - Analyzes only executable code
- **Multi-language support** (Python, TypeScript, Go, Bash)
  - ast-grep integration for structural code search
  - Language detection by file extension
- **Type hint analysis** using AST
  - Reports coverage percentage
  - Identifies missing annotations
- **Exception handler analysis** using AST
  - Detects bare except clauses
  - Detects overly broad except Exception
- **AST caching** for improved performance
  - LRU cache with mtime-based invalidation
  - Significant speedup on repeated evaluations
- **Multiple output formatters**
  - Text (default): Human-readable report
  - JSON: Machine-readable for CI/CD
  - Markdown: Documentation-ready tables
- **Comprehensive test suite**
  - 22 tests covering all major functionality
  - AST analyzer tests
  - Markdown analyzer tests
  - Self-evaluation tests

### Changed

- Security scanner no longer triggers on documentation text
- Type hint detection moved from regex to AST (more accurate)
- Exception detection moved from string matching to AST
- Improved finding messages with context

### Fixed

- False positives when skill documents security patterns
- False positives when evaluating cc-skills2 itself
- Inaccurate line numbers in findings
- Security score now reflects actual code issues

### Removed

- String-based pattern matching for security (replaced by AST)
- Regex-based type hint detection (replaced by AST)

---

## [1.0.0] - Initial Release

Initial release with string-based security scanning.
