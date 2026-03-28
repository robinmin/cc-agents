---
name: bdd-workflow
description: "Machine-first functional verification using BDD/Gherkin scenarios with deterministic checker delegation. Phase 8a of the 9-phase orchestration pipeline. Persona: Senior QA Architect."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-27
updated_at: 2026-03-27
platform: rd3
type: technique
tags: [bdd, gherkin, verification, phase-8, testing]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,gemini,openclaw,opencode,antigravity"
  category: verification
  interactions:
    - generator
    - reviewer
see_also:
  - rd3:verification-chain
  - rd3:functional-review
  - rd3:orchestration-dev
---

# rd3:bdd-workflow — BDD/Gherkin Functional Verification

Machine-first functional verification using BDD scenarios in Gherkin format with deterministic checker delegation. Generates Gherkin scenarios from requirements and executes them via verification-chain checkers.

**Key distinction:**
- **`bdd-workflow`** = scenario generation + execution (Phase 8a)
- **`functional-review`** = requirements traceability assessment (Phase 8b)
- **`verification-chain`** = checker infrastructure (used by bdd-workflow)
- **`orchestration-dev`** = phase orchestration (coordinates Phase 8)

## When to Use

**Trigger phrases:** "run bdd", "execute scenarios", "verify with gherkin", "functional verification", "run scenarios"

Load this skill when:
- Generating BDD scenarios from Requirements section of task file
- Executing existing .feature files as verification
- Running full generate+execute workflow for complete verification
- Creating living documentation of system behavior

Do not use this skill for unit testing (use `rd3:sys-testing`) or code review (use `rd3:code-review-common`).

## Overview

The bdd-workflow skill operates in three modes:

1. **Generate mode** — Read Requirements, produce Gherkin scenarios, write .feature files
2. **Execute mode** — Translate Gherkin steps to verification actions, run via verification-chain
3. **Full mode** — Generate + execute in sequence

**Key innovation:** LLM-interpreted execution with deterministic checker delegation. The LLM reads each Gherkin step, identifies the appropriate checker type, constructs the checker config, and delegates to verification-chain.

## Input Schema

```typescript
interface BDDWorkflowInput {
    task_ref: string;                    // WBS number or path to task file
    mode: 'generate' | 'execute' | 'full';
    feature_dir?: string;                // Output directory for .feature files (convention: tests/features/)
    bdd_report?: string;                // Path to existing BDD report (execute mode)
    source_paths?: string[];            // Source files to verify (execute/full mode)
}
```

## Quick Start

```
1. Load task file via task_ref
2. If generate/full mode:
   - Parse Requirements section into numbered items
   - Generate 1-3 Gherkin scenarios per requirement
   - Write .feature files to feature_dir/
3. If execute/full mode:
   - Read .feature files from feature_dir/
   - Translate each Gherkin step to verification action
   - Delegate to verification-chain checkers
   - Aggregate results into execution report
4. Output JSON execution report
```

## Generate Mode

### Scenario Generation Workflow

```typescript
// Parse requirements into numbered items
const requirements = parseRequirements(task.requirements);

// For each requirement, generate scenarios
for (const req of requirements) {
    const scenarios = generateScenarios(req);
    // Minimum: happy path + 1 edge case
    // Maximum: 3 scenarios per requirement
    
    for (const scenario of scenarios) {
        const gherkin = toGherkin(scenario);
        validateGherkin(gherkin); // via scripts/validate-feature.ts
        writeFeatureFile(featureDir, scenario.name, gherkin);
    }
}
```

### Scenario Template

```gherkin
Feature: {feature name}

  Scenario: {scenario name}
    Given {setup context}
    And {additional setup}
    When {action/trigger}
    Then {expected outcome}
    And {additional verification}
```

### Quality Rules

- Minimum 1 scenario per requirement
- Maximum 3 scenarios per requirement
- Each scenario must have: Given (setup), When (action), Then (verification)
- Scenario names must be unique within feature
- Step count: 3-8 steps per scenario
- 80%+ of steps should map to deterministic checkers

## Execute Mode

### Step-to-Checker Mapping

| Step Type | Primary Checker | Fallback | Rationale |
|-----------|----------------|----------|-----------|
| Given (setup) | `file-exists` | `cli` | Setup often creates/verifies files |
| Given (data) | `content-match` | `llm` | Verify test data exists |
| When (action) | `cli` | `llm` | Actions are CLI commands |
| Then (verify) | `content-match` | `llm` | Assertions check content |
| And (continuation) | Same as preceding | - | Inherits step type |

### LLM-Interpreted Execution

```typescript
// For each Gherkin step, the LLM determines:
// 1. Step type (Given/When/Then/And)
// 2. Appropriate checker
// 3. Checker config parameters

const stepInterpretation = interpretStep(step);
// {
//   checker: 'content-match',
//   config: { file: 'output.json', pattern: '"status":"success"', must_exist: true },
//   reasoning: 'Then step verifies success status in output file'
// }

const result = await delegateToVerificationChain(stepInterpretation);
```

### Deterministic Checker Priority

**CRITICAL:** 80%+ of steps MUST use deterministic checkers:

1. **cli** — Command execution, exit code verification
2. **file-exists** — File creation/deletion verification
3. **content-match** — Pattern matching in files

**Last resort only:**
4. **llm** — Semantic verification when deterministic is impossible
5. **human** — Stakeholder approval gates

### Execution Report Schema

```typescript
interface ExecutionReport {
    total: number;           // total scenarios
    passed: number;         // scenarios with all steps passing
    failed: number;         // scenarios with any step failing
    skipped: number;         // scenarios not executed
    duration_ms: number;     // total execution time
    overall_deterministic_ratio: number; // ratio of deterministic checker steps
    scenarios: ScenarioResult[];
}

interface ScenarioResult {
    name: string;
    feature: string;
    status: 'passed' | 'failed' | 'skipped';
    steps: StepResult[];
    deterministic_ratio: number; // per-scenario ratio
    error?: string;          // if failed
}

interface StepResult {
    step: string;           // original Gherkin text
    checker: string;        // checker type used
    config: Record<string, unknown>; // checker config used
    status: 'passed' | 'failed' | 'skipped';
    duration_ms: number;
    output?: string;        // checker output if relevant
}
```

## Full Mode

Full mode combines generate + execute:

```typescript
// 1. Generate scenarios from requirements
const features = await generate(task_ref, { feature_dir });

// 2. Execute generated scenarios
const report = await execute(task_ref, { 
    feature_dir,
    source_paths: task.source_paths 
});

// 3. Persist .feature files as living documentation
// (already done in generate phase)

// 4. Return execution report for functional-review
return report;
```

## Gherkin Syntax Reference

See `references/gherkin-syntax.md` for:
- Feature, Scenario, Step keywords
- Background and scenario outline patterns
- Data table syntax
- Doc string syntax

## Checker Mapping Reference

See `references/checker-mapping.md` for:
- Step type to checker mapping table
- Config construction patterns per checker
- Error handling per checker type

## Example Features

See `references/example-features.md` for:
- 3 complete example .feature files
- Step-to-checker translations
- Execution report examples

## Integration

**tasks CLI integration (planned — no command wrapper yet; invoke via skill):**
```bash
# Generate scenarios only
rd3:bdd-workflow 0266 --mode generate

# Execute existing scenarios
rd3:bdd-workflow 0266 --mode execute --source-paths src/

# Full generate + execute
rd3:bdd-workflow 0266 --mode full --source-paths src/
```

**Phase integration:**
- Phase 8a of 9-phase orchestration pipeline
- Input from implementation phase (Requirements + Solution)
- Output feeds into `rd3:functional-review` (Phase 8b)
- Uses `rd3:verification-chain` for checker delegation

## v1 Scope Limitations

- **In scope:** File-system assertions, CLI command verification
- **Out of scope:** Network assertions, database assertions, UI automation
- **Future v2:** Browser automation, API testing, database verification

## Quality Gates

1. **Generate gate:** Minimum 1 scenario per requirement
2. **Execute gate:** 80%+ deterministic checker usage
3. **Report gate:** JSON report with per-scenario, per-step detail
