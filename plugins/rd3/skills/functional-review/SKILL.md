---
name: functional-review
description: "Requirements traceability assessment: verify implementation satisfies ALL task requirements. Phase 8b gate for the 9-phase orchestration pipeline. Persona: Senior QA Lead."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-27
updated_at: 2026-04-05
platform: rd3
type: technique
tags: [requirements, traceability, verification, phase-8, review]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,gemini,openclaw,opencode,antigravity,pi"
  category: verification
  interactions:
    - reviewer
  severity_levels:
    - fail
    - partial
    - pass
see_also:
  - rd3:bdd-workflow
  - rd3:verification-chain
  - rd3:orchestration-v2
---

# rd3:functional-review — Requirements Traceability Assessment

Verify that implementation satisfies ALL task requirements. Produces per-requirement verdicts with specific evidence (file paths, line numbers, function names).

**Key distinction:**
- **`functional-review`** = requirements completeness (Phase 8b)
- **`bdd-workflow`** = BDD scenario execution (Phase 8a)
- **`code-review-common`** = code quality review (not requirements completeness)

## When to Use

**Trigger phrases:** "review requirements", "verify completeness", "functional review", "traceability check", "did we build what was asked"

Load this skill when:
- Phase 8 gate in orchestration-dev pipeline
- Verifying implementation against Requirements section
- Producing audit trail for requirements traceability
- Determining if functional completeness is sufficient for Done

Do not use this skill for code quality review (use `rd3:code-review-common`).

## Overview

The functional-review skill uses a two-track assessment:

1. **Track A (BDD-first):** If BDD report exists, check each requirement against BDD scenario coverage
2. **Track B (LLM-fallback):** For requirements not covered by BDD, use LLM assessment with source evidence

**Evidence quality standard:** All evidence MUST be specific:
- File paths (e.g., `src/api/users.ts`)
- Line numbers (e.g., `line 42`)
- Function names (e.g., `createUser()`)
- NOT vague: "implemented correctly", "meets requirements"

## Input Schema

```typescript
interface FunctionalReviewInput {
    task_ref: string;                    // WBS number or path to task file
    bdd_report?: string;                 // Path to BDD execution report (JSON) — schema below
    source_paths?: string[];             // Source files to review
    review_depth?: 'quick' | 'thorough';  // Assessment depth (default: thorough)
}

// Expected BDD report schema (from rd3:bdd-workflow ExecutionReport):
interface ExecutionReport {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration_ms: number;
    overall_deterministic_ratio: number;
    scenarios: Array<{
        name: string;          // Scenario name — maps to requirement text
        feature: string;
        status: 'passed' | 'failed' | 'skipped';
        steps: Array<{ step: string; checker: string; status: string }>;
        deterministic_ratio: number;
    }>;
}
```

## Quick Start

```
1. Load task file via task_ref
2. Parse Requirements section into numbered items
   - If 0 requirements found: return verdict='pass' with warning "No requirements to verify"
3. If bdd_report provided:
   - Map each requirement to BDD scenarios
   - Mark covered requirements as "met"
4. For uncovered requirements (or if no BDD report):
   - Read source files
   - Search for implementation evidence
   - Produce LLM assessment per requirement
5. Compute overall verdict
6. Write results to task file Review section
```

## Workflows

### Workflow 1: BDD-Assisted Functional Review

1. Load the task file and parse the Requirements section into numbered review items.
2. Load the BDD execution report from `rd3:bdd-workflow`.
3. Map each requirement to one or more scenarios by requirement text, identifiers, or explicit traceability markers.
4. Mark requirements as `met` when all covering scenarios pass, or `partial` when any covering scenario fails or skips.
5. Run LLM evidence assessment only for requirements that remain uncovered after BDD mapping.
6. Compute the overall functional verdict and persist the report to the task Review section.

### Workflow 2: LLM-Only Functional Review

1. Load the task file and parse the Requirements section.
2. Enumerate relevant source paths and tests for the implementation under review.
3. Gather concrete evidence with file paths, line numbers, and symbol names for each requirement.
4. Assess each requirement as `met`, `partial`, or `unmet` using the evidence quality rules below.
5. Compute the overall verdict and write the report to the task Review section.

### Workflow 3: Phase Gate Handoff

1. Consume the output from Phase 8a (`rd3:bdd-workflow`) when available.
2. Produce a pass, partial, or fail decision for Phase 8b using the per-requirement verdicts.
3. Return the structured report to orchestration for final gate handling.

## Two-Track Assessment

### Track A: BDD Coverage (if bdd_report exists)

```typescript
// Load BDD execution report
const bddReport = JSON.parse(readFile(bdd_report_path));

// Map requirements to scenarios
for (const req of requirements) {
    const coveringScenarios = findScenariosForRequirement(req, bddReport);
    
    if (coveringScenarios.allPassed()) {
        verdict[req.id] = { status: 'met', evidence: coveringScenarios };
    } else if (coveringScenarios.someFailed()) {
        verdict[req.id] = { status: 'partial', evidence: coveringScenarios };
    }
}
```

### Track B: LLM Assessment (for uncovered or no BDD report)

```typescript
// For each uncovered requirement
for (const req of uncoveredRequirements) {
    // Gather source evidence
    const evidence = gatherEvidence(req, source_paths);
    
    // LLM assessment
    const assessment = llmAssess(req, evidence, review_depth);
    
    verdict[req.id] = {
        status: assessment.status,
        evidence: assessment.evidence,
    };
}

function llmAssess(req: Requirement, evidence: Evidence, depth: string): Assessment {
    const prompt = depth === 'quick' 
        ? `Is requirement "${req.text}" satisfied by this implementation? Evidence: ${evidence}`
        : `For requirement "${req.text}", analyze each sub-requirement. Evidence: ${evidence}`;
    
    return {
        status: llm.judge(prompt), // met | unmet | partial
        evidence: llm.provideSpecificEvidence(),
    };
}
```

## Evidence Gathering

```typescript
function gatherEvidence(req: Requirement, sourcePaths: string[]): Evidence {
    const evidence: Evidence = {
        files: [],
        lines: [],
        functions: [],
        patterns: [],
    };
    
    for (const filePath of sourcePaths) {
        const content = readFile(filePath);
        
        // Search for requirement keywords
        const keywordMatches = searchKeywords(req.keywords, content);
        evidence.files.push(...keywordMatches.files);
        evidence.lines.push(...keywordMatches.lines);
        
        // Search for function/class definitions
        const symbolMatches = searchSymbols(req.symbols, content);
        evidence.functions.push(...symbolMatches);
    }
    
    return evidence;
}
```

## Verdict Computation

```typescript
interface RequirementVerdict {
    requirement: string;
    status: 'met' | 'unmet' | 'partial';
    evidence: string;  // Specific evidence
    bdd_coverage?: string[];  // Scenario names if BDD-covered
}

interface OverallVerdict {
    verdict: 'pass' | 'partial' | 'fail';
    summary: string;
    requirements: RequirementVerdict[];
    met_count: number;
    partial_count: number;
    unmet_count: number;
}

// Compute overall verdict
function computeVerdict(requirements: RequirementVerdict[]): OverallVerdict {
    const met = requirements.filter(r => r.status === 'met').length;
    const partial = requirements.filter(r => r.status === 'partial').length;
    const unmet = requirements.filter(r => r.status === 'unmet').length;
    
    let verdict: 'pass' | 'partial' | 'fail';
    if (unmet > 0) {
        verdict = 'fail';
    } else if (partial > 0) {
        verdict = 'partial';
    } else {
        verdict = 'pass';
    }
    
    return {
        verdict,
        summary: `${met}/${requirements.length} requirements fully met`,
        requirements,
        met_count: met,
        partial_count: partial,
        unmet_count: unmet,
    };
}
```

## Evidence Quality Standards

### SPECIFIC Evidence (Required)

| Type | Example |
|------|---------|
| File path | `src/api/users.ts` |
| Line number | `line 42` |
| Function name | `createUser()` |
| Class name | `UserController` |
| Variable name | `MAX_RETRY_COUNT` |
| Test case | `test/users.test.ts::createUser` |

### VAGUE Evidence (Rejected)

| Type | Why Rejected |
|------|--------------|
| "implemented correctly" | No specific location |
| "meets requirements" | No evidence cited |
| "the code does X" | No file/line reference |
| "as specified" | No implementation pointer |

### Evidence Templates

**For met requirements:**
```
- `src/api/users.ts:42` - `createUser()` function implements user creation
- `src/api/users.ts:45-48` - Input validation for email field
- `tests/users.test.ts:15-20` - Unit test verifies email uniqueness
```

**For partial requirements:**
```
- `src/api/users.ts:42` - `createUser()` implements basic creation
- MISSING: `src/api/users.ts` - No error handling for duplicate emails
```

**For unmet requirements:**
```
- NO IMPLEMENTATION FOUND for requirement: "Send email notification on user creation"
- Searched: src/api/, src/services/, src/notifications/
```

## Review Report Format

```markdown
## Functional Review Report

**Task:** {task_ref}
**Date:** {date}
**Review Depth:** {quick|thorough}
**Overall Verdict:** {pass|partial|fail}

### Summary

- **Total Requirements:** {n}
- **Met:** {n} 
- **Partial:** {n}
- **Unmet:** {n}

### Per-Requirement Verdicts

#### Requirement 1: {requirement text}
- **Status:** met | unmet | partial
- **Evidence:**
  - `file:line` - {specific evidence}
  - `file:line` - {specific evidence}
- **BDD Coverage:** {scenario names} (if applicable)

---

## Review Approval

- [ ] Pass — All requirements met
- [ ] Partial — Some requirements partial, review needed
- [ ] Fail — Critical requirements unmet
```

## Integration

**tasks CLI integration:**
```bash
# With BDD report
rd3:functional-review 0266 --bdd-report tests/bdd-report.json --source-paths src/

# LLM-only (no BDD)
rd3:functional-review 0266 --source-paths src/

# Quick review
rd3:functional-review 0266 --review-depth quick
```

**Phase integration:**
- Phase 8b of 9-phase orchestration pipeline
- Input from bdd-workflow (Phase 8a) or standalone
- Output feeds into orchestration-dev gate decision
- Uses tasks update to persist Review section

## Quality Gates

1. **Evidence gate:** All evidence must be specific (file:line)
2. **Coverage gate:** All requirements must have a verdict
3. **Verdict gate:** Overall verdict must be pass/partial/fail with reasoning

## Platform Notes

### Claude Code
- Invoke via `Skill(skill="rd3:functional-review", args="<task-ref>")`

### Other Platforms (pi, Codex, OpenCode, etc.)

This skill has **no CLI** and must be executed inline. Execute the workflow below directly inside the calling agent loop.

**Inline execution** (run these steps directly):

```bash
# 1. Load task content
#    WBS refs should go through the tasks CLI so configured task folders are respected.
if [[ "$TASK_REF" == *.md ]]; then
  TASK_CONTENT=$(cat "$TASK_REF")
else
  TASK_CONTENT=$(tasks show "$TASK_REF")
fi

# 2. Parse requirements from task content (extract numbered items from Requirements section)
#    Look for lines matching: /^- \[ \]/ or /^[0-9]+\./ or explicit requirement markers

# 3. For each requirement, search source files for evidence
grep -rn "keyword" plugins/rd3/ --include="*.ts" | head -20

# 4. Run gate: bun run check
#    (always pass/fail gate before reporting)

# 5. Produce report in the Review Report Format above
#    Update task file with verdict
```

**Required permissions**: `Read`, `Bash` (for grep and bun), and `Edit` (to update the task file).

**Key point**: `rd3:functional-review` is self-contained and has no external runtime dependencies.

## Additional Resources

- [Assessment rubric](references/assessment-rubric.md)
- [Evidence standards](references/evidence-standards.md)
