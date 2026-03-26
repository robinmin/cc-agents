---
name: pl-golang
description: "Go project planning skill: architectural guidance, concurrency patterns, interface design, module structure, and best practices for Go 1.21-1.23+. Trigger when: planning a Go project, designing Go architecture, structuring concurrent services, Go best practices, goroutines and channels, Go generics, or Go testing strategy."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-25
updated_at: 2026-03-25
type: technique
tags: [golang, planning, architecture, concurrency, interfaces, engineering-core]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: architecture-design
  interactions:
    - pipeline
  pipeline_steps:
    - ANALYZE
    - STRUCTURE
    - ARCHITECT
    - CONCURRENCY
    - TOOLS
    - VERSION
  trigger_keywords:
    - "plan a Go project"
    - "design Go architecture"
    - "Go project structure"
    - "Go best practices"
    - "goroutines and channels"
    - "Go generics"
    - "Go testing strategy"
    - "Go concurrency patterns"
    - "structuring Go services"
    - "Go interface design"
see_also:
  - rd3:sys-developing
  - rd3:sys-debugging
  - rd3:tdd-workflow
---

# rd3:pl-golang — Go Project Planning

Comprehensive Go planning skill for designing project structures, planning concurrent systems, and selecting appropriate architecture patterns.

## Overview

This skill provides guidance for planning Go projects at any scale — from single CLI tools to distributed microservices. It covers architectural decision-making (standard project layouts, layered architecture), concurrent system design using goroutines, channels, and structured concurrency patterns, interface design following Go idioms ("accept interfaces, return structs"), module and dependency management, and tooling selection.

**Scope:** Project planning decisions made before or during implementation — not implementation itself. For debugging, see `rd3:sys-debugging`. For test-driven development workflow, see `rd3:tdd-workflow`.

**Target audience:** Developers planning new Go projects or refactoring existing Go codebases.

**Go version focus:** 1.21–1.23+, exploiting features like `log/slog`, `slices`, `maps`, `cmp` packages, range-over-int (1.22+), and generics (1.18+).

## When to Use

Invoke this skill when:
- Planning a new Go project from scratch
- Designing Go architecture for an existing codebase
- Structuring concurrent data processing pipelines
- Planning HTTP/gRPC services in Go
- Selecting Go version and library stack
- Planning interface abstractions and module boundaries
- Setting up Go testing and tooling

## Quick Start

```
1. ANALYZE   — Understand project requirements, constraints, scale
2. STRUCTURE — Choose project layout (cmd/pkg/internal)
3. ARCHITECT — Select pattern (layered, hexagonal, event-driven)
4. CONCURRENCY — Design goroutine management, channel patterns
5. TOOLS     — Recommend libraries (stdlib-first, then external)
6. VERSION   — Identify Go 1.21+ requirements
```

For detailed patterns and examples, see `references/` (loaded on demand).

## Depth Guide

This skill uses **3-tier progressive disclosure**:

| Tier | What It Covers | Loaded |
|------|----------------|--------|
| **1 — This file** | Decisions, workflows, decision matrices | Always |
| **2 — references/* | Patterns, code examples, detailed tables | On demand |
| **3 — external-resources.md | External docs, books, community | On demand |

**When to jump to Tier 2:**
- Need a code example for a specific pattern → check `references/concurrency.md`
- Choosing between architecture patterns → see `references/patterns.md`
- Go version feature matrix → see `references/version-features.md`

## Core Planning Dimensions

### 1. Project Structure Selection

Choose based on project type and scale:

| Project Type | Recommended Structure | Key Directories |
|--------------|----------------------|-----------------|
| **Simple CLI Tool** | `cmd/` + single package | `cmd/toolname/main.go` |
| **Library/Package** | Clean package with exported API | `mylib.go`, `mylib_test.go` |
| **Service/Application** | Standard `cmd/`, `pkg/`, `internal/` | `cmd/`, `internal/`, `pkg/` |
| **Microservices** | Multi-service in monorepo | `services/*/`, `shared/` |
| **Go Workspace** | `go.work` for multiple modules | `go.work`, `module1/`, `module2/` |

**Recommendation:** Use the standard Go project layout. See `references/project-structures.md` for detailed directory explanations.

### 2. Concurrency Pattern Selection

| Pattern | Best For | Complexity | Go Version | Reference |
|---------|----------|------------|-----------|-----------|
| **Goroutine + WaitGroup** | Simple parallel tasks | Low | 1.0+ | `references/concurrency.md` |
| **Buffered Channels** | Producer-consumer pipelines | Medium | 1.0+ | `references/concurrency.md` |
| **Select + Channels** | Multiplexing, timeouts, cancellation | Medium | 1.0+ | `references/concurrency.md` |
| **Context** | Cancellation, deadlines, value propagation | Medium | 1.0+ | `references/patterns.md` |
| **Worker Pool** | Controlled concurrency, load management | High | 1.0+ | `references/concurrency.md` |
| **Fan-out/Fan-in** | Parallel processing pipelines | High | 1.0+ | `references/concurrency.md` |
| **sync/errgroup** | Structured concurrency with error propagation | Medium | 1.0+ | `references/concurrency.md` |
| **Iterator functions (range over func)** | Custom iteration logic, lazy sequences | Medium | 1.23+ | `references/concurrency.md` |

**Go 1.23 Iterator Functions (SOTA):**
```go
// Iterator function signature (Go 1.23+)
func Backward[E any](s []E) func(yield func(E) bool)
func AllKeys[K, V any](m map[K]V) func(yield func(K) bool)

// Usage — lazy, cancelable iteration
for v := range func(yield func(int) bool) {
    for i := 0; i < v; i++ {
        if !yield(i) { return }
    }
}(10) {
    // Process each value
}
```
**When to use iterators:** Prefer over slices for large/infinite sequences, or when early termination (yield returns false) saves work. For most CRUD workloads, a simple `for i := range slice` is clearer.

**Critical Rule:** "Don't communicate by sharing memory; share memory by communicating." Prefer channels over mutexes for inter-goroutine communication.

### 3. Go Version Planning

Always specify Go version requirements — Many features require specific versions:

| Feature | Go Version | Planning Note |
|---------|-----------|---------------|
| **Generics** | 1.18+ | Type-safe collections, utility functions |
| **Fuzzing** | 1.18+ | `testing/fuzz` for edge case discovery |
| **`slices`, `maps`, `cmp` packages** | 1.21+ | Generic slice/map utilities |
| **`log/slog`** | 1.21+ | Structured logging, built into stdlib |
| **`min`, `max` builtins** | 1.21+ | Built-in functions |
| **`clear` for maps/slices** | 1.21+ | Clear collections efficiently |
| **Range over integers** | 1.22+ | `for i := range 10` |
| **`errors.Join`** | 1.20+ | Multiple error handling |

**Recommendation:** Use 1.21+ as baseline for new projects. See `references/version-features.md` for complete version feature matrix.

### 4. Interface Design Planning

When designing interfaces:

**Key Principles:**
- **Accept interfaces, return structs** — Define interfaces in the consumer package
- **Keep interfaces small** — 1-3 methods is ideal; 5+ is a red flag
- **Define interfaces in consumer packages** — Not in the package that implements them
- **Use standard library interfaces** — `io.Reader`, `io.Writer`, `context.Context`

**Best Practices:**
- Design for testing — make fakes/mocks trivial to implement
- Don't create interfaces "just in case" — wait until testing is required
- Use the `-er` suffix naming convention for single-method interfaces

**Example — interface defined in consumer package:**
```go
// internal/user/service.go (consumer defines what it needs)
type UserFetcher interface {
    FindByID(ctx context.Context, id string) (User, error)
    List(ctx context.Context) ([]User, error)
}

// internal/user/service_test.go — fake is trivial to implement
type fakeUserFetcher struct{}

func (f *fakeUserFetcher) FindByID(_ context.Context, id string) (User, error) {
    return User{ID: id, Name: "test"}, nil
}
func (f *fakeUserFetcher) List(_ context.Context) ([]User, error) {
    return []User{{ID: "1", Name: "test"}}, nil
}
```

**See `references/interfaces.md` for complete interface design guide.**

### 5. Error Handling Strategy

| Pattern | Use Case | Reference |
|---------|----------|-----------|
| **Sentinel errors** | Comparable errors (`io.EOF`) | `references/error-handling.md` |
| **Error wrapping** | Adding context with `%w` | `references/error-handling.md` |
| **Custom error types** | Errors with data/behavior | `references/error-handling.md` |
| **errors.Join** | Multiple error handling (1.20+) | `references/error-handling.md` |
| **panic/recover** | Unrecoverable conditions only | `references/patterns.md` |

**Recommended:** Wrap errors with context using `fmt.Errorf("operation: %w", err)`. Avoid sentinel errors when custom error types suffice.

### 6. Testing Strategy Planning

| Test Type | Coverage Goal | Tool Reference |
|-----------|---------------|----------------|
| **Table-Driven Tests** | Business logic, edge cases | `testing` package |
| **Unit Tests** | 80%+ logic coverage | `testing` package |
| **Benchmark Tests** | Performance critical paths | `testing` package |
| **Fuzzing** | Input parsing, edge cases | `testing/fuzz` (1.18+) |
| **Integration Tests** | HTTP handlers, DB operations | `net/http/httptest` |

**Testing Layout:**
```
project/
├── pkg/
│   └── mypackage/
│       ├── mypackage.go
│       └── mypackage_test.go  # Co-located tests
```

## Architecture Pattern Selection

Choose based on project complexity and team size:

| Pattern | Best For | Complexity | Key Packages |
|---------|----------|------------|--------------|
| **Layered** | Standard CRUD services, internal tools | Low | `cmd/`, `internal/domain/`, `internal/service/`, `internal/handler/` |
| **Hexagonal** | Business-logic-heavy apps, testable cores | Medium | `internal/domain/`, `internal/ports/`, `internal/adapters/` |
| **Clean Architecture** | Long-lived projects, evolving domains | High | `domain/`, `application/`, `infrastructure/`, `interface/` |
| **Event-Driven** | Async pipelines, high-throughput systems | High | `internal/events/`, `internal/handlers/`, `internal/middleware/` |

**Decision rule:** Start with Layered. Move to Hexagonal when isolating business logic for testing. Choose Clean when the domain model is the core asset. Choose Event-Driven when processing order doesn't matter or eventual consistency is acceptable.

For detailed clean architecture package layouts, see `references/project-structures.md`.

## Output Format

When delivering a Go project plan, structure the output as:

```markdown
# Go Project Plan: {Project Name}

## Overview
- **Goal**: {What the project solves}
- **Type**: {Service/Library/CLI}
- **Go Version**: {1.21+ recommended}
- **Scale**: {Small/Medium/Large}

## Structure
```
{directory tree}
```

## Architecture
- **Pattern**: {Layered / Hexagonal / Clean / Event-Driven}
- **Key Interfaces**: {List 1-3 core interfaces with method signatures}

## Concurrency Model
- **Pattern**: {Worker Pool / Pipeline / Fan-out / None}
- **Goroutine lifecycle**: {How goroutines are started, managed, cancelled}

## Technology Stack
| Purpose | Library | Justification |
|---------|---------|---------------|
| {Web} | {stdlib / gin} | {Reason} |

## Implementation Phases
1. **{Phase name}**: {Deliverables}
2. **{Phase name}**: {Deliverables}

## Risk Summary
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
```

See `references/project-plan-template.md` for the full template with completion checklists.

## Workflow

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
   - External: `google.golang.org/grpc`, `github.com/gorilla/mux`

3. **Plan Module Structure**
   - Use `go.mod` for dependency management
   - Consider `go.work` for multi-module projects
   - Plan for minimal dependencies — stdlib first

### Phase 4: Risk Assessment

| Risk Category | Indicators | Mitigation |
|---------------|------------|------------|
| **Concurrency** | Race conditions, deadlocks | Use `go test -race`, proper synchronization |
| **Performance** | High throughput, low latency | Benchmarking, profiling, pprof |
| **Data Integrity** | Critical operations | Transactions, comprehensive tests |
| **Dependency** | Third-party reliability | Vendor or lockfile management |

## Best Practices

### Always Do

- **Use standard library first** — It's excellent and well-documented
- **Design small, focused interfaces** — 1-2 methods is ideal
- **Return early for errors** — Avoid deep nesting
- **Use `context.Context`** — For cancellation, deadlines, and value propagation
- **Defer cleanup** — File closes, mutex unlocks, etc.
- **Name interfaces with `-er` suffix** — `Reader`, `Writer`, `Closer`
- **Use table-driven tests** — For multiple test cases
- **Run `go test -race`** — To detect data races
- **Format with `gofmt`** — Consistent style is automatic
- **Keep goroutine lifetimes explicit** — Always have a way to wait or cancel
- **Wrap errors with context** — `fmt.Errorf("doing thing: %w", err)`
- **Use `log/slog`** (1.21+) — Structured logging built into stdlib

### Never Do

- **Create goroutines without a way to cancel them** — Memory leak risk
- **Use panic for normal error handling** — Only for unrecoverable states
- **Ignore errors** — Always check `err != nil`
- **Create "god" interfaces with many methods** — Violates single responsibility
- **Use mutexes when channels suffice** — Channels are the Go way
- **Hardcode paths and configuration** — Use environment variables
- **Forget to close channels** — Or close from the receiver side only
- **Use `time.Sleep` for synchronization** — Use channels or `sync.WaitGroup`
- **Create unbuffered channels without planning** — Risk of deadlock
- **Define interfaces in the producer package** — Define where consumed

## Common Go Pitfalls

| Pitfall | Solution | Reference |
|---------|----------|-----------|
| **Goroutine leaks** | Always pair with context cancellation or explicit done channel | `references/concurrency.md` |
| **Closing channels twice** | Only close from sender; use `defer close()` | `references/concurrency.md` |
| **Sending on closed channel** | Use `select` with `default` to check | `references/concurrency.md` |
| **Nil channel blocking** | Use `nil` channels in `select` to disable cases | `references/concurrency.md` |
| **Late binding in goroutines** | Pass loop variable as parameter | `references/concurrency.md` |
| **Mutable shared state** | Use channels or `sync.Mutex` properly | `references/concurrency.md` |

## Technology Stack Recommendations

| Purpose | Library | Version | Reason |
|---------|---------|---------|--------|
| **Web Framework** | `net/http` (stdlib) or `gin` | latest | Native is sufficient for most cases |
| **Router** | `gorilla/mux` or `chi` | latest | Battle-tested, simple |
| **ORM/Database** | `sqlx` or `database/sql` | stdlib | Stdio-first, then add if needed |
| **Logging** | `log/slog` | 1.21+ stdlib | Structured logging, no external deps |
| **gRPC** | `google.golang.org/grpc` | latest | High-performance RPC |
| **Testing** | `testing` + `testify` | stdlib + latest | Stdlib plus assertion helpers |
| **Fuzzing** | `testing/fuzz` | 1.18+ stdlib | Built into Go |
| **Config** | `github.com/spf13/viper` or env vars | latest | External config management |

**Philosophy:** Go's standard library is excellent. Add dependencies only when the stdlib doesn't meet project needs.

## Additional Resources

After this file, choose a path based on the immediate need:

| Need | Go Deep Into |
|------|-------------|
| I need a Go project layout | `references/project-structures.md` |
| I'm designing concurrent code | `references/concurrency.md` |
| I need to choose Go version | `references/version-features.md` |
| I'm defining interfaces | `references/interfaces.md` |
| I'm handling errors | `references/error-handling.md` |
| I'm writing tests | `references/testing.md` |
| I need a complete plan artifact | `references/project-plan-template.md` |
| I want external resources | `references/external-resources.md` |

## Reference Files

| Reference | Purpose |
|-----------|---------|
| `references/project-structures.md` | Project layout patterns (cmd/pkg/internal) |
| `references/concurrency.md` | Goroutines, channels, select, iterators, sync patterns |
| `references/interfaces.md` | Interface design, composition, embedding |
| `references/error-handling.md` | Error patterns, wrapping, sentinel errors |
| `references/patterns.md` | Defer, panic/recover, context idioms |
| `references/best-practices.md` | Idiomatic Go, common pitfalls |
| `references/testing.md` | Table-driven tests, benchmarks, fuzzing |
| `references/performance.md` | Profiling, optimization, pprof |
| `references/modules.md` | go.mod, go.work, dependency management |
| `references/stdlib.md` | Common standard library packages |
| `references/generics.md` | Go 1.18+ generics syntax and patterns |
| `references/version-features.md` | Go 1.18-1.23 feature matrix |
| `references/project-plan-template.md` | Planning output template |
| `references/external-resources.md` | Curated external resources and learning links |
