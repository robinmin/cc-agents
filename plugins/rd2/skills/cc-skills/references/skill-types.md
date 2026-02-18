# Skill Types Guide

This guide explains the three skill types in Claude Code and when to use each.

## Overview

Different skills serve different purposes. Choose the type that best fits your use case.

## Technique

Concrete method with steps to follow.

**Characteristics:**
- Clear sequential steps
- Code examples
- Common mistakes to avoid

**Examples:**
- condition-based-waiting
- root-cause-tracing
- defensive-programming

**Best for:**
- Repeatable processes
- Debugging methodologies
- Step-by-step workflows

**Structure:**
```
## When to Use
[Specific scenarios]

## Steps
1. [Step 1]
2. [Step 2]

## Examples
[Working code examples]

## Common Mistakes
- [Mistake 1]
- [Mistake 2]
```

## Pattern

Way of thinking about problems.

**Characteristics:**
- Principles and guidelines
- When to apply the pattern
- When NOT to apply

**Examples:**
- flatten-with-flags
- test-invariants
- information-hiding

**Best for:**
- Mental models
- Architectural decisions
- Problem-solving approaches

**Structure:**
```
## The Pattern
[Core concept explanation]

## When to Apply
[Use cases]

## When NOT to Apply
[Anti-patterns]

## Examples
[Conceptual examples]
```

## Reference

API docs, syntax guides, tool documentation.

**Characteristics:**
- Tables and structured data
- Searchable content
- Quick lookup format

**Examples:**
- office-docs
- API reference
- Command reference

**Best for:**
- External tool integration
- Domain knowledge
- Syntax lookup

**Structure:**
```
## Overview
[Brief description]

## Common Usage
[Typical patterns]

## Reference Table
| Field | Type | Description |
|-------|------|-------------|
| ... | ... | ... |

## Examples
[Usage examples]
```

## Quick Reference Table

| Type      | Description              | Structure Focus              |
| --------- | ------------------------ | ---------------------------- |
| Technique | Concrete steps to follow | Steps, code, common mistakes |
| Pattern   | Way of thinking          | Principles, when/when-not    |
| Reference | API/syntax docs          | Tables, searchable, lookup   |

## Choosing the Right Type

Consider these questions:

1. **Does it have steps?** → Technique
2. **Is it a mental model?** → Pattern
3. **Is it lookup data?** → Reference

Sometimes skills combine types:
- Technique + Reference (steps + lookup tables)
- Pattern + Reference (principles + examples)

## See Also

- [Skill Anatomy](anatomy.md) - Complete structure guide
- [Best Practices](best-practices.md) - Comprehensive guidance
- [Writing Style](writing-style.md) - Imperative form guidelines
