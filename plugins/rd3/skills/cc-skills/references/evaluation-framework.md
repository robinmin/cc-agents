# Evaluation Framework

This document describes the evaluation framework for rd3:cc-skills.

## Evaluation Scopes

### Basic Scope

Default scope for quick validation. Checks:

1. **Frontmatter Validation**
   - `name` field present and valid
   - `description` field present, descriptive
   - No unknown fields (platform-specific)

2. **Structure Validation**
   - SKILL.md exists
   - Optional directories: scripts/, references/, assets/
   - agents/openai.yaml valid (if present)

3. **Best Practices Check**
   - SKILL.md under 500 lines
   - Progressive disclosure followed
   - Clear section structure

4. **Platform Compatibility**
   - Platform-specific features documented
   - Companion files valid for target platforms

### Full Scope

Comprehensive evaluation including all basic checks plus

1. **Test Case Execution**
   - Run sample prompts with skill
   - Compare with baseline (no skill)
   - Measure success rate

2. **Quality Scoring**
   - Trigger design effectiveness
   - Instruction clarity
   - Code quality (scripts/)
   - Documentation completeness (references/)
   - Platform compatibility score

3. **Performance Metrics**
   - Token efficiency
   - Execution time
   - Success rate across platforms

## Evaluation Dimensions

| Dimension | Weight | Criteria |
|-----------|--------|----------|
| **Frontmatter Quality** | 15% | Complete, valid, descriptive |
| **Structure Compliance** | 10% | Follows directory conventions |
| **Content Clarity** | 20% | Clear instructions, examples |
| **Trigger Design** | 15% | Effective activation |
| **Platform Compatibility** | 15% | Works across platforms |
| **Resource Quality** | 10% | Scripts work, docs are useful |
| **Best Practices** | 15% | Follows skill conventions |

## Scoring Guide

### Score Ranges

- **90-100%**: Excellent - Ready for production
- **75-89%**: Good - Minor improvements recommended
- **60-74%**: Acceptable - Several improvements needed
- **Below 60%**: Needs Work - Significant improvements required

### Passing Threshold

- **Basic scope**: All checks pass
- **Full scope**: Score >= 70%

## Evaluation Report Format

```json
{
  "skillPath": "./skills/my-skill",
  "skillName": "my-skill",
  "scope": "full",
  "overallScore": 82,
  "maxScore": 100,
  "percentage": 82,
  "dimensions": [
    {
      "name": "Frontmatter Quality",
      "weight": 15,
      "score": 14,
      "maxScore": 15,
      "findings": ["Complete frontmatter", "Good description"],
      "recommendations": []
    }
  ],
  "timestamp": "2026-03-14T00:00:00Z",
  "passed": true
}
```

## Platform-Specific Evaluation

### Claude Code
- Validates `!`cmd`` syntax
- Checks `$ARGUMENTS` usage
- Verifies `context: fork` compatibility
- Validates `hooks:` configuration

### Codex
- Validates `agents/openai.yaml` format
- Checks UI metadata completeness
- Verifies frontmatter strictness (no unknown fields)

### OpenClaw
- Extracts `metadata.openclaw` validation
- Checks emoji configuration
- Validates requires specifications

### OpenCode
- Checks permission configurations
- Validates config-level skill hints
- Verifies skill invocation patterns

### Antigravity
- Validates Gemini CLI compatibility
- Checks for Gemini-specific extensions
- Verifies standard format compliance

## Iterative Improvement

1. Run evaluation with `--scope full`
2. Review findings and recommendations
3. Use `/rd3:skill-refine` to apply improvements
4. Re-run evaluation to verify improvements
5. Repeat until score >= 80%

## Integration with CI/CD

```yaml
# .github/workflows/skill-validation.yml
name: Skill Validation
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate Skills
        run: |
          bun plugins/rd3/skills/cc-skills/scripts/validate.ts \
            --path skills/ \
            --scope basic \
            --platform all
```
