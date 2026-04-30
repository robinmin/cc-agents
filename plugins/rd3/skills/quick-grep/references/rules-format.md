# Rule Format

`ast-grep` rule files are YAML documents that define structural matches and, optionally, rewrite payloads.

## Basic Structure

```yaml
id: unique-rule-id
language: javascript
message: "Human-readable description"
severity: warning  # error | warning | info | hint

rule:
  <rule-object>
```

## Multi-Language Rule Files

If you want one file to cover multiple languages, store multiple YAML documents in the same file:

```yaml
---
id: console-log-javascript
language: javascript
rule:
  pattern: console.log($$$)
---
id: console-log-typescript
language: typescript
rule:
  pattern: console.log($$$)
```

This is how the bundled `references/rules/*.yml` files support both JavaScript and TypeScript.
Generic YAML tooling should parse these files as YAML streams, for example with `YAML.parseAllDocuments(...)`, not single-document `YAML.parse(...)`.

## Valid Rule Patterns

### Simple Pattern

```yaml
rule:
  pattern: console.log($$$)
```

### Composite Logic

```yaml
rule:
  all:
    - kind: function_declaration
    - regex: "^async\\s+function"
    - not:
        has:
          kind: catch_clause
          stopBy: end
```

### Context Filtering

```yaml
rule:
  all:
    - pattern: $PROMISE.then($CALLBACK)
    - not:
        inside:
          pattern: $PROMISE.then($CALLBACK).catch($ERROR_HANDLER)
          stopBy: end
```

### AST Kind Matching

```yaml
rule:
  kind: comment
  regex: "(TODO|FIXME)"
```

## Common AST Kinds

| Kind | Description |
|------|-------------|
| `function_declaration` | Function declaration |
| `class_declaration` | Class declaration |
| `method_definition` | Class method |
| `call_expression` | Function or method call |
| `pair` | Object key-value pair |
| `comment` | Comment |
| `import_statement` | Import statement |
| `export_statement` | Export statement |

## Metavariables

| Variable | Description |
|----------|-------------|
| `$NAME` | Match one named AST node |
| `$$NAME` | Match one node including unnamed syntax |
| `$$$NODES` | Match zero or more sibling nodes |
| `$_` | Non-capturing wildcard |

## Rewrite Guidance

Detection-only rules need just `rule:`. To support `sg scan --interactive` or `sg scan --update-all` as an actual rewrite, add a fix/rewrite payload to the rule file; otherwise prefer:

```bash
sg run --pattern 'A' --rewrite 'B' --lang LANG --interactive
```

## Examples

See `references/rules/` for the bundled rule library.

For full documentation, see [ast-grep reference](https://ast-grep.github.io/reference/rule.html).
