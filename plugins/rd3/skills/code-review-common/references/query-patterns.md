---
name: code-review-query-patterns
description: "Effective code search patterns for discovery and analysis phases of code review"
see_also:
  - rd3:code-review-common
  - rd3:quick-grep
---

# Code Review Query Patterns

Effective patterns for discovering and analyzing code during review using Glob, Grep, and structural analysis.

## Tool Selection Guide

| Goal | Primary Tool | Approach |
|------|--------------|----------|
| Find files by pattern | Glob | `src/**/*.ts` |
| Search for code patterns | Grep | `query.*user` |
| Understand specific file | Read | Read implementation |
| Cross-reference usage | Grep | `function_name\(` |
| Map module structure | Glob + Grep | Find entry points |

## Discovery Patterns

### Pattern 1: Scope Definition

```bash
# Step 1: Find all files in scope
Glob: "src/**/*.ts"
Glob: "src/**/*.py"

# Step 2: Find entry points
Glob: "*/main.*"
Glob: "*/app.*"
Glob: "*/index.*"

# Step 3: Find test files
Glob: "**/*.test.ts"
Glob: "**/*.spec.ts"
```

### Pattern 2: Progressive Filtering

```bash
# Start broad, then narrow
Glob: "src/**/*.ts"           # All TypeScript files
Grep: "class.*Controller"    # Find controllers
Grep: "@.*decorator"         # Find decorators
Read: src/auth/controller.ts # Read specific file
```

### Pattern 3: Search Before Reading

```bash
# Find pattern first
Grep: "password.*=.*request\."
Grep: "SELECT.*FROM.*user"

# Then read only matching files
Read: src/auth/login.ts
Read: src/api/users.ts
```

## Security Pattern Detection

### SQL Injection

```bash
# Raw SQL queries (vulnerable)
Grep: "SELECT.*FROM.*%s"
Grep: "query.*format.*%s"
Grep: "execute.*\\+.*user"
Grep: "f\".*SELECT.*{.*}\""

# Check for parameterized (safe)
Grep: "cursor.execute.*\\?"   # Good - parameterized
Grep: "db\.query.*\?"         # Good - parameterized
```

### Authentication Issues

```bash
# Password handling
Grep: "password.*=.*request"
Grep: "hash.*password"
Grep: "verify.*password"
Grep: "bcrypt"
Grep: "argon2"

# JWT handling
Grep: "jwt\.encode"
Grep: "jwt\.decode"
Grep: "secret.*="
Grep: "sign\(.*hmac"

# Session management
Grep: "session.*="
Grep: "req\.session"
Grep: "cookie.*secure"
```

### Input Validation

```bash
# Missing validation
Grep: "request\.json\["   # Direct JSON access
Grep: "request\.args\["   # Direct args access
Grep: "req\.body\."       # Direct body access

# Validation present
Grep: "@validate"
Grep: "@schema"
Grep: " Joi\."
Grep: "zod\."
Grep: "class-validator"
```

### Data Exposure

```bash
# Sensitive data in logs
Grep: "console\.log.*password"
Grep: "console\.log.*token"
Grep: "logger\.info.*secret"
Grep: "logger\.debug.*api_key"

# Secrets in code (bad)
Grep: "api_key.*=.*\""
Grep: "secret.*=.*\""
Grep: "password.*=.*\""
Grep: "AWS_ACCESS_KEY"
Grep: "PRIVATE_KEY"
```

### Command Injection

```bash
# Vulnerable subprocess
Grep: "subprocess.*shell=True"
Grep: "exec\("
Grep: "spawn.*shell"
Grep: "os\.system"

# Safe alternatives
Grep: "subprocess.*shell=False"
Grep: "execFile\("
```

## Performance Pattern Detection

### N+1 Query Pattern

```bash
# Query inside loop (vulnerable)
Grep: "for.*in.*:\\s*query\\("
Grep: "for.*in.*:\\s*session\.execute"
Grep: "for.*in.*:\\s*db\.query"
Grep: "\\.forEach.*query"

# Eager loading (safe)
Grep: "include:.*relation"
Grep: "joinedload\("
Grep: "preload\("
Grep: "eager.*:"
```

### Inefficient Loops

```bash
# Nested loops
Grep: "for.*in.*:\\s*for.*in"

# Expensive operations in loop
Grep: "for.*in.*:\\s*\\.query\\("
Grep: "for.*in.*:\\s*requests\.get"
Grep: "for.*in.*:\\s*fetch\("

# Map over items (often better)
Grep: "\\.map.*query"   # Query per item
```

### Caching Opportunities

```bash
# Repeated computation
Grep: "function.*\\(.*\\).*\\{.*query.*\\}"  # Func querying every call
Grep: "useEffect.*\\[.*\\].*fetch"          # React fetching without memo

# Caching present
Grep: "@cache"
Grep: "@lru_cache"
Grep: "cache\.get"
Grep: "memoize"
Grep: "useMemo"
```

### Memory Issues

```bash
# Loading large data
Grep: "readFile.*\\.toString"   # Loading entire file
Grep: "\\.split\\(\\)\\)"        # Creating large arrays
Grep: "JSON\.parse.*\\.toString"  # Parsing large JSON

# Streaming (safe)
Grep: "createReadStream"
Grep: "\\.pipe\\("
Grep: "stream\\."
```

## Correctness Pattern Detection

### Logic Errors

```bash
# Off-by-one
Grep: "i <= .*\\.length"     # Should be i <
Grep: "i > .*\\.length"      # Should be i >=
Grep: "\\.slice\\(0, \\.length\\)"  # Redundant

# Wrong operators
Grep: "\\|\\|.*isAdmin"      # Should be &&
Grep: "&&.*!user"            # Potential logic error

# Null/undefined issues
Grep: "\\.\.property"        # Missing optional chaining
Grep: "\\|\\|.*default"     # Null coalescing for defaults
```

### Error Handling

```bash
# Silent failures (bad)
Grep: "except.*pass"
Grep: "catch \\{ \\}"
Grep: "} catch { }"
Grep: "try.*{.*}.*catch"

# Proper error handling (good)
Grep: "catch.*error.*log"
Grep: "throw.*Error"
Grep: "logger\.error"
```

### Type Issues

```bash
# Type assertions without checks
Grep: "\\(.*\\.as.*\\)"
Grep: "\\<.*\\>.*variable"

# Any types (suspicious)
Grep: ": any"
Grep: "\\: Any"
Grep: "\\! as"

# Proper typing
Grep: ": string"
Grep: ": number"
Grep: ": boolean"
```

## Maintainability Pattern Detection

### Complexity

```bash
# Deep nesting (bad)
Grep: "\\s{12,}if"   # 3+ levels
Grep: "\\s{16,}for"  # 4+ levels

# Long lines (bad)
Grep: "^.{120,}$"     # Lines > 120 chars

# Complexity indicators
Grep: "switch.*\\(.*\\).*\\{"  # Complex switch
Grep: "\\?\\?.*\\?\\?"          # Nested ternaries
```

### Code Duplication

```bash
# Similar function names
Grep: "def get_.*user"
Grep: "def find_.*user"
Grep: "def fetch_.*user"

# Identical patterns
Grep: "try.*{.*query.*}.*catch"  # Same error handling
Grep: "if.*null.*throw"           # Same null check pattern
```

### Magic Numbers

```bash
# Hardcoded numbers
Grep: "=.*[0-9]{2,}"   # Numbers > 9
Grep: "==.*[0-9]+"     # Number comparisons
Grep: "> 1000"          # Specific thresholds

# Constants defined
Grep: "const.*MAX_"
Grep: "const.*TIMEOUT"
Grep: "enum.*"
```

### Coupling

```bash
# Tight coupling
Grep: "new \\w+Service"    # Direct instantiation
Grep: "new \\w+Repository"  # Direct repository

# Dependency injection (good)
Grep: "@Injectable"
Grep: "constructor.*:\\s*\\w+Service"
Grep: "private readonly"
```

## Architecture Patterns

### Dependency Mapping

```bash
# Find all imports
Grep: "from.*import"
Grep: "^import "

# Map module dependencies
Grep: "from.*auth.*import"
Grep: "from.*database.*import"
Grep: "from.*api.*import"
```

### Class Relationships

```bash
# Inheritance
Grep: "extends \\w+"
Grep: "class.*extends"

# Interface implementation
Grep: "implements \\w+"
Grep: "class.*implements"

# Composition
Grep: "private \\w+: \\w+"
Grep: "this\\.\\w+ = \\w+"
```

### Design Patterns

```bash
# Factory
Grep: "class.*Factory"
Grep: "create\\w+\\(\\)"

# Singleton
Grep: "_instance.*=.*None"
Grep: "getInstance\\(\\)"

# Repository
Grep: "class.*Repository"
Grep: "findAll\\(\\)"
Grep: "findById\\(\\)"
```

## Effective Query Sequences

### Sequence 1: Security Review

```bash
# Step 1: Find sensitive operations
Grep: "password"
Grep: "token"
Grep: "secret"
Grep: "auth"

# Step 2: Check for vulnerabilities
Grep: "execute.*%s"
Grep: "eval\\("
Grep: "exec\\("
Grep: "innerHTML.*"

# Step 3: Read sensitive files
Read: auth.ts
Read: security.ts
```

### Sequence 2: Performance Review

```bash
# Step 1: Find database operations
Grep: "query\\("
Grep: "SELECT"
Grep: "INSERT"
Grep: "UPDATE"

# Step 2: Check for N+1
Grep: "for.*in.*:\\s*query"
Grep: "\\.forEach.*query"

# Step 3: Check indexing
Grep: "CREATE TABLE"
Grep: "ForeignKey"
Grep: "index\\s"
```

### Sequence 3: Logic Review

```bash
# Step 1: Find error handling
Grep: "throw.*Error"
Grep: "catch"
Grep: "if.*null"

# Step 2: Find edge cases
Grep: "\\[0\\]"
Grep: "\\.length"
Grep: "undefined"

# Step 3: Trace logic paths
Read: handler.ts
```

## Best Practices

1. **Start with Glob** to define scope
2. **Use Grep** to find relevant patterns
3. **Read selectively** — only files that matter
4. **Iterate** — refine queries based on findings
5. **Be specific** — use precise regex patterns
6. **Combine tools** — Glob → Grep → Read workflow

## Anti-Patterns

| Anti-Pattern | Why Bad | Better Approach |
|-------------|---------|-----------------|
| Read entire directory | Token waste | Glob first, then selective |
| Generic searches | Too many results | Specific patterns |
| Reading before searching | Miss context | Grep to locate first |
| One-shot queries | Incomplete | Iterate and refine |
| Ignoring test files | Miss coverage | Include tests in review |
