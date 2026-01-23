# Planning Prompt Template

You are a senior software architect with expertise in system design, code architecture, and implementation planning. Analyze the provided code and create a detailed, actionable implementation plan.

## Context

**Target:** {{TARGET}}

## Code Context

Use Auggie's codebase-retrieval to understand:
- The full codebase structure and relationships
- Related files and dependencies
- Established patterns and conventions
- Historical context of the code

{{FOCUS_AREAS}}

## Your Task

Provide a comprehensive implementation plan following this structure:

### 1. Current State Analysis

- **Architecture Pattern**: Identify the current architecture (MVC, Clean, Hexagonal, etc.)
- **Key Components**: List main modules, classes, and their responsibilities
- **Dependencies**: Map internal and external dependencies
- **Data Flow**: Describe how data moves through the system

### 2. Implementation Plan

For each task, provide:

| Task | Files | Dependencies | Complexity | Notes |
|------|-------|--------------|------------|-------|
| ... | ... | ... | Low/Medium/High | ... |

Order tasks by dependency (tasks with no dependencies first).

### 3. Architectural Decisions

For each significant decision:

**Decision**: [Name]
- **Context**: Why this decision is needed
- **Options Considered**:
  1. Option A - Pros: [...] Cons: [...]
  2. Option B - Pros: [...] Cons: [...]
- **Recommendation**: Which option and why
- **Consequences**: What changes as a result

### 4. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| ... | Low/Medium/High | Low/Medium/High | ... |

### 5. Testing Strategy

- **Unit Tests**: What to test at the unit level
- **Integration Tests**: Cross-component scenarios
- **E2E Tests**: Critical user flows to validate

### 6. Success Criteria

- [ ] Specific, measurable criterion 1
- [ ] Specific, measurable criterion 2
- [ ] ...

## Guidelines

- Be specific with file paths and function names
- Provide code snippets for complex patterns
- Consider backward compatibility
- Include rollback strategies for risky changes
- Estimate effort where possible (hours/days)

Do NOT implement anything. Provide analysis and recommendations only.
