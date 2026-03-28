# Quality Checklist — Documentation Generation

This document defines quality criteria for rejecting generated documentation. Documentation that fails any MUST criterion is rejected.

## JSDoc Quality Criteria

### MUST Reject (Fails Generation)

| Criterion | Description | Example |
|-----------|-------------|---------|
| Generic description | Description doesn't convey specific purpose | "This function does something" |
| Empty description | No description provided | "" or missing |
| Generic class description | Class description without specific behavior | "A class that represents something" |
| Missing @param for required params | Required parameters without documentation | `/** @param x */` when `x` is required |
| Incorrect @param type | Parameter type doesn't match signature | `@param {string}` when param is `number` |
| Rejected generic templates | Any of the 8 generic templates below | See list |

### Generic Templates (MUST Reject)

These templates are too generic and MUST be rejected:

1. "This function does something"
2. "A class that represents something"
3. "Does something"
4. "Handle [something]"
5. "Process [something]"
6. "Manages [something]"
7. "This is a [something]"
8. "Function for [something]" (without specifics)

### MUST Pass (Accept Generation)

| Criterion | Description |
|-----------|-------------|
| Minimum 50 chars | Description must be at least 50 characters |
| Specific purpose | Description conveys WHAT and WHY |
| @param completeness | All parameters documented (comprehensive style) |
| @returns present | Return value documented (comprehensive style) |
| @throws for throwers | Error types documented if function throws |
| @example for public API | Example usage for exported functions |

### SHOULD Warn (Warning, Not Rejection)

| Criterion | Description |
|-----------|-------------|
| Missing @example | No usage example provided |
| Short @example | Example less than 2 lines |
| Missing @throws | Function throws but @throws not documented |
| Inconsistent naming | Parameter names don't match JSDoc @param |

## API Reference Quality Criteria

### MUST Include

| Section | Description |
|---------|-------------|
| Table of Contents | All exported symbols listed with anchor links |
| Function signature | Full TypeScript signature with types |
| Description | Purpose and behavior explanation |
| Parameters table | Name, type, required, description |
| Return type | Return value description |
| Examples | At least one usage example |

### MUST Reject

| Criterion | Description |
|-----------|-------------|
| Missing TOC | No table of contents |
| Incomplete signatures | Types replaced with "any" or missing |
| No description | Empty or placeholder description |
| Undocumented parameters | Parameters not in parameters table |

## Changelog Entry Quality Criteria

### MUST Include

| Field | Description |
|-------|-------------|
| Type | One of: feat, fix, docs, style, refactor, perf, test, chore |
| Scope | Affected module/component |
| Subject | Brief description (under 50 chars) |
| Body | Detailed description of the change |

### MUST Match

| Field | Must Match |
|-------|------------|
| Type | Derived from actual code changes |
| Scope | Actual affected module path |
| Breaking | true if any BREAKING CHANGE in diff |

### Format Requirements

- One blank line between subject and body
- Body indented or using bullet points
- Breaking changes marked with `BREAKING CHANGE:` prefix
- File list in HTML comment after body

## Integration with LLM Generation

When generating documentation, the LLM should:

1. **Before generating:** Check existing JSDoc length
2. **During generation:** Use specific templates, avoid generic language
3. **After generating:** Run quality checklist
4. **If rejected:** Log reason, retry with specific corrections

### Quality Check Script

```typescript
function isValidJSDoc(jsdoc: string, style: 'minimal' | 'comprehensive'): boolean {
    // Check minimum length
    if (jsdoc.length < 50) return false;

    // Check for generic templates
    const genericPatterns = [
        /this (function|class|method) does something/i,
        /a (class|function|interface) that represents/i,
        /^does something$/i,
        /^handle/i,
        /^process/i,
        /^manages/i,
    ];
    if (genericPatterns.some(p => p.test(jsdoc))) return false;

    // Check @param completeness for comprehensive style
    if (style === 'comprehensive') {
        // Additional comprehensive checks
    }

    return true;
}
```
