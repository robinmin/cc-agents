# Rule Format

ast-grep rule files are YAML documents defining code patterns to search and (optionally) rewrite.

## Basic Structure

```yaml
id: unique-rule-id
language: javascript
message: "Human-readable description"
severity: warning  # warning | error | info

rule:
  <pattern-definition>
```

## Pattern Types

### Simple Pattern

```yaml
rule:
  pattern: console.log($$$)
```

### With Capture Variables

```yaml
rule:
  pattern: const $NAME = $VALUE
vars:
  - name: NAME
  - name: VALUE
```

### Logical Operators

```yaml
rule:
  any:           # OR
    - pattern: console.log($$$)
    - pattern: console.warn($$$)
  all:           # AND
    - pattern: function $F()
    - pattern: async function $F()
  not:
    pattern: console.log($$$)
```

### Context Filtering

```yaml
rule:
  pattern: $FUNC($$$)
  inside:
    pattern: class $CLASS
```

### AST Kind Matching

```yaml
rule:
  kind: comment
  regex: "(TODO|FIXME)"
```

### Pair Matching (key-value)

```yaml
rule:
  kind: pair
  any:
    - key:
        regex: "api_key"
```

## Common AST Kinds

| Kind | Description |
|------|-------------|
| `function` | Function declaration |
| `class` | Class declaration |
| `method` | Class method |
| `call` | Function call |
| `pair` | Object key-value pair |
| `comment` | Comment |
| `import` | Import statement |
| `export` | Export statement |

## Metavariables

| Variable | Description |
|----------|-------------|
| `$$$` | Any number of arguments/children |
| `$NAME` | Single capture |
| `@NAME` | Type capture (AST node kind) |

## Examples

See `references/rules/` for pre-built rules covering common patterns.

For full documentation, see [ast-grep reference](https://ast-grep.github.io/reference/rule.html).
