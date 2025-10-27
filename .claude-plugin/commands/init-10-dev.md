# init-10-dev Command

Initialize build tool configuration for the 10-stage development workflow.

## What This Command Does

Automatically sets up the standardized build tool configuration required for the 10-stage workflow:

1. **Detect Project Type**: Identify programming language and ecosystem
2. **Select Build Tool Template**: Choose appropriate template (Makefile, package.json, pom.xml)
3. **Generate Configuration**: Create build configuration with standard tasks
4. **Verify Setup**: Run checks to ensure everything works
5. **Provide Usage Instructions**: Show how to use the generated configuration

## Build Tool Templates

### Python Projects → Makefile
Generates `Makefile` with:
- Modern tooling (uv, ruff, mypy, pytest)
- Standard tasks: `install`, `test`, `lint`, `format`, `build`
- Test variants: `test-unit`, `test-integration`, `test-e2e`
- Single test execution: `test-file`, `test-function`
- Workflow notifications: `notify-start`, `notify-end`
- Stage-specific targets: `stage-0` through `stage-9`

### JavaScript/TypeScript Projects → package.json
Generates or updates `package.json` with:
- Modern tooling (pnpm, eslint, prettier, jest)
- Standard scripts with same naming convention
- Test variants and single test execution
- Workflow notification scripts
- Stage-specific scripts

### Go Projects → Makefile
Generates `Makefile` with:
- Go standard tooling (go test, golangci-lint)
- Standard tasks matching other languages
- Go-specific conventions

### Rust Projects → Makefile
Generates `Makefile` with:
- Cargo commands wrapped for consistency
- Standard task naming
- clippy and rustfmt integration

### Java Projects → pom.xml
Generates or updates `pom.xml` with:
- Maven plugins (surefire, jacoco, checkstyle)
- Test profiles for unit/integration/e2e
- Standard build lifecycle

## Command Usage

```bash
# Auto-detect language and initialize
/init-10-dev

# Initialize for specific language
/init-10-dev --language python

# Force overwrite existing configuration
/init-10-dev --force

# Show what would be created without making changes
/init-10-dev --dry-run

# Initialize with custom project structure
/init-10-dev --src-dir custom/src --test-dir custom/tests
```

## Execution Process

### Step 1: Project Detection

Claude analyzes:
- File extensions in project root
- Existing configuration files
- Directory structure
- Dependency files

Detects:
- **Python**: `.py` files, `pyproject.toml`, `requirements.txt`
- **JavaScript**: `.js` files, `package.json`, `node_modules/`
- **TypeScript**: `.ts` files, `tsconfig.json`
- **Go**: `.go` files, `go.mod`
- **Rust**: `.rs` files, `Cargo.toml`
- **Java**: `.java` files, `pom.xml`, `build.gradle`

### Step 2: Template Selection

Based on detection, selects appropriate template:
- `build-templates/makefiles/Makefile-python`
- `build-templates/makefiles/Makefile-golang`
- `build-templates/makefiles/Makefile-rust`
- `build-templates/npm/package-javascript.json`
- `build-templates/npm/package-typescript.json`
- `build-templates/maven/pom.xml`

### Step 3: Configuration Generation

Creates or updates build configuration:

**For Makefile projects**:
1. Copies appropriate Makefile template
2. Customizes project-specific variables
3. Sets correct source/test directories
4. Configures Python version or Go module name

**For package.json projects**:
1. Reads existing package.json if present
2. Merges or adds standard scripts
3. Adds devDependencies for testing/linting
4. Configures jest, eslint, prettier

**For Maven projects**:
1. Creates or updates pom.xml
2. Adds required plugins
3. Configures test profiles
4. Sets up jacoco for coverage

### Step 4: Directory Structure

Creates missing directories:
```
project/
├── src/           # Source code
├── tests/         # All tests
│   ├── unit/      # Unit tests
│   ├── integration/  # Integration tests
│   └── e2e/       # End-to-end tests
```

Language-specific adjustments:
- **Go**: Uses standard Go layout
- **Rust**: Uses standard Cargo layout
- **Java**: Uses Maven standard directory layout

### Step 5: Verification

Runs basic checks:
```bash
# Python
make help
python -c "import pytest; import ruff"

# JavaScript
npm run help
npm list jest eslint prettier

# Go
make help
go version

# Java
mvn help:effective-pom
```

### Step 6: Success Report

Provides summary:
```
✅ 10-STAGE WORKFLOW INITIALIZATION COMPLETE

Project Type: Python
Build Tool: Makefile
Configuration: Makefile created

📁 Directory Structure:
  ✅ src/ (source code)
  ✅ tests/unit/ (unit tests)
  ✅ tests/integration/ (integration tests)
  ⚠️ tests/e2e/ (created, needs E2E tests)

🔧 Standard Tasks Available:
  make install          - Install dependencies
  make test             - Run all tests
  make test-unit        - Run unit tests only
  make test-integration - Run integration tests
  make test-file FILE=  - Run specific test file
  make test-function FILE= FUNC=  - Run specific test
  make lint             - Run code quality checks
  make format           - Format code
  make build            - Build project
  make clean            - Clean artifacts
  make notify-start     - Notify workflow start
  make notify-end       - Notify workflow completion

🎼 Stage Tasks Available:
  make stage-0 FUNC=    - Stage 0: Announce start
  make stage-1 FUNC=    - Stage 1: Define specification
  ... (stages 2-9)

📋 Next Steps:
1. Review generated Makefile
2. Run: make install
3. Verify: make test
4. Ready to use: /apply-10-dev <function-name>

🔍 Verification:
Run '/check-10-dev' to verify complete setup
```

## Template Customization

### Adding Custom Tasks

After initialization, you can add project-specific tasks:

**Makefile**:
```makefile
## custom-task: Your custom task description
custom-task:
	@echo "Running custom task..."
	# Your commands here
```

**package.json**:
```json
{
  "scripts": {
    "custom:task": "echo 'Running custom task' && your-command"
  }
}
```

### Modifying Tool Versions

Update versions in generated configuration:
- Python: Change `PYTHON_VERSION` in Makefile
- Node: Change in package.json dependencies
- Java: Change versions in pom.xml properties

## Integration with Existing Projects

### Existing Build Configuration

If configuration exists, Claude will:
1. Backup existing file (`.bak` extension)
2. Prompt for merge strategy:
   - **Merge**: Add missing tasks, keep existing
   - **Replace**: Use new template entirely
   - **Manual**: Show diff, let you decide

### Existing Dependencies

Claude preserves:
- Existing dependencies in package.json
- Custom Maven plugins
- Project-specific Makefile targets

## Examples

### Initialize Python Project

```bash
/init-10-dev

# Output:
# Detected: Python 3.11 project
# Created: Makefile with uv, ruff, mypy, pytest
# Created: tests/unit/, tests/integration/
# Status: Ready for /apply-10-dev
```

### Initialize JavaScript Project

```bash
/init-10-dev

# Output:
# Detected: JavaScript project with npm
# Updated: package.json with standard scripts
# Installed: jest, eslint, prettier
# Status: Ready for /apply-10-dev
```

### Initialize Go Project

```bash
/init-10-dev

# Output:
# Detected: Go 1.21 project
# Created: Makefile with Go tooling
# Module: github.com/user/project
# Status: Ready for /apply-10-dev
```

## Troubleshooting

### "Cannot detect project language"

Solution:
```bash
/init-10-dev --language python
```

Or ensure language-specific files exist:
- Python: Create `pyproject.toml` or `.py` files
- JavaScript: Create `package.json`
- Go: Run `go mod init`
- Rust: Run `cargo init`

### "Dependencies not installed"

After initialization:
```bash
# Python
make install

# JavaScript
npm install

# Go
go mod download

# Rust
cargo fetch
```

### "Make command not found" (Windows)

Options:
1. Install make for Windows
2. Use WSL (recommended)
3. Use alternative build tool for your language

### "Template conflicts with existing setup"

Use merge mode:
```bash
/init-10-dev --merge
```

Or backup and replace:
```bash
cp Makefile Makefile.backup
/init-10-dev --force
```

## Advanced Usage

### Custom Template Location

```bash
/init-10-dev --template-dir ./custom-templates
```

### Multi-Language Projects

Initialize for each language:
```bash
/init-10-dev --language python --dir ./backend
/init-10-dev --language typescript --dir ./frontend
```

### CI/CD Integration

Generated configurations work with CI/CD:
```yaml
# .github/workflows/test.yml
- run: make install
- run: make lint
- run: make test
```

## See Also

- `/check-10-dev` - Verify initialization
- `/apply-10-dev` - Use the workflow
- `skills/10-stages-developing/build-templates/` - View templates
- Build tool documentation for customization
