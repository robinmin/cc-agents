# Agent Skills Best Practices

Comprehensive guidelines for creating high-quality Claude Code Agent Skills.

## Content Writing

### Conciseness Principles

**Challenge Every Piece:**
- Ask: "Does Claude already know this?"
- If yes, omit it
- Only include information that fills gaps in Claude's knowledge

**Examples:**

❌ **Too Verbose:**
```
Python is a programming language. To read a file in Python, you use the
open() function. The open() function takes a filename parameter and a mode
parameter. The mode 'r' means read mode. After reading, you should close
the file.
```

✅ **Concise:**
```
Read configuration files using the strict validation pattern:
- Use `ConfigParser` for .ini files
- Validate all required sections exist before parsing
- Raise `ConfigError` with specific missing field names
```

### Freedom Levels

**High Freedom (Text Instructions):**
Use when multiple valid approaches exist.

Example:
```
Review the code for:
- Security vulnerabilities
- Performance bottlenecks
- Maintainability issues

Provide recommendations with severity levels.
```

**Medium Freedom (Pseudocode):**
Use when preferred patterns exist but variation is acceptable.

Example:
```
1. Parse input file
2. For each record:
   - Validate required fields
   - Transform to target schema
   - Accumulate errors
3. If errors exist, report and exit
4. Otherwise, write output
```

**Low Freedom (Specific Scripts):**
Use for fragile operations requiring exact sequences.

Example:
```bash
# Execute this exact sequence for database migration:
python scripts/backup_db.py
python scripts/run_migration.py --version 2.0
python scripts/verify_schema.py
```

## Naming Best Practices

### Skill Names

**Good Examples:**
- `processing-pdfs` (gerund form)
- `code-review-guide` (noun phrase)
- `api-documentation-builder` (clear purpose)
- `test-automation-workflow` (specific domain)

**Bad Examples:**
- `helper` (too vague)
- `utils` (no clear purpose)
- `my-tool` (not descriptive)
- `project_skill` (inconsistent formatting)

### Descriptions

**Template:**
"[Does X]. Use when [condition/context]."

**Good Examples:**
```
"Analyzes Python code for security vulnerabilities using bandit and safety.
Use when reviewing Python projects for production deployment."

"Generates API documentation from OpenAPI/Swagger specifications.
Use when creating or updating REST API documentation."
```

**Bad Examples:**
```
"Helps with code" (too vague)
"A tool for developers" (no activation condition)
"Skill for testing" (what kind of testing?)
```

## Structure Patterns

### Progressive Disclosure

**SKILL.md (Core - Always Loaded):**
- Main workflow (numbered steps)
- Quick reference
- When to use this skill
- Links to detailed guides

**REFERENCE.md (Details - Loaded As Needed):**
- Comprehensive API documentation
- Edge cases
- Advanced configurations
- Troubleshooting guide

**EXAMPLES.md (Concrete - Loaded As Needed):**
- Complete input/output pairs
- Common scenarios
- Anti-patterns
- Best practice demonstrations

### File Reference Strategy

**One Level Deep:**
Claude fully reads files referenced directly from SKILL.md but may partially read files referenced from secondary files.

✅ **Good:**
```
SKILL.md → REFERENCE.md (fully read)
SKILL.md → EXAMPLES.md (fully read)
```

❌ **Problematic:**
```
SKILL.md → REFERENCE.md → ADVANCED.md (may be partially read)
```

**Solution:** Reference ADVANCED.md directly from SKILL.md if it's critical.

## Workflow Design

### Clear Steps Pattern

**Template:**
```
1. [Preparation step]
2. [Main action step]
3. [Validation step]
4. [Error handling step]
5. [Completion step]
```

**Example:**
```
1. Analyze codebase structure and identify test files
2. Run test suite with coverage reporting
3. Validate coverage meets 80% threshold
4. If coverage < 80%, identify untested modules
5. Generate coverage report in markdown format
```

### Validation Loops

For operations requiring correctness:

```
Step 1: Execute operation
Step 2: Run validator
Step 3: If validation fails:
  - Review error messages
  - Fix identified issues
  - Return to Step 1
Step 4: Proceed to next operation
```

### Checklist Pattern

For multi-step critical operations:

```
Pre-deployment Checklist:
- [ ] All tests passing
- [ ] No security vulnerabilities
- [ ] Documentation updated
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Monitoring configured
```

## Script Best Practices

### Error Handling

❌ **Poor Error Handling:**
```python
def process_file(path):
    data = open(path).read()
    return parse(data)
```

✅ **Good Error Handling:**
```python
def process_file(path):
    if not os.path.exists(path):
        print(f"ERROR: File not found: {path}")
        print("Please verify the file path and try again.")
        sys.exit(1)

    try:
        with open(path, 'r') as f:
            data = f.read()
    except PermissionError:
        print(f"ERROR: Permission denied reading: {path}")
        print("Check file permissions and try again.")
        sys.exit(1)

    try:
        return parse(data)
    except ParseError as e:
        print(f"ERROR: Failed to parse file: {e}")
        print(f"Verify file format matches expected schema.")
        sys.exit(1)
```

### Justified Parameters

❌ **Magic Numbers:**
```python
results = query.limit(100).fetch()
time.sleep(5)
```

✅ **Justified Parameters:**
```python
# Maximum results per query to prevent memory issues
MAX_RESULTS = 100
results = query.limit(MAX_RESULTS).fetch()

# Wait for API rate limit reset (documented at 5s)
API_RATE_LIMIT_WAIT = 5
time.sleep(API_RATE_LIMIT_WAIT)
```

### Execution Intent

Make clear whether Claude should execute or read scripts:

**Execute:**
```
Run `scripts/deploy.sh` to deploy the application.
```

**Read as Reference:**
```
See `scripts/example_usage.py` for implementation patterns.
```

## Testing Strategies

### Build Evaluations First

1. Create test scenarios before extensive documentation
2. Establish baseline behavior
3. Write minimal instructions addressing gaps
4. Iterate based on test results

### Cross-Model Testing

Test with:
- **Haiku**: Verify core functionality works with smaller model
- **Sonnet**: Confirm standard usage patterns
- **Opus**: Validate complex scenarios

### Fresh Instance Testing

- Don't test with Claude instances that helped write the skill
- Use fresh conversations to simulate real usage
- Observe where Claude struggles without prior context

### Real Usage Validation

- Test with actual use cases, not synthetic examples
- Observe patterns of success and failure
- Refine based on observed behavior, not assumptions

## Anti-Patterns Deep Dive

### Path Issues

❌ **Windows Paths:**
```
reference\advanced\guide.md
scripts\utilities\helper.py
```

✅ **Universal Paths:**
```
reference/advanced/guide.md
scripts/utilities/helper.py
```

### Excessive Options

❌ **Too Many Choices:**
```
Choose output format:
- JSON (for APIs)
- YAML (for configs)
- XML (for legacy systems)
- TOML (for Rust projects)
- INI (for simple configs)
- CSV (for data export)
```

✅ **Clear Default:**
```
Output format: JSON (default)
Use YAML for configuration files with `--format yaml`
```

### Deep Nesting

❌ **Too Deep:**
```
SKILL.md references:
  → REFERENCE.md references:
      → ADVANCED.md (may be partially read)
```

✅ **Flat Structure:**
```
SKILL.md references:
  → REFERENCE.md
  → ADVANCED.md (both fully read)
```

## Terminology Consistency

### Pick One Term

❌ **Inconsistent:**
```
Extract the data from the API endpoint.
Pull the response from the URL.
Get information from the service path.
Retrieve the payload from the resource.
```

✅ **Consistent:**
```
Extract data from the API endpoint.
Extract the response from the endpoint.
Extract information from the endpoint.
Extract the payload from the endpoint.
```

### Create a Glossary

For complex domains, define terms upfront:

```
Terminology:
- **Endpoint**: API URL path (e.g., `/api/v1/users`)
- **Request**: HTTP call to an endpoint
- **Response**: Data returned from an endpoint
- **Payload**: Request or response body data
```

## Context Optimization

### Token Efficiency

**Avoid Repetition:**
Use references instead of duplicating content.

❌ **Repetitive:**
```
For Python projects: Run pytest, check coverage, validate tests
For Node projects: Run jest, check coverage, validate tests
For Go projects: Run go test, check coverage, validate tests
```

✅ **Reference:**
```
For all projects:
1. Run language-specific test command (see REFERENCE.md)
2. Check coverage meets threshold
3. Validate test quality
```

**Use Tables:**
Replace verbose lists with compact tables.

❌ **Verbose:**
```
For Python, use pytest as the test runner.
For JavaScript, use jest as the test runner.
For Go, use the built-in go test.
For Rust, use cargo test.
```

✅ **Compact:**
```
| Language   | Test Command  |
|------------|---------------|
| Python     | pytest        |
| JavaScript | jest          |
| Go         | go test       |
| Rust       | cargo test    |
```

## Quality Metrics

Track these indicators:

**Activation Accuracy:**
- Does skill trigger when expected?
- Does it avoid triggering when not relevant?

**Execution Success:**
- Does Claude follow workflows correctly?
- Are validation loops effective?
- Do scripts handle errors gracefully?

**Token Efficiency:**
- Is SKILL.md under 500 lines?
- Are references one level deep?
- Is content concise without losing clarity?

**Cross-Model Consistency:**
- Works on Haiku, Sonnet, and Opus?
- Behavior consistent across models?
- Performance acceptable on smaller models?
