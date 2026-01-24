---
name: cc-skills
description: "Meta-skill for creating effective Agent skills. Use when: building new skills, writing SKILL.md files, designing workflow automation, packaging skills for distribution, or refining existing skills with specialized knowledge and tool integrations. Follows progressive disclosure, evaluation-first development, and plugin-based quality assessment."
---

# cc-skills: Claude Code Meta Skills V2

## Overview

Create Agent skills that extend AI capabilities with specialized knowledge, workflows, and tools. Use this skill when building new skills, writing SKILL.md files, or packaging skills for distribution.

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

Use this checklist workflow:

**Task Progress:**

- [ ] **Step 1: Gather requirements** - Collect concrete usage examples from user
- [ ] **Step 2: Plan resources** - Identify scripts/references/assets needed
- [ ] **Step 3: Initialize** - Run `python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py init <name> --path ${CLAUDE_PLUGIN_ROOT}/skills`
- [ ] **Step 4: Implement resources** - Create and test scripts, write SKILL.md
- [ ] **Step 5: Validate** - Run `python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py validate ${CLAUDE_PLUGIN_ROOT}/skills/<skill-name>`
- [ ] **Step 6: Evaluate** - Run `python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py evaluate ${CLAUDE_PLUGIN_ROOT}/skills/<skill-name>`
- [ ] **Step 7: Iterate** - Address findings, re-evaluate until Grade A/B
- [ ] **Step 8: Package** - Run `python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py package ${CLAUDE_PLUGIN_ROOT}/skills/<skill-name>`

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

**Important:** Do NOT include extraneous files at the skill level (README.md, INSTALLATION_GUIDE.md).
CHANGELOG.md files are acceptable at the plugin level but not within individual skill directories.

For complete anatomy details, see [Skill Anatomy Reference](references/anatomy.md).

## Quality Standards

Skills are evaluated across 7 dimensions:

| Dimension      | Weight | What It Measures                               |
| -------------- | ------ | ---------------------------------------------- |
| Frontmatter    | 10%    | YAML validity, required fields                 |
| Content        | 25%    | Length, sections, examples                     |
| Security       | 20%    | AST-based dangerous pattern detection          |
| Structure      | 15%    | Directory organization, progressive disclosure |
| Efficiency     | 10%    | Token count, file sizes                        |
| Best Practices | 10%    | Naming conventions, guidance                   |
| Code Quality   | 10%    | Error handling, type hints                     |

Run `python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py evaluate ${CLAUDE_PLUGIN_ROOT}/skills/<skill-name>` to assess quality.

## Best Practices

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

| Component | Naming Pattern | Example |
|-----------|---------------|---------|
| Slash Command | `verb-noun` | `code-review` |
| Slash Command (grouped) | `noun-verb` | `agent-add`, `agent-evaluate`, `agent-refine` (groups related commands) |
| Skill | `verb-ing-noun` | `reviewing-code` |
| Subagent | `role-agent` | `code-reviewer-agent` |

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

**Example correct pattern:**
```yaml
# agents/orchestrator.md
---
name: orchestrator
skills:
  - research
  - writing
context: fork
---
```

### Writing Guidelines

- **Use imperative/infinitive form** ("Create X", not "Creates X")
- **Frontmatter description**: Include BOTH what the skill does AND when to use it. This is Claude's primary trigger mechanism.
- **Body**: Focus on procedural instructions and workflow guidance. Move reference material to `references/` files.

### Common Patterns

See detailed guides in `references/`:

- **Comprehensive best practices**: [best_practices.md](references/best_practices.md)
- **Multi-step workflows**: [workflows.md](references/workflows.md)
- **Output formats**: [output-patterns.md](references/output-patterns.md)
- **Security guidelines**: [security.md](references/security.md)
- **Evaluation methodology**: [evaluation.md](references/evaluation.md)

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
