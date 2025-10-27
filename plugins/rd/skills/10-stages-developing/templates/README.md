# Templates Directory

Complete templates for each programming language, including both **build configuration** and **code templates**.

## Structure

Each language directory contains everything you need to get started:

```
templates/
├── python/          # Python project templates
│   ├── Makefile            # Build configuration with standard tasks
│   ├── function-template.py    # Function implementation template
│   └── test-template.py        # Test suite template
│
├── javascript/      # JavaScript project templates
│   ├── package.json        # NPM configuration with scripts
│   ├── function-template.js    # Function implementation template
│   └── test-template.js        # Jest test template
│
├── typescript/      # TypeScript project templates
│   ├── package.json        # NPM configuration with TS support
│   ├── function-template.ts    # TypeScript function template
│   └── test-template.ts        # TypeScript test template
│
├── java/            # Java project templates
│   ├── pom.xml             # Maven configuration
│   ├── FunctionTemplate.java   # Java class template
│   └── FunctionTemplateTest.java  # JUnit test template
│
├── go/              # Go project templates
│   ├── Makefile            # Build configuration for Go
│   ├── function-template.go    # Go function template
│   └── function-template_test.go  # Go test template
│
└── rust/            # Rust project templates
    ├── Makefile            # Build configuration for Rust
    └── function-template.rs    # Rust module with tests
```

## What's Included

### Build Configuration Files

Each language has its standard build tool configured with:

**Standard Tasks (all languages)**:
- `install` - Install dependencies
- `test` - Run all tests with coverage
- `test-unit` - Unit tests only
- `test-integration` - Integration tests only
- `test-e2e` - End-to-end tests
- `test-file` - Run specific test file
- `test-function` - Run specific test function
- `lint` - Code quality checks
- `format` - Code formatting
- `build` - Compile/package project
- `clean` - Remove build artifacts
- `notify-start` - Workflow start notification
- `notify-end` - Workflow completion notification
- `stage-0` through `stage-9` - Stage-specific tasks

**Language-Specific**:
- **Python**: `Makefile` with uv, ruff, mypy, pytest
- **JavaScript/TypeScript**: `package.json` with Jest, ESLint, Prettier
- **Java**: `pom.xml` with JUnit 5, Jacoco, Checkstyle
- **Go**: `Makefile` with go test, golangci-lint
- **Rust**: `Makefile` with cargo, clippy, rustfmt

### Code Templates

**Function Templates**:
- Complete function structure with documentation
- Type hints/annotations
- Input validation
- Error handling
- Example usage

**Test Templates**:
- Smoke test
- Normal case tests
- Edge case tests
- Error case tests
- Parametrized tests

## Usage

### Quick Start

1. **Copy templates for your language**:
   ```bash
   # Python
   cp templates/python/Makefile ./
   cp templates/python/function-template.py src/my_function.py
   cp templates/python/test-template.py tests/test_my_function.py

   # JavaScript
   cp templates/javascript/package.json ./
   cp templates/javascript/function-template.js src/myFunction.js
   cp templates/javascript/test-template.js tests/myFunction.test.js
   ```

2. **Customize the templates**:
   - Replace placeholder names
   - Update function logic
   - Adjust test cases

3. **Start using**:
   ```bash
   make install  # or npm install
   make test     # or npm test
   ```

### Using with `/init-10-dev`

Let Claude Code do it automatically:
```bash
/init-10-dev
```

This will:
- Detect your project language
- Copy appropriate templates
- Customize for your project structure
- Create directory structure
- Verify setup

## Template Details

### Python Templates

**Makefile** includes:
- Modern tooling (uv for package management)
- ruff for linting and formatting
- mypy for type checking
- pytest with coverage

**Code templates** follow:
- PEP 8 style guide
- Type hints (PEP 484)
- Docstring format (Google/NumPy style)

### JavaScript/TypeScript Templates

**package.json** includes:
- Jest for testing
- ESLint for linting
- Prettier for formatting
- Coverage configuration

**Code templates** follow:
- ESM module format
- JSDoc comments (JavaScript)
- Full TypeScript typing (TypeScript)

### Java Templates

**pom.xml** includes:
- JUnit 5 for testing
- Jacoco for coverage
- Checkstyle for code quality
- Maven profiles for different test types

**Code templates** follow:
- Maven standard directory layout
- Javadoc comments
- Proper exception handling

### Go Templates

**Makefile** includes:
- go test with race detection
- golangci-lint for comprehensive linting
- Coverage reports

**Code templates** follow:
- Go standard project layout
- Godoc comments
- Table-driven tests

### Rust Templates

**Makefile** includes:
- cargo test
- clippy for linting
- rustfmt for formatting

**Code templates** follow:
- Rust standard project layout
- Rustdoc comments
- Unit and integration tests

## Customization

### Modifying Build Configuration

**Add custom tasks**:

**Makefile**:
```makefile
## my-custom-task: Description
my-custom-task:
	@echo "Running custom task"
	# Your commands
```

**package.json**:
```json
{
  "scripts": {
    "my:custom": "echo 'Running custom task'"
  }
}
```

### Adding Project-Specific Tools

**Python** - Add to Makefile:
```makefile
install:
	uv pip install -e ".[dev]"
	uv pip install your-tool
```

**JavaScript** - Add to package.json:
```json
{
  "devDependencies": {
    "your-tool": "^1.0.0"
  }
}
```

## Best Practices

### When to Use Templates

✅ **Use templates for**:
- Starting new projects
- Adding new modules to existing projects
- Standardizing team practices
- Quick prototyping with proper structure

⚠️ **Adapt templates when**:
- Project has different conventions
- Using different testing framework
- Different build tool required
- Team has established patterns

### Template Maintenance

**Keep templates updated**:
- Update tool versions periodically
- Add new best practices as they emerge
- Incorporate team feedback
- Remove deprecated patterns

**Document customizations**:
- Note changes from standard templates
- Explain why custom patterns exist
- Share learnings with team

## Integration with 10-Stage Workflow

These templates are designed to work seamlessly with the 10-stage workflow:

**Stage 1**: Use function template structure for specification
**Stage 2**: Use test template for smoke test
**Stage 5**: Use function template for implementation
**Stage 6**: Use test template patterns for comprehensive tests

## Language-Specific Notes

### Python
- Templates assume Python 3.11+
- Uses modern tooling (uv, ruff)
- Type hints required

### JavaScript
- Assumes ES6+ features
- Uses Jest for testing
- ESLint with recommended rules

### TypeScript
- Strict type checking enabled
- Uses ts-jest
- Full type coverage expected

### Java
- Assumes Java 17+
- Maven standard layout
- JUnit 5 with new features

### Go
- Uses Go modules
- Table-driven tests
- Race detection enabled

### Rust
- Uses cargo workspaces pattern
- Unit and integration tests
- Clippy warnings enforced

## Troubleshooting

### "Template doesn't work with my setup"

**Solution**: Templates are starting points, customize as needed
```bash
# Copy template
cp templates/python/Makefile ./

# Edit for your project
vim Makefile  # Adjust paths, add custom tasks
```

### "Different testing framework"

**Solution**: Keep build task names, swap implementation
```makefile
# Original
test:
	pytest tests/

# Your framework
test:
	your-test-runner tests/
```

### "Missing tools"

**Solution**: Install required tools
```bash
# Python
pip install uv ruff mypy pytest

# JavaScript
npm install -D jest eslint prettier

# Go
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
```

## See Also

- Main README: `../README.md`
- Skill documentation: `../SKILL.md`
- Examples: `../docs/examples.md`
- Plugin commands: `../../.claude-plugin/commands/`

## Contributing

Found a bug or have an improvement?
- Test templates with real projects
- Share feedback on what works
- Suggest new patterns
- Report issues
