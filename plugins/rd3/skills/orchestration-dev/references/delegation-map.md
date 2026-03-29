# Delegation Map

This document maps phases to specialist skills with their inputs and outputs.

## Cross-Channel Convention

All phase inputs may include:

```typescript
type ExecutionChannel = 'current' | string;
```

- `current` means execute on the current channel.
- Any other value is treated as an ACP agent name.
- `rd3:orchestration-dev` owns channel normalization and chooses whether delegated work stays local or goes through `rd3:run-acp`.

## Downstream Evidence Contracts

Verification-aware downstream skills should emit predictable envelopes so orchestration can consume them without skill-specific parsing drift:

```typescript
const DOWNSTREAM_EVIDENCE_CONTRACTS = {
    'rd3:request-intake': {
        kind: 'request-intake-result',
        required_fields: ['background', 'requirements', 'constraints', 'profile'],
    },
    'rd3:bdd-workflow': {
        kind: 'bdd-execution-report',
        required_fields: ['scenarios', 'passed', 'failed', 'execution_mode'],
    },
    'rd3:functional-review': {
        kind: 'functional-verdict',
        required_fields: ['verdict', 'covered_requirements', 'missing_requirements'],
    },
};
```

## Phase -> Skill Mapping

| Phase | Primary Skill | Aliases | Sub-skills |
|-------|---------------|---------|------------|
| 1 | `rd3:request-intake` | intake | - |
| 2a | `rd3:backend-architect` | backend-arch | - |
| 2b | `rd3:frontend-architect` | frontend-arch | - |
| 3a | `rd3:backend-design` | backend-design | - |
| 3b | `rd3:frontend-design` | frontend-design | - |
| 3c | `rd3:ui-ux-design` | ui-ux-design | - |
| 4 | `rd3:task-decomposition` | decompose | - |
| 5 | `rd3:code-implement-common` | implement | - |
| 6 | `rd3:sys-testing` | testing | `rd3:advanced-testing` |
| 7 | `rd3:code-review-common` | review | - |
| 8a | `rd3:bdd-workflow` | bdd | - |
| 8b | `rd3:functional-review` | func-review | - |
| 9 | `rd3:code-docs` | docs | - |

## Phase 1: Request Intake

**Skill:** `rd3:request-intake`

### Inputs
```typescript
{
    task_ref: string;          // WBS number or path
    description?: string;       // Additional context
    domain_hints?: string[];   // Domain expertise hints
    execution_channel?: ExecutionChannel;
}
```

### Outputs
```typescript
{
    background: string;         // 100+ chars
    requirements: string[];      // Numbered, testable
    constraints: string[];      // Explicit limits
    profile: Profile;           // simple|standard|complex|research
}
```

### Updates Task File Sections
- Background
- Requirements
- Constraints
- Profile (frontmatter)

## Phase 2: Architecture

**Skills:** `rd3:backend-architect` or `rd3:frontend-architect`

### Inputs
```typescript
{
    task_ref: string;
    requirements: string[];      // From Phase 1
    constraints: string[];       // From Phase 1
    execution_channel?: ExecutionChannel;
}
```

### Outputs
```typescript
{
    architecture_doc: string;   // Markdown document
    components: Component[];
    api_contracts: APIContract[];
}

interface Component {
    name: string;
    type: 'frontend' | 'backend' | 'database' | 'service';
    responsibilities: string[];
    dependencies: string[];
}

interface APIContract {
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    request_schema: object;
    response_schema: object;
}
```

### Updates Task File Sections
- Design (architecture subsection)

## Phase 3: Design

**Skills:** `rd3:backend-design`, `rd3:frontend-design`, `rd3:ui-ux-design`

### Inputs
```typescript
{
    task_ref: string;
    architecture: ArchitectureDoc;  // From Phase 2
    requirements: string[];
    execution_channel?: ExecutionChannel;
}
```

### Outputs
```typescript
{
    design_doc: string;
    data_models: DataModel[];
    api_schemas: APISchema[];
    ui_specs?: UISpec[];           // If UI involved
}

interface DataModel {
    name: string;
    fields: Field[];
    relationships: Relationship[];
}

interface Field {
    name: string;
    type: string;
    required: boolean;
    validation?: string;
}

interface APISchema {
    endpoint: string;
    request: object;    // JSON schema
    response: object;  // JSON schema
}

interface UISpec {
    component: string;
    props: object;
    states: string[];
}
```

### Updates Task File Sections
- Design (full design document)

## Phase 4: Task Decomposition

**Skill:** `rd3:task-decomposition`

### Inputs
```typescript
{
    task_ref: string;
    requirements: string[];
    design?: DesignDoc;           // If available
    execution_channel?: ExecutionChannel;
}
```

### Outputs
```typescript
{
    subtasks: Subtask[];
}

interface Subtask {
    wbs: string;
    name: string;
    description: string;
    dependencies: string[];        // WBS numbers
    estimated_hours?: number;
}
```

### Side Effects
- Creates subtask files via `tasks batch-create`

## Phase 5: Implementation

**Skill:** `rd3:code-implement-common`

### Inputs
```typescript
{
    task_ref: string;             // Parent task or subtask
    solution: string;             // From Solution section
    design?: DesignDoc;           // If available
    execution_channel?: ExecutionChannel;
}
```

### Outputs
```typescript
{
    artifacts: Artifact[];
}

interface Artifact {
    type: 'file' | 'directory';
    path: string;
    action: 'create' | 'modify' | 'delete';
}
```

### Updates Task File Sections
- Artifacts

## Phase 6: Unit Testing

**Skills:** `rd3:sys-testing` + `rd3:advanced-testing`

### Inputs
```typescript
{
    task_ref: string;
    source_paths: string[];       // Implementation artifacts
    coverage_threshold: number;   // 60%, 80%, or unit-profile default 90%
    execution_channel?: ExecutionChannel;
}
```

### Outputs
```typescript
{
    coverage: CoverageResult;
    test_results: TestResult[];
}

interface CoverageResult {
    lines: number;                // % lines covered
    functions: number;           // % functions covered
    branches: number;            // % branches covered
    per_file?: Record<string, number>; // % line coverage per file when available
}

interface TestResult {
    file: string;
    status: 'passed' | 'failed';
    duration_ms: number;
    errors?: string[];
}
```

### Gate
- Coverage target met
- No failed tests
- For `unit` profile defaults: per-file coverage >= 90%

## Phase 7: Code Review

**Skill:** `rd3:code-review-common`

### Inputs
```typescript
{
    task_ref: string;
    source_paths: string[];
    review_depth?: 'quick' | 'thorough';
    execution_channel?: ExecutionChannel;
}
```

### Outputs
```typescript
{
    issues: Issue[];
    verdict: 'approve' | 'request_changes' | 'reject';
}

interface Issue {
    severity: 'error' | 'warning' | 'suggestion';
    file: string;
    line?: number;
    message: string;
    rule?: string;
}
```

### Gate
- Human approval (or auto-approve if no errors)

## Phase 8a: BDD Workflow

**Skill:** `rd3:bdd-workflow`

### Inputs
```typescript
{
    task_ref: string;
    mode: 'generate' | 'execute' | 'full';
    source_paths?: string[];
    feature_dir?: string;
    execution_channel?: ExecutionChannel;
}
```

### Outputs
```typescript
{
    feature_files: string[];
    execution_report: BDDReport;
}
```

## Phase 8b: Functional Review

**Skill:** `rd3:functional-review`

### Inputs
```typescript
{
    task_ref: string;
    bdd_report?: BDDReport;        // From Phase 8a
    source_paths?: string[];
    review_depth?: 'quick' | 'thorough';
    execution_channel?: ExecutionChannel;
}
```

### Outputs
```typescript
{
    verdict: 'pass' | 'partial' | 'fail';
    requirements: RequirementVerdict[];
}
```

## Phase 9: Documentation

**Skill:** `rd3:code-docs`

### Inputs
```typescript
{
    task_ref: string;
    source_paths?: string[];
    target_docs?: CanonicalDoc[];
    change_summary?: string[];
    style?: 'delta-first' | 'integrated';
    execution_channel?: ExecutionChannel;
}

type CanonicalDoc =
    | 'docs/01_ARCHITECTURE_SPEC.md'
    | 'docs/02_DEVELOPER_SPEC.md'
    | 'docs/03_USER_MANUAL.md'
    | 'docs/99_EXPERIENCE.md';
```

### Outputs
```typescript
{
    updated_docs: CanonicalDoc[];
    summary: string[];
}
```

## Skill Alias Reference

| Alias | Full Skill Name |
|-------|----------------|
| intake | `rd3:request-intake` |
| backend-arch | `rd3:backend-architect` |
| frontend-arch | `rd3:frontend-architect` |
| backend-design | `rd3:backend-design` |
| frontend-design | `rd3:frontend-design` |
| ui-ux-design | `rd3:ui-ux-design` |
| decompose | `rd3:task-decomposition` |
| implement | `rd3:code-implement-common` |
| testing | `rd3:sys-testing` |
| review | `rd3:code-review-common` |
| bdd | `rd3:bdd-workflow` |
| func-review | `rd3:functional-review` |
| docs | `rd3:code-docs` |
