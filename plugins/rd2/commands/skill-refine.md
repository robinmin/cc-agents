---
description: Skill creation and refinement specialist. Use PROACTIVELY for refining existing skills, improving skill descriptions, organizing skill content, or applying best practices from rd2:cc-skills.
skills: [rd2:cc-skills, rd2:anti-hallucination]
argument-hint: <skill-folder>
---

# Refine Existing Skill

Thin wrapper command for `rd2:skill-expert` agent. Improves skill quality following "Fat Skills, Thin Wrappers" architecture with progressive disclosure and evaluation-first development.

## Quick Start

```bash
/rd2:skill-refine data-pipeline
/rd2:skill-refine plugins/rd2/skills/code-review
```

## Arguments

| Argument         | Description                                 |
| ---------------- | ------------------------------------------- |
| `<skill-folder>` | Path to skill (relative, absolute, or name) |

## Workflow

This command follows the refinement process with evaluation-first development:

1. **Evaluate current quality** - Use skill-doctor for comprehensive assessment
2. **Review findings** - Check all dimensions, especially low scores
3. **Determine action**:
   - **Content issues?** → Add/clarify workflows in SKILL.md
   - **Token inefficient?** → Move details to references/, tighten language
   - **Missing guidance?** → Add workflow steps for uncovered cases
   - **Security flags?** → Address dangerous patterns
   - **Weak triggers?** → Strengthen description with specific phrases
4. **Implement fixes** - Edit SKILL.md or modify resources
5. **Re-evaluate** - Continue until Grade A/B achieved

## Improvement Areas

| Dimension         | Typical Fixes                                       |
| ----------------- | --------------------------------------------------- |
| Content (<9/10)   | Add workflow guidance, examples, "when to use" info |
| Efficiency (<9/10) | Move details to references/, use tables/lists       |
| Structure (<9/10)  | Ensure SKILL.md + scripts/ + references/ present    |
| Best Practices (<9/10) | Use hyphen-case, remove TODOs, add description    |
| Description        | Add specific trigger phrases, use third person       |

## Common Refinements

**Strengthen Trigger Description:**

```diff
- description: Provides PDF processing guidance.
+ description: This skill should be used when the user asks to "rotate a PDF", "merge PDFs", "extract text from PDF", or mentions PDF operations.
```

**Reduce Verbosity (Progressive Disclosure):**

```diff
- [Everything in SKILL.md - 8,000 words]
+ SKILL.md: Core essentials only (~1,800 words)
+ references/patterns.md: Detailed patterns (2,500 words)
+ references/advanced.md: Advanced techniques (3,700 words)
```

**Fix Writing Style (Imperative Form):**

```diff
- You should validate the input before processing.
- You need to check for errors.
+ Validate the input before processing.
+ Check for errors.
```

**Add Missing Resource References:**

```diff
+ ## Additional Resources
+
+ ### Reference Files
+ - **`references/patterns.md`** - Common design patterns
+ - **`references/advanced.md`** - Advanced techniques
```

## Interactive Mode

The refinement may ask for approval:
- "Move advanced topics to references/advanced.md?"
- "Strengthen trigger description with these phrases?"
- "Apply writing style fixes? [y/n]"

## Output Format

```markdown
# Refined Skill: {skill-name}

## Location
`{path-to-skill}`

## Structure
[some-structure/]

## Changes Made
- {Structure changes}
- {Content changes}
- {References reorganized}

## Next Steps
1. Customize SKILL.md with domain-specific content
2. Add references/ for detailed documentation
3. Test with sample queries
4. Validate with `/rd2:skill-evaluate`
```

## Post-Refinement

1. **Restart Claude Code** - Load updated skill
2. **Test activation keywords** - Verify skill triggers properly
3. **Verify improved guidance** - Confirm enhancements work
4. **Re-evaluate** - Run `/rd2:skill-evaluate` to confirm Grade A/B

## Implementation

This command delegates to the **rd2:skill-expert** agent for skill refinement:

```
Task(
    subagent_type="rd2:skill-expert",
    prompt="""Refine and improve the skill at: {skill_folder}

Follow the refinement process with evaluation-first development:
1. Evaluate current quality across all dimensions
2. Review findings, especially low-scoring areas
3. Apply fixes by dimension:
   - Content: Add workflow guidance, examples
   - Efficiency: Move details to references/, tighten language
   - Structure: Ensure SKILL.md + scripts/ + references/ present
   - Best Practices: Use hyphen-case, remove TODOs
   - Description: Add specific trigger phrases
4. Edit SKILL.md or modify resources
5. Re-evaluate until Grade A/B achieved

Follow rd2:cc-skills best practices with progressive disclosure.
   """,
    description="Refine {skill_folder} skill"
)
```

## See Also

- `rd2:skill-expert` - Agent that handles skill creation and refinement
- `/rd2:skill-add` - Create new skills
- `/rd2:skill-evaluate` - Assess quality (delegates to skill-doctor)
- `rd2:cc-skills` - Best practices reference with detailed guides
