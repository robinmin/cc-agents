# check-10-dev Command

Check if all preconditions for the 10-stage development workflow are met in the current project.

## What This Command Does

Validates the project environment to ensure it's ready for the 10-stage development workflow:

1. **Detect Project Type**: Identify programming language and project structure
2. **Check Build Tool**: Verify presence of appropriate build tool (make, npm/pnpm, maven/gradle)
3. **Verify Build Configuration**: Check if standard tasks are defined
4. **Validate Test Setup**: Confirm testing framework is configured
5. **Check Directory Structure**: Verify source and test directories exist
6. **Report Status**: Provide clear feedback on what's ready and what's missing

## Precondition Checklist

### Python Projects
- [ ] `Makefile` exists with standard tasks (test, lint, format, build)
- [ ] Testing framework installed (pytest preferred)
- [ ] Linter configured (ruff preferred)
- [ ] Type checker available (mypy)
- [ ] Source directory exists (`src/` or equivalent)
- [ ] Test directory exists (`tests/` or equivalent)

### JavaScript/TypeScript Projects
- [ ] `package.json` exists with standard scripts
- [ ] Testing framework configured (jest preferred)
- [ ] Linter configured (eslint)
- [ ] Formatter configured (prettier)
- [ ] Source directory exists (`src/`)
- [ ] Test directory exists (`tests/` or `__tests__/`)

### Go Projects
- [ ] `Makefile` exists with standard tasks
- [ ] `go.mod` file present
- [ ] golangci-lint available
- [ ] Standard Go project structure

### Rust Projects
- [ ] `Cargo.toml` exists
- [ ] `Makefile` optional but recommended
- [ ] clippy and rustfmt available
- [ ] Standard Rust project structure

### Java Projects
- [ ] `pom.xml` (Maven) or `build.gradle` (Gradle) exists
- [ ] JUnit configured
- [ ] Checkstyle or similar linter configured
- [ ] Standard Maven/Gradle directory structure

## Execution Process

When you run `/check-10-dev`, Claude will:

1. **Analyze Project Root**
   - Detect language from file extensions and config files
   - Identify build tool from presence of Makefile, package.json, pom.xml, etc.

2. **Check Build Tool Configuration**
   - Verify presence of standard tasks:
     - `test` (run all tests)
     - `test-unit` (unit tests only)
     - `test-integration` (integration tests)
     - `lint` (code quality checks)
     - `format` (code formatting)
     - `build` (compile/package)
     - `notify-start` / `notify-end` (workflow notifications)

3. **Validate Testing Setup**
   - Check test framework is installed
   - Verify test directory structure
   - Confirm test runner is accessible

4. **Check Development Tools**
   - Linter availability
   - Formatter availability
   - Type checker (if applicable)

5. **Generate Report**
   - ✅ Items that are properly configured
   - ⚠️ Items that need attention
   - ❌ Items that are missing
   - 📋 Recommended next steps

## Example Output

```
🔍 10-STAGE WORKFLOW PRECONDITION CHECK

Project Type: Python
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
  - integration test directory (tests/integration/) not found
  - notify-start/notify-end tasks not defined in Makefile

❌ MISSING:
  - None

📋 RECOMMENDATIONS:
1. Create tests/integration/ directory for integration tests
2. Add notify-start and notify-end tasks to Makefile
3. Ready to use /apply-10-dev once above items are addressed

OVERALL STATUS: 90% Ready
```

## What to Do After Running check-10-dev

### If Status is 100% Ready
- Proceed with `/apply-10-dev <function-name>` to start development

### If Items Need Attention
- Use `/init-10-dev` to automatically configure missing items
- Or manually add recommended configurations

### If Major Items are Missing
- Install required tools (testing framework, linter, etc.)
- Set up basic project structure
- Run `/init-10-dev` to generate build tool templates

## Command Usage

```bash
# Check current project
/check-10-dev

# Check and show detailed report
/check-10-dev --verbose

# Check specific language project
/check-10-dev --language python
```

## Integration with Other Commands

- **Before `/apply-10-dev`**: Run this to ensure environment is ready
- **After `/init-10-dev`**: Run this to verify initialization succeeded
- **Periodic Health Check**: Run occasionally to ensure configuration is maintained

## Troubleshooting

### "Cannot detect project type"
- Ensure you're in project root directory
- Check for language-specific files (package.json, Cargo.toml, etc.)

### "Build tool not found"
- Install make (Python/Go/Rust) or ensure package.json exists (JS/TS)
- Use `/init-10-dev` to create build configuration

### "Test framework not configured"
- Install testing framework (pytest, jest, etc.)
- Add test configuration to project

### "Standard tasks missing"
- Use `/init-10-dev` to generate build templates
- Or manually add tasks following the templates in `build-templates/`
