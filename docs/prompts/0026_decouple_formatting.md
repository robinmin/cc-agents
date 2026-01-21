---
wbs: "0014"
phase: 3
title: Decouple Validation from Formatting
status: Done
priority: Medium
dependencies: ["0013"]
---

# Task 0014: Decouple Validation from Formatting

## Background

Currently `format_report()` is tightly coupled with `EvaluationResult`. This makes it hard to:
1. Add new output formats (HTML, Markdown, JSON schema)
2. Customize report formatting
3. Test formatting independently

## Requirements

### Functional Requirements
1. Separate data model from presentation
2. Create formatter interface
3. Implement text, JSON, and markdown formatters
4. Allow custom formatters
5. Maintain backward compatibility

### Success Criteria
- [ ] EvaluationResult is pure data
- [ ] Formatters are separate classes
- [ ] At least 3 formatters (text, JSON, markdown)
- [ ] Easy to add new formatters
- [ ] Existing CLI output unchanged

## Solution

### Formatter Interface

```python
from abc import ABC, abstractmethod

class ReportFormatter(ABC):
    """Abstract base for report formatters."""

    @abstractmethod
    def format(self, result: EvaluationResult) -> str:
        """Format evaluation result."""
        ...

class TextFormatter(ReportFormatter):
    """Plain text report formatter."""
    def format(self, result: EvaluationResult) -> str:
        # Current format_report() logic
        ...

class JsonFormatter(ReportFormatter):
    """JSON report formatter."""
    def format(self, result: EvaluationResult) -> str:
        return json.dumps(result.to_dict(), indent=2)

class MarkdownFormatter(ReportFormatter):
    """Markdown report formatter."""
    def format(self, result: EvaluationResult) -> str:
        # Generate markdown tables
        ...
```

## References

- **File to modify:** `/Users/robin/projects/cc-agents/plugins/rd2/skills/cc-skills/scripts/skills.py`
- **Lines to refactor:** 1121-1180 (format_report function)

## Deliverables

- [ ] ReportFormatter abstract base class
- [ ] TextFormatter (current behavior)
- [ ] JsonFormatter
- [ ] MarkdownFormatter
- [ ] CLI updated to use formatters
