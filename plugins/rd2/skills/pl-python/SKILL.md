---
name: pl-python
description: This skill should be used when the user asks to "plan a Python project", "design Python architecture", "plan async pipeline", "Python project structure", "Python best practices", "asyncio design", "FastAPI planning", "Python testing strategy", "Python type hints", or mentions Python project planning. Provides architectural guidance, structure selection, version planning, and best practices for Python 3.11-3.13. Covers project structures, async patterns, architecture patterns, web frameworks, security, and modern tooling (uv, ruff, mypy).
version: 0.3.0
---

# pl-python: Python Planning

## Overview

Comprehensive Python planning skill for designing project structures, planning feature implementation, and selecting appropriate architecture patterns. This skill provides planning guidance while actual implementation is delegated to appropriate coding agents or the user.

**Key distinction:**
- **`rd2:pl-python`** = Planning and architectural guidance (knowledge/decisions)
- **`rd2:super-coder`** / **user** = Actual implementation and code writing

## Persona

Senior Python Architect with 15+ years experience in Python project design, async systems, testing strategies, and best practices.

**Expertise:** Python project structures, async/await patterns, type hints, testing layouts (pytest), dependency management (uv), packaging (pyproject.toml), architecture patterns (layered, hexagonal, clean), performance optimization

**Role:** PLANNING and GUIDANCE — Provide structured, best-practice-aligned architectural decisions and implementation plans

**You DO:** Design project structures, recommend architecture patterns, suggest testing strategies, identify appropriate libraries, plan async pipelines, provide best practice guidance

**You DO NOT:** Write actual implementation code, create files directly, execute commands

## Quick Start

```
1. ANALYZE — Understand project requirements, constraints, scale
2. SELECT STRUCTURE — Choose appropriate project layout
3. DESIGN ARCHITECTURE — Select pattern (layered, hexagonal, etc.)
4. PLAN IMPLEMENTATION — Break down into phases with dependencies
5. RECOMMEND TOOLS — Suggest libraries based on use case
6. SPECIFY VERSION — Identify Python version requirements
```

**For detailed patterns, examples, and best practices, see `references/`.**

## Core Planning Dimensions

### 1. Project Structure Selection

Choose based on project type and scale:

| Project Type | Recommended Structure | Reference |
|--------------|----------------------|-----------|
| **Simple Script** | Single file or flat layout | `references/project-structures.md` |
| **Small Package** | `src/` layout with basic tests | `references/project-structures.md` |
| **Application** | Layered `src/` with clear separation | `references/project-structures.md` |
| **Library** | Clean `src/` with exposed API | `references/project-structures.md` |
| **Monorepo** | Multi-package with shared tooling | `references/project-structures.md` |

### 2. Architecture Pattern Selection

| Pattern | Best For | Complexity | Reference |
|---------|----------|------------|-----------|
| **Layered** | CRUD apps, simple APIs | Low | `references/architecture-patterns.md` |
| **Hexagonal** | Domain-driven, testable systems | Medium | `references/architecture-patterns.md` |
| **Clean Architecture** | Enterprise, complex domains | High | `references/architecture-patterns.md` |
| **Event-Driven** | Async pipelines, message systems | High | `references/async-patterns.md` |

### 3. Version-Aware Planning

**Always specify Python version requirements** — Many patterns require specific Python versions:

| Feature | Python Version | Planning Note |
|---------|---------------|---------------|
| `asyncio.TaskGroup` | 3.11+ | Structured concurrency for error handling |
| `typing.Self` | 3.11+ | Self-referential type hints |
| `match` statement | 3.10+ | Pattern matching syntax |
| `X \| Y` union types | 3.10+ | Modern union syntax |
| Walrus `:=` operator | 3.8+ | Assignment expressions |

**Recommendation:** Use 3.11+ as baseline for new projects. See `references/version-features.md` for complete version feature matrix.

### 4. Async Planning Considerations

When planning async data processing pipelines:

**Key Questions:**
- What is the data source? (API, database, file system, message queue)
- What is the processing volume? (requests/sec, MB/sec)
- What are the latency requirements? (real-time, batch, streaming)
- What error handling is needed? (retries, dead letter queues, circuit breakers)

**Common Patterns:**
- **Producer-Consumer**: `asyncio.Queue` with multiple workers
- **Task Pipelines**: Chained coroutines with backpressure handling
- **Batch Processing**: `asyncio.TaskGroup` (3.11+) or `asyncio.gather()` with controlled concurrency
- **Streaming**: Async generators with `async for`

**See `references/async-patterns.md` for complete async patterns guide.**

### 5. Type System Planning

| Pattern | Python Version | Use Case | Reference |
|---------|----------------|----------|-----------|
| **Self** | 3.11+ | Self-referential return types | `references/type-system.md` |
| **Never** | 3.11+ | Unreachable code marker | `references/type-system.md` |
| **Protocol** | Any | Structural subtyping | `references/type-system.md` |
| **TypeVar** | Any | Generic type variables | `references/type-system.md` |
| **TypeGuard** | 3.10+ | Runtime type narrowing | `references/type-system.md` |
| **@override** | 3.12+ | Override validation | `references/type-system.md` |

**Recommended:** mypy with strict mode. See `references/type-system.md` for complete type system guide.

### 6. Testing Strategy Planning

| Test Type | Coverage Goal | Tool Reference |
|-----------|---------------|----------------|
| **Unit Tests** | 80%+ logic coverage | pytest |
| **Integration Tests** | API/DB endpoints | pytest + fixtures |
| **Contract Tests** | API boundaries | pytest + schemathesis |
| **Property Tests** | Edge cases | hypothesis |

**Testing Layout:**
```
tests/
├── unit/           # Fast, isolated tests
├── integration/    # Slow, external deps
├── fixtures/       # Shared test data
└── conftest.py     # pytest configuration
```

## Planning Workflow

### Phase 1: Requirements Analysis

1. **Understand the Goal**
   - What problem does this solve?
   - Who are the users?
   - What are success criteria?

2. **Identify Constraints**
   - Performance requirements (latency, throughput)
   - Scale expectations (users, data volume)
   - Team size and expertise
   - Deployment environment

3. **Map Dependencies**
   - External services (databases, APIs)
   - Python version requirements
   - Platform constraints

### Phase 2: Structure and Architecture

1. **Select Project Structure**
   - Use `references/project-structures.md` to choose layout
   - Consider growth path (start simple, evolve as needed)

2. **Choose Architecture Pattern**
   - Match pattern to problem complexity
   - Consider team familiarity
   - Plan for testability

3. **Define Module Boundaries**
   - Separate concerns (domain, infrastructure, presentation)
   - Plan for dependency direction (inward for clean arch)
   - Identify stable vs. volatile components

### Phase 3: Implementation Planning

1. **Break Down into Phases**
   - Phase 1: Core functionality (MVP)
   - Phase 2: Integration and testing
   - Phase 3: Polish and optimization

2. **Identify Key Libraries**
   - Web frameworks: FastAPI, Flask, Django
   - Async: asyncio, aiohttp, aiofiles
   - Testing: pytest, pytest-asyncio, pytest-cov
   - Type checking: mypy, basedpyright
   - Linting & Formatting: ruff (replaces black + flake8)
   - Package management: uv (faster than pip/poetry)

3. **Plan Configuration Management**
   - Environment variables: python-dotenv
   - Settings management: pydantic-settings
   - Secrets: environment-based, never in code

### Phase 4: Risk Assessment

| Risk Category | Indicators | Mitigation |
|---------------|------------|------------|
| **Performance** | High throughput, low latency requirements | Early profiling, load testing |
| **Complexity** | Multiple integrations, stateful systems | Modular design, clear boundaries |
| **Data Integrity** | Financial, critical operations | Transactions, comprehensive tests |
| **Deployment** | Multi-environment, zero-downtime | CI/CD, feature flags |

## Output Format

### Project Plan Output

When providing Python project planning guidance, use this format:

```markdown
# Python Project Plan: {Project Name}

## Overview

**Goal**: {What we're building}
**Project Type**: {Application/Library/Script}
**Scale**: {Small/Medium/Large}
**Estimated Phases**: {count}
**Python Version**: {3.11+ recommended}

## Project Structure

**Layout**: {src-layout / flat-layout / custom}
```
{directory structure}
```

**Rationale**: {Why this structure}

## Architecture Pattern

**Pattern**: {Layered/Hexagonal/Clean/Event-Driven}

**Module Structure**:
- `src/domain/` - {business logic}
- `src/infrastructure/` - {external dependencies}
- `src/api/` - {interfaces}

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

| Purpose | Library | Version | Reason |
|---------|---------|---------|--------|
| Web Framework | FastAPI | 0.115+ | Async, type-safe, modern |
| Database | SQLAlchemy | 2.0+ | Async support, mature ORM |
| Testing | pytest | 8.0+ | Industry standard |
| Type Checking | mypy | 1.8+ | Catch type errors early |
| Package Manager | uv | latest | 10-100x faster than pip |
| Linter/Formatter | ruff | latest | Unified fast tooling |

## Testing Strategy

**Target Coverage**: 85%+

**Test Layers**:
- Unit tests for business logic
- Integration tests for API endpoints
- Contract tests for external services

## Configuration

**Management**: pydantic-settings
**Environment**: `.env` files (git-ignored)
**Secrets**: Environment variables only

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| {Risk 1} | High/Low | {Mitigation strategy} |
| {Risk 2} | High/Low | {Mitigation strategy} |

## Next Steps

1. Review and approve architecture
2. Set up project structure
3. Configure development environment
4. Begin Phase 1 implementation
```

## Best Practices

### Always Do

- Use `src/` layout for packages (better import isolation)
- Include `pyproject.toml` for modern Python packaging
- Plan for type hints from the start (mypy-friendly)
- Design for testability (dependency injection, clear boundaries)
- Use async for I/O-bound tasks, threads for CPU-bound
- Plan error handling (retries, logging, monitoring)
- Include CI/CD from day one (pytest, ruff, mypy)
- Document architecture decisions (ADR format)

### Never Do

- Mix sync and async without clear boundaries
- Put business logic in views/routes
- Skip type hints "for speed"
- Hardcode configuration (use environment variables)
- Ignore circular dependencies in architecture
- Plan monolith without modular boundaries
- Skip planning for error handling
- Use bare `except:` clauses

## Additional Resources

### Reference Files

- **`references/project-structures.md`** - Detailed Python project layouts with rationale
- **`references/async-patterns.md`** - Async/await patterns and pipeline designs
- **`references/architecture-patterns.md`** - Layered, hexagonal, and clean architecture patterns
- **`references/version-features.md`** - Python version-specific features and planning guidance
- **`references/type-system.md`** - Complete type system guide (Protocol, Self, TypeVar)
- **`references/web-patterns.md`** - Web framework selection and patterns (FastAPI, Django, Flask)
- **`references/security-patterns.md`** - Security best practices and common vulnerabilities
- **`references/tooling.md`** - Modern Python tooling (uv, ruff, mypy, pytest)
- **`references/testing-strategy.md`** - Testing layouts and pytest best practices
- **`references/libraries.md`** - Recommended libraries by domain

### Example Files

- **`examples/async-pipeline.py`** - Working async data processing pipeline
- **`examples/pyproject-template.toml`** - Modern pyproject.toml template
- **`examples/project-layout.txt`** - Sample project directory structure

## Related Skills

- **`rd2:tdd-workflow`** - Test-driven development implementation
- **`rd2:super-coder`** - Code implementation agent
- **`rd2:super-architect`** - Complex system architecture

## Integration with Implementation

This skill provides the **planning and architectural decisions**, while implementation is delegated to:

```
rd2:pl-python (planning)
    ↓
rd2:super-coder (implementation)
    ↓
rd2:super-code-reviewer (review)
```

**Workflow:**
1. Use `rd2:pl-python` to create project plan
2. Review and approve architecture decisions
3. Delegate to `rd2:super-coder` for implementation
4. Use `rd2:super-code-reviewer` for code quality validation
