# Claude Query Patterns

Effective patterns for using Claude's native tools (Read, Grep, Glob) in code review.

## Tool Selection Guide

| Goal | Primary Tool | Secondary Tool | Example |
|------|--------------|----------------|---------|
| Find files by pattern | Glob | - | Find all Python files |
| Search for code patterns | Grep | Read | Find SQL queries |
| Understand specific file | Read | - | Read implementation |
| Cross-reference usage | Grep | - | Find function calls |
| Discover module structure | Glob + Grep | Read | Map dependencies |

## Discovery Patterns

### Pattern 1: Define Scope First

**Good:**
```bash
# Step 1: Find files in scope
Glob: "src/**/*.py"

# Step 2: Read strategically
Read: src/auth.py
Read: src/api/routes.py
```

**Bad:**
```bash
# Reads entire codebase at once
Read: src/
```

### Pattern 2: Search Before Reading

**Good:**
```bash
# Step 1: Search for pattern
Grep: "password.*=.*request\."

# Step 2: Read only matching files
Read: src/auth/login.py
Read: src/api/users.py
```

**Bad:**
```bash
# Read all files to find password handling
Read: src/auth/
Read: src/api/
```

### Pattern 3: Progressive Filtering

```bash
# Start broad, then narrow
Glob: "src/**/*.py"           # All Python files
Grep: "def.*auth"             # Find auth functions
Grep: "@.*decorator"          # Find decorators
Read: src/auth/decorators.py  # Read specific file
```

## Security Pattern Detection

### SQL Injection

```bash
# Find raw SQL queries
Grep: "SELECT.*FROM.*%s"
Grep: "query.*format.*%s"
Grep: "execute.*\\+.*user"

# Check for parameterized queries
Grep: "cursor.execute.*%s"  # Bad
Grep: "cursor.execute.*\\?"  # Good (parameterized)
```

### Authentication Issues

```bash
# Find password handling
Grep: "password.*=.*request"
Grep: "hash.*password"
Grep: "verify.*password"

# Check JWT handling
Grep: "jwt\\.encode"
Grep: "jwt\\.decode"
Grep: "secret.*="
```

### Input Validation

```bash
# Find missing validation
Grep: "request\\.json\\["
Grep: "request\\.args\\["

# Check validation decorators
Grep: "@validate"
Grep: "@schema"
```

## Performance Pattern Detection

### N+1 Query Pattern

```bash
# Find loops with database queries
Grep: "for.*in.*:\\s*query\\("
Grep: "for.*in.*:\\s*session\\.execute"

# Look for missing eager loading
Grep: "relationship.*="  # SQLAlchemy
Grep: "ForeignKey"       # Django
```

### Inefficient Loops

```bash
# Find nested loops
Grep: "for.*in.*:\\s*for.*in"

# Check for expensive operations in loops
Grep: "for.*in.*:\\s*\\.query\\("
Grep: "for.*in.*:\\s*requests\\."
```

### Caching Opportunities

```bash
# Find repeated API calls
Grep: "requests\\.get\\("

# Check for missing cache decorators
Grep: "@cache"
Grep: "@lru_cache"
```

## Testing Pattern Detection

### Test Coverage Gaps

```bash
# Find untested functions
Grep: "def .*\\("  # All functions
Grep: "def test_.*"  # Test functions

# Compare lists to find gaps
```

### Edge Case Handling

```bash
# Find missing error handling
Grep: "except.*pass"
Grep: "except.*:"  # Empty except blocks

# Check for assertions
Grep: "assert.*=="
```

### Mock Usage

```bash
# Find test doubles
Grep: "@patch"
Grep: "Mock\\("
Grep: "mock_"
```

## Code Quality Patterns

### Complexity Indicators

```bash
# Deep nesting
Grep: "\\s{12,}if"  # 3+ levels deep

# Long functions (lines with many indents)
Grep: "\\s{16,}"  # 4+ levels of indentation
```

### Code Duplication

```bash
# Find similar function names
Grep: "def get_.*user"
Grep: "def find_.*user"
Grep: "def fetch_.*user"
```

### Magic Numbers

```bash
# Find hardcoded values
Grep: "=.*[0-9]{2,}"  # Numbers > 9
Grep: "==.*['\"]"     # String comparisons
```

## Architecture Patterns

### Dependency Analysis

```bash
# Find imports to understand dependencies
Grep: "from.*import"
Grep: "^import "

# Map module usage
Grep: "from.*auth.*import"
Grep: "from.*database.*import"
```

### Coupling Detection

```bash
# Find tight coupling
Grep: "from .*\\.\\w* import.*\\w*,.*\\w*"  # Multiple imports from same module

# Check for circular dependencies
Grep: "from.*api.*import"
Grep: "from.*controllers.*import"
```

### Pattern Usage

```bash
# Design patterns
Grep: "class.*Factory"
Grep: "class.*Builder"
Grep: "class.*Proxy"

# Check for singleton pattern
Grep: "_instance.*=.*None"
```

## Cross-Reference Patterns

### Find All Callers

```bash
# Find all functions calling a specific function
Grep: "function_name\\("

# Find all classes inheriting from a base
Grep: "class.*\\(BaseClass\\)"
```

### Find All Implementations

```bash
# Find all implementations of an interface
Grep: "def.*method_name"

# Find all subclasses
Grep: "class.*\\(.*Interface\\)"
```

### Trace Data Flow

```bash
# Find where a variable is set
Grep: "variable_name.*="

# Find where a variable is used
Grep: "\\bvariable_name\\b"
```

## Effective Query Sequences

### Sequence 1: Understanding a New Codebase

```bash
# Step 1: Find entry points
Glob: "*/main.py"
Glob: "*/app.py"
Glob: "*/__init__.py"

# Step 2: Map the structure
Grep: "class.*Controller"
Grep: "class.*Service"
Grep: "@router"

# Step 3: Read key files
Read: main.py
Read: config.py
Read: routes.py
```

### Sequence 2: Investigating a Bug

```bash
# Step 1: Find error handling
Grep: "raise.*Error"
Grep: "except.*Exception"

# Step 2: Find related code
Grep: "function_in_question"
Grep: "function_in_question\\("

# Step 3: Read implementation
Read: file_with_function.py
```

### Sequence 3: Security Review

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

# Step 3: Read sensitive files
Read: auth.py
Read: security.py
```

## Best Practices

1. **Start with Glob** to understand scope
2. **Use Grep** to find relevant code sections
3. **Read selectively** - only files that matter
4. **Iterate** - refine queries based on findings
5. **Be specific** - use precise patterns
6. **Combine tools** - Glob → Grep → Read workflow

## Anti-Patterns

| Anti-Pattern | Why Bad | Better Approach |
|--------------|---------|-----------------|
| Read entire directory | Token waste, slow | Glob first, then selective reads |
| Generic searches | Too many results | Use specific patterns |
| Reading before searching | Miss context | Grep to locate, then Read |
| One-shot queries | Incomplete | Iterate and refine |
| Ignoring test files | Miss coverage info | Include tests in review |
