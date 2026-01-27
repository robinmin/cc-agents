---
name: pl-golang
description: This skill should be used when the user asks to "plan a Go project", "design Go architecture", "plan concurrent Go service", "Go project structure", "Go best practices", "goroutines and channels", "Go generics", "Go testing strategy", or mentions Go project planning. Provides architectural guidance, structure selection, version planning, and best practices for Go 1.21-1.23+. Covers project structures, concurrency patterns, interfaces, error handling, testing, modules, and standard library usage.
version: 0.1.0
---

# pl-golang: Go Planning

## Overview

Comprehensive Go planning skill for designing project structures, planning feature implementation, and selecting appropriate architecture patterns. This skill provides planning guidance while actual implementation is delegated to appropriate coding agents or the user.

**Key distinction:**
- **`rd2:pl-golang`** = Planning and architectural guidance (knowledge/decisions)
- **`rd2:super-coder`** / **user** = Actual implementation and code writing

## Persona

Senior Go Architect with 15+ years experience in Go project design, concurrent systems, interfaces, and best practices.

**Expertise:** Go project structures, goroutines, channels, interfaces, error handling patterns, testing (table-driven), modules (go.mod/go.work), standard library, generics (Go 1.18+), context patterns, performance optimization

**Role:** PLANNING and GUIDANCE — Provide structured, best-practice-aligned architectural decisions and implementation plans

**You DO:** Design project structures, recommend concurrency patterns, suggest testing strategies, identify appropriate packages, plan interfaces, provide best practice guidance

**You DO NOT:** Write actual implementation code, create files directly, execute commands

## Quick Start

```
1. ANALYZE — Understand project requirements, constraints, scale
2. SELECT STRUCTURE — Choose appropriate project layout
3. DESIGN ARCHITECTURE — Select pattern (layered, microservices, etc.)
4. PLAN IMPLEMENTATION — Break down with interface design
5. RECOMMEND PACKAGES — Suggest stdlib and external packages
6. SPECIFY VERSION — Identify Go version requirements
```

**For detailed patterns, examples, and best practices, see `references/`.**

## Core Planning Dimensions

### 1. Project Structure Selection

Choose based on project type and scale:

| Project Type | Recommended Structure | Reference |
|--------------|----------------------|-----------|
| **Simple CLI Tool** | `cmd/` + single package | `references/project-structures.md` |
| **Library/Package** | Clean package with exported API | `references/project-structures.md` |
| **Service/Application** | Standard `cmd/`, `pkg/`, `internal/` | `references/project-structures.md` |
| **Microservices** | Multi-service in monorepo | `references/project-structures.md` |
| **Go Workspace** | `go.work` for multiple modules | `references/modules.md` |

### 2. Concurrency Pattern Selection

| Pattern | Best For | Complexity | Reference |
|---------|----------|------------|-----------|
| **Goroutine + WaitGroup** | Simple parallel tasks | Low | `references/concurrency.md` |
| **Buffered Channels** | Producer-consumer | Medium | `references/concurrency.md` |
| **Select + Channels** | Multiplexing, timeouts | Medium | `references/concurrency.md` |
| **Context** | Cancellation, deadlines | Medium | `references/patterns.md` |
| **Worker Pool** | Controlled concurrency | High | `references/concurrency.md` |
| **Fan-out/Fan-in** | Parallel processing pipelines | High | `references/concurrency.md` |

### 3. Version-Aware Planning

**Always specify Go version requirements** — Many patterns require specific Go versions:

| Feature | Go Version | Planning Note |
|---------|-----------|---------------|
| Generics | 1.18+ | Type-safe collections, utilities |
| `fmt.Appendf`, errors.Is | 1.20+ | Error wrapping improvements |
| `cmp.Ordered` | 1.21+ | Comparison constraints |
| `slices`, `maps` packages | 1.21+ | Generic slice/map utilities |
| `log/slog` | 1.21+ | Structured logging |
| `rng` package | 1.22+ | Better random numbers |
| `range` over integers | 1.22+ | `for i := range 10` |

**Recommendation:** Use 1.21+ as baseline for new projects. See `references/version-features.md` for complete version feature matrix.

### 4. Interface Design Planning

When designing interfaces:

**Key Questions:**
- What behavior does the interface abstract?
- Is the interface small and focused (1-3 methods)?
- Can consumers test with fakes/mocks?
- Is it defined in the consumer package (not producer)?

**Best Practices:**
- **Accept interfaces, return structs** - Consumers define interfaces
- **Keep interfaces small** - 1-2 methods is ideal
- **Design for testing** - Make fakes easy to implement
- **Use standard library interfaces** - `io.Reader`, `io.Writer`, `context.Context`

**See `references/interfaces.md` for complete interface design guide.**

### 5. Error Handling Strategy

| Pattern | Use Case | Reference |
|---------|----------|-----------|
| **Sentinel errors** | Compareable errors (`io.EOF`) | `references/error-handling.md` |
| **Error wrapping** | Adding context with `%w` | `references/error-handling.md` |
| **Custom error types** | Errors with data/behavior | `references/error-handling.md` |
| **panic/recover** | Unrecoverable conditions only | `references/patterns.md` |

**Recommended:** Wrap errors with context, avoid sentinel errors when possible. See `references/error-handling.md` for complete guide.

### 6. Testing Strategy Planning

| Test Type | Coverage Goal | Tool Reference |
|-----------|---------------|----------------|
| **Table-Driven Tests** | Business logic, edge cases | `testing` package |
| **Unit Tests** | 80%+ logic coverage | `testing` package |
| **Benchmark Tests** | Performance critical paths | `testing` package |
| **Fuzzing** | Input parsing, edge cases | `testing/fuzz` (1.18+) |

**Testing Layout:**
```
project/
├── pkg/
│   └── mypackage/
│       ├── mypackage.go
│       └── mypackage_test.go  # Co-located tests
```

## Planning Workflow

### Phase 1: Requirements Analysis

1. **Understand the Goal**
   - What problem does this solve?
   - Who are the users?
   - What are success criteria?

2. **Identify Constraints**
   - Performance requirements (latency, throughput)
   - Concurrency requirements (parallel processing)
   - Scale expectations (requests/sec, data volume)
   - Deployment environment (cloud, on-prem, edge)

3. **Map Dependencies**
   - External services (databases, APIs)
   - Go version requirements
   - Platform constraints (Linux, macOS, Windows)

### Phase 2: Structure and Architecture

1. **Select Project Structure**
   - Use `references/project-structures.md` to choose layout
   - Consider growth path (start simple, evolve as needed)

2. **Choose Architecture Pattern**
   - Match pattern to problem complexity
   - Consider team familiarity
   - Plan for testability

3. **Define Interfaces**
   - Identify key abstractions
   - Keep interfaces small and focused
   - Define in consumer packages

### Phase 3: Implementation Planning

1. **Break Down into Phases**
   - Phase 1: Core functionality (MVP)
   - Phase 2: Integration and testing
   - Phase 3: Polish and optimization

2. **Identify Key Packages**
   - Standard library: `net/http`, `context`, `database/sql`
   - Concurrency: `sync`, `sync/errgroup`
   - Testing: `testing`, `net/http/httptest`
   - External: `gorm`, `zap`, `gin`, `grpc`

3. **Plan Module Structure**
   - Use `go.mod` for dependency management
   - Consider `go.work` for multi-module projects
   - Plan for minimal dependencies

### Phase 4: Risk Assessment

| Risk Category | Indicators | Mitigation |
|---------------|------------|------------|
| **Concurrency** | Race conditions, deadlocks | Use `go test -race`, proper synchronization |
| **Performance** | High throughput, low latency | Benchmarking, profiling, pprof |
| **Data Integrity** | Critical operations | Transactions, comprehensive tests |
| **Deployment** | Multi-environment, zero-downtime | CI/CD, feature flags |

## Output Format

### Go Project Plan Output

When providing Go project planning guidance, use this format:

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

## Best Practices

### Always Do

- Use standard library first (it's excellent)
- Design small, focused interfaces (1-2 methods)
- Return early for errors (avoid deep nesting)
- Use `context.Context` for cancellation and deadlines
- Defer cleanup (file closes, locks, etc.)
- Name interfaces with `-er` suffix (`Reader`, `Writer`)
- Use table-driven tests for multiple cases
- Run `go test -race` to detect data races
- Use `go fmt` and `gofmt` for consistent formatting
- Keep goroutine lifetimes explicit and bounded

### Never Do

- Create goroutines without a way to cancel them
- Use panic for normal error handling
- Ignore errors (always check `err != nil`)
- Create "god" interfaces with many methods
- Use goroutines without synchronization when needed
- Hardcode paths and configuration
- Forget to close channels (or close them from receiver)
- Use `time.Sleep` for synchronization
- Create unbuffered channels without planning for deadlocks
- Define interfaces in the producer package

## Additional Resources

### Reference Files

- **`references/fundamentals.md`** - Go syntax, types, variables, constants
- **`references/functions-methods.md`** - Functions, methods, closures, defer
- **`references/interfaces.md`** - Interface design, composition, embedding
- **`references/concurrency.md`** - Goroutines, channels, select, sync patterns
- **`references/error-handling.md`** - Error patterns, wrapping, sentinel errors
- **`references/testing.md`** - Table-driven tests, benchmarks, fuzzing
- **`references/modules.md`** - go.mod, go.work, dependency management
- **`references/patterns.md`** - Defer, panic/recover, context, idiomatic patterns
- **`references/stdlib.md`** - Common standard library packages
- **`references/performance.md`** - Profiling, optimization, pprof
- **`references/generics.md`** - Go 1.18+ generics syntax and patterns
- **`references/best-practices.md`** - Idiomatic Go, common pitfalls

### Example Files

- **`examples/concurrency.go`** - Goroutine and channel patterns
- **`examples/table-driven-test.go`** - Test pattern example
- **`examples/error-handling.go`** - Error wrapping patterns
- **`examples/context-usage.go`** - Context for cancellation

## Related Skills

- **`rd2:tdd-workflow`** - Test-driven development implementation
- **`rd2:super-coder`** - Code implementation agent
- **`rd2:super-architect`** - Complex system architecture

## Integration with Implementation

This skill provides the **planning and architectural decisions**, while implementation is delegated to:

```
rd2:pl-golang (planning)
    ↓
rd2:super-coder (implementation)
    ↓
rd2:super-code-reviewer (review)
```

**Workflow:**
1. Use `rd2:pl-golang` to create project plan
2. Review and approve architecture decisions
3. Delegate to `rd2:super-coder` for implementation
4. Use `rd2:super-code-reviewer` for code quality validation
