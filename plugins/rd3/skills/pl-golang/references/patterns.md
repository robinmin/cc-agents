---
name: golang-patterns
description: "Go idiomatic patterns: defer, context, panic/recover, and common idioms."
see_also:
  - rd3:pl-golang
  - rd3:pl-golang:concurrency
  - rd3:pl-golang:error-handling
---

# Go Patterns

This reference covers common Go idiomatic patterns.

## Defer

### Resource Cleanup

```go
// File handling
func readFile(path string) error {
    f, err := os.Open(path)
    if err != nil {
        return err
    }
    defer f.Close() // Always closes when function returns

    // Use f...
    return nil
}

// Mutex unlocking
var mu sync.Mutex
var counter int

func increment() {
    mu.Lock()
    defer mu.Unlock()
    counter++
}

// Database transactions
func transfer(db *DB, from, to string, amount int64) error {
    tx, err := db.Begin()
    if err != nil {
        return err
    }
    defer tx.Rollback() // Rolls back if not committed

    if err := debit(tx, from, amount); err != nil {
        return err
    }
    if err := credit(tx, to, amount); err != nil {
        return err
    }

    return tx.Commit() // Defers won't run after this
}
```

### Deferred Function Arguments

```go
// Arguments evaluated immediately, function runs at return
func foo() {
    x := 10
    defer fmt.Println("x =", x) // Prints "x = 10", not "x = 20"
    x = 20
}

// RIGHT: Use closure to capture current value
func bar() {
    x := 10
    defer func() {
        fmt.Println("x =", x) // Prints "x = 20"
    }()
    x = 20
}
```

## Context

### Context Propagation

```go
// Context with deadline
func fetchData(ctx context.Context) error {
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()

    // All operations respect timeout
    return doFetch(ctx)
}
```

### Context Values

```go
// Store request-scoped values
ctx := context.WithValue(ctx, "userID", userID)
ctx = context.WithValue(ctx, "traceID", traceID)

// Retrieve values
userID := ctx.Value("userID").(string)
```

### Context Cancellation

```go
func worker(ctx context.Context) {
    for {
        select {
        case <-ctx.Done():
            fmt.Println("worker cancelled:", ctx.Err())
            return
        default:
            // Do work
        }
    }
}

func main() {
    ctx, cancel := context.WithCancel(context.Background())
    go worker(ctx)

    // Cancel after some condition
    cancel()
}
```

## Panic and Recover

### When NOT to Use Panic

```go
// WRONG: Panic for normal errors
func getUser(id string) (*User, error) {
    user, err := findUser(id)
    if err != nil {
        panic("user not found") // NEVER do this
    }
    return user, nil
}

// RIGHT: Return errors
func getUser(id string) (*User, error) {
    user, err := findUser(id)
    if err != nil {
        return nil, fmt.Errorf("finding user: %w", err)
    }
    return user, nil
}
```

### When Panic IS Appropriate

```go
// 1. Programmer error (violating API contract)
func SetAge(u *User, age int) {
    if age < 0 {
        panic("age cannot be negative") // Bug in code, not runtime
    }
    u.Age = age
}

// 2. Truly unrecoverable state (initialization failure)
func main() {
    cfg, err := loadConfig()
    if err != nil {
        panic("failed to load config: " + err.Error())
    }
    // ...
}
```

### Recover from Panic

```go
func safeCall(fn func()) (err error) {
    defer func() {
        if r := recover(); r != nil {
            err = fmt.Errorf("panic recovered: %v", r)
        }
    }()
    fn()
    return nil
}
```

## Functional Options

```go
type Server struct {
    addr     string
    port     int
    timeout  time.Duration
    maxConns int
}

type Option func(*Server)

func WithTimeout(timeout time.Duration) Option {
    return func(s *Server) {
        s.timeout = timeout
    }
}

func WithMaxConns(maxConns int) Option {
    return func(s *Server) {
        s.maxConns = maxConns
    }
}

func NewServer(addr string, port int, opts ...Option) *Server {
    s := &Server{addr: addr, port: port, timeout: 30 * time.Second}
    for _, opt := range opts {
        opt(s)
    }
    return s
}

// Usage
server := NewServer("localhost", 8080,
    WithTimeout(5*time.Second),
    WithMaxConns(100),
)
```

## Builder Pattern

```go
type User struct {
    name  string
    age   int
    email string
}

type UserBuilder struct {
    user *User
}

func NewUserBuilder() *UserBuilder {
    return &UserBuilder{user: &User{}}
}

func (b *UserBuilder) Name(name string) *UserBuilder {
    b.user.name = name
    return b
}

func (b *UserBuilder) Age(age int) *UserBuilder {
    b.user.age = age
    return b
}

func (b *UserBuilder) Email(email string) *UserBuilder {
    b.user.email = email
    return b
}

func (b *UserBuilder) Build() (*User, error) {
    if b.user.name == "" {
        return nil, errors.New("name required")
    }
    return b.user, nil
}

// Usage
user, err := NewUserBuilder().
    Name("Alice").
    Age(30).
    Email("alice@example.com").
    Build()
```

## Result Pattern (No Generics in Older Go)

```go
// For Go < 1.18
type Result struct {
    Value any
    Error error
}

func doSomething() Result {
    v, err := mightFail()
    if err != nil {
        return Result{Error: err}
    }
    return Result{Value: v}
}

// Usage
r := doSomething()
if r.Error != nil {
    // handle error
}
// use r.Value
```

## Once Initialization

```go
var (
    once     sync.Once
    instance *Database
    err      error
)

func GetDB() (*Database, error) {
    once.Do(func() {
        instance, err = NewDatabase()
    })
    return instance, err
}
```

## String Building

```go
// Use strings.Builder for concatenation
var sb strings.Builder
for i := 0; i < 10; i++ {
    sb.WriteString("hello")
}
result := sb.String()

// Or strings.Join for slices
parts := []string{"a", "b", "c"}
result := strings.Join(parts, ",")
```

## Repository Pattern

Encapsulate data access behind a consistent interface:

```go
// Define repository interface in consumer package
type UserRepository interface {
    FindByID(ctx context.Context, id string) (*User, error)
    FindAll(ctx context.Context) ([]User, error)
    Save(ctx context.Context, user *User) error
    Delete(ctx context.Context, id string) error
}

// Concrete implementation
type postgresUserRepo struct {
    db *sql.DB
}

func NewPostgresUserRepo(db *sql.DB) UserRepository {
    return &postgresUserRepo{db: db}
}

func (r *postgresUserRepo) FindByID(ctx context.Context, id string) (*User, error) {
    var user User
    err := r.db.QueryRowContext(ctx,
        "SELECT id, name, email FROM users WHERE id = $1", id,
    ).Scan(&user.ID, &user.Name, &user.Email)
    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return nil, nil
        }
        return nil, fmt.Errorf("querying user %s: %w", id, err)
    }
    return &user, nil
}
```

**Guidelines:**
- Define the interface in the consumer package, not the implementation package
- Accept the interface in constructors via dependency injection
- Business logic depends on the interface, enabling easy testing with fakes

## API Response Format

Use a consistent envelope for HTTP/JSON APIs:

```go
// Standard response envelope
type APIResponse struct {
    Success bool        `json:"success"`
    Data    any         `json:"data,omitempty"`
    Error   string      `json:"error,omitempty"`
}

// Paginated response
type PaginatedResponse struct {
    Success bool        `json:"success"`
    Data    any         `json:"data,omitempty"`
    Error   string      `json:"error,omitempty"`
    Meta    *PageMeta   `json:"meta,omitempty"`
}

type PageMeta struct {
    Total  int `json:"total"`
    Page   int `json:"page"`
    Limit  int `json:"limit"`
}
```

**Guidelines:**
- Include `success` boolean for client-side branching
- `Data` is nullable (absent on error); `Error` is nullable (absent on success)
- Add `Meta` for paginated responses with total count, page, and limit
- Keep error messages user-friendly in responses; log detailed errors server-side

## Further Reading

- [Effective Go](https://go.dev/doc/effective_go)
- [Go Patterns](https://github.com/tmrts/go-patterns)
