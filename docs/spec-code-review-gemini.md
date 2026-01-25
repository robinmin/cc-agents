# Code Review Gemini - Developer Specification

**Version:** 1.0
**Last Updated:** 2026-01-22
**Status:** Production Ready (Grade A - 93/100)
**License:** MIT

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Implementation Details](#implementation-details)
4. [API Reference](#api-reference)
5. [Testing](#testing)
6. [Development Setup](#development-setup)
7. [Contributing](#contributing)
8. [Deployment](#deployment)

---

## Overview

### Purpose

The `code-review-gemini` skill enables Claude Code to leverage Google Gemini CLI as a planning oracle and code reviewer. It provides structured workflows for:

- Code review with security, performance, and quality analysis
- Architecture planning and implementation strategy
- Quick technical consultations
- Converting review results into trackable task files

### Key Features

- **5 Commands**: `check`, `run`, `run-file`, `review`, `import`
- **6 Models**: Support for Gemini 2.5 and 3.x model families
- **Structured Output**: YAML frontmatter + markdown sections
- **Task Integration**: Automatic task file generation from review results
- **Progressive Disclosure**: 3-tier documentation (SKILL.md → references/ → assets/)

### Technology Stack

- **Language**: Python 3.11+
- **Dependencies**: Google Gemini CLI (external)
- **Testing**: pytest, pytest-cov
- **Linting**: ruff, mypy
- **Type Hints**: Full type annotations with NamedTuple
- **Package Manager**: uv (for development)

---

## Architecture

### Directory Structure

```
plugins/rd2/skills/code-review-gemini/
├── SKILL.md                     # Main skill documentation (292 lines)
├── scripts/
│   └── code-review-gemini.py    # Main implementation (1,511 lines)
├── tests/                       # Test suite (98 tests, 100% pass rate)
│   ├── conftest.py              # Pytest configuration
│   ├── test_check.py            # Check command tests
│   ├── test_run.py              # Run command tests
│   ├── test_run_file.py         # Run-file command tests
│   ├── test_review.py           # Review command tests
│   ├── test_import.py           # Import command tests
│   ├── test_template.py         # Template formatting tests
│   └── test_utils.py            # Utility function tests
├── references/                  # Reference documentation (1,141 lines)
│   ├── usage-examples.md        # Comprehensive usage examples (455 lines)
│   ├── import-format.md         # Import format specification (526 lines)
│   └── gemini-flags.md          # Model and CLI reference (160 lines)
├── assets/                      # Prompt templates
│   ├── planning_prompt.md       # Architecture planning template
│   ├── review_prompt.md         # Code review template
│   └── code-review-result.md    # Structured output template
└── htmlcov/                     # Code coverage reports
```

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                       Claude Code                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │            code-review-gemini Skill                   │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │              CLI Interface                      │  │  │
│  │  │  - check_gemini_availability()                  │  │  │
│  │  │  - cmd_check(), cmd_run(), cmd_run_file()       │  │  │
│  │  │  - cmd_review(), cmd_import()                   │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │           Core Functions                        │  │  │
│  │  │  - run_gemini_prompt()                          │  │  │
│  │  │  - run_gemini_from_file()                       │  │  │
│  │  │  - build_review_prompt()                        │  │  │
│  │  │  - gather_code_content()                        │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │         Import Pipeline                         │  │  │
│  │  │  - parse_review_result_file()                   │  │  │
│  │  │  - extract_issues_from_section()                │  │  │
│  │  │  - create_task_from_issue()                     │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │          Utilities                              │  │  │
│  │  │  - generate_temp_path()                         │  │  │
│  │  │  - load_prompt_template()                       │  │  │
│  │  │  - format_review_with_template()                │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌──────────────────┐          ┌──────────────────┐
│  Gemini CLI      │          │  tasks CLI       │
│  (subprocess)    │          │  (subprocess)    │
└──────────────────┘          └──────────────────┘
```

### Data Flow

#### Review Command Flow

```
User Request
     │
     ▼
cmd_review(args)
     │
     ├─ gather_code_content(target)
     │       └─ Read files, combine content
     │
     ├─ build_review_prompt(target, content, mode, focus)
     │       └─ Load template, substitute variables
     │
     ├─ run_gemini_from_file(prompt_file, model, timeout)
     │       └─ subprocess.run(['gemini', '-m', model, prompt])
     │
     ├─ format_review_with_template(content, metadata)
     │       └─ Extract sections, fill template
     │
     └─ save_to_plan(formatted_output, plan_name)
             └─ Write to docs/plans/
```

#### Import Command Flow

```
Review File
     │
     ▼
parse_review_result_file(file_path)
     │
     ├─ parse_yaml_frontmatter(content)
     │       └─ Extract metadata
     │
     └─ extract_issues_from_section(section, priority)
             └─ Parse structured/simple format
                     │
                     ▼
             ReviewIssue objects
                     │
                     ▼
create_task_from_issue(issue, metadata)
     │
     ├─ subprocess.run(['tasks', 'create', task_name])
     │
     ├─ Update task file Background section
     │
     └─ Update task file Requirements section
```

---

## Implementation Details

### Core Data Structures

#### CheckResult

```python
class CheckResult(NamedTuple):
    """Result of Gemini CLI availability check."""
    available: bool
    message: str
    version: str | None = None
```

**Usage:**

```python
result = check_gemini_availability()
if not result.available:
    print(result.message, file=sys.stderr)
    return 1
```

#### RunResult

```python
class RunResult(NamedTuple):
    """Result of running a Gemini prompt."""
    success: bool
    output: str
    error: str | None = None
    model: str | None = None
```

**Usage:**

```python
result = run_gemini_prompt(
    prompt="Analyze this code",
    model="gemini-3-flash-preview",
    timeout=300
)
if result.success:
    print(result.output)
```

#### ReviewIssue

```python
class ReviewIssue(NamedTuple):
    """Represents a single issue from a code review."""
    priority: str              # critical, high, medium, low
    identifier: str            # e.g., CRITICAL-001
    title: str                 # Issue title
    location: str | None       # e.g., file.py:45
    issue_description: str | None
    impact: str | None
    fix_recommendation: str | None
    raw_content: str | None
```

**Usage:**

```python
issue = ReviewIssue(
    priority="critical",
    identifier="CRITICAL-001",
    title="SQL Injection Vulnerability",
    location="auth.py:45",
    issue_description="User input not sanitized",
    impact="Allows arbitrary SQL execution",
    fix_recommendation="Use parameterized queries"
)
```

### Constants

```python
# Model Configuration
DEFAULT_MODEL = "gemini-3-flash-preview"
FLASH_MODEL = "gemini-2.5-flash"
FLASH_LITE_MODEL = "gemini-2.5-flash-lite"
GEMINI_2_5_PRO = "gemini-2.5-pro"
GEMINI_3_PRO = "gemini-3-pro-preview"
GEMINI_3_FLASH = "gemini-3-flash-preview"

AVAILABLE_MODELS = [
    DEFAULT_MODEL,
    FLASH_MODEL,
    FLASH_LITE_MODEL,
    GEMINI_2_5_PRO,
    GEMINI_3_PRO,
    GEMINI_3_FLASH,
]

# Timeout Configuration (seconds)
TIMEOUT_SIMPLE = 300    # 5 minutes
TIMEOUT_MODERATE = 600  # 10 minutes
TIMEOUT_COMPLEX = 900   # 15 minutes

# Paths
PLANS_DIR = Path(".claude/plans")
```

### Key Algorithms

#### Issue Extraction Algorithm

**Purpose:** Parse review results and extract individual issues

**Input:** Markdown section content, priority level
**Output:** List of `ReviewIssue` objects

**Algorithm:**

```python
def extract_issues_from_section(section_content: str, priority: str) -> list[ReviewIssue]:
    """
    Supports two formats:
    1. Structured: **[ID]** Title with field lines
    2. Simple: - Bullet point text
    """
    issues = []
    lines = section_content.split("\n")
    current_issue = {}
    current_lines = []
    issue_counter = 1

    for line in lines:
        # Detect structured format: **[CRITICAL-001]** Title
        if line.startswith("**[") and "]**" in line:
            # Save previous issue
            if current_issue:
                issues.append(build_issue(current_issue, current_lines, priority, issue_counter))
                issue_counter += 1

            # Parse new issue
            identifier = extract_between(line, "**[", "]**")
            title = extract_after(line, "]**").strip()
            current_issue = {"identifier": identifier, "title": title}
            current_lines = []

        # Detect field lines: - **Location**: value
        elif line.startswith("- **") and "**:" in line:
            field_name = extract_between(line, "- **", "**:").lower()
            field_value = extract_after(line, "**:").strip()
            current_issue[field_name] = field_value

        # Detect simple bullets: - Issue text
        elif line.startswith("-") and not line.startswith("- **"):
            # Save previous
            if current_issue:
                issues.append(build_issue(current_issue, current_lines, priority, issue_counter))
                issue_counter += 1

            # Simple format
            issue_text = line[1:].strip()
            current_issue = {
                "identifier": f"{priority.upper()}-{issue_counter:03d}",
                "title": issue_text[:100]
            }
            current_lines = [issue_text]

    # Save last issue
    if current_issue:
        issues.append(build_issue(current_issue, current_lines, priority, issue_counter))

    return issues
```

**Time Complexity:** O(n) where n = number of lines
**Space Complexity:** O(m) where m = number of issues

#### Template Formatting Algorithm

**Purpose:** Format review output using template with variable substitution

**Input:** Raw review output, metadata, mode
**Output:** Formatted markdown with frontmatter

**Algorithm:**

```python
def format_review_with_template(
    content: str,
    target: str,
    model: str,
    mode: Literal["planning", "review"],
    focus_areas: list[str] | None,
    files_count: int,
) -> str:
    # 1. Load template from assets/
    template = load_prompt_template("code-review-result")

    # 2. Extract structured sections from content
    sections = extract_review_sections(content)

    # 3. Build replacement dictionary
    replacements = {
        "{{TIMESTAMP}}": datetime.now().isoformat(),
        "{{MODEL}}": model,
        "{{TARGET}}": target,
        "{{MODE}}": mode,
        "{{QUALITY_SCORE}}": sections["quality_score"],
        "{{RECOMMENDATION}}": sections["recommendation"],
        "{{CRITICAL_ISSUES}}": sections["critical_issues"],
        # ... more replacements
    }

    # 4. Perform replacements
    result = template
    for placeholder, value in replacements.items():
        result = result.replace(placeholder, value)

    return result
```

---

## API Reference

### Command Line Interface

#### check

Validate Gemini CLI availability.

**Syntax:**

```bash
python3 code-review-gemini.py check [--verbose]
```

**Options:**

- `--verbose`, `-v`: Show version information

**Exit Codes:**

- `0`: Gemini CLI is available
- `1`: Gemini CLI not found or not responding

**Example:**

```bash
$ python3 code-review-gemini.py check
gemini ready

$ python3 code-review-gemini.py check --verbose
gemini ready
Version: 0.2.5
```

#### run

Execute a short prompt via Gemini CLI.

**Syntax:**

```bash
python3 code-review-gemini.py run PROMPT [OPTIONS]
```

**Arguments:**

- `PROMPT`: The prompt text to send to Gemini

**Options:**

- `-m, --model MODEL`: Model to use (default: gemini-3-flash-preview)
- `-o, --output-format FORMAT`: Output format: text|json (default: text)
- `-t, --timeout SECONDS`: Timeout in seconds (default: 300)
- `-s, --save NAME`: Save output to plan file

**Exit Codes:**

- `0`: Success
- `1`: Gemini CLI error or timeout

**Example:**

```bash
python3 code-review-gemini.py run \
  "Explain OAuth2 vs JWT for authentication" \
  --model gemini-2.5-flash \
  --save auth-comparison
```

#### run-file

Execute a long prompt from a file.

**Syntax:**

```bash
python3 code-review-gemini.py run-file PROMPT_FILE [OPTIONS]
```

**Arguments:**

- `PROMPT_FILE`: Path to file containing the prompt

**Options:**

- `-m, --model MODEL`: Model to use (default: gemini-3-flash-preview)
- `-o, --output FILE`: Output file path
- `-f, --output-format FORMAT`: Output format: text|json (default: text)
- `-t, --timeout SECONDS`: Timeout in seconds (default: 600)

**Exit Codes:**

- `0`: Success
- `1`: File not found or Gemini error

**Example:**

```bash
python3 code-review-gemini.py run-file architecture-prompt.txt \
  --model gemini-2.5-pro \
  --output architecture-analysis.md \
  --timeout 900
```

#### review

Comprehensive code review or architecture planning.

**Syntax:**

```bash
python3 code-review-gemini.py review TARGET [OPTIONS]
```

**Arguments:**

- `TARGET`: File, directory, or glob pattern to review

**Options:**

- `-m, --model MODEL`: Model to use (default: gemini-3-flash-preview)
- `-p, --plan`: Planning mode (architecture/implementation plan)
- `-o, --output NAME`: Output plan file name
- `-f, --focus AREAS`: Comma-separated focus areas
- `-t, --timeout SECONDS`: Timeout in seconds

**Focus Areas:**

- `security`: Vulnerabilities, auth, data exposure
- `performance`: Algorithm complexity, memory, N+1 queries
- `testing`: Coverage gaps, edge cases
- `quality`: Readability, maintainability, DRY
- `architecture`: Coupling, cohesion, patterns

**Exit Codes:**

- `0`: Success
- `1`: No files found or Gemini error

**Example:**

```bash
python3 code-review-gemini.py review src/auth/ \
  --focus "security,performance" \
  --model gemini-2.5-pro \
  --output auth-security-review

python3 code-review-gemini.py review . \
  --plan \
  --output feature-implementation-plan
```

#### import

Convert review results to task files.

**Syntax:**

```bash
python3 code-review-gemini.py import REVIEW_FILE [OPTIONS]
```

**Arguments:**

- `REVIEW_FILE`: Path to code review result file

**Options:**

- `-p, --priority LEVEL`: Filter by priority: critical|high|medium|low

**Exit Codes:**

- `0`: All tasks created successfully
- `1`: File not found, parsing error, or task creation failed

**Example:**

```bash
# Import all issues
python3 code-review-gemini.py import docs/plans/review-auth.md

# Import only critical issues
python3 code-review-gemini.py import docs/plans/review-auth.md --priority critical
```

**Output:**

- Creates task files in `docs/prompts/`
- Task files named: `{WBS}_{identifier}_{title}.md`
- Updates TodoWrite for tracking

### Python API

#### check_gemini_availability()

```python
def check_gemini_availability() -> CheckResult:
    """
    Validate Gemini CLI availability.

    Returns:
        CheckResult with availability status and message.

    Example:
        >>> result = check_gemini_availability()
        >>> if result.available:
        ...     print(f"Gemini ready: {result.version}")
    """
```

#### run_gemini_prompt()

```python
def run_gemini_prompt(
    prompt: str,
    model: str = DEFAULT_MODEL,
    output_format: Literal["text", "json"] = "text",
    timeout: int = TIMEOUT_SIMPLE,
) -> RunResult:
    """
    Run a short prompt via Gemini CLI.

    Args:
        prompt: The prompt text to send to Gemini.
        model: The model to use.
        output_format: Output format ('text' or 'json').
        timeout: Timeout in seconds.

    Returns:
        RunResult with success status and output.

    Example:
        >>> result = run_gemini_prompt(
        ...     "Explain async/await",
        ...     model="gemini-2.5-flash",
        ...     timeout=300
        ... )
        >>> if result.success:
        ...     print(result.output)
    """
```

#### run_gemini_from_file()

```python
def run_gemini_from_file(
    prompt_file: Path,
    model: str = DEFAULT_MODEL,
    output_format: Literal["text", "json"] = "text",
    timeout: int = TIMEOUT_MODERATE,
    output_file: Path | None = None,
) -> RunResult:
    """
    Run a long prompt from a file via Gemini CLI.

    Args:
        prompt_file: Path to the prompt file.
        model: The model to use.
        output_format: Output format.
        timeout: Timeout in seconds.
        output_file: Optional path to save output.

    Returns:
        RunResult with success status and output.
    """
```

#### parse_review_result_file()

```python
def parse_review_result_file(file_path: Path) -> tuple[dict[str, str], list[ReviewIssue]]:
    """
    Parse a code review result file and extract all issues.

    Args:
        file_path: Path to the review result markdown file.

    Returns:
        Tuple of (metadata dict, list of ReviewIssue objects).

    Raises:
        FileNotFoundError: If review file not found.

    Example:
        >>> metadata, issues = parse_review_result_file(Path("review.md"))
        >>> print(f"Found {len(issues)} issues")
        >>> for issue in issues:
        ...     print(f"{issue.identifier}: {issue.title}")
    """
```

#### create_task_from_issue()

```python
def create_task_from_issue(
    issue: ReviewIssue,
    review_metadata: dict[str, str]
) -> tuple[bool, str]:
    """
    Create a task file from a review issue using tasks CLI.

    Args:
        issue: ReviewIssue to convert to task.
        review_metadata: Metadata from the review result.

    Returns:
        Tuple of (success: bool, message_or_path: str).

    Example:
        >>> issue = ReviewIssue(
        ...     priority="critical",
        ...     identifier="CRITICAL-001",
        ...     title="SQL Injection",
        ...     location="auth.py:45"
        ... )
        >>> success, path = create_task_from_issue(issue, metadata)
        >>> if success:
        ...     print(f"Task created: {path}")
    """
```

---

## Testing

### Test Coverage

**Overall Coverage:** 79% (563 statements, 118 missed)
**Test Pass Rate:** 100% (98/98 tests passing)

### Test Organization

```
tests/
├── conftest.py           # Shared fixtures
├── test_check.py         # Check command (8 tests)
├── test_run.py           # Run command (12 tests)
├── test_run_file.py      # Run-file command (10 tests)
├── test_review.py        # Review command (18 tests)
├── test_import.py        # Import command (35 tests)
├── test_template.py      # Template formatting (10 tests)
└── test_utils.py         # Utility functions (5 tests)
```

### Running Tests

```bash
# Run all tests with coverage
make test-one DIR=plugins/rd2/skills/code-review-gemini

# Run specific test file
pytest plugins/rd2/skills/code-review-gemini/tests/test_import.py -v

# Run with coverage report
pytest plugins/rd2/skills/code-review-gemini/tests/ \
  --cov=plugins/rd2/skills/code-review-gemini/scripts \
  --cov-report=html

# Run single test
pytest plugins/rd2/skills/code-review-gemini/tests/test_import.py::TestCmdImport::test_import_success -v
```

### Key Test Fixtures

```python
# conftest.py
import pytest
from pathlib import Path

@pytest.fixture
def temp_prompt_file(tmp_path: Path) -> Path:
    """Create temporary prompt file."""
    prompt_file = tmp_path / "prompt.txt"
    prompt_file.write_text("Test prompt content")
    return prompt_file

@pytest.fixture
def mock_gemini_success(monkeypatch):
    """Mock successful Gemini CLI execution."""
    def mock_run(*args, **kwargs):
        return Mock(returncode=0, stdout="Success", stderr="")
    monkeypatch.setattr("subprocess.run", mock_run)
```

### Example Test Cases

```python
# test_import.py
def test_parse_structured_issue_format(tmp_path: Path) -> None:
    """Test parsing structured issue format."""
    review_file = tmp_path / "review.md"
    review_file.write_text("""---
model: gemini-3-flash-preview
target: src/auth/
---

## Critical Issues (Must Fix)

**[CRITICAL-001]** SQL Injection Vulnerability

- **Location**: src/auth/login.py:45
- **Issue**: User input directly concatenated into SQL query
- **Impact**: Allows attackers to execute arbitrary SQL
- **Fix**: Use parameterized queries or ORM
""")

    metadata, issues = parse_review_result_file(review_file)

    assert len(issues) == 1
    issue = issues[0]
    assert issue.priority == "critical"
    assert issue.identifier == "CRITICAL-001"
    assert issue.title == "SQL Injection Vulnerability"
    assert issue.location == "src/auth/login.py:45"
    assert "parameterized queries" in issue.fix_recommendation
```

---

## Development Setup

### Prerequisites

- Python 3.11 or later
- uv package manager
- Google Gemini CLI
- Git

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/cc-agents.git
cd cc-agents

# Install dependencies
make install

# Verify Gemini CLI
python3 plugins/rd2/skills/code-review-gemini/scripts/code-review-gemini.py check
```

### Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes to code-review-gemini.py

# 3. Run linting
make lint-one DIR=plugins/rd2/skills/code-review-gemini

# 4. Run tests
make test-one DIR=plugins/rd2/skills/code-review-gemini

# 5. Fix any issues
make autofix-one DIR=plugins/rd2/skills/code-review-gemini

# 6. Commit changes
git add plugins/rd2/skills/code-review-gemini/
git commit -m "feat: add new feature"

# 7. Push and create PR
git push origin feature/my-feature
```

### Code Style

**Linter:** ruff
**Type Checker:** mypy
**Format:** Auto-formatted with ruff

**Key Conventions:**

- Type hints for all function signatures
- Docstrings for all public functions
- NamedTuple for structured return values
- f-strings for string formatting (with placeholders)
- Maximum line length: 100 characters

**Example:**

```python
def process_review(
    target: str,
    model: str = DEFAULT_MODEL,
    timeout: int = TIMEOUT_SIMPLE,
) -> RunResult:
    """
    Process a code review request.

    Args:
        target: File or directory to review.
        model: Gemini model to use.
        timeout: Timeout in seconds.

    Returns:
        RunResult with review output.

    Raises:
        FileNotFoundError: If target path not found.
    """
    # Implementation
```

### Adding New Commands

1. **Define Command Function**

```python
def cmd_my_command(args: argparse.Namespace) -> int:
    """Handle my-command."""
    # Implementation
    return 0
```

2. **Add Argument Parser**

```python
# In main()
my_parser = subparsers.add_parser("my-command", help="My command description")
my_parser.add_argument("--option", help="Option description")
```

3. **Add to main() Router**

```python
if args.command == "my-command":
    return cmd_my_command(args)
```

4. **Add Tests**

```python
# tests/test_my_command.py
def test_my_command_success():
    """Test successful my-command execution."""
    # Test implementation
```

5. **Update Documentation**

- Add to SKILL.md command table
- Add example to references/usage-examples.md
- Update this spec document

---

## Contributing

### Pull Request Process

1. **Fork and Clone**

```bash
git clone https://github.com/your-username/cc-agents.git
cd cc-agents
```

2. **Create Feature Branch**

```bash
git checkout -b feature/my-contribution
```

3. **Make Changes**

- Follow code style guidelines
- Add tests for new functionality
- Update documentation

4. **Verify Quality**

```bash
make lint-one DIR=plugins/rd2/skills/code-review-gemini
make test-one DIR=plugins/rd2/skills/code-review-gemini
```

5. **Commit with Conventional Commits**

```bash
git commit -m "feat: add import priority filtering"
git commit -m "fix: handle malformed YAML frontmatter"
git commit -m "docs: update usage examples"
```

6. **Push and Create PR**

```bash
git push origin feature/my-contribution
# Open PR on GitHub
```

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**

```
feat(import): add priority filtering for import command

Added --priority flag to filter issues by priority level.
Supports: critical, high, medium, low.

Closes #123

fix(review): handle timeout gracefully

Added proper timeout handling with informative error messages.
Users now get actionable feedback when reviews timeout.

Related to #456

docs(readme): update installation instructions

Added prerequisites section and troubleshooting guide.
```

---

## Deployment

### Production Checklist

- [ ] All tests passing (98/98)
- [ ] Linting clean (no errors)
- [ ] Code coverage ≥ 75% (currently 79%)
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped in appropriate files
- [ ] Gemini CLI version compatibility verified

### Versioning

**Current Version:** 1.0
**Versioning Scheme:** Semantic Versioning (semver)

**Format:** MAJOR.MINOR.PATCH

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Process

```bash
# 1. Update version
# Edit VERSION file or __version__ in code

# 2. Update CHANGELOG.md
# Add release notes

# 3. Create release commit
git commit -m "chore: bump version to 1.1.0"

# 4. Tag release
git tag -a v1.1.0 -m "Release 1.1.0"

# 5. Push
git push origin main --tags

# 6. Create GitHub release
# Use CHANGELOG.md content for release notes
```

### Deployment Targets

#### Claude Code Plugin (Primary)

**Location:** `plugins/rd2/skills/code-review-gemini/`

**Deployment:**

```bash
# Plugin is loaded from repository
# No separate deployment needed
# Users update via git pull
```

#### Standalone Script

**Location:** `scripts/code-review-gemini.py`

**Deployment:**

```bash
# Can be used standalone
cp plugins/rd2/skills/code-review-gemini/scripts/code-review-gemini.py ~/bin/
chmod +x ~/bin/code-review-gemini.py
```

---

## Appendices

### A. Model Comparison

| Model                  | Context | Speed    | Cost     | Best For                   |
| ---------------------- | ------- | -------- | -------- | -------------------------- |
| gemini-3-flash-preview | 1M      | Fast     | Moderate | Default (balanced)         |
| gemini-3-pro-preview   | 1M      | Slower   | Highest  | Complex reasoning          |
| gemini-2.5-pro         | 1M      | Moderate | Higher   | Multi-file, architecture   |
| gemini-2.5-flash       | 1M      | Fast     | Lower    | Single files, quick checks |
| gemini-2.5-flash-lite  | 1M      | Fastest  | Lowest   | Batch processing           |

### B. Error Codes

| Code | Meaning       | Common Causes                                |
| ---- | ------------- | -------------------------------------------- |
| 0    | Success       | Command completed successfully               |
| 1    | General Error | Gemini CLI not found, timeout, invalid input |

### C. Environment Variables

```bash
# Optional environment variables
export GEMINI_API_KEY="your-api-key"        # For Gemini authentication
export GEMINI_DEFAULT_MODEL="gemini-2.5-pro" # Override default model
```

### D. Performance Metrics

**Benchmark Environment:**

- MacBook Pro M1, 16GB RAM
- Python 3.11
- Gemini CLI 0.2.5

**Typical Execution Times:**

| Operation       | File Count | Timeout | Actual Time    |
| --------------- | ---------- | ------- | -------------- |
| check           | -          | 5s      | ~1s            |
| run (simple)    | -          | 300s    | 10-30s         |
| run-file        | -          | 600s    | 30-90s         |
| review (small)  | 1-3        | 300s    | 45-120s        |
| review (medium) | 4-10       | 600s    | 120-300s       |
| review (large)  | 10+        | 900s    | 300-600s       |
| import          | -          | -       | 1-3s per issue |

### E. Security Considerations

**Subprocess Execution:**

- Always use `--sandbox` flag with Gemini CLI
- Timeout all subprocess calls
- Sanitize file paths before processing

**Path Sanitization:**

```python
# Good
safe_name = "".join(c if c.isalnum() or c in "-_" else "-" for c in plan_name)

# Bad
unsafe_name = user_input  # Direct use without sanitization
```

**YAML Frontmatter:**

- Parse YAML safely
- Handle malformed input gracefully
- Don't execute code from YAML

### F. Troubleshooting

**Common Issues:**

1. **Gemini CLI Not Found**

   ```bash
   # Install Gemini CLI
   npm install -g @google/gemini-cli
   # or
   brew install gemini-cli
   ```

2. **Timeout Errors**

   ```bash
   # Increase timeout
   python3 code-review-gemini.py review src/ --timeout 1200

   # Or use faster model
   python3 code-review-gemini.py review src/ --model gemini-2.5-flash
   ```

3. **Import Parse Errors**

   ```bash
   # Verify YAML frontmatter
   head -10 docs/plans/review.md

   # Check section headers
   grep "##" docs/plans/review.md
   ```

### G. References

- [Google Gemini CLI Documentation](https://github.com/google-gemini/gemini-cli)
- [Claude Code Plugin Development Guide](https://docs.anthropic.com/claude-code)
- [Pytest Documentation](https://docs.pytest.org/)
- [Python Type Hints Guide](https://docs.python.org/3/library/typing.html)

---

**Document Version:** 1.0
**Last Updated:** 2026-01-22
**Maintained By:** Development Team
**License:** MIT
