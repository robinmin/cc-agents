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

```go
// Always use gofmt
// Run: gofmt -w yourfile.go
// Or: gofmt -w .  (format all files in directory)

// IDE integration recommended
// VS Code: format on save
// GoLand: format on save enabled by default
```

### Naming

```go
// GOOD: Clear, descriptive names
func getUserByID(id int) (*User, error)

// BAD: Abbreviations
func getUsrById(i int) (*User, error)

// GOOD: Full words
httpClient := &http.Client{}

// BAD: Abbreviations
httpClnt := &http.Client{}
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
    return err
}

// GOOD: Receiver names are consistent
type Server struct { /* ... */ }
func (s *Server) Start() { /* ... */ }
func (s *Server) Stop() { /* ... */ }
```

### Constants

```go
// GOOD: Descriptive constant names
const (
    MaxConnections = 100
    DefaultTimeout = 30 * time.Second
)

// GOOD: Use iota for enumerations
const (
    StatusPending Status = iota
    StatusActive
    StatusInactive
)
```

## Error Handling

### Always Check Errors

```go
// WRONG: Ignoring errors
file, _ := os.Open("file.txt")

// RIGHT: Always check
file, err := os.Open("file.txt")
if err != nil {
    return fmt.Errorf("open file: %w", err)
}
```

### Error Wrapping

```go
// GOOD: Add context at each layer
func loadData() error {
    data, err := os.ReadFile("data.json")
    if err != nil {
        return fmt.Errorf("read config: %w", err)
    }
    return nil
}

func initApp() error {
    if err := loadData(); err != nil {
        return fmt.Errorf("init app: %w", err)
    }
    return nil
}
```

### Error Variables

```go
// GOOD: Define error variables for comparison
var (
    ErrNotFound = errors.New("not found")
    ErrInvalid  = errors.New("invalid input")
)

func getUser(id int) (*User, error) {
    if id <= 0 {
        return nil, ErrInvalid
    }
    // ...
}
```

### Don't Panic

```go
// WRONG: Panic for normal errors
func getUser(id int) *User {
    if id <= 0 {
        panic("invalid id")
    }
    return &User{ID: id}
}

// RIGHT: Return error
func getUser(id int) (*User, error) {
    if id <= 0 {
        return nil, errors.New("invalid id")
    }
    return &User{ID: id}, nil
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
package my_config
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
    FindUser(ctx context.Context, id int) (*User, error)
}
```

### Constant Names

```go
// GOOD: CamelCase for exported
const MaxRetries = 3

// GOOD: camelCase for unexported
const defaultTimeout = 30 * time.Second
```

### Acronyms

```go
// GOOD: Capitalize all letters in acronyms
type HTTPServer struct { }
type XMLParser struct { }
func HandleHTTP() { }

// WRONG: Keep acronyms lowercase
type HttpServer struct { }
type XmlParser struct { }
```

## Package Design

### Minimal Public API

```go
// GOOD: Minimal exported API
package calculator

// Add is exported
func Add(a, b int) int {
    return add(a, b)  // Uses private helper
}

// add is private to package
func add(a, b int) int {
    return a + b
}
```

### Avoid Cyclic Imports

```go
// WRONG: Package A imports B, B imports A
// package a
import "example.com/b"

// package b
import "example.com/a"

// RIGHT: Refactor to avoid cycles
// package a
import "example.com/b"
import "example.com/shared"
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
// WRONG: Accept concrete type
func ProcessData(f *os.File) error {
    // ...
}

// GOOD: Accept interface
func ProcessData(w io.Writer) error {
    // ...
}

// WRONG: Return interface
func NewBuffer() io.Writer {
    return &bytes.Buffer{}
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

// GOOD: Small, focused interfaces
type UserSaver interface {
    SaveUser(u *User) error
}

type UserFinder interface {
    FindUser(id int) (*User, error)
}
```

### Define Interfaces in Consumer Package

```go
// GOOD: Consumer defines interface
package service

type Database interface {
    GetUser(ctx context.Context, id int) (*User, error)
}

type Service struct {
    db Database  // Service specifies what it needs
}

// Provider implements interface
package postgres

type PostgresDB struct { /* ... */ }

func (db *PostgresDB) GetUser(ctx context.Context, id int) (*User, error) {
    // Implementation
}
```

## Concurrency

### Don't Create Goroutines You Can't Control

```go
// WRONG: Unbounded goroutine creation
for _, item := range items {
    go process(item)  // Could create millions
}

// RIGHT: Worker pool with limit
sem := make(chan struct{}, runtime.NumCPU())
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
// WRONG: No way to stop
go func() {
    for {
        doWork()
    }
}()

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
        fmt.Println(i)  // All print 3
    }()
}

// RIGHT: Pass as parameter
for i := 0; i < 3; i++ {
    go func(i int) {
        fmt.Println(i)  // Prints 0, 1, 2
    }(i)
}
```

## Testing

### Table-Driven Tests

```go
// GOOD: Table-driven tests
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

### Test Files

```go
// Co-locate tests with code
package mypackage

// mypackage.go
func Add(a, b int) int {
    return a + b
}

// mypackage_test.go
func TestAdd(t *testing.T) { /* ... */ }
```

## Common Anti-Patterns

### Clever Code

```go
// WRONG: Too clever
func reverse(s []int) {
    for i, j := 0, len(s)-1; i < j; i, j = i+1, j-1 {
        s[i], s[j] = s[j], s[i]
    }
}

// RIGHT: Clear and simple
func reverse(s []int) {
    left, right := 0, len(s)-1
    for left < right {
        s[left], s[right] = s[right], s[left]
        left++
        right--
    }
}
```

### Premature Optimization

```go
// WRONG: Optimizing before measuring
func process(data []int) int {
    result := 0
    for i := 0; i < len(data); i++ {
        result += data[i]
    }
    return result
}

// RIGHT: Write clear code first, optimize if needed
func process(data []int) (result int) {
    for _, v := range data {
        result += v
    }
    return
}
```

### Deep Nesting

```go
// WRONG: Deep nesting
func process(data string) error {
    if data != "" {
        if len(data) > 10 {
            if data[0] == 'A' {
                for i, c := range data {
                    if c == 'B' {
                        // ...
                    }
                }
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
    for i, c := range data {
        if c == 'B' {
            // ...
        }
    }
    return nil
}
```

### Exported Fields

```go
// WRONG: Exported fields (breaks encapsulation)
type User struct {
    ID    int
    Name  string
    Email string
}

// GOOD: Unexported fields with getters/setters
type User struct {
    id    int
    name  string
    email string
}

func (u *User) ID() int {
    return u.id
}

func (u *User) SetName(name string) {
    u.name = name
}
```

## Code Review Checklist

- [ ] Code is formatted (`gofmt`)
- [ ] All errors are checked
- [ ] Error messages provide context
- [ ] No `panic` in production code
- [ ] Goroutines have lifecycle management
- [ ] Context is passed where needed
- [ ] Interfaces are small and focused
- [ ] Public API is well-documented
- [ ] Tests cover edge cases
- [ ] No race conditions (`go test -race`)
- [ ] No data races detected
- [ ] Variable names are descriptive
- [ ] Functions are small and focused
- [ ] Package dependencies make sense

## Further Reading

- [Effective Go](https://go.dev/doc/effective_go)
- [Go Code Review Comments](https://github.com/golang/go/wiki/CodeReviewComments)
- [Go Proverbs](https://go-proverbs.github.io/)
- [Idiomatic Go](https://dmitri.shuralyov.com/idiomatic-go)
