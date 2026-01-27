# Go Idiomatic Patterns

This reference covers common Go patterns including defer, panic/recover, context usage, and other idiomatic Go practices.

## Table of Contents

1. [Defer](#defer)
2. [Panic and Recover](#panic-and-recover)
3. [Context](#context)
4. [Composition over Inheritance](#composition-over-inheritance)
5. [Method Sets](#method-sets)
6. [Common Idioms](#common-idioms)
7. [Common Anti-Patterns](#common-anti-patterns)

## Defer

### Basic Defer

```go
func processFile(filename string) error {
    file, err := os.Open(filename)
    if err != nil {
        return err
    }
    defer file.Close()  // Executed when function returns

    // Process file...
    return nil
}
```

### Defer Execution Order

```go
func example() {
    defer fmt.Println("first")
    defer fmt.Println("second")
    defer fmt.Println("third")
}
// Output:
// third
// second
// first
// (LIFO - Last In, First Out)
```

### Defer with Arguments

```go
func example() {
    i := 0
    defer fmt.Println(i)  // Captures current value
    i = 10
}
// Output: 0 (not 10!)

// To capture current value, use closure
func example() {
    i := 0
    defer func() { fmt.Println(i) }()
    i = 10
}
// Output: 10
```

### Defer for Logging

```go
func trace(name string) func() {
    start := time.Now()
    fmt.Printf("Enter %s\n", name)
    return func() {
        fmt.Printf("Exit %s (%s)\n", name, time.Since(start))
    }
}

func process() {
    defer trace("process")()
    // Do work...
}
```

### Defer for Unlock

```go
func (s *Store) Get(key string) (string, error) {
    s.mu.Lock()
    defer s.mu.Unlock()  // Always unlocks, even on panic

    return s.data[key], nil
}
```

### Defer for Recovery

```go
func safeProcess() (err error) {
    defer func() {
        if r := recover(); r != nil {
            err = fmt.Errorf("panic: %v", r)
        }
    }()

    // Code that might panic...
    return nil
}
```

## Panic and Recover

### When to Panic

```go
// Panicking is for truly unrecoverable errors
func mustLoadConfig() *Config {
    config, err := loadConfig()
    if err != nil {
        panic("config is required: " + err.Error())
    }
    return config
}

// Only panic in initialization
func init() {
    if os.Getenv("DB_URL") == "" {
        panic("DB_URL environment variable is required")
    }
}
```

### Recover Pattern

```go
func handleRequest() (err error) {
    defer func() {
        if r := recover(); r != nil {
            // Log stack trace
            debug.PrintStack()
            // Convert panic to error
            err = fmt.Errorf("panic: %v", r)
        }
    }()

    // Code that might panic
    dangerousOperation()
    return nil
}
```

### Recover in HTTP Handler

```go
func RecoveryMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if r := recover(); r != nil {
                http.Error(w, "Internal Server Error", 500)
                log.Printf("panic: %v\n%s", r, debug.Stack())
            }
        }()
        next.ServeHTTP(w, r)
    })
}
```

### DON'T Use Panic for Normal Errors

```go
// WRONG: Panic for validation
func getUser(id int) *User {
    if id <= 0 {
        panic("invalid id")  // Don't do this!
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

## Context

### Basic Context Usage

```go
import "context"

func doWork(ctx context.Context) error {
    for {
        select {
        case <-ctx.Done():
            return ctx.Err()  // Context cancelled or timeout
        default:
            // Do work
            time.Sleep(100 * time.Millisecond)
        }
    }
}
```

### Creating Contexts

```go
// Background context (never cancelled)
ctx := context.Background()

// TODO context (should be replaced)
ctx := context.TODO()

// With timeout
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()  // Always call cancel to release resources

// With deadline
ctx, cancel := context.WithDeadline(context.Background(), time.Now().Add(5*time.Second))
defer cancel()

// With cancellation
ctx, cancel := context.WithCancel(context.Background())
defer cancel()
// Call cancel() when done
```

### With Values

```go
type contextKey string

const (
    userIDKey contextKey = "userID"
    traceIDKey contextKey = "traceID"
)

func handler(w http.ResponseWriter, r *http.Request) {
    // Add values to context
    ctx := context.WithValue(r.Context(), userIDKey, "user123")
    ctx = context.WithValue(ctx, traceIDKey, "trace456")

    // Pass context downstream
    processRequest(ctx)
}

func processRequest(ctx context.Context) {
    // Retrieve values (type assertion needed)
    userID := ctx.Value(userIDKey).(string)
    traceID := ctx.Value(traceIDKey).(string)
}
```

### Context Best Practices

```go
// GOOD: Pass context as first parameter
func (s *Service) CreateUser(ctx context.Context, user User) error {
    // Check context
    select {
    case <-ctx.Done():
        return ctx.Err()
    default:
    }

    // Do work...
    return nil
}

// BAD: Don't store context in struct
type Service struct {
    ctx context.Context  // Don't do this!
}

// BAD: Don't make context a member of a struct
type Request struct {
    ctx context.Context  // Don't do this!
}
```

### Context Cancellation Propagation

```go
func main() {
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    // Start multiple goroutines
    for i := 0; i < 5; i++ {
        go worker(ctx, i)
    }

    // All goroutines will be cancelled when cancel() is called
    time.Sleep(2 * time.Second)
}

func worker(ctx context.Context, id int) {
    for {
        select {
        case <-ctx.Done():
            fmt.Printf("Worker %d: cancelled\n", id)
            return
        default:
            fmt.Printf("Worker %d: working\n", id)
            time.Sleep(500 * time.Millisecond)
        }
    }
}
```

## Composition over Inheritance

### Struct Embedding

```go
type ReadWriter struct {
    io.Reader
    io.Writer
}

// Methods promoted
rw := ReadWriter{
    Reader: os.Stdin,
    Writer: os.Stdout,
}
rw.Write([]byte("hello"))  // Promoted from io.Writer
```

### Behavior Composition

```go
type Logger struct {
    log *log.Logger
}

func (l Logger) Log(msg string) {
    l.log.Println(msg)
}

type Metrics struct {
    counter uint64
}

func (m *Metrics) Increment() {
    m.counter++
}

type Service struct {
    Logger   // Embedded
    Metrics  // Embedded
}

func (s *Service) DoWork() {
    s.Log("doing work")
    s.Increment()
}
```

### Interface Composition

```go
type ReadWriter interface {
    Reader
    Writer
}
```

## Method Sets

### Value vs Pointer Receivers

```go
type Counter struct {
    count int
}

// Value receiver - can be called on value or pointer
func (c Counter) Value() int {
    return c.count
}

// Pointer receiver - requires pointer
func (c *Counter) Increment() {
    c.count++
}

// Usage
c := Counter{count: 0}
c.Value()        // OK
c.Increment()    // OK (Go takes address automatically)

p := &Counter{count: 0}
p.Value()        // OK
p.Increment()    // OK
```

### Interface Satisfaction

```go
type Counter interface {
    Value() int
    Increment()
}

// Both value and pointer satisfy the interface
var c1 Counter = Counter{}         // OK
var c2 Counter = &Counter{}        // OK

// But if interface requires pointer receiver:
type Incrementer interface {
    Increment()
}

var i1 Incrementer = Counter{}     // Error!
var i2 Incrementer = &Counter{}    // OK
```

## Common Idioms

### OK Return Value

```go
// Two-value return for lookup
value, ok := m["key"]
if !ok {
    // Key not present
}

// Type assertion
var i interface{} = "hello"
s, ok := i.(string)
if !ok {
    // Not a string
}

// Channel receive
val, ok := <-ch
if !ok {
    // Channel closed
}
```

### Error Handling

```go
// Early return
func process() error {
    data, err := readData()
    if err != nil {
        return fmt.Errorf("read data: %w", err)
    }

    result, err := transform(data)
    if err != nil {
        return fmt.Errorf("transform: %w", err)
    }

    return nil
}
```

### Initialization Functions

```go
// NewX constructors
func NewServer(config Config) *Server {
    return &Server{
        config: config,
        router: mux.NewRouter(),
    }
}

func NewClient(url string) (*Client, error) {
    if url == "" {
        return nil, errors.New("URL is required")
    }
    return &Client{url: url}, nil
}
```

### Option Pattern

```go
type Server struct {
    port int
    host string
}

type Option func(*Server)

func WithPort(port int) Option {
    return func(s *Server) {
        s.port = port
    }
}

func WithHost(host string) Option {
    return func(s *Server) {
        s.host = host
    }
}

func NewServer(opts ...Option) *Server {
    s := &Server{
        port: 8080,
        host: "localhost",
    }
    for _, opt := range opts {
        opt(s)
    }
    return s
}

// Usage
server := NewServer(
    WithPort(9000),
    WithHost("example.com"),
)
```

### String Representation

```go
// Implement Stringer for debugging
type User struct {
    ID    int
    Name  string
    Email string
}

func (u User) String() string {
    return fmt.Sprintf("User[%d]: %s <%s>", u.ID, u.Name, u.Email)
}
```

## Common Anti-Patterns

### Creating Goroutines Without Control

```go
// WRONG: Unbounded goroutine creation
for _, item := range items {
    go process(item)  // Could create millions!
}

// RIGHT: Worker pool with limit
sem := make(chan struct{}, 100)
for _, item := range items {
    sem <- struct{}{}
    go func(item Item) {
        defer func() { <-sem }()
        process(item)
    }(item)
}
```

### Forgetting to Close Channels

```go
// WRONG: Never closing channel
func producer() <-chan int {
    ch := make(chan int)
    go func() {
        for i := 0; i < 10; i++ {
            ch <- i
        }
        // Forgot close!
    }()
    return ch
}

// RIGHT: Always close from sender
func producer() <-chan int {
    ch := make(chan int)
    go func() {
        defer close(ch)
        for i := 0; i < 10; i++ {
            ch <- i
        }
    }()
    return ch
}
```

### Using Time.Sleep for Synchronization

```go
// WRONG: Sleeping to wait for goroutine
go func() {
    result = calculate()
}()
time.Sleep(1 * time.Second)  // Race!

// RIGHT: Use WaitGroup or channels
var wg sync.WaitGroup
wg.Add(1)
go func() {
    defer wg.Done()
    result = calculate()
}()
wg.Wait()
```

### Pointer to Interface

```go
// WRONG: Pointer to interface
var err error
fmt.Printf("%p\n", &err)  // Don't do this

// RIGHT: Interface is already a reference
var r io.Reader
r = os.Stdin
```

### Empty Interface Overuse

```go
// WRONG: Using interface{} everywhere
func processData(data interface{}) interface{} {
    // What is data?
}

// RIGHT: Use specific types or interfaces
type Processor interface {
    Process() Result
}

func processData(p Processor) Result {
    return p.Process()
}
```

## Further Reading

- [Effective Go - Defer](https://go.dev/doc/effective_go#defer)
- [Go Proverbs](https://go-proverbs.github.io/)
- [Go by Example - Defer](https://gobyexample.com/defer)
- [Context package](https://pkg.go.dev/context)
