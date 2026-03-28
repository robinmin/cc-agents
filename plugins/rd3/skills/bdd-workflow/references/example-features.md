# Example Feature Files

This document provides 3 complete example .feature files with step-to-checker translations and execution reports.

## Example 1: JSON Processing

### Feature File

```gherkin
Feature: JSON Processing Pipeline

  Scenario: Process valid JSON input
    Given the input file "input.json" exists
    And the input file contains valid JSON
    When I run "node process.js --input input.json --output output.json"
    Then the command should exit with code 0
    And "output.json" should exist
    And "output.json" should contain '"status": "success"'

  Scenario: Handle invalid JSON input
    Given the input file "invalid.json" exists
    And the input file contains invalid JSON
    When I run "node process.js --input invalid.json --output output.json"
    Then the command should exit with code 1
    And "error.log" should contain "JSON parse error"

  Scenario: Missing input file
    Given the input file "nonexistent.json" does not exist
    When I run "node process.js --input nonexistent.json --output output.json"
    Then the command should exit with code 2
```

### Step-to-Checker Translation

| Step | Checker | Config |
|------|---------|--------|
| Given input file "input.json" exists | `file-exists` | `{ paths: ["input.json"] }` |
| And input file contains valid JSON | `content-match` | `{ file: "input.json", pattern: ".", must_exist: true }` |
| When I run "node process.js..." | `cli` | `{ command: "node process.js...", exit_codes: [0] }` |
| Then command should exit with code 0 | `cli` | `{ command: "echo $? = 0", exit_codes: [0] }` |
| And "output.json" should exist | `file-exists` | `{ paths: ["output.json"] }` |
| And "output.json" should contain '"status": "success"' | `content-match` | `{ file: "output.json", pattern: '"status": "success"', must_exist: true }` |

### Execution Report

```json
{
  "total": 3,
  "passed": 2,
  "failed": 1,
  "skipped": 0,
  "duration_ms": 4521,
  "scenarios": [
    {
      "name": "Process valid JSON input",
      "feature": "JSON Processing Pipeline",
      "status": "passed",
      "steps": [
        { "step": "Given the input file \"input.json\" exists", "checker": "file-exists", "status": "passed", "duration_ms": 2 },
        { "step": "And the input file contains valid JSON", "checker": "content-match", "status": "passed", "duration_ms": 5 },
        { "step": "When I run \"node process.js...\"", "checker": "cli", "status": "passed", "duration_ms": 1200 },
        { "step": "Then the command should exit with code 0", "checker": "cli", "status": "passed", "duration_ms": 10 },
        { "step": "And \"output.json\" should exist", "checker": "file-exists", "status": "passed", "duration_ms": 3 },
        { "step": "And \"output.json\" should contain '\"status\": \"success\"'", "checker": "content-match", "status": "passed", "duration_ms": 8 }
      ],
      "deterministic_ratio": 1.0
    },
    {
      "name": "Handle invalid JSON input",
      "feature": "JSON Processing Pipeline",
      "status": "passed",
      "steps": [
        { "step": "Given the input file \"invalid.json\" exists", "checker": "file-exists", "status": "passed", "duration_ms": 2 },
        { "step": "And the input file contains invalid JSON", "checker": "content-match", "status": "passed", "duration_ms": 4 },
        { "step": "When I run \"node process.js...\"", "checker": "cli", "status": "passed", "duration_ms": 800 },
        { "step": "Then the command should exit with code 1", "checker": "cli", "status": "passed", "duration_ms": 10 },
        { "step": "And \"error.log\" should contain \"JSON parse error\"", "checker": "content-match", "status": "passed", "duration_ms": 6 }
      ],
      "deterministic_ratio": 1.0
    },
    {
      "name": "Missing input file",
      "feature": "JSON Processing Pipeline",
      "status": "failed",
      "error": "Command exited with code 127 instead of expected 2",
      "steps": [
        { "step": "Given the input file \"nonexistent.json\" does not exist", "checker": "file-exists", "status": "passed", "duration_ms": 2 },
        { "step": "When I run \"node process.js...\"", "checker": "cli", "status": "passed", "duration_ms": 50 },
        { "step": "Then the command should exit with code 2", "checker": "cli", "status": "failed", "duration_ms": 10, "output": "exit code: 127 (command not found)" }
      ],
      "deterministic_ratio": 1.0
    }
  ],
  "overall_deterministic_ratio": 1.0
}
```

---

## Example 2: User Authentication

### Feature File

```gherkin
Feature: User Authentication

  Scenario: Successful login with valid credentials
    Given the user database is seeded
    And the API server is running
    When I send a POST request to "/auth/login" with:
      """
      { "username": "admin", "password": "secret123" }
      """
    Then the response status should be 200
    And the response should contain '"token":'
    And a session file should be created for "admin"

  Scenario: Failed login with invalid password
    Given the user database is seeded
    And the API server is running
    When I send a POST request to "/auth/login" with:
      """
      { "username": "admin", "password": "wrongpassword" }
      """
    Then the response status should be 401
    And the response should contain '"error": "Invalid credentials"'

  Scenario: Account lockout after 3 failed attempts
    Given the user "lockeduser" exists with 2 failed attempts
    And the API server is running
    When I send a POST request to "/auth/login" with:
      """
      { "username": "lockeduser", "password": "wrongpassword" }
      """
    Then the response status should be 423
    And the response should contain '"error": "Account locked"'
```

### Step-to-Checker Translation

| Step | Checker | Config |
|------|---------|--------|
| Given the user database is seeded | `cli` | `{ command: "npm run seed:users", exit_codes: [0] }` |
| And the API server is running | `cli` | `{ command: "curl -s http://localhost:3000/health", exit_codes: [0] }` |
| When I send a POST request... | `cli` | `{ command: "curl -s -X POST -H 'Content-Type: application/json' -d '...' http://localhost:3000/auth/login", exit_codes: [0] }` |
| Then the response status should be 200 | `content-match` | `{ file: "/tmp/curl_output.txt", pattern: "HTTP/.* 200", must_exist: true }` |
| And the response should contain '"token":' | `content-match` | `{ file: "/tmp/curl_output.txt", pattern: '"token":', must_exist: true }` |
| And a session file should be created | `file-exists` | `{ paths: ["/tmp/sessions/admin.json"] }` |

### Execution Report

```json
{
  "total": 3,
  "passed": 2,
  "failed": 1,
  "skipped": 0,
  "duration_ms": 5830,
  "scenarios": [
    {
      "name": "Successful login with valid credentials",
      "feature": "User Authentication",
      "status": "passed",
      "steps": [
        { "step": "Given the user database is seeded", "checker": "cli", "status": "passed", "duration_ms": 1200 },
        { "step": "And the API server is running", "checker": "cli", "status": "passed", "duration_ms": 50 },
        { "step": "When I send a POST request to \"/auth/login\"...", "checker": "cli", "status": "passed", "duration_ms": 300 },
        { "step": "Then the response status should be 200", "checker": "content-match", "status": "passed", "duration_ms": 5 },
        { "step": "And the response should contain '\"token\":'", "checker": "content-match", "status": "passed", "duration_ms": 4 },
        { "step": "And a session file should be created for \"admin\"", "checker": "file-exists", "status": "passed", "duration_ms": 3 }
      ],
      "deterministic_ratio": 1.0
    },
    {
      "name": "Failed login with invalid password",
      "feature": "User Authentication",
      "status": "passed",
      "steps": [
        { "step": "Given the user database is seeded", "checker": "cli", "status": "passed", "duration_ms": 50 },
        { "step": "And the API server is running", "checker": "cli", "status": "passed", "duration_ms": 30 },
        { "step": "When I send a POST request to \"/auth/login\"...", "checker": "cli", "status": "passed", "duration_ms": 280 },
        { "step": "Then the response status should be 401", "checker": "content-match", "status": "passed", "duration_ms": 5 },
        { "step": "And the response should contain '\"error\": \"Invalid credentials\"'", "checker": "content-match", "status": "passed", "duration_ms": 4 }
      ],
      "deterministic_ratio": 1.0
    },
    {
      "name": "Account lockout after 3 failed attempts",
      "feature": "User Authentication",
      "status": "failed",
      "error": "Expected user 'lockeduser' with 2 prior failed attempts — test fixture not seeded",
      "steps": [
        { "step": "Given the user \"lockeduser\" exists with 2 failed attempts", "checker": "cli", "status": "failed", "duration_ms": 1100, "output": "Error: user 'lockeduser' not found in seed data" },
        { "step": "And the API server is running", "checker": "cli", "status": "skipped", "duration_ms": 0 },
        { "step": "When I send a POST request to \"/auth/login\"...", "checker": "cli", "status": "skipped", "duration_ms": 0 },
        { "step": "Then the response status should be 423", "checker": "content-match", "status": "skipped", "duration_ms": 0 },
        { "step": "And the response should contain '\"error\": \"Account locked\"'", "checker": "content-match", "status": "skipped", "duration_ms": 0 }
      ],
      "deterministic_ratio": 1.0
    }
  ],
  "overall_deterministic_ratio": 1.0
}
```

---

## Example 3: File Transformation

### Feature File

```gherkin
Feature: CSV to JSON Transformation

  Scenario: Convert CSV with headers to JSON array
    Given the input file "users.csv" exists with content:
      """
      name,email,role
      Alice,alice@example.com,admin
      Bob,bob@example.com,user
      """
    When I run "python csv2json.py --input users.csv --output users.json"
    Then the command should exit with code 0
    And "users.json" should exist
    And "users.json" should be valid JSON
    And "users.json" should contain '"name": "Alice"'
    And "users.json" should contain '"email": "alice@example.com"'

  Scenario: Handle CSV with missing values
    Given the input file "partial.csv" exists with content:
      """
      name,email,role
      Charlie,charlie@example.com,
      """
    When I run "python csv2json.py --input partial.csv --output partial.json"
    Then the command should exit with code 0
    And "partial.json" should be valid JSON
    And "partial.json" should contain '"role": null'
```

### Execution Report

```json
{
  "total": 2,
  "passed": 2,
  "failed": 0,
  "skipped": 0,
  "duration_ms": 3200,
  "scenarios": [
    {
      "name": "Convert CSV with headers to JSON array",
      "feature": "CSV to JSON Transformation",
      "status": "passed",
      "steps": [
        { "step": "Given the input file \"users.csv\" exists with content...", "checker": "cli", "status": "passed", "duration_ms": 10 },
        { "step": "When I run \"python csv2json.py...\"", "checker": "cli", "status": "passed", "duration_ms": 1500 },
        { "step": "Then the command should exit with code 0", "checker": "cli", "status": "passed", "duration_ms": 5 },
        { "step": "And \"users.json\" should exist", "checker": "file-exists", "status": "passed", "duration_ms": 2 },
        { "step": "And \"users.json\" should be valid JSON", "checker": "cli", "status": "passed", "duration_ms": 20 },
        { "step": "And \"users.json\" should contain '\"name\": \"Alice\"'", "checker": "content-match", "status": "passed", "duration_ms": 8 }
      ],
      "deterministic_ratio": 1.0
    },
    {
      "name": "Handle CSV with missing values",
      "feature": "CSV to JSON Transformation",
      "status": "passed",
      "steps": [
        { "step": "Given the input file \"partial.csv\" exists with content...", "checker": "cli", "status": "passed", "duration_ms": 10 },
        { "step": "When I run \"python csv2json.py...\"", "checker": "cli", "status": "passed", "duration_ms": 1200 },
        { "step": "Then the command should exit with code 0", "checker": "cli", "status": "passed", "duration_ms": 5 },
        { "step": "And \"partial.json\" should be valid JSON", "checker": "cli", "status": "passed", "duration_ms": 15 },
        { "step": "And \"partial.json\" should contain '\"role\": null'", "checker": "content-match", "status": "passed", "duration_ms": 7 }
      ],
      "deterministic_ratio": 1.0
    }
  ],
  "overall_deterministic_ratio": 1.0
}
```

---

## Deterministic Checker Ratio

The deterministic checker ratio is calculated as:

```
deterministic_ratio = (cli + file-exists + content-match steps) / total steps
```

**Quality gate:** deterministic_ratio >= 0.80 (80%)

In all three examples above, the ratio is 100% because:
- No network assertions (v1 scope)
- No database assertions (v1 scope)
- All verifications are file-system or CLI based

If LLM checker is needed for semantic verification, the ratio will drop, triggering a warning.
