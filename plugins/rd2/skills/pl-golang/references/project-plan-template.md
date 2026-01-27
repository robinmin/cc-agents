# Go Project Plan Template

Use this template when providing Go project planning guidance.

## Template Structure

```markdown
# Go Project Plan: {Project Name}

## Overview

**Goal**: {What we're building}
**Project Type**: {Service/Library/CLI/Microservice}
**Scale**: {Small/Medium/Large}
**Estimated Phases**: {count}
**Go Version**: {1.21+ recommended}

## Project Structure

**Layout**: {standard / microservice / workspace}
```
{directory structure}
```

**Rationale**: {Why this structure}

## Architecture Pattern

**Pattern**: {Layered/Event-Driven/Microservices}

**Module Structure**:
- `cmd/server/` - {application entry point}
- `pkg/api/` - {public API}
- `internal/service/` - {business logic}
- `internal/domain/` - {domain models}

## Interface Design

**Key Abstractions**:
```go
// In consumer package
type Database interface {
    SaveUser(ctx context.Context, user User) error
    FindUser(ctx context.Context, id string) (User, error)
}
```

## Implementation Plan

### Phase 1: Foundation (Week 1)
- [ ] {Task 1}
- [ ] {Task 2}
- [ ] {Task 3}

### Phase 2: Core Features (Week 2-3)
- [ ] {Task 1}
- [ ] {Task 2}

### Phase 3: Integration & Testing (Week 4)
- [ ] {Task 1}
- [ ] {Task 2}

## Technology Stack

| Purpose | Package | Version | Reason |
|---------|---------|---------|--------|
| Web Framework | net/http | stdlib | Native, simple, performant |
| Router | gin | latest | Fast, feature-rich (optional) |
| ORM | gorm | latest | Feature-rich ORM (optional) |
| Logging | log/slog | 1.21+ | Structured logging, stdlib |
| Context | context | stdlib | Cancellation, deadlines |
| Error Wrapping | errors | stdlib | Error chain support |

## Testing Strategy

**Target Coverage**: 85%+

**Test Layers**:
- Table-driven tests for business logic
- Subtests for test organization
- Benchmark tests for critical paths
- Race detection (`go test -race`)

## Concurrency Model

**Pattern**: {Worker Pool / Pipeline / Fan-out}

**Goroutine Management**:
- Use `sync.WaitGroup` for waiting
- Use `context.Context` for cancellation
- Use buffered channels for flow control

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| {Risk 1} | High/Low | {Mitigation strategy} |
| {Risk 2} | High/Low | {Mitigation strategy} |

## Next Steps

1. Review and approve architecture
2. Initialize module with `go mod init`
3. Set up project structure
4. Begin Phase 1 implementation
```

## Template Fields Guide

### Overview Section
- **Goal**: Brief description of what the project accomplishes
- **Project Type**: Service, Library, CLI tool, or Microservices
- **Scale**: Small (1-2 packages), Medium (3-10 packages), Large (10+ packages)
- **Go Version**: Minimum Go version required (1.21+ recommended for new projects)

### Project Structure Section
- **Layout**: Choose based on project type (see `project-structures.md`)
- **Rationale**: Explain why this structure fits the project

### Architecture Pattern Section
- **Pattern**: Layered, Event-Driven, Microservices, or Monorepo
- **Module Structure**: List key directories and their purposes

### Interface Design Section
- **Key Abstractions**: Show 1-3 core interface definitions
- Follow "accept interfaces, return structs" principle
- Define interfaces in consumer packages

### Implementation Plan Section
- Break into 2-4 phases
- Phase 1: Foundation (project setup, core types)
- Phase 2: Core Features (main functionality)
- Phase 3: Integration & Testing (polish, coverage)
- Phase 4: Optimization & Deployment (if needed)

### Technology Stack Section
- Prefer standard library when possible
- List external dependencies with justification
- Specify versions for critical packages

### Testing Strategy Section
- Target Coverage: 80-90% for typical projects
- List test types (unit, integration, benchmark, fuzzing)
- Include race detection for concurrent code

### Concurrency Model Section
- **Pattern**: Worker Pool, Pipeline, Fan-out/Fan-in, or Simple Goroutines
- **Goroutine Management**: How goroutines are created, synchronized, and cancelled

### Risk Assessment Section
- Identify 3-5 key risks
- Rate each as High, Medium, or Low
- Provide mitigation strategy for each

## Usage Notes

- **Fill in all placeholder fields** marked with `{braces}`
- **Adapt sections** based on project complexity
- **Add sections** for domain-specific requirements
- **Reference detailed guides** in `references/` for deeper explanations

## See Also

- `SKILL.md` - Planning workflow and dimensions
- `references/project-structures.md` - Project layout options
- `references/concurrency.md` - Concurrency patterns
- `references/testing.md` - Testing strategies
