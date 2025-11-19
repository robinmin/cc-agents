# ast-grep Skill Quick Start Guide

## 🚀 Try It Now - 5 Minute Demo

### Prerequisites
```bash
# Install ast-grep if you haven't already
brew install ast-grep
# or
npm install -g @ast-grep/cli
```

### Quick Test (30 seconds)

```bash
# Navigate to demo folder
cd /Users/robin/projects/cc-agents/plugins/rd/skills/ast-grep/demo

# 1. Find all console.log statements
ast-grep run --pattern 'console.log($$$)' --lang javascript sample-code.js

# 2. Find async functions with await
ast-grep run --pattern 'async function $NAME($$$) { $$$ }' \
  --lang javascript sample-code.js
```

---

## 📖 Example Workflows

### Workflow 1: Find Security Issues (2 minutes)

**Find Promise.all with await inside (anti-pattern)**

```bash
# Run the rule
ast-grep scan --rule rules/promise-all-with-await.yml sample-code.js

# Expected: Finds line 27-31 with the anti-pattern
```

**Why is this bad?**
```javascript
// ❌ Bad - awaits resolve sequentially, defeating Promise.all purpose
await Promise.all([
  await fetch('/1'),  // Waits for this
  await fetch('/2'),  // Then waits for this
]);

// ✅ Good - all fetch in parallel
await Promise.all([
  fetch('/1'),  // Starts immediately
  fetch('/2'),  // Starts immediately
]);
```

---

### Workflow 2: Find Missing Error Handling (3 minutes)

```bash
# Find async functions without try-catch
ast-grep scan --rule rules/async-no-error-handling.yml sample-code.js
```

**Output**:
```
sample-code.js:4 - fetchUser (no error handling)
sample-code.js:9 - fetchUserWithoutAwait (no error handling)
```

**Fix Example**:
```javascript
// Before
async function fetchUser(userId) {
  const response = await fetch(`/api/users/${userId}`);
  return response.json();
}

// After
async function fetchUser(userId) {
  try {
    const response = await fetch(`/api/users/${userId}`);
    return response.json();
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw error;
  }
}
```

---

### Workflow 3: Interactive Refactoring (3 minutes)

**Replace var with let interactively**

```bash
# Review each change before applying
ast-grep run --pattern 'var $VAR = $VAL' \
  --rewrite 'let $VAR = $VAL' \
  --lang javascript \
  --interactive sample-code.js
```

**Interactive prompts**:
```
sample-code.js:55
- var oldStyleVar = 'should be let or const';
+ let oldStyleVar = 'should be let or const';

Accept this change? (y/n/e/q): y
✓ Change applied

sample-code.js:58
- var anotherOldVar = 42;
+ let anotherOldVar = 42;

Accept this change? (y/n/e/q): y
✓ Change applied
```

---

### Workflow 4: Understanding Metavariables (2 minutes)

**Compare different metavariable types**

```bash
# $VAR - Single node (exactly one argument)
echo "console.log('hello')" | \
  ast-grep run --pattern 'console.log($MSG)' --lang javascript --stdin
# Result: ✅ Matches

echo "console.log('hello', 'world')" | \
  ast-grep run --pattern 'console.log($MSG)' --lang javascript --stdin
# Result: ❌ Doesn't match (two arguments)

# $$$VAR - Multiple nodes (any number of arguments)
echo "console.log('hello', 'world')" | \
  ast-grep run --pattern 'console.log($$$ARGS)' --lang javascript --stdin
# Result: ✅ Matches

# $_VAR - Non-capturing (flexible matching)
echo "test(123)" | \
  ast-grep run --pattern '$_FUNC($_ARG)' --lang javascript --stdin
# Result: ✅ Matches any function with one arg
```

---

## 🎯 Common Use Cases

### Use Case 1: Code Quality Audit

```bash
# Find all files with console statements
ast-grep run --pattern 'console.log($$$)' \
  --lang javascript \
  --json . \
  | jq -r '.[].file' \
  | sort -u
```

### Use Case 2: Migration Tasks

```bash
# Replace old API with new API
ast-grep run --pattern 'oldFunction($$$ARGS)' \
  --rewrite 'newFunction($$$ARGS)' \
  --lang javascript \
  --interactive /path/to/project
```

### Use Case 3: Find Anti-Patterns

```bash
# Find all rules in directory
ast-grep scan --rule rules/ sample-code.js

# Output format for CI/CD
ast-grep scan --rule rules/ --json /path/to/project > report.json
```

---

## 🔧 Debugging Tips

### Tip 1: See the AST

```bash
# Understand how code is parsed
ast-grep run --pattern 'async function $NAME() { $$$ }' \
  --lang javascript \
  --debug-query=ast
```

### Tip 2: Test Patterns Quickly

```bash
# Use echo to test patterns
echo "const x = await fetch();" | \
  ast-grep run --pattern 'await $EXPR' --lang javascript --stdin
```

### Tip 3: Check Your Rule

```bash
# See how ast-grep interprets your pattern
ast-grep run --pattern 'console.log($MSG)' \
  --lang javascript \
  --debug-query=pattern
```

---

## 📚 Learning Path

1. **Start Here** (5 min): Run the Quick Test above
2. **Try Examples** (15 min): Work through Workflows 1-4
3. **Read DEMO.md** (20 min): See all 10 detailed demos
4. **Read SKILL.md** (30 min): Understand the full workflow
5. **Practice** (ongoing): Use on your own codebase

---

## 🆘 Troubleshooting

### Problem: Pattern doesn't match

**Solution**: Use `--debug-query` to see the AST
```bash
ast-grep run --pattern 'YOUR_PATTERN' \
  --lang javascript \
  --debug-query=ast \
  sample-code.js
```

### Problem: Too many matches

**Solution**: Add constraints with `kind` or relational rules
```yaml
# Instead of just pattern
pattern: console.log($$$)

# Add constraints
rule:
  pattern: console.log($$$)
  inside:
    kind: method_definition
    stopBy: end
```

### Problem: Shell interprets $VAR

**Solution**: Escape with backslash or use single quotes
```bash
# Wrong
ast-grep run --pattern "console.log($MSG)"

# Right - escaped
ast-grep run --pattern "console.log(\$MSG)"

# Right - single quotes
ast-grep run --pattern 'console.log($MSG)'
```

---

## 🎓 Next Steps

1. **Create your own rules**: Copy from `rules/` and modify
2. **Test on real code**: Run against your projects
3. **Share findings**: Report anti-patterns you discover
4. **Automate**: Add to CI/CD pipeline

```bash
# Example CI/CD integration
ast-grep scan --rule rules/ --json src/ > ast-grep-report.json
if [ $? -ne 0 ]; then
  echo "ast-grep found issues!"
  exit 1
fi
```

---

## 📖 Reference

- **DEMO.md**: 10 detailed demonstrations
- **SKILL.md**: Complete workflow guide
- **BEST_PRACTICES.md**: Agent execution standards
- **references/rule_reference.md**: Full syntax reference
- **ast-grep docs**: https://ast-grep.github.io

---

## 💡 Pro Tips

1. **Always test rules on small files first**
2. **Use `--interactive` for refactoring**
3. **Use `--json` for tooling integration**
4. **Save successful rules for reuse**
5. **Combine with other tools** (eslint, prettier, jq)

Happy ast-grepping! 🎉
