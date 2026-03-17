---
description: Run full CI pipeline with tests and linting
argument-hint: "<branch> [--skip-lint]"
---

# Run CI

Execute the complete CI pipeline for the specified branch.

## Steps

1. Check out the branch from $1
2. Install dependencies via !`npm install`
3. Run linting via !`npm run lint`
4. Run tests via !`npm test`
5. Generate coverage report

## Delegation

Task(subagent_type="super-coder", prompt="Fix any failing tests")
Skill(skill="rd2:test-coverage", args="--threshold 80")
