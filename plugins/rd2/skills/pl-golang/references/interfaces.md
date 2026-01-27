# Go Interfaces

This reference covers interface design, composition, embedding, and idiomatic Go interface patterns.

## Table of Contents

1. [Interface Basics](#interface-basics)
2. [Interface Design](#interface-design)
3. [Composition and Embedding](#composition-and-embedding)
4. [Common Patterns](#common-patterns)
5. [Type Assertions and Type Switches](#type-assertions-and-type-switches)
6. [Best Practices](#best-practices)
7. [Common Pitfalls](#common-pitfalls)

## Interface Basics

### Defining Interfaces

```go
// Interface with one method
type Writer interface {
    Write(p []byte) (n int, err error)
}

// Interface with multiple methods
type ReadWriter interface {
    Read(p []byte) (n int, err error)
    Write(p []byte) (n int, err error)
}

// Empty interface (accepts any type)
type Any interface{}
```

### Implementing Interfaces

Interfaces are satisfied implicitly - no explicit "implements" declaration:

```go
type Stringer interface {
    String() string
}

// This type implements Stringer automatically
type Person struct {
    Name string
}

func (p Person) String() string {
    return fmt.Sprintf("Person: %s", p.Name)
}

// Pointer receiver also satisfies interface
func (p *Person) SetName(name string) {
    p.Name = name
}

// Usage
var s Stringer = Person{Name: "Alice"}
fmt.Println(s.String())
```

### Interface Values

```go
var w io.Writer
w = os.Stdout  // Concrete type
w.Write([]byte("hello"))

// nil interface value
var w2 io.Writer
w2 == nil  // true

// Interface with nil concrete value
var buf *bytes.Buffer
var w3 io.Writer = buf  // w3 != nil, but w3.(*bytes.Buffer) == nil
```

## Interface Design

### Keep Interfaces Small

```go
// GOOD: Small, focused interface
type Reader interface {
    Read(p []byte) (n int, err error)
}

// BAD: Bloated interface
type ReaderWriterSeekerCloserFlusher interface {
    Read(p []byte) (n int, err error)
    Write(p []byte) (n int, err error)
    Seek(offset int64, whence int) (int64, error)
    Close() error
    Flush() error
}
```

### Accept Interfaces, Return Structs

```go
// GOOD: Accept interface
func ProcessData(w io.Writer, data []byte) {
    w.Write(data)
}

// BAD: Accept concrete type
func ProcessData(f *os.File, data []byte) {
    f.Write(data)
}

// GOOD: Return struct
func NewBuffer() *bytes.Buffer {
    return &bytes.Buffer{}
}

// BAD: Return interface
func NewBuffer() io.Writer {
    return &bytes.Buffer{}
}
```

### Define Interfaces in Consumer Package

```go
// In consumer package (e.g., service package)
package service

type Database interface {
    SaveUser(ctx context.Context, user User) error
    FindUser(ctx context.Context, id string) (User, error)
}

type Service struct {
    db Database  // Service defines the interface it needs
}

// In provider package (e.g., postgres package)
package postgres

type PostgresDB struct { /* ... */ }

func (db *PostgresDB) SaveUser(ctx context.Context, user User) error {
    // Implementation
}

// The postgres package doesn't know about service.Database
```

### Standard Library Interfaces

Before creating custom interfaces, check if stdlib has one:

| Interface | Package | Purpose |
|-----------|---------|---------|
| `io.Reader` | io | Read bytes |
| `io.Writer` | io | Write bytes |
| `io.Closer` | io | Close resource |
| `io.ReadWriter` | io | Read + Write |
| `io.ReadCloser` | io | Read + Close |
| `io.WriteCloser` | io | Write + Close |
| `io.ReadWriteCloser` | io | Read + Write + Close |
| `fmt.Stringer` | fmt | String representation |
| `error` | builtin | Error value |
| `sort.Interface` | sort | Sorting |
| `json.Marshaler` | encoding/json | Custom JSON marshaling |
| `json.Unmarshaler` | encoding/json | Custom JSON unmarshaling |

## Composition and Embedding

### Interface Composition

```go
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Writer interface {
    Write(p []byte) (n int, err error)
}

type ReadWriter interface {
    Reader
    Writer
}

// Or inline
type ReadWriteCloser interface {
    io.Reader
    io.Writer
    io.Closer
}
```

### Embedding in Structs

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
rw.Write([]byte("hello"))  // Promoted method
```

### Composing with Methods

```go
type BasicInterface interface {
    Method1()
}

type EnhancedInterface interface {
    BasicInterface
    Method2()
}

// Implementation must satisfy both
type MyType struct{}

func (m MyType) Method1() {}
func (m MyType) Method2() {}
```

## Common Patterns

### Error Interfaces

```go
// Error interface (built-in)
type error interface {
    Error() string
}

// Custom error type
type ValidationError struct {
    Field   string
    Message string
}

func (e ValidationError) Error() string {
    return fmt.Sprintf("validation failed on %s: %s", e.Field, e.Message)
}
```

### Stringer Interface

```go
type Stringer interface {
    String() string
}

type User struct {
    ID    int
    Name  string
    Email string
}

func (u User) String() string {
    return fmt.Sprintf("User[%d]: %s <%s>", u.ID, u.Name, u.Email)
}
```

### Handler Interfaces (HTTP)

```go
type Handler interface {
    ServeHTTP(w http.ResponseWriter, r *http.Request)
}

type MyHandler struct{}

func (h MyHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    w.Write([]byte("Hello, World!"))
}

// Using http.HandlerFunc convenience type
func helloHandler(w http.ResponseWriter, r *http.Request) {
    w.Write([]byte("Hello!"))
}

func main() {
    var h http.Handler = MyHandler{}
    http.Handle("/", h)

    http.Handle("/hello", http.HandlerFunc(helloHandler))
}
```

### Mock Interfaces for Testing

```go
// Interface to mock
type Database interface {
    GetUser(id int) (*User, error)
}

// Mock implementation
type MockDatabase struct {
    MockGetUser func(id int) (*User, error)
}

func (m *MockDatabase) GetUser(id int) (*User, error) {
    return m.MockGetUser(id)
}

// Test
func TestService(t *testing.T) {
    mockDB := &MockDatabase{
        MockGetUser: func(id int) (*User, error) {
            return &User{ID: id, Name: "Test"}, nil
        },
    }

    svc := NewService(mockDB)
    // Test service...
}
```

### Adapter Pattern

```go
type LegacySystem interface {
    LegacyMethod() string
}

type ModernSystem interface {
    ModernMethod() string
}

// Adapter
type Adapter struct {
    legacy LegacySystem
}

func (a Adapter) ModernMethod() string {
    result := a.legacy.LegacyMethod()
    // Transform legacy result to modern format
    return strings.ToUpper(result)
}
```

## Type Assertions and Type Switches

### Type Assertion

```go
var i interface{} = "hello"

// Single-value assertion (panics if wrong type)
s := i.(string)
fmt.Println(s)

// Two-value assertion (safe)
s, ok := i.(string)
if ok {
    fmt.Println(s)
}

// Type assertion to access specific methods
var w io.Writer = &bytes.Buffer{}
if buf, ok := w.(*bytes.Buffer); ok {
    buf.WriteString("buffer-specific operation")
}
```

### Type Switch

```go
func do(i interface{}) {
    switch v := i.(type) {
    case int:
        fmt.Printf("int: %d\n", v)
    case string:
        fmt.Printf("string: %s\n", v)
    case bool:
        fmt.Printf("bool: %t\n", v)
    case []int:
        fmt.Printf("slice of ints: %v\n", v)
    default:
        fmt.Printf("unknown type: %T\n", v)
    }
}
```

### Type Switch with Interfaces

```go
type Stringer interface {
    String() string
}

func printStringer(s Stringer) {
    switch v := s.(type) {
    case *MyType:
        fmt.Println("MyType:", v.SpecialMethod())
    case *OtherType:
        fmt.Println("OtherType:", v.OtherMethod())
    default:
        fmt.Println("Unknown:", v.String())
    }
}
```

## Best Practices

1. **Keep interfaces small** - 1-2 methods is ideal
2. **Define interfaces in the consumer package** - Not the provider
3. **Accept interfaces, return structs** - Reduces coupling
4. **Use standard library interfaces first** - `io.Reader`, `io.Writer`, etc.
5. **Prefer composition over inheritance** - Embed interfaces and types
6. **Design for testing** - Make interfaces easy to mock
7. **Name interfaces with `-er` suffix** - `Reader`, `Writer`, `Stringer`
8. **Don't create interfaces prematurely** - Wait until you have multiple implementations

## Common Pitfalls

### Nil Interface Values

```go
var w io.Writer
w == nil  // true

var buf *bytes.Buffer
w = buf  // w != nil, but holds nil *bytes.Buffer
w.Write([]byte("hello"))  // Panic: nil pointer dereference
```

### Creating Interfaces Too Early

```go
// BAD: Creating interface for only one implementation
type UserRepository interface {
    GetUser(id int) (*User, error)
}

type SQLUserRepository struct { /* ... */ }

// GOOD: Wait until you have a second implementation (e.g., in-memory for tests)
```

### Wrong Type Assertion

```go
var i interface{} = "hello"

// WRONG: Panics if type is wrong
n := i.(int)  // Panic!

// RIGHT: Use two-value form
n, ok := i.(int)
if !ok {
    fmt.Println("not an int")
}
```

### Interface Nil Confusion

```go
func returnsError() error {
    var p *MyError = nil
    return p  // Returns nil *MyError, not nil error
}

// Check
if err := returnsError(); err != nil {
    // This runs! err != nil even though it contains nil pointer
}

// Solution
func returnsError() error {
    var p *MyError = nil
    if p != nil {
        return p
    }
    return nil  // Return typed nil
}
```

## Further Reading

- [Effective Go - Interfaces](https://go.dev/doc/effective_go#interfaces)
- [Go by Example - Interfaces](https://gobyexample.com/interfaces)
- [Interfaces in Go](https://jordanorelli.com/post/31265460844/how-to-use-interfaces-in-go)
- [Interface Design in Go](https://www.youtube.com/watch?v=8RKluqPEoJY)
