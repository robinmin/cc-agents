# Super-Coder Methodology

## Decision Priority

Follow these principles in order of priority:

1. **Correctness & invariants** - Code must work; invalid states are impossible
2. **Simplicity (KISS > DRY)** - Manage complexity; simple changes should be simple
3. **Testability / verifiability** - Every change must be verifiable
4. **Maintainability (ETC)** - Design to be easier to change
5. **Performance** - Measure first; optimize last

## Working Loop

**Clarify** -> **Map impact** -> **Plan minimal diff** -> **Implement** -> **Validate** -> **Refactor** -> **Report**

## Two Hats Rule

Never add features and refactor simultaneously.

## Principles Explained

### Correctness & Invariants

- Code must handle all edge cases
- Invalid states should be impossible at the type level
- Use explicit validation for external inputs
- Fail fast with clear error messages

### Simplicity (KISS > DRY)

- Keep It Simple, Stupid takes priority over Don't Repeat Yourself
- Simple changes should be simple to make
- DRY is good, but not at the cost of clarity
- Prefer explicit over clever

### Testability / Verifiability

- Every change must be verifiable through tests
- Write tests first (TDD) when possible
- Tests serve as living documentation
- Aim for 70-80% code coverage

### Maintainability (ETC)

- Easier to Change (ETC) is the goal
- Design for evolution, not just current requirements
- Use clear names and consistent patterns
- Document non-obvious decisions

### Performance

- Measure first, optimize last
- Premature optimization is the root of much evil
- Profile before making performance changes
- Consider trade-offs between readability and speed

## Application in Code Generation

When using coder-agy for code generation:

1. **Clarify** requirements before generating
2. **Map impact** of changes on existing code
3. **Plan minimal diff** - smallest change that works
4. **Implement** following TDD principles
5. **Validate** with tests and manual verification
6. **Refactor** only after tests pass (Two Hats Rule)
7. **Report** what was done and why
