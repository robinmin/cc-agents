---
name: golang-best-practices
description: "Idiomatic Go patterns: naming, error handling, concurrency, testing, and common anti-patterns."
see_also:
  - rd3:pl-golang
  - rd3:pl-golang:error-handling
  - rd3:pl-golang:concurrency
---

# Go Best Practices

This reference covers idiomatic Go patterns, common pitfalls, and established best practices for Go development.

## Table of Contents

1. [Code Style](#code-style)
2. [Error Handling](#error-handling)
3. [Naming Conventions](#naming-conventions)
4. [Package Design](#package-design)
5. [API Design](#api-design)
6. [Concurrency](#concurrency)
7. [Testing](#testing)
8. [Common Anti-Patterns](#common-anti-patterns)

## Code Style

### Formatting

Go's formatter (`gofmt`) is automatic — use it:

```bash
go fmt ./...
# or
gofmt -w yourfile.go
```

Configure your editor to format on save.

### Naming

```go
// GOOD: Clear, descriptive names
func getUserByID(id string) (*User, error)
func calculateTotal(items []Item) int64

// BAD: Abbreviations
func getUsrById(i string) (*User, error)

// GOOD: Full words for clarity
httpClient := &http.Client{}
userCount := len(users)

// GOOD: Short names for short scopes
for i := 0; i < 10; i++ {
    fmt.Println(i)
}
```

### Variable Names

```go
// GOOD: Short names for short scopes
for i := 0; i < 10; i++ {
    fmt.Println(i)
}

// GOOD: Descriptive names for longer scopes
type ClientConfig struct {
    RequestTimeout time.Duration
    MaxRetries     int
}

// GOOD: Context is always ctx
func process(ctx context.Context) error { /* ... */ }

// GOOD: Error is always err
data, err := readData()
if err != nil {
    return fmt.Errorf("reading: %w", err)
}
```

## Error Handling

### Always Check Errors

```go
// WRONG: Ignoring errors
file, _ := os.Open("file.txt")

// RIGHT: Always check
file, err := os.Open("file.txt")
if err != nil {
    return fmt.Errorf("opening: %w", err)
}
```

### Error Wrapping

```go
// GOOD: Add context at each layer
func loadData() error {
    data, err := os.ReadFile("data.json")
    if err != nil {
        return fmt.Errorf("reading config: %w", err)
    }
    return nil
}
```

## Naming Conventions

### Package Names

```go
// GOOD: All lowercase, single word
package user
package httpserver
package config

// BAD: Mixed case, underscores
package userProfile
package HTTP_server
```

### Interface Names

```go
// GOOD: -er suffix for single-method interfaces
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Writer interface {
    Write(p []byte) (n int, err error)
}

// GOOD: Descriptive names for multiple methods
type Database interface {
    SaveUser(ctx context.Context, user User) error
    FindUser(ctx context.Context, id string) (*User, error)
}
```

### Acronyms

```go
// GOOD: Capitalize all letters in acronyms
type HTTPServer struct { }
type XMLParser struct { }
func HandleHTTP() { }

// WRONG: Mixed case
type HttpServer struct { }
```

## Package Design

### Minimal Public API

```go
// GOOD: Minimal exported API
package calculator

// Add is exported
func Add(a, b int) int {
    return add(a, b)
}

// add is private to package
func add(a, b int) int {
    return a + b
}
```

### Use internal for Private Code

```
project/
├── internal/
│   ├── auth/      # Can only be imported by code in this module
│   └── database/
├── pkg/           # Public API
│   └── api/
└── cmd/
    └── server/
```

## API Design

### Accept Interfaces, Return Structs

```go
// GOOD: Accept interface
func ProcessData(w io.Writer) error {
    // ...
}

// GOOD: Return concrete type
func NewBuffer() *bytes.Buffer {
    return &bytes.Buffer{}
}
```

### Keep Interfaces Small

```go
// WRONG: Large interface
type Database interface {
    SaveUser(u *User) error
    FindUser(id int) (*User, error)
    DeleteUser(id int) error
    UpdateUser(u *User) error
    // ... 20 more methods
}

// RIGHT: Small, focused interfaces
type UserSaver interface {
    SaveUser(ctx context.Context, u *User) error
}

type UserFinder interface {
    FindUser(ctx context.Context, id string) (*User, error)
}
```

### Define Interfaces in Consumer Package

```go
// GOOD: Consumer defines interface
package service

type UserStore interface {
    GetUser(ctx context.Context, id string) (*User, error)
}

type Service struct {
    store UserStore
}
```

## Concurrency

### Don't Create Goroutines You Can't Control

```go
// WRONG: Unbounded goroutine creation
for _, item := range items {
    go process(item) // Could create millions
}

// RIGHT: Worker pool with limit
const maxWorkers = 10
sem := make(chan struct{}, maxWorkers)

for _, item := range items {
    sem <- struct{}{}
    go func(item Item) {
        defer func() { <-sem }()
        process(item)
    }(item)
}
```

### Always Provide Ways to Stop Goroutines

```go
// RIGHT: Use context for cancellation
go func(ctx context.Context) {
    for {
        select {
        case <-ctx.Done():
            return
        default:
            doWork()
        }
    }
}(ctx)
```

### Be Careful with Goroutines in Loops

```go
// WRONG: Captures loop variable
for i := 0; i < 3; i++ {
    go func() {
        fmt.Println(i) // All print 3
    }()
}

// RIGHT: Pass as parameter
for i := 0; i < 3; i++ {
    go func(i int) {
        fmt.Println(i) // Prints 0, 1, 2
    }(i)
}
```

## Testing

### Table-Driven Tests

```go
func TestAdd(t *testing.T) {
    tests := []struct {
        name     string
        a, b     int
        expected int
    }{
        {"positive", 2, 3, 5},
        {"negative", -2, -3, -5},
        {"zero", 0, 0, 0},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result := Add(tt.a, tt.b)
            if result != tt.expected {
                t.Errorf("got %d, want %d", result, tt.expected)
            }
        })
    }
}
```

### Test Naming

```go
// GOOD: TestFunctionName_Scenario_ExpectedResult
func TestUserRepository_GetUserByID_NotFound(t *testing.T) { /* ... */ }
func TestUserRepository_GetUserByID_Success(t *testing.T) { /* ... */ }

// GOOD: Descriptive subtests
t.Run("when user doesn't exist", func(t *testing.T) { /* ... */ })
t.Run("when user exists", func(t *testing.T) { /* ... */ })
```

## Common Anti-Patterns

### Deep Nesting

```go
// WRONG: Deep nesting
func process(data string) error {
    if data != "" {
        if len(data) > 10 {
            if data[0] == 'A' {
                // ...
            }
        }
    }
    return nil
}

// RIGHT: Early returns
func process(data string) error {
    if data == "" {
        return nil
    }
    if len(data) <= 10 {
        return nil
    }
    if data[0] != 'A' {
        return nil
    }
    // ...
    return nil
}
```

### Mutable Global State

```go
// WRONG: Global mutable state
var counter int

// RIGHT: Use mutex or atomic for counters
var counter int64

func increment() {
    atomic.AddInt64(&counter, 1)
}
```

## Code Review Checklist

- [ ] Code is formatted (`go fmt`)
- [ ] All errors are checked
- [ ] Error messages provide context
- [ ] No `panic` in production code
- [ ] Goroutines have lifecycle management
- [ ] Context is passed where needed
- [ ] Interfaces are small and focused
- [ ] Public API is well-documented
- [ ] Tests cover edge cases
- [ ] No race conditions (`go test -race`)
- [ ] Variable names are descriptive
- [ ] Functions are small and focused
- [ ] Package dependencies make sense

## Further Reading

- [Effective Go](https://go.dev/doc/effective_go)
- [Go Code Review Comments](https://github.com/golang/go/wiki/CodeReviewComments)
- [Go Proverbs](https://go-proverbs.github.io/)
- [Idiomatic Go](https://dmitri.shuralyov.com/idiomatic-go)
