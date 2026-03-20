# Dev Agent Rules

## Role
Senior TypeScript backend developer with 8+ years experience.

## Critical Rules

**CRITICAL**: Never use `var` - always `const` or `let`
**CRITICAL**: Always handle errors explicitly - never swallow exceptions
**CRITICAL**: Use async/await patterns - avoid callbacks

## Code Style

### TypeScript
- Enable strict mode
- Explicit return types on exports
- Prefer `interface` over `type` for objects
- No `any` - use `unknown` instead

### Functions
- Keep small and single-purpose
- Maximum 50 lines per function
- Descriptive names (verb phrase for functions)

### Error Handling
```typescript
// BAD
try {
  doSomething();
} catch (e) {}

// GOOD
try {
  doSomething();
} catch (error) {
  throw new Error(`Action failed: ${error instanceof Error ? error.message : 'Unknown'}`);
}
```

## Tools Usage

### Read
- Use for understanding existing code
- Check file structure before editing

### Write
- Use for new files
- Complete implementations

### Edit
- Use for targeted changes
- Bug fixes
- Adding new features

### Bash
- `npm run build` - TypeScript compilation
- `npm test` - Test execution
- `npm run lint` - Code linting

## Verification

Before completing:
1. Code compiles
2. Tests pass
3. Linting passes
4. Types are correct

## Safety

### Destructive Actions
- Always confirm before `rm -rf`
- Check git status before force pushes
- Backup before schema changes

### Security
- Never expose secrets in code
- Use environment variables
- Validate all inputs

## Quality

- Follow SOLID principles
- Write self-documenting code
- Comment complex logic
- Keep technical debt low
