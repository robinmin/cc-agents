# cc-skills User Manual

Meta-skill for creating Agent skills with progressive disclosure, evaluation-first development, and plugin-based quality assessment.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Overview](#overview)
- [Available Commands](#available-commands)
- [Slash Commands](#slash-commands)
- [Subagents](#subagents)
- [Usage Examples](#usage-examples)
- [Configuration](#configuration)
- [Supported Languages and Default Rules](#supported-languages-and-default-rules)
- [Advanced Usage](#advanced-usage)

---

## Quick Start

### Installation

The cc-skills skill is located at:
```
plugins/rd2/skills/cc-skills/
```

### Basic Usage

```bash
# Change to the plugin directory
cd plugins/rd2/skills/cc-skills

# Run commands
python3 scripts/skills.py <command> [options]
```

### Create Your First Skill

```bash
# Initialize a new skill
python3 scripts/skills.py init my-awesome-skill --path ./skills

# Validate it
python3 scripts/skills.py validate ./skills/my-awesome-skill

# Evaluate quality
python3 scripts/skills.py evaluate ./skills/my-awesome-skill
```

---

## Overview

cc-skills is a **meta-skill** - a skill for creating skills. It provides:

- **Skill Initialization**: Scaffold new skills with best-practice structure
- **Validation**: Structural validation for required files and frontmatter
- **Quality Assessment**: 7-dimension evaluation with AST-based security scanning
- **Packaging**: Bundle skills for distribution

### Key Concepts

**Fat Skills, Thin Wrappers**
- Skills should be "fat" (rich content) not "thin" (minimal wrappers)
- Prefer comprehensive documentation over minimal guidance
- See: `references/workflows.md` for architecture patterns

**Progressive Disclosure**
- Level 1: Metadata (name + description) - always loaded (~100 words)
- Level 2: SKILL.md body - when skill triggers (<5k words)
- Level 3: Bundled resources - as needed (unlimited)

**Evaluation-First Development**
- Test without skill → Document gaps → Write ONLY what addresses gaps
- Iterate until baseline achieved, then ship
- See: `references/evaluation.md` for complete methodology

---

## Available Commands

### init

Initialize a new skill directory with template structure.

```bash
python3 scripts/skills.py init <skill-name> --path <path>
```

**Arguments:**
- `skill-name`: Name for the skill (hyphen-case, max 64 chars)
- `--path`: Parent directory for the skill (default: `./skills`)

**Creates:**
```
skill-name/
├── SKILL.md          # Main skill file
├── scripts/
│   └── __init__.py
└── references/
    └── best_practices.md
```

**Example:**
```bash
python3 scripts/skills.py init pdf-processing --path ./skills
```

### validate

Validate a skill's structural requirements.

```bash
python3 scripts/skills.py validate <skill-path>
```

**Checks:**
- SKILL.md exists
- Valid YAML frontmatter
- Required fields (name, description)
- No unresolved TODO placeholders
- Allowed properties only

**Exit codes:**
- `0` - Validation passed
- `1` - Validation failed

**Example:**
```bash
python3 scripts/skills.py validate ./skills/my-skill
```

### evaluate

Evaluate skill quality across 7 dimensions.

```bash
python3 scripts/skills.py evaluate <skill-path> [--format FORMAT]
```

**Arguments:**
- `skill-path`: Path to skill directory

**Options:**
- `--format`: Output format (`text`, `json`, `markdown`) - default: `text`

**Dimensions:**
| Dimension | Weight | What It Measures |
|-----------|--------|------------------|
| Frontmatter | 10% | YAML validity, required fields |
| Content | 25% | Length, sections, examples |
| Security | 20% | AST-based dangerous pattern detection |
| Structure | 15% | Directory organization, progressive disclosure |
| Efficiency | 10% | Token count, file sizes |
| Best Practices | 10% | Naming conventions, guidance |
| Code Quality | 10% | Error handling, type hints |

**Grading Scale:**
- **A**: 9.0-10.0 (Production ready)
- **B**: 7.0-8.9 (Minor fixes needed)
- **C**: 5.0-6.9 (Moderate revision)
- **D**: 3.0-4.9 (Major revision)
- **F**: 0.0-2.9 (Rewrite needed)

**Examples:**
```bash
# Text output (default)
python3 scripts/skills.py evaluate ./skills/my-skill

# JSON output
python3 scripts/skills.py evaluate ./skills/my-skill --format json

# Markdown output
python3 scripts/skills.py evaluate ./skills/my-skill --format markdown
```

### package

Package a skill for distribution.

```bash
python3 scripts/skills.py package <skill-path> [output-dir]
```

**Arguments:**
- `skill-path`: Path to skill directory
- `output-dir`: Output directory for zip file (default: `./dist`)

**Creates:**
- `skill-name.zip` containing all skill files

**Example:**
```bash
python3 scripts/skills.py package ./skills/my-skill ./dist
```

---

## Slash Commands

cc-skills provides a skill for creating skills, which can be invoked via Claude Code's slash command system.

### /skill-add

Create a new Agent skill with best-practice structure.

**Usage:**
```
/skill-add <skill-name>
```

**What it does:**
1. Prompts for skill description and use cases
2. Creates SKILL.md with proper frontmatter
3. Sets up directory structure (scripts/, references/)
4. Adds best practices reference
5. Runs initial validation

**Example:**
```
/skill-add pdf-helper
```

### /skill-evaluate

Evaluate an existing skill's quality.

**Usage:**
```
/skill-evaluate <skill-path>
```

**What it does:**
1. Runs full 7-dimension quality assessment
2. Displays scores and grade
3. Shows findings and recommendations
4. Provides actionable improvement steps

**Example:**
```
/skill-evaluate ./skills/my-skill
```

---

## Subagents

cc-skills integrates with several specialized subagents for advanced workflows.

### task-decomposition-expert

Break down complex skill development into manageable tasks.

**When to use:**
- Creating multi-section skills
- Planning skill reorganizations
- Designing reference hierarchies

**Example workflow:**
```
User: "Help me create a comprehensive Git workflow skill"
→ task-decomposition-expert breaks down into:
   1. Core Git commands section
   2. Branching strategies reference
   3. Conflict resolution workflows
   4. Team collaboration patterns
```

### agent-browser

Browse and analyze existing skills for patterns.

**When to use:**
- Researching skill structure patterns
- Analyzing progressive disclosure approaches
- Finding reference organization strategies

### rd:super-coder

Implement skill changes with TDD methodology.

**When to use:**
- Adding new sections to SKILL.md
- Creating utility scripts
- Implementing validation tools

---

## Usage Examples

### Example 1: Create a PDF Processing Skill

```bash
# Step 1: Initialize
python3 scripts/skills.py init pdf-processing --path ./skills

# Step 2: Edit SKILL.md with your content
vim ./skills/pdf-processing/SKILL.md

# Step 3: Validate structure
python3 scripts/skills.py validate ./skills/pdf-processing

# Step 4: Evaluate quality
python3 scripts/skills.py evaluate ./skills/pdf-processing

# Step 5: Iterate based on findings
# (Edit SKILL.md based on recommendations)

# Step 6: Re-evaluate
python3 scripts/skills.py evaluate ./skills/pdf-processing

# Step 7: Package for distribution
python3 scripts/skills.py package ./skills/pdf-processing ./dist
```

### Example 2: Evaluate with JSON Output

```bash
# Get machine-readable output
python3 scripts/skills.py evaluate ./skills/my-skill --format json > results.json

# Parse with jq
jq '.overall_score' results.json
jq '.dimensions[] | select(.score < 7.0)' results.json
```

### Example 3: Integration with CI/CD

```bash
# In your CI pipeline
python3 scripts/skills.py validate ./skills/my-skill
if [ $? -eq 0 ]; then
    python3 scripts/skills.py evaluate ./skills/my-skill --format json
fi
```

---

## Configuration

### Config File (.cc-skills.yaml)

Create `.cc-skills.yaml` in your project root for custom settings:

```yaml
# Dimension weights (must sum to 1.0)
weights:
  frontmatter: 0.10
  content: 0.25
  security: 0.20
  structure: 0.15
  efficiency: 0.10
  best_practices: 0.10
  code_quality: 0.10

# Disabled checks
disabled_checks:
  - "line-length-check"  # Example: disable specific checks

# Thresholds
thresholds:
  max_skill_lines: 500
  max_description_length: 1024

# Supported languages
languages:
  - "python"
  - "javascript"
  - "typescript"
```

### Environment Variables

- `CC_SKILLS_CONFIG`: Path to custom config file
- `CC_SKILLS_CACHE_DIR`: Custom cache directory
- `CC_SKILLS_OUTPUT_FORMAT`: Default output format

---

## Supported Languages and Default Rules

### Supported Languages

cc-skills supports security scanning and code quality analysis for the following programming languages:

| Language | Support Level | Analysis Method |
|----------|---------------|-----------------|
| **Python** | Full support | Native AST parsing + ast-grep patterns |
| **TypeScript** | Full support | ast-grep patterns |
| **JavaScript** | Full support | ast-grep patterns |
| **Go** | Full support | ast-grep patterns |
| **Bash** | Limited | Basic file detection only |

**Note:** Python has the most comprehensive analysis with both native AST parsing and ast-grep pattern matching. Other languages rely on ast-grep for pattern-based detection.

### Default Rules (All Enabled by Default)

All built-in rules are **enabled by default**. The `disabled_checks` configuration is an empty list unless you explicitly add rule IDs to disable.

#### Security Rules (SEC001-SEC012)

| Rule ID | Pattern | Severity | Languages | Description |
|---------|---------|----------|-----------|-------------|
| SEC001 | `eval($$$)` | ERROR | Python | Code injection risk |
| SEC002 | `exec($$$)` | ERROR | Python | Code injection risk |
| SEC003 | `__import__($$$)` | WARNING | Python | Dynamic import risk |
| SEC004 | `os.system($$$)` | ERROR | Python | Command injection risk |
| SEC005 | `os.popen($$$)` | ERROR | Python | Command injection risk |
| SEC006 | `pickle.loads($$$)` | ERROR | Python | Arbitrary code execution risk |
| SEC007 | `eval($$$)` | ERROR | TS/JS | Code injection risk |
| SEC008 | `new Function($$$)` | ERROR | TS/JS | Code injection risk |
| SEC009 | `innerHTML = $$$` | WARNING | TS/JS | XSS risk |
| SEC010 | `dangerouslySetInnerHTML` | WARNING | TS/JS | XSS risk |
| SEC011 | `exec.Command($$$)` | WARNING | Go | Command injection risk |
| SEC012 | `os.Exec($$$)` | WARNING | Go | Command injection risk |

#### Network Download Rules (SEC030-SEC035)

| Rule ID | Pattern | Severity | Languages | Description |
|---------|---------|----------|-----------|-------------|
| SEC030 | `urllib.request.urlopen($$$)` | WARNING | Python | Downloading content from URL |
| SEC031 | `requests.get($$$)` | WARNING | Python | Downloading content from URL |
| SEC032 | `httpx.get($$$)` | WARNING | Python | Downloading content from URL |
| SEC033 | `fetch($$$)` | WARNING | TS/JS | Downloading content from URL |
| SEC034 | `axios.get($$$)` | WARNING | TS/JS | Downloading content from URL |
| SEC035 | `http.Get($$$)` | WARNING | Go | Downloading content from URL |

#### Download + Execute Rules (SEC036-SEC043)

| Rule ID | Pattern | Severity | Languages | Description |
|---------|---------|----------|-----------|-------------|
| SEC036 | `curl.*\|.*sh` | ERROR | All | curl piped to shell |
| SEC037 | `wget.*\|.*sh` | ERROR | All | wget piped to shell |
| SEC038 | `curl.*\|.*bash` | ERROR | All | curl piped to bash |
| SEC039 | `wget.*\|.*bash` | ERROR | All | wget piped to bash |
| SEC040 | `exec(.*urlopen` | ERROR | Python | exec() with downloaded content |
| SEC041 | `exec(.*requests\.get` | ERROR | Python | exec() with downloaded content |
| SEC042 | `eval(.*urlopen` | ERROR | Python | eval() with downloaded content |
| SEC043 | `eval(.*fetch\(` | ERROR | TS/JS | eval() with downloaded content |

#### Package Installation Rules (SEC044-SEC048)

| Rule ID | Pattern | Severity | Languages | Description |
|---------|---------|----------|-----------|-------------|
| SEC044 | `pip install.*http://` | ERROR | All | pip install from HTTP (insecure) |
| SEC045 | `pip install.*https://` | WARNING | All | pip install from HTTPS URL |
| SEC046 | `subprocess.*pip install.*http` | WARNING | Python | subprocess pip install from URL |
| SEC047 | `npm install.*http://` | ERROR | All | npm install from HTTP (insecure) |
| SEC048 | `npm install.*git+` | WARNING | All | npm install from git URL |

#### File System Rules - Dangerous Removal Operations (SEC013-SEC019)

| Rule ID | Pattern | Severity | Languages | Description |
|---------|---------|----------|-----------|-------------|
| SEC013 | `shutil.rmtree($$$)` | ERROR | Python | Recursive directory deletion |
| SEC014 | `os.remove($$$)` | ERROR | Python | File deletion |
| SEC015 | `os.unlink($$$)` | ERROR | Python | File deletion |
| SEC016 | `os.rmdir($$$)` | ERROR | Python | Directory deletion |
| SEC017 | `fs.rm($$$)` | ERROR | TS/JS | File/directory removal |
| SEC018 | `fs.unlink($$$)` | ERROR | TS/JS | File deletion |
| SEC019 | `os.RemoveAll($$$)` | ERROR | Go | Recursive directory removal |

#### File System Rules - Sensitive File Access (SEC020-SEC029)

| Rule ID | Pattern | Severity | Languages | Description |
|---------|---------|----------|-----------|-------------|
| SEC020/021 | `".env"` / `'.env'` | WARNING | All | .env file may contain credentials |
| SEC022/023 | `"/.ssh/"` | WARNING | All | SSH directory may contain private keys |
| SEC024/025 | `"/.aws/"` | WARNING | All | AWS directory may contain credentials |
| SEC026/027 | `"/.config/"` | WARNING | All | Config directory may contain sensitive data |
| SEC028/029 | `"/etc/passwd"` | ERROR | All | System file access |

#### Code Quality Rules (Q001)

| Rule ID | Pattern | Severity | Languages | Description |
|---------|---------|----------|-----------|-------------|
| Q001 | `except:` | WARNING | Python | Bare except catches all exceptions including SystemExit |

### Disabling Specific Rules

To disable specific rules, add their IDs to your `.cc-skills.yaml`:

```yaml
# Disable specific security checks
disabled_checks:
  - "SEC003"  # Allow __import__ for dynamic loading
  - "SEC009"  # Allow innerHTML in specific cases
  - "Q001"    # Allow bare except handlers
```

### Tool Boundaries

**What cc-skills CAN do:**
- Scan Python, TypeScript, JavaScript, and Go code for security patterns
- Detect dangerous function calls (eval, exec, os.system, etc.)
- Detect file system operations (file deletion, directory removal)
- Detect sensitive file access patterns (.env, ~/.ssh/, ~/.aws/, /etc/passwd)
- Detect web downloads (urllib, requests, fetch, axios, http.Get)
- Detect download+execute patterns (curl|sh, wget|bash, exec(urlopen()))
- Detect package installations from external URLs (pip install http://, npm install git+)
- Validate YAML frontmatter syntax and required fields
- Analyze skill structure and content quality
- Check for best practices violations (naming, TODO placeholders)
- Assess code quality (error handling, type hints, docstrings)

**What cc-skills CANNOT do:**
- Execute or test skill code dynamically
- Validate that examples actually run correctly
- Detect semantic bugs in skill scripts
- Verify MCP tool availability or correctness
- Test skills against real Claude instances
- Analyze languages other than Python/TS/JS/Go
- Detect runtime issues (only static analysis)
- Prevent actual file operations (only detects patterns)

**For full quality assurance, combine cc-skills with:**
- Manual testing with actual Claude instances
- Running skill scripts to verify they execute
- Testing MCP tool integrations
- Cross-model validation (Haiku, Sonnet, Opus)

---

## Advanced Usage

### Custom Evaluators

Create custom evaluator modules in `scripts/evaluators/`:

```python
# scripts/evaluators/custom.py
from .base import DimensionScore, DIMENSION_WEIGHTS

class CustomEvaluator:
    def __init__(self):
        self._name = "custom"
        self._weight = 0.10

    @property
    def name(self) -> str:
        return self._name

    @property
    def weight(self) -> float:
        return self._weight

    def evaluate(self, skill_path: Path) -> DimensionScore:
        # Your evaluation logic here
        return DimensionScore(
            name=self.name,
            score=8.0,
            weight=self.weight,
            findings=["Custom finding"],
            recommendations=["Custom recommendation"],
        )
```

### Hook System

Register hooks for custom behavior:

```python
from skills import HookManager

hooks = HookManager()

# Pre-evaluation hook
@hooks.register("pre_evaluate")
def before_evaluation(skill_path: Path):
    print(f"Evaluating {skill_path}...")

# Post-evaluation hook
@hooks.register("post_evaluate")
def after_evaluation(result: dict):
    print(f"Score: {result['overall_score']}")
```

### Programmatic Usage

```python
from skills import (
    init_skill,
    validate_skill,
    evaluate_skill,
    package_skill
)

# Initialize
init_skill("my-skill", Path("./skills"))

# Validate
result = validate_skill(Path("./skills/my-skill"))
if result.is_valid:
    print("Valid!")

# Evaluate
evaluation = evaluate_skill(Path("./skills/my-skill"))
print(f"Score: {evaluation.overall_score}")

# Package
package_skill(Path("./skills/my-skill"), Path("./dist"))
```

---

## Troubleshooting

### Issue: Import errors in evaluator modules

**Cause:** Relative imports fail when modules aren't part of a package.

**Solution:** Ensure `scripts/evaluators/__init__.py` exists and use the try/except import pattern:

```python
try:
    from ..skills import SomeClass
except ImportError:
    from skills import SomeClass
```

### Issue: Evaluation returns 0.00/10

**Cause:** `discover_evaluators()` isn't finding evaluator modules.

**Solution:** Check that:
1. Evaluators are in `scripts/evaluators/`
2. Each evaluator has `name`, `weight`, and `evaluate()` method
3. Properties use `@property` decorator

### Issue: Security findings in documentation

**Cause:** AST-based analysis detects dangerous patterns even in documentation examples.

**Solution:** This is expected behavior. The scanner distinguishes actual code from documentation but flags anything that looks like a dangerous pattern. Review and ensure the code is genuinely safe or add explanatory comments.

---

## Additional Resources

- **SKILL.md**: Main skill documentation (408 lines)
- **references/evaluation.md**: Evaluation-first development methodology
- **references/best_practices.md**: Comprehensive skill creation guidelines
- **references/security.md**: Security scanning criteria
- **references/scanner-criteria.md**: Validation and evaluation details
- **references/workflows.md**: Skill architecture patterns
