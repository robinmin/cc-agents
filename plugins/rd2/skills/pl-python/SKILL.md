---
name: pl-python
description: This skill should be used when the user asks to "plan a Python project", "design Python architecture", "plan async pipeline", "Python project structure", "Python best practices", "asyncio design", "FastAPI planning", or mentions Python project planning. Provides architectural guidance, structure selection, version planning, and best practices for Python 3.11-3.13.
version: 0.4.0
---

# pl-python: Python Planning

## Overview

Comprehensive Python planning skill for designing project structures, planning feature implementation, and selecting appropriate architecture patterns. This skill provides planning guidance while actual implementation is delegated to appropriate coding agents or the user.

**Key distinction:**
- **`rd2:pl-python`** = Planning and architectural guidance (knowledge/decisions)
- **`rd2:super-coder`** / **user** = Actual implementation and code writing

## Persona

Senior Python Architect with 15+ years experience in Python project design, async systems, testing strategies, security patterns, and performance optimization.

**Expertise:** Python project structures, async/await patterns, type hints, testing layouts (pytest), dependency management (uv), packaging (pyproject.toml), architecture patterns (layered, hexagonal, clean), security best practices, common pitfalls, performance optimization, standard library modules

**Role:** PLANNING and GUIDANCE — Provide structured, best-practice-aligned architectural decisions and implementation plans

**You DO:** Design project structures, recommend architecture patterns, suggest testing strategies, identify appropriate libraries, plan async pipelines, provide best practice guidance, identify security risks, flag common pitfalls

**You DO NOT:** Write actual implementation code, create files directly, execute commands

## Quick Start

```
1. ANALYZE — Understand project requirements, constraints, scale
2. SELECT STRUCTURE — Choose appropriate project layout
3. DESIGN ARCHITECTURE — Select pattern (layered, hexagonal, etc.)
4. PLAN IMPLEMENTATION — Break down into phases with dependencies
5. RECOMMEND TOOLS — Suggest libraries based on use case
6. SPECIFY VERSION — Identify Python version requirements
7. IDENTIFY RISKS — Flag security issues, common pitfalls, performance concerns
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
| `typing.Never` | 3.11+ | Unreachable code marker |
| `typing.TypeAlias` | 3.12+ | Type alias declarations |
| `@override` decorator | 3.12+ | Method override validation |
| `match` statement | 3.10+ | Pattern matching syntax |
| `X \| Y` union types | 3.10+ | Modern union syntax |
| Walrus `:=` operator | 3.8+ | Assignment expressions |
| `dataclasses` module | 3.7+ | Data containers |

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

**Critical Async Pitfalls:**
- **NEVER** use blocking calls (`time.sleep()`, `requests.get()`) in async functions
- **NEVER** call `asyncio.run()` inside an already running event loop
- **ALWAYS** use `async with` for async context managers
- **ALWAYS** handle `CancelledError` in finally blocks for cleanup
- **USE** `asyncio.Lock` for critical sections accessing shared state
- **USE** `asyncio.timeout()` (3.11+) instead of `asyncio.wait_for()`

**See `references/async-patterns.md` for complete async patterns guide.**

### 5. Type System Planning

| Pattern | Python Version | Use Case | Reference |
|---------|----------------|----------|-----------|
| **Self** | 3.11+ | Self-referential return types | `references/type-system.md` |
| **Never** | 3.11+ | Unreachable code marker | `references/type-system.md` |
| **Protocol** | Any | Structural subtyping (duck typing with types) | `references/type-system.md` |
| **TypeVar** | Any | Generic type variables | `references/type-system.md` |
| **TypeGuard** | 3.10+ | Runtime type narrowing in validation | `references/type-system.md` |
| **@override** | 3.12+ | Method override validation | `references/type-system.md` |
| **NewType** | Any | Type distinctness for primitives | `references/type-system.md` |
| **Literal** | Any | Exact value types | `references/type-system.md` |

**Type Hints Best Practices:**
- Use `from __future__ import annotations` at module top (enables forward references)
- Prefer `TypeVar` over `Any` — `Any` disables type checking entirely
- Use `Protocol` instead of abstract base classes for structural typing
- Use `TypeGuard` for runtime type narrowing in validation functions
- Define `@overload` decorators when functions return different types based on arguments
- Use `object` instead of `Any` for truly unknown types that need no operations

**Recommended:** mypy with `--strict` mode or basedpyright for better defaults. See `references/type-system.md` for complete type system guide.

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

**Testing Best Practices:**
- Use `pytest.fixture` with `scope="function"` for test isolation
- Use `@pytest.mark.asyncio` for async test functions
- Use `@pytest.mark.parametrize` for data-driven tests
- Use `pytest-asyncio` for async fixtures with `AsyncIterator` yield
- Aim for 90%+ test coverage with pytest-cov
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
| **Pydantic** | API models, external data validation | `references/patterns.md` |
| **ABC** | Explicit interface enforcement | `references/patterns.md` |
| **Protocol** | Structural typing (duck typing with types) | `references/type-system.md` |
| **Properties** | Computed attributes, validation | `references/patterns.md` |
| **Generators** | Lazy sequences, memory efficiency | `references/patterns.md` |
| **Decorators** | Function enhancement, cross-cutting concerns | `references/patterns.md` |

**Planning Guidance:**
- Use `dataclass` for simple internal data structures
- Use `Pydantic` for API models, config validation, and external data
- Use `Protocol` instead of ABC for structural typing
- Always use context managers for resource handling
- Leverage comprehensions for simple transformations

**See `references/patterns.md` for complete core language patterns guide.**

## Standard Library Modules

### Essential Standard Library Modules

| Module | Purpose | Key Functions/Classes | Use Cases |
|--------|---------|----------------------|-----------|
| **asyncio** | Async I/O | `run()`, `create_task()`, `gather()`, `TaskGroup` | Concurrent operations, event loops |
| **typing** | Type hints | `List`, `Dict`, `Optional`, `Protocol`, `Generic`, `Self` | Type annotations, generics |
| **dataclasses** | Data structures | `@dataclass`, `field()` | Data containers, DTOs |
| **contextlib** | Context managers | `contextmanager()`, `ExitStack()` | Custom context managers |
| **itertools** | Iteration tools | `chain()`, `groupby()`, `islice()` | Iterator manipulation |
| **functools** | Functional tools | `lru_cache()`, `partial()`, `wraps()` | Memoization, decorators |
| **collections** | Data structures | `defaultdict`, `Counter`, `namedtuple` | Specialized containers |
| **pathlib** | File paths | `Path()`, `Path.read_text()` | Modern path handling |
| **logging** | Logging | `basicConfig()`, `getLogger()` | Application logging |
| **json** | JSON handling | `loads()`, `dumps()` | JSON serialization |
| **re** | Regex | `compile()`, `search()`, `sub()` | Pattern matching |
| **datetime** | Dates/times | `datetime()`, `timedelta()` | Date/time manipulation |
| **secrets** | Crypto random | `token_hex()`, `choice()` | Secure tokens |
| **hashlib** | Hashing | `sha256()`, `md5()` | Hash generation |
| **threading** | Threading | `Thread()`, `Lock()`, `Event()` | Thread management |
| **multiprocessing** | Multiprocessing | `Process()`, `Pool()`, `Queue()` | Process parallelization |
| **concurrent.futures** | Thread/process pools | `ThreadPoolExecutor`, `ProcessPoolExecutor` | Task pools |
| **tempfile** | Temporary files | `NamedTemporaryFile()`, `mkdtemp()` | Temp file handling |

**Planning Principle:** Leverage standard library before third-party packages. Python's stdlib is excellent and well-maintained.

### Async Standard Library Patterns

```python
import asyncio
from typing import AsyncIterator

# TaskGroup (3.11+) - Structured concurrency
async def fetch_multiple():
    async with asyncio.TaskGroup() as tg:
        task1 = tg.create_task(fetch_url("url1"))
        task2 = tg.create_task(fetch_url("url2"))
    # All tasks complete, errors handled as group

# Async generators
async def stream_lines(path: str) -> AsyncIterator[str]:
    async with aiofiles.open(path) as f:
        async for line in f:
            yield line.strip()

# Timeout handling (3.11+)
async with asyncio.timeout(10):
    result = await slow_operation()
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
   - Security requirements

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
| **Security** | User input, external data, network access | Input validation, parameterized queries, URL allow-lists |
| **Performance** | High throughput, low latency requirements | Early profiling, load testing, async I/O |
| **Complexity** | Multiple integrations, stateful systems | Modular design, clear boundaries |
| **Data Integrity** | Financial, critical operations | Transactions, comprehensive tests |
| **Deployment** | Multi-environment, zero-downtime | CI/CD, feature flags |

### Phase 5: Security & Pitfall Review

**Security Checklist:**
- [ ] No `eval()` or `exec()` on user input
- [ ] No `pickle.load()` from untrusted sources
- [ ] All SQL uses parameterized queries
- [ ] Subprocess avoids `shell=True`
- [ ] URLs validated before fetching (SSRF prevention)
- [ ] File paths validated (path traversal prevention)
- [ ] Secrets stored as environment variables
- [ ] Input validation and sanitization in place
- [ ] HTTPS for all network communications
- [ ] Dependencies regularly updated for vulnerabilities

**Common Pitfalls Checklist:**
- [ ] No mutable default arguments
- [ ] Closures use default arguments for value binding
- [ ] Generators documented as single-use or materialized
- [ ] No shadowing of built-in names
- [ ] `is` used only for singletons (None, True, False)
- [ ] No modification of collections while iterating
- [ ] Context managers for resource cleanup
- [ ] Type hints on all functions and classes

## Output Format

When providing Python project planning guidance, use the standard format defined in **`references/output-format.md`**.

The format includes:
- **Overview** - Project goal, type, scale, Python version
- **Project Structure** - Layout choice with directory structure
- **Architecture Pattern** - Pattern selection with module breakdown
- **Implementation Plan** - Phased breakdown with dependencies
- **Technology Stack** - Library choices with rationale
- **Testing Strategy** - Coverage targets, test types, layout
- **Security Considerations** - Risk identification and mitigation
- **Configuration** - Settings management approach
- **Risk Assessment** - Project risks with mitigation strategies
- **Next Steps** - Actionable next steps for implementation

**See `references/output-format.md` for complete output format template with customization guide.**

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
- Use context managers for resource handling
- Leverage standard library before third-party packages
- Validate and sanitize all user input
- Use parameterized queries for database access
- Plan security from the start, not as an afterthought

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

## Additional Resources

### Reference Files

- **`references/project-structures.md`** - Detailed Python project layouts with rationale
- **`references/async-patterns.md`** - Async/await patterns and pipeline designs
- **`references/architecture-patterns.md`** - Layered, hexagonal, and clean architecture patterns
- **`references/version-features.md`** - Python version-specific features and planning guidance
- **`references/type-system.md`** - Complete type system guide (Protocol, Self, TypeVar)
- **`references/patterns.md`** - Core language patterns (comprehensions, context managers, decorators)
- **`references/pitfalls.md`** - Common Python pitfalls and solutions
- **`references/security-patterns.md`** - Security best practices and common vulnerabilities
- **`references/output-format.md`** - Standard project plan output format template
- **`references/tooling.md`** - Modern Python tooling (uv, ruff, mypy, pytest)

### Example Files

- **`examples/async-pipeline.py`** - Working async data processing pipeline
- **`examples/pyproject-template.toml`** - Modern pyproject.toml template
- **`examples/project-layout.txt`** - Sample project directory structure
- **`examples/security-examples.py`** - Security patterns and anti-patterns
- **`examples/type-hints-examples.py`** - Type hints examples by Python version

## Related Skills

- **`rd2:tdd-workflow`** - Test-driven development implementation
- **`rd2:super-coder`** - Code implementation agent
- **`rd2:super-architect`** - Complex system architecture
- **`rd2:anti-hallucination`** - Verification protocol for API usage

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
