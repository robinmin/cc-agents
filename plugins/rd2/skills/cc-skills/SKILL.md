---
name: cc-skills
description: "This skill should be used when the user asks to 'create a skill', 'write SKILL.md', 'evaluate skill quality', 'package a skill', 'initialize a new skill', or mentions skill development, skill creation, or SKILL.md workflows. Provides comprehensive meta-skill guidance including progressive disclosure patterns, evaluation-first development, and plugin-based quality assessment."
---

# cc-skills: Claude Code Meta Skills V2

## Overview

Create Agent skills that extend AI capabilities with specialized knowledge, workflows, and tools. Use this skill when building new skills, writing SKILL.md files, or packaging skills for distribution.

## Skill Types

Different skills serve different purposes. Choose the type that best fits your use case:

### Technique

Concrete method with steps to follow.

- **Examples:** condition-based-waiting, root-cause-tracing, defensive-programming
- **Structure:** Clear steps, code examples, common mistakes
- **Best for:** Repeatable processes, debugging methodologies

### Pattern

Way of thinking about problems.

- **Examples:** flatten-with-flags, test-invariants, information-hiding
- **Structure:** Principles, when to apply, when NOT to apply
- **Best for:** Mental models, architectural decisions

### Reference

API docs, syntax guides, tool documentation.

- **Examples:** office-docs, API reference, command reference
- **Structure:** Tables, searchable content, quick lookup
- **Best for:** External tool integration, domain knowledge

| Type      | Description              | Structure Focus              |
| --------- | ------------------------ | ---------------------------- |
| Technique | Concrete steps to follow | Steps, code, common mistakes |
| Pattern   | Way of thinking          | Principles, when/when-not    |
| Reference | API/syntax docs          | Tables, searchable, lookup   |

## Quick Start

```bash
# Initialize a new skill (run from plugin root directory)
python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py init my-skill --path ${CLAUDE_PLUGIN_ROOT}/skills

# Edit the generated SKILL.md and add resources (scripts/, references/, assets/)

# Package for distribution
python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py package ${CLAUDE_PLUGIN_ROOT}/skills/my-skill
```

Output: `my-skill.skill` file ready for installation.

**Note:** Commands assume working directory is plugin root (`plugins/rd2/`), which is Claude Code's default behavior.

## Workflows

### Creating a New Skill

Use this checklist workflow based on the official 6-step skill creation process:

**Task Progress:**

- [ ] **Step 1: Understanding with Concrete Examples** - Collect concrete usage examples from user
- [ ] **Step 2: Plan Reusable Contents** - Identify scripts/references/assets needed
- [ ] **Step 3: Initialize** - Run `python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py init <name> --path ${CLAUDE_PLUGIN_ROOT}/skills`
- [ ] **Step 4: Implement resources** - Create and test scripts, write SKILL.md
- [ ] **Step 5: Validate** - Run `python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py validate ${CLAUDE_PLUGIN_ROOT}/skills/<skill-name>`
- [ ] **Step 6: Iterate** - Address findings, re-evaluate until Grade A/B

**Step 1 Detail - Understanding with Concrete Examples:**

Skip this step only when the skill's usage patterns are already clearly understood. To create an effective skill, clearly understand concrete examples of how the skill will be used. This understanding can come from either direct user examples or generated examples that are validated with user feedback.

For example, when building an image-editor skill, relevant questions include:

- "What functionality should the image-editor skill support? Editing, rotating, anything else?"
- "Can you give some examples of how this skill would be used?"
- "I can imagine users asking for things like 'Remove the red-eye from this image' or 'Rotate this image'. Are there other ways you imagine this skill being used?"
- "What would a user say that should trigger this skill?"

To avoid overwhelming users, avoid asking too many questions in a single message. Start with the most important questions and follow up as needed for better effectiveness.

Conclude this step when there is a clear sense of the functionality the skill should support.

**Step 2 Detail - Plan Reusable Contents:**

To turn concrete examples into an effective skill, analyze each example by:

1. Considering how to execute on the example from scratch
2. Identifying what scripts, references, and assets would be helpful when executing these workflows repeatedly

Example analysis patterns:

- **Repeated code** → Create `scripts/` utility
- **Repeated discovery** → Create `references/` documentation
- **Repeated boilerplate** → Create `assets/` templates

For a `pdf-editor` skill ("Help me rotate this PDF"):

1. Rotating a PDF requires re-writing the same code each time
2. A `scripts/rotate_pdf.py` script would be helpful

For a `frontend-webapp-builder` skill ("Build me a todo app"):

1. Writing a frontend webapp requires the same boilerplate HTML/React each time
2. An `assets/hello-world/` template would be helpful

For a `big-query` skill ("How many users have logged in today?"):

1. Querying BigQuery requires re-discovering the table schemas each time
2. A `references/schema.md` file would be helpful

**Step 3 Detail - Create Skill Structure:**

Use the init script with `--type` to create skill from the appropriate template:

```bash
# Choose template based on skill type (see "Skill Types" section above)
python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py init my-skill --path ${CLAUDE_PLUGIN_ROOT}/skills --type technique
python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py init my-skill --path ${CLAUDE_PLUGIN_ROOT}/skills --type pattern
python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py init my-skill --path ${CLAUDE_PLUGIN_ROOT}/skills --type reference
```

| Type        | Template                      | Use For                                                  |
| ----------- | ----------------------------- | -------------------------------------------------------- |
| `technique` | `skill-template-technique.md` | Concrete steps, debugging methods, repeatable processes  |
| `pattern`   | `skill-template-pattern.md`   | Mental models, architectural decisions, ways of thinking |
| `reference` | `skill-template-reference.md` | API docs, syntax guides, tool documentation              |

If `--type` is omitted, the generic `skill-template.md` is used.

The template creates SKILL.md with TODO markers guiding what to fill in, plus optional directories (scripts/, references/, assets/).

**Step 4 Detail - Implement resources:**

A. Create scripts/ if code is rewritten repeatedly

- Write and test each script
- Add error handling and documentation

B. Create references/ if info is re-discovered each time

- Document schemas, APIs, workflows
- Use web search tools to find out the relevant official website, workflows and best practices if any. Use mcp ref or Context7 tools to fetch relevant documents if necessary.
- Add TOC for files >100 lines

C. Create assets/ if boilerplate is needed each time

- Gather templates, sample files
- Organize in subdirectories if numerous

D. Write SKILL.md:

1.  Frontmatter: name + description (include "when to use")
2.  Overview + Quick Start
3.  Workflows (this section!)
4.  Links to detailed references

**Feedback Loop (Steps 5-7):**

```
evaluate → note findings → fix issues → re-evaluate → repeat until A/B
```

Only proceed to Step 8 when evaluation shows Grade A or B.

### Refining an Existing Skill

**Workflow:**

1. **Evaluate current quality** - `python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py evaluate ${CLAUDE_PLUGIN_ROOT}/skills/<skill-name>`
2. **Review findings** - Check all dimensions, especially low scores
3. **Determine action**:
   - **Content issues?** → Add/clarify workflows in SKILL.md
   - **Token inefficient?** → Move details to references/, tighten language
   - **Missing guidance?** → Add workflow steps for uncovered cases
   - **Security flags?** → Address dangerous patterns
4. **Implement fixes** - Edit SKILL.md or add/modify resources
5. **Re-evaluate** - `python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py evaluate ${CLAUDE_PLUGIN_ROOT}/skills/<skill-name>`
6. **Repeat** - Continue until Grade A/B achieved
7. **Re-package** - `python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py package ${CLAUDE_PLUGIN_ROOT}/skills/<skill-name>`

**Common refinements by dimension:**

| Dimension              | Typical Fixes                                       |
| ---------------------- | --------------------------------------------------- |
| Content (<9/10)        | Add workflow guidance, examples, "when to use" info |
| Efficiency (<9/10)     | Move details to references/, use tables/lists       |
| Structure (<9/10)      | Ensure SKILL.md + scripts/ + references/ present    |
| Best Practices (<9/10) | Use hyphen-case, remove TODOs, add description      |

## Architecture: Fat Skills, Thin Wrappers

Follow the **Fat Skills, Thin Wrappers** pattern:

- **Skills** contain all core logic, workflows, and domain knowledge
- **Commands** are minimal wrappers (~50 lines) that invoke skills for human users
- **Agents** are minimal wrappers (~100 lines) that invoke skills for AI workflows

**Benefits:** Single source of truth, maintainable wrappers, automatic propagation of updates.

See [Workflows & Architecture Patterns](references/workflows.md) for detailed architectural guidance.

## Script Usage Reference

The `skills.py` script provides skill management operations. All commands assume working directory is plugin root (`plugins/rd2/`).

### Commands

**Initialize new skill:**

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py init <skill-name> --path ${CLAUDE_PLUGIN_ROOT}/skills
```

Creates skill directory with template SKILL.md, scripts/, references/, and assets/ directories.

**Validate skill structure:**

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py validate ${CLAUDE_PLUGIN_ROOT}/skills/<skill-name>
```

Checks frontmatter, directory structure, and file naming. Returns validation errors or success.

**Evaluate skill quality:**

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py evaluate ${CLAUDE_PLUGIN_ROOT}/skills/<skill-name>
```

Runs comprehensive quality assessment across 7 dimensions. Returns grade (A-F) and detailed findings.

Options:

- `--json` - Output as JSON for programmatic use

**Package skill for distribution:**

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py package ${CLAUDE_PLUGIN_ROOT}/skills/<skill-name>
```

Creates `.skill` archive file for installation.

### Working Directory

**Critical:** Commands must be run from plugin root directory (`plugins/rd2/`). This is Claude Code's default behavior for slash commands.

**Why use `${CLAUDE_PLUGIN_ROOT}`:**

- Explicit and unambiguous
- Works from any subdirectory
- Matches Claude Code conventions
- Prevents "file not found" errors

### Examples

```bash
# From plugin root (plugins/rd2/)
python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py init api-docs --path ${CLAUDE_PLUGIN_ROOT}/skills
python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py validate ${CLAUDE_PLUGIN_ROOT}/skills/api-docs
python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py evaluate ${CLAUDE_PLUGIN_ROOT}/skills/api-docs
python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py package ${CLAUDE_PLUGIN_ROOT}/skills/api-docs
```

## Core Principles

### Concise is Key

The context window is a public good. Only add context Claude doesn't already have. Challenge each piece: "Does this justify its token cost?"

### Set Appropriate Degrees of Freedom

Match specificity to task fragility:

- **High freedom** (text instructions): Multiple valid approaches, context-dependent
- **Medium freedom** (pseudocode/params): Preferred pattern exists, some variation OK
- **Low freedom** (scripts/strict): Fragile operations, consistency critical

**Metaphor:** Think of Claude as exploring a path: a narrow bridge with cliffs needs specific guardrails (low freedom), while an open field allows many routes (high freedom).

| Scenario                | Freedom Level | Implementation       |
| ----------------------- | ------------- | -------------------- |
| Error handling strategy | High          | Text guidance        |
| Validation pattern      | Medium        | Pseudocode template  |
| PDF rotation            | Low           | Exact script         |
| API integration         | Medium        | Parameters + pattern |
| Database migration      | Low           | Strict script        |
| Code style choices      | High          | Principles only      |

### Progressive Disclosure

Three-level loading system manages context efficiently:

1. **Metadata** (name + description) - Always loaded (~100 words)
2. **SKILL.md body** - When skill triggers (<5k words target)
3. **Bundled resources** - As needed (unlimited, scripts execute without loading)

**Key pattern:** Keep SKILL.md lean. Move variant-specific details, examples, and configurations to separate reference files. See [Progressive Disclosure Guide](references/workflows.md#progressive-disclosure) for patterns.

### Evaluation-First Development

Test → Gap Analysis → Write → Iterate:

1. Test without skill to observe Claude's baseline
2. Document gaps where skill guidance would help
3. Write ONLY what addresses gaps (no more, no less)
4. Iterate until baseline achieved, then ship

See [Evaluation-First Development](references/evaluation.md) for complete methodology.

For advanced testing methodology using TDD principles, see [TDD for Skills](references/tdd-for-skills.md).

### Circular Reference Rule [CRITICAL]

**Skills MUST NOT reference their associated agents or commands.**

## Skill Structure

### Directory Layout

```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter: name, description
│   └── Markdown body: instructions and workflow
└── Bundled Resources (optional)
    ├── scripts/     - Executable code
    ├── references/  - Documentation loaded as needed
    └── assets/      - Files used in output (not loaded into context)
```

### Component Details

| Component       | Purpose                                    | When to Include                                             | Reference                                            |
| --------------- | ------------------------------------------ | ----------------------------------------------------------- | ---------------------------------------------------- |
| **scripts/**    | Executable code for fragile/repeated tasks | Code rewritten repeatedly, deterministic reliability needed | [Scripts Guide](references/anatomy.md#scripts)       |
| **references/** | Docs loaded as needed during work          | Schemas, API docs, domain knowledge, detailed guides        | [References Guide](references/anatomy.md#references) |
| **assets/**     | Files used in output, not context          | Templates, images, boilerplate, sample documents            | [Assets Guide](references/anatomy.md#assets)         |

### What NOT to Include in a Skill

A skill should only contain essential files that directly support its functionality. Do NOT create extraneous documentation or auxiliary files:

**Files to Avoid:**
| File | Why Exclude |
|------|-------------|
| README.md | Human onboarding; skill is for AI execution |
| INSTALLATION_GUIDE.md | Setup procedures; not needed at runtime |
| QUICK_REFERENCE.md | Redundant with SKILL.md content |
| CHANGELOG.md | Version history; acceptable at plugin level only |
| Setup/testing procedures | Not directly helpful for task execution |
| User-facing documentation | Skill audience is AI, not humans |

**Why this matters:** The skill is for an AI agent to do the job at hand. It should not contain auxiliary context about creation process, human onboarding materials, or information that does not directly help execution.

**Exception:** CHANGELOG.md files are acceptable at the plugin level but not within individual skill directories.

For complete anatomy details, see [Skill Anatomy Reference](references/anatomy.md).

## Quality Standards

Skills are evaluated across 10 dimensions, each weighted to contribute to an overall quality score (0-100) and letter grade (A-F):

| Dimension             | Weight | What It Measures                                          |
| --------------------- | ------ | --------------------------------------------------------- |
| Frontmatter           | 10%    | YAML validity, required fields, naming conventions         |
| Content               | 20%    | Length, sections, examples, writing quality                |
| Security              | 15%    | AST-based dangerous pattern detection                     |
| Structure             | 10%    | Directory organization, progressive disclosure             |
| Trigger Design        | 15%    | Discovery quality, trigger phrases, CSO optimization      |
| Instruction Clarity   | 10%    | Imperative form, unambiguous directives, actionability     |
| Value-Add Assessment  | 10%    | Domain-specific knowledge, unique workflows, artifacts      |
| Behavioral Readiness  | 10%    | Error handling, edge cases, test scenarios                 |
| Efficiency            | 5%     | Token count, file sizes, no duplication                   |
| Best Practices        | 5%     | Naming conventions, documentation standards               |

Run `python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py evaluate ${CLAUDE_PLUGIN_ROOT}/skills/<skill-name>` to assess quality.

### Rubric-Based Scoring

Starting with version 2.0, cc-skills uses rubric-based scoring instead of point deductions:

- **Rubric Levels**: Each dimension has criteria with 4-6 levels (Excellent/Good/Fair/Poor/Missing)
- **Structured Findings**: Every score includes specific findings with line numbers
- **Actionable Recommendations**: Each finding includes suggestions for improvement
- **LLM-as-Judge**: Optional deep evaluation using Claude to score against full rubrics

See [Evaluation Reference](references/evaluation.md) for full rubric details.

## Validation Checklist## Validation Checklist

Before finalizing a skill, use this comprehensive checklist:

**Frontmatter:**
- [ ] YAML frontmatter is valid
- [ ] `name` field follows hyphen-case (max 64 chars)
- [ ] `description` field is 50-500 chars, describes what AND when to use

**Content Quality:**
- [ ] SKILL.md body uses imperative/infinitive form
- [ ] Body is focused and lean (1,500-2,000 words ideal, <5k max)
- [ ] Detailed content moved to references/
- [ ] Examples are complete and working

**Trigger Design:**
- [ ] Includes specific trigger phrases in quotes ("...")
- [ ] Third-person description ("This skill should be used when...")
- [ ] Concrete "when to use" scenarios ("create X", "configure Y")
- [ ] Synonym coverage for key concepts (timeout vs hang vs freeze)
- [ ] No workflow summaries in description (CSO violation)

**Instruction Clarity:**
- [ ] Imperative form ratio > 70%
- [ ] No vague language ("might", "could", "maybe", "as needed")
- [ ] Specific action verbs (create, configure, validate)
- [ ] Conditional instructions have clear branching criteria

**Value-Add Assessment:**
- [ ] Domain-specific content beyond generic advice
- [ ] Unique workflows not covered by standard prompting
- [ ] Concrete artifacts (scripts, templates, schemas)
- [ ] No explaining well-known concepts (REST, SQL, HTTP basics)

**Behavioral Readiness:**
- [ ] Error handling guidance ("what to do when X fails")
- [ ] Edge case documentation (null inputs, empty collections)
- [ ] Fallback strategies when primary approach fails
- [ ] tests/scenarios.yaml with behavioral test cases

**Structure:**
- [ ] SKILL.md in root (required)
- [ ] scripts/, references/, assets/ directories as needed
- [ ] SKILL.md references auxiliary resources
- [ ] Progressive disclosure: Quick Start in SKILL.md, details in references/

**Testing:**
- [ ] Skill triggers on expected user queries
- [ ] Content is helpful for intended tasks
- [ ] No duplicated information across files
- [ ] References load when needed

**Efficiency:**
- [ ] Under 3000 tokens (strongly prefer under 1500)
- [ ] No duplicate lines over 20 characters
- [ ] No verbose lines over 30 words

For detailed validation criteria, see [Scanner Criteria](references/scanner-criteria.md).## Best Practices

### Naming Conventions (CRITICAL)

**Follow official Claude Code naming rules:**

1. **ALWAYS use full namespace** for plugin skills: `plugin-name:skill-name`
   - When referencing skills in documentation, use full namespace
   - When invoking skills via slash commands, use full namespace
   - In `agents.md` skills field, reference without prefix (internal reference only)
   - Never omit the plugin prefix in user-facing documentation

2. **NEVER reuse names** across components
   - Slash commands, subagents, and skills must have UNIQUE names
   - Skills take precedence over commands with same name (blocks user invocation)
   - Use distinct naming patterns to avoid LLM confusion

| Component               | Naming Pattern  | Example                                                                 |
| ----------------------- | --------------- | ----------------------------------------------------------------------- |
| Slash Command           | `verb-noun`     | `code-review`                                                           |
| Slash Command (grouped) | `noun-verb`     | `agent-add`, `agent-evaluate`, `agent-refine` (groups related commands) |
| Skill                   | `verb-ing-noun` | `reviewing-code`                                                        |
| Subagent                | `role-agent`    | `code-reviewer-agent`                                                   |

**Slash Command Grouping Rule:**

- When multiple slash commands share the same domain, use `noun-verb` format (NOT `verb-noun`)
- This groups related commands together alphabetically in listings
- Examples:
  - `agent-add.md`, `agent-evaluate.md`, `agent-refine.md` (all "agent" commands grouped)
  - `code-generate.md`, `code-review.md` (all "code" commands grouped)
  - `tasks-plan.md`, `tasks-cli.md` (all "tasks" commands grouped) |

**Sources:**

- [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills)
- [GitHub Issue #14945](https://github.com/anthropics/claude-code/issues/14945) - Slash commands blocked by skill name collision
- [GitHub Issue #15944](https://github.com/anthropics/claude-code/issues/15944) - Cross-plugin skill references

### Skill Composition Rules

**DO:**

- Keep skills INDEPENDENT and self-contained
- Let Claude discover and use skills based on task context
- Use subagents to orchestrate multiple skills

**DON'T:**

- Make skills directly call other skills (not supported)
- Add explicit dependencies in skill metadata (feature request only)
- Assume cross-plugin skill references work (not implemented)
- **Reference related subagents or slash commands from skills** (circular reference)

**Circular Reference Rule (CRITICAL):**
Following "Fat Skills, Thin Wrappers" architecture:

- **Skills are the core** - contain all logic, workflows, and domain knowledge
- **Subagents are thin wrappers** - invoke skills for AI workflows (~100 lines)
- **Slash commands are thin wrappers** - invoke skills for human users (~50 lines)

**Therefore:** Skills MUST NOT reference their associated subagents or slash commands, as this creates circular dependencies. The skill is the source of truth; wrappers depend on it.

❌ **Bad (circular reference):**

```yaml
# In brainstorm/SKILL.md
See also: super-brain agent, /rd2:tasks-brainstorm command
```

✅ **Good (skill is self-contained):**

```yaml
# In brainstorm/SKILL.md
This skill provides brainstorming workflows with task creation.
```

The agent and command exist to invoke this skill, not the other way around.

**Example correct pattern:**

```yaml
# agents/orchestrator.md
---
name: orchestrator
description: Orchestrator agent for coordinating research and writing workflows.
---
```

### Writing Guidelines

- **Use imperative/infinitive form** ("Create X", not "Creates X")
- **Frontmatter description**: Include BOTH what the skill does AND when to use it. This is Claude's primary trigger mechanism.
- **Body**: Focus on procedural instructions and workflow guidance. Move reference material to `references/` files.

#### Writing Style Requirements

**Imperative/Infinitive Form:**

Write using verb-first instructions, not second person:

**Correct (imperative):**

```
To create a hook, define the event type.
Configure the MCP server with authentication.
Validate settings before use.
```

**Incorrect (second person):**

```
You should create a hook by defining the event type.
You need to configure the MCP server.
You must validate settings before use.
```

**Third-Person in Description:**

The frontmatter description must use third person:

**Correct:**

```yaml
description: This skill should be used when the user asks to "create X", "configure Y"...
```

**Incorrect:**

```yaml
description: Use this skill when you want to create X...
description: Load this skill when user asks...
```

**Objective, Instructional Language:**

Focus on what to do, not who should do it:

**Correct:**

```
Parse the frontmatter using sed.
Extract fields with grep.
Validate values before use.
```

**Incorrect:**

```
You can parse the frontmatter...
Claude should extract fields...
The user might validate values...
```

For detailed writing style examples and patterns, see [Writing Style Guide](references/writing-style.md).

### Common Patterns

See detailed guides in `references/`:

- **Comprehensive best practices**: [best-practices.md](references/best-practices.md)
- **Multi-step workflows**: [workflows.md](references/workflows.md)
- **Output formats**: [output-patterns.md](references/output-patterns.md)
- **Security guidelines**: [security.md](references/security.md)
- **Evaluation methodology**: [evaluation.md](references/evaluation.md)

## Common Mistakes to Avoid

### Mistake 1: Weak Trigger Description

❌ **Bad:**

```yaml
description: Provides guidance for working with hooks.
```

**Why bad:** Vague, no specific trigger phrases, not third person

✅ **Good:**

```yaml
description: This skill should be used when the user asks to "create a hook", "add a PreToolUse hook", "validate tool use", or mentions hook events. Provides comprehensive hooks API guidance.
```

**Why good:** Third person, specific phrases, concrete scenarios

### Mistake 2: Too Much in SKILL.md

❌ **Bad:**

```
skill-name/
└── SKILL.md  (8,000 words - everything in one file)
```

**Why bad:** Bloats context when skill loads, detailed content always loaded

✅ **Good:**

```
skill-name/
├── SKILL.md  (1,800 words - core essentials)
└── references/
    ├── patterns.md (2,500 words)
    └── advanced.md (3,700 words)
```

**Why good:** Progressive disclosure, detailed content loaded only when needed

### Mistake 3: Second Person Writing

❌ **Bad:**

```markdown
You should start by reading the configuration file.
You need to validate the input.
You can use the grep tool to search.
```

**Why bad:** Second person, not imperative form

✅ **Good:**

```markdown
Start by reading the configuration file.
Validate the input before processing.
Use the grep tool to search for patterns.
```

**Why good:** Imperative form, direct instructions

### Mistake 4: Missing Resource References

❌ **Bad:**

```markdown
# SKILL.md

[Core content]

[No mention of references/ or examples/]
```

**Why bad:** Claude doesn't know references exist

✅ **Good:**

```markdown
# SKILL.md

[Core content]

## Additional Resources

### Reference Files

- **`references/patterns.md`** - Detailed patterns
- **`references/advanced.md`** - Advanced techniques

### Examples

- **`examples/script.sh`** - Working example
```

**Why good:** Claude knows where to find additional information

### Mistake 5: Circular References to Wrappers

❌ **Bad:**

```yaml
# In brainstorm/SKILL.md
description: Brainstorming skill. See also: super-brain agent, /rd2:tasks-brainstorm command

## Quick Start
/rd2:brainstorm "Add authentication"  # References command that wraps this skill
Invoke rd2:brainstorm with input      # References agent that wraps this skill
```

**Why bad:** Creates circular dependency. Skill → Command → Skill. Violates "Fat Skills, Thin Wrappers" principle.

✅ **Good:**

```yaml
# In brainstorm/SKILL.md
description: This skill should be used when the user asks to "brainstorm ideas", "explore solutions"...

## Quick Start
Via tasks-brainstorm command: /rd2:tasks-brainstorm "Add authentication"
Or direct invocation by other agents/skills
```

**Why good:** Skill is self-contained. Documents entry points without creating circular references. Wrappers (agent/command) depend on skill, not vice versa.

**Key principle:** Skills are the source of truth. Agents and commands exist to expose skills to different contexts (AI vs human), not to be referenced back from the skill.

For more common mistakes and solutions, see [Common Mistakes](references/common-mistakes.md).

## Claude Search Optimization (CSO)

**Critical for discovery:** Future Claude instances need to FIND your skill among many options.

### Rich Description Field

**Purpose:** Claude reads the description to decide which skills to load. The description must answer: "Should I read this skill right now?"

**CRITICAL: Description = When to Use, NOT What the Skill Does**

The description should ONLY describe triggering conditions. Do NOT summarize the skill's process or workflow.

**Why this matters:** Testing revealed that when a description summarizes the skill's workflow, Claude may follow the description instead of reading the full skill content. This shortcuts the skill's actual guidance.

**Good Examples:**

```yaml
# Triggering conditions only
description: "This skill should be used when the user asks to 'create a hook', 'add a PreToolUse hook', or mentions hook events like 'before tool use' or 'after tool use'."

# Specific error messages as triggers
description: "Use when encountering 'Hook timed out', 'ENOTEMPTY', or when tests are flaky, hanging, or producing zombie processes."
```

**Bad Examples:**

```yaml
# Summarizes workflow (Claude may follow this instead of reading skill)
description: "This skill analyzes the error, identifies the root cause, and applies a fix using the standard debugging pattern."

# Too vague (won't trigger reliably)
description: "Provides guidance for working with hooks."
```

### Keyword Coverage

Include terms users and Claude actually use:

| Category           | Examples                                            |
| ------------------ | --------------------------------------------------- |
| **Error messages** | "Hook timed out", "ENOTEMPTY", "EPERM"              |
| **Symptoms**       | "flaky", "hanging", "zombie", "race condition"      |
| **Synonyms**       | "timeout/hang/freeze", "cleanup/teardown/afterEach" |
| **Tools**          | Actual commands, library names, file types          |

### Token Efficiency Targets

| Skill Type                | Target     | Rationale                       |
| ------------------------- | ---------- | ------------------------------- |
| Getting-started workflows | <150 words | Frequently loaded, must be fast |
| Frequently-loaded skills  | <200 words | Core context budget             |
| Standard skills           | <500 words | Balance detail vs. efficiency   |

**Key principle:** Be discoverable but not bloated. The description loads EVERY time Claude searches for skills.

## Quick Reference

### Minimal Skill

```
skill-name/
└── SKILL.md
```

Good for: Simple knowledge, no complex resources needed

### Standard Skill (Recommended)

```
skill-name/
├── SKILL.md
├── references/
│   └── detailed-guide.md
└── examples/
    └── working-example.sh
```

Good for: Most plugin skills with detailed documentation

### Complete Skill

```
skill-name/
├── SKILL.md
├── references/
│   ├── patterns.md
│   └── advanced.md
├── examples/
│   ├── example1.sh
│   └── example2.json
└── scripts/
    └── validate.sh
```

Good for: Complex domains with validation utilities

For more detailed reference patterns, see [Quick Reference](references/quick-reference.md).

## Configuration

Customize evaluation via `.cc-skills.yaml` in your skill directory:

```yaml
# Dimension weights (must sum to 1.0)
weights:
  security: 0.20
  content: 0.25

# Disable specific rules
disabled_checks:
  - "SEC003" # Allow __import__ for dynamic loading

# Thresholds
thresholds:
  max_skill_lines: 500
  max_description_length: 1024

# Languages to analyze
languages:
  - "python"
  - "javascript"
  - "typescript"
  - "go"
  - "bash"
```

See [Configuration Guide](references/scanner-criteria.md) for all options.
