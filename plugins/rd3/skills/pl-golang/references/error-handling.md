---
name: golang-error-handling
description: "Go error handling patterns: wrapping, sentinel errors, custom types, and errors.Join for Go 1.20+."
see_also:
  - rd3:pl-golang
  - rd3:pl-golang:patterns
  - rd3:pl-golang:best-practices
---

# Go Error Handling

This reference covers error handling patterns and best practices in Go.

## Core Principles

1. **Errors are values** - Handle them explicitly
2. **Wrap errors for context** - Use `%w` to preserve the error chain
3. **Handle errors at the right level** - Don't ignore, don't panic
4. **Make errors actionable** - Provide context for debugging

## Error Wrapping

### Adding Context with fmt.Errorf

```go
func readConfig() error {
    data, err := os.ReadFile("config.json")
    if err != nil {
        return fmt.Errorf("reading config: %w", err)
    }
    return nil
}

func initApp() error {
    if err := readConfig(); err != nil {
        return fmt.Errorf("initializing app: %w", err)
    }
    return nil
}
```

### Unwrap and Is/As

```go
// Check for specific errors
if errors.Is(err, os.ErrNotExist) {
    // File doesn't exist
}

// Unwrap and check custom errors
var notFoundErr *NotFoundError
if errors.As(err, &notFoundErr) {
    fmt.Println("Not found:", notFoundErr.Resource)
}
```

## Sentinel Errors

### When to Use

Use sentinel errors for errors that callers need to check explicitly:

```go
import "errors"

// Sentinel errors for common cases
var (
    ErrNotFound    = errors.New("not found")
    ErrPermission  = errors.New("permission denied")
    ErrInvalidInput = errors.New("invalid input")
)

func FindUser(id string) (*User, error) {
    if id == "" {
        return nil, ErrInvalidInput
    }
    // ...
    if user == nil {
        return nil, ErrNotFound
    }
    return user, nil
}

// Caller checks with errors.Is
user, err := FindUser("")
if errors.Is(err, ErrInvalidInput) {
    // Handle invalid input
}
```

### When NOT to Use

Don't use sentinel errors when the error is one-off and won't be checked:

```go
// WRONG: Creating new error for single use
var ErrUserNotFound = errors.New("user not found")
return nil, ErrUserNotFound

// RIGHT: Just wrap the error
return nil, fmt.Errorf("finding user %s: %w", id, err)
```

## Custom Error Types

### When to Use

Use custom error types when you need to attach additional data:

```go
type NotFoundError struct {
    Resource string
    ID       string
}

func (e *NotFoundError) Error() string {
    return fmt.Sprintf("%s %s not found", e.Resource, e.ID)
}

func FindUser(id string) (*User, error) {
    user, err := db.FindUser(id)
    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return nil, &NotFoundError{Resource: "user", ID: id}
        }
        return nil, err
    }
    return user, nil
}

// Caller checks type with errors.As
var notFoundErr *NotFoundError
if errors.As(err, &notFoundErr) {
    fmt.Printf("Missing %s with ID %s\n", notFoundErr.Resource, notFoundErr.ID)
}
```

## Multiple Errors (Go 1.20+)

### errors.Join

```go
import "errors"

// Combine multiple errors
func processAll(items []Item) error {
    var errs []error
    for _, item := range items {
        if err := process(item); err != nil {
            errs = append(errs, err)
        }
    }
    if len(errs) > 0 {
        return errors.Join(errs...)
    }
    return nil
}

// Check individual errors
err := processAll(items)
if err != nil {
    for _, e := range errors.Errors(err) {
        fmt.Println("Error:", e)
    }
}

// Check specific error
if errors.Is(err, ErrTimeout) {
    // Handle timeout
}
```

## Error Handling Patterns

### Early Return Pattern

```go
// WRONG: Deep nesting
func process() error {
    if data, err := fetchData(); err == nil {
        if user, err := parseUser(data); err == nil {
            if err := validate(user); err == nil {
                return save(user)
            } else {
                return err
            }
        } else {
            return err
        }
    } else {
        return err
    }
}

// RIGHT: Early returns
func process() error {
    data, err := fetchData()
    if err != nil {
        return fmt.Errorf("fetching data: %w", err)
    }

    user, err := parseUser(data)
    if err != nil {
        return fmt.Errorf("parsing user: %w", err)
    }

    if err := validate(user); err != nil {
        return fmt.Errorf("validating user: %w", err)
    }

    return save(user)
}
```

### Context in Errors

```go
// WRONG: Missing context
func readFile(path string) error {
    data, err := os.ReadFile(path)
    if err != nil {
        return err // What's the path? What were we doing?
    }
    return nil
}

// RIGHT: Rich context
func readFile(path string) error {
    data, err := os.ReadFile(path)
    if err != nil {
        return fmt.Errorf("reading file %q: %w", path, err)
    }
    return nil
}
```

## Don't Panic

Reserve `panic` for truly unrecoverable situations:

```go
// WRONG: Panic for normal errors
func getUser(id string) *User {
    user, err := findUser(id)
    if err != nil {
        panic("user not found") // Never do this
    }
    return user
}

// RIGHT: Return error
func getUser(id string) (*User, error) {
    user, err := findUser(id)
    if err != nil {
        return nil, fmt.Errorf("getting user: %w", err)
    }
    return user, nil
}
```

### When Panic IS Appropriate

```go
// 1. Programmer error (violating contract)
func SetAge(u *User, age int) {
    if age < 0 {
        panic("age cannot be negative") // Bug in code
    }
    u.Age = age
}

// 2. Truly unrecoverable state
func main() {
    defer func() {
        if r := recover(); r != nil {
            log.Fatalf("unrecoverable error: %v", r)
        }
    }()
    // ...
}
```

## Best Practices Summary

| Practice | Do | Don't |
|----------|-----|-------|
| Context | Wrap errors with `%w` | Return bare errors |
| Sentinel | Use for checkable errors | Create just for wrapping |
| Custom types | Use when you need extra data | Over-engineer simple cases |
| Multiple errors | Use `errors.Join` | Ignore multiple errors |
| Panic | Reserve for unrecoverable | Handle normal flow errors |

## Further Reading

- [Error Handling in Go](https://go.dev/blog/error-handling)
- [Errors are Values](https://go.dev/blog/errors-are-values)
- [Go 1.20 Release Notes: Errors](https://go.dev/doc/go1.20#errors)
