# Go Error Handling

This reference covers error handling patterns, error wrapping, sentinel errors, and idiomatic Go error management.

## Table of Contents

1. [Error Basics](#error-basics)
2. [Error Creation](#error-creation)
3. [Error Wrapping](#error-wrapping)
4. [Sentinel Errors](#sentinel-errors)
5. [Custom Error Types](#custom-error-types)
6. [Error Handling Patterns](#error-handling-patterns)
7. [Best Practices](#best-practices)
8. [Common Pitfalls](#common-pitfalls)

## Error Basics

### The Error Interface

```go
// Built-in error interface
type error interface {
    Error() string
}
```

### Basic Error Checking

```go
func doWork() error {
    return errors.New("something went wrong")
}

err := doWork()
if err != nil {
    fmt.Println("error:", err)
}

// Or return early
result, err := doWork()
if err != nil {
    return err  // Return error to caller
}
```

### Ignore Errors (Never Do This)

```go
// WRONG: Ignoring errors
file, _ := os.Open("file.txt")  // Don't ignore errors!

// RIGHT: Always check errors
file, err := os.Open("file.txt")
if err != nil {
    return fmt.Errorf("failed to open file: %w", err)
}
```

## Error Creation

### Simple Errors

```go
import "errors"

err := errors.New("something went wrong")
```

### Formatted Errors

```go
import "fmt"

err := fmt.Errorf("invalid value: %d", value)
```

### Error with Context

```go
value := 42
err := fmt.Errorf("invalid value: %d (expected < 10)", value)
```

## Error Wrapping

Go 1.13+ introduced error wrapping with `%w` verb:

### Basic Wrapping

```go
func readConfig() error {
    err := os.ReadFile("config.json")
    if err != nil {
        return fmt.Errorf("read config: %w", err)
    }
    return nil
}
```

### Unwrapping Errors

```go
import "errors"

err := readConfig()

// Check if error wraps a specific error
if errors.Is(err, os.ErrNotExist) {
    fmt.Println("config file not found")
}

// Extract wrapped error
var pathErr *os.PathError
if errors.As(err, &pathErr) {
    fmt.Println("path:", pathErr.Path)
}
```

### Multi-level Wrapping

```go
func loadConfig() error {
    err := readConfig()
    if err != nil {
        return fmt.Errorf("load config: %w", err)
    }
    return nil
}

func initApp() error {
    err := loadConfig()
    if err != nil {
        return fmt.Errorf("init app: %w", err)
    }
    return nil
}

// Unwrap and check
err := initApp()
if errors.Is(err, os.ErrNotExist) {
    fmt.Println("Root cause: file not found")
}
```

### Unwrapping All

```go
func unwrapAll(err error) error {
    for {
        unwrapped := errors.Unwrap(err)
        if unwrapped == nil {
            return err
        }
        err = unwrapped
    }
}
```

## Sentinel Errors

### Defining Sentinel Errors

```go
import "errors"

var (
    ErrNotFound     = errors.New("not found")
    ErrInvalidInput = errors.New("invalid input")
    ErrPermission   = errors.New("permission denied")
)

func getUser(id int) (*User, error) {
    if id <= 0 {
        return nil, ErrInvalidInput
    }
    // ... lookup user
    return nil, ErrNotFound
}
```

### Checking Sentinel Errors

```go
user, err := getUser(0)
if errors.Is(err, ErrInvalidInput) {
    fmt.Println("Invalid user ID")
    return err
}

if errors.Is(err, ErrNotFound) {
    fmt.Println("User not found")
    return err
}
```

### When to Use Sentinel Errors

**Use sentinel errors for:**
- Expected conditions (file not found, end of iteration)
- Public API error contracts
- Testing specific error cases

**Avoid sentinel errors for:**
- Operational errors (network timeout, parsing errors)
- Errors that need context
- Most application errors

## Custom Error Types

### Basic Custom Error

```go
type ValidationError struct {
    Field   string
    Message string
}

func (e ValidationError) Error() string {
    return fmt.Sprintf("validation failed on %s: %s", e.Field, e.Message)
}

// Usage
func validateUser(u User) error {
    if u.Name == "" {
        return ValidationError{Field: "name", Message: "required"}
    }
    return nil
}
```

### Error with Data

```go
type RetryableError struct {
    Err     error
    RetryAt time.Time
}

func (e RetryableError) Error() string {
    return fmt.Sprintf("retry after %s: %v", e.RetryAt, e.Err)
}

func (e RetryableError) Unwrap() error {
    return e.Err
}

// Check and extract
err := doWork()
var rErr RetryableError
if errors.As(err, &rErr) {
    fmt.Printf("Retry at: %s\n", rErr.RetryAt)
}
```

### Error Stack

```go
type ErrorStack struct {
    Stack []error
}

func (e *ErrorStack) Error() string {
    var sb strings.Builder
    for i, err := range e.Stack {
        if i > 0 {
            sb.WriteString(": ")
        }
        sb.WriteString(err.Error())
    }
    return sb.String()
}

func (e *ErrorStack) Unwrap() error {
    if len(e.Stack) > 1 {
        return &ErrorStack{Stack: e.Stack[1:]}
    }
    if len(e.Stack) == 1 {
        return e.Stack[0]
    }
    return nil
}
```

## Error Handling Patterns

### Return Early

```go
// GOOD: Return early on error
func process() error {
    data, err := readData()
    if err != nil {
        return fmt.Errorf("read data: %w", err)
    }

    result, err := transform(data)
    if err != nil {
        return fmt.Errorf("transform: %w", err)
    }

    if err := save(result); err != nil {
        return fmt.Errorf("save: %w", err)
    }

    return nil
}
```

### Handle Errors at Boundaries

```go
// GOOD: Handle errors at application boundary
func main() {
    if err := run(); err != nil {
        log.Printf("error: %v", err)
        os.Exit(1)
    }
}

func run() error {
    // All errors bubble up here
    return process()
}
```

### Error Logging

```go
import "log/slog"

func process() error {
    data, err := readData()
    if err != nil {
        slog.Error("failed to read data",
            "error", err,
            "path", "data.json",
        )
        return err
    }
    return nil
}
```

### Contextual Information

```go
// GOOD: Add context
func processUser(id int) error {
    user, err := getUser(id)
    if err != nil {
        return fmt.Errorf("get user %d: %w", id, err)
    }
    return nil
}

// BAD: Lose context
func processUser(id int) error {
    user, err := getUser(id)
    if err != nil {
        return err  // Lost which user failed
    }
    return nil
}
```

### Retry Pattern

```go
func doWithRetry(maxRetries int, f func() error) error {
    var lastErr error
    for i := 0; i < maxRetries; i++ {
        err := f()
        if err == nil {
            return nil
        }

        lastErr = err

        // Check if error is retryable
        if !isRetryable(err) {
            return err
        }

        time.Sleep(time.Duration(i+1) * time.Second)
    }
    return fmt.Errorf("after %d retries: %w", maxRetries, lastErr)
}

func isRetryable(err error) bool {
    return !errors.Is(err, ErrInvalidInput)
}
```

### Error Group

```go
import "sync"

type ErrorGroup struct {
    mu   sync.Mutex
    errs []error
}

func (g *ErrorGroup) Add(err error) {
    if err != nil {
        g.mu.Lock()
        g.errs = append(g.errs, err)
        g.mu.Unlock()
    }
}

func (g *ErrorGroup) ToError() error {
    if len(g.errs) == 0 {
        return nil
    }
    if len(g.errs) == 1 {
        return g.errs[0]
    }
    return fmt.Errorf("%d errors: %v", len(g.errs), g.errs)
}

// Usage
func processAll(items []Item) error {
    var eg ErrorGroup
    for _, item := range items {
        item := item
        go func() {
            eg.Add(processItem(item))
        }()
    }
    return eg.ToError()
}
```

## Best Practices

1. **Always check errors** - Never ignore `err != nil`
2. **Return early** - Avoid deep nesting
3. **Wrap errors with context** - Use `%w` for wrapping
4. **Add context at boundaries** - When crossing layers/packages
5. **Handle errors at the top** - Main function or request handler
6. **Use sentinel errors sparingly** - Only for expected conditions
7. **Make errors testable** - Use `errors.Is` and `errors.As`
8. **Log errors with context** - Include relevant information

## Common Pitfalls

### Using panic for Errors

```go
// WRONG: panic for normal errors
func getUser(id int) *User {
    if id <= 0 {
        panic("invalid id")  // Don't do this!
    }
    return &User{ID: id}
}

// RIGHT: return error
func getUser(id int) (*User, error) {
    if id <= 0 {
        return nil, errors.New("invalid id")
    }
    return &User{ID: id}, nil
}
```

### Losing Error Information

```go
// WRONG: Lose wrapped error
return fmt.Errorf("context: %v", err)  // %v doesn't unwrap!

// RIGHT: Preserve error for checking
return fmt.Errorf("context: %w", err)  // %w preserves error
```

### Comparing Errors Directly

```go
// WRONG: Direct comparison doesn't work with wrapped errors
if err == os.ErrNotExist {  // Won't work if err is wrapped!
    // ...
}

// RIGHT: Use errors.Is
if errors.Is(err, os.ErrNotExist) {
    // ...
}
```

### Creating Too Many Error Types

```go
// WRONG: Custom error type for everything
type DatabaseError struct { /* ... */ }
type NetworkError struct { /* ... */ }
type FileSystemError struct { /* ... */ }

// RIGHT: Use sentinel errors or simple wrapping
var (
    ErrDatabase = errors.New("database error")
    ErrNetwork  = errors.New("network error")
)

// Or use custom types only when needed for extra data
```

### Ignoring Error in defer

```go
// WRONG: Ignoring error in defer
defer file.Close()  // Error ignored!

// RIGHT: Handle or log
defer func() {
    if err := file.Close(); err != nil {
        log.Printf("failed to close file: %v", err)
    }
}()
```

## Further Reading

- [Working with Errors in Go 1.13](https://go.dev/blog/go1.13-errors)
- [Error handling and Go](https://go.dev/blog/error-handling-and-go)
- [Error values package overview](https://pkg.go.dev/errors)
- [Don't just check errors, handle them gracefully](https://dave.cheney.net/2016/04/27/dont-just-check-errors-handle-them-gracefully)
