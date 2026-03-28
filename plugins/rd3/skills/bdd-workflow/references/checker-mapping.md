# Checker Mapping Reference

This document maps Gherkin step types to verification-chain checker types.

## Step-to-Checker Mapping Table

| Step Pattern | Primary Checker | Config Pattern | Example |
|--------------|----------------|-----------------|---------|
| "file exists" | `file-exists` | `{ paths: [path] }` | `Given a file "x" exists` |
| "file does not exist" | `compound` | `{ operator: "and", checks: [{ method: "file-exists", config: { paths: [path] } }] }` with inverted assertion | `Then the file "x" does not exist` |
| "directory exists" | `file-exists` | `{ paths: [dir] }` | `Given the output directory exists` |
| "command exits with code N" | `cli` | `{ command: "...", exit_codes: [N] }` | `When I run "npm test"` |
| "command outputs" | `cli` | `{ command: "...", stdout: "pattern" }` | `Then the command outputs "success"` |
| "file contains pattern" | `content-match` | `{ file: "x", pattern: "p", must_exist: true }` | `Then "output.json" contains "status: ok"` |
| "file does not contain" | `content-match` | `{ file: "x", pattern: "p", must_exist: false }` | `Then "error.log" does not contain "ERROR"` |
| "API returns status" | `cli` (curl) | `{ command: "curl -s -o /dev/null -w '%{http_code}'" }` | `Then the API returns 200` |
| Semantic verification | `llm` | `{ checklist: [...] }` | `Then the output is semantically correct` |
| Human approval | `human` | `{ prompt: "...", choices: [...] }` | `Then the output meets quality standards` |

## Given Step Mappings

### File Setup

```gherkin
Given a file "input.json" exists
```
**Checker:** `file-exists`  
**Config:** `{ paths: ["input.json"] }`

```gherkin
Given the directory "output/" exists
```
**Checker:** `file-exists`  
**Config:** `{ paths: ["output/"] }`

```gherkin
Given the file "input.json" does not exist
```
**Checker:** `cli` (inverse check via test command)
**Config:** `{ command: "test ! -f input.json", exit_codes: [0] }`
**Note:** `file-exists` checker only asserts existence. Use `cli` with `test ! -f` for non-existence.

### Data Setup

```gherkin
Given the database is seeded with "test-data.json"
```
**Checker:** `cli`  
**Config:** `{ command: "cat test-data.json | jq .", exit_codes: [0] }`

## When Step Mappings

### Command Execution

```gherkin
When I run "npm test"
```
**Checker:** `cli`  
**Config:** `{ command: "npm test", exit_codes: [0], timeout: 300 }`

```gherkin
When I run "npm test -- --coverage"
```
**Checker:** `cli`  
**Config:** `{ command: "npm test -- --coverage", exit_codes: [0] }`

```gherkin
When I execute "python process.py --input data.csv"
```
**Checker:** `cli`  
**Config:** `{ command: "python process.py --input data.csv", exit_codes: [0] }`

### File Operations

```gherkin
When I create "output.json" with content from "template.json"
```
**Checker:** `cli`  
**Config:** `{ command: "cp template.json output.json", exit_codes: [0] }`

## Then Step Mappings

### Exit Code Verification

```gherkin
Then the command should exit with code 0
```
**Checker:** `cli`  
**Config:** `{ command: "<previous_command>", exit_codes: [0] }`  
**Note:** This inherits from the previous When step

### Content Verification

```gherkin
Then "output.json" should contain '"status": "success"'
```
**Checker:** `content-match`  
**Config:** `{ file: "output.json", pattern: '"status": "success"', must_exist: true }`

```gherkin
Then "output.json" should not contain '"error":'
```
**Checker:** `content-match`  
**Config:** `{ file: "output.json", pattern: '"error":', must_exist: false }`

```gherkin
Then "README.md" should include a section "## Usage"
```
**Checker:** `content-match`  
**Config:** `{ file: "README.md", pattern: "## Usage", must_exist: true }`

### File Existence Verification

```gherkin
Then the file "dist/bundle.js" should exist
```
**Checker:** `file-exists`  
**Config:** `{ paths: ["dist/bundle.js"] }`

### API Verification

```gherkin
Then the API should return status 200
```
**Checker:** `cli`  
**Config:** `{ command: "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api", exit_codes: [0] }`

## Compound Steps

### Multiple Verifications

```gherkin
Then the command should exit with code 0
And "output.json" should contain '"status": "success"'
And "output.json" should contain '"count": 42'
```
Each `And` inherits the step type from the preceding step.

### Chained Operations

```gherkin
Given the file "input.json" exists
When I run "process.py --input input.json --output output.json"
Then "output.json" should exist
And "output.json" should contain '"result":'
```

## Error Handling

### cli Checker Errors

| Exit Code | Meaning | Action |
|-----------|---------|--------|
| 0 | Success | Pass |
| 1 | General error | Fail |
| 2 | Misuse of shell | Fail |
| 126 | Command not executable | Fail |
| 127 | Command not found | Fail |
| 128+ | Signal termination | Fail |

### file-exists Checker Errors

| Condition | Result |
|-----------|--------|
| All paths exist | Pass |
| Any path missing | Fail |

**Note:** `file-exists` only checks that paths exist. For non-existence assertions, use `cli` checker with `test ! -f <path>`.

### content-match Checker Errors

| Condition | Result |
|-----------|--------|
| Pattern found, must_exist: true | Pass |
| Pattern not found, must_exist: true | Fail |
| Pattern not found, must_exist: false | Pass |
| Pattern found, must_exist: false | Fail |
| File does not exist | Fail |

## LLM Checker (Last Resort)

Use `llm` checker only when deterministic checkers cannot work:

```gherkin
Then the output should be semantically correct
```
**Checker:** `llm`  
**Config:**
```typescript
{
  checklist: [
    "Output describes the expected result",
    "Output format matches specification",
    "No hallucinated content present"
  ],
  prompt_template: "Verify the output meets quality standards..."
}
```

## Configuration Construction

### Pattern: Extracting Parameters

```typescript
function mapStepToChecker(step: string, context: StepContext): CheckerConfig {
    const lower = step.toLowerCase();
    
    // File existence patterns
    if (/file "(.*)" exists/.test(lower)) {
        return {
            checker: 'file-exists',
            config: { paths: [extractPath(step)] }
        };
    }
    
    // Content match patterns
    if (/should contain "(.*)"/.test(lower)) {
        return {
            checker: 'content-match',
            config: { 
                file: context.currentFile,
                pattern: extractPattern(step),
                must_exist: true
            }
        };
    }
    
    // CLI patterns
    if (/run "(.*)"/.test(lower)) {
        return {
            checker: 'cli',
            config: { command: extractCommand(step), exit_codes: [0] }
        };
    }
    
    // Fallback to LLM
    return {
        checker: 'llm',
        config: { checklist: [step] }
    };
}
```
