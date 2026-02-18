---
name: cc-skills
description: "This skill should be used when the user asks to 'create a skill', 'write SKILL.md', 'evaluate skill quality', 'package a skill', 'initialize a new skill', or mentions skill development. Use this skill when building Claude Code agents, commands, or plugins. It helps fix errors like 'invalid skill structure', 'missing SKILL.md', 'script failed', 'command timeout', or 'tool exception'. Includes scripts for skill creation, validation, and evaluation. Examples: 'add script', 'build command', 'create agent'."
---

# cc-skills: Claude Code Meta Skills

**Create** Agent skills that extend AI capabilities. **Build** skills using proven patterns. **Package** skills for distribution.

## When to Use

**Activate** this skill when users ask about creating, writing, evaluating, or packaging skills.
**Trigger** on phrases like "create a skill", "write SKILL.md", "evaluate skill quality".
**Use** for skill development tasks.

## Quick Start

**Run** these commands to start:
**Initialize** new skills with the `init` command.
**Validate** structure with `skills.py validate`.
**Evaluate** quality with `skills.py evaluate`.
**Package** skills with `skills.py package`.
**Test** skills in `tests/` directory.
**Check** triggers in `SKILL.md`.
**Create** first skill structure.
**Write** SKILL.md content.
**Add** scripts for functionality.
**Run** `skills.py init` for new skills.
**Use** `scripts/skills.py` for operations.
```bash
# Initialize a new skill
python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py init my-skill --path ${CLAUDE_PLUGIN_ROOT}/skills

# Validate structure
python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py validate ${CLAUDE_PLUGIN_ROOT}/skills/my-skill

# Evaluate quality
python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py evaluate ${CLAUDE_PLUGIN_ROOT}/skills/my-skill

# Package for distribution
python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py package ${CLAUDE_PLUGIN_ROOT}/skills/my-skill
```

## Follow These Principles

**Create** skills with all core logic, workflows, and domain knowledge.
**Use** hyphen-case for skill names.
**Apply** progressive disclosure in content.
**Follow** evaluation-first development.
**Keep** SKILL.md under 3000 tokens.
**Run** `skills.py evaluate` for quality checks.
**Keep** commands (~50 lines) thin - invoke skills for human users.
**Keep** agents (~100 lines) thin - invoke skills for AI workflows.

**Design** skill content in layers:
1. **Load** metadata always (~100 words)
2. **Load** SKILL.md when triggered (target <3000 tokens)
3. **Load** references for details

**Apply** evaluation-first development:
1. **Run** evaluation
2. **Analyze** gaps
3. **Write** code
4. **Iterate**

**See** [Best Practices](references/best-practices.md) for details.

## Select Skill Type

**Choose** the right skill type:

| Type | Use When | Structure |
|------|----------|-----------|
| Technique | **Follow** concrete steps | Use Steps, code, mistakes |
| Pattern | **Think** about problems | Use Principles, when/when-not |
| Reference | **Look** up APIs/docs | Use Tables, searchable |

**Apply** this decision tree:
1. **Has steps?** → Technique
2. **Mental model?** → Pattern
3. **Lookup data?** → Reference
**Identify** core use case first.
**Match** type to your content.
**Refine** as skill evolves.
**Create** Technique skills for `Step-by-step` workflows.
**Design** Pattern skills for `Decision` frameworks.
**Build** Reference skills for `Lookup` tables.
**Select** skill type based on `SKILL.md` content.
**Use** `references/` directory for detailed docs.
**Determine** skill type early.
**Plan** skill structure accordingly.
**Select** appropriate template.

## Examples

**Add** working examples demonstrating core functionality:
```python
# Validate skill structure
def validate_skill(path: Path) -> bool:
    """Return True if skill has required structure."""
    return (path / "SKILL.md").exists()

# Parse frontmatter
def parse_frontmatter(content: str) -> dict:
    """Extract YAML frontmatter from markdown."""
    import re
    match = re.match(r'^---\n(.+?)\n---', content, re.DOTALL)
    return {"raw": match.group(1)} if match else {}
```
```bash
# Run evaluation
python3 skills.py evaluate ./my-skill
```

**Show** common patterns.
**Demonstrate** error handling.
**Include** edge cases.
**Use** `Path` from `pathlib` for file operations.
**Return** dict from parsing functions.
**Add** code examples in SKILL.md.
**Write** functional code snippets.
**Test** examples before publishing.
**Verify** examples work correctly.

# Check results
echo $?
```

## Create Directory Structure

**Create** this structure:
```
skill-name/
├── SKILL.md (required)
├── scripts/     - Executable code
├── references/  - Documentation
└── assets/     - Output files
```

**Add** `scripts/` for core functionality.
**Include** `references/` for detailed docs.
**Create** `assets/` folder for outputs.
**Verify** structure with `skills.py validate`.
**Organize** code in modular `scripts/`.
**Separate** concerns across files.
**Document** each script's purpose with `docstring`.
**Use** `__init__.py` to mark packages.
**Build** initial skill structure first.
**Add** content to SKILL.md.
**Configure** required directories.
**Prepare** test files early.

**See** [Skill Anatomy](references/anatomy.md) for complete details.

## Run Quality Assessment

**Execute** evaluation to check skill quality:
```bash
python3 skills.py evaluate <skill-path>
```

**Review** assessment covers: `Frontmatter`, `Content`, `Security`, `Structure`, `Efficiency`, `Best Practices`, `Code Quality`, `Trigger Design`, `Behavioral`, `Value Add`.

**Apply** fixes from recommendations.
**Run** `python3 skills.py validate` for structure checks.
**Use** `skills.py evaluate` for quality scoring.

**See** [Validation Checklist](references/validation-checklist.md) for criteria.

## Avoid Common Mistakes

**Prevent** these issues:
1. **Write** specific "when to use" examples - avoid weak triggers
2. **Never** reference skill's own agents/commands - avoid circular references
3. **Keep** SKILL.md under 5000 tokens - avoid bloating
**Test** triggers with actual invocations.
**Document** edge cases explicitly.

**See** [Common Mistakes](references/common-mistakes.md) for patterns to avoid.

## Write Using Imperative Form

**Follow** these rules:
- **Use** "Create X", not "You should create X"
- **Use** third-person description: "This skill should be used when..."
- **Remove** hedging: Avoid uncertain language
- **Write** actionable steps: "Run command X", "Call function Y"
**Create** clear section headers.
**Use** bold for key terms.
**Add** code examples in backticks.
**Write** concise sentences.
**Apply** active voice.
**Write** SKILL.md content first.
**Check** frontmatter for accuracy.
**Run** evaluation after changes.
**Apply** fixes from report.

**Apply** Writing Style Guide from [references/writing-style.md](references/writing-style.md).

## Handle Errors and Edge Cases

**Wrap** I/O operations in try/except blocks.
**Log** errors with `logging` module.
**Catch** specific exceptions, not bare `except`.
**Raise** `ValueError` for invalid input.
**Handle** null or empty inputs.
**Handle** large files or data.
**Handle** network timeouts.
**Use** `pathlib.Path` for file operations.

**See** [Best Practices](references/best-practices.md) for patterns.

## Implement Security Measures

**Apply** these security practices:
- **Validate** input: Sanitize all user inputs, file paths, and external data
- **Never** hardcode API keys, passwords, or tokens
- **Prevent** path traversal, avoid `../` in user inputs
- **Never** construct shell commands from untrusted input
- **Protect** data: Don't log or expose sensitive information
**Audit** code for vulnerabilities.
**Scan** dependencies for known issues.
**Use** environment variables for secrets.
**Apply** principle of least privilege.
**Encrypt** sensitive data at rest.
**Verify** external API responses.
**Use** `os.environ` for API keys.
**Avoid** `eval()` or `exec()`.
**Sanitize** file paths with `pathlib`.

**Follow** guidelines from [Security](references/security.md).

## Maintain Code Quality

**Write** scripts with these standards:
- **Add** type hints: Use Python type hints for all function signatures
- **Wrap** I/O: Use try/except for file operations and API calls
- **Document** functions: Include docstrings for all public functions
- **Name** properly: Use UPPER_SNAKE_CASE for constants, lowercase for variables
- **Apply** single responsibility: Make each function do one thing
**Refactor** complex functions into smaller units.
**Lint** code with `flake8` or `ruff`.
**Format** code with `black` or `ruff format`.
**Review** pull requests before merging.
**Test** edge cases thoroughly.
**Use** `pytest` for testing.
**Add** `if __name__ == "__main__":` guard.
**Import** modules with absolute paths.
**Configure** `pyproject.toml` for project metadata.
**Write** clean, readable code.
**Add** docstrings to functions.
**Check** type hints regularly.

## Optimize for Efficiency

**Keep** SKILL.md efficient:
- **Target** under 3000 tokens for metadata + essential content
- **Move** detailed docs to `references/` directory
- **Use** tables for structured data
- **Link** to external docs instead of copying
- **Apply** progressive disclosure
**Measure** token count with `tokenizer`.
**Prune** redundant content.
**Split** large sections into `references/`.
**Combine** related concepts.
**Optimize** token usage per section.
**Use** `scripts/` for code execution.

**Follow** guidelines from [references/best-practices.md](references/best-practices.md).

## Follow Naming Conventions

**Apply** these standards:
- **Use** hyphen-case for skill names: `code-review`, `image-generating`
- **Write** specific trigger descriptions with "when to use" examples
- **Never** create circular references
- **Track** versions with semantic versioning
**Match** naming across `SKILL.md` and `scripts/`.
**Align** command and skill names.
**Use** `verb-noun` pattern for commands.
**Apply** `skill-name` format for skills.

**Apply** conventions from [Best Practices](references/best-practices.md).

## Apply Testing

**Add** tests for scripts in `tests/` directory:
- **Write** unit tests for core functions
- **Test** edge cases and error handling
- **Verify** with `python3 -m pytest tests/`
- **Test** skill triggers: Verify skill activates with correct inputs
**Run** tests in CI/CD pipelines.
**Measure** code coverage with `pytest-cov`.
**Mock** external dependencies using `unittest.mock`.
**Use** fixtures for test data.
**Automate** test execution in `GitHub Actions`.
**Integrate** testing into workflow with `tox`.
**Configure** `pytest.ini` for test discovery.

**Apply** testing patterns from [TDD for Skills](references/tdd-for-skills.md).

## Additional Resources

**Explore** all reference materials in `references/` directory.
**Apply** best practices consistently.
**Read** documentation thoroughly.
**Follow** best practices guide.
**Check** examples for patterns.
**Use** templates from `references/`.
**Read** `references/best-practices.md` first.
**Check** `references/evaluation.md` for scoring.
**Use** provided templates in `references/`.

- **Use** [Best Practices](references/best-practices.md) - Comprehensive guidance
- **Use** [Workflows](references/workflows.md) - Multi-step patterns
- **Use** [Security](references/security.md) - Safety guidelines
- **Use** [Evaluation](references/evaluation.md) - Quality assessment
- **Check** `references/` for detailed documentation
- **Use** [TDD for Skills](references/tdd-for-skills.md) - Testing methodology
