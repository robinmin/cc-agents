# Evaluate Skill Quality

Comprehensive read-only evaluation of a Claude Code Agent Skill against best practices and quality standards.

## Purpose

Analyze an existing skill and generate a detailed quality report without making any changes. Provides objective assessment with specific recommendations for improvement.

## Usage

```bash
/rd:skill-evaluate <skill-folder>
```

### Arguments

- `skill-folder` (required): Path to skill directory to evaluate
  - Can be relative: `skills/my-skill`
  - Can be absolute: `/Users/robin/projects/cc-agents/plugins/rd/skills/my-skill`
  - Can be skill name only: `my-skill` (searches in current plugin)

## Examples

**Evaluate skill in current plugin:**
```bash
/rd:skill-evaluate 10-stages-developing
```

**Evaluate skill with full path:**
```bash
/rd:skill-evaluate plugins/rd/skills/code-review
```

**Evaluate skill in another plugin:**
```bash
/rd:skill-evaluate plugins/hello/skills/greeting-messages
```

## Workflow

When you invoke this command, Claude will:

1. **Load Evaluation Framework**
   - Invoke `cc-skills` skill for domain knowledge
   - Load quality standards and best practices
   - Load evaluation criteria and metrics

2. **Analyze Skill Structure**
   - Read SKILL.md and all supporting files
   - Validate YAML frontmatter
   - Assess file organization
   - Check directory structure
   - Identify all resources (scripts, templates, docs)

3. **Evaluate Against Criteria**

   **Frontmatter Compliance:**
   - Name format and length (≤64 chars)
   - Description quality and length (≤1024 chars)
   - No XML tags or reserved words
   - Activation conditions clear

   **Content Quality:**
   - Clarity and conciseness
   - Appropriate detail level
   - Concrete examples present
   - Terminology consistency
   - Freedom level appropriateness

   **Structure:**
   - Progressive disclosure
   - File reference depth
   - Workflow organization
   - Documentation completeness

   **Token Efficiency:**
   - SKILL.md length (target <500 lines)
   - Content uniqueness (not duplicating Claude's knowledge)
   - Reference organization
   - Compression opportunities

   **Code Quality (if scripts exist):**
   - Error handling
   - Parameter justification
   - Dependency management
   - Execution clarity

4. **Generate Comprehensive Report**
   - Executive summary
   - Detailed findings by category
   - Strengths and weaknesses
   - Specific recommendations
   - Priority rankings
   - Quality metrics

5. **Provide Actionable Next Steps**
   - Prioritized improvement list
   - Suggested commands to run
   - Additional resources

## Evaluation Report Format

```markdown
# Skill Quality Evaluation: [Skill Name]

**Evaluation Date:** [Date]
**Skill Location:** [Path]
**Evaluator:** Claude Code with cc-skills framework

---

## Executive Summary

**Overall Quality:** [Excellent/Good/Fair/Needs Improvement]
**Readiness:** [Production Ready/Needs Minor Fixes/Needs Major Revision]

**Key Strengths:**
- [Strength 1]
- [Strength 2]
- [Strength 3]

**Critical Issues:**
- [Issue 1]
- [Issue 2]

**Recommendation:** [Brief overall recommendation]

---

## Detailed Evaluation

### 1. Frontmatter Compliance

**Status:** [Pass/Fail]

| Criterion | Status | Details |
|-----------|--------|---------|
| Name format | ✅/❌ | [Details] |
| Name length | ✅/❌ | [X/64 characters] |
| Description length | ✅/❌ | [X/1024 characters] |
| No XML tags | ✅/❌ | [Details] |
| No reserved words | ✅/❌ | [Details] |
| Activation clarity | ✅/❌ | [Assessment] |

**Issues Found:**
- [Issue if any]

**Recommendations:**
- [Recommendation if any]

**Score:** [X/10]

---

### 2. Content Quality

**Status:** [Excellent/Good/Fair/Poor]

**Clarity:** [X/10]
- [Assessment of how clear and understandable the content is]
- Examples: [Present/Missing]
- Terminology: [Consistent/Inconsistent]

**Conciseness:** [X/10]
- Current length: [X lines]
- Target length: [<500 lines]
- Efficiency: [High/Medium/Low]
- Redundancy: [None/Some/Significant]

**Completeness:** [X/10]
- Workflows: [Complete/Partial/Missing]
- Examples: [Concrete/Abstract/Missing]
- Error handling: [Covered/Partial/Missing]

**Strengths:**
- [Specific strong point 1]
- [Specific strong point 2]

**Weaknesses:**
- [Specific weak point 1]
- [Specific weak point 2]

**Recommendations:**
- [Specific recommendation 1]
- [Specific recommendation 2]

**Score:** [X/10]

---

### 3. Structure & Organization

**Status:** [Excellent/Good/Fair/Poor]

**Progressive Disclosure:** [X/10]
- SKILL.md role: [Appropriate/Too detailed/Too sparse]
- Supporting files: [Well organized/Could improve/Missing]
- Reference depth: [One level/Too deep/Mixed]

**File Organization:** [X/10]
```
[Actual directory tree]
```

**Assessment:**
- [Analysis of organization effectiveness]

**Workflow Design:** [X/10]
- Steps clarity: [Clear/Unclear]
- Validation loops: [Present/Missing]
- Checklists: [Effective/Could improve/Missing]

**Strengths:**
- [Specific structural strength]

**Weaknesses:**
- [Specific structural weakness]

**Recommendations:**
- [Specific structural recommendation]

**Score:** [X/10]

---

### 4. Token Efficiency

**Status:** [Excellent/Good/Fair/Poor]

**Metrics:**
- SKILL.md length: [X lines] (Target: <500)
- Total token estimate: [~X tokens]
- Efficiency rating: [High/Medium/Low]

**Content Uniqueness:** [X/10]
- Redundancy with Claude's knowledge: [Minimal/Some/Significant]
- Information density: [High/Medium/Low]

**Reference Strategy:** [X/10]
- File references: [Efficient/Could improve]
- Content distribution: [Well balanced/Unbalanced]

**Compression Opportunities:**
- [Opportunity 1]
- [Opportunity 2]

**Strengths:**
- [Efficiency strength]

**Weaknesses:**
- [Efficiency weakness]

**Recommendations:**
- [Efficiency recommendation]

**Score:** [X/10]

---

### 5. Best Practices Compliance

**Status:** [Excellent/Good/Fair/Poor]

**Naming Conventions:** [X/10]
- Skill name: [Follows/Violates] conventions
- File names: [Descriptive/Could improve]
- Terminology: [Consistent/Inconsistent]

**Anti-Patterns Detected:**
- [ ] Windows-style paths
- [ ] Deeply nested references
- [ ] Time-sensitive content
- [ ] Excessive options without defaults
- [ ] Magic numbers in scripts
- [ ] Vague file names
- [ ] Inconsistent terminology

**Issues Found:**
[List each anti-pattern found with location]

**Best Practices Applied:**
- ✅ [Practice 1]
- ✅ [Practice 2]
- ❌ [Missing practice]

**Score:** [X/10]

---

### 6. Code Quality (if applicable)

**Status:** [Excellent/Good/Fair/Poor/N/A]

**Scripts Found:**
- [script1.py]
- [script2.sh]

**Error Handling:** [X/10]
- [Assessment of error handling quality]
- Examples: [Good/Missing]

**Parameter Justification:** [X/10]
- Magic numbers: [None/Some/Many]
- Documentation: [Complete/Partial/Missing]

**Dependencies:** [X/10]
- Listed: [Yes/No]
- Verified: [Yes/No/Unknown]

**Execution Clarity:** [X/10]
- Intent clear: [Yes/Unclear]
- Usage documented: [Yes/No]

**Strengths:**
- [Code strength]

**Weaknesses:**
- [Code weakness]

**Recommendations:**
- [Code recommendation]

**Score:** [X/10] or [N/A]

---

## Quality Metrics Summary

| Category | Score | Weight | Weighted Score |
|----------|-------|--------|----------------|
| Frontmatter Compliance | X/10 | 15% | X.X |
| Content Quality | X/10 | 30% | X.X |
| Structure & Organization | X/10 | 20% | X.X |
| Token Efficiency | X/10 | 15% | X.X |
| Best Practices | X/10 | 15% | X.X |
| Code Quality | X/10 | 5% | X.X |
| **Overall Score** | | | **X.X/10** |

**Grade:** [A/B/C/D/F]
- A (9.0-10.0): Excellent - Production ready
- B (7.0-8.9): Good - Minor improvements needed
- C (5.0-6.9): Fair - Moderate revision needed
- D (3.0-4.9): Poor - Major revision needed
- F (0.0-2.9): Failing - Complete rewrite recommended

---

## Prioritized Recommendations

### Critical (Fix Immediately)
1. [Critical issue 1]
   - **Impact:** [Why this matters]
   - **Fix:** [How to address]
   - **Effort:** [Low/Medium/High]

### High Priority (Fix Soon)
1. [High priority issue 1]
   - **Impact:** [Why this matters]
   - **Fix:** [How to address]
   - **Effort:** [Low/Medium/High]

### Medium Priority (Improve When Possible)
1. [Medium priority issue 1]
   - **Impact:** [Why this matters]
   - **Fix:** [How to address]
   - **Effort:** [Low/Medium/High]

### Low Priority (Nice to Have)
1. [Low priority issue 1]
   - **Impact:** [Why this matters]
   - **Fix:** [How to address]
   - **Effort:** [Low/Medium/High]

---

## Strengths to Maintain

1. **[Strength Category]**
   - [Specific strength 1]
   - [Specific strength 2]
   - **Why this works:** [Explanation]

2. **[Another Strength Category]**
   - [Specific strength 3]
   - **Why this works:** [Explanation]

---

## Examples of Issues

### Issue Example 1: [Issue Name]

**Location:** [File:line or section]
**Severity:** [Critical/High/Medium/Low]

**Current:**
```
[Show problematic code/content]
```

**Problem:** [Explain what's wrong]

**Suggested Fix:**
```
[Show improved version]
```

**Why this matters:** [Impact explanation]

---

## Next Steps

### Immediate Actions

1. **Fix Critical Issues:**
   ```bash
   # Edit SKILL.md to fix [critical issue]
   # Run validation: /rd:evaluate-skill [skill-name]
   ```

2. **Apply High Priority Fixes:**
   ```bash
   # Use refinement command for guided improvements
   /rd:refine-skill [skill-name]
   ```

### Recommended Workflow

1. Address critical issues manually
2. Run `/rd:refine-skill [skill-name]` for guided improvements
3. Re-evaluate: `/rd:evaluate-skill [skill-name]`
4. Test with fresh Claude instance
5. Validate activation and functionality

### Resources

- **Best Practices:** `plugins/rd/skills/cc-skills/BEST_PRACTICES.md`
- **Examples:** `plugins/rd/skills/cc-skills/EXAMPLES.md`
- **Templates:** `plugins/rd/skills/cc-skills/TEMPLATES.md`

---

## Evaluation Criteria Reference

This evaluation used the following standards from `cc-skills` meta-skill:

**Quality Checklist:**
- YAML frontmatter valid
- SKILL.md under 500 lines
- Description includes activation conditions
- Concrete examples present
- Consistent terminology
- No anti-patterns
- Clear workflows
- Proper progressive disclosure
- Token-efficient content
- Scripts handle errors (if applicable)

**Best Practices Applied:**
- Conciseness principles
- Appropriate freedom levels
- Cross-model compatibility
- Progressive disclosure
- Clear naming conventions
- Example-driven documentation
- Validation loop patterns

---

## Conclusion

[Final assessment paragraph summarizing overall quality, key strengths, main areas for improvement, and recommended next actions]

**Ready for Production:** [Yes/No/With Minor Fixes]

**Estimated Effort to Production Ready:** [X hours/days]

---

*This evaluation was generated using the cc-skills meta-skill framework based on official Claude Code Agent Skills best practices.*
```

## Evaluation Criteria Details

### Frontmatter Compliance (15%)

**Pass Criteria:**
- Name: lowercase, hyphens, ≤64 chars, no reserved words
- Description: non-empty, ≤1024 chars, no XML tags
- Includes both what it does AND when to use it

**Common Issues:**
- Description too long
- Missing activation conditions
- Reserved words present
- Invalid characters in name

### Content Quality (30%)

**Evaluation Factors:**
- Clarity: Easy to understand, well-explained
- Conciseness: No unnecessary verbosity
- Completeness: All necessary information present
- Examples: Concrete, not abstract
- Terminology: Consistent throughout

**Red Flags:**
- Claude already knows this information
- Too many explanations of basics
- Missing concrete examples
- Inconsistent term usage
- Excessive length (>500 lines)

### Structure & Organization (20%)

**Evaluation Factors:**
- Progressive disclosure: Main content in SKILL.md, details in references
- File organization: Logical, one level deep
- Workflow design: Clear steps, validation loops
- Navigation: Easy to find information

**Red Flags:**
- Everything in one file when should be split
- References too deep (>1 level)
- No clear workflow structure
- Missing checklists for complex processes

### Token Efficiency (15%)

**Evaluation Factors:**
- Content uniqueness: Not duplicating Claude's knowledge
- Length appropriateness: <500 lines for SKILL.md
- Reference strategy: Efficient use of progressive disclosure
- Compression: Tables vs paragraphs, symbols vs words

**Red Flags:**
- Explaining concepts Claude already knows
- Repetitive content
- Could use tables/lists instead of paragraphs
- No use of referenced files for details

### Best Practices Compliance (15%)

**Anti-Patterns Checked:**
- ❌ Windows paths (`\` instead of `/`)
- ❌ Deeply nested references
- ❌ Time-sensitive content ("as of 2024")
- ❌ Excessive options without defaults
- ❌ Magic numbers
- ❌ Vague file names
- ❌ Inconsistent terminology

**Best Practices Checked:**
- ✅ Gerund/noun phrase naming
- ✅ Third-person descriptions
- ✅ Concrete examples
- ✅ One term per concept
- ✅ Validation loops
- ✅ Error handling in scripts

### Code Quality (5%)

**Evaluation Factors:**
- Error handling: Explicit, helpful messages
- Parameter justification: No magic numbers
- Dependencies: Listed and verified
- Execution intent: Clear whether to run or read

**N/A if no scripts present**

## Scoring Guidelines

**10/10 - Excellent:**
- Exemplary implementation of all criteria
- Could be used as reference example
- No improvements needed

**8-9/10 - Good:**
- Solid implementation
- Minor improvements possible
- Production ready

**6-7/10 - Fair:**
- Functional but needs improvement
- Several best practices missing
- Moderate revision recommended

**4-5/10 - Poor:**
- Significant issues present
- Major revision needed
- May need restructuring

**0-3/10 - Failing:**
- Critical issues present
- Does not meet basic standards
- Complete rewrite recommended

## Read-Only Guarantee

This command makes **NO changes** to the skill:

✅ **Only reads files**
✅ **Only analyzes content**
✅ **Only generates report**

❌ **Does not modify SKILL.md**
❌ **Does not change supporting files**
❌ **Does not alter structure**

To apply improvements, use `/rd:skill-refine` after reviewing the evaluation report.

## When to Use

**Use evaluate-skill when:**
- Want objective quality assessment
- Preparing skill for release/sharing
- Learning best practices through analysis
- Comparing different skill approaches
- Need detailed improvement roadmap

**Use skill-refine when:**
- Ready to make actual improvements
- Want guided interactive refinement
- Prefer automated fixes where possible

**Use both in sequence:**
```bash
# 1. Get assessment
/rd:skill-evaluate my-skill

# 2. Review report and decide on fixes

# 3. Apply improvements
/rd:skill-refine my-skill

# 4. Verify improvements
/rd:skill-evaluate my-skill
```

## Troubleshooting

**Skill not found:**
- Verify path is correct
- Check skill exists in specified location
- Try full absolute path

**Report too long:**
- Focus on highest priority sections
- Ask for summary of specific categories
- Request condensed version

**Disagree with assessment:**
- Review evaluation criteria reference
- Check against official best practices
- Consider if Claude's knowledge changed
- Provide feedback on specific points

**Want specific category details:**
- Ask Claude to expand specific section
- Request examples of issues found
- Ask for comparison with best practices

## See Also

- `/rd:skill-add` - Create new skills with templates
- `/rd:skill-refine` - Apply improvements to skills
- `plugins/rd/skills/cc-skills/` - Best practices reference
- `plugins/rd/skills/cc-skills/BEST_PRACTICES.md` - Detailed guidelines
- `plugins/rd/skills/cc-skills/EXAMPLES.md` - Reference examples
