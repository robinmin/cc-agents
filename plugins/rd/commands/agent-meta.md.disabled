---
description: Expert prompt engineering analysis and refinement for prompts, slash commands, and agent skills
argument-hint: <file_path> [focus_area]
---

# Agent Meta - Prompt Engineering Expert

Analyze and refine prompts, slash commands, and agent skills for maximum clarity, efficiency, and reliability.

## Quick Start

```bash
/rd:agent-meta plugins/rd/commands/task-runner.md
/rd:agent-meta plugins/rd/skills/my-skill/SKILL.md efficiency
```

## Arguments

| Argument | Description |
|----------|-------------|
| `<file_path>` | Path to prompt/command/skill to analyze |
| `[focus_area]` | `clarity` \| `efficiency` \| `reliability` \| `structure` \| `all` (default) |

## Workflow

```
Step 1: Analyze → Step 2: Report → Step 3: Clarify → Step 4: Refine → Step 5: Apply
```

### Step 1: Structural Analysis

Detect document type:
- `description:` only → Slash Command
- `name:` + `description:` → Agent/Skill
- No frontmatter → Raw Prompt

Inventory components: persona, inputs, instructions, output format, constraints, examples, error handling.

### Step 2: Quality Assessment

| Dimension | Weight | Criteria |
|-----------|--------|----------|
| **Clarity** | 25% | Unambiguous, no interpretation needed |
| **Completeness** | 20% | All edge cases covered |
| **Efficiency** | 15% | Minimal tokens, maximum effect |
| **Structure** | 15% | Logical, scannable |
| **Reliability** | 15% | Consistent outputs |
| **Maintainability** | 10% | Modular, easy to update |

### Step 3: Issue Detection

**Critical:** Ambiguous instructions, missing output format, contradictory rules
**High:** Verbose (>2x tokens needed), implicit assumptions, missing examples
**Medium:** Poor organization, redundancy, missing validation
**Low:** Style issues, minor wording

### Step 4: Refinement

Apply prompt engineering principles and produce improved version.

### Step 5: Apply Changes

Present before/after comparison and confirm changes with user.

## Prompt Engineering Principles

### 1. Explicit Over Implicit

```diff
- Translate the content appropriately.
+ Translate to [target_language]. Preserve:
+ - Code blocks (DO NOT translate)
+ - URLs, @mentions (keep as-is)
+ - Markdown formatting
```

### 2. Structured Output

```diff
- Return a summary and the translation.
+ ## Output Format
+ ```markdown
+ ## Summary
+ [2-3 sentences]
+ ---
+ [Full translated content]
+ ```
```

### 3. Negative Constraints

```diff
- Be careful with code blocks.
+ Code blocks: **DO NOT translate** - preserve exactly as-is
```

### 4. Concrete Examples

```diff
- Add appropriate spacing between scripts.
+ Spacing: Add space between CJK and Latin
+ ✅ `使用 Python 编写`
+ ❌ `使用Python编写`
```

### 5. Progressive Disclosure

Keep SKILL.md under 500 lines. Use references for advanced content:
```
SKILL.md (core, <500 lines)
└── See REFERENCE.md for advanced options
```

### 6. Validation Loops

```markdown
## Quality Checklist
- [ ] Facts match source
- [ ] No information added/omitted
- [ ] Consistent terminology
- [ ] Output format matches spec
```

### 7. Error Handling

| Scenario | Response |
|----------|----------|
| Empty input | "Error: No content provided" |
| Unsupported type | List supported options |
| Ambiguous | Ask for clarification |

## Claude Code Guidelines

### Slash Commands

| Element | Guideline |
|---------|-----------|
| `description` | ≤80 chars, action-oriented |
| `argument-hint` | Show required/optional args |
| Output | Specify Markdown structure |

### Agent Skills

| Element | Guideline |
|---------|-----------|
| `name` | lowercase-hyphens, ≤64 chars |
| `description` | What + When, ≤1024 chars, third-person |
| SKILL.md | <500 lines, progressive disclosure |
| References | One level deep only |

### Agents

| Element | Guideline |
|---------|-----------|
| `description` | Include `<example>` blocks |
| `model` | Use `inherit` unless specific need |
| `color` | Required field |
| `tools` | Limit to minimum needed |

## Anti-Patterns

| Pattern | Signal | Fix |
|---------|--------|-----|
| Vague | "appropriately", "as needed" | Explicit criteria |
| No output format | Unstructured section | Add template |
| Implicit assumptions | Undocumented behavior | State assumptions |
| Over-engineering | Excessive options | Simplify, use defaults |
| Token bloat | Explaining basics | Remove (LLM knows) |

## Output Format

```markdown
# Prompt Engineering Analysis: [File]

**Type:** [Slash Command / Skill / Prompt]
**Quality:** [Excellent / Good / Fair / Needs Work]
**Readiness:** [Production / Minor Fixes / Major Revision]

## Summary

**Strengths:** [list]
**Critical Issues:** [list]

## Scores

| Dimension | Score |
|-----------|-------|
| Clarity | X/10 |
| Completeness | X/10 |
| Efficiency | X/10 |
| Structure | X/10 |
| Reliability | X/10 |
| Maintainability | X/10 |

## Recommendations

### Critical
1. **[Issue]**: [Current] → [Fix]

### High Priority
[...]

## Refined Version

[Complete improved version]

## Before/After

| Aspect | Before | After |
|--------|--------|-------|
| Clarity | X/10 | Y/10 |
| Token Count | X | Y |
```

## Integration

```bash
/rd:skill-add my-plugin my-skill    # Create skill
/rd:skill-evaluate my-skill          # Evaluate quality
/rd:agent-meta <skill-path>          # Expert review
/rd:skill-refine my-skill            # Apply improvements
```
