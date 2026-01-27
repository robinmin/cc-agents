# ast-grep Skill Demonstration

This demonstration shows how to use the ast-grep skill to solve real-world code search and refactoring challenges.

## Setup

We have `sample-code.js` with various JavaScript patterns. Let's use ast-grep to find and analyze them.

---

## Demo 1: Find Async Functions Without Error Handling

**User Request**: "Find all async functions that use await but don't have try-catch error handling"

### Step 1: Understand the Query
- Pattern: Async functions with await
- Requirement: NO try-catch block
- Language: JavaScript

### Step 2: Create Test Example

Already have in sample-code.js:
```javascript
async function fetchUser(userId) {
  const response = await fetch(`/api/users/${userId}`); // ❌ No try-catch
  return response.json();
}

async function fetchUserWithTryCatch(userId) {
  try {
    const response = await fetch(`/api/users/${userId}`); // ✅ Has try-catch
    return response.json();
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return null;
  }
}
```

### Step 3: Write the Rule

```yaml
# rule-async-no-error-handling.yml
id: async-no-error-handling
language: javascript
message: "Async function uses await without try-catch error handling"
severity: warning
rule:
  all:
    - kind: function_declaration
    - has:
        pattern: await $EXPR
        stopBy: end
    - not:
        has:
          pattern: try { $$$ } catch ($E) { $$$ }
          stopBy: end
```

### Step 4: Test the Rule

```bash
ast-grep scan --rule rule-async-no-error-handling.yml demo/sample-code.js
```

**Expected Output**:
```
demo/sample-code.js
  rule: async-no-error-handling

  4:async function fetchUser(userId) {
  5:  const response = await fetch(`/api/users/${userId}`);
  6:  return response.json();
  7:}

  9:async function fetchUserWithoutAwait(userId) {
  10:  return fetch(`/api/users/${userId}`);
  11:}
```

### Step 5: Apply to Codebase

```bash
# Search entire project
ast-grep scan --rule rule-async-no-error-handling.yml /path/to/project

# With JSON output for tooling
ast-grep scan --rule rule-async-no-error-handling.yml --json /path/to/project
```

---

## Demo 2: Find and Replace var with let/const

**User Request**: "Replace all 'var' declarations with 'let' in my codebase"

### Quick Pattern Search

```bash
# Find all var declarations
ast-grep run --pattern 'var $VAR = $VAL' --lang javascript demo/sample-code.js
```

**Output**:
```
demo/sample-code.js:
55:var oldStyleVar = 'should be let or const';
58:var anotherOldVar = 42;
```

### Interactive Rewrite

```bash
# Review each change before applying
ast-grep run --pattern 'var $VAR = $VAL' \
  --rewrite 'let $VAR = $VAL' \
  --lang javascript \
  --interactive demo/sample-code.js
```

**Interactive Session**:
```
demo/sample-code.js:55
- var oldStyleVar = 'should be let or const';
+ let oldStyleVar = 'should be let or const';

Accept this change? (y/n/e/q): y

demo/sample-code.js:58
- var anotherOldVar = 42;
+ let anotherOldVar = 42;

Accept this change? (y/n/e/q): y
```

### Bulk Apply (After Validation)

```bash
# Apply all changes without prompts
ast-grep run --pattern 'var $VAR = $VAL' \
  --rewrite 'let $VAR = $VAL' \
  --lang javascript \
  --update-all /path/to/project
```

---

## Demo 3: Find Console Logs Inside Class Methods

**User Request**: "Find all console.log statements inside class methods"

### Write the Rule

```yaml
# rule-console-in-class.yml
id: console-in-class
language: javascript
message: "Console.log found in class method"
rule:
  pattern: console.log($$$ARGS)
  inside:
    kind: method_definition
    stopBy: end
```

### Test with Inline Rule

```bash
ast-grep scan --inline-rules "id: console-in-class
language: javascript
rule:
  pattern: console.log(\$\$\$ARGS)
  inside:
    kind: method_definition
    stopBy: end" demo/sample-code.js
```

**Output**:
```
demo/sample-code.js:
50:    console.log('Fetching user:', id);

55:    console.log('Updating user:', id);
```

---

## Demo 4: Find Promise.all with Await Inside

**User Request**: "Find Promise.all calls that have await expressions inside them (anti-pattern)"

### Using Metavariables

```yaml
# rule-promise-all-await.yml
id: promise-all-with-await
language: javascript
message: "Promise.all contains await (use Promise without await)"
severity: error
rule:
  pattern: Promise.all($ARRAY)
  has:
    pattern: await $EXPR
    stopBy: end
```

### Test the Rule

```bash
ast-grep scan --rule rule-promise-all-await.yml demo/sample-code.js
```

**Output**:
```
demo/sample-code.js:
27:  const users = await Promise.all([
28:    await fetch('/api/users/1'),
29:    await fetch('/api/users/2'),
30:    await fetch('/api/users/3')
31:  ]);
```

---

## Demo 5: Use Metavariable Types

### Demo 5a: Single Node `$VAR`

```bash
# Find any console.log with exactly ONE argument
ast-grep run --pattern 'console.log($MSG)' --lang javascript demo/sample-code.js
```

**Matches**:
```javascript
console.log('Fetching user:', id);  // ❌ Two arguments - doesn't match
console.log(`[${level}] ${message}`, data); // ❌ Two arguments - doesn't match
```

### Demo 5b: Multiple Nodes `$$$ARGS`

```bash
# Find console.log with ANY number of arguments
ast-grep run --pattern 'console.log($$$ARGS)' --lang javascript demo/sample-code.js
```

**Matches ALL**:
```javascript
console.log('User data:', user);              // ✅ 2 args
console.log('User ID:', user.id);             // ✅ 2 args
console.log('Fetching user:', id);            // ✅ 2 args
console.log(`[${level}] ${message}`, data);   // ✅ 2 args
```

### Demo 5c: Non-Capturing `$_VAR`

```bash
# Find any function call with exactly one argument (don't care what function or argument)
ast-grep run --pattern '$_FUNC($_ARG)' --lang javascript demo/sample-code.js
```

**Matches**:
```javascript
fetch(`/api/users/${userId}`)     // ✅ Function + 1 arg
response.json()                    // ✅ Method + 0 args (matches with empty)
```

---

## Demo 6: Debugging with --debug-query

### See AST Structure

```bash
# See how ast-grep parses your pattern
ast-grep run --pattern 'async function $NAME($$$PARAMS) { $$$ }' \
  --lang javascript \
  --debug-query=pattern
```

**Output** (shows AST of pattern):
```
program [0, 0] - [0, 41]
  function_declaration [0, 0] - [0, 41]
    async [0, 0] - [0, 5]
    function [0, 6] - [0, 14]
    identifier [0, 15] - [0, 20]: $NAME
    formal_parameters [0, 20] - [0, 31]
      ( [0, 20] - [0, 21]
      [0, 21] - [0, 30]: $$$PARAMS
      ) [0, 30] - [0, 31]
    statement_block [0, 32] - [0, 41]
      { [0, 32] - [0, 33]
      [0, 34] - [0, 39]: $$$
      } [0, 40] - [0, 41]
```

### See Code Structure

```bash
# See AST of actual code
echo "async function test() { await fetch(); }" | \
  ast-grep run --pattern '$$$' \
  --lang javascript \
  --debug-query=ast \
  --stdin
```

---

## Demo 7: Using stopBy Options

### Demo 7a: stopBy: end (Complete Traversal)

```yaml
# Find await ANYWHERE inside function (deep search)
rule:
  kind: function_declaration
  has:
    pattern: await $EXPR
    stopBy: end  # Search entire subtree
```

**Matches**:
```javascript
async function fetchUser() {
  if (condition) {
    const x = await fetch(); // ✅ Found (nested in if block)
  }
}
```

### Demo 7b: stopBy: neighbor (Immediate Siblings)

```yaml
# Find import statements that directly follow another import
rule:
  pattern: import $A from '$B'
  follows:
    pattern: import $X from '$Y'
    stopBy: neighbor  # Only check immediate previous sibling
```

### Demo 7c: stopBy with Rule Object

```yaml
# Find variables but stop searching at nested functions
rule:
  pattern: $VAR
  inside:
    kind: function_declaration
    stopBy:
      kind: function_declaration  # Stop at nested function boundaries
```

---

## Demo 8: Pattern Strictness Levels

### Smart (Default)

```bash
# Skips unnamed nodes in target code
ast-grep run --pattern 'console.log($MSG)' \
  --lang javascript \
  demo/sample-code.js
```

### Signature (Flexible Function Matching)

```yaml
# Match function signature, ignore body details
pattern:
  context: function $NAME($$$PARAMS) { $$$ }
  strictness: signature
```

**Matches these as "same"**:
```javascript
function test(a, b) { return a + b; }
function test(a, b) {
  console.log('test');
  return a + b;
}
```

---

## Demo 9: Complex Multi-Condition Search

**User Request**: "Find all console methods (log/warn/error) that are NOT inside class methods"

```yaml
# rule-console-outside-class.yml
id: console-outside-class
language: javascript
rule:
  any:
    - pattern: console.log($$$)
    - pattern: console.warn($$$)
    - pattern: console.error($$$)
    - pattern: console.debug($$$)
  not:
    inside:
      kind: method_definition
      stopBy: end
```

### Test

```bash
ast-grep scan --rule rule-console-outside-class.yml demo/sample-code.js
```

**Output** (finds console calls in regular functions, NOT in class methods):
```
demo/sample-code.js:
24:  console.log('User data:', user);
25:  console.warn('This is a warning');
26:  console.error('This is an error');
28:    console.log('User ID:', user.id);
63:  console.log(`[${level}] ${message}`, data);
```

---

## Demo 10: Practical Workflow - Finding Security Issues

**User Request**: "Find all fetch calls that don't use await (missing await anti-pattern)"

### Step 1: Create Example

```javascript
// Good - using await
const data = await fetch('/api/data');

// Bad - missing await
const promise = fetch('/api/data');  // Returns promise, not data!
```

### Step 2: Write Rule

```yaml
id: fetch-without-await
language: javascript
message: "fetch() call not using await - returns Promise instead of Response"
severity: error
rule:
  pattern: fetch($URL)
  not:
    inside:
      pattern: await $$$
      stopBy: neighbor
```

### Step 3: Test

```bash
ast-grep scan --rule rule-fetch-without-await.yml demo/sample-code.js
```

### Step 4: Review Results Interactively

```bash
ast-grep scan --rule rule-fetch-without-await.yml --interactive /path/to/project
```

---

## Advanced Tips from the Skill

### Tip 1: Always Escape $ in Shell

```bash
# Wrong - shell interprets $VAR
ast-grep run --pattern "console.log($MSG)" --lang js .

# Right - escape with backslash
ast-grep run --pattern "console.log(\$MSG)" --lang js .

# Or use single quotes
ast-grep run --pattern 'console.log($MSG)' --lang js .
```

### Tip 2: Use JSON Output for Tooling

```bash
# Machine-readable output
ast-grep run --pattern 'console.log($$$)' --lang javascript --json . | jq '.[] | .file'
```

### Tip 3: Combine with Other Tools

```bash
# Find files with issues, then analyze with other tools
ast-grep run --pattern 'var $VAR = $VAL' --lang javascript --json /path/to/project \
  | jq -r '.[].file' \
  | sort -u \
  | xargs eslint
```

---

## Summary: When to Use Each Feature

| Feature | Use When | Example |
|---------|----------|---------|
| `$VAR` | Match single node | `console.log($MSG)` |
| `$$$VAR` | Match multiple nodes | `function($$$ARGS)` |
| `$$VAR` | Include unnamed nodes | `return $$VALUE` (catches `return;`) |
| `$_VAR` | Non-capturing pattern | `$_FUNC($_ARG)` any 1-arg call |
| `stopBy: end` | Deep nested search | Find await in any nested block |
| `stopBy: neighbor` | Position-specific | Check immediate siblings only |
| `pattern` | Simple matching | Direct code patterns |
| `kind` + `has` | Complex structure | "Functions containing X" |
| `all` | Multiple conditions | "A AND B AND C" |
| `any` | Alternatives | "A OR B OR C" |
| `not` | Exclusion | "A but NOT B" |
| `--interactive` | Careful refactoring | Review before applying |
| `--update-all` | Bulk changes | Apply all after validation |
| `--debug-query` | Pattern debugging | See AST structure |

---

## Resources

- SKILL.md: Main workflow and examples
- BEST_PRACTICES.md: Agent execution standards
- references/rule_reference.md: Complete rule syntax reference
- ast-grep playground: https://ast-grep.github.io/playground.html
