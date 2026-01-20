---
wbs: "0025"
phase: 4
title: Create Migration Guide
status: Done
priority: Medium
dependencies: ["0024"]
---

# Task 0025: Create Migration Guide

## Background

Users upgrading from previous versions need guidance on adapting to changes.

## Requirements

### Functional Requirements
1. Document upgrade steps
2. Explain behavioral changes
3. Provide before/after examples
4. Address common migration issues
5. Include rollback instructions

### Success Criteria
- [ ] Clear upgrade path documented
- [ ] Behavioral changes explained
- [ ] Examples provided
- [ ] FAQ section included
- [ ] Rollback possible

## Solution

### Migration Guide Content

```markdown
# Migration Guide: cc-skills2 2.0

## Overview

Version 2.0 introduces AST-based security analysis, eliminating false positives
when skills document security patterns.

## Upgrade Steps

1. Update to version 2.0
2. Re-run evaluation on existing skills
3. Review any new findings (these are likely real issues)
4. Update .cc-skills2.yaml if using custom configuration

## Behavioral Changes

### Security Scanner

**Before (1.x)**: String matching detected pattern mentions in documentation
**After (2.0)**: AST analysis detects only actual code execution

Example:
- Documentation saying "Never use dangerous patterns" no longer triggers
- Actual dangerous code in Python blocks still triggers

### Findings Format

**Before**: `SECURITY: Use of dangerous pattern`
**After**: `SECURITY in file.py:42: Actual pattern call`

### Score Changes

Skills that previously had false positive security findings will now score higher.
Expected improvement: Security score 4.0 -> 9.5+ for well-documented skills.

## FAQ

**Q: My security score went up significantly. Is this expected?**
A: Yes, if your skill documented security patterns without actually using them.

**Q: My security score went down. What happened?**
A: The new analyzer may have found real issues that were previously masked.

**Q: Can I use the old behavior?**
A: No, the string-based matching has been removed. The new AST-based
analysis is more accurate and should not produce false positives.

## Rollback

If you need to rollback:
1. Pin to version 1.x in your dependencies
2. Note that version 1.x will not receive updates
```

## References

- **New file:** `/Users/robin/projects/cc-agents/plugins/rd2/skills/cc-skills2/docs/MIGRATION.md`

## Deliverables

- [ ] MIGRATION.md created
- [ ] Upgrade steps documented
- [ ] Behavioral changes explained
- [ ] FAQ included
- [ ] Rollback documented
