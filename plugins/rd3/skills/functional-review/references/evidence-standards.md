# Evidence Standards — Requirements Traceability

This document defines what constitutes valid evidence for functional review.

## Evidence Quality Spectrum

| Quality | Description | Acceptable |
|---------|-------------|------------|
| **Specific** | File path + line number + context | YES |
| **Location** | File path + function name | YES |
| **File-only** | File path without specific location | CONDITIONAL |
| **Vague** | No specific location or context | NO |

## Specific Evidence (Required)

### Format

```
`{file_path}:{line_number}` - {description}
```

### Examples

**Function implementation:**
```
`src/api/users.ts:42` - `createUser()` handler function
```

**Variable definition:**
```
`src/config/auth.ts:15` - `MAX_SESSION_DURATION` constant
```

**Test coverage:**
```
`tests/api/users.test.ts:50-65` - Unit tests for createUser
```

**Database schema:**
```
`src/db/schema.sql:23-28` - users table definition with email UNIQUE constraint
```

## Location Evidence (Acceptable)

### When File-Only is Acceptable

For large files (>500 lines) where exact line is uncertain:
```
`src/api/users.ts` - User CRUD endpoints implemented
```

For dispersed implementations:
```
`src/auth/` - OAuth2 authentication implementation (multiple files)
```

### When File-Only is NOT Acceptable

When requirement is specific and implementation should be pinpointed:
```
WRONG: `src/utils/` - Helper functions implemented
RIGHT: `src/utils/format.ts:15` - `formatCurrency()` handles locale
```

## Vague Evidence (Rejected)

The following are NOT acceptable evidence:

| Vague Phrase | Why Rejected |
|--------------|--------------|
| "implemented correctly" | No location, no context |
| "meets requirements" | Circular reasoning |
| "as specified" | No implementation pointer |
| "the code does X" | No file/line reference |
| "verified by tests" | No test location |
| "in the codebase" | Too broad |
| "handled properly" | No specific implementation |

## Evidence Collection Process

### Step 1: Identify Keywords

Extract key terms from requirement:
- Nouns: What things are involved?
- Verbs: What actions are required?
- Technical terms: APIs, data models, formats?

### Step 2: Search Files

Use file search to find relevant code:
```bash
grep -r "keyword" src/
grep -r "functionName" src/
grep -r "className" src/
```

### Step 3: Pinpoint Evidence

For each match, record:
- File path
- Line number(s)
- Code snippet or function signature
- How it relates to the requirement

### Step 4: Verify Relevance

Confirm the evidence actually addresses the requirement:
- Does the code do what the requirement says?
- Is the code actually implementing the feature, or just related?
- Are there edge cases or variations not covered?

## Evidence Templates

### For Functionality Requirements

```
Evidence:
- `src/{file}:{line}` - `{functionName}()` {action verb}
- `src/{file}:{line}` - {specific behavior description}
```

### For Data Requirements

```
Evidence:
- `src/{file}:{line}` - `{typeName}` {data structure definition}
- `src/{file}:{line}` - {validation logic for data}
```

### For Integration Requirements

```
Evidence:
- `src/{file}:{line}` - {integration point} connects to {external system}
- `tests/{file}:{line}` - Integration test verifies {behavior}
```

### For Missing Implementation

```
Evidence:
- NO IMPLEMENTATION FOUND for {requirement description}
- Searched: {directories/files searched}
- No references to {key terms} found
```

## Cross-Reference Requirements

### Multiple Files

When implementation spans multiple files:
```
Evidence:
- `src/api/users.ts:42` - `createUser()` handler
- `src/services/email.ts:15` - Email service
- `src/db/users.sql:10` - User repository
- `tests/integration/users.test.ts:50` - Integration test
```

### Tests Without Implementation

When only tests exist (not full evidence):
```
Evidence:
- `tests/api/users.test.ts:15` - Test exists for createUser
- MISSING: No implementation found in src/api/users.ts
```

## Evidence for Partial Verdicts

### What to Include

1. **What's implemented:**
   - Specific evidence with file:line

2. **What's missing:**
   - What specifically is missing
   - Why it's important

### Format

```
Evidence:
- `src/{file}:{line}` - {what is implemented}
- `src/{file}:{line}` - {what else is implemented}

Missing:
- {what is NOT implemented}
- {impact of missing functionality}
```

## Evidence Quality Checklist

For each piece of evidence:

- [ ] File path is correct and accessible
- [ ] Line number is accurate (or range provided)
- [ ] Function/type/class name is exact
- [ ] Evidence actually addresses the requirement
- [ ] Evidence is not just "related" but "implements"

## Anti-Patterns

### Pattern 1: Vague Location
```
WRONG: "Code in src/utils handles validation"
RIGHT: `src/utils/validation.ts:42` - `validateEmail()` function
```

### Pattern 2: Test-Only
```
WRONG: "Tests verify the feature works"
RIGHT: `tests/api/users.test.ts:50` - test createUser + `src/api/users.ts:42` - createUser handler
```

### Pattern 3: Indirect Evidence
```
WRONG: "The error message in the logs indicates this works"
RIGHT: `src/api/users.ts:45` - Error thrown when email already exists + `tests/api/users.test.ts:30` - test verifies duplicate rejection
```

### Pattern 4: Assumption
```
WRONG: "Assuming MAX_USERS is defined somewhere"
RIGHT: `src/config/limits.ts:10` - `MAX_USERS = 1000` constant defined
```

## Evidence vs. Verification

| Evidence | Verification |
|----------|--------------|
| Shows WHERE code exists | Shows THAT code works |
| Static analysis | Dynamic testing |
| File:line references | Test execution |
| Implementation proof | Correctness proof |

Both are needed for a complete "met" verdict.
