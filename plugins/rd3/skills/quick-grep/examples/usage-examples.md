# Usage Examples

## ripgrep (rg) Examples

### Find literal strings
```bash
# Find all TODO comments
rg "TODO" -n

# Find specific variable name
rg "userName" -n -t typescript

# Find in config files only
rg "debug" -g "*.json" -g "*.yaml"
```

### Count occurrences
```bash
# Count function calls
rg "console\.log" --count

# List files with matches
rg "TODO" -l
```

## ast-grep (sg) Examples

### Find code structure
```bash
# Find all async functions
sg run --pattern 'async function $F() { $$$ }' --lang javascript

# Find classes inheriting from a base type
sg run --pattern 'class $NAME extends $BASE { $$$ }' --lang typescript

# Find promise chains without catch
sg run --pattern '$P.then($CB)' --lang javascript
```

### Using pre-built rules
```bash
# Find console.log calls
sg scan --rule references/rules/console-log.yml

# Find hardcoded secrets
sg scan --rule references/rules/hardcoded-secret.yml

# Find async without try-catch
sg scan --rule references/rules/async-no-trycatch.yml
```

The bundled rule files are detection rules. Each one contains JavaScript and TypeScript variants, so a single `sg scan --rule ...` command works for both languages.

### Rewrite with ast-grep
```bash
# Interactive rewrite
sg run --pattern 'console.log($$$)' --rewrite 'logger.log($$$)' --lang javascript --interactive

# Preview files before writing changes
sg scan --rule references/rules/console-log.yml --files-with-matches
```

## Decision Tree Applied

| Query | Decision | Tool |
|-------|----------|------|
| "find all console.log calls" | text/string | `rg "console\.log"` |
| "find all async functions" | structure | `sg run --pattern 'async function $F()' --lang javascript` |
| "find TODO in markdown" | text + non-code | `rg "TODO" -g "*.md"` |
| "replace console.log with logger" | rewrite | `sg run --pattern 'console.log($$$)' --rewrite 'logger.log($$$)' --lang javascript` |
| "count test files" | quick scan | `rg --files -g '*.{test,spec}.{js,jsx,ts,tsx}' \| wc -l` |
