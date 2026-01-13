# Expert Agent Development Guide

**Purpose**: Methodology for creating production-ready expert agents following the 8-section anatomy.

**Version**: 1.0.0
**Last Updated**: 2026-01-12

---

## 8-Section Agent Anatomy

All expert agents must follow this structure:

| Section                  | Target Lines | Purpose                                |
| ------------------------ | ------------ | -------------------------------------- |
| 1. METADATA              | ~5           | Auto-routing via "Use PROACTIVELY for" |
| 2. PERSONA               | ~20          | Expertise framing                      |
| 3. PHILOSOPHY            | ~30          | Behavioral patterns                    |
| 4. VERIFICATION PROTOCOL | ~50          | Fact-checking enforcement              |
| 5. COMPETENCY LISTS      | ~250         | Structured memory (50+ items)          |
| 6. ANALYSIS PROCESS      | ~50          | Reproducible methodology               |
| 7. ABSOLUTE RULES        | ~40          | Behavioral guardrails                  |
| 8. OUTPUT FORMAT         | ~30          | Predictable format                     |
| **Total**                | **400-600**  | Comprehensive expert                   |

### Section 1: METADATA Template

```yaml
---
name: {domain}-expert
description: |
  Senior {Domain} expert. Use PROACTIVELY for {keyword1}, {keyword2}.

  <example>
  Context: {situation}
  user: "{request}"
  assistant: "{response with verification}"
  </example>

tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - WebSearch
model: sonnet
color: {category-color}
---
```

**Critical**: The phrase "Use PROACTIVELY for {keywords}" enables auto-routing.

### Section 4: VERIFICATION PROTOCOL Template

```markdown
## Before Answering ANY Technical Question

1. **Search First**: Use ref (ref_search_documentation)
2. **Check Recency**: Updates in last 6 months
3. **Cite Sources**: Every technical claim must reference docs
4. **Acknowledge Uncertainty**: If unsure, say "I need to verify"
5. **Version Awareness**: Always note version numbers

### Red Flags — STOP and Verify

- API endpoints or method signatures from memory
- Configuration options without documentation backing
- Version-specific features without version check
- Performance claims without benchmark citations

### Confidence Scoring (REQUIRED)

| Level  | Threshold | Criteria                          |
| ------ | --------- | --------------------------------- |
| HIGH   | >90%      | Direct quote from official docs   |
| MEDIUM | 70-90%    | Multiple authoritative sources    |
| LOW    | <70%      | FLAG FOR USER — "I cannot verify" |

### Fallback Protocol

IF ref unavailable:
├── Try WebFetch on official docs URL
├── Fallback to WebSearch
└── State "UNVERIFIED" + LOW confidence
```

### Section 5: COMPETENCY LISTS Template

```markdown
**Purpose**: Structured memory. If not listed, don't claim expertise.

## 5.1 {Category 1} (20-40 items)

| Item   | Description   | When to Use | Verification Note |
| ------ | ------------- | ----------- | ----------------- |
| {item} | {description} | {context}   | {what to verify}  |

## 5.2 {Category 2} (15-30 items)

{Pattern similar to above}

## 5.3 Common Pitfalls (10-20 items)

| Pitfall   | Symptom   | Solution | How to Verify Fixed |
| --------- | --------- | -------- | ------------------- |
| {pitfall} | {symptom} | {fix}    | {verification step} |
```

**Minimum Requirements:**

- Total items: 50+ across all categories
- Each category: At least 10 items
- Include "When NOT to use" to prevent misapplication

### Section 7: ABSOLUTE RULES Template

```markdown
## What You Always Do ✓

- [ ] {Positive behavior 1}
- [ ] {Positive behavior 2}
      {8-12 items}

## What You Never Do ✗

- [ ] {Prohibited behavior 1}
- [ ] {Prohibited behavior 2}
      {8-12 items}
```

### Section 8: OUTPUT FORMAT Template

````markdown
## Standard Response Template

```markdown
## {Response Title}

### Analysis

{Structured analysis}

### Recommendation

{Actionable recommendation}

### Confidence

**Level**: HIGH / MEDIUM / LOW
**Reasoning**: {Why}
**Sources**: {List}
```
````

````

---

## Hook Integration

### PreToolUse Hook Configuration

```json
{
  "PreToolUse": [
    {
      "matcher": "Write|Edit",
      "hooks": [
        {
          "type": "prompt",
          "prompt": "Validate file write safety...",
          "timeout": 30
        }
      ]
    }
  ]
}
````

**Validates:**

- File paths (no traversal, no sensitive files)
- Code content (no credentials/secrets)
- Commands (no destructive operations without confirmation)

### PostToolUse Hook Configuration

```json
{
  "PostToolUse": [
    {
      "matcher": "Write|Edit",
      "hooks": [
        {
          "type": "prompt",
          "prompt": "Suggest code formatting...",
          "timeout": 20
        }
      ]
    }
  ]
}
```

**Actions:**

- Auto-format code (language-specific)
- Remove unused imports
- Apply linting rules

---

## Agent Generation Workflow

### Step 1: Use agent-expert to Generate Skeleton

```bash
@agent-expert "Create a Rust expert agent"
```

Output: `plugins/rd/agnts/rust-expert.md` (400-600 lines)

### Step 2: Human-in-the-Loop Refinement

Add domain-specific knowledge and expertise.

### Step 3: Use agent-doctor to Validate

```bash
@agent-doctor plugins/rd/agnts/rust-expert.md
```

Output: Score report with improvement recommendations.

### Step 4: Iterate Until Score ≥ 80

Address agent-doctor's feedback and re-validate.

---

## Auto-Routing Configuration

### Adding New Agents to Routing

Include this pattern in agent description:

```yaml
description: |
  Senior {Domain} expert.
  Use PROACTIVELY for {keyword1}, {keyword2}, {keyword3}.

  <example>
  Context: {situation}
  user: "{request with keyword}"
  assistant: "{response showing verification}"
  <commentary>{explanation}</commentary>
  </example>
```

### Routing Table

Update `docs/prompts/0004/global_CLAUDE.md` routing table:

| Keywords               | Agent       |
| ---------------------- | ----------- |
| {keyword1}, {keyword2} | {new-agent} |

---

## Quick Reference

### Agent File Checklist

- [ ] Line count: 400-600
- [ ] Competencies: 50+ items
- [ ] Verification protocol: Complete with red flags
- [ ] Rules: 8+ DO ✓ and 8+ DON'T ✗
- [ ] Auto-routing: "Use PROACTIVELY for" in description
- [ ] Examples: 2-3 in description
- [ ] Confidence scoring: In output format

### Agent Commands

```bash
# Generate new agent
@agent-expert "Create a {domain} expert"

# Validate agent
@agent-doctor plugins/rd/agnts/{domain}-expert.md

# Use agent (auto-routing triggers automatically)
"{request with keyword}"
```

---

## References

- `docs/prompts/0004/global_CLAUDE.md` - Runtime behavioral guidelines
- `docs/prompts/0004/global_settings.json` - Configuration settings
- `plugins/rd/agnts/agent-expert.md` - Meta-agent for generation
- `plugins/rd/agnts/agent-doctor.md` - Meta-agent for validation
