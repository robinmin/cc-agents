# 10-Stage Development Workflow Skill

A systematic, test-driven development workflow for building high-quality functions in any programming language with modern tooling and flexible automation.

## Overview

This Claude Code skill provides a disciplined 10-stage workflow for function development with:
- ✅ Test-driven development (TDD) principles
- ✅ Multi-language support (Python, JavaScript, TypeScript, Java, Go, Rust)
- ✅ Soft contract build tool approach (flexible, maintainable)
- ✅ Integration testing for related functions
- ✅ Continuous validation and comprehensive testing
- ✅ Claude Code plugin integration with 4 commands
- ✅ Modern tooling defaults (uv, ruff, pytest, pnpm, Jest, cargo, etc.)

## Quick Start

### Using Claude Code Commands

The fastest way to use this skill is through the **"rd" (Rapid Development)** plugin:

```bash
# 1. Check if your project is ready for the workflow
/rd:check-10-dev

# 2. Initialize build configuration (if needed)
/rd:init-10-dev

# 3. Apply the workflow to implement a function
/rd:apply-10-dev validate_email

# 4. Create integration tests for related functions
/rd:integrate-10-dev get_user_info set_user_info
```

### Manual Workflow

Alternatively, activate the skill automatically by:
1. Mentioning "10-stage workflow" or "TDD workflow" in your request
2. Asking Claude Code to implement a function with comprehensive testing
3. The skill will guide you through all 10 stages systematically

## File Structure

```
10-stages-developing/
├── SKILL.md                      # Main skill definition
├── README.md                     # This file
├── docs/
│   ├── quick-reference.md        # One-page cheat sheet by language
│   ├── examples.md               # Complete working examples
│   └── troubleshooting.md        # Stage-specific troubleshooting
└── templates/                    # Language-specific templates
    ├── python/
    │   ├── Makefile              # Build configuration
    │   ├── function-template.py  # Function template
    │   └── test-template.py      # Test template
    ├── javascript/
    │   ├── package.json          # NPM configuration
    │   ├── function-template.js
    │   └── test-template.js
    ├── typescript/
    │   ├── package.json          # NPM with TypeScript
    │   ├── function-template.ts
    │   └── test-template.ts
    ├── java/
    │   ├── pom.xml               # Maven configuration
    │   ├── FunctionTemplate.java
    │   └── FunctionTemplateTest.java
    ├── go/
    │   ├── Makefile              # Go build config
    │   ├── function-template.go
    │   └── function-template_test.go
    ├── rust/
    │   ├── Makefile              # Rust build config
    │   └── function-template.rs
    └── README.md
```

## The 10 Stages (Enhanced)

```
Stage 0:  Announce Start           → Declare workflow beginning
Stage 1:  Define Specification      → Plan function signature & behavior
Stage 2:  Create Smoke Test         → Write initial failing test
Stage 3:  Initial Syntax Check      → Validate test code
Stage 4:  Run Smoke Test            → Confirm test fails (expected)
Stage 5:  Implement Function        → Write actual implementation
Stage 6:  Expand Unit Tests         → Add comprehensive unit tests
Stage 6b: Create Integration Tests  → [NEW] Test related functions together
Stage 7:  Final Syntax Check        → Validate all code
Stage 8:  Verify All Tests Pass     → Confirm unit + integration tests succeed
Stage 9:  Report Completion         → Summarize results
```

### What's New in Stage 6b

**Integration Testing** - Automatically suggested when:
- Multiple related functions exist (e.g., `get_user_info` + `set_user_info`)
- Functions form workflows (CRUD operations)
- Functions share data models or state
- Functions have input/output dependencies

Example integration test scenarios:
- **CRUD workflows**: Create → Read → Update → Delete
- **Data pipelines**: Extract → Transform → Load
- **Async operations**: Start → Check status → Get results
- **Error propagation**: How errors flow through the system

## Claude Code Plugin Commands

The **"rd" (Rapid Development)** plugin provides 4 commands:

### `/rd:check-10-dev`

**Purpose**: Verify project preconditions before starting workflow

**What it checks**:
- ✅ Build tool presence (make, npm, mvn, cargo, go)
- ✅ Standard tasks defined (test, lint, format)
- ✅ Test framework configured
- ✅ Directory structure (src/, tests/)
- ✅ Development tools available

**Example output**:
```
✅ READY: Makefile with pytest, ruff, mypy
✅ READY: src/ and tests/ directories exist
⚠️  NEEDS ATTENTION: No integration test directory
STATUS: 90% Ready - Can proceed with workflow
```

### `/rd:apply-10-dev <function-name>`

**Purpose**: Execute complete 10-stage workflow for a function

**Usage**:
```bash
# Basic usage
/rd:apply-10-dev validate_email

# With integration tests
/rd:apply-10-dev set_user_info --with-integration

# Specify language
/rd:apply-10-dev processPayment --language java
```

**Process**:
1. Auto-detects project language and build tool
2. Runs through all 10 stages systematically
3. Uses your project's build tool (make, npm, mvn, etc.)
4. Creates unit tests and optionally integration tests
5. Provides completion report with coverage metrics

### `/rd:init-10-dev`

**Purpose**: Initialize build tool configuration for your project

**Usage**:
```bash
# Auto-detect language
/rd:init-10-dev

# Specify language
/rd:init-10-dev --language python

# Copy specific template
/rd:init-10-dev --template typescript
```

**What it does**:
1. Detects project language from files
2. Copies appropriate template (Makefile, package.json, pom.xml)
3. Customizes for your project structure
4. Creates directory structure (src/, tests/, tests/integration/)
5. Verifies setup with `/rd:check-10-dev`

**Templates provided**:
- **Python**: Makefile with uv, ruff, mypy, pytest
- **JavaScript/TypeScript**: package.json with pnpm, Jest, ESLint, Prettier
- **Java**: pom.xml with Maven, JUnit 5, Jacoco, Checkstyle
- **Go**: Makefile with golangci-lint, go test
- **Rust**: Makefile with cargo, clippy, rustfmt

### `/rd:integrate-10-dev <func1> <func2> ...`

**Purpose**: Create integration tests for related functions

**Usage**:
```bash
# Test two related functions
/rd:integrate-10-dev get_user_info set_user_info

# Test a workflow
/rd:integrate-10-dev create_order process_payment ship_order

# Test all functions in a module
/rd:integrate-10-dev --module user_service
```

**Process**:
1. Analyzes function relationships and data flow
2. Identifies integration scenarios (workflows, CRUD, pipelines)
3. Creates `tests/integration/` test suite
4. Runs integration tests separately from unit tests
5. Reports integration coverage

## Soft Contract Build Tool Approach

### Philosophy

Instead of maintaining universal scripts, we provide **standardized task names** across different build tools. You customize the implementation for your needs.

### Standard Task Names (All Languages)

| Task | Purpose | Examples |
|------|---------|----------|
| `install` | Install dependencies | `make install`, `npm install`, `mvn install` |
| `test` | Run all tests with coverage | `make test`, `npm test`, `mvn test` |
| `test-unit` | Unit tests only | `make test-unit`, `npm run test:unit` |
| `test-integration` | Integration tests | `make test-integration`, `npm run test:integration` |
| `test-e2e` | End-to-end tests | `make test-e2e`, `npm run test:e2e` |
| `test-file` | Single test file | `make test-file FILE=path/to/test.py` |
| `test-function` | Single test function | `make test-function FUNC=test_name` |
| `lint` | Code quality checks | `make lint`, `npm run lint` |
| `format` | Code formatting | `make format`, `npm run format` |
| `build` | Compile/package | `make build`, `npm run build` |
| `clean` | Remove artifacts | `make clean`, `npm run clean` |
| `notify-start` | Workflow start notification | `make notify-start TASK_NAME=func STAGE=0` |
| `notify-end` | Workflow end notification | `make notify-end TASK_NAME=func` |
| `stage-0` through `stage-9` | Stage-specific tasks | `make stage-3`, `npm run stage-8` |

### Benefits

✅ **Flexibility**: Users control their toolchain
✅ **Maintainability**: No universal scripts to maintain
✅ **Integration**: Works with existing build systems
✅ **CI/CD Friendly**: Standard task names across languages
✅ **Extensibility**: Easy to add project-specific tasks

## Usage Examples

### Python with Makefile

```bash
# Install dependencies
make install

# Run all tests
make test

# Run specific test file
make test-file FILE=tests/test_validators.py

# Run specific test function
make test-function FILE=tests/test_validators.py FUNC=test_email_valid

# Integration tests
make test-integration

# Lint and format
make lint
make format

# With notifications (for automation)
make notify-start TASK_NAME=validate_email STAGE=0
make test
make notify-end TASK_NAME=validate_email
```

### JavaScript/TypeScript with npm

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run specific test file
npm run test:file tests/validators.test.js

# Run specific test function
npm run test:function -t "validates email format"

# Integration tests
npm run test:integration

# Lint and format
npm run lint
npm run format

# With notifications
TASK_NAME=validateEmail STAGE=0 npm run notify:start
npm test
TASK_NAME=validateEmail npm run notify:end
```

### Java with Maven

```bash
# Install dependencies
mvn install

# Run all tests
mvn test

# Run specific test
mvn test -Dtest=ValidatorTest

# Integration tests
mvn verify -Pintegration

# Checkstyle
mvn checkstyle:check

# Package
mvn clean package
```

### Go with Makefile

```bash
# Install dependencies
make install

# Run all tests
make test

# Run specific package tests
make test-file PKG=./pkg/validator

# Run specific test function
make test-function PKG=./pkg/validator FUNC=TestEmailValid

# Lint
make lint

# Format
make format
```

### Rust with Makefile

```bash
# Build and test
make build
make test

# Run specific test
make test-function FUNC=test_validate_email

# Lint with clippy
make lint

# Format
make format
```

## Notification System

### Purpose

Enable automation, progress tracking, and integration with CI/CD systems.

### How It Works

Every build template includes `notify-start` and `notify-end` tasks that you can customize:

**Default behavior**: Print workflow information to console

**Customization examples**:
- Send Slack/Discord notifications
- Update project dashboards
- Log to metrics systems
- Track time per stage
- Trigger CI/CD pipelines

### Example Customization (Python Makefile)

```makefile
notify-start:
	@echo "🎼 WORKFLOW: 10-Stage Development - START"
	@curl -X POST https://your-webhook.com/start \
	  -d '{"task":"$(TASK_NAME)","stage":"$(STAGE)"}'
	@echo "Task: $(TASK_NAME)" >> workflow.log

notify-end:
	@echo "🎼 WORKFLOW: 10-Stage Development - COMPLETE"
	@curl -X POST https://your-webhook.com/complete \
	  -d '{"task":"$(TASK_NAME)"}'
```

## Modern Tooling Defaults

### Python
- **Package Manager**: uv (fast, modern alternative to pip)
- **Linter**: ruff (fast, comprehensive)
- **Type Checker**: mypy
- **Test Runner**: pytest with coverage
- **Formatter**: ruff format

### JavaScript/TypeScript
- **Package Manager**: pnpm (fast, disk-efficient)
- **Test Runner**: Jest with coverage
- **Linter**: ESLint with recommended rules
- **Formatter**: Prettier
- **TypeScript**: Strict mode enabled

### Java
- **Build Tool**: Maven
- **Test Framework**: JUnit 5
- **Coverage**: Jacoco
- **Code Quality**: Checkstyle
- **Test Profiles**: unit, integration, e2e

### Go
- **Linter**: golangci-lint (comprehensive)
- **Test Runner**: go test with race detection
- **Coverage**: Built-in coverage reports
- **Format**: gofmt

### Rust
- **Build Tool**: cargo
- **Linter**: clippy (comprehensive)
- **Formatter**: rustfmt
- **Test Runner**: cargo test

## Using Templates

### Quick Copy

```bash
# Python project
cp templates/python/Makefile ./
cp templates/python/function-template.py src/my_function.py
cp templates/python/test-template.py tests/test_my_function.py

# JavaScript project
cp templates/javascript/package.json ./
cp templates/javascript/function-template.js src/myFunction.js
cp templates/javascript/test-template.js tests/myFunction.test.js
```

### With `/rd:init-10-dev` Command

Let Claude Code do it automatically:
```bash
/rd:init-10-dev
```

This will:
1. Detect your project language
2. Copy appropriate templates
3. Customize for your project structure
4. Create directory structure
5. Verify setup

## Documentation

### Quick References
- **`docs/quick-reference.md`**: One-page cheat sheet with all commands by language
- **`docs/examples.md`**: Complete working examples in 5 languages
- **`docs/troubleshooting.md`**: Stage-specific troubleshooting guide

### Templates
- **`templates/README.md`**: Detailed template documentation and customization guide

## Features

### Multi-Language Support

| Language | Build Tool | Test Framework | Coverage | Linting | Formatting |
|----------|------------|----------------|----------|---------|------------|
| Python | Make | pytest | ✅ | ruff | ruff |
| JavaScript | npm/pnpm | Jest | ✅ | ESLint | Prettier |
| TypeScript | npm/pnpm | Jest + ts-jest | ✅ | ESLint | Prettier |
| Java | Maven | JUnit 5 | Jacoco | Checkstyle | Maven |
| Go | Make | go test | ✅ | golangci-lint | gofmt |
| Rust | Make + cargo | cargo test | ✅ | clippy | rustfmt |

### Quality Standards

Every function must have:
- ✅ Clear specification with types
- ✅ Comprehensive documentation
- ✅ Input validation
- ✅ Error handling
- ✅ Smoke test
- ✅ Normal case tests
- ✅ Edge case tests
- ✅ Error condition tests
- ✅ Integration tests (when applicable)

## Best Practices

### Specification (Stage 1)
- Be specific about types and constraints
- Document all assumptions
- Include realistic test data examples
- Consider edge cases upfront
- Plan for integration with related functions

### Testing (Stages 2, 4, 6, 6b, 8)
- Write tests BEFORE implementation
- Test one behavior per test
- Use descriptive test names
- Cover normal, edge, and error cases
- Create integration tests for workflows
- Keep unit and integration tests separated

### Implementation (Stage 5)
- Follow specification exactly
- Validate inputs explicitly
- Handle errors gracefully
- Write clear, maintainable code
- Consider integration points

### Build Configuration
- Customize templates for your project needs
- Add project-specific tasks as needed
- Maintain standard task names for consistency
- Document any deviations from templates

## Philosophy

This workflow transforms ad-hoc function development into a **predictable, high-quality process** by:

1. **Planning first** (Stage 1): Know what you're building
2. **Testing first** (Stage 2): Define success before coding
3. **Validating continuously** (Stages 3, 7): Catch errors early
4. **Implementing systematically** (Stage 5): Follow the plan
5. **Testing comprehensively** (Stages 6, 6b): Cover all scenarios
6. **Verifying completely** (Stage 8): Ensure quality
7. **Integrating thoughtfully** (Stage 6b): Test function interactions

## When to Use

✅ **Use this workflow when:**
- Adding new functions with quality requirements
- Teaching/learning TDD best practices
- Ensuring code consistency across teams
- Implementing features requiring comprehensive testing
- Building related functions that need integration tests
- Setting up systematic development workflows
- Onboarding new team members

⚠️ **Skip or adapt when:**
- Creating quick prototypes or spikes
- Emergency bug fixes (though still valuable)
- Simple variable changes or refactoring
- Exploratory coding sessions

## Integration with Existing Projects

### For New Projects
```bash
# 1. Initialize build configuration
/rd:init-10-dev --language python

# 2. Install dependencies
make install  # or npm install

# 3. Start development
/rd:apply-10-dev first_function
```

### For Existing Projects
```bash
# 1. Check current setup
/rd:check-10-dev

# 2. Adapt templates to match your conventions
# Edit Makefile or package.json to fit your project

# 3. Start using the workflow
/rd:apply-10-dev new_function
```

## Troubleshooting

### "Build tool not found"
**Solution**: Install required build tool or use `/rd:init-10-dev` to set up configuration

### "Tests fail to run"
**Solution**: Check that test framework is installed (`make install` or `npm install`)

### "Different test framework"
**Solution**: Customize build config to use your preferred framework while keeping standard task names

### "Need custom build tasks"
**Solution**: Add your tasks to Makefile/package.json, standard tasks remain unchanged

See `docs/troubleshooting.md` for comprehensive stage-specific guidance.

## Contributing

Found an issue or have a suggestion?
- File an issue in your project tracker
- Propose improvements via pull request
- Share your experience and use cases
- Extend templates for additional languages

## Additional Resources

- **Anthropic Skills Documentation**: https://docs.claude.com/en/docs/agents-and-tools/agent-skills
- **Claude Code Plugin Guide**: https://docs.claude.com/en/docs/agents-and-tools/agent-plugins
- **TDD Best Practices**: See `docs/examples.md`
- **Troubleshooting**: See `docs/troubleshooting.md`
- **Template Customization**: See `templates/README.md`

## What Makes This Different

### vs. Traditional Scripts
- ❌ **Scripts**: Hard-coded, language-specific, hard to maintain
- ✅ **Soft Contracts**: Flexible, user-controlled, easy to customize

### vs. Manual TDD
- ❌ **Manual**: Ad-hoc, inconsistent, easy to skip steps
- ✅ **Systematic**: Structured, repeatable, comprehensive

### vs. Generic Testing
- ❌ **Generic**: Unit tests only, no integration testing
- ✅ **Comprehensive**: Unit + integration + workflows

### vs. Basic Automation
- ❌ **Basic**: Run tests, no structure
- ✅ **Complete**: Specification → Tests → Implementation → Verification

---

**Remember**: This is a systematic workflow designed for quality and consistency. Following all stages in order produces the best results!

**Quick Start**: Run `/rd:check-10-dev` to get started!
