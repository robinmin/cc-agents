# Skill Templates

Starter templates for creating new Claude Code Agent Skills.

## Template 1: Basic Skill (Minimal Structure)

Use for straightforward tasks where Claude already has most knowledge.

```markdown
---
name: skill-name
description: [What this does]. Use when [activation condition].
---

# Skill Title

Brief introduction to what this skill does.

## Workflow

1. **[Step 1 Title]**
   - [Action detail]
   - [Action detail]

2. **[Step 2 Title]**
   - [Action detail]
   - [Action detail]

3. **[Step 3 Title]**
   - [Action detail]
   - [Action detail]

## Quick Reference

**Key Points:**
- [Important consideration 1]
- [Important consideration 2]
- [Important consideration 3]

## Example

**Input:**
```
[Example input]
```

**Output:**
```
[Example output]
```

## Validation

- [ ] [Check 1]
- [ ] [Check 2]
- [ ] [Check 3]
```

## Template 2: Complete Skill (Full Structure)

Use for complex tasks requiring detailed guidance and supporting files.

### Directory Structure
```
skill-name/
├── SKILL.md
├── REFERENCE.md
├── EXAMPLES.md
└── scripts/
    └── utility.py
```

### SKILL.md
```markdown
---
name: skill-name
description: [What this does]. Use when [activation condition].
---

# Skill Title

## Purpose

[1-2 sentence purpose statement]

## Workflow

1. **[Preparation Phase]**
   - [Action 1]
   - [Action 2]
   - Validation: [What to check]

2. **[Execution Phase]**
   - [Action 1]
   - [Action 2]
   - Validation: [What to check]

3. **[Verification Phase]**
   - [Action 1]
   - [Action 2]
   - Validation: [What to check]

## Quick Reference

**When to Use:**
- [Scenario 1]
- [Scenario 2]
- [Scenario 3]

**Prerequisites:**
- [Requirement 1]
- [Requirement 2]

**Output Format:**
```
[Expected output structure]
```

## Quality Checklist

- [ ] [Quality criterion 1]
- [ ] [Quality criterion 2]
- [ ] [Quality criterion 3]

## Common Issues

**Issue:** [Problem description]
**Solution:** [How to resolve]

**Issue:** [Problem description]
**Solution:** [How to resolve]

## See Also

- REFERENCE.md for detailed specifications
- EXAMPLES.md for complete examples
- `scripts/utility.py` for automation
```

### REFERENCE.md
```markdown
# [Skill Name] Reference

Detailed technical documentation.

## Specifications

### [Topic 1]

[Detailed information]

**Examples:**
```
[Code or configuration examples]
```

### [Topic 2]

[Detailed information]

**Examples:**
```
[Code or configuration examples]
```

## Advanced Usage

### [Advanced Topic 1]

[Detailed guidance]

### [Advanced Topic 2]

[Detailed guidance]

## Troubleshooting

### [Problem Category]

**Symptom:** [What the issue looks like]
**Cause:** [Why it happens]
**Solution:** [How to fix it]

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| option1 | string | "default" | [What it does] |
| option2 | integer | 10 | [What it does] |
```

### EXAMPLES.md
```markdown
# [Skill Name] Examples

## Example 1: [Scenario Name]

**Context:** [When you'd use this]

**Input:**
```
[Complete input example]
```

**Process:**
1. [Step with specific values]
2. [Step with specific values]
3. [Step with specific values]

**Output:**
```
[Complete output example]
```

## Example 2: [Another Scenario]

**Context:** [When you'd use this]

**Input:**
```
[Complete input example]
```

**Process:**
1. [Step with specific values]
2. [Step with specific values]

**Output:**
```
[Complete output example]
```

## Anti-Patterns

### Bad Example: [What Not to Do]

```
[Example of incorrect approach]
```

**Why This Is Wrong:**
[Explanation]

**Better Approach:**
```
[Correct approach]
```
```

### scripts/utility.py
```python
#!/usr/bin/env python3
"""
Utility script for [skill-name].

This script [description of what it does and why].
"""

import sys
import os
from pathlib import Path


# Configuration constants (justified)
MAX_RETRIES = 3  # Based on typical API timeout patterns
TIMEOUT_SECONDS = 30  # Balance between reliability and performance


def main():
    """Main execution function."""
    try:
        # Validate environment
        if not validate_environment():
            sys.exit(1)

        # Execute main logic
        result = execute_task()

        # Output results
        print_results(result)

    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        print("Please check inputs and try again.", file=sys.stderr)
        sys.exit(1)


def validate_environment():
    """
    Validate that required environment is available.

    Returns:
        bool: True if environment is valid, False otherwise
    """
    # Check for required files
    required_files = ["config.json"]
    for file in required_files:
        if not Path(file).exists():
            print(f"ERROR: Required file not found: {file}")
            return False

    return True


def execute_task():
    """
    Execute the main task.

    Returns:
        dict: Task results
    """
    # Implementation here
    pass


def print_results(result):
    """
    Print results in a clear format.

    Args:
        result: Task results to display
    """
    print(f"Task completed successfully:")
    print(f"  Results: {result}")


if __name__ == "__main__":
    main()
```

## Template 3: Workflow Skill (Process-Oriented)

Use for multi-stage processes with validation loops.

```markdown
---
name: workflow-skill
description: [Process description]. Use when [condition].
---

# Workflow Skill Title

## Overview

[Brief description of the workflow]

## Prerequisites

Before starting:
- [ ] [Prerequisite 1]
- [ ] [Prerequisite 2]
- [ ] [Prerequisite 3]

## Stage 1: [Stage Name]

### Steps

1. [Action 1]
2. [Action 2]
3. [Action 3]

### Validation

Check that:
- [ ] [Validation criterion 1]
- [ ] [Validation criterion 2]

If validation fails:
1. [Recovery action 1]
2. [Recovery action 2]
3. Return to stage start

### Output

[What this stage produces]

## Stage 2: [Stage Name]

### Steps

1. [Action 1]
2. [Action 2]

### Validation

Check that:
- [ ] [Validation criterion 1]
- [ ] [Validation criterion 2]

If validation fails:
1. [Recovery action 1]
2. Return to stage start or previous stage

### Output

[What this stage produces]

## Stage 3: [Final Stage]

### Steps

1. [Final action 1]
2. [Final action 2]

### Validation

Final checks:
- [ ] [Overall quality check 1]
- [ ] [Overall quality check 2]
- [ ] [Overall quality check 3]

### Output

[Final deliverable]

## Complete Example

**Starting State:**
```
[Initial state description]
```

**Stage 1 → Stage 2 → Stage 3:**
```
[Step-by-step progression]
```

**Final State:**
```
[End state description]
```

## Troubleshooting

**Stage 1 Issues:**
- Problem: [Issue]
  - Solution: [Fix]

**Stage 2 Issues:**
- Problem: [Issue]
  - Solution: [Fix]

**Stage 3 Issues:**
- Problem: [Issue]
  - Solution: [Fix]
```

## Template 4: Analysis Skill (Investigation-Oriented)

Use for tasks requiring analysis, investigation, or review.

```markdown
---
name: analysis-skill
description: Analyzes [subject] for [purpose]. Use when [condition].
---

# Analysis Skill Title

## Analysis Framework

### 1. Initial Assessment

**Gather Information:**
- [Data point 1]
- [Data point 2]
- [Data point 3]

**Classify Scope:**
- Size: [Small/Medium/Large]
- Complexity: [Low/Medium/High]
- Risk: [Low/Medium/High]

### 2. Detailed Analysis

**Category 1: [Analysis Area]**
- [ ] Check [aspect 1]
- [ ] Check [aspect 2]
- [ ] Check [aspect 3]

**Category 2: [Analysis Area]**
- [ ] Check [aspect 1]
- [ ] Check [aspect 2]
- [ ] Check [aspect 3]

**Category 3: [Analysis Area]**
- [ ] Check [aspect 1]
- [ ] Check [aspect 2]
- [ ] Check [aspect 3]

### 3. Generate Findings

For each issue found:
- **Location:** [Where the issue exists]
- **Severity:** [Critical/High/Medium/Low]
- **Description:** [What the issue is]
- **Impact:** [Why it matters]
- **Recommendation:** [How to address it]

## Report Format

```markdown
# Analysis Report: [Subject]

**Date:** [Analysis date]
**Scope:** [What was analyzed]

## Executive Summary

[1-2 paragraph overview]

## Findings

### Critical Issues
- [Issue 1 with location reference]
- [Issue 2 with location reference]

### High Priority
- [Issue 1]
- [Issue 2]

### Medium Priority
- [Issue 1]
- [Issue 2]

### Low Priority / Suggestions
- [Suggestion 1]
- [Suggestion 2]

## Recommendations

1. **Immediate Actions:**
   - [Action 1]
   - [Action 2]

2. **Short-term Improvements:**
   - [Action 1]
   - [Action 2]

3. **Long-term Enhancements:**
   - [Action 1]
   - [Action 2]

## Positive Observations

- [Good pattern 1]
- [Good pattern 2]

## Conclusion

[Summary and overall assessment]
```

## Analysis Checklist

- [ ] All relevant aspects examined
- [ ] Findings documented with locations
- [ ] Severity levels assigned
- [ ] Recommendations actionable
- [ ] Report clear and concise
```

## Quick Selection Guide

Choose the right template:

| Template | Use When | Complexity |
|----------|----------|------------|
| Basic | Simple, focused task | Low |
| Complete | Complex domain requiring detailed guidance | High |
| Workflow | Multi-stage process with validation | Medium |
| Analysis | Investigation or review task | Medium |

## Customization Tips

1. **Start Simple:** Begin with Basic template, add complexity as needed
2. **Add References:** Create REFERENCE.md when SKILL.md exceeds 400 lines
3. **Add Examples:** Create EXAMPLES.md when concrete cases help understanding
4. **Add Scripts:** Create scripts/ when automation reduces errors or saves tokens
5. **Test Early:** Validate with fresh Claude instance after initial draft

---

## Template 5: Context-Optimized Skill (2025 Pattern)

For skills handling large contexts or external data via just-in-time retrieval.

### Directory Structure

```
large-data-analysis/
├── SKILL.md              # Core workflow (~3k tokens)
├── PATTERNS.md           # Analysis patterns (JIT)
└── scripts/
    └── extract_stats.py  # Data processing script
```

### SKILL.md

```markdown
---
name: large-data-analysis
description: Analyzes datasets larger than context window via just-in-time retrieval and targeted extraction. Use when working with CSV/JSON files >1MB or database queries returning >1000 rows.
---

# Large Data Analysis Skill

Analyzes large datasets without loading everything into context.

## Context Strategy

This skill uses just-in-time retrieval to handle data larger than context window:
1. Get metadata (file size, row count, schema)
2. Create targeted analysis plan
3. Extract relevant subsets only
4. Process results without loading full dataset

## Workflow

### Phase 1: Discovery (Lightweight)

Get file information without loading content:

```bash
# Get metadata
wc -l data.csv
head -5 data.csv
ls -lh data.csv
```

Document:
- Total row count
- File size
- Column names
- Data types (inferred)

### Phase 2: Targeted Extraction

Extract only relevant data:

```bash
# Filter to specific subset
awk '$3 > 100' data.csv > filtered.csv
head -100 filtered.csv  # Sample for context

# Or extract specific columns
cut -d',' -f1,2,3 data.csv > columns.csv
```

### Phase 3: Analysis

1. Load sample into context (100-200 rows)
2. Analyze patterns
3. Generate targeted queries for full dataset

```bash
# Process full dataset via script
python scripts/analyze.py --input filtered.csv --output results.json
```

### Phase 4: Results Processing

```bash
# Load only summary (not full results)
cat results.json | jq '.summary'
```

## Memory Pattern

For long-running analysis:

```bash
# Create persistent notes
echo "# Analysis Progress" > ANALYSIS_NOTES.md
echo "Rows analyzed: $(wc -l < filtered.csv)" >> ANALYSIS_NOTES.md
echo "Key findings: ..." >> ANALYSIS_NOTES.md

# After context reset
cat ANALYSIS_NOTES.md  # Resume from checkpoint
```

## MCP Integration

For database queries:

```bash
# Use MCP for large datasets
mcp-query postgres --sql "SELECT COUNT(*), category FROM products GROUP BY category"

# Process results locally (token-efficient)
```

See BEST_PRACTICES.md for MCP patterns.
```

### scripts/extract_stats.py

```python
#!/usr/bin/env python3
"""
Extract statistics from large CSV files without loading into memory.

Usage:
    python extract_stats.py --input data.csv --output stats.json
"""

import argparse
import json
import csv
from pathlib import Path

MAX_ROWS_SAMPLE = 100  # Only sample first N rows for context

def analyze_metadata(filepath):
    """Get file metadata without loading full content."""
    path = Path(filepath)

    # Count lines
    with open(path) as f:
        row_count = sum(1 for _ in f) - 1  # Subtract header

    # Get file size
    size_mb = path.stat().st_size / (1024 * 1024)

    return {
        "row_count": row_count,
        "size_mb": round(size_mb, 2),
        "filename": path.name
    }

def sample_columns(filepath, n=MAX_ROWS_SAMPLE):
    """Sample first N rows to get column structure."""
    with open(filepath) as f:
        reader = csv.DictReader(f)
        rows = []
        for i, row in enumerate(reader):
            if i >= n:
                break
            rows.append(row)

    return {
        "columns": list(rows[0].keys()) if rows else [],
        "sample_rows": rows,
        "sample_count": len(rows)
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Input CSV file")
    parser.add_argument("--output", required=True, help="Output JSON file")
    args = parser.parse_args()

    # Get metadata
    metadata = analyze_metadata(args.input)

    # Sample columns
    sample = sample_columns(args.input)

    # Combine results
    result = {
        "metadata": metadata,
        "structure": sample
    }

    # Write output
    with open(args.output, "w") as f:
        json.dump(result, f, indent=2)

    print(f"Analysis complete: {args.output}")
    print(f"Rows: {metadata['row_count']}, Size: {metadata['size_mb']} MB")

if __name__ == "__main__":
    main()
```

---

## Template 6: MCP-Integrated Skill (2025 Pattern)

For skills that orchestrate MCP servers for external operations.

### Directory Structure

```
database-analyst/
├── SKILL.md              # Orchestration logic
└── queries/              # Query templates
    └── common_queries.sql
```

### SKILL.md

```markdown
---
name: postgres-analyst
description: Analyzes PostgreSQL databases via MCP server with targeted queries and local processing. Use when analyzing database schemas, optimizing queries, or investigating data issues.
---

# PostgreSQL Analyst Skill

Analyzes PostgreSQL databases using MCP for data access and local tools for processing.

## Prerequisites

- MCP server configured: `@modelcontextprotocol/server-postgres`
- Database connection string in environment
- Access to database schemas

## MCP Orchestration Pattern

This skill uses MCP for external data access while Claude provides analysis:

```
┌─────────────────┐
│     Skill       │  ← Orchestrates workflow
│  (This File)    │  ← Provides domain knowledge
└────────┬────────┘
         │
         │ Queries via MCP
         ▼
┌─────────────────┐
│  MCP Server     │  ← Provides database access
│   (postgres)    │  ← Returns results efficiently
└─────────────────┘
```

## Workflow

### Step 1: Schema Discovery

```bash
# Get table list
mcp-query postgres --sql "
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position
"

# Store schema reference
mcp-query postgres --sql "..." > SCHEMA.md
```

### Step 2: Targeted Querying

For large tables, query in batches:

```bash
# Get row count first
mcp-query postgres --sql "SELECT COUNT(*) FROM users"

# If large (>10k rows), sample
mcp-query postgres --sql "SELECT * FROM users TABLESAMPLE SYSTEM(1)"

# Or filter to relevant subset
mcp-query postgres --sql "SELECT * FROM users WHERE created_at > '2024-01-01'"
```

### Step 3: Local Processing

```bash
# Store query results
mcp-query postgres --sql "SELECT * FROM active_users" > users.json

# Process locally (token-efficient)
jq '.[] | select(.login_count > 100)' users.json > power_users.json

# Generate summary
jq '[length, group_by(.department) | map({department: .[0].department, count: length})]' users.json
```

### Step 4: Analysis

Load only summary into context:

```bash
# Get aggregated results
cat summary.json

# Full dataset available if needed
cat users.json  # Only if specific questions require it
```

## Query Templates

Use queries in `queries/` directory:

```bash
# Schema analysis
mcp-query postgres --sql "$(cat queries/schema_analysis.sql)"

# Performance check
mcp-query postgres --sql "$(cat queries/slow_queries.sql)"

# Data validation
mcp-query postgres --sql "$(cat queries/data_validation.sql)"
```

## Common Patterns

| Task | MCP Command | Local Processing |
|------|-------------|------------------|
| Row count | `SELECT COUNT(*) FROM table` | None needed |
| Schema info | `SELECT * FROM information_schema...` | Store as reference |
| Large dataset | `SELECT * FROM table LIMIT 1000` | Filter/aggregate locally |
| Aggregation | `SELECT category, COUNT(*) FROM table GROUP BY category` | Store summary |
| Validation | `SELECT * FROM table WHERE condition` | jq/python processing |

## Memory Pattern

For complex analysis:

```bash
# Create analysis notebook
echo "# Database Analysis: $(date)" > ANALYSIS.md
echo "## Tables Analyzed" >> ANALYSIS.md
echo "- users: 1.2M rows" >> ANALYSIS.md
echo "- orders: 3.4M rows" >> ANALYSIS.md

# Add findings as discovered
echo "## Key Findings" >> ANALYSIS.md
echo "- Duplicate users detected: 15,000" >> ANALYSIS.md
```
```

---

## Template 7: Evaluation-First Skill (2025 Pattern)

For skills developed using evaluation-first methodology.

### Development Workflow

```
┌─────────────────────────────────────────────────────────────┐
│  1. Baseline Testing                                        │
│     Run representative tasks WITHOUT skill                   │
│     Document: What Claude misses, where it struggles         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  2. Targeted Content Writing                                 │
│     Write ONLY content addressing documented gaps            │
│     Use canonical examples (3-5 representative cases)         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  3. Iterative Testing                                        │
│     Re-test with same scenarios                              │
│     Document improvements per iteration                      │
│     Stop when baseline achieved                              │
└─────────────────────────────────────────────────────────────┘
```

### SKILL.md Template

```markdown
---
name: example-skill
description: Addresses specific gaps in Claude's [domain] knowledge. Use when [specific condition that triggers skill].
---

# Example Skill (Evaluation-First Development)

## Documented Gaps (Baseline Testing)

### Gap 1: [Specific Pattern Claude Misses]

**Test Scenario:**
```python
[Code example Claude failed on]
```

**Claude's Baseline Behavior:**
- Missed: [what Claude got wrong]
- Correct: [what it should have caught]

**Content Added:**
```markdown
[Specific guidance addressing this gap]
```

### Gap 2: [Another Pattern]

[Repeat for each documented gap]

## Canonical Examples

Instead of exhaustive lists, use representative examples:

```
Example 1: [Pattern A]
Example 2: [Pattern B]
Example 3: [Pattern C]

Claude will generalize from these.
```

## Workflow

1. [Step 1]
2. [Step 2]
3. [Step 3]

## Evaluation Results

| Iteration | Test Pass Rate | Notes |
|-----------|----------------|-------|
| 0 (baseline) | 3/10 (30%) | Initial gap analysis |
| 1 (first draft) | 7/10 (70%) | Added patterns for Gap 1-2 |
| 2 (refined) | 10/10 (100%) | ✓ Ship |

## See Also

- CONCEPTS.md for evaluation-first principles
- EVALUATION.md for complete framework
```

---

## 2025 Template Selection Guide

| Template | Use When | Key Features | Complexity |
|----------|----------|--------------|------------|
| **Basic** | Simple, focused task | Minimal structure, direct instructions | Low |
| **Complete** | Complex domain | Full structure with REFERENCE/EXAMPLES | High |
| **Workflow** | Multi-stage process | Validation loops, checkpoints | Medium |
| **Analysis** | Investigation/review | Structured reporting format | Medium |
| **Context-Optimized** | Large datasets | JIT retrieval, external state | Medium |
| **MCP-Integrated** | External data sources | MCP orchestration pattern | Medium |
| **Evaluation-First** | Production skills | Iterative testing framework | High |

---

## Migration: Old → New Templates

### Before 2025 (Old Pattern)

```markdown
---
name: code-helper
description: Helps with code
---

# Code Helper

## What is Code Review?

[500 words of generic explanation Claude already knows]

## All Possible Code Issues

[List of 50+ potential issues]

## How to Fix Each

[Detailed explanation for every issue]
```

**Problems:**
- Vague name/description
- Content Claude already knows
- Exhaustive (wasteful)
- No progressive disclosure

### 2025 (New Pattern)

```markdown
---
name: python-security-audit
description: Identifies SQL injection, XSS, and CSRF vulnerabilities in Python/Django code. Use when reviewing Python pull requests or preparing code for production security.
---

# Python Security Audit

## SQL Injection Patterns Claude Misses

### Pattern 1: F-String Queries
[Specific example]

### Pattern 2: ORM Raw Methods
[Specific example]

## XSS Patterns Claude Misses

### Pattern 1: innerHTML Assignment
[Specific example]

See PATTERNS.md for comprehensive catalog.
```

**Improvements:**
- Specific, keyword-rich name/description
- Addresses observed gaps only
- Canonical examples (3-5 patterns)
- Progressive disclosure with PATTERNS.md

---

## Quick Template Generator

Use this quick reference to select your template:

```bash
# Answer these questions:

1. What does your skill do?
   └─→ Determines description content

2. When should it trigger?
   └─→ Add keywords to description

3. What does Claude currently miss?
   └─→ Evaluation-first: document gaps first

4. How much content is needed?
   └─→ < 3k tokens: Basic template
   └─→ 3-5k tokens: Complete template
   └─→ > 5k tokens: Use progressive disclosure

5. Does it need external data?
   └─→ Yes: MCP-Integrated or Context-Optimized template

6. Is it multi-stage or needs validation?
   └─→ Yes: Workflow template

7. Is it for analysis/review?
   └─→ Yes: Analysis template
```

---

**See also:**
- GETTING_STARTED.md for hands-on tutorials using these templates
- EVALUATION.md for evaluation-first development
- CONCEPTS.md for understanding the principles behind templates
- REFERENCE.md for technical specifications
