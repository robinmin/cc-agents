---
name: ast-grep
description: This skill should be used when the user asks to "find async functions without error handling", "search for code patterns using AST", "structural code search", "find all classes that inherit from X", "find function calls with specific parameters", or mentions searching codebases using Abstract Syntax Tree (AST) patterns. Helps write ast-grep rules for structural code search and analysis beyond simple text search.
---

# ast-grep Code Search

## Overview

This skill helps translate natural language queries into ast-grep rules for structural code search. ast-grep uses Abstract Syntax Tree (AST) patterns to match code based on its structure rather than just text, enabling powerful and precise code search across large codebases.

## When to Use This Skill

This skill should be used when users:

- Need to search for code patterns using structural matching (e.g., "find all async functions that don't have error handling")
- Want to locate specific language constructs (e.g., "find all function calls with specific parameters")
- Request searches that require understanding code structure rather than just text
- Ask to search for code with particular AST characteristics
- Need to perform complex code queries that traditional text search cannot handle

## General Workflow

**Quick Checklist:**
- [ ] Understand query (language, pattern, edge cases)
- [ ] Create example code to match
- [ ] Write ast-grep rule (start simple)
- [ ] Test rule against example (iterate if needed)
- [ ] Apply to codebase once validated

Follow this process to help users write effective ast-grep rules:

### Step 1: Understand the Query

Clearly understand what the user wants to find. Ask clarifying questions if needed:

- What specific code pattern or structure are they looking for?
- Which programming language?
- Are there specific edge cases or variations to consider?
- What should be included or excluded from matches?

### Step 2: Create Example Code

Write a simple code snippet that represents what the user wants to match. Save this to a temporary file for testing.

**Example:**
If searching for "async functions that use await", create a test file:

```javascript
// test_example.js
async function example() {
  const result = await fetchData();
  return result;
}
```

### Step 3: Write the ast-grep Rule

Translate the pattern into an ast-grep rule. Start simple and add complexity as needed.

**Key principles:**

- Use `stopBy: end` for relational rules (`inside`, `has`) when you need complete traversal (most common)
- Use `stopBy: neighbor` when you only want to search immediate siblings
- Use `pattern` for simple structures
- Use `kind` with `has`/`inside` for complex structures
- Break complex queries into smaller sub-rules using `all`, `any`, or `not`

**Example rule file (test_rule.yml):**

```yaml
id: async-with-await
language: javascript
rule:
  kind: function_declaration
  has:
    pattern: await $EXPR
    stopBy: end
```

See `references/rule_reference.md` for comprehensive rule documentation.

### Step 4: Test the Rule

Use ast-grep CLI to verify the rule matches the example code. There are two main approaches:

**Option A: Test with inline rules (for quick iterations)**

```bash
echo "async function test() { await fetch(); }" | ast-grep scan --inline-rules "id: test
language: javascript
rule:
  kind: function_declaration
  has:
    pattern: await \$EXPR
    stopBy: end" --stdin
```

**Option B: Test with rule files (recommended for complex rules)**

```bash
ast-grep scan --rule test_rule.yml test_example.js
```

**Debugging if no matches:**

1. Simplify the rule (remove sub-rules)
2. Add `stopBy: end` to relational rules if not present
3. Use `--debug-query` to understand the AST structure (see below)
4. Check if `kind` values are correct for the language

### Step 5: Search the Codebase

Once the rule matches the example code correctly, search the actual codebase:

**For simple pattern searches:**

```bash
ast-grep run --pattern 'console.log($ARG)' --lang javascript /path/to/project
```

**For complex rule-based searches:**

```bash
ast-grep scan --rule my_rule.yml /path/to/project
```

**For inline rules (without creating files):**

```bash
ast-grep scan --inline-rules "id: my-rule
language: javascript
rule:
  pattern: \$PATTERN" /path/to/project
```

## ast-grep CLI Commands

### Inspect Code Structure (--debug-query)

Dump the AST structure to understand how code is parsed:

```bash
ast-grep run --pattern 'async function example() { await fetch(); }' \
  --lang javascript \
  --debug-query=cst
```

**Available formats:**

- `cst`: Concrete Syntax Tree (shows all nodes including punctuation)
- `ast`: Abstract Syntax Tree (shows only named nodes)
- `pattern`: Shows how ast-grep interprets your pattern
- `sexp`: S-expression format for detailed analysis

**Use this to:**

- Find the correct `kind` values for nodes
- Understand the structure of code you want to match
- Debug why patterns aren't matching

**Example:**

```bash
# See the structure of your target code
ast-grep run --pattern 'class User { constructor() {} }' \
  --lang javascript \
  --debug-query=cst

# See how ast-grep interprets your pattern
ast-grep run --pattern 'class $NAME { $$$BODY }' \
  --lang javascript \
  --debug-query=pattern
```

### Test Rules (scan with --stdin)

Test a rule against code snippet without creating files:

```bash
echo "const x = await fetch();" | ast-grep scan --inline-rules "id: test
language: javascript
rule:
  pattern: await \$EXPR" --stdin
```

**Add --json for structured output:**

```bash
echo "const x = await fetch();" | ast-grep scan --inline-rules "..." --stdin --json
```

### Search with Patterns (run)

Simple pattern-based search for single AST node matches:

```bash
# Basic pattern search
ast-grep run --pattern 'console.log($ARG)' --lang javascript .

# Search specific files
ast-grep run --pattern 'class $NAME' --lang python /path/to/project

# JSON output for programmatic use
ast-grep run --pattern 'function $NAME($$$)' --lang javascript --json .
```

**When to use:**

- Simple, single-node matches
- Quick searches without complex logic
- When you don't need relational rules (inside/has)

### Search with Rules (scan)

YAML rule-based search for complex structural queries:

```bash
# With rule file
ast-grep scan --rule my_rule.yml /path/to/project

# With inline rules
ast-grep scan --inline-rules "id: find-async
language: javascript
rule:
  kind: function_declaration
  has:
    pattern: await \$EXPR
    stopBy: end" /path/to/project

# JSON output
ast-grep scan --rule my_rule.yml --json /path/to/project

# Interactive mode - review each match before applying
ast-grep scan --rule my_rule.yml --interactive /path/to/project

# Apply all changes without confirmation
ast-grep scan --rule my_rule.yml --update-all /path/to/project
```

**When to use:**

- Complex structural searches
- Relational rules (inside, has, precedes, follows)
- Composite logic (all, any, not)
- When you need the power of full YAML rules

**Tip:** For relational rules (inside/has), use `stopBy: end` for complete traversal or `stopBy: neighbor` for immediate siblings only.

## Metavariable Types

ast-grep supports different metavariable types for flexible matching:

### Single Node: `$VAR`

Matches any single AST node:

```yaml
pattern: console.log($MSG)
# Matches: console.log('hello')
# Matches: console.log(x + 1)
# Does NOT match: console.log('a', 'b')  # two arguments
```

### Multiple Nodes: `$$$VAR`

Matches zero or more nodes (lazy matching):

```yaml
pattern: console.log($$$ARGS)
# Matches: console.log()
# Matches: console.log('hello')
# Matches: console.log('hello', 'world', '!')
```

**Note:** Multiple metavariables are lazy - they stop matching if the next node can match.

### Including Unnamed Nodes: `$$VAR`

Matches nodes including unnamed/anonymous nodes like punctuation:

```yaml
pattern: return $$VALUE
# Matches: return 123
# Matches: return;  # semicolon is unnamed node
```

### Non-Capturing: `$_VAR`

Anonymous metavariables that don't capture. Each occurrence can match different content:

```yaml
pattern: $_FUNC($_ARG)
# Matches: test(a)
# Matches: different(value)
# $_FUNC and $_ARG can be different in each match
```

**Use when:** You need the pattern structure but don't need to capture the matched values.

## Tips for Writing Effective Rules

### Understanding stopBy Options

The `stopBy` parameter controls how far relational rules search:

**`stopBy: end`** (Most Common)
- Searches entire subtree until reaching end of direction
- Use when you need complete traversal
- Example: Find await anywhere inside a function

```yaml
has:
  pattern: await $EXPR
  stopBy: end  # Search all descendants
```

**`stopBy: neighbor`**
- Searches only immediate siblings
- Stops at first non-matching node
- Use for position-specific searches

```yaml
follows:
  pattern: import $M from '$P'
  stopBy: neighbor  # Only check immediate predecessor
```

**`stopBy: <RuleObject>`**
- Stops when encountering a node matching the rule
- Advanced use for bounded searches

```yaml
has:
  pattern: $VAR
  stopBy:
    kind: function_declaration  # Stop at nested functions
```

### Pattern Strictness Levels

Control how strictly patterns match with the `strictness` option:

- `cst`: All nodes must match (most strict)
- `smart`: Default - skips unnamed nodes in target code
- `ast`: Only named AST nodes matched
- `relaxed`: Named nodes matched, ignores comments/unnamed
- `signature`: For matching function signatures flexibly

```yaml
pattern:
  context: function $NAME($$$PARAMS) { $$$ }
  strictness: signature  # Focus on signature, ignore body details
```

### Always Use stopBy: end

For relational rules, always use `stopBy: end` unless there's a specific reason not to:

```yaml
has:
  pattern: await $EXPR
  stopBy: end
```

This ensures the search traverses the entire subtree. Use `stopBy: neighbor` when you only need to check immediate siblings.

### Interactive Rewrite Workflow

For code rewrites, use interactive mode to review each change:

```bash
# Pattern-based rewrite with review
ast-grep run --pattern 'var $VAR = $VAL' \
  --rewrite 'let $VAR = $VAL' \
  --lang javascript \
  --interactive /path/to/project

# Rule-based rewrite with review
ast-grep scan --rule fix-deprecated.yml --interactive /path/to/project

# Auto-apply all changes (use with caution)
ast-grep scan --rule fix-deprecated.yml --update-all /path/to/project
```

**Interactive mode controls:**
- `y`: Accept this change
- `n`: Skip this change
- `e`: Edit the replacement
- `q`: Quit interactive session

### Escaping in Inline Rules

When using `--inline-rules`, escape metavariables in shell commands:

- Use `\$VAR` instead of `$VAR` (shell interprets `$` as variable)
- Or use single quotes: `'$VAR'` works in most shells

**Example:**

```bash
# Correct: escaped $
ast-grep scan --inline-rules "rule: {pattern: 'console.log(\$ARG)'}" .

# Or use single quotes
ast-grep scan --inline-rules 'rule: {pattern: "console.log($ARG)"}' .
```

## Common Use Cases

### Find Functions with Specific Content

Find async functions that use await:

```bash
ast-grep scan --inline-rules "id: async-await
language: javascript
rule:
  all:
    - kind: function_declaration
    - has:
        pattern: await \$EXPR
        stopBy: end" /path/to/project
```

### Find Code Inside Specific Contexts

Find console.log inside class methods:

```bash
ast-grep scan --inline-rules "id: console-in-class
language: javascript
rule:
  pattern: console.log(\$\$\$)
  inside:
    kind: method_definition
    stopBy: end" /path/to/project
```

### Find Code Missing Expected Patterns

Find async functions without try-catch:

```bash
ast-grep scan --inline-rules "id: async-no-trycatch
language: javascript
rule:
  all:
    - kind: function_declaration
    - has:
        pattern: await \$EXPR
        stopBy: end
    - not:
        has:
          pattern: try { \$\$\$ } catch (\$E) { \$\$\$ }
          stopBy: end" /path/to/project
```

### Use Non-Capturing Variables for Flexible Patterns

Match function calls with any single argument without capturing:

```bash
ast-grep run --pattern '$_FUNC($_ARG)' --lang javascript /path/to/project
# Matches any single-argument function call
# $_FUNC and $_ARG don't capture, so each match can differ
```

### Match Variable Arguments with Ellipsis

Find functions with any number of arguments:

```bash
ast-grep run --pattern 'logger($$$ARGS)' --lang javascript /path/to/project
# Matches: logger()
# Matches: logger('info')
# Matches: logger('error', 'message', data)
```

## Resources

### references/

Contains detailed documentation for ast-grep rule syntax:

- `rule_reference.md`: Comprehensive ast-grep rule documentation covering atomic rules, relational rules, composite rules, and metavariables
- `best_practices.md`: CLI execution standards, pattern discovery, refactoring workflow, and common pitfalls

Load these references when detailed rule syntax information is needed.

### examples/

Contains working example rules for common use cases:

- `async-await.yml`: Example rule to find async functions with await expressions
- `console-in-class.yml`: Example rule to find console.log inside class methods

Use these examples as starting points for building custom rules.