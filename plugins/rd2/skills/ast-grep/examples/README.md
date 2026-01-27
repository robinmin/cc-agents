# ast-grep Skill - Live Demonstration

This directory contains a complete, working demonstration of the ast-grep skill.

## 📁 What's Inside

```
demo/
├── README.md              # This file
├── QUICKSTART.md          # 5-minute quick start guide
├── DEMO.md                # 10 detailed demonstrations
├── sample-code.js         # Example JavaScript code with patterns
└── rules/                 # Pre-built rule files
    ├── async-no-error-handling.yml
    ├── promise-all-with-await.yml
    └── console-in-production.yml
```

## 🚀 Quick Start (30 seconds)

```bash
# 1. Navigate to demo directory (from project root)
cd plugins/rd2/skills/ast-grep/demo

# 2. Run a simple search
ast-grep run --pattern 'console.log($$$)' --lang javascript sample-code.js

# 3. Try a rule
ast-grep scan --rule rules/async-no-error-handling.yml sample-code.js
```

## ✅ Verified Examples

All examples below have been **tested and work** with the included `sample-code.js`:

### Example 1: Find Console Statements
```bash
ast-grep run --pattern 'console.log($$$)' --lang javascript sample-code.js
```
**Result**: ✅ Found 5 console.log statements in sample-code.js

### Example 2: Find Async Functions Without Error Handling
```bash
ast-grep scan --rule rules/async-no-error-handling.yml sample-code.js
```
**Result**: ✅ Found 2 async functions without try-catch blocks

### Example 3: Find Promise.all Anti-Pattern
```bash
ast-grep scan --rule rules/promise-all-with-await.yml sample-code.js
```
**Result**: ✅ Found 1 Promise.all with await inside (line 36-40)

## 📖 Documentation Files

### 1. QUICKSTART.md (Start Here!)
- **Time**: 5 minutes
- **Content**: Minimal examples to get started
- **Best for**: First-time users

### 2. DEMO.md (Comprehensive Guide)
- **Time**: 30-60 minutes
- **Content**: 10 detailed demonstrations covering:
  - Finding async functions without error handling
  - Interactive refactoring (var → let)
  - Finding console logs in class methods
  - Promise.all anti-patterns
  - All metavariable types ($VAR, $$VAR, $$$VAR, $_VAR)
  - Debugging with --debug-query
  - stopBy options (end, neighbor, rule object)
  - Pattern strictness levels
  - Complex multi-condition searches
  - Security issue detection
- **Best for**: Learning all features

### 3. Rule Files (Ready to Use)
Pre-built YAML rules you can use immediately:

- **async-no-error-handling.yml**: Finds async functions without try-catch
- **promise-all-with-await.yml**: Detects Promise.all anti-pattern
- **console-in-production.yml**: Flags console statements for production

## 🎯 Learning Path

```
1. QUICKSTART.md (5 min)
   ↓
2. Run examples yourself (10 min)
   ↓
3. Read DEMO.md examples (30 min)
   ↓
4. Try on your own code (∞)
```

## 🔍 What You'll Learn

### Metavariable Types
- `$VAR` - Single node matching
- `$$VAR` - Including unnamed nodes (punctuation)
- `$$$VAR` - Multiple nodes (zero or more)
- `$_VAR` - Non-capturing/anonymous variables

### Search Strategies
- **Pattern-based**: Simple code patterns
- **Rule-based**: Complex YAML rules with logic
- **Relational**: inside, has, follows, precedes
- **Composite**: all, any, not combinations

### Practical Workflows
- Finding security issues
- Code quality audits
- Refactoring assistance
- Migration tasks
- Anti-pattern detection

## 💻 Running the Demos

### Prerequisites
```bash
# Install ast-grep (choose one)
brew install ast-grep
npm install -g @ast-grep/cli
cargo install ast-grep
```

### Verify Installation
```bash
ast-grep --version
# Should output version number
```

### Run All Rule Checks
```bash
# Check all rules against sample code
ast-grep scan --rule rules/ sample-code.js
```

## 📊 Expected Output

When you run the full scan, you should see:

```
warning[async-no-error-handling]: 2 warnings
  - fetchUser (line 4)
  - loadMultipleUsers (line 35)

error[promise-all-with-await]: 1 error
  - loadMultipleUsers (line 36)

warning[console-in-production]: 5 warnings
  - Various console statements
```

## 🛠️ Customization

### Create Your Own Rule

1. Copy an existing rule:
```bash
cp rules/async-no-error-handling.yml rules/my-custom-rule.yml
```

2. Edit the rule:
```yaml
id: my-custom-rule
language: javascript
message: "Your custom message"
rule:
  pattern: your_pattern_here
```

3. Test it:
```bash
ast-grep scan --rule rules/my-custom-rule.yml sample-code.js
```

## 🔗 Integration Examples

### CI/CD Pipeline
```yaml
# .github/workflows/code-quality.yml
- name: Run ast-grep checks
  run: |
    ast-grep scan --rule rules/ --json src/ > ast-grep-report.json
    if [ $? -ne 0 ]; then
      echo "Code quality issues found!"
      exit 1
    fi
```

### Pre-commit Hook
```bash
#!/bin/bash
# .git/hooks/pre-commit
ast-grep scan --rule rules/ --json $(git diff --cached --name-only)
if [ $? -ne 0 ]; then
  echo "Please fix ast-grep issues before committing"
  exit 1
fi
```

### Package.json Script
```json
{
  "scripts": {
    "lint:ast": "ast-grep scan --rule rules/ src/",
    "lint:ast:fix": "ast-grep scan --rule rules/ --update-all src/"
  }
}
```

## 📚 Additional Resources

### In This Skill
- `../SKILL.md` - Complete workflow guide
- `../BEST_PRACTICES.md` - Agent execution standards
- `../references/rule_reference.md` - Full syntax reference

### External Links
- [ast-grep Official Docs](https://ast-grep.github.io)
- [ast-grep Playground](https://ast-grep.github.io/playground.html)
- [GitHub Repository](https://github.com/ast-grep/ast-grep)

## 🤝 Contributing

Found a useful pattern? Create a new rule and share it!

```bash
# Add your rule
vim rules/my-pattern.yml

# Test it
ast-grep scan --rule rules/my-pattern.yml sample-code.js

# Share with team
git add rules/my-pattern.yml
git commit -m "Add rule for detecting [pattern]"
```

## ⚡ Quick Reference

### Most Used Commands
```bash
# Simple pattern search
ast-grep run --pattern 'PATTERN' --lang LANG file.ext

# Rule-based search
ast-grep scan --rule rule.yml file.ext

# Interactive refactoring
ast-grep run --pattern 'OLD' --rewrite 'NEW' --interactive file.ext

# Debug pattern
ast-grep run --pattern 'PATTERN' --debug-query=ast --lang LANG
```

### Most Used Metavariables
```bash
$VAR       # Single node
$$$ARGS    # Multiple nodes
$_UNUSED   # Non-capturing
```

### Most Used Rule Patterns
```yaml
# Find code with specific content
rule:
  kind: function_declaration
  has:
    pattern: await $EXPR
    stopBy: end

# Find code inside context
rule:
  pattern: console.log($$$)
  inside:
    kind: method_definition
    stopBy: end

# Find with multiple conditions
rule:
  all:
    - pattern: async function $NAME() { $$$ }
    - has:
        pattern: await $EXPR
        stopBy: end
    - not:
        has:
          pattern: try { $$$ } catch { $$$ }
          stopBy: end
```

## 💡 Tips

1. **Start simple**: Use `--pattern` before writing complex rules
2. **Test incrementally**: Add one condition at a time
3. **Use --debug-query**: When patterns don't match as expected
4. **Use --interactive**: For safe refactoring
5. **Save successful rules**: Build your rule library over time

## 🎉 Success Stories

After using this demo, you'll be able to:

- ✅ Find complex code patterns structurally
- ✅ Detect anti-patterns and security issues
- ✅ Refactor code safely with interactive mode
- ✅ Write custom rules for your team's needs
- ✅ Integrate ast-grep into your workflow

Happy ast-grepping! 🚀
