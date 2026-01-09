---
description: Initialize build tool configuration for the 10-stage development workflow
argument-hint: [language]
---

# init-10-dev

Initialize standardized build configuration for your project to enable the 10-stage workflow.

## Purpose

Automatically sets up build tool configuration with standard tasks:
- Detects project language (Python, JS/TS, Go, Rust, Java)
- Creates appropriate build file (Makefile, package.json, pom.xml)
- Configures modern tooling (pytest, jest, ruff, eslint, etc.)
- Establishes directory structure (src/, tests/unit/, tests/integration/)
- Defines standard tasks (test, lint, format, build, notify-*)

## Usage

```bash
# Auto-detect language and initialize
/rd:10-dev-init

# Specify language explicitly
/rd:10-dev-init --language python

# Force overwrite existing configuration
/rd:10-dev-init --force

# Preview without making changes
/rd:10-dev-init --dry-run

# Custom directories
/rd:10-dev-init --src-dir custom/src --test-dir custom/tests
```

## Parameters

- `--language <lang>`: Specify language (python|javascript|typescript|go|rust|java)
- `--force`: Overwrite existing build configuration
- `--dry-run`: Show what would be created without making changes
- `--src-dir <path>`: Custom source directory (default: src/)
- `--test-dir <path>`: Custom test directory (default: tests/)

## What Gets Created

### Python Projects → Makefile
```makefile
# Standard tasks with modern tooling
install:    uv sync
test:       pytest --cov
test-unit:  pytest tests/unit/
test-integration: pytest tests/integration/
lint:       ruff check
format:     ruff format
build:      python -m build
stage-0 through stage-9: workflow automation
```

### JavaScript/TypeScript → package.json
```json
{
  "scripts": {
    "test": "jest --coverage",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "test:function": "jest -t",
    "lint": "eslint src/ tests/",
    "format": "prettier --write .",
    "stage-0": "echo 'Stage 0...'",
    ...
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```

### Go Projects → Makefile
```makefile
# Go tooling
test:       go test -v -race ./...
test-function: go test -run $(FUNC) $(PKG)
lint:       golangci-lint run
format:     gofmt -w .
```

### Rust Projects → Makefile
```makefile
# Cargo commands wrapped
test:       cargo test
lint:       cargo clippy
format:     cargo fmt
build:      cargo build
```

### Java Projects → pom.xml
```xml
<!-- Maven configuration -->
<plugins>
  <plugin>surefire</plugin>      <!-- Unit tests -->
  <plugin>failsafe</plugin>      <!-- Integration tests -->
  <plugin>jacoco</plugin>        <!-- Coverage -->
  <plugin>checkstyle</plugin>    <!-- Linting -->
</plugins>
```

## Directory Structure Created

```
project/
├── Makefile (or package.json, pom.xml)
├── src/                    # Source code
├── tests/
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   └── e2e/                # End-to-end tests (created)
```

Language-specific adjustments:
- **Go**: Standard Go layout (pkg/, cmd/, internal/)
- **Rust**: Standard Cargo layout (src/, tests/)
- **Java**: Maven layout (src/main/java/, src/test/java/)

## Examples

### Example 1: Python Project
```bash
/rd:10-dev-init
```

**Output**:
```
✅ 10-STAGE WORKFLOW INITIALIZATION COMPLETE

Project Type: Python 3.11
Build Tool: Makefile created
Tooling: uv, ruff, mypy, pytest

📁 Directory Structure:
  ✅ src/ (source code)
  ✅ tests/unit/ (unit tests)
  ✅ tests/integration/ (integration tests)
  ✅ tests/e2e/ (end-to-end tests)

🔧 Standard Tasks Available:
  make install          - Install dependencies
  make test             - Run all tests with coverage
  make test-unit        - Unit tests only
  make test-integration - Integration tests
  make test-file FILE=  - Run specific test file
  make lint             - Code quality checks
  make format           - Format code
  make build            - Build project

📋 Next Steps:
1. Run: make install
2. Verify: make test
3. Ready: /rd:10-dev-apply <function-name>
```

### Example 2: JavaScript Project
```bash
/rd:10-dev-init --language javascript
```

**Creates**: package.json with jest, eslint, prettier configured

### Example 3: Existing Configuration
```bash
/rd:10-dev-init
```

**Behavior**:
```
⚠️  Existing Makefile detected

Options:
1. Merge - Add missing tasks, keep existing
2. Replace - Use new template entirely
3. Backup - Create Makefile.bak, use new template
4. Cancel - Exit without changes

Choose [1-4]:
```

## Build Tool Templates

Templates are customized copies from `skills/10-stages-developing/templates/`:

| Language | Template | Tooling |
|----------|----------|---------|
| Python | Makefile | uv, ruff, mypy, pytest |
| JavaScript | package.json | pnpm, jest, eslint, prettier |
| TypeScript | package.json | pnpm, jest, eslint, prettier, ts-jest |
| Go | Makefile | golangci-lint, go test |
| Rust | Makefile | cargo, clippy, rustfmt |
| Java | pom.xml | maven, junit5, jacoco, checkstyle |

## Verification

After initialization, automatically runs:

```bash
# Python
make help
python -c "import pytest, ruff"

# JavaScript
npm run help
npm list jest eslint prettier

# Go
make help
go version
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Cannot detect project language" | Use `--language <lang>` flag or create language files (*.py, package.json, go.mod) |
| "Dependencies not installed" | Run `make install` (Python/Go/Rust) or `npm install` (JS/TS) |
| "Make command not found" (Windows) | Install make, use WSL, or use language-native tools |
| "Template conflicts with existing" | Use `--force` or choose merge option |

## Integration with Existing Projects

### New Projects
```bash
/rd:10-dev-init           # Initialize
make install           # Install dependencies
/rd:10-dev-check          # Verify setup
/rd:10-dev-apply function # Start developing
```

### Existing Projects
```bash
/rd:10-dev-check          # See what's missing
/rd:10-dev-init           # Configure (merge mode)
# Adapt templates to match your conventions
/rd:10-dev-apply function # Use workflow
```

## See Also

- **Verification**: `/rd:10-dev-check` (verify setup completeness)
- **Usage**: `/rd:10-dev-apply` (use the workflow)
- **Philosophy**: `skills/10-stages-developing/README.md` (soft contract approach)
- **Templates**: `skills/10-stages-developing/templates/` (view/customize templates)
- **Customization**: `skills/10-stages-developing/templates/README.md` (template guide)
