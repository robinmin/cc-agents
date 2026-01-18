---
name: enhance orchestrator testing
description: Enhance rd:orchestrator-expert to properly coordinate rd:test-expert for test generation and execution
status: Done
created_at: 2026-01-17 17:15:00
updated_at: 2026-01-17 17:30:00
---

## 0011. Enhance Orchestrator Testing Coordination

### Background

The current `rd:orchestrator-expert` workflow coordinates:
- `rd:task-decomposition-expert` (planning)
- `rd:task-runner` (execution)
- Domain experts (as needed)

However, `rd:test-expert` is not properly integrated into the workflow for systematic test generation and execution. Testing should be a first-class citizen in the orchestration workflow, not an afterthought.

### Requirements / Objectives

Enhance `rd:orchestrator-expert` to:

1. **Integrate rd:test-expert** into the standard workflow
2. **Test generation**: After code implementation, delegate to rd:test-expert for test creation
3. **Test execution**: Run tests and verify they pass
4. **Test failure handling**: If tests fail, iterate with rd:test-expert for fixes
5. **TDD support**: Optionally generate tests before implementation (test-driven development)

### Desired Workflow

```
User Request
    ↓
rd:orchestrator-expert (Meta-Coordinator)
    ├─→ rd:task-decomposition-expert (planning)
    ├─→ rd:task-runner (execution)
    ├─→ rd:test-expert (testing) ← ENHANCE THIS INTEGRATION
    └─→ Domain experts (as needed)

For each coding task:
    ├─→ Implement code (rd:task-runner or domain expert)
    ├─→ Generate tests (rd:test-expert)
    ├─→ Run tests (orchestrator-coordinated)
    ├─→ If fail: Fix & retest (rd:test-expert iteration)
    └─→ If pass: Mark phase complete
```

### Key Integration Points

1. **Test Generation Trigger**: After implementation phase completes
2. **Test Framework Detection**: Identify test framework (pytest, Jest, vitest, etc.)
3. **Test Coverage**: Ensure unit, integration, and E2E tests as appropriate
4. **Test Execution**: Run tests and capture results
5. **Failure Iteration**: Coordinate fixes until tests pass (max 3 iterations)

### Solutions / Goals

Update `rd:orchestrator-expert` agent definition to include:

1. **Test Coordination** competency in section 5.1
2. **Test Integration** workflow in section 6 (ANALYSIS PROCESS)
3. **Test Expert Delegation** in section 5.3
4. **Test Status Mapping** in section 5.2
5. **Test Error Recovery** in section 5.1
6. **Test-related output formats** in section 8

### References

- Current orchestrator: @plugins/rd/agents/orchestrator-expert.md
- Test expert: @plugins/rd/agents/test-expert.md
- Task runner: @plugins/rd/agents/task-runner.md
