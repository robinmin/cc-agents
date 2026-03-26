# verification-chain Examples

## Simple Sequential Chain

Verify a build command produces expected artifacts:

```json
{
  "chain_id": "build-verify",
  "chain_name": "Build and Verify Artifacts",
  "task_wbs": "TASK-001",
  "on_node_fail": "halt",
  "nodes": [
    {
      "name": "run-build",
      "type": "single",
      "maker": {
        "command": "npm run build",
        "timeout": 300
      },
      "checker": {
        "method": "cli",
        "config": {
          "command": "test -d dist && test -f dist/index.js",
          "exit_codes": [0]
        }
      }
    },
    {
      "name": "check-types",
      "type": "single",
      "maker": {
        "command": "npm run typecheck"
      },
      "checker": {
        "method": "cli",
        "config": {
          "command": "npm run typecheck",
          "exit_codes": [0]
        }
      }
    }
  ]
}
```

## Parallel Group with Quorum

Run multiple linters concurrently, pass if ≥2 pass:

```json
{
  "chain_id": "lint-verify",
  "chain_name": "Run Multiple Linters",
  "task_wbs": "TASK-002",
  "nodes": [
    {
      "name": "run-all-linters",
      "type": "parallel-group",
      "convergence": "quorum",
      "quorum_count": 2,
      "children": [
        { "name": "eslint", "maker": { "command": "npm run lint:eslint" } },
        { "name": "prettier", "maker": { "command": "npm run lint:prettier" } },
        { "name": "tsc", "maker": { "command": "npm run lint:types" } }
      ],
      "checker": {
        "method": "file-exists",
        "config": {
          "paths": ["reports/lint.json"]
        }
      }
    }
  ]
}
```

## Compound AND Checker

Run multiple checks and require ALL to pass:

```json
{
  "chain_id": "code-quality",
  "chain_name": "Code Quality Gates",
  "task_wbs": "TASK-003",
  "nodes": [
    {
      "name": "quality-gates",
      "type": "single",
      "maker": {
        "command": "npm run build"
      },
      "checker": {
        "method": "compound",
        "config": {
          "operator": "and",
          "checks": [
            {
              "method": "cli",
              "config": { "command": "test -f dist/app.js", "exit_codes": [0] }
            },
            {
              "method": "content-match",
              "config": {
                "file": "dist/app.js",
                "pattern": "function bootstrap",
                "must_exist": true
              }
            },
            {
              "method": "file-exists",
              "config": { "paths": ["dist/app.js", "dist/styles.css"] }
            }
          ]
        }
      }
    }
  ]
}
```

## Compound OR Checker (Best-Effort Fallback)

Try multiple verification approaches, pass if ANY succeeds:

```json
{
  "chain_id": "verify-output",
  "chain_name": "Verify Output",
  "task_wbs": "TASK-004",
  "nodes": [
    {
      "name": "check-output",
      "type": "single",
      "maker": {
        "command": "npm run generate-report"
      },
      "checker": {
        "method": "compound",
        "config": {
          "operator": "or",
          "checks": [
            {
              "method": "file-exists",
              "config": { "paths": ["report.html"] }
            },
            {
              "method": "file-exists",
              "config": { "paths": ["report.pdf"] }
            },
            {
              "method": "content-match",
              "config": {
                "file": "output.log",
                "pattern": "Report generated successfully",
                "must_exist": true
              }
            }
          ]
        }
      }
    }
  ]
}
```

## Human Gate with Pause/Resume

Pause chain for human review before proceeding:

```json
{
  "chain_id": "review-chain",
  "chain_name": "Code Review Chain",
  "task_wbs": "TASK-005",
  "nodes": [
    {
      "name": "generate-pr",
      "type": "single",
      "maker": {
        "command": "gh pr create --title 'feat: new feature'"
      },
      "checker": {
        "method": "cli",
        "config": {
          "command": "gh pr status --json number --jq '.[0].number'",
          "exit_codes": [0]
        }
      }
    },
    {
      "name": "human-review",
      "type": "single",
      "maker": {
        "command": "echo 'PR created, awaiting review'"
      },
      "checker": {
        "method": "human",
        "config": {
          "prompt": "Please review the PR at https://github.com/owner/repo/pull/N. Approve, reject, or request changes.",
          "choices": ["approve", "reject", "request_changes"]
        },
        "on_fail": "halt"
      }
    },
    {
      "name": "merge-pr",
      "type": "single",
      "maker": {
        "command": "gh pr merge --squash"
      },
      "checker": {
        "method": "cli",
        "config": {
          "command": "gh pr view --json state --jq '.state' | grep -q MERGED",
          "exit_codes": [0]
        }
      }
    }
  ]
}
```

Resume with human response:

```typescript
const state = await resumeChain({
  manifest,
  stateDir: '/path/to/project',
  humanResponse: 'approve',
});
```

## LLM Judge Checker

Use LLM to verify code quality:

```json
{
  "chain_id": "llm-review",
  "chain_name": "LLM Code Review",
  "task_wbs": "TASK-006",
  "nodes": [
    {
      "name": "write-code",
      "type": "single",
      "maker": {
        "command": "npm run generate"
      },
      "checker": {
        "method": "llm",
        "config": {
          "checklist": [
            "Code handles error cases with try/catch",
            "No hardcoded credentials or secrets",
            "Functions have JSDoc comments",
            "No console.log statements in production code"
          ]
        }
      }
    }
  ]
}
```

Requires `LLM_CLI_COMMAND` env var pointing to a CLI that accepts a prompt on stdin and outputs `[PASS]`/`[FAIL]` lines.

## Content Match: Verify Absence (Anti-Pattern)

Use `must_exist: false` to verify bad patterns are absent:

```json
{
  "chain_id": "security-scan",
  "chain_name": "Security Scan",
  "task_wbs": "TASK-007",
  "nodes": [
    {
      "name": "scan-secrets",
      "type": "single",
      "maker": {
        "command": "npm run build"
      },
      "checker": {
        "method": "content-match",
        "config": {
          "file": "dist/app.js",
          "pattern": "console\\.log",
          "must_exist": false
        }
      }
    },
    {
      "name": "no-debugger",
      "type": "single",
      "maker": {
        "command": "npm run build"
      },
      "checker": {
        "method": "content-match",
        "config": {
          "file": "dist/app.js",
          "pattern": "debugger;",
          "must_exist": false
        }
      }
    }
  ]
}
```

## Global Retry

Retry failed nodes up to 3 times globally:

```json
{
  "chain_id": "flaky-test",
  "chain_name": "Flaky Test Handler",
  "task_wbs": "TASK-008",
  "global_retry": {
    "remaining": 3,
    "total": 3
  },
  "nodes": [
    {
      "name": "run-tests",
      "type": "single",
      "maker": {
        "command": "npm test"
      },
      "checker": {
        "method": "cli",
        "config": {
          "command": "npm test",
          "exit_codes": [0]
        }
      }
    }
  ]
}
```

Global retry only re-runs nodes whose maker did NOT complete successfully. Completed nodes are preserved.

## Skip on Failure

Skip failing nodes and continue:

```json
{
  "chain_id": "optional-checks",
  "chain_name": "Optional Quality Checks",
  "task_wbs": "TASK-009",
  "on_node_fail": "skip",
  "nodes": [
    {
      "name": "required-check",
      "type": "single",
      "maker": { "command": "npm run lint" },
      "checker": {
        "method": "cli",
        "config": { "command": "test -f lint-report.json", "exit_codes": [0] }
      }
    },
    {
      "name": "optional-check",
      "type": "single",
      "maker": { "command": "npm run coverage" },
      "checker": {
        "method": "cli",
        "config": { "command": "test -f coverage.json", "exit_codes": [0] }
      },
      "on_fail": "skip"
    }
  ]
}
```
