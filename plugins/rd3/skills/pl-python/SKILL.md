---
name: pl-python
description: "Python project planning skill: architectural guidance, async patterns, type system design, tooling selection, and best practices for Python 3.11-3.13. Trigger when: planning a Python project, designing Python architecture, structuring async pipelines, FastAPI planning, or Python best practices."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-25
updated_at: 2026-03-25
type: technique
tags: [python, planning, architecture, async, type-system, engineering-core]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: architecture-design
  interactions:
    - knowledge-only
see_also:
  - rd3:sys-developing
  - rd3:sys-debugging
  - rd3:tdd-workflow
---

# rd3:pl-python — Python Project Planning

Comprehensive Python planning skill for designing project structures, planning async systems, and selecting appropriate architecture patterns.

## Overview

This skill provides guidance for planning Python projects at any scale — from single scripts to multi-package monorepos. It covers architectural decision-making (layered vs hexagonal vs clean architecture), async system design using `asyncio.TaskGroup` and structured concurrency, type system planning with modern Python typing features (Protocol, TypeVar, TypeIs, Self), and toolchain selection (uv, ruff, mypy, pytest).

**Scope:** Project planning decisions made before or during implementation — not implementation itself. For debugging, see `rd3:sys-debugging`. For test-driven development workflow, see `rd3:tdd-workflow`.

**Target audience:** Developers planning new Python projects or refactoring existing Python codebases.

**Python version focus:** 3.11–3.13, exploiting features like `asyncio.TaskGroup`, `typing.TypeIs`, type parameter defaults, and free-threaded mode.

## When to Use

Invoke this skill when:
- Planning a new Python project from scratch
- Designing Python architecture for an existing codebase
- Structuring async data processing pipelines
- Planning FastAPI or Django projects
- Selecting Python version and library stack
- Planning type system and typing strategy
- Setting up Python testing and tooling

## Quick Start

```
1. ANALYZE — Understand project requirements, constraints, scale
2. SELECT STRUCTURE — Choose appropriate project layout (src/ layout)
3. DESIGN ARCHITECTURE — Select pattern (layered, hexagonal, event-driven)
4. PLAN ASYNC — Design async pipelines with TaskGroup, Queue, producers/consumers
5. RECOMMEND TOOLS — Suggest libraries (FastAPI, SQLAlchemy 2.0, pytest, uv)
6. SPECIFY VERSION — Identify Python 3.11+ requirements
```

For detailed patterns, examples, and best practices, see `references/`.

## Workflows

### New Python Project Workflow

```
1. ANALYZE requirements
   ├── Determine project type (script, package, application, library)
   ├── Identify scale and complexity
   └── Assess async requirements

2. SELECT structure
   ├── Choose project layout (src/ vs flat)
   └── Define directory boundaries

3. DESIGN architecture
   ├── Select pattern (layered, hexagonal, clean, event-driven)
   └── Define layer responsibilities

4. PLAN async (if applicable)
   ├── Choose concurrency pattern (TaskGroup, Queue, pipeline)
   └── Design error handling strategy

5. SPECIFY tooling
   ├── Select libraries (FastAPI, SQLAlchemy, httpx)
   ├── Plan type checker and linter setup
   └── Define testing approach

6. OUTPUT plan
   └── Document decisions in planning output format
```

### Architecture Review Workflow

```
1. ASSESS current state
   ├── Map existing project structure
   └── Identify architectural smells

2. COMPARE against patterns
   ├── Evaluate fit for layered / hexagonal / clean
   └── Identify migration path

3. RECOMMEND changes
   ├── Prioritize by impact
   └── Sequence refactoring steps
```

### Async System Design Workflow

```
1. IDENTIFY data sources and sinks
2. DETERMINE processing model (batch, streaming, request-response)
3. SELECT pattern
   ├── Producer-Consumer → asyncio.Queue + workers
   ├── Pipeline → chained async generators
   ├── TaskGroup → bounded concurrent tasks
   └── Fan-out → TaskGroup with cancel on first failure
4. PLAN error handling
   ├── Retry policy and backoff
   ├── Circuit breaker thresholds
   └── Dead letter handling
```

## Core Planning Dimensions

### 1. Project Structure Selection

Choose based on project type and scale:

| Project Type | Recommended Structure | Key Directories |
|--------------|----------------------|-----------------|
| **Simple Script** | Single file or flat layout | `*.py` |
| **Small Package** | `src/` layout with basic tests | `src/`, `tests/` |
| **Application** | Layered `src/` with clear separation | `src/`, `tests/`, `scripts/` |
| **Library** | Clean `src/` with exposed API | `src/`, `tests/`, `docs/` |
| **Monorepo** | Multi-package with shared tooling | `packages/*/`, `tooling/` |

### 2. Architecture Pattern Selection

| Pattern | Best For | Complexity |
|---------|----------|------------|
| **Layered** | CRUD apps, simple APIs | Low |
| **Hexagonal** | Domain-driven, testable systems | Medium |
| **Clean Architecture** | Enterprise, complex domains | High |
| **Event-Driven** | Async pipelines, message systems | High |

### 3. Python Version Planning

Always specify Python version requirements — Many features require specific versions:

| Feature | Python Version | Planning Note |
|---------|---------------|---------------|
| `asyncio.TaskGroup` | 3.11+ | Structured concurrency with automatic error handling |
| `typing.Self` | 3.11+ | Self-referential return types in builders |
| Exception Groups | 3.11+ | Handle multiple exceptions in async code |
| `asyncio.timeout()` | 3.11+ | Deadline-based timeout without CancelledError |
| Type parameter syntax | 3.12+ | `class Container[T]:` style generics |
| `@override` decorator | 3.12+ | Method override validation |
| `TypeIs` | 3.13+ | Precise type narrowing |
| Free-threaded mode | 3.13+ | No GIL (experimental) |

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
- **Batch Processing**: `asyncio.TaskGroup` (3.11+) with controlled concurrency
- **Streaming**: Async generators with `async for`

**Critical Async Pitfalls:**
- **NEVER** use blocking calls (`time.sleep()`, `requests.get()`) in async functions
- **NEVER** call `asyncio.run()` inside an already running event loop
- **ALWAYS** use `async with` for async context managers
- **ALWAYS** handle `CancelledError` in finally blocks for cleanup
- **USE** `asyncio.Lock` for critical sections accessing shared state
- **USE** `asyncio.timeout()` (3.11+) instead of `asyncio.wait_for()`

**See `references/async-patterns.md` for complete async patterns guide.**

### 5. Type System Planning

| Pattern | Python Version | Use Case |
|---------|----------------|----------|
| **Self** | 3.11+ | Self-referential return types |
| **Never** | 3.11+ | Unreachable code marker |
| **Protocol** | Any | Structural subtyping (duck typing with types) |
| **TypeVar** | Any | Generic type variables |
| **TypeGuard** | 3.10+ | Runtime type narrowing in validation |
| **@override** | 3.12+ | Method override validation |
| **TypeIs** | 3.13+ | Precise type narrowing (better than TypeGuard) |
| **Type parameter defaults** | 3.13+ | Default generic values |

**Type Hints Best Practices:**
- Use `from __future__ import annotations` at module top (enables forward references)
- Prefer `TypeVar` over `Any` — `Any` disables type checking entirely
- Use `Protocol` instead of abstract base classes for structural typing
- Use `TypeGuard` for runtime type narrowing in validation functions
- Use `TypeIs` (3.13+) for more precise type narrowing
- Define `@overload` decorators when functions return different types based on arguments

**Recommended:** mypy with `--strict` mode or basedpyright for better defaults. See `references/type-system.md` for complete type system guide.

### 6. Testing Strategy Planning

| Test Type | Coverage Goal | Tool Reference |
|-----------|---------------|----------------|
| **Unit Tests** | 80%+ logic coverage | pytest |
| **Integration Tests** | API/DB endpoints | pytest + fixtures |
| **Contract Tests** | API boundaries | pytest + schemathesis |
| **Property Tests** | Edge cases | hypothesis |
| **Async Tests** | Async functions | pytest-asyncio |

**Testing Layout:**
```
tests/
├── unit/           # Fast, isolated tests
├── integration/    # Slow, external deps
├── fixtures/       # Shared test data
└── conftest.py     # pytest configuration
```

**Testing Best Practices:**
- Use `pytest.fixture` with `scope="function"` for test isolation
- Use `@pytest.mark.asyncio` for async test functions
- Use `@pytest.mark.parametrize` for data-driven tests
- Use `pytest-asyncio` for async fixtures with `AsyncIterator` yield
- Aim for 85%+ test coverage with pytest-cov
- Use hypothesis for property-based testing of edge cases
- Mock external dependencies with `pytest-mock` or `unittest.mock`

## Common Python Pitfalls

| Pitfall | Solution | Reference |
|---------|----------|-----------|
| **Mutable defaults** | Use `None` as default, initialize inside function | `references/pitfalls.md` |
| **Late binding closures** | Use default argument to bind values immediately | `references/pitfalls.md` |
| **Generator exhaustion** | Materialize with `list()` or use `itertools.tee()` | `references/pitfalls.md` |
| **Name shadowing** | Avoid `list`, `dict`, `id`, `type`, `input`, `str`, `int` | `references/pitfalls.md` |
| **Identity vs equality** | Use `is` only for `None`, `True`, `False` | `references/pitfalls.md` |
| **Modifying while iterating** | Use comprehension or iterate over copy | `references/pitfalls.md` |
| **Bare except clauses** | Catch specific exception types | `references/pitfalls.md` |
| **Blocking in async** | Use `await asyncio.sleep()` not `time.sleep()` | `references/async-patterns.md` |

**See `references/pitfalls.md` for complete pitfalls guide with examples.**

## Security Best Practices

### NEVER Do These (Critical Security Risks)

| Risk | NEVER | Alternative |
|------|-------|-------------|
| **Code injection** | `eval()` or `exec()` on user input | `ast.literal_eval()` |
| **Deserialization** | `pickle.load()` from untrusted sources | JSON, Protocol Buffers |
| **SQL injection** | String interpolation in queries | Parameterized queries |
| **Command injection** | `shell=True` without quoting | List form subprocess |
| **SSRF** | Fetch unvalidated user URLs | URL allow-lists, IP blocking |
| **Weak crypto** | `random` for secrets, MD5 hashes | `secrets` module, SHA-256 |
| **Path traversal** | Unvalidated file paths | Validate paths, use `pathlib` |
| **XSS** | Render unescaped HTML | HTML escaping, CSP headers |

**See `references/security-patterns.md` for comprehensive security patterns with examples.**

## Core Language Patterns

| Pattern | Use Case | Reference |
|---------|----------|-----------|
| **Comprehensions** | Concise collection transformations | `references/patterns.md` |
| **Context managers** | Resource cleanup (files, locks, connections) | `references/patterns.md` |
| **functools** | Memoization, partial functions, decorators | `references/patterns.md` |
| **dataclass** | Simple internal data containers | `references/patterns.md` |
| **frozen dataclass / NamedTuple** | Immutable value objects (prefer by default) | `references/patterns.md` |
| **Pydantic** | API models, external data validation | `references/patterns.md` |
| **ABC** | Explicit interface enforcement | `references/patterns.md` |
| **Protocol** | Structural typing (duck typing with types) | `references/type-system.md` |
| **Properties** | Computed attributes, validation | `references/patterns.md` |
| **Generators** | Lazy sequences, memory efficiency | `references/patterns.md` |
| **Decorators** | Function enhancement, cross-cutting concerns | `references/patterns.md` |

## Standard Library Modules

### Essential Standard Library Modules

| Module | Purpose | Key Functions/Classes |
|--------|---------|----------------------|
| **asyncio** | Async I/O | `run()`, `create_task()`, `gather()`, `TaskGroup`, `timeout()` |
| **typing** | Type hints | `List`, `Dict`, `Optional`, `Protocol`, `Generic`, `Self`, `Never`, `TypeIs` |
| **dataclasses** | Data structures | `@dataclass`, `field()` |
| **contextlib** | Context managers | `contextmanager()`, `ExitStack()`, `asynccontextmanager()` |
| **itertools** | Iteration tools | `chain()`, `groupby()`, `islice()`, `tee()` |
| **functools** | Functional tools | `lru_cache()`, `partial()`, `wraps()`, `cache()` |
| **collections** | Data structures | `defaultdict`, `Counter`, `OrderedDict` |
| **pathlib** | File paths | `Path()`, `Path.read_text()`, `Path.write_text()` |
| **logging** | Logging | `basicConfig()`, `getLogger()` |
| **secrets** | Crypto random | `token_hex()`, `token_urlsafe()`, `choice()` |
| **hashlib** | Hashing | `sha256()`, `sha512()` |
| **struct** | Binary data | `pack()`, `unpack()` |
| **json** | JSON handling | `loads()`, `dumps()` |
| **re** | Regex | `compile()`, `search()`, `sub()`, `match()` |
| **datetime** | Dates/times | `datetime()`, `timedelta()`, `timezone` |
| **concurrent.futures** | Thread/process pools | `ThreadPoolExecutor`, `ProcessPoolExecutor` |

## Best Practices

### Always Do

- Use `src/` layout for packages (better import isolation)
- Include `pyproject.toml` for modern Python packaging
- Plan for type hints from the start (mypy-friendly)
- Design for testability (dependency injection, clear boundaries)
- Use async for I/O-bound tasks, `multiprocessing` for CPU-bound
- Plan error handling (retries, logging, monitoring)
- Include CI/CD from day one (pytest, ruff, mypy)
- Use context managers for resource handling
- Prefer immutable data structures (`frozen=True` dataclass, `NamedTuple`)
- Use `logging` module instead of `print()` statements
- Leverage standard library before third-party packages
- Validate and sanitize all user input
- Use parameterized queries for database access
- Plan security from the start, not as an afterthought
- Use `uv` for package management (10-100x faster than pip)
- Use `ruff` for linting and formatting (unified, fast tooling)

### Never Do

- Mix sync and async without clear boundaries
- Put business logic in views/routes
- Skip type hints "for speed"
- Hardcode configuration (use environment variables)
- Ignore circular dependencies in architecture
- Plan monolith without modular boundaries
- Skip planning for error handling
- Use bare `except:` clauses
- Use mutable default arguments
- Use `is` for value comparison (except None/True/False)
- Shadow built-in names (`list`, `dict`, `id`, `type`)
- Modify collections while iterating
- Use `eval()` or `exec()` on user input
- Use `pickle.load()` from untrusted sources
- Use `shell=True` in subprocess without quoting
- Interpolate strings into SQL queries
- Use `random` for security (use `secrets`)

## Technology Stack Recommendations

| Purpose | Library | Version | Reason |
|---------|---------|---------|--------|
| **Web Framework** | FastAPI | 0.115+ | Native async, auto OpenAPI docs, Pydantic integration |
| **Database ORM** | SQLAlchemy | 2.0+ | Async support, mature, well-documented |
| **Async HTTP** | httpx | 0.27+ | Async HTTP client/server, drop-in requests replacement |
| **Data Validation** | Pydantic | 2.5+ | Runtime validation, settings management |
| **Package Manager** | uv | latest | 10-100x faster than pip, Python 3.11+ required |
| **Linter/Formatter** | ruff | latest | Unified (replaces black + flake8 + isort), 10-100x faster |
| **Type Checker** | mypy | 1.8+ | Standard, strict mode recommended |
| **Testing** | pytest | 8.0+ | Industry standard, rich plugin ecosystem |
| **Async Testing** | pytest-asyncio | 0.23+ | Async test support, fixture integration |
| **Property Testing** | hypothesis | 6.100+ | Property-based edge case discovery |
| **CLI Framework** | Click or Typer | latest | Typer for type-hint-driven CLIs |
| **Settings** | pydantic-settings | 2.1+ | Type-safe config from env vars |

## Reference Files

| Reference | What You'll Find |
|-----------|-----------------|
| `references/async-patterns.md` | TaskGroup, producer-consumer, pipelines, error handling |
| `references/architecture-patterns.md` | Layered, hexagonal, clean, event-driven patterns |
| `references/libraries.md` | Web, async, data, database, testing, CLI library guidance |
| `references/output-format.md` | Standard planning output template |
| `references/patterns.md` | Comprehensions, context managers, dataclasses, decorators |
| `references/pitfalls.md` | Mutable defaults, late binding, blocking in async, common mistakes |
| `references/project-structures.md` | src/ layout, layered app, library, monorepo, data pipeline |
| `references/security-patterns.md` | Injection prevention, secrets management, auth patterns |
| `references/testing-strategy.md` | pytest fixtures, async testing, coverage, Hypothesis |
| `references/tooling.md` | uv, ruff, mypy, pre-commit, CI/CD configuration |
| `references/type-system.md` | Protocol, TypeVar, TypeGuard, TypeIs, Self, TypedDict |
| `references/version-features.md` | Python 3.8–3.13 feature matrix |
| `references/web-patterns.md` | FastAPI DI, WebSockets, JWT auth, Docker, Kubernetes |
| `references/external-resources.md` | Curated links to official docs, PEPs, and learning resources |

## Additional Resources

- [Python Documentation](https://docs.python.org/3/) — Official docs
- [asyncio documentation](https://docs.python.org/3/library/asyncio.html) — Async I/O
- [FastAPI Documentation](https://fastapi.tiangolo.com/) — Modern async web framework
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/) — Database ORM
- [uv Documentation](https://github.com/astral-sh/uv) — Fast package manager
- [ruff Documentation](https://docs.astral.sh/ruff/) — Linter and formatter
- [mypy Documentation](https://mypy.readthedocs.io/) — Type checker
- [pytest Documentation](https://docs.pytest.org/) — Testing framework
