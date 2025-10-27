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
