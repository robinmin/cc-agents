## [0.0.3] - 2026-01-20

### Summary

**cc-agents Meta-Skill: Subagent Creation & Evaluation System**

Introduces the cc-agents meta-skill for creating, evaluating, and refining Claude Code Agent subagents. Implements "Fat Skills, Thin Wrappers" architecture with comprehensive 8-section anatomy, quality assessment protocols, and visual identification through color coding.

### Added

- **cc-agents Meta-Skill** (`skills/cc-agents/`):
  - **SKILL.md** (298 lines): Complete subagent creation workflow with 8-section anatomy
  - **references/colors.md** (420 lines): Comprehensive color reference for subagent identification
  - **references/agent-anatomy.md**: Detailed 8-section structure documentation
  - **references/evaluation-criteria.md**: Quality assessment dimensions and scoring
  - **assets/agent-template.md**: Production-ready agent template

- **New Subagents** (`agents/`):
  - **agent-doctor.md** (~120 lines, color: crimson): Evaluates agent quality against 8-section anatomy
  - **agent-expert.md** (~142 lines, color: electric blue): Creates/refines production-ready agents

- **New Slash Commands** (`commands/`):
  - **agent-add.md**: Human-friendly wrapper for adding new subagents
  - **agent-refine.md**: Human-friendly wrapper for refining existing subagents
  - **agent-evaluate.md**: Human-friendly wrapper for evaluating agent quality

- **Color Guidelines** (cc-agents/SKILL.md):
  - Subagent-specific color suggestions for visual identification
  - Reference to local colors.md (no network access required)

### Changed

- **Existing Subagents Refactored** (Fat Skills, Thin Wrappers):
  - **skill-doctor.md**: 358 → 115 lines (-68%), color: lavender
  - **skill-expert.md**: 382 → 122 lines (-68%), color: teal
  - All detailed knowledge moved to cc-skills2 skill
  - Agents now delegate to skills for domain knowledge

- **cc-skills2/SKILL.md**:
  - Removed "Color Selection for Subagents" section (moved to cc-agents)
  - Colors are subagent-specific, not skill-specific

### Architecture

**Fat Skills, Thin Wrappers Pattern:**

```
┌─────────────────────────────────────────────────────────────┐
│                        Skills (Fat)                         │
│  - All domain knowledge, workflows, evaluation criteria    │
│  - cc-skills2: Skill creation meta-skill                   │
│  - cc-agents: Subagent creation meta-skill                 │
└─────────────────────────────────────────────────────────────┘
                            ↓ delegates to
┌─────────────────────────────────────────────────────────────┐
│                    Agents/Commands (Thin)                  │
│  - ~50-150 lines each                                      │
│  - Minimal wrappers that invoke skills                     │
│  - skill-doctor/expert, agent-doctor/expert                │
└─────────────────────────────────────────────────────────────┘
```

**Token Efficiency Results:**
| Agent | Before | After | Reduction |
|-------|--------|-------|-----------|
| skill-doctor | 358 lines | 115 lines | -68% |
| skill-expert | 382 lines | 122 lines | -68% |

### Quality Improvements

- **Consistent Architecture**: All subagents follow same "Fat Skills, Thin Wrappers" pattern
- **Visual Identification**: Unique colors for each subagent type
- **Knowledge Centralization**: Domain knowledge lives in skills, not duplicated in agents
- **Local References**: Color reference available offline (no network dependency)

### References

- Task: [0039_build_new_skills_cc-agents.md](docs/prompts/0039_build_new_skills_cc-agents.md)
- Color Reference: [htmlcolorcodes.com](https://htmlcolorcodes.com/colors/)

---

## [0.0.2] - 2026-01-20

### Summary

**cc-skills2 Meta-Skill: Comprehensive Security Scanning & Skill Quality Assessment**

Major update to the cc-skills2 meta-skill introducing comprehensive security rule system (48 rules), configuration management with fallback, enhanced content evaluation, and significant token efficiency improvements through progressive disclosure.

### Added

- **Enhanced Security Rule System** (`scripts/skills.py`):
  - 48 built-in security rules across 2 categories:
    - **SECURITY** (SEC001-SEC048): Code injection, command execution, file operations, sensitive file access, web downloads, download+execute patterns
    - **FILE_SYSTEM** (SEC013-SEC019): Dangerous file removal operations (shutil.rmtree, os.remove, os.unlink, Path.rmdir, Path.unlink)
  - **Sensitive File Access Detection** (SEC020-SEC029): .env files, ~/.ssh/, ~/.aws/, /etc/passwd, credential files
  - **Web Download Detection** (SEC030-SEC048): urllib, requests, fetch, axios, http.Get, download+execute patterns (curl|sh, wget|bash), package installation from URLs
  - **Regex Pattern Matching**: New pattern type for string-based detection alongside AST-based patterns
  - **False Positive Filtering**: Skips rule definition lines and framework files during security scanning

- **Configuration Management** (`scripts/skills.py`, `scripts/.cc-skills.yaml`):
  - **Default Configuration**: New `scripts/.cc-skills.yaml` with dimension weights, disabled checks, thresholds, supported languages
  - **4-Level Priority Loading**: CC_SKILLS_CONFIG env var → skill/.cc-skills.yaml → skill/.cc-skills2.yaml → scripts/.cc-skills.yaml
  - **User Warnings**: INFO/WARNING messages when using fallback configurations
  - **Custom Config Support**: Users can override dimension weights (e.g., security: 0.35)

- **Dependency Checking** (`scripts/skills.py`):
  - **check_dependencies()** function at main() entry point
  - Optional dependencies detected: PyYAML (YAML parsing), ast-grep (TS/JS/Go scanning)
  - Clear warnings with fallback functionality explained
  - Non-blocking: script continues with reduced functionality

- **Enhanced Content Evaluator** (`scripts/evaluators/content.py`):
  - **Simple Tool Detection**: Single-action tools (convert, extract, format, etc.) can skip workflow sections
  - **External-Only Workflow Detection**: Penalizes skills that only reference external files (-2.0 penalty)
  - **Nuanced Workflow Checks**: Distinguishes simple tools from complex skills
  - **Workflow Quality Assessment**: Checks for substantive steps, checklists, feedback loops in SKILL.md

- **New Reference Files** (`references/`):
  - **skill-creation.md** (308 lines): Detailed 8-step skill creation workflow
  - **anatomy.md** (268 lines): Complete skill structure documentation

- **Bash Language Support**: Added bash to default supported languages in `scripts/.cc-skills.yaml`

### Changed

- **Security Evaluator Integration** (`scripts/evaluators/security.py`):
  - Updated to use new `evaluate_rules()` function with all 48 security rules
  - Fixed critical bug where new rules weren't being used during evaluation
  - Replaced old `find_dangerous_calls_ast()` call with comprehensive rules system
  - Added false positive filtering for rule definition lines

- **YAML Parser Enhancement** (`scripts/skills.py`):
  - Rewrote `parse_simple_yaml()` to handle nested structures without PyYAML
  - Stack-based indentation tracking for nested dicts
  - Inline comment stripping (e.g., `security: 0.20 # comment`)
  - Type conversion for bool, int, float, scientific notation, null
  - Fixed config loading bug where custom configs were ignored

- **SKILL.md Optimization** (`plugins/rd2/skills/cc-skills2/SKILL.md`):
  - **Token Efficiency**: 44% line reduction (408 → 229 lines), 59% word reduction (2774 → 1151 words)
  - **Progressive Disclosure**: Moved detailed content to reference files
  - **Enhanced Workflows Section**: Checklists, feedback loops, conditional patterns
  - **Quality Standards Table**: All 7 evaluation dimensions documented
  - **Configuration Section**: Example .cc-skills.yaml with usage

- **Updated Documentation**:
  - **user-manual-cc-skills2.md**: Added supported languages (python, javascript, typescript, go, bash), enabled/disabled rules tables
  - **spec-cc-skills2.md**: Added rules system documentation with categories, pattern types, built-in rules summary
  - **assets/skill-template.md**: Modernized with workflow patterns, validation checklist

- **Fixed "No obvious security issues" Contradiction**: Updated condition in security.py to properly detect SECURITY findings

### Technical Details

**Rules System Architecture:**

```python
Rule(
    id="SEC001",
    category=RuleCategory.SECURITY,
    severity=Severity.ERROR,
    pattern_type=PatternType.AST,  # or AST_GREP, REGEX
    pattern="eval|exec",
    message="Avoid eval() and exec() - code injection risk",
    languages=["python", "javascript", "typescript"],
)
```

**Configuration Loading Priority:**

```
1. CC_SKILLS_CONFIG environment variable (full path)
2. .cc-skills.yaml or .cc-skills2.yaml in skill directory
3. scripts/.cc-skills.yaml (default fallback)
```

**Token Efficiency Results:**
| Component | Before | After | Reduction |
|-----------|--------|-------|-----------|
| SKILL.md lines | 408 | 229 | 44% |
| SKILL.md words | 2,774 | 1,151 | 59% |
| Estimated tokens | ~4,994 | ~1,770 | 65% |

### Quality Improvements

- **Self-Evaluation (Dogfooding)**: Grade A (9.43/10) → Grade A (9.90/10)
- **Workflow Quality**: Enhanced with checklists and feedback loops
- **Simple Tool Support**: Single-action tools no longer penalized for missing workflow sections
- **Security Coverage**: 48 rules covering code injection, file operations, web downloads, sensitive file access

### References

- [Claude Code Agent Skills](https://code.claude.com/docs/en/skills)
- [Skill Authoring Best Practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
