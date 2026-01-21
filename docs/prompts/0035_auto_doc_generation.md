---
wbs: "0023"
phase: 4
title: Add Automated Doc Generation
status: Done
priority: Low
dependencies: ["0017"]
---

# Task 0023: Add Automated Doc Generation

## Background

Generate documentation from code to ensure docs stay in sync with implementation.

## Requirements

### Functional Requirements
1. Extract docstrings from evaluator functions
2. Generate markdown from Rule definitions
3. Generate pattern reference from AST patterns
4. CLI command to regenerate docs
5. CI check for doc freshness

### Success Criteria
- [ ] Doc generation script works
- [ ] Generated docs accurate
- [ ] CLI command available
- [ ] Freshness check possible
- [ ] Integration with existing docs

## Solution

### Doc Generation Script

```python
# scripts/generate_docs.py

def generate_evaluator_docs() -> str:
    """Generate docs from evaluator docstrings."""
    docs = []
    for evaluator in [
        evaluate_frontmatter,
        evaluate_content,
        evaluate_security,
        # ...
    ]:
        docs.append(f"## {evaluator.__name__}")
        docs.append(evaluator.__doc__ or "No documentation")
        docs.append("")
    return "\n".join(docs)

def generate_rule_docs() -> str:
    """Generate docs from rule definitions."""
    docs = ["# Security Rules", ""]
    for rule in BUILTIN_RULES:
        docs.append(f"## {rule.id}: {rule.message}")
        docs.append(f"- Pattern: `{rule.pattern}`")
        docs.append(f"- Severity: {rule.severity.value}")
        docs.append(f"- Languages: {', '.join(rule.languages)}")
        docs.append("")
    return "\n".join(docs)
```

### CLI Integration

```bash
python3 scripts/skills.py docs generate
python3 scripts/skills.py docs check  # Verify docs are fresh
```

## References

- **New file:** `/Users/robin/projects/cc-agents/plugins/rd2/skills/cc-skills/scripts/generate_docs.py`

## Deliverables

- [ ] Doc generation script
- [ ] CLI commands for doc generation
- [ ] Generated docs integrated
- [ ] Freshness check command
