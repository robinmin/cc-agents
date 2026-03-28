# Documentation Templates

This document contains templates for generating JSDoc, API references, and changelog entries.

## JSDoc Templates

### Minimal JSDoc (style: minimal)

```typescript
/**
 * {brief description}
 * @param {paramType} paramName - {description}
 * @returns {returnType}
 */
```

### Comprehensive JSDoc (style: comprehensive)

```typescript
/**
 * {detailed description explaining purpose, behavior, and side effects}
 * 
 * {additional context that helps future maintainers understand intent}
 * 
 * @param {paramType} paramName - {description of parameter and its role}
 * @param {paramType} optionalParam - {description} (optional)
 * @returns {returnType} - {description of return value}
 * @throws {ErrorType} - {description of when this error is thrown}
 * @example
 * ```typescript
 * // Setup
 * const result = {functionName}({example input});
 * 
 * // Verification
 * expect(result).toBe({expected output});
 * ```
 */
```

### Class JSDoc

```typescript
/**
 * {className} - {brief one-line description}
 * 
 * {detailed description of class purpose and usage}
 * 
 * @example
 * ```typescript
 * const instance = new {className}({constructorParams});
 * ```
 */
```

### Type/Interface JSDoc

```typescript
/**
 * {TypeName} - {brief description}
 * 
 * {detailed description of type purpose and usage}
 * 
 * @example
 * ```typescript
 * const value: {typeName} = {example};
 * ```
 */
```

## API Reference Templates

### Function API Section

```markdown
### {functionName}

\`\`\`typescript
function {functionName}({param1}: {param1Type}, {param2}?: {param2Type}): {returnType}
\`\`\`

{description}

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `param1` | `{param1Type}` | Yes | {description} |
| `param2` | `{param2Type}` | No | {description} |

**Returns:** {description of return value}

**Throws:**

| Error | Condition |
|-------|-----------|
| `{ErrorType}` | {when thrown} |

**Example:**
\`\`\`typescript
{usage example}
\`\`\`
```

### Class API Section

```markdown
### {ClassName}

**Kind:** class

{description}

### Constructor

\`\`\`typescript
new {ClassName}({params})
\`\`\`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `param1` | `{param1Type}` | Yes | {description} |

### Properties

| Name | Type | Description |
|------|------|-------------|
| `property1` | `{type}` | {description} |

### Methods

#### {methodName}

\`\`\`typescript
{methodSignature}
\`\`\`

{description}

**Parameters:** See Function API Section

**Returns:** {description}
```

### Type/Interface API Section

```markdown
### {TypeName}

**Kind:** {type|interface}

\`\`\`typescript
type {TypeName} = {definition};
\`\`\`

{description}

**Properties:**

| Name | Type | Description |
|------|------|-------------|
| `prop1` | `{type}` | {description} |
```

## Changelog Entry Template

### Conventional Changelog Format

```markdown
## {version} ({date})

### {type}({scope}): {subject}

{description of change in 2-3 sentences}

{if breaking changes}
BREAKING CHANGE: {description of breaking change and migration path}
{/if}

<!-- 
Affected files:
{file1}
{file2}
-->
```

### Change Types

| Type | Use When |
|------|----------|
| `feat` | New feature added |
| `fix` | Bug fix |
| `docs` | Documentation only changes |
| `style` | Formatting, white-space (no code change) |
| `refactor` | Code change that neither fixes bug nor adds feature |
| `perf` | Performance improvement |
| `test` | Adding or correcting tests |
| `chore` | Maintenance tasks, dependency updates |

### Scope Extraction

Extract scope from affected module/component name:
- File path: `src/api/user.ts` → scope: `api/user`
- Feature: `src/auth/oauth.ts` → scope: `auth/oauth`
- Component: `ui/Button.tsx` → scope: `ui/button`
