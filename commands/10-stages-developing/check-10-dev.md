---
description: Check if all preconditions for the 10-stage development workflow are met.
---

# check-10-dev

Verify that your project is ready for the 10-stage development workflow.

## Purpose

Validates project environment readiness:
- Detects project language and structure
- Verifies build tool presence and configuration
- Checks test framework setup
- Validates directory structure
- Reports what's ready and what needs attention

## Usage

```bash
# Check current project
/rd:check-10-dev

# Detailed report
/rd:check-10-dev --verbose

# Check specific language
/rd:check-10-dev --language python
```

## Parameters

- `--verbose`: Show detailed configuration information
- `--language <lang>`: Check for specific language (python|javascript|typescript|go|rust|java)

## Precondition Checklist

### Python Projects
- [ ] `Makefile` with standard tasks (test, lint, format, build)
- [ ] Testing framework (pytest preferred)
- [ ] Linter configured (ruff preferred)
- [ ] Type checker (mypy)
- [ ] Directories: `src/`, `tests/`

### JavaScript/TypeScript Projects
- [ ] `package.json` with standard scripts
- [ ] Testing framework (jest preferred)
- [ ] Linter (eslint)
- [ ] Formatter (prettier)
- [ ] Directories: `src/`, `tests/`

### Go Projects
- [ ] `Makefile` with standard tasks
- [ ] `go.mod` file present
- [ ] golangci-lint available
- [ ] Standard Go project structure

### Rust Projects
- [ ] `Cargo.toml` exists
- [ ] `Makefile` optional but recommended
- [ ] clippy and rustfmt available
- [ ] Standard Rust project structure

### Java Projects
- [ ] `pom.xml` (Maven) or `build.gradle` (Gradle)
- [ ] JUnit configured
- [ ] Checkstyle configured
- [ ] Standard Maven/Gradle structure

## What Gets Checked

### 1. Project Type Detection
- Analyzes file extensions and config files
- Identifies primary language
- Detects build tool

### 2. Build Tool Configuration
Verifies presence of standard tasks:
- `test` - Run all tests
- `test-unit` - Unit tests only
- `test-integration` - Integration tests
- `lint` - Code quality checks
- `format` - Code formatting
- `build` - Compile/package
- `notify-start` / `notify-end` - Workflow notifications

### 3. Testing Setup
- Test framework installed
- Test directory structure exists
- Test runner accessible

### 4. Development Tools
- Linter availability
- Formatter availability
- Type checker (if applicable)

## Example Output

```
🔍 10-STAGE WORKFLOW PRECONDITION CHECK

Project Type: Python 3.11
Build Tool: make
Test Framework: pytest

✅ READY:
  - Makefile exists with standard tasks
  - pytest installed and configured
  - Source directory: src/
  - Test directory: tests/
  - Linter (ruff) configured
  - Type checker (mypy) available

⚠️ NEEDS ATTENTION:
  - Integration test directory (tests/integration/) not found
  - notify-start/notify-end tasks not defined in Makefile

❌ MISSING:
  - None

📋 RECOMMENDATIONS:
1. Create tests/integration/ directory
2. Add notify tasks to Makefile
3. Ready to use /rd:apply-10-dev

OVERALL STATUS: 90% Ready
```

## Status Levels

| Status | Meaning | Action |
|--------|---------|--------|
| ✅ READY | All requirements met | Proceed with `/rd:apply-10-dev` |
| ⚠️ NEEDS ATTENTION | Minor issues | Use `/rd:init-10-dev` or fix manually |
| ❌ MISSING | Critical issues | Install tools, run `/rd:init-10-dev` |

## What to Do After Checking

### 100% Ready
```bash
/rd:apply-10-dev <function-name>
```

### Items Need Attention
```bash
# Option 1: Auto-fix
/rd:init-10-dev

# Option 2: Manual fixes
mkdir -p tests/integration
# Edit Makefile to add missing tasks
```

### Major Items Missing
```bash
# Install required tools
pip install pytest ruff mypy  # Python
npm install -D jest eslint    # JavaScript

# Initialize configuration
/rd:init-10-dev

# Verify
/rd:check-10-dev
```

## Examples

### Example 1: Python Project Ready
```bash
/rd:check-10-dev
```

**Output**: 100% Ready - All preconditions met

### Example 2: JavaScript Project Needs Setup
```bash
/rd:check-10-dev
```

**Output**:
```
⚠️ NEEDS ATTENTION:
  - package.json missing test scripts
  - eslint not configured

📋 Run: /rd:init-10-dev
```

### Example 3: New Project
```bash
/rd:check-10-dev
```

**Output**:
```
❌ MISSING:
  - No build tool configuration found
  - Test framework not installed
  - Directory structure missing

📋 Run: /rd:init-10-dev to set up project
```

## Integration with Other Commands

### Typical Workflow
```bash
# 1. Check readiness
/rd:check-10-dev

# 2. If needed, initialize
/rd:init-10-dev

# 3. Verify setup
/rd:check-10-dev

# 4. Start development
/rd:apply-10-dev <function-name>
```

### Periodic Health Check
```bash
# Run occasionally to ensure configuration maintained
/rd:check-10-dev --verbose
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Cannot detect project type" | Create language files (.py, package.json, go.mod) or use `--language` flag |
| "Build tool not found" | Install make or ensure package.json exists; run `/rd:init-10-dev` |
| "Test framework not configured" | Install framework (pytest, jest, etc.) and add to project |
| "Standard tasks missing" | Run `/rd:init-10-dev` or manually add tasks from templates |

## See Also

- **Setup**: `/rd:init-10-dev` (initialize build configuration)
- **Usage**: `/rd:apply-10-dev` (use the workflow)
- **Documentation**: `skills/10-stages-developing/README.md` (setup guide)
- **Templates**: `skills/10-stages-developing/templates/` (build tool templates)
