# apply-10-dev Command

Apply the 10-stage development workflow to implement a function or feature systematically.

## What This Command Does

Guides you through the complete 10-stage TDD workflow from specification to verified implementation:

**Stage 0**: Announce workflow start
**Stage 1**: Define function specification
**Stage 2**: Create smoke test (failing)
**Stage 3**: Initial syntax check
**Stage 4**: Run smoke test (expect failure)
**Stage 5**: Implement function
**Stage 6**: Expand test suite (unit + integration)
**Stage 7**: Final syntax check
**Stage 8**: Verify all tests pass
**Stage 9**: Report completion

## Command Usage

```bash
# Apply workflow to new function
/apply-10-dev <function-name>

# Apply with context
/apply-10-dev <function-name> --context "Brief description of what this function should do"

# Apply with language specification
/apply-10-dev <function-name> --language python

# Apply with integration test flag
/apply-10-dev <function-name> --with-integration

# Resume from specific stage
/apply-10-dev <function-name> --resume-from 5
```

## Execution Flow

### Pre-Flight Check
Before starting, Claude will:
1. Run `/check-10-dev` automatically
2. Verify all preconditions are met
3. Detect project language and build tool
4. Confirm test framework availability

### Stage 0: Announce Start

Claude executes:
```bash
# Python/Go/Rust
make notify-start TASK_NAME=<function-name> STAGE=0

# JavaScript/TypeScript
TASK_NAME=<function-name> STAGE=0 npm run notify:start

# Java
mvn exec:exec -Dexec.executable=echo -Dexec.args="Workflow Start"
```

Output shows:
- Function name to implement
- Target language
- Estimated time
- Build tool commands to use

### Stage 1: Define Specification

Claude will:
1. Ask clarifying questions about the function:
   - What should it do?
   - What are the inputs and types?
   - What should it return?
   - What edge cases exist?

2. Generate complete specification:
   ```
   Function: <name>
   Language: <detected>
   Module/Package: <location>

   Inputs:
     - param1: <type> - <description>
     - param2: <type> - <description>

   Outputs:
     - <return-type> - <description>

   Purpose:
     <clear explanation>

   Edge Cases:
     - <case 1>
     - <case 2>

   Test File: <path>
   Source File: <path>
   ```

3. Wait for your approval before proceeding

### Stage 2: Create Smoke Test

Claude will:
1. Create test file in appropriate location
2. Write minimal smoke test that will fail
3. Use realistic test data

Example (Python):
```python
def test_function_name_smoke():
    """Smoke test for function_name."""
    from module import function_name
    result = function_name(test_input)
    assert result is not None
```

### Stage 3: Initial Syntax Check

Claude runs:
```bash
# Python
make stage-3

# JavaScript
npm run stage-3

# Java
mvn test-compile
```

Verifies test file has no syntax errors.

### Stage 4: Run Smoke Test

Claude runs:
```bash
# Python
make test-function FILE=tests/test_module.py FUNC=test_function_name_smoke

# JavaScript
npm run test:function test_function_name_smoke

# Java
mvn test -Dtest=TestClass#testSmokeMethod
```

**Expected**: Test FAILS (function doesn't exist yet)
**Validates**: Test is properly structured

### Stage 5: Implement Function

Claude will:
1. Create source file with function implementation
2. Add complete documentation
3. Include type hints/annotations
4. Add input validation
5. Handle edge cases
6. Include error handling

Following specification exactly from Stage 1.

### Stage 6: Expand Test Suite

Claude creates comprehensive tests:

**Unit Tests**:
- Normal cases (typical inputs)
- Edge cases (empty, boundaries, extremes)
- Error cases (invalid inputs, exceptions)

**Integration Tests** (if --with-integration or related functions exist):
- Test interaction between related functions
- Test data flow through multiple functions
- Test system behavior

Example structure:
```
tests/
  unit/
    test_function_name.py
  integration/
    test_related_functions.py
```

Runs:
```bash
# Python
make test-unit
make test-integration  # if integration tests exist

# JavaScript
npm run test:unit
npm run test:integration
```

### Stage 7: Final Syntax Check

Claude runs:
```bash
# Python
make lint

# JavaScript
npm run lint && npm run type-check

# Java
mvn checkstyle:check
```

Validates both source and test files.

### Stage 8: Verify All Tests Pass

Claude runs:
```bash
# Python
make test

# JavaScript
npm test

# Java
mvn test
```

**Required**: All tests must pass
**Provides**: Coverage report
**Validates**: Complete implementation

If tests fail:
1. Claude analyzes failures
2. Fixes implementation or tests
3. Re-runs until all pass

### Stage 9: Report Completion

Claude runs:
```bash
# Python
make notify-end TASK_NAME=<function-name>

# JavaScript
TASK_NAME=<function-name> npm run notify:end
```

Provides summary:
```
🎼 WORKFLOW COMPLETE: 10-Stage Development

Function: <name>
Language: <language>
Files Created:
  - <source-file>
  - <test-file>

Stage Results:
  ✅ All 10 stages completed successfully
  ✅ Tests: X passed, 0 failed
  ✅ Coverage: Y%

Next Steps:
  - Commit changes: git add . && git commit -m "feat: add <function>"
  - Create PR: git push && gh pr create
  - [If integration tests suggested]: Run /integrate-10-dev
```

## Special Scenarios

### When Integration Tests are Needed

If related functions exist (e.g., `get_user_info` and `set_user_info`), Claude will:

1. **After Stage 6**: Detect related functions
2. **Suggest integration tests**:
   ```
   🔗 Related functions detected:
   - get_user_info (existing)
   - set_user_info (just implemented)

   Recommend: /integrate-10-dev get_user_info set_user_info
   ```
3. **Wait for confirmation** before proceeding
4. **Create integration tests** if approved

### Resuming from a Stage

If workflow is interrupted:
```bash
/apply-10-dev <function-name> --resume-from 5
```

Claude will:
1. Load previous context
2. Skip to specified stage
3. Continue from there

### Working with Existing Code

If function partially exists:
```bash
/apply-10-dev <function-name> --mode refactor
```

Claude will:
1. Analyze existing implementation
2. Add missing tests
3. Improve code quality
4. Ensure coverage

## Integration with Build Tools

Claude uses your project's build tool contract:

| Language | Build Tool | Commands Used |
|----------|------------|---------------|
| Python | make | `make test`, `make lint`, `make test-function` |
| JavaScript | npm/pnpm | `npm test`, `npm run lint`, `npm run test:function` |
| Go | make | `make test`, `make lint`, `make test-function` |
| Rust | make/cargo | `make test` or `cargo test` |
| Java | mvn/gradle | `mvn test`, `mvn checkstyle:check` |

## Best Practices

### Before Running
1. Run `/check-10-dev` to verify setup
2. Ensure clean git working directory
3. Have clear idea of function purpose

### During Execution
1. Review specification carefully at Stage 1
2. Verify smoke test failure at Stage 4
3. Check implementation matches spec at Stage 5
4. Confirm all tests pass at Stage 8

### After Completion
1. Review generated code
2. Commit with meaningful message
3. Consider integration tests if applicable
4. Update documentation if needed

## Troubleshooting

### "Preconditions not met"
- Run `/check-10-dev` to see what's missing
- Use `/init-10-dev` to configure build tools

### "Test fails at Stage 8"
- Claude will automatically attempt to fix
- Review error messages carefully
- Verify specification accuracy

### "Build tool command not found"
- Ensure build tool is installed
- Verify PATH configuration
- Check build configuration file exists

### "Cannot detect language"
- Specify explicitly: `--language python`
- Ensure in correct project directory
- Check for language-specific files

## Examples

### Python Example
```bash
/apply-10-dev validate_email --context "Validate email format with clear error messages"
```

Claude will create:
- `src/validators.py` with `validate_email()` function
- `tests/unit/test_validators.py` with comprehensive tests
- Run through all 10 stages
- Provide completion report

### JavaScript Example
```bash
/apply-10-dev calculateTotal --with-integration
```

Claude will:
- Create `src/calculator.js` with `calculateTotal()` function
- Create unit tests in `tests/unit/calculator.test.js`
- Create integration tests in `tests/integration/calculator.test.js`
- Complete all stages

### Go Example
```bash
/apply-10-dev ProcessBatch --language go
```

Claude will:
- Create `pkg/processor/batch.go`
- Create `pkg/processor/batch_test.go`
- Use Go conventions and testing
- Complete workflow

## Integration with Git

After successful completion, Claude can optionally:
```bash
# Create feature branch
git checkout -b feat/add-<function-name>

# Commit changes
git add .
git commit -m "feat: add <function-name> with TDD workflow"

# Push and create PR
git push -u origin feat/add-<function-name>
gh pr create --title "Add <function-name>" --body "Implemented via 10-stage workflow"
```

## See Also

- `/check-10-dev` - Verify preconditions
- `/init-10-dev` - Initialize build configuration
- `/integrate-10-dev` - Create integration tests
- `skills/10-stages-developing/SKILL.md` - Complete workflow documentation
