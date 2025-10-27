# Agent Skills Examples

Complete examples demonstrating best practices for Claude Code Agent Skills.

## Example 1: Code Review Skill (Complete)

```
code-review/
├── SKILL.md
├── REFERENCE.md
└── scripts/
    └── run_linters.sh
```

### SKILL.md
```markdown
---
name: code-review
description: Performs comprehensive code reviews focusing on security, performance, and maintainability. Use when reviewing pull requests or preparing code for production.
---

# Code Review Skill

Systematic approach to reviewing code for production readiness.

## Workflow

1. **Analyze Scope**
   - Identify changed files
   - Categorize by domain (backend, frontend, tests, config)
   - Assess risk level

2. **Run Automated Checks**
   - Execute `scripts/run_linters.sh` for static analysis
   - Review linter output for critical issues
   - Verify all tests pass

3. **Manual Review**
   - Security: Check for common vulnerabilities (see REFERENCE.md)
   - Performance: Identify inefficient algorithms or queries
   - Maintainability: Assess code clarity and documentation

4. **Generate Report**
   Use this format:
   ```
   ## Code Review Summary

   **Risk Level:** [Low/Medium/High]

   ### Critical Issues
   - [Issue with file:line reference]

   ### Recommendations
   - [Suggestion with rationale]

   ### Positive Observations
   - [Good patterns to acknowledge]
   ```

5. **Validation**
   - [ ] All critical security issues flagged
   - [ ] Performance concerns documented
   - [ ] Recommendations actionable
   - [ ] Code references specific (file:line)

## Quick Reference

**Security Checklist:**
- SQL injection risks
- XSS vulnerabilities
- Authentication/authorization issues
- Sensitive data exposure
- Cryptography misuse

**Performance Red Flags:**
- N+1 query patterns
- Missing indexes
- Inefficient loops
- Unnecessary synchronous operations

**Maintainability Indicators:**
- Clear naming conventions
- Adequate documentation
- Proper error handling
- Test coverage

See REFERENCE.md for detailed guidelines and examples.
```

### REFERENCE.md
```markdown
# Code Review Reference

## Security Vulnerabilities

### SQL Injection

**Vulnerable Pattern:**
```python
query = f"SELECT * FROM users WHERE id = {user_id}"
cursor.execute(query)
```

**Secure Pattern:**
```python
query = "SELECT * FROM users WHERE id = %s"
cursor.execute(query, (user_id,))
```

### XSS Prevention

**Vulnerable Pattern:**
```javascript
element.innerHTML = userInput;
```

**Secure Pattern:**
```javascript
element.textContent = userInput;
// Or use DOMPurify for rich content
element.innerHTML = DOMPurify.sanitize(userInput);
```

## Performance Patterns

### N+1 Query Problem

**Inefficient:**
```python
users = User.query.all()
for user in users:
    posts = Post.query.filter_by(user_id=user.id).all()
```

**Optimized:**
```python
users = User.query.options(joinedload(User.posts)).all()
```

### Database Indexing

**Missing Index Indicator:**
- WHERE clause on unindexed column
- JOIN on unindexed foreign key
- ORDER BY on unindexed column

**Solution:**
```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_posts_user_id ON posts(user_id);
```

## Maintainability Guidelines

### Naming Conventions

**Functions:**
- Use verb phrases: `calculate_total()`, `fetch_user_data()`
- Be specific: `validate_email_format()` not `check()`

**Variables:**
- Descriptive names: `user_session_timeout` not `t`
- Boolean prefixes: `is_valid`, `has_permission`, `can_edit`

### Documentation Standards

**Docstring Template:**
```python
def process_payment(amount: float, currency: str) -> PaymentResult:
    """
    Process a payment transaction.

    Args:
        amount: Payment amount in specified currency
        currency: ISO 4217 currency code (e.g., "USD", "EUR")

    Returns:
        PaymentResult with transaction ID and status

    Raises:
        InvalidAmountError: If amount is negative or zero
        UnsupportedCurrencyError: If currency code is invalid
    """
```
```

### scripts/run_linters.sh
```bash
#!/bin/bash
# Run all configured linters for code review

set -e

echo "Running static analysis..."

# Python
if [ -f "pyproject.toml" ] || [ -f "setup.py" ]; then
    echo "→ Python: ruff check"
    ruff check . || echo "⚠️  Ruff found issues"

    echo "→ Python: mypy type check"
    mypy . || echo "⚠️  mypy found type issues"
fi

# JavaScript/TypeScript
if [ -f "package.json" ]; then
    echo "→ JavaScript: ESLint"
    npm run lint || echo "⚠️  ESLint found issues"

    if [ -f "tsconfig.json" ]; then
        echo "→ TypeScript: tsc"
        npm run type-check || echo "⚠️  TypeScript found issues"
    fi
fi

# Go
if [ -f "go.mod" ]; then
    echo "→ Go: staticcheck"
    staticcheck ./... || echo "⚠️  staticcheck found issues"
fi

echo "✓ Static analysis complete"
```

## Example 2: API Documentation Generator (Minimal)

Demonstrates minimalist approach for straightforward tasks.

```markdown
---
name: api-docs-generator
description: Generates API documentation from OpenAPI/Swagger specifications. Use when creating or updating REST API documentation.
---

# API Documentation Generator

Convert OpenAPI specs to readable documentation.

## Workflow

1. Locate OpenAPI specification file (openapi.yaml or swagger.json)
2. Validate specification:
   ```bash
   npx @apidevtools/swagger-cli validate openapi.yaml
   ```
3. Generate documentation using this format:

```markdown
# API Documentation

## Endpoints

### [METHOD] /path

**Description:** [endpoint purpose]

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| param | string | Yes | [description] |

**Request Body:**
```json
{
  "field": "value"
}
```

**Responses:**
- 200: Success
- 400: Bad Request
- 401: Unauthorized
```

4. Include authentication requirements
5. Add example requests/responses
6. Document error codes

## Example Output

Input: `GET /api/v1/users/{id}`

Output:
```markdown
### GET /api/v1/users/{id}

Retrieve user by ID.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | integer | Yes | User ID |

**Response 200:**
```json
{
  "id": 123,
  "name": "John Doe",
  "email": "john@example.com"
}
```
```
```

## Example 3: Test Automation (Script-Heavy)

Demonstrates workflow with multiple utility scripts.

```
test-automation/
├── SKILL.md
└── scripts/
    ├── run_tests.py
    ├── generate_report.py
    └── validate_coverage.py
```

### SKILL.md
```markdown
---
name: test-automation
description: Automates test execution with coverage reporting and quality validation. Use when running test suites or validating test coverage.
---

# Test Automation Skill

Comprehensive test execution with quality gates.

## Workflow

1. **Execute Tests**
   ```bash
   python scripts/run_tests.py
   ```
   This runs all tests with coverage tracking

2. **Validate Coverage**
   ```bash
   python scripts/validate_coverage.py --threshold 80
   ```
   Ensures minimum coverage threshold is met

3. **Generate Report**
   ```bash
   python scripts/generate_report.py --format markdown
   ```
   Creates formatted test report

4. **Review Results**
   - Check for failing tests
   - Identify untested code paths
   - Validate coverage meets requirements

## Quality Gates

Tests must pass ALL gates:
- [ ] All tests passing (no failures or errors)
- [ ] Coverage ≥ 80%
- [ ] No critical code paths untested
- [ ] Test execution time < 5 minutes

If any gate fails:
1. Review failure details
2. Fix identified issues
3. Re-run validation

## Configuration

Default settings (modify in scripts/config.json):
- Coverage threshold: 80%
- Timeout per test: 30s
- Report format: markdown
- Critical paths: src/auth/, src/payment/
```

## Example 4: Data Processing Pipeline

Demonstrates validation loop pattern.

```markdown
---
name: data-processing
description: Processes data files through validation, transformation, and output stages. Use when working with CSV, JSON, or structured data files.
---

# Data Processing Pipeline

Multi-stage data processing with validation.

## Workflow

1. **Load Input**
   - Accept file path
   - Detect format (CSV, JSON, XML)
   - Verify file accessibility

2. **Validate Input**
   Check for:
   - Required fields present
   - Data types correct
   - No duplicate records
   - Value constraints met

   If validation fails:
   - Report specific errors with line numbers
   - Suggest corrections
   - STOP processing (do not continue with invalid data)

3. **Transform Data**
   Apply transformations:
   - Normalize field names
   - Convert data types
   - Calculate derived fields
   - Filter invalid records

4. **Validate Output**
   Verify transformed data:
   - Schema compliance
   - Business rule adherence
   - Data integrity

5. **Write Output**
   - Generate output file
   - Create processing summary
   - Log any warnings

## Validation Loop Example

```
Input: users.csv with 1000 records

→ Validate Input
  ✓ All required fields present
  ✗ Row 45: Invalid email format
  ✗ Row 103: Missing required field 'phone'

→ Report Errors
  ERROR: 2 validation errors found
  - Row 45: email field invalid
  - Row 103: phone field missing

→ STOP (do not proceed with transformation)

[User fixes errors]

→ Validate Input (retry)
  ✓ All validations passed

→ Transform Data
  ✓ 1000 records processed
  ✓ 50 derived fields calculated

→ Validate Output
  ✓ Schema compliance verified
  ✓ Business rules satisfied

→ Write Output
  ✓ users_processed.csv created
  ✓ Summary: 1000 records processed successfully
```

## Error Handling

**File Not Found:**
```
ERROR: Input file not found: data/users.csv
Please verify the file path and try again.
```

**Invalid Format:**
```
ERROR: Unsupported file format: .xlsx
Supported formats: .csv, .json, .xml
```

**Validation Failure:**
```
ERROR: 5 validation errors found:
  Row 12: Invalid date format (expected YYYY-MM-DD)
  Row 34: Value out of range (age must be 0-120)
  Row 45: Missing required field: email
  Row 67: Invalid phone number format
  Row 89: Duplicate record (ID: 12345)

Please correct these errors and retry.
```
```

## Key Takeaways

**Example 1 (Code Review):**
- Complete structure with SKILL.md, REFERENCE.md, and scripts
- Clear workflow with validation checklist
- Detailed reference for common patterns
- Utility script for automation

**Example 2 (API Docs):**
- Minimal approach for straightforward task
- Template-driven output
- Claude already knows API documentation basics

**Example 3 (Test Automation):**
- Script-heavy approach for complex automation
- Quality gates pattern
- Clear configuration options

**Example 4 (Data Processing):**
- Validation loop pattern
- Explicit error handling
- Step-by-step execution with decision points
