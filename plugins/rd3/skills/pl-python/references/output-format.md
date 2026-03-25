---
name: output-format
description: "Standard planning output template for Python projects"
see_also:
  - rd3:pl-python
  - rd3:sys-developing
---

# Python Project Plan Output Format

Standard format for providing Python project planning guidance.

## Project Plan Template

Use this format when providing Python project planning guidance:

```markdown
# Python Project Plan: {Project Name}

## Overview

**Goal**: {What we're building}
**Project Type**: {Application/Library/Script}
**Scale**: {Small/Medium/Large}
**Estimated Phases**: {count}
**Python Version**: {3.11+ recommended baseline}

## Project Structure

**Layout**: {src-layout / flat-layout / custom}
{directory structure}

**Rationale**: {Why this structure}

## Architecture Pattern

**Pattern**: {Layered/Hexagonal/Clean/Event-Driven}

**Module Structure**:
- `src/domain/` - {business logic}
- `src/infrastructure/` - {external dependencies}
- `src/api/` - {interfaces}

## Async Design (if applicable)

**Pattern**: {Producer-Consumer / Task Pipeline / Batch Processing}

**Key Components**:
- {Component 1}: {responsibility}
- {Component 2}: {responsibility}

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
| Web Framework | FastAPI | 0.115+ | Async, auto docs, Pydantic |
| Database | SQLAlchemy | 2.0+ | Async ORM |
| Package Manager | uv | latest | Fast installs |
| Testing | pytest | 8.0+ | Industry standard |
| Type Checking | mypy | 1.8+ | Strict mode |
| Linting/Formatting | ruff | latest | Unified fast tooling |

## Testing Strategy

**Target Coverage**: 85%+

**Test Layers**:
- Unit tests for business logic
- Integration tests for API endpoints
- Contract tests for external services
- Property tests for edge cases (hypothesis)

## Security Considerations

**Risks Identified**:
- {Risk 1}: {Mitigation}
- {Risk 2}: {Mitigation}

**Best Practices Checklist**:
- [ ] Parameterized queries for all SQL
- [ ] Input validation on all user data
- [ ] URL allow-lists for external requests
- [ ] Secrets as environment variables only
- [ ] No eval/exec on user input
- [ ] No pickle from untrusted sources

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
2. Set up project structure with `uv init`
3. Configure ruff and mypy
4. Begin Phase 1 implementation
```

## Section Explanations

### Overview
- Clearly state the project goal and scale
- Set expectations for complexity and timeline
- Establish Python version baseline (3.11+ recommended)

### Project Structure
- Choose from: single-script, flat-layout, src-layout
- See `references/project-structures.md` for detailed options
- Provide rationale for the choice

### Architecture Pattern
- Select based on project complexity and team size
- See `references/architecture-patterns.md` for detailed patterns
- Define module boundaries and responsibilities

### Async Design
- Define async pattern (producer-consumer, pipeline, batch)
- Identify I/O boundaries and concurrency requirements
- See `references/async-patterns.md` for patterns

### Implementation Plan
- Break down into phases with clear dependencies
- Phase 1: Foundation (setup, basic structure)
- Phase 2: Core Features (main functionality)
- Phase 3: Integration & Testing (polish, validation)

### Technology Stack
- Specify libraries with version requirements
- Provide rationale for each choice
- Consider Python version compatibility
- See `references/tooling.md` for modern tooling options

### Testing Strategy
- Define coverage targets (85%+ typical)
- Specify test types (unit, integration, contract, property)
- Include testing layout recommendations
- See `references/testing-strategy.md` for detailed guidance

### Security Considerations
- Identify specific security risks
- Provide mitigation strategies
- List best practices to follow
- See `references/security-patterns.md` for comprehensive guidance

### Risk Assessment
- Identify potential blockers and risks
- Assess impact levels (High/Medium/Low)
- Provide mitigation strategies for each

## Customization Guide

### For Small Projects
- Combine phases (Foundation + Core)
- Simplify architecture pattern (Layered)
- Reduce technology stack complexity
- Skip advanced async patterns if not needed

### For Large Projects
- Add more phases (4-6 phases)
- Consider Event-Driven or Clean Architecture
- Add more detailed risk assessment
- Include performance benchmarks
- Plan for observability and monitoring

### For Libraries vs Applications
- **Libraries**: Emphasize API design, versioning, documentation
- **Applications**: Emphasize deployment, monitoring, scaling

## Related References

- `references/project-structures.md` - Detailed layout options
- `references/architecture-patterns.md` - Pattern selection guide
- `references/async-patterns.md` - Async design patterns
- `references/security-patterns.md` - Security best practices
- `references/tooling.md` - Modern Python tooling
- `references/version-features.md` - Python version planning
